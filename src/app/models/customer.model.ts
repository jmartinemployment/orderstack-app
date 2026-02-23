import { LoyaltyTier } from './loyalty.model';

export interface Customer {
  id: string;
  restaurantId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  totalOrders: number;
  totalSpent: number;
  avgOrderValue: number | null;
  lastOrderDate: string | null;
  loyaltyPoints: number;
  loyaltyTier: LoyaltyTier;
  totalPointsEarned: number;
  totalPointsRedeemed: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export type CustomerSegment = 'vip' | 'regular' | 'new' | 'at-risk' | 'dormant';

export interface CustomerSegmentInfo {
  segment: CustomerSegment;
  label: string;
  cssClass: string;
  description: string;
}

export interface SavedAddress {
  id: string;
  customerId: string;
  label: string;
  address: string;
  address2: string | null;
  city: string;
  state: string;
  zip: string;
  isDefault: boolean;
}

export interface SavedAddressFormData {
  label: string;
  address: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  isDefault?: boolean;
}

// --- Referral Program ---

export interface ReferralReward {
  type: 'points' | 'discount_percentage' | 'discount_flat' | 'free_item';
  value: number;
  freeItemId: string | null;
}

export interface ReferralConfig {
  enabled: boolean;
  referrerReward: ReferralReward;
  refereeReward: ReferralReward;
  maxReferrals: number | null;
}

export interface Referral {
  id: string;
  referrerCustomerId: string;
  refereeCustomerId: string;
  referralCode: string;
  rewardFulfilled: boolean;
  createdAt: string;
}

// --- Post-Visit Feedback ---

export type FeedbackCategory = 'food' | 'service' | 'ambiance' | 'speed' | 'value';

export interface FeedbackRequest {
  id: string;
  orderId: string;
  customerId: string;
  npsScore: number | null;
  rating: number | null;
  comment: string | null;
  categories: FeedbackCategory[];
  isPublic: boolean;
  respondedAt: string | null;
  responseMessage: string | null;
  createdAt: string;
}

export type CrmTab = 'customers' | 'segments' | 'insights';
export type CrmSortField = 'name' | 'totalSpent' | 'totalOrders' | 'lastOrderDate' | 'loyaltyPoints';
