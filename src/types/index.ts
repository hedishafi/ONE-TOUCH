// ─── USER & AUTH ──────────────────────────────────────────────────────────────
export type UserRole = 'client' | 'provider' | 'admin';
export type ClientType = 'individual' | 'business';
export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 're-verification-requested';

export interface User {
  id: string;
  email: string;
  phone: string;
  role: UserRole;
  createdAt: string;
  verificationStatus: VerificationStatus;
  isOnline?: boolean;
}

export interface ClientProfile {
  userId: string;
  clientType: ClientType;
  fullName: string;
  idNumber?: string;
  businessName?: string;
  taxId?: string;
  businessAddress?: string;
  selfieUrl?: string;
  idDocumentUrl?: string;
  loyaltyTier: ClientLoyaltyTier;
  walletBalance: number;
  totalBookings: number;
}

export interface ProviderProfile {
  userId: string;
  fullName: string;
  idNumber: string;
  selfieUrl: string;
  idDocumentUrl: string;
  categoryId: string;
  subcategoryId: string;
  pricingModel: PricingModel;
  hourlyRate?: number;
  fixedRate?: number;
  coverageRadius: number;
  lat: number;
  lng: number;
  portfolioImages: string[];
  isOnline: boolean;
  loyaltyTier: ProviderLoyaltyTier;
  walletBalance: number;
  rating: number;
  totalJobsCompleted: number;
  responseRate: number;
  completionRate: number;
  bio: string;
  availabilitySchedule: AvailabilitySchedule;
}

// ─── SERVICE CATEGORIES ───────────────────────────────────────────────────────
export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  subcategories: Subcategory[];
}

export interface Subcategory {
  id: string;
  categoryId: string;
  name: string;
}

export type PricingModel = 'hourly' | 'fixed' | 'custom';

// ─── JOBS ─────────────────────────────────────────────────────────────────────
export type JobStatus =
  | 'pending_agreement'
  | 'active'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'disputed';

export interface Job {
  id: string;
  clientId: string;
  providerId: string;
  categoryId: string;
  subcategoryId: string;
  status: JobStatus;
  estimatedPrice: number;
  finalPrice?: number;
  commissionRate: number;
  commissionAmount?: number;
  netProviderEarning?: number;
  cashbackAmount?: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  clientReview?: Review;
  providerReview?: Review;
  isRepeatBooking: boolean;
  clientLocation: { lat: number; lng: number; address: string };
}

// ─── CALLS ────────────────────────────────────────────────────────────────────
export type CallStatus = 'dialing' | 'ringing' | 'connected' | 'ended' | 'declined';

export interface Call {
  id: string;
  clientId: string;
  providerId: string;
  status: CallStatus;
  startedAt?: string;
  endedAt?: string;
  jobId?: string;
}

// ─── WALLET & TRANSACTIONS ────────────────────────────────────────────────────
export type TransactionType =
  | 'payment'
  | 'cashback'
  | 'commission'
  | 'withdrawal'
  | 'refund'
  | 'deposit';

export interface WalletTransaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  balance: number;
  description: string;
  jobId?: string;
  createdAt: string;
}

// ─── LOYALTY ──────────────────────────────────────────────────────────────────
export type ClientLoyaltyTier = 'bronze' | 'silver' | 'gold';
export type ProviderLoyaltyTier = 'rising_pro' | 'trusted_pro' | 'elite_pro';

export interface LoyaltyConfig {
  clientTiers: ClientTierConfig[];
  providerTiers: ProviderTierConfig[];
  cashbackRates: { first: number; repeat: number };
}

export interface ClientTierConfig {
  tier: ClientLoyaltyTier;
  label: string;
  minBookings: number;
  cashbackRate: number;
  benefits: string[];
  color: string;
}

export interface ProviderTierConfig {
  tier: ProviderLoyaltyTier;
  label: string;
  minRating: number;
  minCompletions: number;
  commissionDiscount: number;
  benefits: string[];
  color: string;
}

// ─── REVIEWS ──────────────────────────────────────────────────────────────────
export interface Review {
  id: string;
  jobId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment: string;
  createdAt: string;
  isModerated: boolean;
}

// ─── DISPUTES ─────────────────────────────────────────────────────────────────
export type DisputeStatus = 'open' | 'under_review' | 'resolved_client' | 'resolved_provider' | 'split';

export interface Dispute {
  id: string;
  jobId: string;
  raisedBy: string;
  reason: string;
  status: DisputeStatus;
  resolution?: string;
  amount: number;
  createdAt: string;
  resolvedAt?: string;
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
export type NotificationType =
  | 'incoming_call'
  | 'job_update'
  | 'payment'
  | 'review'
  | 'system'
  | 'loyalty';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  actionPayload?: Record<string, string>;
}

// ─── AVAILABILITY ─────────────────────────────────────────────────────────────
export interface DaySchedule {
  enabled: boolean;
  from: string;
  to: string;
}

export interface AvailabilitySchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

// ─── ADMIN ────────────────────────────────────────────────────────────────────
export interface CommissionConfig {
  baseRate: number;
  loyaltyDiscounts: Record<ProviderLoyaltyTier, number>;
  repeatBookingCashback: number;
}

export interface FraudFlag {
  id: string;
  userId: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
  createdAt: string;
  isResolved: boolean;
}

// ─── HELP CENTER ──────────────────────────────────────────────────────────────
export interface HelpMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
