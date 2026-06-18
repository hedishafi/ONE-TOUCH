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
	{ path: ROUTES.clientDashboard, label: 'Dashboard',       icon: <IconLayoutDashboard size={20} /> },
	{ path: ROUTES.clientBrowse,    label: 'Explore Services', icon: <IconBuildingStore size={20} /> },
	{ path: ROUTES.clientHistory,   label: 'My Requests',     icon: <IconHistory size={20} /> },
	{ path: ROUTES.clientHelp,      label: 'Help & Support',  icon: <IconLifebuoy size={20} /> },
	{ path: ROUTES.clientSettings,  label: 'Settings',        icon: <IconSettings size={20} /> },
];

const PROVIDER_NAV: NavItem[] = [
	{ path: ROUTES.providerDashboard, label: 'Dashboard', icon: <IconLayoutDashboard size={20} /> },
	{ path: ROUTES.providerProfile, label: 'Profile', icon: <IconUser size={20} /> },
	{ path: ROUTES.providerEarnings, label: 'Earnings', icon: <IconTrendingUp size={20} /> },
	{ path: ROUTES.providerSettings, label: 'Settings', icon: <IconSettings size={20} /> },
];

const ADMIN_NAV: NavItem[] = [
	{ path: ROUTES.adminDashboard, label: 'Analytics', icon: <IconChartBar size={18} /> },
	{ path: ROUTES.adminUsers, label: 'User Verification', icon: <IconUsers size={18} /> },
	{ path: ROUTES.adminCommission, label: 'Commission Settings', icon: <IconCurrencyDollar size={18} /> },
	{ path: ROUTES.adminCategories, label: 'Categories', icon: <IconCategory size={18} /> },
	{ path: ROUTES.adminFraud, label: 'Fraud Monitoring', icon: <IconShield size={18} /> },
	{ path: ROUTES.adminDisputes, label: 'Dispute Resolution', icon: <IconScale size={18} /> },
	{ path: ROUTES.adminTransactions, label: 'Transactions', icon: <IconReceipt size={18} /> },
	{ path: ROUTES.adminContent, label: 'Content Manager', icon: <IconLanguage size={18} /> },
];

export const getRoleNavItems = (role?: UserRole | null): NavItem[] => {
	if (role === 'provider') return PROVIDER_NAV;
	if (role === 'admin') return ADMIN_NAV;
	return CLIENT_NAV;
};
