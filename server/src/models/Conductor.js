import mongoose from 'mongoose';

const conductorSchema = new mongoose.Schema(
  {
    firebaseUid: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    employeeId: { type: String, required: true, unique: true, trim: true },
    assignedBus: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export default mongoose.model('Conductor', conductorSchema);
