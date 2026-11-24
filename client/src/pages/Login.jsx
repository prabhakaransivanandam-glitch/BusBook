import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { Button, Card, Field } from '../components/UI.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const HOME = { passenger: '/home', conductor: '/conductor', admin: '/admin' };

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const { signIn } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const role = await signIn(email.trim(), password);
      toast(`Welcome back, ${role}!`);
      navigate(HOME[role] || '/home', { replace: true });
    } catch (error) {
      toast(error.message || 'Login failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout title="BusBook" hideNav>
      <div className="auth">
        <img src="/icon.svg" alt="BusBook" className="auth__logo" />
        <h1 className="auth__title">Welcome back</h1>
        <p className="auth__subtitle">Sign in to continue your journey</p>
        <Card>
          <form onSubmit={submit}>
            <Field label="Email"><input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></Field>
            <Field label="Password"><input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></Field>
            <Button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</Button>
          </form>
          <div className="auth__links">
            <Link to="/forgot-password">Forgot password?</Link>
            <Link to="/signup">Create passenger account</Link>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
