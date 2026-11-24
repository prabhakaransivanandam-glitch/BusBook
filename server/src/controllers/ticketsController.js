import { z } from 'zod';
import Ticket from '../models/Ticket.js';
import Trip from '../models/Trip.js';
import Booking from '../models/Booking.js';
import Conductor from '../models/Conductor.js';
import ScanLog from '../models/ScanLog.js';
import { verifyTicketToken } from '../utils/ticketToken.js';
import { badRequest, forbidden } from '../utils/errors.js';
import { evaluateTicket, RESULT } from '../services/ticketValidation.js';

export const validateSchema = z.object({
  tripId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid trip'),
  qrToken: z.string().min(10).optional(),
  ticketId: z.string().min(4).optional(),
}).refine((data) => Boolean(data.qrToken || data.ticketId), {
  message: 'Provide qrToken or ticketId',
});

export async function validateTicket(req, res) {
  const { tripId, qrToken, ticketId } = req.body;
  const conductor = await Conductor.findOne({ firebaseUid: req.auth.uid });
  if (!conductor || !conductor.active) throw forbidden('Conductor account is not active');

  const trip = await Trip.findById(tripId).populate('bus', 'number type').lean();
  if (!trip) throw badRequest('Trip not found');
  if (conductor.assignedBus && String(trip.bus?._id || trip.bus) !== String(conductor.assignedBus)) {
    throw forbidden('You are not assigned to this bus');
  }

  let payload = null;
  let ticket = null;

  try {
    const rawToken = qrToken || (await Ticket.findOne({ ticketId })?.select('qrToken'))?.qrToken;
    if (rawToken) payload = verifyTicketToken(rawToken);
    if (payload?.ticketId) {
      ticket = await Ticket.findOne({ ticketId: payload.ticketId })
        .populate({ path: 'booking', populate: { path: 'user', select: 'name phone' } })
        .lean();
    }
  } catch {
    payload = null;
  }

  const decision = evaluateTicket({ payload, ticket, trip, selectedTripId: tripId });

  let usedTicket = null;
  if (decision.result === RESULT.VALID) {
    usedTicket = await Ticket.findOneAndUpdate(
      { _id: ticket._id, status: 'BOOKED' },
      { $set: { status: 'USED', usedAt: new Date() } },
      { new: true },
    );
    if (!usedTicket) {
      decision.result = RESULT.ALREADY_USED;
      decision.message = 'Ticket already used';
    }
  }

  await ScanLog.create({
    ticket: ticket?._id || null,
    ticketId: ticket?.ticketId || ticketId || '',
    trip: trip._id,
    conductor: conductor._id,
    conductorUid: req.auth.uid,
    result: decision.result,
  });

  const ok = decision.result === RESULT.VALID;
  res.status(ok ? 200 : 409).json({
    result: decision.result,
    message: decision.message,
    ticket: ticket
      ? {
          ticketId: ticket.ticketId,
          passengerName: ticket.booking?.user?.name || 'Passenger',
          seats: ticket.seatNumbers,
          route: trip.direction.replaceAll('_', ' '),
          busNumber: trip.bus?.number || '',
          status: usedTicket?.status || ticket.status,
        }
      : null,
  });
}

export async function getScanLogs(req, res) {
  const logs = await ScanLog.find()
    .populate('trip', 'date departureTime')
    .sort({ scannedAt: -1 })
    .limit(100)
    .lean();
  res.status(200).json({ logs });
}
