import { Link } from 'react-router-dom';
import { ArrowRight, Download } from 'lucide-react';
import HexScene from '../components/HexScene.jsx';
import LaserFlow from '../components/LaserFlow.jsx';
import { Nav } from '../components/Layout.jsx';
import { Ledger, Steps, PlanCards, CtaBand } from '../components/Blocks.jsx';
import { ToolIcon } from '../components/ToolIcon.jsx';
import { FaqList } from './Faq.jsx';
import { DOWNLOAD_URL, VERSION, CATEGORIES, TOOLS, BLOATWARE } from '../data.js';
import { t } from '../i18n/index.jsx';

function Hero() {
  return (
    <section className="hero">
      <div className="hero-scene">
        <HexScene src="/hero-mouse.webp" focusX={0.8} alt={t('hero.alt')} />
      </div>
      <Nav />
      <div className="wrap hero-copy">
        <p className="hero-kicker enter">{t('hero.kicker')}</p>
        <h1 className="enter">{t('hero.title')}</h1>
        <p className="hero-sub enter">{t('hero.sub')}</p>
        <div className="hero-actions enter">
          <a href={DOWNLOAD_URL} className="btn btn-primary">
            <Download size={18} strokeWidth={1.5} />{t('common.downloadWindows')}
          </a>
          <Link to="/features" className="btn btn-secondary">{t('hero.see')}</Link>
        </div>
        <p className="hero-meta enter mono">{t('hero.meta', { v: VERSION })}</p>
      </div>
      <div className="wrap hero-product enter">
        <LaserFlow x={0.82} hit={260} />
        <img className="hero-shot" src="/app-home.webp" srcSet="/app-home-720.webp 720w, /app-home.webp 1320w" sizes="(max-width: 760px) 100vw, 1320px" width="1320" height="840" alt={t('hero.shotAlt')} />
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
          <h2>{t('home.familiesTitle')}</h2>
          <p>{t('home.familiesText')}</p>
        </div>
        <div className="tweaks-grid">
          <div className="cat-list">
            {sorted.map((c) => (
              <Link to={`/features#${c.id}`} className="cat" key={c.id}>
                <div className="cat-text">
                  <h3>{t(`cat.${c.id}.name`)}</h3>
                  <p>{t(`cat.${c.id}.line`)}</p>
                </div>
                <div className="cat-bar" aria-hidden="true">
                  <span style={{ width: `${(c.count / max) * 100}%` }} />
                </div>
                <span className="cat-count mono">{c.count}</span>
              </Link>
            ))}
          </div>
          <div className="tool-list">
            <div className="tool-head">{t('home.toolsHead')}</div>
            {TOOLS.map((tool) => (
              <div className="tool" key={tool.id}>
                <ToolIcon id={tool.id} />
                <div>
                  <div className="tool-name">{t(`tools.${tool.id}.name`)}</div>
                  <div className="tool-line">{t(`tools.${tool.id}.line`, { n: BLOATWARE.length })}</div>
                </div>
              </div>
            ))}
            <Link to="/features" className="text-link">{t('home.seeModules')}<ArrowRight size={16} strokeWidth={1.5} /></Link>
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
          <h2>{t('home.revTitle')}</h2>
          <p className="rev-lead">{t('home.revLead')}</p>
          <Steps />
          <Link to="/how-it-works" className="text-link">{t('common.howItWorks')}<ArrowRight size={16} strokeWidth={1.5} /></Link>
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
          <h2>{t('home.freeTitle')}</h2>
          <p>{t('home.freeText')}</p>
        </div>
        <PlanCards />
        <p className="plans-note"><Link to="/pricing" className="text-link inline">{t('common.comparePlans')}<ArrowRight size={16} strokeWidth={1.5} /></Link></p>
      </div>
    </section>
  );
}

function HomeFaq() {
  return (
    <section className="section">
      <div className="wrap faq">
        <div className="section-head">
          <h2>{t('faq.title')}</h2>
          <p>{t('faq.lead')}</p>
        </div>
        <FaqList items={t('faq.groups').flatMap((g) => g.items)} openFirst={false} />
        <p className="plans-note"><Link to="/faq" className="text-link inline">{t('nav.faq')}<ArrowRight size={16} strokeWidth={1.5} /></Link></p>
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
        <HomeFaq />
        <CtaBand />
      </main>
    </>
  );
}
