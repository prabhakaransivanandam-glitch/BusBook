import dotenv from 'dotenv';

dotenv.config();

const number = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const config = {
  port: number(process.env.PORT, 5000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/busbook',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || '',
  firebaseServiceAccount: process.env.FIREBASE_SERVICE_ACCOUNT || '',
  qrSecret: process.env.QR_SECRET || 'dev-only-change-me',
  qrTtlDays: number(process.env.QR_TTL_DAYS, 30),
  seatHoldMinutes: number(process.env.SEAT_HOLD_MINUTES, 5),
};
