import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const NAV = {
  passenger: [
    { to: '/home', label: 'Search', icon: '🔍' },
    { to: '/bookings', label: 'Bookings', icon: '📋' },
    { to: '/tickets', label: 'Tickets', icon: '🎫' },
    { to: '/profile', label: 'Profile', icon: '👤' },
  ],
  conductor: [
    { to: '/conductor', label: 'Trips', icon: '🚌' },
    { to: '/conductor/scan', label: 'Scan', icon: '📷' },
    { to: '/profile', label: 'Profile', icon: '👤' },
  ],
  admin: [
    { to: '/admin', label: 'Overview', icon: '📊' },
    { to: '/admin/conductors', label: 'Staff', icon: '👷' },
    { to: '/admin/trips', label: 'Trips', icon: '🚌' },
    { to: '/profile', label: 'Profile', icon: '👤' },
  ],
};

export default function Layout({ title, children, hideNav = false, back = false }) {
  const { role, user, signOutUser } = useAuth();
  const navigate = useNavigate();
  const items = NAV[role] || [];

  const logout = async () => {
    await signOutUser();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <header className="appbar">
        {back ? (
          <button className="appbar__icon" onClick={() => navigate(-1)} aria-label="Back">←</button>
        ) : (
          <img src="/icon.svg" alt="" className="appbar__logo" />
        )}
        <span className="appbar__title">{title}</span>
        <button className="appbar__icon appbar__icon--text" onClick={logout} title="Log out">Exit</button>
      </header>

      <main className={`page ${hideNav ? 'page--full' : ''}`}>{children}</main>

      {!hideNav && items.length > 0 && (
        <nav className="bottom-nav">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/home' || item.to === '/conductor'}
              className={({ isActive }) => `bottom-nav__item ${isActive ? 'is-active' : ''}`}
            >
              <span className="bottom-nav__icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      )}
      {user && <span className="sr-only">Signed in as {user.email}</span>}
    </div>
  );
}
