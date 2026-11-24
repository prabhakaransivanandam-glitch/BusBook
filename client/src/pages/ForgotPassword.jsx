import { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { Button, Card, Field } from '../components/UI.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      // No email provider — show a helpful message
      await new Promise((r) => setTimeout(r, 600));
      setSent(true);
      toast('Contact your admin to reset your password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout title="Reset password" hideNav back>
      <div className="auth">
        <img src="/icon.svg" alt="BusBook" className="auth__logo" />
        <Card>
          {sent ? (
            <div className="center stack">
              <h2>Contact Admin</h2>
              <p className="muted">Ask your admin to reset your password for <b>{email}</b>.</p>
              <Link to="/login"><Button>Back to sign in</Button></Link>
            </div>
          ) : (
            <form onSubmit={submit}>
              <h2 className="center">Forgot password?</h2>
              <p className="muted center small">Enter your email and contact your admin for a reset.</p>
              <div className="mt">
                <Field label="Email">
                  <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                </Field>
              </div>
              <Button type="submit" disabled={busy}>{busy ? 'Please wait…' : 'Continue'}</Button>
            </form>
          )}
        </Card>
      </div>
    </Layout>
  );
}
