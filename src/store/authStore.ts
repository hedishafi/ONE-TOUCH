import { create } from 'zustand';
import type { User, ClientProfile, ProviderProfile } from '../types';
import { storage, STORAGE_KEYS } from '../utils/storage';
import { MOCK_USERS, MOCK_CLIENT_PROFILES, MOCK_PROVIDER_PROFILES } from '../mock/mockUsers';
import { MOCK_JOBS, MOCK_WALLET_TRANSACTIONS, MOCK_NOTIFICATIONS } from '../mock/mockJobs';
import { MOCK_DISPUTES, MOCK_FRAUD_FLAGS } from '../mock/mockJobs';
import { DEFAULT_COMMISSION_CONFIG } from '../mock/mockLoyalty';

// ─── Seed localStorage on first load ─────────────────────────────────────────
const seedMockData = () => {
  if (!storage.get(STORAGE_KEYS.users, null)) {
    storage.set(STORAGE_KEYS.users, MOCK_USERS);
    storage.set(STORAGE_KEYS.clientProfiles, MOCK_CLIENT_PROFILES);
    storage.set(STORAGE_KEYS.providerProfiles, MOCK_PROVIDER_PROFILES);
    storage.set(STORAGE_KEYS.jobs, MOCK_JOBS);
    storage.set(STORAGE_KEYS.walletTransactions, MOCK_WALLET_TRANSACTIONS);
    storage.set(STORAGE_KEYS.notifications, MOCK_NOTIFICATIONS);
    storage.set(STORAGE_KEYS.disputes, MOCK_DISPUTES);
    storage.set(STORAGE_KEYS.fraudFlags, MOCK_FRAUD_FLAGS);
    storage.set(STORAGE_KEYS.commissionConfig, DEFAULT_COMMISSION_CONFIG);
    storage.set(STORAGE_KEYS.savedProviders, ['provider-002', 'provider-004']);
  }
  // Seed default passwords for mock users (always ensure this exists)
  if (!storage.get(STORAGE_KEYS.passwords, null)) {
    const defaultPasswords: Record<string, string> = {};
    MOCK_USERS.forEach(u => { defaultPasswords[u.id] = 'demo123'; });
    storage.set(STORAGE_KEYS.passwords, defaultPasswords);
  }
};
seedMockData();

// ─── AUTH STORE ───────────────────────────────────────────────────────────────
interface AuthState {
  currentUser: User | null;
  clientProfile: ClientProfile | null;
  providerProfile: ProviderProfile | null;
  isAuthenticated: boolean;
  selectedRole: 'client' | 'provider' | null;
  login: (email: string, password: string) => { success: boolean; error?: string };
  loginByPhone: (phone: string, password: string) => { success: boolean; error?: string };
  resetPassword: (phone: string, newPassword: string) => { success: boolean; error?: string };
  logout: () => void;
  signup: (data: { email: string; password: string; phone: string; role: User['role'] }) => { success: boolean; userId?: string; error?: string };
  setUserRole: (role: 'client' | 'provider') => void;
  updateProviderOnlineStatus: (isOnline: boolean) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: storage.get<User | null>(STORAGE_KEYS.currentUser, null),
  clientProfile: (() => {
    const user = storage.get<User | null>(STORAGE_KEYS.currentUser, null);
    if (!user || user.role !== 'client') return null;
    const profiles = storage.get<ClientProfile[]>(STORAGE_KEYS.clientProfiles, []);
    return profiles.find(p => p.userId === user.id) ?? null;
  })(),
  providerProfile: (() => {
    const user = storage.get<User | null>(STORAGE_KEYS.currentUser, null);
    if (!user || user.role !== 'provider') return null;
    const profiles = storage.get<ProviderProfile[]>(STORAGE_KEYS.providerProfiles, []);
    return profiles.find(p => p.userId === user.id) ?? null;
  })(),
  isAuthenticated: !!storage.get<User | null>(STORAGE_KEYS.currentUser, null),
  selectedRole: null,

  login: (email, _password) => {
    const users = storage.get<User[]>(STORAGE_KEYS.users, []);
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) return { success: false, error: 'No account found with this email.' };

    const clientProfiles = storage.get<ClientProfile[]>(STORAGE_KEYS.clientProfiles, []);
    const providerProfiles = storage.get<ProviderProfile[]>(STORAGE_KEYS.providerProfiles, []);

    storage.set(STORAGE_KEYS.currentUser, user);
    set({
      currentUser: user,
      isAuthenticated: true,
      clientProfile: user.role === 'client' ? (clientProfiles.find(p => p.userId === user.id) ?? null) : null,
      providerProfile: user.role === 'provider' ? (providerProfiles.find(p => p.userId === user.id) ?? null) : null,
    });
    return { success: true };
  },

  loginByPhone: (phone, password) => {
    const norm = (p: string) => p.replace(/[\s\-()]/g, '');
    const users = storage.get<User[]>(STORAGE_KEYS.users, []);
    const user = users.find(u => norm(u.phone ?? '') === norm(phone));
    if (!user) return { success: false, error: 'No account found with this phone number.' };

    const passwords = storage.get<Record<string, string>>(STORAGE_KEYS.passwords, {});
    const storedPw = passwords[user.id] ?? 'demo123';
    if (password !== storedPw) return { success: false, error: 'Incorrect password.' };

    const clientProfiles = storage.get<ClientProfile[]>(STORAGE_KEYS.clientProfiles, []);
    const providerProfiles = storage.get<ProviderProfile[]>(STORAGE_KEYS.providerProfiles, []);

    storage.set(STORAGE_KEYS.currentUser, user);
    set({
      currentUser: user,
      isAuthenticated: true,
      clientProfile: user.role === 'client' ? (clientProfiles.find(p => p.userId === user.id) ?? null) : null,
      providerProfile: user.role === 'provider' ? (providerProfiles.find(p => p.userId === user.id) ?? null) : null,
    });
    return { success: true };
  },

  resetPassword: (phone, newPassword) => {
    const norm = (p: string) => p.replace(/[\s\-()]/g, '');
    const users = storage.get<User[]>(STORAGE_KEYS.users, []);
    const user = users.find(u => norm(u.phone ?? '') === norm(phone));
    if (!user) return { success: false, error: 'No account found with this phone number.' };

    const passwords = storage.get<Record<string, string>>(STORAGE_KEYS.passwords, {});
    passwords[user.id] = newPassword;
    storage.set(STORAGE_KEYS.passwords, passwords);
    return { success: true };
  },

  logout: () => {
    storage.remove(STORAGE_KEYS.currentUser);
    set({ currentUser: null, clientProfile: null, providerProfile: null, isAuthenticated: false });
  },

  setUserRole: (role) => {
    set({ selectedRole: role });
  },

  signup: ({ email, phone, role }) => {
    const users = storage.get<User[]>(STORAGE_KEYS.users, []);
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, error: 'An account with this email already exists.' };
    }
    const newUser: User = {
      id: `${role}-${Date.now()}`,
      email,
      phone,
      role,
      createdAt: new Date().toISOString(),
      verificationStatus: 'pending',
    };
    storage.set(STORAGE_KEYS.users, [...users, newUser]);
    return { success: true, userId: newUser.id };
  },

  updateProviderOnlineStatus: (isOnline) => {
    const { currentUser } = get();
    if (!currentUser) return;
    const profiles = storage.get<ProviderProfile[]>(STORAGE_KEYS.providerProfiles, []);
    const updated = profiles.map(p =>
      p.userId === currentUser.id ? { ...p, isOnline } : p
    );
    storage.set(STORAGE_KEYS.providerProfiles, updated);
    set(state => ({
      providerProfile: state.providerProfile ? { ...state.providerProfile, isOnline } : null,
    }));
  },
}));
