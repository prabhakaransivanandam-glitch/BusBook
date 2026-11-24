import mongoose from 'mongoose';
import { z } from 'zod';
import Booking from '../models/Booking.js';
import Ticket from '../models/Ticket.js';
import Trip from '../models/Trip.js';
import User from '../models/User.js';
import { config } from '../config/env.js';
import { asyncHandler, badRequest, conflict, notFound } from '../utils/errors.js';
import { generateTicketId } from '../utils/ids.js';
import { signTicketToken } from '../utils/ticketToken.js';
import { serializeTrip } from '../services/tripService.js';

export const createBookingSchema = z.object({
  tripId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid trip'),
  seatNumbers: z.array(z.number().int().min(1).max(80)).min(1).max(10),
  passengerNames: z.array(z.string().trim().min(2).max(80)).min(1).max(10),
});

const bookingPopulate = [
  { path: 'trip', populate: { path: 'bus', select: 'number type' } },
];

export async function createBooking(req, res) {
  const { tripId, seatNumbers, passengerNames } = req.body;

  if (seatNumbers.length !== passengerNames.length) {
    throw badRequest('Each selected seat needs one passenger name');
  }
  if (new Set(seatNumbers).size !== seatNumbers.length) {
    throw badRequest('Duplicate seats are not allowed');
  }

  const user = await User.findOne({ firebaseUid: req.auth.uid });
  if (!user) throw badRequest('Complete profile sync before booking');

  const now = new Date();
  const holdExpiresAt = new Date(now.getTime() + config.seatHoldMinutes * 60000);
  const bookingId = new mongoose.Types.ObjectId();

  const trip = await Trip.findOneAndUpdate(
    {
      _id: tripId,
      status: 'scheduled',
      departureTime: { $gt: now },
      $and: seatNumbers.map((number) => ({
        seats: {
          $elemMatch: {
            number,
            $or: [{ bookingId: null }, { holdExpiresAt: null }, { holdExpiresAt: { $lte: now } }],
          },
        },
      })),
    },
    {
      $set: {
        'seats.$[seat].bookingId': bookingId,
        'seats.$[seat].holdExpiresAt': holdExpiresAt,
      },
    },
    {
      arrayFilters: [{ 'seat.number': { $in: seatNumbers } }],
      new: true,
    },
  );

  if (!trip) {
    throw conflict('One or more seats were just taken. Please refresh and choose again.');
  }

  try {
    await Booking.create({
      _id: bookingId,
      user: user._id,
      trip: trip._id,
      seatNumbers,
      passengerNames,
      amount: seatNumbers.length * trip.fare,
      holdExpiresAt,
      status: 'PENDING',
    });
  } catch (error) {
    await Trip.updateOne(
      { _id: trip._id },
      {
        $set: {
          'seats.$[seat].bookingId': null,
          'seats.$[seat].holdExpiresAt': null,
        },
      },
      { arrayFilters: [{ 'seat.number': { $in: seatNumbers } }] },
    );
    throw error;
  }

  res.status(201).json({
    booking: {
      id: bookingId,
      tripId: trip._id,
      seatNumbers,
      amount: seatNumbers.length * trip.fare,
      status: 'PENDING',
      holdExpiresAt,
    },
    holdSeconds: config.seatHoldMinutes * 60,
  });
}

async function findOwnedBooking(req) {
  const user = await User.findOne({ firebaseUid: req.auth.uid });
  if (!user) throw notFound('User profile not found');
  const booking = await Booking.findOne({ _id: req.params.id, user: user._id });
  if (!booking) throw notFound('Booking not found');
  return booking;
}

async function issueTicket(booking) {
  const ticketId = generateTicketId();
  return Ticket.create({
    booking: booking._id,
    trip: booking.trip,
    user: booking.user,
    ticketId,
    seatNumbers: booking.seatNumbers,
    qrToken: signTicketToken({ ticketId, tripId: String(booking.trip) }),
    status: 'BOOKED',
  });
}

export const confirmBooking = asyncHandler(async (req, res) => {
  const booking = await findOwnedBooking(req);

  if (booking.status === 'CONFIRMED') {
    let ticket = await Ticket.findOne({ booking: booking._id });
    if (!ticket) ticket = await issueTicket(booking);
    return res.status(200).json({ booking, ticket });
  }

  if (booking.status !== 'PENDING') throw conflict(`Booking is ${booking.status.toLowerCase()}`);
  if (booking.holdExpiresAt <= new Date()) {
    booking.status = 'EXPIRED';
    await booking.save();
    throw conflict('Seat hold expired. Please book again.');
  }

  await Trip.updateOne(
    { _id: booking.trip },
    { $set: { 'seats.$[seat].holdExpiresAt': null } },
    { arrayFilters: [{ 'seat.bookingId': booking._id }] },
  );

  booking.status = 'CONFIRMED';
  booking.paymentStatus = 'PAID'; // Phase 1: confirmation marks payment paid; gateway is a later phase
  await booking.save();

  let ticket = await Ticket.findOne({ booking: booking._id });
  if (!ticket) ticket = await issueTicket(booking);

  return res.status(200).json({ booking, ticket });
});

export const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await findOwnedBooking(req);
  if (['CANCELLED', 'EXPIRED'].includes(booking.status)) {
    throw conflict(`Booking is already ${booking.status.toLowerCase()}`);
  }

  const trip = await Trip.findById(booking.trip);
  if (!trip) throw notFound('Trip not found');
  if (new Date(trip.departureTime) <= new Date()) {
    throw conflict('Trip has already departed; cancellation is no longer allowed');
  }

  await Trip.updateOne(
    { _id: booking.trip },
    { $set: { 'seats.$[seat].bookingId': null, 'seats.$[seat].holdExpiresAt': null } },
    { arrayFilters: [{ 'seat.bookingId': booking._id }] },
  );

  booking.status = 'CANCELLED';
  if (booking.status === 'CANCELLED' && booking.paymentStatus === 'PAID') {
    booking.paymentStatus = 'REFUNDED';
  }
  await booking.save();
  await Ticket.updateMany(
    { booking: booking._id, status: 'BOOKED' },
    { $set: { status: 'CANCELLED' } },
  );

  res.status(200).json({ booking });
});

export async function getMyBookings(req, res) {
  const user = await User.findOne({ firebaseUid: req.auth.uid });
  if (!user) throw notFound('User profile not found');
  const bookings = await Booking.find({ user: user._id })
    .populate(bookingPopulate)
    .sort({ createdAt: -1 })
    .lean();
  res.status(200).json({
    bookings: bookings.map((booking) => ({
      ...booking,
      trip: booking.trip ? serializeTrip(booking.trip) : null,
    })),
  });
}

export async function getMyTickets(req, res) {
  const user = await User.findOne({ firebaseUid: req.auth.uid });
  if (!user) throw notFound('User profile not found');
  const tickets = await Ticket.find({ user: user._id })
    .populate({ path: 'trip', populate: { path: 'bus', select: 'number type' } })
    .populate('booking')
    .sort({ createdAt: -1 })
    .lean();
  res.status(200).json({
    tickets: tickets.map((ticket) => ({
      ...ticket,
      trip: ticket.trip ? serializeTrip(ticket.trip) : null,
      amount: ticket.booking?.amount ?? 0,
    })),
  });
}
