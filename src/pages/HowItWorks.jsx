import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, History, Cpu } from 'lucide-react';
import { PageHeader, Ledger, Steps, CtaBand } from '../components/Blocks.jsx';
import { RISK_TOTAL, RISK_LABEL } from '../data.js';

const RISK_TEXT = {
  safe: 'Fits almost every PC. Most recommended tweaks are here',
  moderate: 'Changes how a Windows feature behaves, so read the description first',
  advanced: 'For people who know exactly what the setting does',
};

function RiskShare() {
  const counts = RISK_TOTAL;
  return (
    <section className="section">
      <div className="wrap rev-grid">
        <div>
          <h2>A risk level on every tweak</h2>
          <p className="rev-lead">
            Unlag never hides what a tweak does. Each one carries a risk level and an impact, and the ones that need a restart are marked.
          </p>
        </div>
        <div className="risk-block">
          <div className="risk-bar" aria-hidden="true">
            {Object.entries(counts).map(([risk, n]) => (
              <span key={risk} className={`risk-seg seg-${risk}`} style={{ flexGrow: n }} />
            ))}
          </div>
          <dl className="risk-list">
            {Object.entries(counts).map(([risk, n]) => (
              <div className="risk-item" key={risk}>
                <dt><span className={`risk risk-${risk}`}><i />{RISK_LABEL[risk]}</span></dt>
                <dd className="mono">{n} tweaks</dd>
                <dd className="risk-text">{RISK_TEXT[risk]}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

function Engine() {
  const items = [
    [Cpu, 'A native engine', 'The interface talks to UnlagCore, a small engine written in C# that ships with the app. It applies each tweak and reverts it exactly.'],
    [ShieldCheck, 'Administrator rights, on purpose', 'Tweaks change the registry, services and power plans. Without administrator rights the engine refuses every system change.'],
    [History, 'Restore points on top', 'The Backups page creates Windows System Restore points, so you can roll the whole system back from Windows itself.'],
  ];
  return (
    <section className="section">
      <div className="wrap">
        <div className="section-head">
          <h2>What runs on your PC</h2>
        </div>
        <div className="engine-grid">
          {items.map(([Icon, title, text]) => (
            <div className="engine-item" key={title}>
              <Icon size={18} strokeWidth={1.5} />
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function HowItWorks() {
  return (
    <main>
      <PageHeader title="Every change is written down before it happens">
        Unlag changes Windows for real. This is how it keeps each change reversible.
      </PageHeader>
      <section className="section section-tight">
        <div className="wrap rev-grid">
          <div>
            <h2>Read, save, revert</h2>
            <p className="rev-lead">The same three steps run for every tweak.</p>
            <Steps />
          </div>
          <Ledger />
        </div>
      </section>
      <RiskShare />
      <Engine />
      <section className="section">
        <div className="wrap split-link">
          <h2>See what each module covers</h2>
          <Link to="/features" className="btn btn-secondary">See the features<ArrowRight size={18} strokeWidth={1.5} /></Link>
        </div>
      </section>
      <CtaBand />
    </main>
  );
}
