import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { Button, Card, DIRECTIONS, EmptyState, Skeleton, StatusPill, formatTime } from '../components/UI.jsx';
import { api } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';

export default function Conductor() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    api('/conductor/trips')
      .then((data) => setTrips(data.trips))
      .catch((error) => toast(error.message, 'error'))
      .finally(() => setLoading(false));
  }, [toast]);

  const selectTrip = async (trip) => {
    setBusy(trip.id);
    try {
      const data = await api(`/conductor/trips/${trip.id}/select`, { method: 'POST' });
      navigate('/conductor/scan', { state: { trip: { ...trip, ...data.trip } } });
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setBusy('');
    }
  };

  return (
    <Layout title="Conductor · Trips">
      <div className="section-title">Today's assigned trips</div>
      {loading && <Card><Skeleton lines={4} /></Card>}
      {!loading && trips.length === 0 && (
        <EmptyState title="No trips assigned" message="Ask the admin to assign a bus or trip to your account." />
      )}
      {trips.map((trip) => (
        <Card key={trip.id} className="trip-card stack">
          <div className="row row--between">
            <b>{trip.busNumber}</b>
            <StatusPill status={trip.status} />
          </div>
          <p className="small muted">{DIRECTIONS[trip.direction]}</p>
          <div className="row row--between">
            <span>{formatTime(trip.departureTime)}</span>
            <span className="small">{trip.bookedSeats}/{trip.totalSeats} booked</span>
          </div>
          <Button onClick={() => selectTrip(trip)} disabled={busy === trip.id}>
            {busy === trip.id ? 'Starting…' : trip.status === 'running' ? 'Open scanner' : 'Start trip & scan'}
          </Button>
        </Card>
      ))}
    </Layout>
  );
}
