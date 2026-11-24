import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export function signAuthToken(payload) {
  return jwt.sign(payload, config.qrSecret, { expiresIn: '7d' });
}

export function verifyAuthToken(token) {
  return jwt.verify(token, config.qrSecret);
}
