import mongoose from 'mongoose';
import { config } from './env.js';

mongoose.set('strictQuery', true);

export async function connectDB() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10000 });
  return mongoose.connection;
}

export default connectDB;
