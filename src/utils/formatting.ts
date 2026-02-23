import type { JobStatus, TransactionType, ClientLoyaltyTier, ProviderLoyaltyTier } from '../types';

export const formatCurrency = (amount: number): string =>
  `ETB ${Math.round(amount).toLocaleString('en-ET')}`;

export const formatDistance = (km: number): string =>
  km < 1 ? `${Math.round(km * 1000)}m away` : `${km.toFixed(1)} km away`;

export const formatDate = (iso: string): string =>
  new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso)
  );

export const formatShortDate = (iso: string): string =>
  new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(iso));

export const formatTimeAgo = (iso: string): string => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

export const formatJobStatus = (status: JobStatus): string => {
  const map: Record<JobStatus, string> = {
    pending_agreement: 'Pending Agreement',
    active: 'Active',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    disputed: 'Disputed',
  };
  return map[status];
};

export const formatTransactionType = (type: TransactionType): string => {
  const map: Record<TransactionType, string> = {
    payment: 'Payment',
    cashback: 'Cashback',
    commission: 'Commission',
    withdrawal: 'Withdrawal',
    refund: 'Refund',
    deposit: 'Top-Up',
  };
  return map[type];
};

export const formatClientTier = (tier: ClientLoyaltyTier): string => {
  const map: Record<ClientLoyaltyTier, string> = {
    bronze: 'Bronze',
    silver: 'Silver',
    gold: 'Gold',
  };
  return map[tier];
};

export const formatProviderTier = (tier: ProviderLoyaltyTier): string => {
  const map: Record<ProviderLoyaltyTier, string> = {
    rising_pro: 'Rising Pro',
    trusted_pro: 'Trusted Pro',
    elite_pro: 'Elite Pro',
  };
  return map[tier];
};

export const formatPricingModel = (model: string, hourlyRate?: number, fixedRate?: number): string => {
  if (model === 'hourly' && hourlyRate) return `ETB ${hourlyRate}/hr`;
  if (model === 'fixed' && fixedRate) return `ETB ${fixedRate} fixed`;
  return 'Custom Estimate';
};

export const calcDistance = (
  lat1: number, lng1: number, lat2: number, lng2: number
): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
