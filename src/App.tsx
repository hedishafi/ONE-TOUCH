import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from './utils/constants';
import { ScrollToTop } from './components/ScrollToTop';

// Public pages
import { Landing } from './pages/Landing';
import Login from './pages/Login';
import { Signup } from './pages/Signup';
import ClientSignupSimple from './pages/ClientSignupSimple';
import ProviderSignupSimple from './pages/ProviderSignupSimple';
import ProviderProfileSetup from './pages/ProviderProfileSetup';
import { Services } from './pages/Services';
import { ServiceSubcategory } from './pages/ServiceSubcategory';
import { HowItWorks } from './pages/HowItWorks';
import { About } from './pages/About';
import { Dashboard } from './pages/Dashboard';
import { Support } from './pages/Support';
import { HelpCenter } from './pages/HelpCenter';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsOfService } from './pages/TermsOfService';
import { AIHelpBot } from './pages/AIHelpBot';

// Registration flow
import {
  ClientTypeSelect,
  IndividualClientRegister,
  BusinessClientRegister,
  ProviderRegister,
} from './pages/Registration';

// Client pages
import { ClientHome } from './pages/ClientHome';
import {
  BrowseServices,
  BookingHistory,
  SavedProviders,
  ClientWallet,
  ClientLoyalty,
} from './pages/ClientDashboard';
import { ClientMessages } from './pages/ClientMessages';
import { ClientSettings } from './pages/ClientSettings';

// Provider pages
import { ProviderHome } from './pages/ProviderHome';
import ProviderSignupPhoneChoice from './pages/ProviderSignupPhoneChoice';
import {
  ActiveJobs,
  Earnings,
  ProviderProfile,
  ProviderWallet,
  ProviderLoyalty,
} from './pages/ProviderDashboard';

// Provider Onboarding
import { ProviderOnboardingStep1 } from './pages/ProviderOnboarding/Step1';
import { ProviderOnboardingStep3OTPVerify } from './pages/ProviderOnboarding/Step3OTPVerify';

// Admin pages
import {
  AdminAnalytics,
  UserVerification,
  CommissionSettings,
  CategoryManager,
  FraudMonitoring,
  DisputeResolution,
  TransactionMonitoring,
  ContentManager,
} from './pages/AdminDashboard';

// Protected route wrapper
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* ── Public ─────────────────────────────────────────────── */}
        <Route path={ROUTES.landing} element={<Landing />} />
        <Route path={ROUTES.services} element={<Services />} />
        <Route path={ROUTES.serviceCategory} element={<ServiceSubcategory />} />
        <Route path={ROUTES.howItWorks} element={<HowItWorks />} />
        <Route path={ROUTES.about} element={<About />} />
        <Route path={ROUTES.dashboard} element={<Dashboard />} />
        <Route path={ROUTES.support} element={<Support />} />
        <Route path={ROUTES.helpCenter} element={<HelpCenter />} />
        <Route path={ROUTES.privacyPolicy} element={<PrivacyPolicy />} />
        <Route path={ROUTES.termsOfService} element={<TermsOfService />} />
        <Route path={ROUTES.aiBot} element={<AIHelpBot />} />
        <Route path={ROUTES.login} element={<Login />} />
        <Route path={ROUTES.signup} element={<Signup />} />
        <Route path="/signup/client" element={<ClientSignupSimple />} />
        <Route path={ROUTES.signupClient} element={<ClientSignupSimple />} />
        <Route path={ROUTES.signupProvider} element={<ProviderSignupSimple />} />
        <Route path="/provider/profile-setup" element={<ProviderProfileSetup />} />

        {/* ── Registration flows (no auth needed — mid-signup) ──── */}
        <Route path={ROUTES.clientTypeSelect} element={<ClientTypeSelect />} />
        <Route path={ROUTES.individualRegister} element={<IndividualClientRegister />} />
        <Route path={ROUTES.businessRegister} element={<BusinessClientRegister />} />
        <Route path={ROUTES.providerRegister} element={<ProviderRegister />} />

        {/* ── Provider Onboarding (no auth needed) ────── */}
        <Route path="/provider/onboarding/step1" element={<ProviderOnboardingStep1 />} />
        <Route path="/provider/onboarding/phone-choice" element={<ProviderSignupPhoneChoice />} />
        <Route path="/provider/onboarding/step3/verify-otp" element={<ProviderOnboardingStep3OTPVerify />} />

        {/* ── Client ─────────────────────────────────────────────── */}
        <Route
          path="/client/*"
          element={<ProtectedRoute allowedRoles={['client']} />}
        >
          <Route path="dashboard" element={<ClientHome />} />
          <Route path="browse" element={<BrowseServices />} />
          <Route path="history" element={<BookingHistory />} />
          <Route path="saved" element={<SavedProviders />} />
          <Route path="wallet" element={<ClientWallet />} />
          <Route path="loyalty" element={<ClientLoyalty />} />
          <Route path="messages" element={<ClientMessages />} />
          <Route path="settings" element={<ClientSettings />} />
          <Route index element={<Navigate to="dashboard" replace />} />
        </Route>

        {/* ── Provider ───────────────────────────────────────────── */}
        <Route
          path="/provider/*"
          element={<ProtectedRoute allowedRoles={['provider']} />}
        >
          <Route path="dashboard" element={<ProviderHome />} />
          <Route path="jobs" element={<ActiveJobs />} />
          <Route path="earnings" element={<Earnings />} />
          <Route path="profile" element={<ProviderProfile />} />
          <Route path="wallet" element={<ProviderWallet />} />
          <Route path="loyalty" element={<ProviderLoyalty />} />
          <Route index element={<Navigate to="dashboard" replace />} />
        </Route>

        {/* ── Admin ──────────────────────────────────────────────── */}
        <Route
          path="/admin/*"
          element={<ProtectedRoute allowedRoles={['admin']} />}
        >
          <Route path="dashboard" element={<AdminAnalytics />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="users" element={<UserVerification />} />
          <Route path="commissions" element={<CommissionSettings />} />
          <Route path="categories" element={<CategoryManager />} />
          <Route path="fraud" element={<FraudMonitoring />} />
          <Route path="disputes" element={<DisputeResolution />} />
          <Route path="transactions" element={<TransactionMonitoring />} />
          <Route path="content" element={<ContentManager />} />
          <Route index element={<Navigate to="dashboard" replace />} />
        </Route>

        {/* ── Catch-all ──────────────────────────────────────────── */}
        <Route path="*" element={<Navigate to={ROUTES.landing} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
