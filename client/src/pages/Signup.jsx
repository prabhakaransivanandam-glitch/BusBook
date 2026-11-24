import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { Button, Card, Field } from '../components/UI.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Signup() {
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const { signUp } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    if (form.password.length < 6) return toast('Password must be at least 6 characters', 'error');
    if (!/^\d{10}$/.test(form.phone.replace(/\D/g, ''))) return toast('Enter a 10-digit phone number', 'error');
    setBusy(true);
    try {
      await signUp(form);
      toast('Account created. Welcome to BusBook!');
      navigate('/home', { replace: true });
    } catch (error) {
      toast(error.code === 'auth/email-already-in-use' ? 'Email already registered. Please sign in.' : error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout title="Create account" hideNav back>
      <div className="auth">
        <img src="/icon.svg" alt="BusBook" className="auth__logo" />
        <h1 className="auth__title">Passenger sign up</h1>
        <p className="auth__subtitle">Only passenger accounts can be created here</p>
        <Card>
          <form onSubmit={submit}>
            <Field label="Full name"><input required minLength={2} value={form.name} onChange={set('name')} placeholder="Your name" /></Field>
            <Field label="Phone number"><input required inputMode="numeric" maxLength={10} value={form.phone} onChange={set('phone')} placeholder="10-digit mobile number" /></Field>
            <Field label="Email"><input required type="email" autoComplete="email" value={form.email} onChange={set('email')} placeholder="you@example.com" /></Field>
            <Field label="Password" hint="At least 6 characters"><input required type="password" minLength={6} autoComplete="new-password" value={form.password} onChange={set('password')} placeholder="••••••••" /></Field>
            <Button type="submit" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</Button>
          </form>
          <p className="small center mt">Already registered? <Link to="/login">Sign in</Link></p>
        </Card>
      </div>
    </Layout>
  );
}
