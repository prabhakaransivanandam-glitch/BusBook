import { z } from 'zod';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { hashPassword, verifyPassword } from '../utils/passwords.js';
import { signAuthToken } from '../utils/authToken.js';
import { asyncHandler, badRequest, conflict, unauthorized, notFound } from '../utils/errors.js';

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().regex(/^\d{10}$/, 'Enter a valid 10-digit phone number'),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6).max(128),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const syncSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().max(20).optional().default(''),
});

export const register = asyncHandler(async (req, res) => {
  const { name, phone, email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) throw conflict('Email is already registered');

  const userId = new mongoose.Types.ObjectId();
  const user = await User.create({
    _id: userId,
    firebaseUid: userId.toString(),
    name,
    phone,
    email,
    password: hashPassword(password),
    role: 'passenger',
    active: true,
  });

  const token = signAuthToken({
    uid: user.firebaseUid,
    email: user.email,
    phone: user.phone,
    name: user.name,
    role: user.role,
  });

  res.status(201).json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user || !user.active) throw unauthorized('Invalid email or password');

  if (!user.password || !verifyPassword(password, user.password)) {
    throw unauthorized('Invalid email or password');
  }

  const token = signAuthToken({
    uid: user.firebaseUid,
    email: user.email,
    phone: user.phone,
    name: user.name,
    role: user.role,
  });

  res.status(200).json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
  });
});

export const syncUser = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  let user = await User.findOne({ firebaseUid: req.auth.uid });

  if (!user) {
    const userId = new mongoose.Types.ObjectId();
    user = await User.create({
      _id: userId,
      firebaseUid: req.auth.uid || userId.toString(),
      name,
      phone,
      email: req.auth.email,
      role: req.auth.role,
    });
  } else {
    user.name = name || user.name;
    user.phone = phone || user.phone;
    user.email = req.auth.email || user.email;
    await user.save();
  }

  res.status(200).json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
  });
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findOne({ firebaseUid: req.auth.uid });
  res.status(200).json({
    auth: req.auth,
    profile: user
      ? { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role }
      : null,
  });
});
