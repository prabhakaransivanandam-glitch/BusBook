import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { Button, Card, DIRECTIONS, EmptyState, Skeleton, formatINR, formatTime, todayISO } from '../components/UI.jsx';
import { api } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';

const DIRECTION_KEYS = Object.keys(DIRECTIONS);

export default function Home() {
  const [direction, setDirection] = useState(DIRECTION_KEYS[0]);
  const [date, setDate] = useState(todayISO());
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();
  const navigate = useNavigate();

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const data = await api(`/trips/search?direction=${direction}&date=${date}`);
      setTrips(data.trips);
    } catch (err) {
      setError(err.message);
      if (silent) toast(err.message, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [direction, date, toast]);

  useEffect(() => {
    load();
    const timer = setInterval(() => load(true), 10000);
    return () => clearInterval(timer);
  }, [load]);

  const swap = () => {
    setDirection((current) => current === DIRECTION_KEYS[0] ? DIRECTION_KEYS[1] : DIRECTION_KEYS[0]);
  };

  return (
    <Layout title="BusBook">
      <Card>
        <div className="toggle">
          {DIRECTION_KEYS.map((key) => (
            <button
              key={key}
              className={`toggle__option ${direction === key ? 'is-active' : ''}`}
              onClick={() => setDirection(key)}
            >
              {DIRECTIONS[key].replace(' → ', '\n')}
            </button>
          ))}
        </div>
        <Button variant="secondary" className="swap-btn" onClick={swap}>⇅ Swap direction</Button>
        <label className="field" style={{ marginBottom: 0 }}>
          <span className="field__label">Travel date</span>
          <input type="date" min={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </Card>

      <div className="row row--between section-title">
        <span>Available buses</span>
        <span className="small muted">{refreshing ? 'Refreshing seats…' : `${trips.length} found`}</span>
      </div>

      {loading && <Card><Skeleton lines={4} /></Card>}

      {!loading && error && trips.length === 0 && (
        <EmptyState
          title="Couldn't load trips"
          message={error}
          action={<Button onClick={() => load()}>Try again</Button>}
        />
      )}

      {!loading && !error && trips.length === 0 && (
        <EmptyState title="No buses found" message="Try another date or direction. Departed trips are hidden." />
      )}

      {trips.map((trip) => (
        <Card key={trip.id} className="trip-card" onClick={() => !trip.soldOut && navigate(`/seats/${trip.id}`)} style={{ cursor: trip.soldOut ? 'not-allowed' : 'pointer' }}>
          <div className="row row--between">
            <div>
              <div className="trip-card__time">{formatTime(trip.departureTime)} → {formatTime(trip.arrivalTime)}</div>
              <div className="trip-card__route">{DIRECTIONS[trip.direction]}</div>
            </div>
            <span className={`badge ${trip.soldOut ? 'badge--out' : trip.seatsLeft <= 5 ? 'badge--low' : ''}`}>
              {trip.soldOut ? 'Sold out' : `${trip.seatsLeft} seats left`}
            </span>
          </div>
          <div className="row row--between mt">
            <div>
              <b>{trip.busNumber}</b> <span className="muted small">· {trip.busType}</span>
            </div>
            <div>
              <b>{formatINR(trip.fare)}</b> <span className="muted small">/ seat</span>
            </div>
          </div>
        </Card>
      ))}
    </Layout>
  );
}
