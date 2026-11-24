import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export function signTicketToken({ ticketId, tripId }) {
  return jwt.sign({ ticketId, tripId }, config.qrSecret, {
    algorithm: 'HS256',
    expiresIn: `${config.qrTtlDays}d`,
    jwtid: ticketId,
  });
}

export function verifyTicketToken(token) {
  return jwt.verify(token, config.qrSecret, { algorithms: ['HS256'] });
}
