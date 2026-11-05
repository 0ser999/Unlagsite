import { useEffect, useState } from 'react';
import Lenis from 'lenis';
import { useReveal } from '../lib/reveal.js';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Globe, Menu, X } from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';
import { LANGS, t, useLang } from '../i18n/index.jsx';
import { WWW, onDashboard } from '../lib/host.js';


export const LINKS = [
  ['/features', 'nav.features'],
  ['/how-it-works', 'nav.how'],
  ['/pricing', 'nav.pricing'],
  ['/faq', 'nav.faq'],
];

export function Logo({ size = 28 }) {
  return (
    onDashboard ? (
      <a href={WWW} className="logo">
        <img src="/logo.png" alt="" width={size} height={size} style={{ borderRadius: size / 4 }} />
        Unlag
      </a>
    ) : (
      <Link to="/" className="logo">
        <img src="/logo.png" alt="" width={size} height={size} style={{ borderRadius: size / 4 }} />
        Unlag
      </Link>
    )
  );
}

function AccountLink() {
  const { user, info, loading } = useAuth();
  if (loading) return <span className="nav-account" />;
  if (!user) return <NavLink to="/sign-in" className="nav-account nav-signin">{t('nav.signIn')}</NavLink>;
  const photo = info.photoUrl;
  return (
    <NavLink to="/account" className="nav-account" aria-label={t('nav.account')}>
      {photo
        ? <img src={photo} alt="" width="28" height="28" referrerPolicy="no-referrer" />
        : <span className="nav-initial">{info.displayName.slice(0, 1).toUpperCase()}</span>}
    </NavLink>
  );
}

export function Nav() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className={`nav${open ? ' is-open' : ''}`}>
      <div className="wrap nav-in">
        <Logo />
        <nav className="nav-links" aria-label={t('nav.main')}>
          {LINKS.map(([to, label]) => (
            <NavLink key={to} to={to}>{t(label)}</NavLink>
          ))}
        </nav>
        <div className="nav-right">
          <AccountLink />
          <NavLink to="/download" className="btn btn-primary btn-sm">{t('nav.download')}</NavLink>
        </div>
        <button
          type="button"
          className="nav-menu"
          aria-label={t('nav.menu')}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={20} strokeWidth={1.5} /> : <Menu size={20} strokeWidth={1.5} />}
        </button>
      </div>
    </header>
  );
}

function LanguagePicker() {
  const { lang, setLang } = useLang();
  return (
    <label className="lang-pick">
      <Globe size={16} strokeWidth={1.5} aria-hidden="true" />
      <span className="sr-only">{t('footer.language')}</span>
      <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label={t('footer.language')}>
        {LANGS.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
      </select>
    </label>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="wrap foot-in">
        <div className="foot-brand">
          <Logo size={24} />
          <p>{t('footer.tagline')}</p>
          <LanguagePicker />
        </div>
        <nav className="foot-cols" aria-label="Footer">
          <div>
            <div className="foot-label">{t('footer.product')}</div>
            <Link to="/features">{t('nav.features')}</Link>
            <Link to="/how-it-works">{t('nav.how')}</Link>
            <Link to="/pricing">{t('nav.pricing')}</Link>
          </div>
          <div>
            <div className="foot-label">{t('footer.support')}</div>
            <Link to="/faq">{t('nav.faq')}</Link>
            <Link to="/download">{t('nav.download')}</Link>
            <a href="/discord" target="_blank" rel="noopener noreferrer">Discord</a>
          </div>
          <div>
            <div className="foot-label">{t('footer.account')}</div>
            <Link to="/sign-in">{t('footer.signIn')}</Link>
            <Link to="/sign-up">{t('footer.createAccount')}</Link>
            <Link to="/account">{t('footer.yourAccount')}</Link>
          </div>
          <div>
            <div className="foot-label">{t('footer.legal')}</div>
            <Link to="/terms">{t('footer.terms')}</Link>
            <Link to="/privacy">{t('footer.privacy')}</Link>
            <Link to="/legal">{t('footer.legalNotice')}</Link>
          </div>
        </nav>
      </div>
      <div className="wrap foot-base mono">© 2026 Unlag</div>
      <div className="foot-mark" aria-hidden="true">Unlag</div>
    </footer>
  );
}

const TITLES = {
  '/': 'meta.home',
  '/features': 'meta.features',
  '/how-it-works': 'meta.how',
  '/pricing': 'meta.pricing',
  '/faq': 'meta.faq',
  '/download': 'meta.download',
  '/sign-in': 'meta.signIn',
  '/sign-up': 'meta.signUp',
  '/reset-password': 'meta.reset',
  '/account': 'meta.account',
  '/terms': 'meta.terms',
  '/privacy': 'meta.privacy',
  '/legal': 'meta.legal',
  '/checkout': 'meta.checkout',
};

// Smooth scrolling on every page. It stays on with Windows animations turned off, which
// optimizers (Unlag included) often do and which browsers report as reduced motion.
let lenis = null;
function useLenis() {
  useEffect(() => {
    lenis = new Lenis({ lerp: 0.075, wheelMultiplier: 0.9, smoothWheel: true, anchors: { offset: -24 } });
    let raf = requestAnimationFrame(function frame(time) {
      lenis.raf(time);
      raf = requestAnimationFrame(frame);
    });
    return () => { cancelAnimationFrame(raf); lenis.destroy(); lenis = null; };
  }, []);
}

export default function Layout() {
  const { pathname, hash } = useLocation();
  useLenis();
  useReveal(pathname);

  useEffect(() => {
    document.title = t(onDashboard && pathname === '/' ? 'meta.account' : TITLES[pathname.replace(/(.)\/+$/, '$1')] ?? 'meta.notFound');
    const target = hash && document.getElementById(hash.slice(1));
    if (lenis) lenis.scrollTo(target || 0, { offset: target ? -24 : 0, immediate: true, force: true });
    else if (target) target.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [pathname, hash]);

  return (
    <>
      {(pathname !== '/' || onDashboard) && <Nav />}
      <div className="route" key={pathname}><Outlet /></div>
      <Footer />
    </>
  );
}
