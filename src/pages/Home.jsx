import { Link } from 'react-router-dom';
import { ArrowRight, Download } from 'lucide-react';
import HexScene from '../components/HexScene.jsx';
import LaserFlow from '../components/LaserFlow.jsx';
import { Nav } from '../components/Layout.jsx';
import { Ledger, Steps, PlanCards, CtaBand } from '../components/Blocks.jsx';
import { ToolIcon } from '../components/ToolIcon.jsx';
import { DOWNLOAD_URL, VERSION, CATEGORIES, CATEGORY_LINES, TOOLS } from '../data.js';

function Hero() {
  return (
    <section className="hero">
      <div className="hero-scene">
        <HexScene
          src="/hero-mouse.png"
          focusX={0.8}
          alt="A gaming mouse sliding across a desk mat, drawn in hexadecimal digits under cobalt light"
        />
      </div>
      <Nav />
      <div className="wrap hero-copy">
        <h1 className="enter">Cut the lag out of Windows</h1>
        <p className="hero-sub enter">
          Lower input lag, steadier frame times and a quieter system. Unlag tunes your network, CPU,
          privacy settings and BIOS for gaming, and saves every original value first so you can undo anything.
        </p>
        <div className="hero-actions enter">
          <a href={DOWNLOAD_URL} className="btn btn-primary">
            <Download size={18} strokeWidth={1.5} />Download for Windows
          </a>
          <Link to="/features" className="btn btn-secondary">See what it tunes</Link>
        </div>
        <p className="hero-meta enter mono">v{VERSION} · Windows 10 and 11 x64 · free to start</p>
      </div>
      <div className="wrap hero-product enter">
        <LaserFlow x={0.82} hit={260} />
        <img
          className="hero-shot"
          src="/app-home.png"
          width="1320"
          height="840"
          alt="The Unlag home screen with live CPU, memory and latency, quick actions and the optimization score"
        />
      </div>
    </section>
  );
}

function Overview() {
  const max = Math.max(...CATEGORIES.map((c) => c.count));
  const sorted = [...CATEGORIES].sort((a, b) => b.count - a.count);
  return (
    <section className="section section-first">
      <div className="wrap">
        <div className="section-head">
          <h2>Four families of tweaks</h2>
          <p>Each one shows its impact and risk level. The ones marked as recommended are safe for most gaming PCs.</p>
        </div>
        <div className="tweaks-grid">
          <div className="cat-list">
            {sorted.map((c) => (
              <Link to={`/features#${c.id}`} className="cat" key={c.id}>
                <div className="cat-text">
                  <h3>{c.name}</h3>
                  <p>{CATEGORY_LINES[c.id]}</p>
                </div>
                <div className="cat-bar" aria-hidden="true">
                  <span style={{ width: `${(c.count / max) * 100}%` }} />
                </div>
                <span className="cat-count mono">{c.count}</span>
              </Link>
            ))}
          </div>
          <div className="tool-list">
            <div className="tool-head">And the tools around them</div>
            {TOOLS.map((t) => (
              <div className="tool" key={t.id}>
                <ToolIcon id={t.id} />
                <div>
                  <div className="tool-name">{t.name}</div>
                  <div className="tool-line">{t.line}</div>
                </div>
              </div>
            ))}
            <Link to="/features" className="text-link">See the modules<ArrowRight size={16} strokeWidth={1.5} /></Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Reversible() {
  return (
    <section className="section">
      <div className="wrap rev-grid">
        <div>
          <h2>Everything Unlag changes can be undone</h2>
          <p className="rev-lead">
            Unlag really changes the system, with administrator rights. So it keeps a record of every value before writing it.
          </p>
          <Steps />
          <Link to="/how-it-works" className="text-link">How it works<ArrowRight size={16} strokeWidth={1.5} /></Link>
        </div>
        <Ledger />
      </div>
    </section>
  );
}

function PricingTeaser() {
  return (
    <section className="section">
      <div className="wrap">
        <div className="section-head">
          <h2>Start for free</h2>
          <p>Cleanup and privacy are free. Paid plans add the modules that deal with latency and the BIOS.</p>
        </div>
        <PlanCards />
        <p className="plans-note"><Link to="/pricing" className="text-link inline">Compare plans<ArrowRight size={16} strokeWidth={1.5} /></Link></p>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <Hero />
      <main>
        <Overview />
        <Reversible />
        <PricingTeaser />
        <CtaBand />
      </main>
    </>
  );
}
