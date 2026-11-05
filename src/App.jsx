import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { DASHBOARD, WWW, onDashboard, onUnlag } from './lib/host.js';
import { t } from './i18n/index.jsx';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
const Features = lazy(() => import('./pages/Features.jsx'));
const HowItWorks = lazy(() => import('./pages/HowItWorks.jsx'));
const Pricing = lazy(() => import('./pages/Pricing.jsx'));
const Faq = lazy(() => import('./pages/Faq.jsx'));
const Download = lazy(() => import('./pages/Download.jsx'));
import NotFound from './pages/NotFound.jsx';
const SignIn = lazy(() => import('./pages/SignIn.jsx'));
const ResetPassword = lazy(() => import('./pages/ResetPassword.jsx'));
const Account = lazy(() => import('./pages/Account.jsx'));
const Checkout = lazy(() => import('./pages/Checkout.jsx'));
const Terms = lazy(() => import('./pages/Legal.jsx').then((m) => ({ default: m.Terms })));
const Privacy = lazy(() => import('./pages/Legal.jsx').then((m) => ({ default: m.Privacy })));
const LegalNotice = lazy(() => import('./pages/Legal.jsx').then((m) => ({ default: m.LegalNotice })));
import { AuthProvider, useAuth } from './lib/auth.jsx';

function Leave({ to }) {
  useEffect(() => { window.location.replace(to); }, [to]);
  return <main className="wrap section" role="status" aria-busy="true">{t('common.oneMoment')}…</main>;
}

// Marketing pages opened on the dashboard host go back to www, same path.
function Www({ children }) {
  const { pathname, search, hash } = useLocation();
  return onDashboard ? <Leave to={`${WWW}${pathname}${search}${hash}`} /> : children;
}

// /account on www moves to the dashboard. A sign-in link may still carry ?code=: wait until
// it is exchanged (the session is shared through .unlag.pro cookies), then drop it.
function AccountRoute() {
  const { search, hash } = useLocation();
  const { loading } = useAuth();
  if (onDashboard) return <Navigate to={`/${search}${hash}`} replace />;
  if (!onUnlag) return <Account />;
  if (loading) return <main className="wrap section" role="status" aria-busy="true">{t('common.oneMoment')}…</main>;
  const params = new URLSearchParams(search);
  params.delete('code');
  const rest = params.toString();
  return <Leave to={`${DASHBOARD}/${rest ? `?${rest}` : ''}${hash}`} />;
}

export default function App() {
  return (
    <AuthProvider>
    <BrowserRouter>
      <Suspense fallback={<main className="wrap section" role="status" aria-busy="true">{t('common.oneMoment')}…</main>}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={onDashboard ? <Account /> : <Home />} />
          <Route path="features" element={<Www><Features /></Www>} />
          <Route path="how-it-works" element={<Www><HowItWorks /></Www>} />
          <Route path="pricing" element={<Www><Pricing /></Www>} />
          <Route path="faq" element={<Www><Faq /></Www>} />
          <Route path="download" element={<Www><Download /></Www>} />
          <Route path="sign-in" element={<SignIn />} />
          <Route path="sign-up" element={<SignIn mode="sign-up" />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route path="account" element={<AccountRoute />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="terms" element={<Www><Terms /></Www>} />
          <Route path="privacy" element={<Www><Privacy /></Www>} />
          <Route path="legal" element={<Www><LegalNotice /></Www>} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      </Suspense>
    </BrowserRouter>
    </AuthProvider>
  );
}
