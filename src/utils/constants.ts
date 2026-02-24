// ─── COLOR PALETTE ─────────────────────────────────────────────────────────────
export const COLORS = {
  navyBlue: '#000080',
  navyDark: '#000060',
  navyLight: '#003366',
  lemonYellow: '#F5E642',
  lemonLight: '#FFF9C4',
  tealBlue: '#008080',
  tealDark: '#006666',
  tealLight: '#00A0A0',
  white: '#FFFFFF',
  offWhite: '#F8F9FA',
  gray: '#6C757D',
  lightGray: '#E9ECEF',
  bgGray: '#F5F6F7',
  success: '#2ECC71',
  warning: '#F39C12',
  error: '#E74C3C',
  info: '#3498DB',
};

// ─── JOB STATUS COLORS ────────────────────────────────────────────────────────
export const JOB_STATUS_CONFIG = {
  pending_agreement: { label: 'Pending Agreement', color: 'yellow' },
  active: { label: 'Active', color: 'blue' },
  in_progress: { label: 'In Progress', color: 'teal' },
  completed: { label: 'Completed', color: 'green' },
  cancelled: { label: 'Cancelled', color: 'gray' },
  disputed: { label: 'Disputed', color: 'red' },
};

// ─── LOYALTY TIER COLORS ──────────────────────────────────────────────────────
export const CLIENT_TIER_COLORS = {
  bronze: '#CD7F32',
  silver: '#A8A8A8',
  gold: '#F5E642',
};

export const PROVIDER_TIER_COLORS = {
  rising_pro: '#5DADE2',
  trusted_pro: '#1ABC9C',
  elite_pro: '#F5E642',
};

// ─── MAP DEFAULTS ─────────────────────────────────────────────────────────────
export const DEFAULT_MAP_CENTER: [number, number] = [9.0320, 38.7469]; // Addis Ababa, Ethiopia
export const CURRENCY_SYMBOL = 'ETB';
export const DEFAULT_CITY = 'Addis Ababa, Ethiopia';
export const DEFAULT_ZOOM = 13;

// ─── COMMISSION BOUNDS ────────────────────────────────────────────────────────
export const COMMISSION_MIN = 8;
export const COMMISSION_MAX = 12;
export const COMMISSION_DEFAULT = 10;

// ─── OTP ──────────────────────────────────────────────────────────────────────
export const MOCK_OTP = '123456';

// ─── LANGUAGES ────────────────────────────────────────────────────────────────
export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English', flag: '🇬🇧' },
  { code: 'am', label: 'አማርኛ', nativeLabel: 'Amharic', flag: '🇪🇹' },
  { code: 'om', label: 'Afan Oromo', nativeLabel: 'Afaan Oromoo', flag: '🇪🇹' },
];

// ─── ROUTES ───────────────────────────────────────────────────────────────────
export const ROUTES = {
  landing: '/',
  services: '/services',
  serviceCategory: '/services/:categoryId',
  howItWorks: '/how-it-works',
  about: '/about',
  login: '/login',
  signup: '/signup',
  roleSelect: '/role-select',
  clientTypeSelect: '/register/client-type',
  individualRegister: '/register/individual',
  businessRegister: '/register/business',
  providerRegister: '/register/provider',
  clientDashboard: '/client/dashboard',
  clientBrowse: '/client/browse',
  clientHistory: '/client/history',
  clientSaved: '/client/saved',
  clientWallet: '/client/wallet',
  clientLoyalty: '/client/loyalty',
  clientSettings: '/client/settings',
  providerDashboard: '/provider/dashboard',
  providerJobs: '/provider/jobs',
  providerEarnings: '/provider/earnings',
  providerProfile: '/provider/profile',
  providerWallet: '/provider/wallet',
  providerLoyalty: '/provider/loyalty',
  providerSettings: '/provider/settings',
  adminDashboard: '/admin/dashboard',
  adminUsers: '/admin/users',
  adminCommission: '/admin/commissions',
  adminCommissions: '/admin/commissions',
  adminCategories: '/admin/categories',
  adminFraud: '/admin/fraud',
  adminDisputes: '/admin/disputes',
  adminTransactions: '/admin/transactions',
  adminAnalytics: '/admin/analytics',
  adminContent: '/admin/content',
  savedProviders: '/client/saved',
  dashboard: '/dashboard',
  support: '/support',
  helpCenter: '/help-center',
  privacyPolicy: '/privacy-policy',
  termsOfService: '/terms-of-service',
  aiBot: '/ai-bot',
};
