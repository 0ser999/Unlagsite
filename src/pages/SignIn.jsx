import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase, supabaseReady } from '../lib/supabase.js';
import { authMessage } from '../lib/account.js';
import { useAuth } from '../lib/auth.jsx';
import { GoogleIcon, DiscordIcon } from '../components/BrandIcons.jsx';

// Only same-site paths, so a crafted link cannot send people elsewhere after sign-in.
function safeNext(value) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/account';
}

export function AuthShell({ title, lead, children }) {
  return (
    <main className="auth">
      <div className="auth-card">
        <img src="/logo.png" alt="" width="48" height="48" className="auth-logo" />
        <h1>{title}</h1>
        {lead && <p className="auth-lead">{lead}</p>}
        {children}
      </div>
    </main>
  );
}

export default function SignIn({ mode = 'sign-in' }) {
  const { user, loading } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = safeNext(params.get('next'));
  const isSignUp = mode === 'sign-up';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  if (!loading && user) return <Navigate to={next} replace />;

  if (!supabaseReady) {
    return <AuthShell title="Accounts are not set up" lead="Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env, then rebuild the site" />;
  }

  if (sent) {
    return (
      <AuthShell title="Check your inbox" lead={`We sent a confirmation link to ${email}. Open it on this device to finish creating your account.`}>
        <Link to="/sign-in" className="text-link">Back to sign in</Link>
      </AuthShell>
    );
  }

  const social = async (provider) => {
    setError('');
    const { error: e } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}${next}` },
    });
    if (e) setError(authMessage(e));
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    const result = isSignUp
      ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/account` } })
      : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (result.error) return setError(authMessage(result.error));
    if (isSignUp && !result.data.session) return setSent(true);
    navigate(next, { replace: true });
  };

  const switchTo = `${isSignUp ? '/sign-in' : '/sign-up'}${params.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`;

  return (
    <AuthShell title={isSignUp ? 'Create your Unlag account' : 'Sign in to Unlag'} lead="The same account works here and in the app">
      <div className="auth-social">
        <button type="button" className="btn btn-secondary" onClick={() => social('google')}><GoogleIcon />Continue with Google</button>
        <button type="button" className="btn btn-secondary" onClick={() => social('discord')}><DiscordIcon />Continue with Discord</button>
      </div>
      <div className="auth-or"><span>or with email</span></div>
      <form className="auth-form" onSubmit={submit}>
        <label className="field">
          <span>Email</span>
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-row">
            Password
            {!isSignUp && <Link to="/reset-password" className="field-link">Forgot it</Link>}
          </span>
          <input
            type="password"
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            minLength={isSignUp ? 6 : undefined} maxLength={4096}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'One moment' : isSignUp ? 'Create account' : 'Sign in'}
        </button>
      </form>
      <p className="auth-switch">
        {isSignUp ? 'Already have an account? ' : 'New to Unlag? '}
        <Link to={switchTo}>{isSignUp ? 'Sign in' : 'Create an account'}</Link>
      </p>
    </AuthShell>
  );
}
