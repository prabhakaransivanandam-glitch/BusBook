export const DIRECTIONS = {
  PERUNDURAI_TO_COIMBATORE: 'Perundurai → Coimbatore',
  COIMBATORE_TO_PERUNDURAI: 'Coimbatore → Perundurai',
};

export function Card({ children, className = '', ...props }) {
  return <div className={`card ${className}`} {...props}>{children}</div>;
}

export function Button({ children, variant = 'primary', className = '', ...props }) {
  return (
    <button className={`btn btn--${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Field({ label, children, hint }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
      {hint && <span className="field__hint">{hint}</span>}
    </label>
  );
}

export function Skeleton({ lines = 3 }) {
  return (
    <div className="skeleton" aria-label="Loading">
      {Array.from({ length: lines }, (_, i) => <div key={i} className="skeleton__line" />)}
    </div>
  );
}

export function EmptyState({ title, message, action }) {
  return (
    <div className="empty">
      <div className="empty__icon">🚌</div>
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {action}
    </div>
  );
}

export function Spinner({ label = 'Loading…' }) {
  return <div className="spinner"><span className="spinner__circle" />{label}</div>;
}

export function StatusPill({ status }) {
  const map = {
    BOOKED: ['Booked', 'pill--booked'],
    USED: ['Used', 'pill--used'],
    CANCELLED: ['Cancelled', 'pill--cancelled'],
    EXPIRED: ['Expired', 'pill--expired'],
    PENDING: ['Pending', 'pill--pending'],
    CONFIRMED: ['Confirmed', 'pill--booked'],
    PAID: ['Paid', 'pill--booked'],
    scheduled: ['Scheduled', 'pill--booked'],
    running: ['Running', 'pill--pending'],
    completed: ['Completed', 'pill--used'],
    cancelled: ['Cancelled', 'pill--cancelled'],
  };
  const [text, cls] = map[status] || [status, ''];
  return <span className={`pill ${cls}`}>{text}</span>;
}

export const formatINR = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;

export function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

export function formatTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export const todayISO = () => {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
};
