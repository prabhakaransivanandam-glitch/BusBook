import mongoose from 'mongoose';

const busSchema = new mongoose.Schema(
  {
    number: { type: String, required: true, unique: true, trim: true, uppercase: true },
    type: { type: String, required: true, trim: true, default: 'AC Seater' },
    totalSeats: { type: Number, required: true, min: 4, max: 80 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export default mongoose.model('Bus', busSchema);
