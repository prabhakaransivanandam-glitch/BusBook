import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true, index: true },
    seatNumbers: { type: [Number], required: true },
    passengerNames: { type: [String], required: true },
    amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED'],
      default: 'PENDING',
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID', 'REFUNDED'],
      default: 'PENDING',
    },
    holdExpiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

export default mongoose.model('Booking', bookingSchema);
