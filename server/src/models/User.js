import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    firebaseUid: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    password: { type: String, default: null },
    phone: { type: String, default: '', trim: true },
    role: {
      type: String,
      enum: ['passenger', 'conductor', 'admin'],
      default: 'passenger',
      required: true,
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export default mongoose.model('User', userSchema);
