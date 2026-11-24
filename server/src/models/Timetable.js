import mongoose from 'mongoose';

export const DIRECTIONS = {
  PERUNDURAI_TO_COIMBATORE: 'PERUNDURAI_TO_COIMBATORE',
  COIMBATORE_TO_PERUNDURAI: 'COIMBATORE_TO_PERUNDURAI',
};

export const DIRECTION_LABELS = {
  PERUNDURAI_TO_COIMBATORE: 'Perundurai → Coimbatore',
  COIMBATORE_TO_PERUNDURAI: 'Coimbatore → Perundurai',
};

export const ROUTE_STOPS = {
  PERUNDURAI_TO_COIMBATORE: [
    'Perundurai',
    'Erode Bypass',
    'Uthukuli',
    'Avinashi',
    'Tiruppur',
    'Coimbatore',
  ],
  COIMBATORE_TO_PERUNDURAI: [
    'Coimbatore',
    'Tiruppur',
    'Avinashi',
    'Uthukuli',
    'Erode Bypass',
    'Perundurai',
  ],
};

const timetableSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    bus: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },
    direction: { type: String, enum: Object.values(DIRECTIONS), required: true },
    departureTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    arrivalTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    fare: { type: Number, required: true, min: 1 },
    daysAhead: { type: Number, default: 7, min: 1, max: 60 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export default mongoose.model('Timetable', timetableSchema);
