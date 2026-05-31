import {
  IconBuildingStore, IconHistory, IconHeart, IconWallet, IconStar,
  IconSettings, IconBriefcase, IconClipboardList, IconTrendingUp,
  IconUser, IconChartBar, IconUsers, IconCurrencyDollar, IconCategory,
  IconShield, IconScale, IconReceipt, IconLanguage, IconMessage,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '../utils/constants';
import type { NavItem } from '../types/nav';
import type { UserRole } from '../types';

export const getRoleNavItems = (role?: UserRole | null): NavItem[] => {
  // This function is called outside React components (in DashboardLayout),
  // so we export a hook-based version for use inside components.
  // The static fallback uses English labels.
  if (role === 'provider') return PROVIDER_NAV_EN;
  if (role === 'admin') return ADMIN_NAV_EN;
  return CLIENT_NAV_EN;
};

// Static English fallbacks (used by DashboardLayout which calls getRoleNavItems outside hooks)
const CLIENT_NAV_EN: NavItem[] = [
  { path: ROUTES.clientBrowse,    label: 'Explore Services', icon: <IconBuildingStore size={20} /> },
  { path: ROUTES.clientHistory,   label: 'My Requests',      icon: <IconHistory size={20} /> },
  { path: ROUTES.clientMessages,  label: 'Messages',         icon: <IconMessage size={20} /> },
  { path: ROUTES.clientWallet,    label: 'Payments',         icon: <IconWallet size={20} /> },
  { path: ROUTES.clientSaved,     label: 'Favorites',        icon: <IconHeart size={20} /> },
  { path: ROUTES.clientSettings,  label: 'Settings',         icon: <IconSettings size={20} /> },
];

const PROVIDER_NAV_EN: NavItem[] = [
  { path: ROUTES.providerDashboard, label: 'Jobs',      icon: <IconBriefcase size={20} /> },
  { path: ROUTES.providerOrders,    label: 'My Orders', icon: <IconClipboardList size={20} /> },
  { path: ROUTES.providerEarnings,  label: 'Earnings',  icon: <IconTrendingUp size={20} /> },
  { path: ROUTES.providerWallet,    label: 'Wallet',    icon: <IconWallet size={20} /> },
  { path: ROUTES.providerProfile,   label: 'Profile',   icon: <IconUser size={20} /> },
  { path: ROUTES.providerLoyalty,   label: 'Rewards',   icon: <IconStar size={20} /> },
  { path: ROUTES.providerSettings,  label: 'Settings',  icon: <IconSettings size={20} /> },
];

const ADMIN_NAV_EN: NavItem[] = [
  { path: ROUTES.adminDashboard,    label: 'Analytics',          icon: <IconChartBar size={18} /> },
  { path: ROUTES.adminUsers,        label: 'User Verification',  icon: <IconUsers size={18} /> },
  { path: ROUTES.adminCommission,   label: 'Commission Settings',icon: <IconCurrencyDollar size={18} /> },
  { path: ROUTES.adminCategories,   label: 'Categories',         icon: <IconCategory size={18} /> },
  { path: ROUTES.adminFraud,        label: 'Fraud Monitoring',   icon: <IconShield size={18} /> },
  { path: ROUTES.adminDisputes,     label: 'Dispute Resolution', icon: <IconScale size={18} /> },
  { path: ROUTES.adminTransactions, label: 'Transactions',       icon: <IconReceipt size={18} /> },
  { path: ROUTES.adminContent,      label: 'Content Manager',    icon: <IconLanguage size={18} /> },
];

/**
 * Hook version — use this inside React components to get translated nav labels.
 * DashboardLayout uses getRoleNavItems() (static) because it's called at render time
 * before hooks can be conditionally called. The sidebar labels update on language change
 * because DashboardLayout re-renders when i18n.language changes.
 */
export function useRoleNavItems(role?: UserRole | null): NavItem[] {
  const { t } = useTranslation();

  const clientNav: NavItem[] = [
    { path: ROUTES.clientBrowse,    label: t('nav.explore_services'), icon: <IconBuildingStore size={20} /> },
    { path: ROUTES.clientHistory,   label: t('nav.my_requests'),      icon: <IconHistory size={20} /> },
    { path: ROUTES.clientMessages,  label: t('nav.messages'),         icon: <IconMessage size={20} /> },
    { path: ROUTES.clientWallet,    label: t('nav.payments'),         icon: <IconWallet size={20} /> },
    { path: ROUTES.clientSaved,     label: t('nav.favorites'),        icon: <IconHeart size={20} /> },
    { path: ROUTES.clientSettings,  label: t('client.settings'),      icon: <IconSettings size={20} /> },
  ];

  const providerNav: NavItem[] = [
    { path: ROUTES.providerDashboard, label: t('nav.jobs'),       icon: <IconBriefcase size={20} /> },
    { path: ROUTES.providerOrders,    label: t('nav.my_orders'),  icon: <IconClipboardList size={20} /> },
    { path: ROUTES.providerEarnings,  label: t('provider.earnings'), icon: <IconTrendingUp size={20} /> },
    { path: ROUTES.providerWallet,    label: t('provider.wallet'),   icon: <IconWallet size={20} /> },
    { path: ROUTES.providerProfile,   label: t('provider.profile'),  icon: <IconUser size={20} /> },
    { path: ROUTES.providerLoyalty,   label: t('nav.rewards'),       icon: <IconStar size={20} /> },
    { path: ROUTES.providerSettings,  label: t('provider.settings'), icon: <IconSettings size={20} /> },
  ];

  const adminNav: NavItem[] = [
    { path: ROUTES.adminDashboard,    label: t('nav.analytics'),           icon: <IconChartBar size={18} /> },
    { path: ROUTES.adminUsers,        label: t('nav.user_verification'),   icon: <IconUsers size={18} /> },
    { path: ROUTES.adminCommission,   label: t('nav.commission_settings'), icon: <IconCurrencyDollar size={18} /> },
    { path: ROUTES.adminCategories,   label: t('nav.categories'),          icon: <IconCategory size={18} /> },
    { path: ROUTES.adminFraud,        label: t('nav.fraud_monitoring'),    icon: <IconShield size={18} /> },
    { path: ROUTES.adminDisputes,     label: t('nav.dispute_resolution'),  icon: <IconScale size={18} /> },
    { path: ROUTES.adminTransactions, label: t('nav.transactions'),        icon: <IconReceipt size={18} /> },
    { path: ROUTES.adminContent,      label: t('nav.content_manager'),     icon: <IconLanguage size={18} /> },
  ];

  if (role === 'provider') return providerNav;
  if (role === 'admin') return adminNav;
  return clientNav;
}
