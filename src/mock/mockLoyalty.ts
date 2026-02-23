import type { LoyaltyConfig, Review } from '../types';
import type { CommissionConfig } from '../types';

export const LOYALTY_CONFIG: LoyaltyConfig = {
  clientTiers: [
    {
      tier: 'bronze',
      label: 'Bronze',
      minBookings: 0,
      cashbackRate: 3,
      benefits: ['3% cashback on every booking', 'Standard support'],
      color: '#CD7F32',
    },
    {
      tier: 'silver',
      label: 'Silver',
      minBookings: 10,
      cashbackRate: 5,
      benefits: ['5% cashback on every booking', 'Priority support', 'Early access to new providers'],
      color: '#C0C0C0',
    },
    {
      tier: 'gold',
      label: 'Gold',
      minBookings: 30,
      cashbackRate: 7,
      benefits: ['7% cashback on every booking', 'Dedicated support', 'Featured in provider search', 'Exclusive Gold events'],
      color: '#FFD700',
    },
  ],
  providerTiers: [
    {
      tier: 'rising_pro',
      label: 'Rising Pro',
      minRating: 0,
      minCompletions: 0,
      commissionDiscount: 0,
      benefits: ['Standard listing', 'Basic analytics', 'Community support'],
      color: '#5DADE2',
    },
    {
      tier: 'trusted_pro',
      label: 'Trusted Pro',
      minRating: 4.5,
      minCompletions: 50,
      commissionDiscount: 2,
      benefits: ['2% commission reduction', 'Boosted search ranking', 'Trust badge on profile', 'Priority dispute resolution'],
      color: '#1ABC9C',
    },
    {
      tier: 'elite_pro',
      label: 'Elite Pro',
      minRating: 4.8,
      minCompletions: 150,
      commissionDiscount: 4,
      benefits: ['4% commission reduction', 'Top search ranking', 'Elite badge', 'Dedicated account manager', 'Monthly bonus incentives'],
      color: '#F5E642',
    },
  ],
  cashbackRates: { first: 3, repeat: 5 },
};

export const DEFAULT_COMMISSION_CONFIG: CommissionConfig = {
  baseRate: 10,
  loyaltyDiscounts: {
    rising_pro: 0,
    trusted_pro: 2,
    elite_pro: 4,
  },
  repeatBookingCashback: 5,
};

export const MOCK_REVIEWS: Review[] = [
  {
    id: 'rev-001',
    jobId: 'job-001',
    reviewerId: 'client-001',
    revieweeId: 'provider-001',
    rating: 5,
    comment: 'John was incredibly professional and fast! Fixed my engine in under 2 hours. Highly recommend!',
    createdAt: '2026-02-18T14:00:00Z',
    isModerated: true,
  },
  {
    id: 'rev-002',
    jobId: 'job-001',
    reviewerId: 'provider-001',
    revieweeId: 'client-001',
    rating: 5,
    comment: 'Alex was very communicative and made the job easy. Great client!',
    createdAt: '2026-02-18T14:10:00Z',
    isModerated: true,
  },
  {
    id: 'rev-003',
    jobId: 'job-004',
    reviewerId: 'client-001',
    revieweeId: 'provider-001',
    rating: 5,
    comment: 'Quick oil change, done in under 45 minutes. Will book again!',
    createdAt: '2026-02-10T10:00:00Z',
    isModerated: true,
  },
  {
    id: 'rev-004',
    jobId: 'job-002',
    reviewerId: 'client-002',
    revieweeId: 'provider-002',
    rating: 5,
    comment: 'Maria is the best! My office has never been this clean. Absolutely spotless.',
    createdAt: '2026-01-20T12:00:00Z',
    isModerated: true,
  },
];
