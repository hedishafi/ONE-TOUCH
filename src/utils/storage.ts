// Generic localStorage helpers with JSON serialization

export const storage = {
  get<T>(key: string, fallback: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : fallback;
    } catch {
      return fallback;
    }
  },

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      console.warn('localStorage.set failed for key:', key);
    }
  },

  remove(key: string): void {
    localStorage.removeItem(key);
  },

  clear(): void {
    localStorage.clear();
  },
};

// ─── KEY CONSTANTS ────────────────────────────────────────────────────────────
export const STORAGE_KEYS = {
  currentUser: 'ot_current_user',
  authToken: 'ot_auth_token',
  language: 'ot_language',
  users: 'ot_users',
  clientProfiles: 'ot_client_profiles',
  providerProfiles: 'ot_provider_profiles',
  jobs: 'ot_jobs',
  walletTransactions: 'ot_wallet_transactions',
  notifications: 'ot_notifications',
  savedProviders: 'ot_saved_providers',
  commissionConfig: 'ot_commission_config',
  fraudFlags: 'ot_fraud_flags',
  disputes: 'ot_disputes',
  passwords: 'ot_passwords',
};
