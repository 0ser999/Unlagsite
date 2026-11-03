import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { supabase, supabaseReady } from '../lib/supabase.js';
import { authMessage, verifyMfa } from '../lib/account.js';
import { useAuth } from '../lib/auth.jsx';
import { useCaptcha } from '../lib/captcha.jsx';
import { passwordProblem } from '../lib/password.js';
import { GoogleIcon, DiscordIcon } from '../components/BrandIcons.jsx';
import { t } from '../i18n/index.jsx';
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
    <AuthShell icon={ShieldCheck} title={t('auth.mfaTitle')} lead={t('auth.mfaLead')}>
      <form className="auth-form" onSubmit={submit}>
        <CodeInput value={code} onChange={setCode} length={6} />
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={busy || code.length !== 6}>{busy ? t('auth.checking') : t('auth.verifyShort')}</button>
      </form>
      <p className="auth-switch">
        {t('auth.wrongAccount')} <button type="button" className="link-btn" onClick={() => supabase.auth.signOut({ scope: 'local' })}>{t('auth.signOut')}</button>
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
  const [twoStep, setTwoStep] = useState(false); // password accepted, email code still needed

  useEffect(() => {
    if (!cooldown) return undefined;
    const t = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  if (!loading && user && mfaRequired) return <MfaPrompt onDone={() => navigate(next, { replace: true })} />;
  if (!loading && user) return <Navigate to={next} replace />;

  if (!supabaseReady) {
    return <AuthShell title={t('auth.notSetUp')} lead={t('auth.notSetUpLead')} />;
  }

  if (sent) {
    return (
      <AuthShell icon={Mail} title={t('auth.inboxTitle')} lead={t('auth.inboxLead', { email })}>
        <Link to="/sign-in" className="text-link">{t('common.backToSignIn')}</Link>
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
      // Two-step sign-in is on: the password session is dropped and a code is emailed instead.
      if (!isSignUp && data.user?.app_metadata?.email_2fa === true) {
        await supabase.auth.signOut({ scope: 'local' });
        fail(await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false } }));
        setPassword('');
        setMethod('code');
        setCodeSent(true);
        setTwoStep(true);
        setCode('');
        setCooldown(RESEND_AFTER);
      }
    });
  };

  const switchMethod = (value) => {
    if (busy) return;
    setMethod(value);
    setTwoStep(false);
    setCodeSent(false);
    setCode('');
    setError('');
  };

  const switchTo = `${isSignUp ? '/sign-in' : '/sign-up'}${params.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`;
  const submitLabel = busy ? t('common.oneMoment')
    : method === 'code' ? (codeSent ? t('auth.verify') : t('auth.sendCode'))
      : isSignUp ? t('auth.createAccount') : t('auth.signIn');

  return (
    <AuthShell
      icon={twoStep ? Mail : undefined}
      title={twoStep ? t('auth.twoStepTitle') : isSignUp ? t('auth.signUpTitle') : t('auth.signInTitle')}
      lead={twoStep ? t('auth.twoStepLead') : isSignUp ? t('auth.signUpLead') : t('auth.signInLead')}
    >
      {!twoStep && <>
      <div className="auth-social">
        <button type="button" className="btn btn-secondary" onClick={() => social('google')} disabled={busy}><GoogleIcon />Google</button>
        <button type="button" className="btn btn-secondary" onClick={() => social('discord')} disabled={busy}><DiscordIcon />Discord</button>
      </div>
      <div className="auth-or"><span>{t('auth.orEmail')}</span></div>

      <div className="auth-tabs" role="tablist" aria-label={t('auth.method')}>
        <button type="button" role="tab" aria-selected={method === 'password'} className={method === 'password' ? 'is-on' : ''} onClick={() => switchMethod('password')}>
          <KeyRound size={15} strokeWidth={1.5} />{t('auth.password')}
        </button>
        <button type="button" role="tab" aria-selected={method === 'code'} className={method === 'code' ? 'is-on' : ''} onClick={() => switchMethod('code')}>
          <Mail size={15} strokeWidth={1.5} />{t('auth.emailCode')}
        </button>
      </div>
      </>}

      <form className="auth-form" onSubmit={submit}>
        {method === 'code' && codeSent ? (
          <>
            <div className="code-sent">
              <p>{t('auth.codeSent', { email: email.trim() })}</p>
              <button type="button" className="link-btn" onClick={() => { setCodeSent(false); setTwoStep(false); setMethod(twoStep ? 'password' : method); setCode(''); setError(''); }}>
                <ArrowLeft size={14} strokeWidth={1.5} />{twoStep ? t('auth.back') : t('auth.otherEmail')}
              </button>
            </div>
            <CodeInput value={code} onChange={setCode} />
          </>
        ) : (
          <label className="field">
            <span>{t('common.email')}</span>
            <input type="email" autoComplete="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
        )}

        {method === 'password' && (
          <label className="field">
            <span className="field-row">
              {t('auth.password')}
              {!isSignUp && <Link to="/reset-password" className="field-link">{t('auth.forgot')}</Link>}
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
          <p className="auth-hint">{isSignUp ? t('auth.noPasswordSignUp') : t('auth.noPassword')}</p>
        )}

        {captcha.element}
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={busy || (method === 'code' && codeSent && code.length < 6)}>{submitLabel}</button>

        {method === 'code' && codeSent && (
          <button type="button" className="link-btn center" onClick={sendCode} disabled={busy || cooldown > 0}>
            {cooldown > 0 ? t('auth.resendIn', { s: cooldown }) : t('auth.resend')}
          </button>
        )}
      </form>

      <p className="auth-switch">
        {isSignUp ? t('auth.haveAccount') : t('auth.newHere')}{' '}
        <Link to={switchTo}>{isSignUp ? t('auth.signIn') : t('auth.createLink')}</Link>
      </p>
      <p className="auth-fine">
        <ShieldCheck size={14} strokeWidth={1.5} />
        {t('auth.fine')}
      </p>
    </AuthShell>
  );
}
