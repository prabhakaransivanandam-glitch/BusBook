import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { Button, Card, EmptyState, Spinner, StatusPill, formatDateTime, formatINR } from '../components/UI.jsx';
import { api } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';

export default function Confirmation() {
  const { bookingId } = useParams();
  const location = useLocation();
  const [booking, setBooking] = useState(location.state?.booking || null);
  const [loading, setLoading] = useState(!booking);
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(location.state?.holdSeconds || 300);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (booking) return;
    api('/bookings/my')
      .then((data) => setBooking(data.bookings.find((item) => item.id === bookingId) || null))
      .catch((error) => toast(error.message, 'error'))
      .finally(() => setLoading(false));
  }, [booking, bookingId, toast]);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [seconds]);

  const confirm = async () => {
    setBusy(true);
    try {
      await api(`/bookings/${bookingId}/confirm`, { method: 'POST' });
      toast('Booking confirmed! Your ticket is ready.');
      navigate('/tickets', { replace: true });
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Layout title="Confirmation" back><Spinner /></Layout>;
  if (!booking) return <Layout title="Confirmation" back><EmptyState title="Booking not found" message="It may have expired." action={<Button onClick={() => navigate('/home')}>Find buses</Button>} /></Layout>;

  return (
    <Layout title="Confirmation" back>
      <Card className="stack">
        <div className="row row--between">
          <h2>Review booking</h2>
          <StatusPill status={booking.status} />
        </div>
        <div className="list-row"><b>Trip</b><span className="small">{booking.trip?.busNumber || 'Bus'} · {booking.trip?.direction?.replaceAll('_', ' ')}</span></div>
        <div className="list-row"><b>Departure</b><span className="small">{formatDateTime(booking.trip?.departureTime)}</span></div>
        <div className="list-row"><b>Seats</b><span className="small">{booking.seatNumbers.join(', ')}</span></div>
        <div className="list-row"><b>Passengers</b><span className="small">{booking.passengerNames.join(', ')}</span></div>
        <div className="list-row"><b>Amount</b><b>{formatINR(booking.amount)}</b></div>
        <div className="card card--grey small">
          Seats held for {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}. Confirm before the hold expires.
        </div>
        <Button onClick={confirm} disabled={busy || booking.status !== 'PENDING' || seconds === 0}>
          {booking.status === 'CONFIRMED' ? 'View my tickets' : busy ? 'Confirming…' : 'Confirm & generate ticket'}
        </Button>
      </Card>
    </Layout>
  );
}
