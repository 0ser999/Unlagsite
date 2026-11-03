import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, History, Cpu } from 'lucide-react';
import { PageHeader, Ledger, Steps, CtaBand } from '../components/Blocks.jsx';
import { RISK_TOTAL } from '../data.js';
import { t } from '../i18n/index.jsx';

function RiskShare() {
  return (
    <section className="section">
      <div className="wrap rev-grid">
        <div>
          <h2>{t('how.riskTitle')}</h2>
          <p className="rev-lead">{t('how.riskLead')}</p>
        </div>
        <div className="risk-block">
          <div className="risk-bar" aria-hidden="true">
            {Object.entries(RISK_TOTAL).map(([risk, n]) => (
              <span key={risk} className={`risk-seg seg-${risk}`} style={{ flexGrow: n }} />
            ))}
          </div>
          <dl className="risk-list">
            {Object.entries(RISK_TOTAL).map(([risk, n]) => (
              <div className="risk-item" key={risk}>
                <dt><span className={`risk risk-${risk}`}><i />{t(`risk.${risk}`)}</span></dt>
                <dd className="mono">{t('how.tweaks', { n })}</dd>
                <dd className="risk-text">{t(`risk.${risk}Text`)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

function Engine() {
  const icons = [Cpu, ShieldCheck, History];
  return (
    <section className="section">
      <div className="wrap">
        <div className="section-head">
          <h2>{t('how.engineTitle')}</h2>
        </div>
        <div className="engine-grid">
          {t('how.engine').map(([title, text], i) => {
            const Icon = icons[i];
            return (
              <div className="engine-item" key={title}>
                <Icon size={18} strokeWidth={1.5} />
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function HowItWorks() {
  return (
    <main>
      <PageHeader title={t('how.title')}>{t('how.lead')}</PageHeader>
      <section className="section section-tight">
        <div className="wrap rev-grid">
          <div>
            <h2>{t('how.stepsTitle')}</h2>
            <p className="rev-lead">{t('how.stepsLead')}</p>
            <Steps />
          </div>
          <Ledger />
        </div>
      </section>
      <RiskShare />
      <Engine />
      <section className="section">
        <div className="wrap split-link">
          <h2>{t('how.seeModules')}</h2>
          <Link to="/features" className="btn btn-secondary">{t('how.seeFeatures')}<ArrowRight size={18} strokeWidth={1.5} /></Link>
        </div>
      </section>
      <CtaBand />
    </main>
  );
}
