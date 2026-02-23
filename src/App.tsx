import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from './utils/constants';

// Public pages
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';

// Registration flow
import {
  ClientTypeSelect,
  IndividualClientRegister,
  BusinessClientRegister,
  ProviderRegister,
} from './pages/Registration';

// Client pages
import {
  BrowseServices,
  BookingHistory,
  SavedProviders,
  ClientWallet,
  ClientLoyalty,
} from './pages/ClientDashboard';

// Provider pages
import {
  ActiveJobs,
  Earnings,
  ProviderProfile,
  ProviderWallet,
  ProviderLoyalty,
} from './pages/ProviderDashboard';

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
      <Routes>
        {/* ── Public ─────────────────────────────────────────────── */}
        <Route path={ROUTES.landing} element={<Landing />} />
        <Route path={ROUTES.login} element={<Login />} />
        <Route path={ROUTES.signup} element={<Signup />} />

        {/* ── Registration flows (no auth needed — mid-signup) ──── */}
        <Route path={ROUTES.clientTypeSelect} element={<ClientTypeSelect />} />
        <Route path={ROUTES.individualRegister} element={<IndividualClientRegister />} />
        <Route path={ROUTES.businessRegister} element={<BusinessClientRegister />} />
        <Route path={ROUTES.providerRegister} element={<ProviderRegister />} />

        {/* ── Client ─────────────────────────────────────────────── */}
        <Route
          path="/client/*"
          element={<ProtectedRoute allowedRoles={['client']} />}
        >
          <Route path="dashboard" element={<BrowseServices />} />
          <Route path="browse" element={<BrowseServices />} />
          <Route path="history" element={<BookingHistory />} />
          <Route path="saved" element={<SavedProviders />} />
          <Route path="wallet" element={<ClientWallet />} />
          <Route path="loyalty" element={<ClientLoyalty />} />
          <Route index element={<Navigate to="dashboard" replace />} />
        </Route>

        {/* ── Provider ───────────────────────────────────────────── */}
        <Route
          path="/provider/*"
          element={<ProtectedRoute allowedRoles={['provider']} />}
        >
          <Route path="dashboard" element={<ActiveJobs />} />
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
