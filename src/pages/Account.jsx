import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import {
  Check, Lock, Monitor, LogOut, RefreshCw, Star, MailWarning, LayoutGrid, Settings, MessageSquare, Download, ArrowRight,
} from 'lucide-react';
import { useCaptcha } from '../lib/captcha.jsx';
import { passwordProblem } from '../lib/password.js';
import { PasswordInput, PasswordMeter } from '../components/AuthBits.jsx';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../lib/auth.jsx';
import {
  PLAN_NAME, AI_LIMIT, hasPlan, authMessage, changePassword, readQuota, resendConfirmation, submitReview, updateDisplayName,
} from '../lib/account.js';
import { PLANS, PLAN_MATRIX, DOWNLOAD_URL, VERSION } from '../data.js';

const PROVIDER = { email: 'Email', google: 'Google', discord: 'Discord' };
const TABS = [
  ['overview', 'Overview', LayoutGrid],
  ['settings', 'Settings', Settings],
  ['feedback', 'Feedback', MessageSquare],
];

function Status({ value, done }) {
  if (!value || value === 'busy') return null;
  if (value === 'done') return <span className="acct-ok"><Check size={16} strokeWidth={1.5} />{done}</span>;
  return <span className="form-error" role="alert">{value}</span>;
}

function Avatar({ info, size = 40 }) {
  if (info.photoUrl) return <img src={info.photoUrl} alt="" className="avatar" width={size} height={size} referrerPolicy="no-referrer" />;
  return <span className="avatar avatar-initials" style={{ width: size, height: size }} aria-hidden="true">{info.displayName.slice(0, 1).toUpperCase()}</span>;
}

/* ---------- Overview ---------- */

// Hex texture seeded from the account id, the same glyph set as the hero scene.
function hexField(seed, rows, cols) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const glyphs = '.:17ca40e8bdf';
  const lines = [];
  for (let r = 0; r < rows; r += 1) {
    let line = '';
    for (let c = 0; c < cols; c += 1) {
      h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
      line += glyphs[(h >>> 0) % glyphs.length];
    }
    lines.push(line);
  }
  return lines.join('\n');
}

const shortId = (value) => (value ? `${value.slice(0, 4)}…${value.slice(-4)}` : null);

function LicenseCard({ info, hwid, refresh }) {
  const [status, setStatus] = useState('');
  const texture = useMemo(() => hexField(info.uid, 9, 64), [info.uid]);
  const onRefresh = async () => {
    setStatus('busy');
    try {
      const next = await refresh();
      setStatus(next.plan === info.plan ? `Still ${PLAN_NAME[next.plan]}` : 'Updated');
    } catch (error) {
      setStatus(authMessage(error));
    }
  };
  const paid = info.plan !== 'free';
  return (
    <section className="lic-wrap" aria-label="Your plan">
      <div className={`lic lic-${info.plan}`}>
        <pre className="lic-hex mono" aria-hidden="true">{texture}</pre>
        <div className="lic-top">
          <img src="/logo.png" alt="" width="28" height="28" />
          <span className="lic-brand">Unlag</span>
          <span className="lic-ver mono">v{VERSION}</span>
        </div>
        <div className="lic-plan">{PLAN_NAME[info.plan]}</div>
        <div className="lic-meta">
          <div>
            <span className="lic-k">Holder</span>
            <span className="lic-v">{info.displayName}</span>
          </div>
          <div>
            <span className="lic-k">PC</span>
            <span className="lic-v mono">{!paid ? 'Any PC' : hwid ? shortId(hwid) : 'Not claimed yet'}</span>
          </div>
          <div>
            <span className="lic-k">Account</span>
            <span className="lic-v mono">{shortId(info.uid.replace(/-/g, ''))}</span>
          </div>
        </div>
      </div>
      <div className="lic-under">
        <p className="lic-note">
          <Monitor size={16} strokeWidth={1.5} />
          {!paid
            ? 'Free works on every PC you sign in to'
            : hwid
              ? 'This plan is tied to one PC. On any other PC the app falls back to Free'
              : 'The first PC that opens the app with this account takes the plan'}
        </p>
        <button type="button" className="btn-quiet" onClick={onRefresh} disabled={status === 'busy'}>
          <RefreshCw size={16} strokeWidth={1.5} className={status === 'busy' ? 'spin' : ''} />Refresh plan
        </button>
        {status && status !== 'busy' && <span className={status === 'Updated' ? 'acct-ok' : 'acct-muted'}>{status}</span>}
      </div>
    </section>
  );
}

function useCountdown(target) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  if (!target) return null;
  const mins = Math.max(0, Math.round((target - now) / 60000));
  return `${Math.floor(mins / 60)} h ${String(mins % 60).padStart(2, '0')} min`;
}

function QuotaStat({ info }) {
  const [quota, setQuota] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    if (!info.emailVerified) return undefined;
    readQuota(info.plan).then((q) => live && setQuota(q)).catch(() => live && setFailed(true));
    return () => { live = false; };
  }, [info.uid, info.plan, info.emailVerified]);
  const left = useCountdown(quota?.resetsAt);
  const limit = AI_LIMIT[info.plan];
  const used = quota?.used ?? 0;
  return (
    <div className="stat">
      <div className="stat-label">Assistant messages today</div>
      <div className="stat-figure mono">{quota ? used : '–'}<span> / {limit}</span></div>
      <div className="meter" aria-hidden="true"><span style={{ width: `${Math.min(100, (used / limit) * 100)}%` }} /></div>
      <div className="stat-note">
        {!info.emailVerified ? 'Confirm your email to use the assistant'
          : failed ? 'Cannot be read right now'
          : left ? `Resets in ${left}` : 'Resets at midnight, Paris time'}
      </div>
    </div>
  );
}

function Stats({ info }) {
  const days = Math.max(1, Math.round((Date.now() - Date.parse(info.createdAt)) / 86400000));
  return (
    <div className="stats">
      <QuotaStat info={info} />
      <div className="stat">
        <div className="stat-label">Member for</div>
        <div className="stat-figure mono">{days}<span> {days === 1 ? 'day' : 'days'}</span></div>
        <div className="stat-note">Since {new Date(info.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
      </div>
      <div className="stat">
        <div className="stat-label">Email</div>
        <div className={`stat-state${info.emailVerified ? ' is-ok' : ' is-warn'}`}>
          <i />{info.emailVerified ? 'Confirmed' : 'Not confirmed'}
        </div>
        <div className="stat-note">Signed in with {info.providers.map((p) => (p === 'email' ? 'email' : PROVIDER[p] || p)).join(' and ')}</div>
      </div>
    </div>
  );
}

const MIN_PLAN = { free: 'Free', premium: 'Premium', ultra: 'Ultimate' };

function Unlocks({ info }) {
  const next = PLANS.find((p) => !hasPlan(info, p.id));
  return (
    <section className="dash-block">
      <div className="dash-block-head">
        <div>
          <h2>In the app</h2>
          <p>The pages {PLAN_NAME[info.plan]} opens on your PC</p>
        </div>
        {next && <Link to="/pricing" className="btn btn-primary btn-sm">Get {next.name}</Link>}
      </div>
      <ul className="unlocks">
        {PLAN_MATRIX.map(([page, min]) => {
          const open = hasPlan(info, min);
          return (
            <li key={page} className={open ? 'is-open' : 'is-locked'}>
              {open ? <Check size={16} strokeWidth={1.5} /> : <Lock size={16} strokeWidth={1.5} />}
              <span className="unlock-name">{page}</span>
              {!open && <span className="unlock-plan mono">{MIN_PLAN[min]}</span>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function AppStrip() {
  return (
    <section className="dash-strip">
      <img src="/logo.png" alt="" width="40" height="40" />
      <div>
        <div className="dash-strip-title">Unlag for Windows</div>
        <div className="dash-strip-meta mono">v{VERSION} · Windows 10 and 11 x64 · sign in with this account</div>
      </div>
      <a href={DOWNLOAD_URL} className="btn btn-secondary btn-sm"><Download size={16} strokeWidth={1.5} />Download</a>
    </section>
  );
}

function Overview({ info, hwid, refresh }) {
  return (
    <>
      <div className="dash-top">
        <LicenseCard info={info} hwid={hwid} refresh={refresh} />
        <Stats info={info} />
      </div>
      <Unlocks info={info} />
      <AppStrip />
    </>
  );
}

/* ---------- Settings ---------- */

function Row({ label, hint, children }) {
  return (
    <div className="set-row">
      <div className="set-label">
        <div>{label}</div>
        {hint && <p>{hint}</p>}
      </div>
      <div className="set-control">{children}</div>
    </div>
  );
}

function NameRow({ info }) {
  const [name, setName] = useState(info.displayName);
  const [status, setStatus] = useState('');
  const save = async (event) => {
    event.preventDefault();
    setStatus('busy');
    try { await updateDisplayName(name); setStatus('done'); } catch (error) { setStatus(authMessage(error)); }
  };
  return (
    <Row label="Display name" hint="Shown in the app, in Settings and next to your chats">
      <form className="set-form" onSubmit={save}>
        <input className="input" aria-label="Display name" value={name} maxLength={32} onChange={(e) => { setName(e.target.value); setStatus(''); }} />
        <div className="set-actions">
          <button type="submit" className="btn btn-secondary btn-sm" disabled={status === 'busy' || name.trim() === info.displayName}>Save</button>
          <Status value={status} done="Saved" />
        </div>
      </form>
    </Row>
  );
}

function PasswordRow({ info }) {
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const captcha = useCaptcha();
  if (!info.providers.includes('email')) {
    return (
      <Row label="Password" hint="Managed by your sign-in provider">
        <p className="set-text">You sign in with {info.providers.map((p) => PROVIDER[p] || p).join(' and ')}, so there is no Unlag password to change.</p>
      </Row>
    );
  }
  const save = async (event) => {
    event.preventDefault();
    if (passwordProblem(password)) return setStatus(authMessage({ code: 'auth/weak-password' }));
    setStatus('busy');
    try {
      await changePassword(current, password, await captcha.getToken());
      setCurrent('');
      setPassword('');
      setStatus('done');
    } catch (error) {
      setStatus(authMessage(error));
    }
  };
  return (
    <Row label="Password" hint="The app asks for your current password too">
      <form className="set-form" onSubmit={save}>
        <PasswordInput className="input" aria-label="Current password" placeholder="Current password" autoComplete="current-password" required value={current} onChange={(e) => { setCurrent(e.target.value); setStatus(''); }} />
        <PasswordInput className="input" aria-label="New password" placeholder="New password" autoComplete="new-password" required value={password} onChange={(e) => { setPassword(e.target.value); setStatus(''); }} />
        <PasswordMeter value={password} />
        {captcha.element}
        <div className="set-actions">
          <button type="submit" className="btn btn-secondary btn-sm" disabled={status === 'busy'}>Change password</button>
          <Status value={status} done="Changed" />
        </div>
      </form>
    </Row>
  );
}

function EmailCodeRow({ info }) {
  const { user, recheck } = useAuth();
  const on = user?.app_metadata?.email_2fa === true;
  const [status, setStatus] = useState('');
  if (!info.providers.includes('email')) {
    return (
      <Row label="Two-step sign-in" hint="A code by email after your password">
        <p className="set-text">You sign in with {info.providers.map((p) => PROVIDER[p] || p).join(' and ')}, which already protects your account.</p>
      </Row>
    );
  }
  const toggle = async () => {
    setStatus('busy');
    try {
      const { error } = await supabase.rpc('set_email_2fa', { p_enabled: !on });
      if (error) throw error;
      await supabase.auth.refreshSession();
      await recheck();
      setStatus(on ? 'off' : 'on');
    } catch (error) { setStatus(authMessage(error)); }
  };
  return (
    <Row label="Two-step sign-in" hint="After your password, a code is sent to your email. Asked on the site and in the app">
      <div className="set-form">
        <div className="set-static">
          <span className={`stat-state${on ? ' is-ok' : ''}`}><i />{on ? 'On' : 'Off'}</span>
          <span className="set-text">{on ? `Codes go to ${info.email}.` : 'Your password alone opens your account.'}</span>
        </div>
        <div className="set-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={toggle} disabled={status === 'busy'}>{on ? 'Turn off' : 'Turn on'}</button>
          {status === 'on' && <span className="acct-ok"><Check size={14} strokeWidth={1.5} />Turned on</span>}
          {status === 'off' && <span className="acct-muted">Turned off</span>}
          {status && !['busy', 'on', 'off'].includes(status) && <span className="form-error">{status}</span>}
        </div>
      </div>
    </Row>
  );
}

function SettingsView({ info }) {
  return (
    <section className="dash-block settings">
      <NameRow info={info} />
      <Row label="Email" hint="Used to sign in and to reset your password">
        <div className="set-static">
          <span className="mono">{info.email}</span>
          <span className={`stat-state${info.emailVerified ? ' is-ok' : ' is-warn'}`}><i />{info.emailVerified ? 'Confirmed' : 'Not confirmed'}</span>
        </div>
      </Row>
      <Row label="Sign-in methods">
        <ul className="providers">
          {info.providers.map((p) => <li key={p}>{PROVIDER[p] || p}</li>)}
        </ul>
      </Row>
      <PasswordRow info={info} />
      <EmailCodeRow info={info} />
      <Row label="Sign out" hint="Signs out this browser only. The app on your PC stays signed in">
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => supabase.auth.signOut({ scope: 'local' })}>
          <LogOut size={16} strokeWidth={1.5} />Sign out
        </button>
      </Row>
    </section>
  );
}

/* ---------- Feedback ---------- */

const RATING_WORDS = ['', 'Not for me', 'Needs work', 'Fine', 'Good', 'Great'];

function FeedbackView({ info }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState('');
  const send = async (event) => {
    event.preventDefault();
    setStatus('busy');
    try {
      await submitReview(rating, comment);
      setStatus('done');
      setComment('');
    } catch (error) {
      setStatus(error.message);
    }
  };
  const shown = hover || rating;
  return (
    <form className="dash-block feedback" onSubmit={send}>
      <div className="dash-block-head">
        <div>
          <h2>Rate Unlag</h2>
          <p>Reviews go straight to the team. Up to 3 a day</p>
        </div>
      </div>
      <div className="rate">
        <div className="stars" role="radiogroup" aria-label="Rating" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} of 5`}
              className={`star${n <= shown ? ' is-on' : ''}`}
              onMouseEnter={() => setHover(n)}
              onClick={() => { setRating(n); setStatus(''); }}
            >
              <Star size={24} strokeWidth={1.5} />
            </button>
          ))}
        </div>
        <span className="rate-word">{RATING_WORDS[shown] || 'Pick a rating'}</span>
      </div>
      <label className="field">
        <span>What works, what does not</span>
        <textarea rows={5} maxLength={2000} value={comment} onChange={(e) => { setComment(e.target.value); setStatus(''); }} />
        <span className="field-count mono">{comment.length} / 2000</span>
      </label>
      <div className="set-actions">
        <button type="submit" className="btn btn-primary btn-sm" disabled={!rating || !info.emailVerified || status === 'busy'}>Send review</button>
        {!info.emailVerified && <span className="acct-muted">Confirm your email to send a review</span>}
        <Status value={status} done="Sent. Thank you" />
      </div>
    </form>
  );
}

/* ---------- Shell ---------- */

function VerifyNotice({ info }) {
  const [status, setStatus] = useState('');
  const captcha = useCaptcha();
  const resend = async () => {
    setStatus('busy');
    try { await resendConfirmation(info.email, await captcha.getToken()); setStatus('done'); } catch (error) { setStatus(authMessage(error)); }
  };
  return (
    <div className="acct-notice">
      <MailWarning size={16} strokeWidth={1.5} />
      <span>Confirm your email to use the assistant and send reviews.</span>
      <button type="button" className="btn-quiet" onClick={resend} disabled={status === 'busy' || status === 'done'}>
        {status === 'done' ? 'Link sent' : 'Send the link again'}
      </button>
      {status && !['busy', 'done'].includes(status) && <span className="form-error">{status}</span>}
      {captcha.element}
    </div>
  );
}

export default function Account() {
  const { user, info, loading, verified, refresh, mfaRequired } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([id]) => id === params.get('tab')) ? params.get('tab') : 'overview';

  if (loading) return <main className="dash" aria-busy="true" />;
  if (!info || mfaRequired) return <Navigate to="/sign-in?next=/account" replace />;

  const hwid = typeof user?.app_metadata?.hwid === 'string' ? user.app_metadata.hwid : null;
  const title = TABS.find(([id]) => id === tab)[1];

  return (
    <main className="dash">
      <div className="wrap dash-in">
        <aside className="dash-side">
          <div className="dash-who">
            <Avatar info={info} />
            <div className="dash-who-text">
              <div className="dash-who-name">{info.displayName}</div>
              <div className="dash-who-plan">{PLAN_NAME[info.plan]}</div>
            </div>
          </div>
          <nav className="dash-nav" aria-label="Account">
            {TABS.map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                className={`dash-link${tab === id ? ' is-on' : ''}`}
                aria-current={tab === id ? 'page' : undefined}
                onClick={() => setParams(id === 'overview' ? {} : { tab: id }, { replace: true })}
              >
                <Icon size={16} strokeWidth={1.5} />{label}
              </button>
            ))}
          </nav>
          <Link to="/pricing" className="dash-side-link">Compare plans<ArrowRight size={14} strokeWidth={1.5} /></Link>
        </aside>

        <div className="dash-main">
          <header className="dash-head">
            <h1>{title}</h1>
            {!verified && <span className="acct-muted">Last known state. Unlag accounts cannot be reached right now</span>}
          </header>
          {!info.emailVerified && <VerifyNotice info={info} />}
          {tab === 'overview' && <Overview info={info} hwid={hwid} refresh={refresh} />}
          {tab === 'settings' && <SettingsView info={info} />}
          {tab === 'feedback' && <FeedbackView info={info} />}
        </div>
      </div>
    </main>
  );
}
