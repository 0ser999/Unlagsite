import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Download } from 'lucide-react';
import Toggle from './Toggle.jsx';
import Diff from './Diff.jsx';
import { DOWNLOAD_URL, LEDGER, PLANS, PRICES } from '../data.js';
import { useAuth } from '../lib/auth.jsx';
import { t } from '../i18n/index.jsx';

export function PageHeader({ title, children }) {
  return (
    <header className="page-header">
      <div className="wrap">
        <h1 className="enter">{title}</h1>
        {children && <p className="enter">{children}</p>}
      </div>
    </header>
  );
}

export function Ledger() {
  const [state, setState] = useState(LEDGER.map(() => true));
  return (
    <div className="ledger">
      <div className="ledger-head mono">
        <span>tweaks.json</span>
        <span>{t('ledger.applied', { n: state.filter(Boolean).length, total: LEDGER.length })}</span>
      </div>
      {LEDGER.map((e, i) => {
        const name = t(`ledger.names.${e.id}`);
        return (
          <div className="ledger-row" key={e.id}>
            <div className="ledger-top">
              <div>
                <div className="ledger-name">{name}</div>
                <div className="ledger-path mono">{e.path}</div>
              </div>
              <Toggle on={state[i]} label={name} onChange={() => setState((s) => s.map((v, j) => (j === i ? !v : v)))} />
            </div>
            <Diff k={e.key} from={e.from} to={e.to} on={state[i]} />
          </div>
        );
      })}
      <p className="ledger-hint">{t('ledger.hint')}</p>
    </div>
  );
}

export function Steps() {
  return (
    <ol className="steps">
      <li><span className="step-n mono">1</span><div><h4>{t('steps.read')}</h4><p>{t('steps.readText')}</p></div></li>
      <li><span className="step-n mono">2</span><div><h4>{t('steps.save')}</h4><p>{t('steps.saveText')} <span className="mono path">%ProgramData%\unlag\tweaks.json</span></p></div></li>
      <li><span className="step-n mono">3</span><div><h4>{t('steps.revert')}</h4><p>{t('steps.revertText')}</p></div></li>
    </ol>
  );
}

export function PlanCards() {
  const showPrices = Boolean(PRICES.premium && PRICES.ultra);
  const { user, info } = useAuth();
  const current = info?.plan ?? null;
  const target = (p) => (p.id === 'free' ? '/download' : user ? '/account' : `/sign-up?next=${encodeURIComponent('/account')}`);
  return (
    <div className="plans">
      {PLANS.map((p) => {
        const featured = p.id === 'premium';
        const name = t(`plans.names.${p.id}`);
        return (
          <article className={`plan${featured ? ' is-featured' : ''}`} key={p.id}>
            <div className="plan-top">
              <h3>{name}</h3>
              {featured && <span className="plan-tag">{t('plans.forGaming')}</span>}
            </div>
            <p className="plan-line">{t(`plans.${p.id}.line`)}</p>
            {showPrices && (
              <div className="plan-price">
                <span className="mono">{PRICES[p.id]}</span>
                <span className="per">{p.id === 'free' ? t('plans.forever') : t('plans.oneTime')}</span>
              </div>
            )}
            <ul>
              {p.inherits && <li className="inherit"><Check size={16} strokeWidth={1.5} /><span>{t('plans.everythingIn', { plan: t(`plans.names.${p.inherits === 'Free' ? 'free' : 'premium'}`) })}</span></li>}
              {t(`plans.${p.id}.pages`).map((page) => <li key={page}><Check size={16} strokeWidth={1.5} /><span>{page}</span></li>)}
              {t(`plans.${p.id}.perks`).map((perk) => <li key={perk}><Check size={16} strokeWidth={1.5} /><span>{perk}</span></li>)}
              <li><Check size={16} strokeWidth={1.5} /><span>{t('plans.assistant', { n: p.ai })}</span></li>
            </ul>
            {current === p.id ? (
              <span className="btn btn-secondary plan-current" aria-disabled="true">{t('plans.yourPlan')}</span>
            ) : (
              <Link to={target(p)} className={`btn ${featured ? 'btn-primary' : 'btn-secondary'}`}>
                {p.id === 'free' ? t('plans.download') : t('plans.get', { plan: name })}
              </Link>
            )}
          </article>
        );
      })}
    </div>
  );
}

export function CtaBand() {
  return (
    <section className="cta">
      <div className="wrap cta-in">
        <img src="/logo.png" alt="" width="96" height="96" className="cta-logo" />
        <div className="cta-text">
          <h2>{t('cta.title')}</h2>
          <p>{t('cta.text')}</p>
        </div>
        <a href={DOWNLOAD_URL} className="btn btn-primary">
          <Download size={18} strokeWidth={1.5} />{t('common.downloadWindows')}
        </a>
      </div>
    </section>
  );
}
