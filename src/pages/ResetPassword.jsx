import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, Mail } from 'lucide-react';
import { supabase, supabaseReady } from '../lib/supabase.js';
import { authMessage } from '../lib/account.js';
import { useAuth } from '../lib/auth.jsx';
import { useCaptcha } from '../lib/captcha.jsx';
import { passwordProblem } from '../lib/password.js';
import { PasswordInput, PasswordMeter } from '../components/AuthBits.jsx';
import { AuthShell, MfaPrompt } from './SignIn.jsx';

export default function ResetPassword() {
  const { recovery, mfaRequired } = useAuth();
  const navigate = useNavigate();
  const captcha = useCaptcha();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  if (!supabaseReady) return <AuthShell title="Accounts are not set up" />;

  // The link from the email signs the person in with a recovery session.
  if (recovery) {
    // With an authenticator app, the new password can only be saved after its code.
    if (mfaRequired) return <MfaPrompt />;
    const save = async (event) => {
      event.preventDefault();
      if (passwordProblem(password)) return setError(authMessage({ code: 'auth/weak-password' }));
      setBusy(true);
      setError('');
      const { error: e } = await supabase.auth.updateUser({ password });
      setBusy(false);
      if (e) return setError(authMessage(e));
      return navigate('/account', { replace: true });
    };
    return (
      <AuthShell icon={KeyRound} title="Choose a new password" lead="You will use it in the app and on the site">
        <form className="auth-form" onSubmit={save}>
          <label className="field">
            <span>New password</span>
            <PasswordInput autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            <PasswordMeter value={password} />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'One moment' : 'Save password'}</button>
        </form>
      </AuthShell>
    );
  }

  if (sent) {
    return (
      <AuthShell icon={Mail} title="Check your inbox" lead={`If an account uses ${email}, a reset link is on its way. Open it on this device.`}>
        <Link to="/sign-in" className="text-link">Back to sign in</Link>
      </AuthShell>
    );
  }

  const request = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const captchaToken = await captcha.getToken();
      const { error: e } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password`, captchaToken });
      if (e) throw e;
      setSent(true);
    } catch (e) {
      setError(authMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell icon={KeyRound} title="Reset your password" lead="Enter the email of your account and we will send you a link">
      <form className="auth-form" onSubmit={request}>
        <label className="field">
          <span>Email</span>
          <input type="email" autoComplete="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        {captcha.element}
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'One moment' : 'Send reset link'}</button>
      </form>
      <p className="auth-switch"><Link to="/sign-in">Back to sign in</Link></p>
    </AuthShell>
  );
}
