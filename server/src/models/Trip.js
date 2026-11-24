import mongoose from 'mongoose';
import { DIRECTIONS } from './Timetable.js';

const seatSchema = new mongoose.Schema(
  {
    number: { type: Number, required: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
    holdExpiresAt: { type: Date, default: null },
  },
  { _id: false },
);

const tripSchema = new mongoose.Schema(
  {
    bus: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },
    timetable: { type: mongoose.Schema.Types.ObjectId, ref: 'Timetable', default: null },
    direction: { type: String, enum: Object.values(DIRECTIONS), required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    departureTime: { type: Date, required: true },
    arrivalTime: { type: Date, required: true },
    totalSeats: { type: Number, required: true, min: 1 },
    seats: { type: [seatSchema], default: [] },
    fare: { type: Number, required: true, min: 1 },
    conductor: { type: mongoose.Schema.Types.ObjectId, ref: 'Conductor', default: null },
    status: {
      type: String,
      enum: ['scheduled', 'running', 'completed', 'cancelled'],
      default: 'scheduled',
    },
  },
  { timestamps: true },
);

tripSchema.index({ date: 1, direction: 1, departureTime: 1 });
tripSchema.index({ bus: 1, date: 1 });

tripSchema.virtual('availableSeats').get(function availableSeats() {
  return this.seats.filter((seat) => !seat.bookingId || (seat.holdExpiresAt && seat.holdExpiresAt <= new Date())).length;
});

tripSchema.set('toJSON', { virtuals: true });

export default mongoose.model('Trip', tripSchema);
