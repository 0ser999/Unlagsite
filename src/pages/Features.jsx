import { Link } from 'react-router-dom';
import { Check, ArrowRight } from 'lucide-react';
import { PageHeader, CtaBand } from '../components/Blocks.jsx';
import { ToolIcon } from '../components/ToolIcon.jsx';
import { CATEGORIES, CATEGORY_LINES, TOTAL_TWEAKS, RISK_LABEL, TOOLS, BLOATWARE } from '../data.js';

function RiskMix({ risk }) {
  return (
    <div className="mix">
      <div className="risk-bar" aria-hidden="true">
        {Object.entries(risk).map(([k, n]) => <span key={k} className={`risk-seg seg-${k}`} style={{ flexGrow: n }} />)}
      </div>
      <div className="mix-legend">
        {Object.entries(risk).map(([k, n]) => (
          <span key={k} className={`risk risk-${k}`}><i />{RISK_LABEL[k]} <span className="mono">{n}</span></span>
        ))}
      </div>
    </div>
  );
}

function Module({ c }) {
  return (
    <article className="module" id={c.id}>
      <div className="module-id">
        <span className="module-count mono">{c.count}</span>
        <h2>{c.name}</h2>
        <p className="module-plan">{c.plan === 'Free' ? 'Included in every plan' : 'Premium and Ultimate'}</p>
      </div>
      <div className="module-body">
        <p className="module-line">{CATEGORY_LINES[c.id]}</p>
        <ul className="module-outcomes">
          {c.outcomes.map((o) => <li key={o}><Check size={16} strokeWidth={1.5} /><span>{o}</span></li>)}
        </ul>
      </div>
      <div className="module-side">
        <div className="module-areas">
          {c.areas.map(([name, n]) => (
            <div className="area" key={name}><span>{name}</span><span className="mono">{n}</span></div>
          ))}
        </div>
        <RiskMix risk={c.risk} />
        <p className="module-meta mono">{c.recommended} recommended · {c.reboot} need a restart</p>
      </div>
    </article>
  );
}

function Modules() {
  return (
    <section className="section section-tight">
      <div className="wrap">
        <div className="modules">
          {CATEGORIES.map((c) => <Module c={c} key={c.id} />)}
        </div>
        <p className="modules-note">
          Each tweak is named and explained in the app, with what it changes, its impact and its risk, before you turn it on.
        </p>
      </div>
    </section>
  );
}

function Tools() {
  return (
    <section className="section" id="tools">
      <div className="wrap">
        <div className="section-head">
          <h2>The tools around the tweaks</h2>
          <p>Cleanup, app removal, restore points, firmware and an assistant that knows your hardware.</p>
        </div>
        <div className="tool-grid">
          {TOOLS.map((t) => (
            <div className="tool-card" key={t.id}>
              <ToolIcon id={t.id} />
              <h3>{t.name}</h3>
              <p>{t.line}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Debloat() {
  const total = BLOATWARE.reduce((s, a) => s + a.size, 0);
  return (
    <section className="section" id="debloat">
      <div className="wrap">
        <div className="section-head">
          <h2>The apps you never asked for</h2>
          <p>
            Debloat uninstalls preinstalled Windows apps, one at a time or all at once.
            The {BLOATWARE.length} on the list take <span className="mono strong">{(total / 1000).toFixed(1)} GB</span> together.
          </p>
        </div>
        <ul className="apps">
          {BLOATWARE.map((app) => (
            <li className="app-tile" key={app.id}>
              <img src={`/apps/${app.id}.png`} alt="" width="32" height="32" loading="lazy" />
              <span className="app-name">{app.name}</span>
              <span className="app-size mono">{app.size} MB</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default function Features() {
  return (
    <main>
      <PageHeader title={`${TOTAL_TWEAKS} tweaks in four modules`}>
        What each module works on, how many tweaks it holds and how careful you need to be with them.
      </PageHeader>
      <Modules />
      <Tools />
      <Debloat />
      <section className="section">
        <div className="wrap split-link">
          <h2>Every change is written down first</h2>
          <Link to="/how-it-works" className="btn btn-secondary">How it works<ArrowRight size={18} strokeWidth={1.5} /></Link>
        </div>
      </section>
      <CtaBand />
    </main>
  );
}
