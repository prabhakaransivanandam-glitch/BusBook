import { z } from 'zod';
import Trip from '../models/Trip.js';
import { DIRECTION_OPTIONS, isValidDateString, serializeTrip } from '../services/tripService.js';
import { badRequest } from '../utils/errors.js';

export const searchSchema = z.object({
  direction: z.enum(DIRECTION_OPTIONS),
  date: z.string().refine(isValidDateString, 'Use YYYY-MM-DD'),
});

export async function searchTrips(req, res) {
  const { direction, date } = req.query;
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(`${date}T23:59:59.999`);

  const trips = await Trip.find({
    direction,
    status: { $in: ['scheduled', 'running'] },
    departureTime: { $gte: start, $lte: end, $gt: new Date() },
  })
    .populate('bus', 'number type totalSeats')
    .sort({ departureTime: 1 })
    .lean();

  res.status(200).json({ trips: trips.map(serializeTrip) });
}

export async function getTrip(req, res) {
  const trip = await Trip.findById(req.params.id).populate('bus', 'number type totalSeats').lean();
  if (!trip) throw badRequest('Trip not found');
  res.status(200).json({ trip: serializeTrip(trip) });
}
