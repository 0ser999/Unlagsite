import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Features from './pages/Features.jsx';
import HowItWorks from './pages/HowItWorks.jsx';
import Pricing from './pages/Pricing.jsx';
import Faq from './pages/Faq.jsx';
import Download from './pages/Download.jsx';
import NotFound from './pages/NotFound.jsx';
import SignIn from './pages/SignIn.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import Account from './pages/Account.jsx';
import { Terms, Privacy, LegalNotice } from './pages/Legal.jsx';
import { AuthProvider } from './lib/auth.jsx';

export default function App() {
  return (
    <AuthProvider>
    <BrowserRouter>
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
          <Route path="terms" element={<Terms />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="legal" element={<LegalNotice />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </AuthProvider>
  );
}
