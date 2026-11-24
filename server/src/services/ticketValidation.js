export const RESULT = {
  VALID: 'VALID',
  INVALID: 'INVALID',
  ALREADY_USED: 'ALREADY_USED',
  WRONG_BUS: 'WRONG_BUS',
  EXPIRED: 'EXPIRED',
};

const MESSAGES = {
  VALID: 'Ticket is valid',
  INVALID: 'Invalid ticket',
  ALREADY_USED: 'Ticket already used',
  WRONG_BUS: 'Ticket belongs to a different bus/trip',
  EXPIRED: 'Ticket has expired',
};

/**
 * Pure decision function. Kept separate from Express/Mongo so it can be unit tested.
 */
export function evaluateTicket({ payload, ticket, trip, selectedTripId, now = new Date() }) {
  if (!payload?.ticketId || !payload?.tripId) {
    return { result: RESULT.INVALID, message: MESSAGES.INVALID };
  }
  if (!ticket || String(ticket.ticketId) !== String(payload.ticketId)) {
    return { result: RESULT.INVALID, message: MESSAGES.INVALID };
  }
  if (ticket.status === 'CANCELLED') {
    return { result: RESULT.INVALID, message: 'Ticket was cancelled' };
  }
  if (Number(payload.exp) * 1000 <= now.getTime() || ticket.status === 'EXPIRED') {
    return { result: RESULT.EXPIRED, message: MESSAGES.EXPIRED };
  }
  if (String(ticket.trip) !== String(payload.tripId) || String(selectedTripId) !== String(payload.tripId)) {
    return { result: RESULT.WRONG_BUS, message: MESSAGES.WRONG_BUS };
  }
  if (!trip || trip.status === 'cancelled') {
    return { result: RESULT.INVALID, message: 'Trip is not active' };
  }
  if (ticket.status === 'USED') {
    return { result: RESULT.ALREADY_USED, message: MESSAGES.ALREADY_USED };
  }
  if (ticket.status !== 'BOOKED') {
    return { result: RESULT.INVALID, message: MESSAGES.INVALID };
  }
  return { result: RESULT.VALID, message: MESSAGES.VALID };
}

export { MESSAGES };
