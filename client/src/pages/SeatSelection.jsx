import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { Button, Card, DIRECTIONS, EmptyState, Skeleton, formatINR, formatTime } from '../components/UI.jsx';
import { api } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';

export default function SeatSelection() {
  const { tripId } = useParams();
  const [trip, setTrip] = useState(null);
  const [selected, setSelected] = useState([]);
  const [names, setNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();
  const navigate = useNavigate();

  const load = useCallback(async (silent = false) => {
    try {
      const data = await api(`/trips/${tripId}`);
      setTrip(data.trip);
      setError('');
    } catch (err) {
      setError(err.message);
      if (silent) toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [tripId, toast]);

  useEffect(() => {
    load();
    const timer = setInterval(() => load(true), 10000);
    return () => clearInterval(timer);
  }, [load]);

  const toggleSeat = (seat) => {
    if (seat.state === 'booked') return;
    setSelected((current) =>
      current.includes(seat.number)
        ? current.filter((number) => number !== seat.number)
        : [...current, seat.number],
    );
  };

  const book = async () => {
    const missing = selected.find((number) => !(names[number] || '').trim());
    if (missing) return toast(`Enter passenger name for seat ${missing}`, 'error');
    setBusy(true);
    try {
      const data = await api('/bookings', {
        method: 'POST',
        body: {
          tripId,
          seatNumbers: selected,
          passengerNames: selected.map((number) => names[number].trim()),
        },
      });
      navigate(`/confirm/${data.booking.id}`, { state: { booking: data.booking, holdSeconds: data.holdSeconds } });
    } catch (err) {
      toast(err.message, 'error');
      load(true);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Layout title="Select seats" back><Card><Skeleton lines={5} /></Card></Layout>;
  if (error || !trip) return <Layout title="Select seats" back><EmptyState title="Trip unavailable" message={error} action={<Button onClick={() => load()}>Retry</Button>} /></Layout>;

  const total = selected.length * trip.fare;
  const rows = [];
  for (let i = 0; i < trip.seats.length; i += 4) rows.push(trip.seats.slice(i, i + 4));

  return (
    <Layout title="Select seats" back>
      <Card>
        <div className="row row--between">
          <b>{trip.busNumber}</b>
          <span className="badge">{trip.seatsLeft} left</span>
        </div>
        <p className="small muted">{DIRECTIONS[trip.direction]}</p>
        <p className="small">{formatTime(trip.departureTime)} → {formatTime(trip.arrivalTime)} · {formatINR(trip.fare)}/seat</p>
      </Card>

      <div className="section-title">Choose your seats</div>
      <Card>
        <div className="seat-grid">
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} style={{ display: 'contents' }}>
              {row.slice(0, 2).map((seat) => (
                <button
                  key={seat.number}
                  className={`seat ${seat.state === 'booked' ? 'is-booked' : ''} ${selected.includes(seat.number) ? 'is-selected' : ''}`}
                  disabled={seat.state === 'booked'}
                  onClick={() => toggleSeat(seat)}
                >{seat.number}</button>
              ))}
              <div />
              {row.slice(2).map((seat) => (
                <button
                  key={seat.number}
                  className={`seat ${seat.state === 'booked' ? 'is-booked' : ''} ${selected.includes(seat.number) ? 'is-selected' : ''}`}
                  disabled={seat.state === 'booked'}
                  onClick={() => toggleSeat(seat)}
                >{seat.number}</button>
              ))}
            </div>
          ))}
        </div>
        <div className="legend">
          <span><i className="legend__dot" />Available</span>
          <span><i className="legend__dot legend__dot--selected" />Selected</span>
          <span><i className="legend__dot legend__dot--booked" />Booked</span>
        </div>
      </Card>

      {selected.length > 0 && (
        <Card className="mt stack">
          <b>Passenger names</b>
          {selected.map((number) => (
            <label className="field" key={number} style={{ marginBottom: 0 }}>
              <span className="field__label">Seat {number}</span>
              <input
                value={names[number] || ''}
                onChange={(e) => setNames((prev) => ({ ...prev, [number]: e.target.value }))}
                placeholder="Name as on ID"
              />
            </label>
          ))}
        </Card>
      )}

      <Card className="mt">
        <div className="row row--between">
          <span>{selected.length} seat{selected.length === 1 ? '' : 's'} selected</span>
          <b style={{ fontSize: 20 }}>{formatINR(total)}</b>
        </div>
      </Card>

      <Button className="mt" disabled={!selected.length || busy} onClick={book}>
        {busy ? 'Holding seats…' : 'Continue to confirmation'}
      </Button>
      <p className="small muted center mt">Seats are held for 5 minutes. Availability refreshes every 10 seconds.</p>
    </Layout>
  );
}
