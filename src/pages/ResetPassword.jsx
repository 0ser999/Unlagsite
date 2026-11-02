import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, supabaseReady } from '../lib/supabase.js';
import { authMessage } from '../lib/account.js';
import { useAuth } from '../lib/auth.jsx';
import { AuthShell } from './SignIn.jsx';

export default function ResetPassword() {
  const { recovery } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  if (!supabaseReady) return <AuthShell title="Accounts are not set up" />;

  // The link from the email signs the person in with a recovery session.
  if (recovery) {
    const save = async (event) => {
      event.preventDefault();
      setBusy(true);
      const { error: e } = await supabase.auth.updateUser({ password });
      setBusy(false);
      if (e) return setError(authMessage(e));
      navigate('/account', { replace: true });
    };
    return (
      <AuthShell title="Choose a new password">
        <form className="auth-form" onSubmit={save}>
          <label className="field">
            <span>New password</span>
            <input type="password" autoComplete="new-password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'One moment' : 'Save password'}</button>
        </form>
      </AuthShell>
    );
  }

  if (sent) {
    return (
      <AuthShell title="Check your inbox" lead={`If an account uses ${email}, a reset link is on its way. Open it on this device.`}>
        <Link to="/sign-in" className="text-link">Back to sign in</Link>
      </AuthShell>
    );
  }

  const request = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    const { error: e } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false);
    if (e) return setError(authMessage(e));
    setSent(true);
  };

  return (
    <AuthShell title="Reset your password" lead="Enter the email of your account and we will send you a link">
      <form className="auth-form" onSubmit={request}>
        <label className="field">
          <span>Email</span>
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'One moment' : 'Send reset link'}</button>
      </form>
      <p className="auth-switch"><Link to="/sign-in">Back to sign in</Link></p>
    </AuthShell>
  );
}
