import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import Layout from '../components/Layout.jsx';
import { Button, Card, EmptyState, Spinner } from '../components/UI.jsx';
import { api } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';

export default function Scan() {
  const location = useLocation();
  const [trip, setTrip] = useState(location.state?.trip || null);
  const [trips, setTrips] = useState([]);
  const [summary, setSummary] = useState(null);
  const [result, setResult] = useState(null);
  const [manual, setManual] = useState('');
  const [busy, setBusy] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const scannerRef = useRef(null);
  const lockRef = useRef(false);
  const validateRef = useRef(() => {});
  const toast = useToast();

  const loadSummary = useCallback(async () => {
    if (!trip?.id) return;
    try {
      const data = await api(`/conductor/trips/${trip.id}/summary`);
      setSummary(data);
    } catch { /* summary is non-critical */ }
  }, [trip?.id]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  useEffect(() => {
    if (!trip && !trips.length) {
      api('/conductor/trips')
        .then((data) => {
          setTrips(data.trips);
          if (data.trips.length) setTrip(data.trips[0]);
        })
        .catch((error) => toast(error.message, 'error'));
    }
  }, [trip, trips.length, toast]);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (scanner) {
      try { await scanner.stop(); } catch { /* already stopped */ }
      try { await scanner.clear(); } catch { /* already cleared */ }
    }
  }, []);

  const startScanner = useCallback(async () => {
    setCameraError('');
    await stopScanner();
    try {
      const scanner = new Html5Qrcode('qr-reader', {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 220 },
        (decodedText) => validateRef.current(decodedText.trim(), 'qrToken'),
        () => {},
      );
    } catch (error) {
      setCameraError('Camera unavailable. Use manual ticket ID entry below.');
    }
  }, [stopScanner]);

  useEffect(() => () => { stopScanner(); }, [stopScanner]);

  const validate = async (value, field) => {
    if (!trip || lockRef.current || busy) return;
    lockRef.current = true;
    setBusy(true);
    try {
      const data = await api('/tickets/validate', {
        method: 'POST',
        body: { tripId: trip.id, [field]: value },
      });
      setResult(data);
      if (navigator.vibrate) navigator.vibrate(data.result === 'VALID' ? [120] : [250, 100, 250]);
      await stopScanner();
      await loadSummary();
    } catch (error) {
      toast(error.message, 'error');
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      setResult({ result: error.code || 'INVALID', message: error.message, ticket: null });
      await stopScanner();
    } finally {
      lockRef.current = false;
      setBusy(false);
      setManual('');
    }
  };
  validateRef.current = validate;

  const submitManual = (event) => {
    event.preventDefault();
    const value = manual.trim();
    if (!value) return;
    validate(value, value.length > 20 ? 'qrToken' : 'ticketId');
  };

  if (!trip && trips.length > 1) {
    return (
      <Layout title="Scan tickets" back>
        <Card className="stack">
          <b>Choose a trip</b>
          {trips.map((item) => (
            <Button key={item.id} variant="secondary" onClick={() => setTrip(item)}>
              {item.busNumber} · {new Date(item.departureTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </Button>
          ))}
        </Card>
      </Layout>
    );
  }

  if (!trip) return <Layout title="Scan tickets" back><Spinner label="Loading trip…" /></Layout>;

  const ok = result?.result === 'VALID';

  return (
    <Layout title="Scan tickets" back>
      <Card className="stack">
        <div className="row row--between">
          <b>{trip.busNumber}</b>
          <span className="small muted">Today's trip</span>
        </div>
        {summary && (
          <div className="stats">
            <div className="stat"><b>{summary.booked}</b><span className="small">Booked</span></div>
            <div className="stat"><b>{summary.scanned}</b><span className="small">Scanned</span></div>
            <div className="stat"><b>{summary.remaining}</b><span className="small">Remaining</span></div>
          </div>
        )}
      </Card>

      <div className="section-title">Camera scanner</div>
      <div className="scan-box">
        <div id="qr-reader" />
      </div>
      {busy && !result && <Spinner label="Validating…" />}
      <Button className="mt" onClick={startScanner}>{cameraError ? 'Retry camera' : 'Start camera'}</Button>
      {cameraError && <p className="small muted center mt">{cameraError}</p>}

      <div className="section-title">Manual entry</div>
      <form onSubmit={submitManual} className="stack">
        <input
          className="input"
          value={manual}
          onChange={(event) => setManual(event.target.value)}
          placeholder="Ticket ID or QR token"
          aria-label="Ticket ID or QR token"
        />
        <Button type="submit" variant="secondary" disabled={!manual.trim() || busy}>Validate manually</Button>
      </form>

      {result && (
        <div className="scan-overlay" onClick={() => { setResult(null); startScanner(); }}>
          <div className={`result-card ${ok ? '' : 'result-card--invalid'}`}>
            <div className="result-card__mark">{ok ? '✓' : '✕'}</div>
            <h2>{ok ? 'VALID' : result.result.replaceAll('_', ' ')}</h2>
            <p>{result.message}</p>
            {result.ticket && (
              <div style={{ marginTop: 16, textAlign: 'left' }}>
                <div className="list-row"><b>Passenger</b><span>{result.ticket.passengerName}</span></div>
                <div className="list-row"><b>Seats</b><span>{result.ticket.seats.join(', ')}</span></div>
                <div className="list-row"><b>Bus</b><span>{result.ticket.busNumber}</span></div>
                <div className="list-row"><b>Route</b><span className="small">{result.ticket.route}</span></div>
              </div>
            )}
            <p className="small mt">Tap anywhere to scan again</p>
          </div>
        </div>
      )}
    </Layout>
  );
}
