import mongoose from 'mongoose';

const scanLogSchema = new mongoose.Schema(
  {
    ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', default: null },
    ticketId: { type: String, default: '' },
    trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', default: null },
    conductor: { type: mongoose.Schema.Types.ObjectId, ref: 'Conductor', default: null },
    conductorUid: { type: String, default: '' },
    result: {
      type: String,
      enum: ['VALID', 'INVALID', 'ALREADY_USED', 'WRONG_BUS', 'EXPIRED'],
      required: true,
    },
    scannedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export default mongoose.model('ScanLog', scanLogSchema);
