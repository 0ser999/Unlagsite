import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { Check, Lock, Loader2, ArrowRight, Download, ShieldCheck } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { PageHeader } from '../components/Blocks.jsx';
import { PLANS, DOWNLOAD_URL } from '../data.js';
import { useAuth } from '../lib/auth.jsx';
import { hasPlan } from '../lib/account.js';
import { supabase } from '../lib/supabase.js';
import { t, currentLang } from '../i18n/index.jsx';

// Public key only (pk_live_ / pk_test_). The secret key lives in the server functions under /api.
const PK = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
let stripePromise;
const getStripe = () => (stripePromise ||= loadStripe(PK));

// The Payment Element drawn in the site's colors (styles.css :root).
const APPEARANCE = {
  theme: 'night',
  variables: {
    colorPrimary: '#5b8cff',
    colorBackground: '#0b0d14',
    colorText: '#eef0f5',
    colorTextSecondary: '#a3a9b8',
    colorTextPlaceholder: '#7a8296',
    colorDanger: '#ff7a7a',
    colorIcon: '#a3a9b8',
    fontFamily: 'Poppins, "Segoe UI", system-ui, sans-serif',
    fontSizeBase: '15px',
    fontWeightNormal: '400',
    fontWeightMedium: '500',
    borderRadius: '10px',
    spacingUnit: '4px',
    gridRowSpacing: '16px',
  },
  rules: {
    '.Input': { border: '1px solid rgba(238, 240, 245, 0.12)', boxShadow: 'none', padding: '12px 14px', transition: 'border-color 160ms, box-shadow 160ms' },
    '.Input:hover': { borderColor: 'rgba(238, 240, 245, 0.22)' },
    '.Input:focus': { borderColor: '#5b8cff', boxShadow: '0 0 0 3px rgba(91, 140, 255, 0.18)' },
    '.Input--invalid': { borderColor: '#ff7a7a', boxShadow: 'none' },
    '.Label': { color: '#a3a9b8', fontWeight: '500', fontSize: '13px', marginBottom: '8px' },
    '.Tab': { backgroundColor: '#11141c', border: '1px solid rgba(238, 240, 245, 0.12)', boxShadow: 'none' },
    '.Tab:hover': { borderColor: 'rgba(238, 240, 245, 0.22)', color: '#eef0f5' },
    '.Tab--selected': { backgroundColor: '#1a1e28', borderColor: '#5b8cff', boxShadow: '0 0 0 1px #5b8cff' },
    '.Tab--selected:focus': { boxShadow: '0 0 0 1px #5b8cff, 0 0 0 4px rgba(91, 140, 255, 0.18)' },
    '.Block': { backgroundColor: '#11141c', borderColor: 'rgba(238, 240, 245, 0.08)', boxShadow: 'none' },
    '.Error': { fontSize: '13px' },
  },
};
const FONTS = [{ cssSrc: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap' }];

// Same prices as api/_shared.js PRICE, for the summary lines; the server decides what is charged.
const FULL = { free: 0, premium: 1499, ultra: 2999 };
const ERRORS = ['signin', 'unverified', 'owned', 'invalid', 'unavailable'];
const euros = (cents) => `${(cents / 100).toFixed(2).replace('.', ',')} €`;
const planName = (id) => t(`plans.names.${id}`);

async function createIntent(plan) {
  const { data } = await supabase.auth.getSession();
  const res = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token || ''}` },
    body: JSON.stringify({ plan }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw { code: body.error || 'unavailable' };
  return body;
}

function Summary({ plan, order, email }) {
  const p = PLANS.find((x) => x.id === plan);
  const upgrade = order?.from && order.from !== 'free';
  return (
    <aside className={`co-summary co-${plan}`}>
      <div className="co-summary-top">
        <span className="co-eyebrow mono">{t('checkout.order')}</span>
        <h2>unlag {planName(plan)}</h2>
        <p>{t(`plans.${plan}.line`)}</p>
      </div>
      <ul className="co-features">
        {p.inherits && <li><Check size={16} strokeWidth={1.5} />{t('plans.everythingIn', { plan: planName(p.inherits === 'Free' ? 'free' : 'premium') })}</li>}
        {t(`plans.${plan}.pages`).map((x) => <li key={x}><Check size={16} strokeWidth={1.5} />{x}</li>)}
        {t(`plans.${plan}.perks`).map((x) => <li key={x}><Check size={16} strokeWidth={1.5} />{x}</li>)}
        <li><Check size={16} strokeWidth={1.5} />{t('plans.assistant', { n: p.ai })}</li>
      </ul>
      <dl className="co-lines">
        <div><dt>unlag {planName(plan)}</dt><dd className="mono">{euros(FULL[plan])}</dd></div>
        {upgrade && <div className="co-credit"><dt>{t('checkout.upgradeFrom', { plan: planName(order.from) })}</dt><dd className="mono">−{euros(FULL[order.from])}</dd></div>}
        <div className="co-total"><dt>{t('checkout.total')}</dt><dd className="mono">{order ? euros(order.amount) : '—'}</dd></div>
      </dl>
      <p className="co-small">{t('checkout.oneTime')}</p>
      {email && <p className="co-small">{t('checkout.account')} <b>{email}</b></p>}
    </aside>
  );
}

function PaymentForm({ order, plan, onPaid }) {
  const mount = useRef(null);
  const [stripe, setStripe] = useState(null);
  const elements = useRef(null);
  const [ready, setReady] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    let element;
    getStripe().then((s) => {
      if (!alive || !s) return;
      setStripe(s);
      elements.current = s.elements({ clientSecret: order.clientSecret, appearance: APPEARANCE, fonts: FONTS, locale: currentLang() });
      element = elements.current.create('payment', { layout: { type: 'tabs' }, business: { name: 'unlag' } });
      element.on('ready', () => alive && setReady(true));
      element.mount(mount.current);
    }).catch(() => alive && setError(t('checkout.errors.unavailable')));
    return () => { alive = false; element?.destroy(); };
  }, [order.clientSecret]);

  const pay = async (e) => {
    e.preventDefault();
    if (!stripe || !elements.current || paying) return;
    setPaying(true);
    setError('');
    const { error: err, paymentIntent } = await stripe.confirmPayment({
      elements: elements.current,
      redirect: 'if_required',
      confirmParams: { return_url: `${window.location.origin}/checkout?plan=${plan}&done=1` },
    });
    if (err) {
      setError(err.type === 'card_error' || err.type === 'validation_error' ? err.message : t('checkout.errors.unavailable'));
      setPaying(false);
    } else if (paymentIntent && ['succeeded', 'processing'].includes(paymentIntent.status)) {
      onPaid();
    } else setPaying(false);
  };

  return (
    <form className="co-pay" onSubmit={pay}>
      <div className="co-pay-head">
        <h2>{t('checkout.payment')}</h2>
        <span className="co-secure"><Lock size={14} strokeWidth={1.75} />{t('checkout.secure')}</span>
      </div>
      <div className={`co-element${ready ? ' is-ready' : ''}`}>
        {!ready && <div className="co-skeleton" aria-hidden="true"><i /><i /><span><i /><i /></span></div>}
        <div ref={mount} />
      </div>
      {error && <p className="co-error" role="alert">{error}</p>}
      <button type="submit" className="btn btn-primary co-btn" disabled={!ready || paying}>
        {paying ? <Loader2 size={18} strokeWidth={1.75} className="spin" /> : <Lock size={16} strokeWidth={1.75} />}
        {paying ? t('checkout.paying') : t('checkout.pay', { amount: euros(order.amount) })}
      </button>
      <p className="co-small co-center"><ShieldCheck size={14} strokeWidth={1.75} />{t('checkout.stripe')}</p>
    </form>
  );
}

function Success({ plan }) {
  const { info, refresh } = useAuth();
  const active = hasPlan(info, plan);
  const [late, setLate] = useState(false);

  // The webhook grants the plan a few seconds after the payment: ask again until it shows.
  useEffect(() => {
    if (active) return undefined;
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      refresh().catch(() => {});
      if (tries >= 20) { setLate(true); clearInterval(timer); }
    }, 3000);
    return () => clearInterval(timer);
  }, [active, refresh]);

  return (
    <div className="co-done">
      <span className={`co-done-icon${active ? ' is-on' : ''}`}>{active ? <Check size={28} strokeWidth={2} /> : <Loader2 size={28} strokeWidth={1.75} className="spin" />}</span>
      <h2>{active ? t('checkout.doneTitle', { plan: planName(plan) }) : t('checkout.activating')}</h2>
      <p>{active ? t('checkout.doneText') : late ? t('checkout.late') : t('checkout.activatingText')}</p>
      {active && (
        <div className="co-done-actions">
          <a href={DOWNLOAD_URL} className="btn btn-primary"><Download size={18} strokeWidth={1.5} />{t('checkout.download')}</a>
          <Link to="/account" className="btn btn-secondary">{t('checkout.toAccount')}<ArrowRight size={16} strokeWidth={1.5} /></Link>
        </div>
      )}
    </div>
  );
}

export default function Checkout() {
  const [params] = useSearchParams();
  const plan = ['premium', 'ultra'].includes(params.get('plan')) ? params.get('plan') : 'premium';
  const { user, info, loading } = useAuth();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [paid, setPaid] = useState(params.get('done') === '1' || params.get('redirect_status') === 'succeeded');
  const owned = hasPlan(info, plan);

  useEffect(() => {
    if (loading || !user || paid || owned || !PK) return;
    let alive = true;
    setOrder(null);
    setError(null);
    createIntent(plan).then((o) => alive && setOrder(o)).catch((e) => alive && setError(e.code));
    return () => { alive = false; };
  }, [loading, user?.id, plan, paid, owned]);

  if (!loading && !user) return <Navigate to={`/sign-up?next=${encodeURIComponent(`/checkout?plan=${plan}`)}`} replace />;

  let body;
  if (paid) body = <Success plan={plan} />;
  else if (owned) body = (
    <div className="co-done">
      <span className="co-done-icon is-on"><Check size={28} strokeWidth={2} /></span>
      <h2>{t('checkout.owned', { plan: planName(info.plan) })}</h2>
      <Link to="/account" className="btn btn-secondary">{t('checkout.toAccount')}<ArrowRight size={16} strokeWidth={1.5} /></Link>
    </div>
  );
  else body = (
    <div className="co-grid">
      <div className="co-main">
        {!PK || error ? (
          <div className="co-pay co-pay-error">
            <h2>{t('checkout.payment')}</h2>
            <p>{t(`checkout.errors.${PK && ERRORS.includes(error) ? error : 'unavailable'}`)}</p>
            {error === 'unverified' && <Link to="/account" className="btn btn-secondary btn-sm">{t('checkout.toAccount')}</Link>}
          </div>
        ) : order ? (
          <PaymentForm order={order} plan={plan} onPaid={() => setPaid(true)} />
        ) : (
          <div className="co-pay"><div className="co-pay-head"><h2>{t('checkout.payment')}</h2></div><div className="co-skeleton" aria-hidden="true"><i /><i /><span><i /><i /></span></div></div>
        )}
      </div>
      <Summary plan={plan} order={order} email={info?.email} />
    </div>
  );

  return (
    <main>
      <PageHeader title={t('checkout.title', { plan: planName(plan) })}>{t('checkout.lead')}</PageHeader>
      <section className="section section-tight">
        <div className="wrap">{body}</div>
      </section>
    </main>
  );
}
