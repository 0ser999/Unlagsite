import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { supabase, supabaseReady } from '../lib/supabase.js';
import { authMessage, verifyMfa } from '../lib/account.js';
import { useAuth } from '../lib/auth.jsx';
import { useCaptcha } from '../lib/captcha.jsx';
import { passwordProblem } from '../lib/password.js';
import { GoogleIcon, DiscordIcon } from '../components/BrandIcons.jsx';
import { CodeInput, PasswordInput, PasswordMeter } from '../components/AuthBits.jsx';

// Only same-site paths, so a crafted link cannot send people elsewhere after sign-in.
function safeNext(value) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/account';
}

export function AuthShell({ title, lead, icon: Icon, children }) {
  return (
    <main className="auth">
      <div className="auth-card">
        {Icon ? <span className="auth-icon"><Icon size={22} strokeWidth={1.5} /></span>
          : <img src="/logo.png" alt="" width="48" height="48" className="auth-logo" />}
        <h1>{title}</h1>
        {lead && <p className="auth-lead">{lead}</p>}
        {children}
      </div>
    </main>
  );
}

/* Second step for accounts with an authenticator app. Used after any sign-in method, including Google and Discord. */
export function MfaPrompt({ onDone }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await verifyMfa(code);
      onDone?.();
    } catch (e) {
      setError(authMessage(e));
      setCode('');
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthShell icon={ShieldCheck} title="Two-factor authentication" lead="Enter the 6-digit code from your authenticator app">
      <form className="auth-form" onSubmit={submit}>
        <CodeInput value={code} onChange={setCode} length={6} />
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={busy || code.length !== 6}>{busy ? 'Checking' : 'Verify'}</button>
      </form>
      <p className="auth-switch">
        Wrong account? <button type="button" className="link-btn" onClick={() => supabase.auth.signOut({ scope: 'local' })}>Sign out</button>
      </p>
    </AuthShell>
  );
}

const RESEND_AFTER = 30;

export default function SignIn({ mode = 'sign-in' }) {
  const { user, loading, mfaRequired } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = safeNext(params.get('next'));
  const isSignUp = mode === 'sign-up';
  const captcha = useCaptcha();
  const [method, setMethod] = useState('password'); // 'password' | 'code'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!cooldown) return undefined;
    const t = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  if (!loading && user && mfaRequired) return <MfaPrompt onDone={() => navigate(next, { replace: true })} />;
  if (!loading && user) return <Navigate to={next} replace />;

  if (!supabaseReady) {
    return <AuthShell title="Accounts are not set up" lead="Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env, then rebuild the site" />;
  }

  if (sent) {
    return (
      <AuthShell icon={Mail} title="Check your inbox" lead={`We sent a confirmation link to ${email}. Open it on this device to finish creating your account.`}>
        <Link to="/sign-in" className="text-link">Back to sign in</Link>
      </AuthShell>
    );
  }

  const run = async (task) => {
    setBusy(true);
    setError('');
    try { await task(); } catch (e) { setError(authMessage(e)); } finally { setBusy(false); }
  };
  const fail = (result) => { if (result.error) throw result.error; return result.data; };

  const social = (provider) => run(async () => {
    fail(await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: `${window.location.origin}${next}` } }));
  });

  const sendCode = () => run(async () => {
    const captchaToken = await captcha.getToken();
    fail(await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}${next}`, captchaToken },
    }));
    setCodeSent(true);
    setCode('');
    setCooldown(RESEND_AFTER);
  });

  const submit = (event) => {
    event.preventDefault();
    if (method === 'code') {
      if (!codeSent) return sendCode();
      // On success the auth listener updates the user; the two-factor step shows here if the account has one.
      return run(async () => { fail(await supabase.auth.verifyOtp({ email: email.trim(), token: code, type: 'email' })); });
    }
    if (isSignUp && passwordProblem(password)) return setError(authMessage({ code: 'auth/weak-password' }));
    return run(async () => {
      const captchaToken = await captcha.getToken();
      const data = fail(isSignUp
        ? await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${window.location.origin}/account`, captchaToken } })
        : await supabase.auth.signInWithPassword({ email: email.trim(), password, options: { captchaToken } }));
      if (isSignUp && !data.session) setSent(true);
    });
  };

  const switchMethod = (value) => {
    if (busy) return;
    setMethod(value);
    setCodeSent(false);
    setCode('');
    setError('');
  };

  const switchTo = `${isSignUp ? '/sign-in' : '/sign-up'}${params.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`;
  const submitLabel = busy ? 'One moment'
    : method === 'code' ? (codeSent ? 'Verify and continue' : 'Email me a code')
      : isSignUp ? 'Create account' : 'Sign in';

  return (
    <AuthShell
      title={isSignUp ? 'Create your Unlag account' : 'Welcome back'}
      lead={isSignUp ? 'One account for the app and the site. The Free plan is included.' : 'Sign in to manage your plan, your PC and the assistant'}
    >
      <div className="auth-social">
        <button type="button" className="btn btn-secondary" onClick={() => social('google')} disabled={busy}><GoogleIcon />Google</button>
        <button type="button" className="btn btn-secondary" onClick={() => social('discord')} disabled={busy}><DiscordIcon />Discord</button>
      </div>
      <div className="auth-or"><span>or with your email</span></div>

      <div className="auth-tabs" role="tablist" aria-label="Sign-in method">
        <button type="button" role="tab" aria-selected={method === 'password'} className={method === 'password' ? 'is-on' : ''} onClick={() => switchMethod('password')}>
          <KeyRound size={15} strokeWidth={1.5} />Password
        </button>
        <button type="button" role="tab" aria-selected={method === 'code'} className={method === 'code' ? 'is-on' : ''} onClick={() => switchMethod('code')}>
          <Mail size={15} strokeWidth={1.5} />Email code
        </button>
      </div>

      <form className="auth-form" onSubmit={submit}>
        {method === 'code' && codeSent ? (
          <>
            <div className="code-sent">
              <p>We sent a code to <b>{email.trim()}</b>. It expires in a few minutes.</p>
              <button type="button" className="link-btn" onClick={() => { setCodeSent(false); setCode(''); setError(''); }}>
                <ArrowLeft size={14} strokeWidth={1.5} />Use another email
              </button>
            </div>
            <CodeInput value={code} onChange={setCode} />
          </>
        ) : (
          <label className="field">
            <span>Email</span>
            <input type="email" autoComplete="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
        )}

        {method === 'password' && (
          <label className="field">
            <span className="field-row">
              Password
              {!isSignUp && <Link to="/reset-password" className="field-link">Forgot it</Link>}
            </span>
            <PasswordInput
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {isSignUp && <PasswordMeter value={password} />}
          </label>
        )}

        {method === 'code' && !codeSent && (
          <p className="auth-hint">No password needed. We email you a one-time code{isSignUp ? ' and create your account' : ''}.</p>
        )}

        {captcha.element}
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={busy || (method === 'code' && codeSent && code.length < 6)}>{submitLabel}</button>

        {method === 'code' && codeSent && (
          <button type="button" className="link-btn center" onClick={sendCode} disabled={busy || cooldown > 0}>
            {cooldown > 0 ? `Send a new code in ${cooldown} s` : 'Send a new code'}
          </button>
        )}
      </form>

      <p className="auth-switch">
        {isSignUp ? 'Already have an account? ' : 'New to Unlag? '}
        <Link to={switchTo}>{isSignUp ? 'Sign in' : 'Create an account'}</Link>
      </p>
      <p className="auth-fine">
        <ShieldCheck size={14} strokeWidth={1.5} />
        Turn on two-factor authentication in Account settings for extra protection.
      </p>
    </AuthShell>
  );
}
