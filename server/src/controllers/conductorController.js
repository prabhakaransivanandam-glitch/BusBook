import Conductor from '../models/Conductor.js';
import Trip from '../models/Trip.js';
import User from '../models/User.js';
import Booking from '../models/Booking.js';
import Ticket from '../models/Ticket.js';
import { badRequest, notFound } from '../utils/errors.js';

function todayRange() {
  const now = new Date();
  return {
    start: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
  };
}

export async function getConductorProfile(req, res) {
  const user = await User.findOne({ firebaseUid: req.auth.uid });
  const conductor = await Conductor.findOne({ firebaseUid: req.auth.uid }).populate(
    'assignedBus',
    'number type totalSeats',
  );
  if (!conductor && !user) throw notFound('Conductor profile not found');
  res.status(200).json({ conductor, user });
}

export async function getAssignedTrips(req, res) {
  const conductor = await Conductor.findOne({ firebaseUid: req.auth.uid });
  if (!conductor) throw notFound('Conductor profile not found');
  const { start, end } = todayRange();
  const query = { departureTime: { $gte: start, $lt: end } };
  if (conductor.assignedBus) query.bus = conductor.assignedBus;
  else query.conductor = conductor._id;

  const trips = await Trip.find(query).populate('bus', 'number type').sort({ departureTime: 1 });
  res.status(200).json({
    trips: trips.map((trip) => ({
      id: trip._id,
      busNumber: trip.bus?.number,
      direction: trip.direction,
      departureTime: trip.departureTime,
      totalSeats: trip.totalSeats,
      bookedSeats: trip.seats.filter((seat) => seat.bookingId).length,
      status: trip.status,
    })),
  });
}

export async function getTripSummary(req, res) {
  const tripId = req.params.tripId;
  const trip = await Trip.findById(tripId);
  if (!trip) throw notFound('Trip not found');
  const [booked, scanned] = await Promise.all([
    Booking.countDocuments({ trip: tripId, status: { $in: ['CONFIRMED', 'PENDING'] } }),
    Ticket.countDocuments({ trip: tripId, status: 'USED' }),
  ]);
  res.status(200).json({ booked, scanned, remaining: Math.max(0, booked - scanned) });
}

export async function selectTrip(req, res) {
  const conductor = await Conductor.findOne({ firebaseUid: req.auth.uid });
  if (!conductor) throw badRequest('Conductor profile not found');
  const trip = await Trip.findOne({ _id: req.params.tripId, status: 'scheduled' });
  if (!trip) throw notFound('Trip not found');
  if (conductor.assignedBus && String(trip.bus) !== String(conductor.assignedBus)) {
    throw badRequest('This trip is not assigned to your bus');
  }
  trip.conductor = conductor._id;
  trip.status = 'running';
  await trip.save();
  res.status(200).json({ trip });
}
