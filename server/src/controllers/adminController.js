import { z } from 'zod';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Conductor from '../models/Conductor.js';
import Bus from '../models/Bus.js';
import Trip from '../models/Trip.js';
import Timetable from '../models/Timetable.js';
import Booking from '../models/Booking.js';
import Ticket from '../models/Ticket.js';
import { buildSeats, dateStringToDate, generateTrips, isValidDateString, DIRECTION_OPTIONS } from '../services/tripService.js';
import { asyncHandler, badRequest, conflict, notFound } from '../utils/errors.js';
import { generateTempPassword } from '../utils/ids.js';
import { hashPassword } from '../utils/passwords.js';

export const conductorSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(8).max(20),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6).max(128),
  employeeId: z.string().trim().min(2).max(40),
  assignedBus: z.string().regex(/^[a-f\d]{24}$/i).optional().or(z.literal('')),
});

export const busSchema = z.object({
  number: z.string().trim().min(2).max(20).transform((v) => v.toUpperCase()),
  totalSeats: z.number().int().min(4).max(80),
  type: z.string().trim().min(2).max(50).optional().default('AC Seater'),
});

export const tripSchema = z.object({
  bus: z.string().regex(/^[a-f\d]{24}$/i),
  conductor: z.string().regex(/^[a-f\d]{24}$/i).optional().or(z.literal('')),
  direction: z.enum(DIRECTION_OPTIONS),
  date: z.string().refine(isValidDateString, 'Use YYYY-MM-DD'),
  departureTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm'),
  arrivalTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm'),
  fare: z.number().int().min(1).max(10000),
});

export const timetableSchema = tripSchema.omit({ conductor: true }).extend({
  name: z.string().trim().min(2).max(80),
  daysAhead: z.number().int().min(1).max(60).optional().default(7),
});

export async function listConductors(req, res) {
  const search = String(req.query.search || '');
  const active = req.query.active;
  const filter = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { employeeId: { $regex: search, $options: 'i' } },
    ];
  }
  if (active === 'true' || active === 'false') filter.active = active === 'true';
  const conductors = await Conductor.find(filter).populate('assignedBus', 'number').sort({ createdAt: -1 });
  res.status(200).json({ conductors });
}

export const createConductor = asyncHandler(async (req, res) => {
  const { name, phone, email, password, employeeId, assignedBus } = req.body;

  if (await Conductor.findOne({ $or: [{ email }, { employeeId }] })) {
    throw conflict('A conductor with this email or employee ID already exists');
  }

  const uid = new mongoose.Types.ObjectId().toString();

  const conductor = await Conductor.create({
    firebaseUid: uid,
    name,
    phone,
    email,
    employeeId,
    assignedBus: assignedBus || null,
    active: true,
  });

  await User.create({
    firebaseUid: uid,
    name,
    email,
    phone,
    password: hashPassword(password),
    role: 'conductor',
    active: true,
  });

  res.status(201).json({ conductor: await Conductor.findById(conductor._id).populate('assignedBus', 'number') });
});

export async function updateConductor(req, res) {
  const conductor = await Conductor.findById(req.params.id);
  if (!conductor) throw notFound('Conductor not found');
  const allowed = ['name', 'phone', 'employeeId', 'assignedBus'];
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) conductor[field] = req.body[field] || null;
  });
  await conductor.save();
  await User.updateOne(
    { firebaseUid: conductor.firebaseUid },
    { $set: { name: conductor.name, phone: conductor.phone } },
  );
  res.status(200).json({ conductor });
}

export async function toggleConductor(req, res) {
  const conductor = await Conductor.findById(req.params.id);
  if (!conductor) throw notFound('Conductor not found');
  conductor.active = !conductor.active;
  await conductor.save();
  await User.updateOne({ firebaseUid: conductor.firebaseUid }, { $set: { active: conductor.active } });
  res.status(200).json({ conductor });
}

export async function deleteConductor(req, res) {
  const conductor = await Conductor.findById(req.params.id);
  if (!conductor) throw notFound('Conductor not found');
  await User.deleteOne({ firebaseUid: conductor.firebaseUid });
  await conductor.deleteOne();
  res.status(200).json({ message: 'Conductor deleted' });
}

export async function resetConductorPassword(req, res) {
  const conductor = await Conductor.findById(req.params.id);
  if (!conductor) throw notFound('Conductor not found');
  const password = generateTempPassword();
  await User.updateOne(
    { firebaseUid: conductor.firebaseUid },
    { $set: { password: hashPassword(password) } },
  );
  res.status(200).json({ password });
}

export async function listBuses(req, res) {
  res.status(200).json({ buses: await Bus.find().sort({ number: 1 }) });
}

export async function createBus(req, res) {
  const bus = await Bus.create(req.body);
  res.status(201).json({ bus });
}

export async function updateBus(req, res) {
  const bus = await Bus.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!bus) throw notFound('Bus not found');
  res.status(200).json({ bus });
}

export async function deleteBus(req, res) {
  const bus = await Bus.findById(req.params.id);
  if (!bus) throw notFound('Bus not found');
  if (await Trip.countDocuments({ bus: bus._id })) throw conflict('Remove this bus from trips first');
  await bus.deleteOne();
  res.status(200).json({ message: 'Bus deleted' });
}

export async function listTrips(req, res) {
  const trips = await Trip.find()
    .populate('bus', 'number type')
    .populate('conductor', 'name employeeId')
    .sort({ departureTime: -1 })
    .limit(200)
    .lean();
  res.status(200).json({
    trips: trips.map((trip) => ({
      ...trip,
      bookedSeats: trip.seats.filter((seat) => seat.bookingId).length,
    })),
  });
}

export async function createTrip(req, res) {
  const { bus, conductor, direction, date, departureTime, arrivalTime, fare } = req.body;
  const busDoc = await Bus.findById(bus);
  if (!busDoc) throw badRequest('Bus not found');

  const trip = await Trip.create({
    bus,
    conductor: conductor || null,
    direction,
    date,
    departureTime: dateStringToDate(date, departureTime),
    arrivalTime: dateStringToDate(date, arrivalTime),
    totalSeats: busDoc.totalSeats,
    seats: buildSeats(busDoc.totalSeats),
    fare,
    status: 'scheduled',
  });
  res.status(201).json({ trip });
}

export async function updateTrip(req, res) {
  const existing = await Trip.findById(req.params.id);
  if (!existing) throw notFound('Trip not found');
  const updates = { ...req.body };
  delete updates.bus;
  const date = updates.date || existing.date;
  if (updates.departureTime) updates.departureTime = dateStringToDate(date, updates.departureTime);
  if (updates.arrivalTime) updates.arrivalTime = dateStringToDate(date, updates.arrivalTime);
  delete updates.date;
  const trip = await Trip.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!trip) throw notFound('Trip not found');
  res.status(200).json({ trip });
}

export async function cancelTrip(req, res) {
  const trip = await Trip.findById(req.params.id);
  if (!trip) throw notFound('Trip not found');
  trip.status = 'cancelled';
  await trip.save();

  const bookings = await Booking.find({ trip: trip._id, status: { $in: ['PENDING', 'CONFIRMED'] } });
  await Promise.all(
    bookings.map(async (booking) => {
      booking.status = 'CANCELLED';
      booking.paymentStatus = booking.paymentStatus === 'PAID' ? 'REFUNDED' : booking.paymentStatus;
      await booking.save();
      await Ticket.updateMany({ booking: booking._id }, { $set: { status: 'CANCELLED' } });
    }),
  );

  res.status(200).json({ message: 'Trip cancelled and passengers refunded', affected: bookings.length });
}

export async function listTimetables(req, res) {
  res.status(200).json({ timetables: await Timetable.find().populate('bus', 'number').sort({ departureTime: 1 }) });
}

export async function createTimetable(req, res) {
  const timetable = await Timetable.create(req.body);
  const count = await generateTrips(timetable);
  res.status(201).json({ timetable, generatedTrips: count });
}

export async function deleteTimetable(req, res) {
  await Timetable.findByIdAndDelete(req.params.id);
  res.status(200).json({ message: 'Timetable removed' });
}

export async function getOverview(req, res) {
  const [buses, conductors, trips, bookings, tickets] = await Promise.all([
    Bus.countDocuments(),
    Conductor.countDocuments({ active: true }),
    Trip.countDocuments(),
    Booking.find().select('amount status paymentStatus').lean(),
    Ticket.countDocuments({ status: 'BOOKED' }),
  ]);
  const revenue = bookings
    .filter((b) => b.paymentStatus === 'PAID' && b.status !== 'CANCELLED')
    .reduce((sum, b) => sum + b.amount, 0);
  res.status(200).json({
    buses,
    conductors,
    trips,
    revenue,
    bookings: bookings.length,
    activeTickets: tickets,
  });
}

export async function listBookings(req, res) {
  const bookings = await Booking.find()
    .populate({ path: 'user', select: 'name phone email' })
    .populate({ path: 'trip', populate: { path: 'bus', select: 'number' } })
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
  res.status(200).json({ bookings });
}
