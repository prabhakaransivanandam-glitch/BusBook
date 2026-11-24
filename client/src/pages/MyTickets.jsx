import { useCallback, useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Layout from '../components/Layout.jsx';
import { Button, Card, DIRECTIONS, EmptyState, Skeleton, StatusPill, formatDateTime } from '../components/UI.jsx';
import { api } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';

const CACHE_KEY = 'busbook:tickets';

export default function MyTickets() {
  const [tickets, setTickets] = useState([]);
  const [tab, setTab] = useState('upcoming');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      const data = await api('/tickets/my');
      setTickets(data.tickets);
      localStorage.setItem(CACHE_KEY, JSON.stringify(data.tickets));
    } catch (error) {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        setTickets(JSON.parse(cached));
        toast('Showing saved tickets (offline)', 'error');
      } else {
        toast(error.message, 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const cancel = async (ticket) => {
    if (!window.confirm(`Cancel ticket ${ticket.ticketId}? Seats will be released.`)) return;
    setBusy(ticket.ticketId);
    try {
      await api(`/bookings/${ticket.booking}/cancel`, { method: 'POST' });
      toast('Ticket cancelled. Seats released.');
      await load();
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setBusy('');
    }
  };

  const now = Date.now();
  const visible = tickets.filter((ticket) => {
    const upcoming = new Date(ticket.trip?.departureTime).getTime() >= now;
    return tab === 'upcoming' ? upcoming : !upcoming;
  });

  return (
    <Layout title="My tickets">
      <div className="tabs">
        <button className={tab === 'upcoming' ? 'is-active' : ''} onClick={() => setTab('upcoming')}>Upcoming</button>
        <button className={tab === 'past' ? 'is-active' : ''} onClick={() => setTab('past')}>Past</button>
      </div>

      {loading && <Card><Skeleton lines={5} /></Card>}

      {!loading && visible.length === 0 && (
        <EmptyState title={tab === 'upcoming' ? 'No upcoming tickets' : 'No past tickets'} message="Your tickets will appear here after booking." />
      )}

      {visible.map((ticket) => {
        const canCancel = ticket.status === 'BOOKED' && new Date(ticket.trip?.departureTime).getTime() > now;
        return (
          <Card key={ticket.ticketId} className="ticket-card stack">
            <div className="row row--between">
              <StatusPill status={ticket.status} />
              <span className="small muted">{ticket.ticketId}</span>
            </div>
            <div className="ticket-card__qr">
              <QRCodeSVG value={ticket.qrToken} size={200} level="M" includeMargin />
            </div>
            <p className="small muted">Show this QR at boarding</p>
            <div className="list-row"><b>Bus</b><span>{ticket.trip?.busNumber || '—'}</span></div>
            <div className="list-row"><b>Route</b><span className="small">{DIRECTIONS[ticket.trip?.direction] || '—'}</span></div>
            <div className="list-row"><b>Date & time</b><span className="small">{formatDateTime(ticket.trip?.departureTime)}</span></div>
            <div className="list-row"><b>Seats</b><span>{ticket.seatNumbers.join(', ')}</span></div>
            <div className="list-row"><b>Fare</b><span>₹{ticket.amount}</span></div>
            {canCancel && (
              <Button variant="secondary" onClick={() => cancel(ticket)} disabled={busy === ticket.ticketId}>
                {busy === ticket.ticketId ? 'Cancelling…' : 'Cancel ticket'}
              </Button>
            )}
          </Card>
        );
      })}
    </Layout>
  );
}
