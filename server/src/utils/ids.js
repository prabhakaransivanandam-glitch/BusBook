import crypto from 'node:crypto';

export function generateTicketId() {
  const time = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `BB-${time}-${random}`;
}

export function generateTempPassword() {
  return `Bb!${crypto.randomBytes(9).toString('base64url').slice(0, 14)}Aa1`;
}
