import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Layout from './Layout.jsx';

const HOME = { passenger: '/home', conductor: '/conductor', admin: '/admin' };

export default function ProtectedRoute({ roles }) {
  const { loading, isAuthenticated, role } = useAuth();

  if (loading) {
    return (
      <div className="splash">
        <img src="/icon.svg" alt="BusBook" />
        <h1>BusBook</h1>
        <p>Loading your journey…</p>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(role)) return <Navigate to={HOME[role] || '/login'} replace />;

  return <Outlet />;
}

export function PublicRoute({ children }) {
  const { loading, isAuthenticated, role } = useAuth();
  if (loading) {
    return <div className="splash"><img src="/icon.svg" alt="BusBook" /><h1>BusBook</h1></div>;
  }
  if (isAuthenticated) return <Navigate to={HOME[role] || '/home'} replace />;
  return children;
}

export { Layout };
