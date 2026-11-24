import Trip from '../models/Trip.js';
import Booking from '../models/Booking.js';
import Ticket from '../models/Ticket.js';
import { DIRECTIONS } from '../models/Timetable.js';

export const buildSeats = (totalSeats) =>
  Array.from({ length: totalSeats }, (_, index) => ({ number: index + 1 }));

export function dateStringToDate(date, time) {
  return new Date(`${date}T${time}:00`);
}

export function isValidDateString(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return false;
  const parsed = new Date(`${date}T00:00:00`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

export async function generateTrips(timetable) {
  const now = new Date();
  const operations = [];

  for (let offset = 0; offset < timetable.daysAhead; offset += 1) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const date = [
      day.getFullYear(),
      String(day.getMonth() + 1).padStart(2, '0'),
      String(day.getDate()).padStart(2, '0'),
    ].join('-');
    const departureTime = dateStringToDate(date, timetable.departureTime);
    if (departureTime.getTime() <= now.getTime()) continue;

    operations.push(
      Trip.updateOne(
        { timetable: timetable._id, date, departureTime },
        {
          $setOnInsert: {
            bus: timetable.bus,
            timetable: timetable._id,
            direction: timetable.direction,
            date,
            departureTime,
            arrivalTime: dateStringToDate(date, timetable.arrivalTime),
            fare: timetable.fare,
          },
        },
        { upsert: true },
      ),
    );
  }

  await Promise.all(operations);
  return Trip.countDocuments({ timetable: timetable._id });
}

export function serializeTrip(trip) {
  const now = new Date();
  const seats = trip.seats.map((seat) => {
    const held = seat.bookingId && seat.holdExpiresAt && seat.holdExpiresAt > now;
    return {
      number: seat.number,
      state: held || seat.bookingId ? 'booked' : 'available',
    };
  });
  const availableSeats = seats.filter((seat) => seat.state === 'available').length;
  const departure = new Date(trip.departureTime);
  const arrival = new Date(trip.arrivalTime);
  const minutes = Math.max(0, Math.round((arrival - departure) / 60000));

  return {
    id: trip._id,
    bus: trip.bus,
    busNumber: trip.bus?.number || '—',
    busType: trip.bus?.type || '—',
    direction: trip.direction,
    date: trip.date,
    departureTime: trip.departureTime,
    arrivalTime: trip.arrivalTime,
    durationMinutes: minutes,
    fare: trip.fare,
    totalSeats: trip.totalSeats,
    availableSeats,
    seatsLeft: availableSeats,
    soldOut: availableSeats === 0,
    status: trip.status,
    conductor: trip.conductor,
    seats,
  };
}

export const DIRECTION_OPTIONS = Object.values(DIRECTIONS);

export async function releaseExpiredHolds() {
  const now = new Date();

  const trips = await Trip.find({
    'seats.bookingId': { $ne: null },
    'seats.holdExpiresAt': { $lte: now, $ne: null },
  }).select('_id seats');

  await Promise.all(
    trips.map((trip) =>
      Trip.updateOne(
        { _id: trip._id },
        {
          $set: {
            'seats.$[expired].bookingId': null,
            'seats.$[expired].holdExpiresAt': null,
          },
        },
        {
          arrayFilters: [
            { 'expired.bookingId': { $ne: null }, 'expired.holdExpiresAt': { $lte: now, $ne: null } },
          ],
        },
      ),
    ),
  );

  const pending = await Booking.find({ status: 'PENDING', holdExpiresAt: { $lte: now } });
  await Promise.all(
    pending.map(async (booking) => {
      booking.status = 'EXPIRED';
      await booking.save();
      await Ticket.updateMany(
        { booking: booking._id, status: 'BOOKED' },
        { $set: { status: 'EXPIRED' } },
      );
    }),
  );

  return pending.length;
}

export function startHoldCleanup() {
  const timer = setInterval(() => {
    releaseExpiredHolds().catch((error) =>
      console.error('[BusBook] Seat hold cleanup failed:', error.message),
    );
  }, 30000);
  timer.unref();
  return timer;
}
