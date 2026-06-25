import {
	IconBuildingStore,
	IconHistory,
	IconSettings,
	IconBriefcase,
	IconTrendingUp,
	IconUser,
	IconChartBar,
	IconUsers,
	IconCurrencyDollar,
	IconCategory,
	IconShield,
	IconScale,
	IconReceipt,
	IconLanguage,
	IconLayoutDashboard,
	IconLifebuoy,
} from '@tabler/icons-react';
import { ROUTES } from '../utils/constants';
import type { NavItem } from '../types/nav';
import type { UserRole } from '../types';

const CLIENT_NAV: NavItem[] = [
	{ path: ROUTES.clientDashboard, label: 'sidebar.dashboard', icon: <IconLayoutDashboard size={20} /> },
	{ path: ROUTES.clientBrowse,    label: 'sidebar.explore',   icon: <IconBuildingStore size={20} /> },
	{ path: ROUTES.clientHistory,   label: 'sidebar.requests',  icon: <IconHistory size={20} /> },
	{ path: ROUTES.clientHelp,      label: 'sidebar.help',      icon: <IconLifebuoy size={20} /> },
	{ path: ROUTES.clientSettings,  label: 'sidebar.settings',  icon: <IconSettings size={20} /> },
];

const PROVIDER_NAV: NavItem[] = [
	{ path: ROUTES.providerDashboard, label: 'sidebar.dashboard', icon: <IconLayoutDashboard size={20} /> },
	{ path: ROUTES.providerProfile, label: 'sidebar.profile', icon: <IconUser size={20} /> },
	{ path: ROUTES.providerEarnings, label: 'sidebar.earnings', icon: <IconTrendingUp size={20} /> },
	{ path: ROUTES.providerSettings, label: 'sidebar.settings', icon: <IconSettings size={20} /> },
];

const ADMIN_NAV: NavItem[] = [
	{ path: ROUTES.adminDashboard, label: 'sidebar.analytics', icon: <IconChartBar size={18} /> },
	{ path: ROUTES.adminUsers, label: 'sidebar.user_verification', icon: <IconUsers size={18} /> },
	{ path: ROUTES.adminCommission, label: 'sidebar.commission_settings', icon: <IconCurrencyDollar size={18} /> },
	{ path: ROUTES.adminCategories, label: 'sidebar.categories', icon: <IconCategory size={18} /> },
	{ path: ROUTES.adminFraud, label: 'sidebar.fraud', icon: <IconShield size={18} /> },
	{ path: ROUTES.adminDisputes, label: 'sidebar.disputes', icon: <IconScale size={18} /> },
	{ path: ROUTES.adminTransactions, label: 'sidebar.transactions', icon: <IconReceipt size={18} /> },
	{ path: ROUTES.adminContent, label: 'sidebar.content', icon: <IconLanguage size={18} /> },
];

export const getRoleNavItems = (role?: UserRole | null): NavItem[] => {
	if (role === 'provider') return PROVIDER_NAV;
	if (role === 'admin') return ADMIN_NAV;
	return CLIENT_NAV;
};
