import { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { Button, Card, EmptyState, Skeleton, StatusPill, formatDateTime, formatINR } from '../components/UI.jsx';
import { api } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    api('/bookings/my')
      .then((data) => setBookings(data.bookings))
      .catch((error) => toast(error.message, 'error'))
      .finally(() => setLoading(false));
  }, [toast]);

  return (
    <Layout title="Booking history">
      {loading && <Card><Skeleton lines={4} /></Card>}
      {!loading && bookings.length === 0 && (
        <EmptyState title="No bookings yet" message="Search for a bus to get started." action={<a href="/home"><Button>Find buses</Button></a>} />
      )}
      {bookings.map((booking) => (
        <Card key={booking.id} className="trip-card">
          <div className="row row--between">
            <b>{booking.trip?.busNumber || 'Bus'}</b>
            <StatusPill status={booking.status} />
          </div>
          <p className="small muted">{formatDateTime(booking.trip?.departureTime)}</p>
          <div className="row row--between mt">
            <span className="small">Seats: {booking.seatNumbers.join(', ')}</span>
            <b>{formatINR(booking.amount)}</b>
          </div>
        </Card>
      ))}
    </Layout>
  );
}
