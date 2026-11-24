import { useCallback, useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { Button, Card, DIRECTIONS, EmptyState, Field, Skeleton, StatusPill, formatDateTime, todayISO } from '../components/UI.jsx';
import { api } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';

const TABS = [
  { to: '/admin', label: 'Overview', section: 'overview', end: true },
  { to: '/admin/conductors', label: 'Conductors', section: 'conductors' },
  { to: '/admin/buses', label: 'Buses', section: 'buses' },
  { to: '/admin/trips', label: 'Trips', section: 'trips' },
];

const emptyConductor = { name: '', phone: '', email: '', password: '', employeeId: '' };
const emptyBus = { number: '', totalSeats: 40, type: 'AC Seater' };
const emptyTrip = {
  bus: '', conductor: '', direction: Object.keys(DIRECTIONS)[0],
  date: todayISO(), departureTime: '06:00', arrivalTime: '08:15', fare: 180,
};

export default function Admin({ section }) {
  const [data, setData] = useState(null);
  const [buses, setBuses] = useState([]);
  const [conductors, setConductors] = useState([]);
  const [conductorForm, setConductorForm] = useState(emptyConductor);
  const [busForm, setBusForm] = useState(emptyBus);
  const [tripForm, setTripForm] = useState(emptyTrip);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (section === 'overview') {
        const [overview, tripData] = await Promise.all([api('/admin/overview'), api('/admin/trips')]);
        setData({ ...overview, trips: tripData.trips.slice(0, 8) });
      } else if (section === 'conductors') {
        const query = `?search=${encodeURIComponent(search)}&active=${activeFilter}`;
        const [conductorData, busData] = await Promise.all([api(`/admin/conductors${query}`), api('/admin/buses')]);
        setData({ conductors: conductorData.conductors });
        setBuses(busData.buses);
      } else if (section === 'buses') {
        const busData = await api('/admin/buses');
        setData({ buses: busData.buses });
      } else if (section === 'trips') {
        const [tripData, busData, conductorData] = await Promise.all([
          api('/admin/trips'), api('/admin/buses'), api('/admin/conductors'),
        ]);
        setData({ trips: tripData.trips });
        setBuses(busData.buses);
        setConductors(conductorData.conductors.filter((item) => item.active));
        if (busData.buses.length) setTripForm((prev) => ({ ...prev, bus: prev.bus || busData.buses[0].id }));
      }
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [section, search, activeFilter, toast]);

  useEffect(() => { load(); }, [load]);

  const submit = async (event, path, payload, reset) => {
    event.preventDefault();
    setBusy(true);
    try {
      await api(path, { method: 'POST', body: payload });
      toast('Saved successfully');
      reset();
      await load();
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const action = async (path, message) => {
    try {
      const response = await api(path, { method: 'POST' });
      toast(response.password ? `Temporary password: ${response.password}` : message);
      await load();
    } catch (error) {
      toast(error.message, 'error');
    }
  };

  const remove = async (path) => {
    if (!window.confirm('Are you sure? This cannot be undone.')) return;
    try {
      await api(path, { method: 'DELETE' });
      toast('Deleted');
      await load();
    } catch (error) {
      toast(error.message, 'error');
    }
  };

  return (
    <Layout title="BusBook Admin">
      <nav className="admin-nav">
        {TABS.map((tab) => (
          <NavLink key={tab.to} to={tab.to} end={tab.end} className={({ isActive }) => (isActive ? 'is-active' : '')}>
            {tab.label}
          </NavLink>
        ))}
      </nav>

      {loading && <Card><Skeleton lines={5} /></Card>}

      {!loading && section === 'overview' && data && (
        <>
          <div className="stats">
            <div className="stat"><b>{data.revenue}</b><span className="small">Revenue (₹)</span></div>
            <div className="stat"><b>{data.bookings}</b><span className="small">Bookings</span></div>
            <div className="stat"><b>{data.trips}</b><span className="small">Trips</span></div>
            <div className="stat"><b>{data.buses}</b><span className="small">Buses</span></div>
          </div>
          <div className="section-title">Recent trips</div>
          {data.trips.length === 0 ? <EmptyState title="No trips yet" message="Add a bus and a trip to get started." /> : (
            data.trips.map((trip) => (
              <Card key={trip.id} className="trip-card">
                <div className="row row--between"><b>{trip.bus?.number || '—'}</b><StatusPill status={trip.status} /></div>
                <p className="small muted">{DIRECTIONS[trip.direction]}</p>
                <div className="row row--between small">
                  <span>{formatDateTime(trip.departureTime)}</span>
                  <span>{trip.bookedSeats}/{trip.totalSeats} seats</span>
                </div>
              </Card>
            ))
          )}
        </>
      )}

      {!loading && section === 'conductors' && (
        <>
          <Card>
            <h2 className="section-title" style={{ marginTop: 0 }}>Add conductor</h2>
            <form onSubmit={(event) => submit(event, '/admin/conductors', conductorForm, () => setConductorForm(emptyConductor))}>
              <Field label="Name"><input required value={conductorForm.name} onChange={(e) => setConductorForm({ ...conductorForm, name: e.target.value })} /></Field>
              <Field label="Phone"><input required inputMode="numeric" value={conductorForm.phone} onChange={(e) => setConductorForm({ ...conductorForm, phone: e.target.value })} /></Field>
              <Field label="Email"><input required type="email" value={conductorForm.email} onChange={(e) => setConductorForm({ ...conductorForm, email: e.target.value })} /></Field>
              <Field label="Temporary password"><input required type="password" minLength={6} value={conductorForm.password} onChange={(e) => setConductorForm({ ...conductorForm, password: e.target.value })} /></Field>
              <Field label="Employee ID"><input required value={conductorForm.employeeId} onChange={(e) => setConductorForm({ ...conductorForm, employeeId: e.target.value })} /></Field>
              <Button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create conductor'}</Button>
            </form>
          </Card>

          <div className="section-title">Conductor list</div>
          <Card className="stack">
            <input className="input" placeholder="Search name, email or employee ID" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="input" value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}>
              <option value="all">All statuses</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </Card>

          {data?.conductors?.length === 0 ? <EmptyState title="No conductors found" message="Add a conductor above." /> : (
            data?.conductors?.map((conductor) => (
              <Card key={conductor.id} className="trip-card stack">
                <div className="row row--between">
                  <b>{conductor.name}</b>
                  <span className="pill">{conductor.active ? 'Active' : 'Inactive'}</span>
                </div>
                <div className="small muted">{conductor.email} · {conductor.phone}</div>
                <div className="small">ID: {conductor.employeeId} · Bus: {conductor.assignedBus?.number || 'Unassigned'}</div>
                <div className="row" style={{ flexWrap: 'wrap' }}>
                  <Button variant="secondary" className="btn--small" onClick={() => action(`/admin/conductors/${conductor.id}/toggle`, conductor.active ? 'Deactivated' : 'Activated')}>
                    {conductor.active ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button variant="secondary" className="btn--small" onClick={() => action(`/admin/conductors/${conductor.id}/reset-password`, 'Password reset')}>Reset password</Button>
                  <Button variant="danger" className="btn--small" onClick={() => remove(`/admin/conductors/${conductor.id}`)}>Delete</Button>
                </div>
              </Card>
            ))
          )}
        </>
      )}

      {!loading && section === 'buses' && (
        <>
          <Card>
            <h2 className="section-title" style={{ marginTop: 0 }}>Add bus</h2>
            <form onSubmit={(event) => submit(event, '/admin/buses', { ...busForm, totalSeats: Number(busForm.totalSeats) }, () => setBusForm(emptyBus))}>
              <Field label="Bus number"><input required value={busForm.number} onChange={(e) => setBusForm({ ...busForm, number: e.target.value })} placeholder="TN-01-BB-1003" /></Field>
              <Field label="Total seats"><input required type="number" min={4} max={80} value={busForm.totalSeats} onChange={(e) => setBusForm({ ...busForm, totalSeats: e.target.value })} /></Field>
              <Field label="Type"><input value={busForm.type} onChange={(e) => setBusForm({ ...busForm, type: e.target.value })} /></Field>
              <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Add bus'}</Button>
            </form>
          </Card>
          <div className="section-title">All buses</div>
          {data?.buses?.length === 0 ? <EmptyState title="No buses yet" message="Add your first bus above." /> : (
            data?.buses?.map((bus) => (
              <Card key={bus.id} className="trip-card">
                <div className="row row--between"><b>{bus.number}</b><span className="small muted">{bus.type}</span></div>
                <div className="row row--between mt">
                  <span className="small">{bus.totalSeats} seats</span>
                  <Button variant="danger" className="btn--small" onClick={() => remove(`/admin/buses/${bus.id}`)}>Delete</Button>
                </div>
              </Card>
            ))
          )}
        </>
      )}

      {!loading && section === 'trips' && (
        <>
          <Card>
            <h2 className="section-title" style={{ marginTop: 0 }}>Add trip</h2>
            <form onSubmit={(event) => submit(event, '/admin/trips', { ...tripForm, fare: Number(tripForm.fare) }, () => setTripForm({ ...emptyTrip, bus: buses[0]?.id || '' }))}>
              <Field label="Bus">
                <select required value={tripForm.bus} onChange={(e) => setTripForm({ ...tripForm, bus: e.target.value })}>
                  <option value="">Select bus</option>
                  {buses.map((bus) => <option key={bus.id} value={bus.id}>{bus.number}</option>)}
                </select>
              </Field>
              <Field label="Conductor (optional)">
                <select value={tripForm.conductor} onChange={(e) => setTripForm({ ...tripForm, conductor: e.target.value })}>
                  <option value="">Unassigned</option>
                  {conductors.map((conductor) => <option key={conductor.id} value={conductor.id}>{conductor.name}</option>)}
                </select>
              </Field>
              <Field label="Direction">
                <select value={tripForm.direction} onChange={(e) => setTripForm({ ...tripForm, direction: e.target.value })}>
                  {Object.entries(DIRECTIONS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
              </Field>
              <Field label="Date"><input required type="date" min={todayISO()} value={tripForm.date} onChange={(e) => setTripForm({ ...tripForm, date: e.target.value })} /></Field>
              <div className="row">
                <div style={{ flex: 1 }}><Field label="Departure"><input required type="time" value={tripForm.departureTime} onChange={(e) => setTripForm({ ...tripForm, departureTime: e.target.value })} /></Field></div>
                <div style={{ flex: 1 }}><Field label="Arrival"><input required type="time" value={tripForm.arrivalTime} onChange={(e) => setTripForm({ ...tripForm, arrivalTime: e.target.value })} /></Field></div>
              </div>
              <Field label="Fare (₹)"><input required type="number" min={1} value={tripForm.fare} onChange={(e) => setTripForm({ ...tripForm, fare: e.target.value })} /></Field>
              <Button type="submit" disabled={busy || !buses.length}>{busy ? 'Saving…' : 'Add trip'}</Button>
            </form>
          </Card>

          <div className="section-title">All trips</div>
          {data?.trips?.length === 0 ? <EmptyState title="No trips yet" message="Add a trip above or run the seed script." /> : (
            data?.trips?.map((trip) => (
              <Card key={trip.id} className="trip-card stack">
                <div className="row row--between"><b>{trip.bus?.number || '—'}</b><StatusPill status={trip.status} /></div>
                <div className="small muted">{DIRECTIONS[trip.direction]}</div>
                <div className="row row--between small">
                  <span>{formatDateTime(trip.departureTime)}</span>
                  <span>{trip.bookedSeats}/{trip.totalSeats} booked · ₹{trip.fare}</span>
                </div>
                {trip.status !== 'cancelled' && (
                  <Button variant="secondary" className="btn--small" onClick={() => action(`/admin/trips/${trip.id}/cancel`, 'Trip cancelled and refunds processed')}>Cancel trip</Button>
                )}
              </Card>
            ))
          )}
        </>
      )}
    </Layout>
  );
}
