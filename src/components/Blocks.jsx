import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Download } from 'lucide-react';
import Toggle from './Toggle.jsx';
import Diff from './Diff.jsx';
import { DOWNLOAD_URL, LEDGER, PLANS, PRICES } from '../data.js';
import { useAuth } from '../lib/auth.jsx';


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
        <span>{state.filter(Boolean).length} of {LEDGER.length} applied</span>
      </div>
      {LEDGER.map((e, i) => (
        <div className="ledger-row" key={e.id}>
          <div className="ledger-top">
            <div>
              <div className="ledger-name">{e.name}</div>
              <div className="ledger-path mono">{e.path}</div>
            </div>
            <Toggle on={state[i]} label={e.name} onChange={() => setState((s) => s.map((v, j) => (j === i ? !v : v)))} />
          </div>
          <Diff k={e.key} from={e.from} to={e.to} on={state[i]} />
        </div>
      ))}
      <p className="ledger-hint">Turn a line off to watch the original value come back</p>
    </div>
  );
}

export function Steps() {
  return (
    <ol className="steps">
      <li><span className="step-n mono">1</span><div><h4>Read</h4><p>Unlag reads the current value of every key the tweak is about to touch</p></div></li>
      <li><span className="step-n mono">2</span><div><h4>Save</h4><p>The original values go into <span className="mono path">%ProgramData%\unlag\tweaks.json</span></p></div></li>
      <li><span className="step-n mono">3</span><div><h4>Revert exactly</h4><p>Turning the tweak off writes the original value back, or deletes the key if it did not exist</p></div></li>
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
        return (
          <article className={`plan${featured ? ' is-featured' : ''}`} key={p.id}>
            <div className="plan-top">
              <h3>{p.name}</h3>
              {featured && <span className="plan-tag">For gaming</span>}
            </div>
            <p className="plan-line">{p.line}</p>
            {showPrices && (
              <div className="plan-price">
                <span className="mono">{PRICES[p.id]}</span>
                <span className="per">{p.id === 'free' ? 'forever' : 'one-time · 1 PC'}</span>
              </div>
            )}
            <ul>
              {p.inherits && <li className="inherit"><Check size={16} strokeWidth={1.5} /><span>Everything in {p.inherits}</span></li>}
              {p.pages.map((page) => <li key={page}><Check size={16} strokeWidth={1.5} /><span>{page}</span></li>)}
              {p.perks?.map((perk) => <li key={perk}><Check size={16} strokeWidth={1.5} /><span>{perk}</span></li>)}
              <li><Check size={16} strokeWidth={1.5} /><span>Assistant, {p.ai} messages a day</span></li>
            </ul>
            {current === p.id ? (
              <span className="btn btn-secondary plan-current" aria-disabled="true">Your plan</span>
            ) : (
              <Link to={target(p)} className={`btn ${featured ? 'btn-primary' : 'btn-secondary'}`}>
                {p.id === 'free' ? 'Download' : `Get ${p.name}`}
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
          <h2>Try Unlag on your PC</h2>
          <p>Free to start, and every change can be undone</p>
        </div>
        <a href={DOWNLOAD_URL} className="btn btn-primary">
          <Download size={18} strokeWidth={1.5} />Download for Windows
        </a>
      </div>
    </section>
  );
}
