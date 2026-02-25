export type PlanTierKey = 'free' | 'plus' | 'premium';

export type PaymentProcessor = 'stripe' | 'paypal';

export interface ProcessorRates {
  inPerson: string;
  online: string;
  keyedIn: string;
}

export interface PlanTier {
  key: PlanTierKey;
  name: string;
  monthlyPriceCents: number;
  stripeRates: ProcessorRates;
  paypalRates: ProcessorRates;
  features: string[];
  highlighted?: boolean;
}

export const PLAN_TIERS: PlanTier[] = [
  {
    key: 'free',
    name: 'Free',
    monthlyPriceCents: 0,
    stripeRates: {
      inPerson: '2.6% + 10¢',
      online: '2.9% + 30¢',
      keyedIn: '3.5% + 15¢',
    },
    paypalRates: {
      inPerson: '2.99% + 49¢',
      online: '3.49% + 49¢',
      keyedIn: '3.5% + 49¢',
    },
    features: [
      'POS for 1 location',
      'Unlimited transactions',
      'Basic reporting',
      'Online ordering page',
      'Email support',
    ],
  },
  {
    key: 'plus',
    name: 'Plus',
    monthlyPriceCents: 4900,
    stripeRates: {
      inPerson: '2.5% + 10¢',
      online: '2.9% + 30¢',
      keyedIn: '3.5% + 15¢',
    },
    paypalRates: {
      inPerson: '2.69% + 49¢',
      online: '3.29% + 49¢',
      keyedIn: '3.5% + 49¢',
    },
    features: [
      'Everything in Free, plus:',
      'Multi-location management',
      'Advanced reporting & analytics',
      'Staff scheduling & labor tools',
      'Loyalty program',
      'Marketing automations',
      'Priority support',
    ],
    highlighted: true,
  },
  {
    key: 'premium',
    name: 'Premium',
    monthlyPriceCents: 14900,
    stripeRates: {
      inPerson: '2.4% + 10¢',
      online: '2.9% + 30¢',
      keyedIn: '3.5% + 15¢',
    },
    paypalRates: {
      inPerson: '2.29% + 49¢',
      online: '2.99% + 49¢',
      keyedIn: '3.5% + 49¢',
    },
    features: [
      'Everything in Plus, plus:',
      'Lower processing rates',
      'Menu engineering & AI insights',
      'Course-based firing',
      'Franchise compliance tools',
      'Custom reporting & exports',
      'Dedicated account manager',
    ],
  },
];

export type SubscriptionStatus = 'active' | 'trialing' | 'canceled' | 'expired' | 'past_due';

export type CancellationReason =
  | 'too_expensive'
  | 'missing_features'
  | 'too_complicated'
  | 'switching_competitor'
  | 'business_closing'
  | 'just_testing'
  | 'technical_issues'
  | 'no_time_setup'
  | 'other';

export interface CancellationFeedback {
  reason: CancellationReason;
  followUp?: string;
  competitorName?: string;
  missingFeatures?: string[];
  priceExpectation?: string;
  winBackOffered: boolean;
  winBackAccepted: boolean;
  additionalFeedback?: string;
}

export interface Subscription {
  id: string;
  restaurantId: string;
  planName: string;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialStart?: string;
  trialEnd?: string;
  canceledAt?: string;
  cancelAtPeriodEnd: boolean;
  amountCents: number;
  interval: 'month' | 'year';
}

export const CANCELLATION_REASONS: { key: CancellationReason; label: string }[] = [
  { key: 'too_expensive', label: 'Too expensive' },
  { key: 'missing_features', label: 'Missing features I need' },
  { key: 'too_complicated', label: 'Too complicated to use' },
  { key: 'switching_competitor', label: 'Switching to another product' },
  { key: 'business_closing', label: 'My business is closing / seasonal' },
  { key: 'just_testing', label: 'I was just trying it out' },
  { key: 'technical_issues', label: 'Technical issues / bugs' },
  { key: 'no_time_setup', label: 'Not enough time to set it up' },
  { key: 'other', label: 'Other' },
];

export const MISSING_FEATURE_OPTIONS: string[] = [
  'Online ordering',
  'Delivery integration',
  'Loyalty program',
  'Advanced reporting',
  'Multi-location',
  'Inventory management',
  'Staff scheduling',
  'Marketing tools',
];

export const COMPETITOR_OPTIONS: string[] = [
  'Square',
  'Toast',
  'Clover',
  'TouchBistro',
  'Lightspeed',
];

export const REASONS_WITHOUT_FOLLOWUP: CancellationReason[] = [
  'no_time_setup',
  'business_closing',
  'just_testing',
];
