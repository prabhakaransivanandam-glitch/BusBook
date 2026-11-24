import Layout from '../components/Layout.jsx';
import { Card } from '../components/UI.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Profile() {
  const { user, role, profile } = useAuth();
  return (
    <Layout title="My profile" back>
      <Card className="stack">
        <div className="row">
          <img src="/icon.svg" alt="" width="56" height="56" style={{ borderRadius: 14 }} />
          <div>
            <h2>{profile?.name || user?.displayName || 'BusBook user'}</h2>
            <span className="pill pill--booked">{role}</span>
          </div>
        </div>
        <div className="list-row"><b>Email</b><div className="small">{user?.email || '—'}</div></div>
        <div className="list-row"><b>Phone</b><div className="small">{profile?.phone || '—'}</div></div>
        <p className="small muted">Use “Exit” in the top bar to sign out.</p>
      </Card>
    </Layout>
  );
}
