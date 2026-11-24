import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { validate } from '../utils/validate.js';
import {
  register,
  login,
  syncUser,
  getMe,
  registerSchema,
  loginSchema,
  syncSchema,
} from '../controllers/authController.js';
import { searchTrips, getTrip, searchSchema } from '../controllers/tripsController.js';
import {
  createBooking,
  confirmBooking,
  cancelBooking,
  getMyBookings,
  getMyTickets,
  createBookingSchema,
} from '../controllers/bookingsController.js';
import { validateTicket, getScanLogs, validateSchema } from '../controllers/ticketsController.js';
import {
  getConductorProfile,
  getAssignedTrips,
  getTripSummary,
  selectTrip,
} from '../controllers/conductorController.js';
import * as admin from '../controllers/adminController.js';

const router = Router();

// Public auth routes (no token required)
router.post('/auth/register', validate(registerSchema), register);
router.post('/auth/login', validate(loginSchema), login);

// Protected routes require valid auth token
router.use(verifyToken);

router.post('/auth/sync', validate(syncSchema), syncUser);
router.get('/auth/me', getMe);

router.get('/trips/search', validate(searchSchema, 'query'), searchTrips);
router.get('/trips/:id', getTrip);

router.post('/bookings', validate(createBookingSchema), createBooking);
router.post('/bookings/:id/confirm', confirmBooking);
router.post('/bookings/:id/cancel', cancelBooking);
router.get('/bookings/my', getMyBookings);
router.get('/tickets/my', getMyTickets);

const scanLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many scans. Please slow down.' },
});
router.post(
  '/tickets/validate',
  scanLimiter,
  requireRole('conductor', 'admin'),
  validate(validateSchema),
  validateTicket,
);

router.get('/conductor/profile', requireRole('conductor', 'admin'), getConductorProfile);
router.get('/conductor/trips', requireRole('conductor', 'admin'), getAssignedTrips);
router.get('/conductor/trips/:tripId/summary', requireRole('conductor', 'admin'), getTripSummary);
router.post('/conductor/trips/:tripId/select', requireRole('conductor', 'admin'), selectTrip);

// ---------------- Admin only ----------------
const adminOnly = requireRole('admin');

router.get('/admin/overview', adminOnly, admin.getOverview);
router.get('/admin/bookings', adminOnly, admin.listBookings);
router.get('/admin/scan-logs', adminOnly, getScanLogs);

router.get('/admin/conductors', adminOnly, admin.listConductors);
router.post('/admin/conductors', adminOnly, validate(admin.conductorSchema), admin.createConductor);
router.patch('/admin/conductors/:id', adminOnly, admin.updateConductor);
router.post('/admin/conductors/:id/toggle', adminOnly, admin.toggleConductor);
router.delete('/admin/conductors/:id', adminOnly, admin.deleteConductor);
router.post('/admin/conductors/:id/reset-password', adminOnly, admin.resetConductorPassword);

router.get('/admin/buses', adminOnly, admin.listBuses);
router.post('/admin/buses', adminOnly, validate(admin.busSchema), admin.createBus);
router.patch('/admin/buses/:id', adminOnly, admin.updateBus);
router.delete('/admin/buses/:id', adminOnly, admin.deleteBus);

router.get('/admin/trips', adminOnly, admin.listTrips);
router.post('/admin/trips', adminOnly, validate(admin.tripSchema), admin.createTrip);
router.patch('/admin/trips/:id', adminOnly, validate(admin.tripSchema.partial()), admin.updateTrip);
router.post('/admin/trips/:id/cancel', adminOnly, admin.cancelTrip);

router.get('/admin/timetables', adminOnly, admin.listTimetables);
router.post('/admin/timetables', adminOnly, validate(admin.timetableSchema), admin.createTimetable);
router.delete('/admin/timetables/:id', adminOnly, admin.deleteTimetable);

export default router;
