import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
import { AuthProvider } from './lib/auth.jsx';

export default function App() {
  return (
    <AuthProvider>
    <BrowserRouter>
      <Suspense fallback={<main className="wrap section" role="status" aria-busy="true">{t('common.oneMoment')}…</main>}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="features" element={<Features />} />
          <Route path="how-it-works" element={<HowItWorks />} />
          <Route path="pricing" element={<Pricing />} />
          <Route path="faq" element={<Faq />} />
          <Route path="download" element={<Download />} />
          <Route path="sign-in" element={<SignIn />} />
          <Route path="sign-up" element={<SignIn mode="sign-up" />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route path="account" element={<Account />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="terms" element={<Terms />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="legal" element={<LegalNotice />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      </Suspense>
    </BrowserRouter>
    </AuthProvider>
  );
}
