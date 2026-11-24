import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
    trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ticketId: { type: String, required: true, unique: true, index: true },
    qrToken: { type: String, required: true },
    status: {
      type: String,
      enum: ['BOOKED', 'USED', 'CANCELLED', 'EXPIRED'],
      default: 'BOOKED',
    },
    usedAt: { type: Date, default: null },
    seatNumbers: { type: [Number], default: [] },
  },
  { timestamps: true },
);

export default mongoose.model('Ticket', ticketSchema);
