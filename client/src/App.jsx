import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute, { PublicRoute } from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import Home from './pages/Home.jsx';
import SeatSelection from './pages/SeatSelection.jsx';
import Confirmation from './pages/Confirmation.jsx';
import MyTickets from './pages/MyTickets.jsx';
import Bookings from './pages/Bookings.jsx';
import Profile from './pages/Profile.jsx';
import Conductor from './pages/Conductor.jsx';
import Scan from './pages/Scan.jsx';
import Admin from './pages/Admin.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />

      <Route element={<ProtectedRoute roles={['passenger']} />}>
        <Route path="/home" element={<Home />} />
        <Route path="/seats/:tripId" element={<SeatSelection />} />
        <Route path="/confirm/:bookingId" element={<Confirmation />} />
        <Route path="/tickets" element={<MyTickets />} />
        <Route path="/bookings" element={<Bookings />} />
      </Route>

      <Route element={<ProtectedRoute roles={['conductor']} />}>
        <Route path="/conductor" element={<Conductor />} />
        <Route path="/conductor/scan" element={<Scan />} />
      </Route>

      <Route element={<ProtectedRoute roles={['admin']} />}>
        <Route path="/admin" element={<Admin section="overview" />} />
        <Route path="/admin/conductors" element={<Admin section="conductors" />} />
        <Route path="/admin/buses" element={<Admin section="buses" />} />
        <Route path="/admin/trips" element={<Admin section="trips" />} />
      </Route>

      <Route path="/profile" element={<ProtectedRoute roles={['passenger', 'conductor', 'admin']} />}>
        <Route index element={<Profile />} />
      </Route>

      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}
