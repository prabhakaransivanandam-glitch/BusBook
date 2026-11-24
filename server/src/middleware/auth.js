import { verifyAuthToken } from '../utils/authToken.js';
import { asyncHandler, forbidden, unauthorized } from '../utils/errors.js';

const ROLES = new Set(['passenger', 'conductor', 'admin']);

export const verifyToken = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

  if (!token) throw unauthorized('Missing authentication token');

  try {
    const decoded = verifyAuthToken(token);
    req.auth = {
      uid: decoded.uid,
      email: decoded.email || '',
      phone: decoded.phone || '',
      name: decoded.name || '',
      role: ROLES.has(decoded.role) ? decoded.role : 'passenger',
    };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw unauthorized('Session expired, please sign in again');
    }
    throw unauthorized('Invalid authentication token');
  }
});

// Backward-compatible export
export const verifyFirebaseToken = verifyToken;

export const requireRole = (...allowedRoles) => (req, _res, next) => {
  if (!req.auth) throw unauthorized();
  if (!allowedRoles.includes(req.auth.role)) throw forbidden();
  next();
};
