import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import {
  Check, Lock, Monitor, LogOut, Tag, RefreshCw, Star, MailWarning, LayoutGrid, Settings, MessageSquare, Download, ArrowRight,
} from 'lucide-react';
import { useCaptcha } from '../lib/captcha.jsx';
import { passwordProblem } from '../lib/password.js';
import { PasswordInput, PasswordMeter } from '../components/AuthBits.jsx';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../lib/auth.jsx';
import {
  AI_LIMIT, hasPlan, authMessage, changePassword, readQuota, resendConfirmation, submitReview, updateDisplayName,
} from '../lib/account.js';
import { PLANS, PLAN_MATRIX, PLAN_TWEAKS, DOWNLOAD_URL, VERSION } from '../data.js';
import { t, currentLang } from '../i18n/index.jsx';

const provider = (p) => { const name = t(`account.providers.${p}`); return name.startsWith('account.') ? p : name; };
const providerList = (info) => info.providers.map(provider).join(` ${t('common.and')} `);
const planName = (id) => t(`plans.names.${id}`);
const TABS = [
  ['overview', 'account.tabs.overview', LayoutGrid],
  ['settings', 'account.tabs.settings', Settings],
  ['feedback', 'account.tabs.feedback', MessageSquare],
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

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// A figure that rolls up to its value when it first shows.
function CountUp({ value, duration = 700 }) {
  const [shown, setShown] = useState(() => (reducedMotion() ? value : 0));
  useEffect(() => {
    if (reducedMotion()) { setShown(value); return undefined; }
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const k = Math.min(1, (now - start) / duration);
      setShown(Math.round(value * (1 - (1 - k) ** 3)));
      if (k < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);
  return shown;
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
      setStatus(next.plan === info.plan ? t('account.still', { plan: planName(next.plan) }) : 'updated');
    } catch (error) {
      setStatus(authMessage(error));
    }
  };
  const paid = info.plan !== 'free';
  // The card leans a few degrees toward the pointer and catches the light where it points.
  const tilt = (event) => {
    if (reducedMotion() || event.pointerType === 'touch') return;
    const el = event.currentTarget;
    const r = el.getBoundingClientRect();
    const x = (event.clientX - r.left) / r.width;
    const y = (event.clientY - r.top) / r.height;
    el.style.setProperty('--ry', `${(x - 0.5) * 6}deg`);
    el.style.setProperty('--rx', `${(0.5 - y) * 6}deg`);
    el.style.setProperty('--mx', `${x * 100}%`);
    el.style.setProperty('--my', `${y * 100}%`);
  };
  const untilt = (event) => {
    event.currentTarget.style.setProperty('--rx', '0deg');
    event.currentTarget.style.setProperty('--ry', '0deg');
  };
  return (
    <section className="lic-wrap" aria-label={t('account.yourPlan')}>
      <div className={`lic lic-${info.plan}`} onPointerMove={tilt} onPointerLeave={untilt}>
        <pre className="lic-hex mono" aria-hidden="true">{texture}</pre>
        <div className="lic-top">
          <img src="/logo.png" alt="" width="28" height="28" />
          <span className="lic-brand">Unlag</span>
          <span className="lic-ver mono">v{VERSION}</span>
        </div>
        <div className="lic-plan">{planName(info.plan)}</div>
        <div className="lic-meta">
          <div>
            <span className="lic-k">{t('account.holder')}</span>
            <span className="lic-v">{info.displayName}</span>
          </div>
          <div>
            <span className="lic-k">{t('account.pc')}</span>
            <span className="lic-v mono">{!paid ? t('account.anyPc') : hwid ? shortId(hwid) : t('account.notClaimed')}</span>
          </div>
          <div>
            <span className="lic-k">{t('account.memberFor')}</span>
            <span className="lic-v">{new Date(info.createdAt).toLocaleDateString(currentLang(), { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
        </div>
      </div>
      <div className="lic-under">
        <p className="lic-note">
          <Monitor size={16} strokeWidth={1.5} />
          {!paid
            ? t('account.noteFree')
            : hwid
              ? t('account.noteTied')
              : t('account.noteFirst')}
        </p>
        <button type="button" className="btn-quiet" onClick={onRefresh} disabled={status === 'busy'}>
          <RefreshCw size={16} strokeWidth={1.5} className={status === 'busy' ? 'spin' : ''} />{t('account.refresh')}
        </button>
        {status && status !== 'busy' && <span className={status === 'updated' ? 'acct-ok' : 'acct-muted'}>{status === 'updated' ? t('account.updated') : status}</span>}
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
  return t('account.hours', { h: Math.floor(mins / 60), m: String(mins % 60).padStart(2, '0') });
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
      <div className="stat-label">{t('account.aiToday')}</div>
      <div className="stat-figure mono">{quota ? <CountUp value={used} duration={500} /> : '–'}<span> / {limit}</span></div>
      <div className="meter" aria-hidden="true"><span style={{ transform: `scaleX(${quota ? Math.min(1, used / limit) : 0})` }} /></div>
      <div className="stat-note">
        {!info.emailVerified ? t('account.confirmForAi')
          : failed ? t('account.cannotRead')
          : left ? t('account.resetsIn', { t: left }) : t('account.resetsMidnight')}
      </div>
    </div>
  );
}

function Stats({ info }) {
  return (
    <div className="stats">
      <QuotaStat info={info} />
      <div className="stat">
        <div className="stat-label">{t('common.email')}</div>
        <div className={`stat-state${info.emailVerified ? ' is-ok' : ' is-warn'}`}>
          <i />{info.emailVerified ? t('account.confirmed') : t('account.notConfirmed')}
        </div>
        <div className="stat-note">{t('account.signedInWith', { list: providerList(info) })}</div>
      </div>
    </div>
  );
}

// Pages and perks of the plan matrix. The three tweak rows are shown by the bar instead.
const PAGE_ROWS = PLAN_MATRIX.map(([page, min], i) => ({ page, min, i })).filter(({ page }) => !['Essential tweaks', 'Moderate tweaks', 'Advanced tweaks'].includes(page));
const TIERS = ['free', 'premium', 'ultra'];
const tierSize = (id, n) => PLAN_TWEAKS[id] - (n ? PLAN_TWEAKS[TIERS[n - 1]] : 0);

function TweakBar({ plan }) {
  const rank = TIERS.indexOf(plan);
  return (
    <div className="tier">
      <div className="tier-figure"><b className="mono"><CountUp value={PLAN_TWEAKS[plan]} /></b><span>{t('account.tweaksOf', { total: PLAN_TWEAKS.ultra })}</span></div>
      <div className="tier-bar" aria-hidden="true">
        {TIERS.map((id, n) => <span key={id} className={rank >= n ? 'is-on' : ''} style={{ flexGrow: tierSize(id, n), '--d': `${120 + n * 140}ms` }} />)}
      </div>
      <div className="tier-legend mono" aria-hidden="true">
        {TIERS.map((id, n) => <span key={id} style={{ flexGrow: tierSize(id, n) }} className={id === plan ? 'is-current' : ''}>{planName(id)}</span>)}
      </div>
    </div>
  );
}

function Unlocks({ info }) {
  const next = PLANS.find((p) => !hasPlan(info, p.id));
  const label = (row) => t('plans.matrix')[row.i] || row.page;
  const open = PAGE_ROWS.filter((r) => hasPlan(info, r.min));
  const locked = PAGE_ROWS.filter((r) => !hasPlan(info, r.min));
  return (
    <section className="dash-block">
      <div className="dash-block-head">
        <div>
          <h2>{t('account.inApp')}</h2>
          <p>{t('account.tweaksLead', { plan: planName(info.plan) })}</p>
        </div>
        {next && <Link to={`/checkout?plan=${next.id}`} className="btn btn-primary btn-sm">{t('plans.get', { plan: planName(next.id) })}</Link>}
      </div>
      <TweakBar plan={info.plan} />
      <div className="unlock-cols">
        <div>
          <h3 className="unlock-head">{locked.length ? t('account.included') : t('account.allIncluded')}</h3>
          <ul className="unlock-list">
            {open.map((r) => <li key={r.page}><Check size={16} strokeWidth={1.5} /><span>{label(r)}</span></li>)}
          </ul>
        </div>
        {locked.length > 0 && (
          <div>
            <h3 className="unlock-head">{t('account.withPlan', { plan: [...new Set(locked.map((r) => planName(r.min)))].join(' · ') })}</h3>
            <ul className="unlock-list is-locked">
              {locked.map((r) => <li key={r.page}><Lock size={16} strokeWidth={1.5} /><span>{label(r)}</span><em className="mono">{planName(r.min)}</em></li>)}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

function AppStrip() {
  return (
    <section className="dash-strip">
      <img src="/logo.png" alt="" width="40" height="40" />
      <div>
        <div className="dash-strip-title">{t('account.appTitle')}</div>
        <div className="dash-strip-meta mono">{t('account.appMeta', { v: VERSION })}</div>
      </div>
      <a href={DOWNLOAD_URL} className="btn btn-secondary btn-sm"><Download size={16} strokeWidth={1.5} />{t('account.download')}</a>
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
    <Row label={t('account.displayName')} hint={t('account.displayNameHint')}>
      <form className="set-form" onSubmit={save}>
        <input className="input" aria-label={t('account.displayName')} value={name} maxLength={32} onChange={(e) => { setName(e.target.value); setStatus(''); }} />
        <div className="set-actions">
          <button type="submit" className="btn btn-secondary btn-sm" disabled={status === 'busy' || name.trim() === info.displayName}>{t('account.save')}</button>
          <Status value={status} done={t('account.saved')} />
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
      <Row label={t('account.password')} hint={t('account.managedBy')}>
        <p className="set-text">{t('account.noPassword', { list: providerList(info) })}</p>
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
    <Row label={t('account.password')} hint={t('account.passwordHint')}>
      <form className="set-form" onSubmit={save}>
        <PasswordInput className="input" aria-label={t('account.currentPassword')} placeholder={t('account.currentPassword')} autoComplete="current-password" required value={current} onChange={(e) => { setCurrent(e.target.value); setStatus(''); }} />
        <PasswordInput className="input" aria-label={t('account.newPassword')} placeholder={t('account.newPassword')} autoComplete="new-password" required value={password} onChange={(e) => { setPassword(e.target.value); setStatus(''); }} />
        <PasswordMeter value={password} />
        {captcha.element}
        <div className="set-actions">
          <button type="submit" className="btn btn-secondary btn-sm" disabled={status === 'busy'}>{t('account.changePassword')}</button>
          <Status value={status} done={t('account.changed')} />
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
      <Row label={t('account.twoStep')} hint={t('account.twoStepShort')}>
        <p className="set-text">{t('account.twoStepProvider', { list: providerList(info) })}</p>
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
    <Row label={t('account.twoStep')} hint={t('account.twoStepHint')}>
      <div className="set-form">
        <div className="set-static">
          <span className={`stat-state${on ? ' is-ok' : ''}`}><i />{on ? t('account.on') : t('account.off')}</span>
          <span className="set-text">{on ? t('account.codesTo', { email: info.email }) : t('account.passwordAlone')}</span>
        </div>
        <div className="set-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={toggle} disabled={status === 'busy'}>{on ? t('account.turnOff') : t('account.turnOn')}</button>
          {status === 'on' && <span className="acct-ok"><Check size={14} strokeWidth={1.5} />{t('account.turnedOn')}</span>}
          {status === 'off' && <span className="acct-muted">{t('account.turnedOff')}</span>}
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
      <Row label={t('common.email')} hint={t('account.emailHint')}>
        <div className="set-static">
          <span className="mono">{info.email}</span>
          <span className={`stat-state${info.emailVerified ? ' is-ok' : ' is-warn'}`}><i />{info.emailVerified ? t('account.confirmed') : t('account.notConfirmed')}</span>
        </div>
      </Row>
      <Row label={t('account.methods')}>
        <ul className="providers">
          {info.providers.map((p) => <li key={p}>{provider(p)}</li>)}
        </ul>
      </Row>
      <PasswordRow info={info} />
      <EmailCodeRow info={info} />
      <Row label={t('account.signOut')} hint={t('account.signOutHint')}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => supabase.auth.signOut({ scope: 'local' })}>
          <LogOut size={16} strokeWidth={1.5} />{t('account.signOut')}
        </button>
      </Row>
    </section>
  );
}

/* ---------- Feedback ---------- */


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
          <h2>{t('account.rateTitle')}</h2>
          <p>{t('account.rateLead')}</p>
        </div>
      </div>
      <div className="rate">
        <div className="stars" role="radiogroup" aria-label={t('account.rating')} onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={t('account.ofFive', { n })}
              className={`star${n <= shown ? ' is-on' : ''}`}
              onMouseEnter={() => setHover(n)}
              onClick={() => { setRating(n); setStatus(''); }}
            >
              <Star size={24} strokeWidth={1.5} />
            </button>
          ))}
        </div>
        <span className="rate-word">{t('account.ratingWords')[shown] || t('account.pickRating')}</span>
      </div>
      <label className="field">
        <span>{t('account.whatWorks')}</span>
        <textarea rows={5} maxLength={2000} value={comment} onChange={(e) => { setComment(e.target.value); setStatus(''); }} />
        <span className="field-count mono">{comment.length} / 2000</span>
      </label>
      <div className="set-actions">
        <button type="submit" className="btn btn-primary btn-sm" disabled={!rating || !info.emailVerified || status === 'busy'}>{t('account.sendReview')}</button>
        {!info.emailVerified && <span className="acct-muted">{t('account.confirmForReview')}</span>}
        <Status value={status} done={t('account.sent')} />
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
      <span>{t('account.confirmNotice')}</span>
      <button type="button" className="btn-quiet" onClick={resend} disabled={status === 'busy' || status === 'done'}>
        {status === 'done' ? t('account.linkSent') : t('account.sendAgain')}
      </button>
      {status && !['busy', 'done'].includes(status) && <span className="form-error">{status}</span>}
      {captcha.element}
    </div>
  );
}

function Sidebar({ info, tab, onTab }) {
  const nav = useRef(null);
  const [ind, setInd] = useState(null);
  const next = PLANS.find((p) => !hasPlan(info, p.id));
  // The highlight slides to the active button: down a column on desktop, along a row on phones.
  const place = useCallback(() => {
    const btn = nav.current?.querySelector('.side-link.is-on');
    if (btn) setInd({ x: btn.offsetLeft, y: btn.offsetTop, w: btn.offsetWidth, h: btn.offsetHeight });
  }, []);
  useLayoutEffect(place, [tab, place]);
  useEffect(() => {
    const ro = new ResizeObserver(place);
    if (nav.current) ro.observe(nav.current);
    return () => ro.disconnect();
  }, [place]);
  // 1, 2 and 3 switch tabs while no field has focus.
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '')) return;
      const hit = TABS[Number(e.key) - 1];
      if (hit) onTab(hit[0]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onTab]);
  return (
    <aside className={`dash-side side-${info.plan}`}>
      <div className="side-who">
        <span className="side-avatar"><Avatar info={info} size={44} /></span>
        <div className="side-who-text">
          <div className="side-name">{info.displayName}</div>
          <div className="side-mail">{info.email}</div>
        </div>
      </div>
      <div className="side-plan">
        <div className="side-plan-row">
          <span className="side-plan-name">{planName(info.plan)}</span>
          <span className="side-plan-count mono"><CountUp value={PLAN_TWEAKS[info.plan]} /> / {PLAN_TWEAKS.ultra}</span>
        </div>
        <div className="side-plan-bar" aria-hidden="true"><span style={{ transform: `scaleX(${PLAN_TWEAKS[info.plan] / PLAN_TWEAKS.ultra})` }} /></div>
        {next && (
          <Link to={`/checkout?plan=${next.id}`} className="side-upgrade">
            <span>{t('plans.get', { plan: planName(next.id) })}</span><ArrowRight size={16} strokeWidth={1.5} />
          </Link>
        )}
      </div>
      <nav className="side-nav" ref={nav} aria-label={t('account.account')}>
        {ind && <span className="side-ind" aria-hidden="true" style={{ transform: `translate(${ind.x}px, ${ind.y}px)`, width: ind.w, height: ind.h }} />}
        {TABS.map(([id, label, Icon], i) => (
          <button key={id} type="button" className={`side-link${tab === id ? ' is-on' : ''}`} aria-current={tab === id ? 'page' : undefined} onClick={() => onTab(id)}>
            <Icon size={16} strokeWidth={1.5} /><span>{t(label)}</span><kbd>{i + 1}</kbd>
          </button>
        ))}
      </nav>
      <div className="side-foot">
        <Link to="/pricing" className="side-foot-link"><Tag size={16} strokeWidth={1.5} /><span>{t('account.comparePlans')}</span></Link>
        <a href={DOWNLOAD_URL} className="side-foot-link"><Download size={16} strokeWidth={1.5} /><span>{t('account.download')}</span></a>
        <button type="button" className="side-foot-link" onClick={() => supabase.auth.signOut({ scope: 'local' })}><LogOut size={16} strokeWidth={1.5} /><span>{t('account.signOut')}</span></button>
      </div>
    </aside>
  );
}

export default function Account() {
  const { user, info, loading, verified, refresh, mfaRequired } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([id]) => id === params.get('tab')) ? params.get('tab') : 'overview';
  const setTab = useCallback((id) => setParams(id === 'overview' ? {} : { tab: id }, { replace: true }), [setParams]);

  if (loading) return <main className="dash" aria-busy="true" />;
  if (!info || mfaRequired) return <Navigate to="/sign-in?next=/account" replace />;

  const hwid = typeof user?.app_metadata?.hwid === 'string' ? user.app_metadata.hwid : null;
  const title = t(TABS.find(([id]) => id === tab)[1]);

  return (
    <main className="dash">
      <div className="wrap dash-in">
        <Sidebar info={info} tab={tab} onTab={setTab} />

        <div className="dash-main">
          <header className="dash-head">
            <h1>{title}</h1>
            {!verified && <span className="acct-muted">{t('account.offline')}</span>}
          </header>
          {!info.emailVerified && <VerifyNotice info={info} />}
          <div className="dash-view" key={tab}>
            {tab === 'overview' && <Overview info={info} hwid={hwid} refresh={refresh} />}
            {tab === 'settings' && <SettingsView info={info} />}
            {tab === 'feedback' && <FeedbackView info={info} />}
          </div>
        </div>
      </div>
    </main>
  );
}
