import { Link } from 'react-router-dom';
import { Check, ArrowRight } from 'lucide-react';
import { PageHeader, CtaBand } from '../components/Blocks.jsx';
import { ToolIcon } from '../components/ToolIcon.jsx';
import { CATEGORIES, TOOLS, BLOATWARE } from '../data.js';
import { t } from '../i18n/index.jsx';

function RiskMix({ risk }) {
  return (
    <div className="mix">
      <div className="risk-bar" aria-hidden="true">
        {Object.entries(risk).map(([k, n]) => <span key={k} className={`risk-seg seg-${k}`} style={{ flexGrow: n }} />)}
      </div>
      <div className="mix-legend">
        {Object.entries(risk).map(([k, n]) => (
          <span key={k} className={`risk risk-${k}`}><i />{t(`risk.${k}`)} <span className="mono">{n}</span></span>
        ))}
      </div>
    </div>
  );
}

function Module({ c }) {
  const areas = t(`cat.${c.id}.areas`);
  return (
    <article className="module" id={c.id}>
      <div className="module-id">
        <span className="module-count mono">{c.count}</span>
        <h2>{t(`cat.${c.id}.name`)}</h2>
        <p className="module-plan">{c.plan === 'Free' ? t('features.inEveryPlan') : t('features.premiumUltimate')}</p>
      </div>
      <div className="module-body">
        <p className="module-line">{t(`cat.${c.id}.line`)}</p>
        <ul className="module-outcomes">
          {t(`cat.${c.id}.outcomes`).map((o) => <li key={o}><Check size={16} strokeWidth={1.5} /><span>{o}</span></li>)}
        </ul>
      </div>
      <div className="module-side">
        <div className="module-areas">
          {c.areas.map(([name, n], i) => (
            <div className="area" key={name}><span>{areas[i] || name}</span><span className="mono">{n}</span></div>
          ))}
        </div>
        <RiskMix risk={c.risk} />
        <p className="module-meta mono">{t('features.meta', { r: c.recommended, b: c.reboot })}</p>
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
        <p className="modules-note">{t('features.note')}</p>
      </div>
    </section>
  );
}

function Tools() {
  return (
    <section className="section" id="tools">
      <div className="wrap">
        <div className="section-head">
          <h2>{t('features.toolsTitle')}</h2>
          <p>{t('features.toolsText')}</p>
        </div>
        <div className="tool-grid">
          {TOOLS.map((tool) => (
            <div className="tool-card" key={tool.id}>
              <ToolIcon id={tool.id} />
              <h3>{t(`tools.${tool.id}.name`)}</h3>
              <p>{t(`tools.${tool.id}.line`, { n: BLOATWARE.length })}</p>
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
          <h2>{t('features.debloatTitle')}</h2>
          <p>{t('features.debloatText', { n: BLOATWARE.length, size: `${(total / 1000).toFixed(1)} GB` })}</p>
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
      <PageHeader title={t('features.title')}>{t('features.lead')}</PageHeader>
      <Modules />
      <Tools />
      <Debloat />
      <section className="section">
        <div className="wrap split-link">
          <h2>{t('features.writtenFirst')}</h2>
          <Link to="/how-it-works" className="btn btn-secondary">{t('common.howItWorks')}<ArrowRight size={18} strokeWidth={1.5} /></Link>
        </div>
      </section>
      <CtaBand />
    </main>
  );
}
