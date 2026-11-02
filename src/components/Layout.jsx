import { useEffect, useState } from 'react';
import Lenis from 'lenis';
import { useReveal } from '../lib/reveal.js';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';


export const LINKS = [
  ['/features', 'Features'],
  ['/how-it-works', 'How it works'],
  ['/pricing', 'Pricing'],
  ['/faq', 'FAQ'],
];

export function Logo({ size = 28 }) {
  return (
    <Link to="/" className="logo">
      <img src="/logo.png" alt="" width={size} height={size} style={{ borderRadius: size / 4 }} />
      Unlag
    </Link>
  );
}

function AccountLink() {
  const { user, info, loading } = useAuth();
  if (loading) return <span className="nav-account" />;
  if (!user) return <NavLink to="/sign-in" className="nav-account nav-signin">Sign in</NavLink>;
  const photo = info.photoUrl;
  return (
    <NavLink to="/account" className="nav-account" aria-label="Account">
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
        <nav className="nav-links" aria-label="Main">
          {LINKS.map(([to, label]) => (
            <NavLink key={to} to={to}>{label}</NavLink>
          ))}
        </nav>
        <div className="nav-right">
          <AccountLink />
          <NavLink to="/download" className="btn btn-primary btn-sm">Download</NavLink>
        </div>
        <button
          type="button"
          className="nav-menu"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={20} strokeWidth={1.5} /> : <Menu size={20} strokeWidth={1.5} />}
        </button>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="wrap foot-in">
        <div className="foot-brand">
          <Logo size={24} />
          <p>Windows 10 and 11 tuning, every change reversible</p>
        </div>
        <nav className="foot-cols" aria-label="Footer">
          <div>
            <div className="foot-label">Product</div>
            <Link to="/features">Features</Link>
            <Link to="/how-it-works">How it works</Link>
            <Link to="/pricing">Pricing</Link>
          </div>
          <div>
            <div className="foot-label">Support</div>
            <Link to="/faq">FAQ</Link>
            <Link to="/download">Download</Link>
          </div>
          <div>
            <div className="foot-label">Account</div>
            <Link to="/sign-in">Sign in</Link>
            <Link to="/sign-up">Create an account</Link>
            <Link to="/account">Your account</Link>
          </div>
        </nav>
      </div>
      <div className="wrap foot-base mono">© 2026 Unlag</div>
    </footer>
  );
}

const TITLES = {
  '/': 'Unlag · Windows tuned for games',
  '/features': 'Features · Unlag',
  '/how-it-works': 'How it works · Unlag',
  '/pricing': 'Pricing · Unlag',
  '/faq': 'FAQ · Unlag',
  '/download': 'Download · Unlag',
  '/sign-in': 'Sign in · Unlag',
  '/sign-up': 'Create an account · Unlag',
  '/reset-password': 'Reset password · Unlag',
  '/account': 'Account · Unlag',
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
    document.title = TITLES[pathname] ?? 'Page not found · Unlag';
    const target = hash && document.getElementById(hash.slice(1));
    if (lenis) lenis.scrollTo(target || 0, { offset: target ? -24 : 0, immediate: true, force: true });
    else if (target) target.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [pathname, hash]);

  return (
    <>
      {pathname !== '/' && <Nav />}
      <div className="route" key={pathname}><Outlet /></div>
      <Footer />
    </>
  );
}
