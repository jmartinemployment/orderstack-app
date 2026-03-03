// ============================================================================
// NAVIGATION
// ============================================================================

export interface NavLink {
  label: string;
  route: string;
  external?: boolean;
}

export const NAV_LINKS: NavLink[] = [
  { label: 'Features', route: '/features' },
  { label: 'Pricing', route: '/pricing' },
  { label: 'Demo', route: '/demo' },
  { label: 'Blog', route: '/blog' },
];

export const NAV_CTA = {
  label: 'Start Free Trial',
  route: '/signup',
};

export const NAV_LOGIN = {
  label: 'Sign In',
  route: '/login',
};

// ============================================================================
// FOOTER
// ============================================================================

export interface FooterColumn {
  title: string;
  links: NavLink[];
}

export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: 'Product',
    links: [
      { label: 'Features', route: '/features' },
      { label: 'Pricing', route: '/pricing' },
      { label: 'Demo', route: '/demo' },
      { label: 'Integrations', route: '/integrations' },
    ],
  },
  {
    title: 'Solutions',
    links: [
      { label: 'Full-Service Restaurants', route: '/solutions/full-service' },
      { label: 'Quick-Service', route: '/solutions/quick-service' },
      { label: 'Bars & Nightlife', route: '/solutions/bar' },
      { label: 'Retail & Shops', route: '/solutions/retail' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Blog', route: '/blog' },
      { label: 'Help Center', route: '/help' },
      { label: 'API Docs', route: '/docs', external: true },
      { label: 'Status', route: '/status', external: true },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', route: '/about' },
      { label: 'Contact', route: '/contact' },
      { label: 'Careers', route: '/careers' },
      { label: 'Privacy', route: '/privacy' },
      { label: 'Terms', route: '/terms' },
    ],
  },
];

export const FOOTER_SOCIAL = [
  { label: 'LinkedIn', icon: 'bi-linkedin', url: 'https://linkedin.com/company/getorderstack' },
  { label: 'Twitter', icon: 'bi-twitter-x', url: 'https://x.com/getorderstack' },
  { label: 'Instagram', icon: 'bi-instagram', url: 'https://instagram.com/getorderstack' },
  { label: 'Facebook', icon: 'bi-facebook', url: 'https://facebook.com/getorderstack' },
];

export const FOOTER_COPY = {
  brand: 'OrderStack',
  tagline: 'The restaurant operating system that puts you in control.',
  copyright: `\u00A9 ${new Date().getFullYear()} OrderStack. All rights reserved.`,
};

// ============================================================================
// LANDING PAGE HERO
// ============================================================================

export const LANDING_HERO = {
  tag: 'Restaurant Operating System',
  title: 'Stop Losing Money to Third-Party Fees',
  subtitle:
    'OrderStack gives restaurants their own POS, online ordering, KDS, and delivery \u2014 ' +
    'with zero marketplace commissions. Keep 100% of your revenue.',
  primaryCta: { label: 'Start Free Trial', route: '/signup' },
  secondaryCta: { label: 'Watch Demo', route: '/demo' },
};

// ============================================================================
// PAGE TITLES (future prompts fill these in)
// ============================================================================

export const PAGE_TITLES: Record<string, string> = {
  landing: 'OrderStack \u2014 Restaurant Operating System',
  pricing: 'Pricing \u2014 OrderStack',
  demo: 'Interactive Demo \u2014 OrderStack',
  blog: 'Blog \u2014 OrderStack',
  features: 'Features \u2014 OrderStack',
};

// ============================================================================
// SOCIAL PROOF BAR
// ============================================================================

export interface TrustSignal {
  label: string;
  icon: string;
}

export const TRUST_SIGNALS: TrustSignal[] = [
  { label: 'No Long-Term Contracts', icon: 'bi-file-earmark-x' },
  { label: 'Free to Start', icon: 'bi-gift' },
  { label: 'Stripe & PayPal Ready', icon: 'bi-credit-card-2-front' },
  { label: 'BYOD \u2014 Use Your Own Devices', icon: 'bi-phone' },
  { label: 'Setup in Minutes', icon: 'bi-lightning' },
];

// ============================================================================
// PAIN POINTS
// ============================================================================

export interface PainPoint {
  id: string;
  icon: string;
  title: string;
  description: string;
  stat: string;
  statLabel: string;
}

export const PAIN_POINTS_HEADER = {
  tag: 'The Problem',
  title: 'Restaurants Are Losing Money Every Day',
  subtitle: 'Third-party platforms and disconnected tools are eating into your margins.',
};

export const PAIN_POINTS: PainPoint[] = [
  {
    id: 'fees',
    icon: 'bi-cash-stack',
    title: 'Marketplace Commissions',
    description:
      'DoorDash, Uber Eats, and Grubhub take 15\u201330% of every order. ' +
      'On a $50 delivery, you could lose $15 before food cost.',
    stat: '30%',
    statLabel: 'avg. commission per order',
  },
  {
    id: 'fragmented',
    icon: 'bi-puzzle',
    title: 'Fragmented Systems',
    description:
      'Separate POS, online ordering, KDS, scheduling, and inventory tools ' +
      'that don\'t talk to each other \u2014 creating double-entry and blind spots.',
    stat: '5+',
    statLabel: 'tools the avg. restaurant juggles',
  },
  {
    id: 'data',
    icon: 'bi-lock',
    title: 'You Don\'t Own Your Data',
    description:
      'Third-party platforms own your customer list, order history, and insights. ' +
      'When you leave, your data stays behind.',
    stat: '0%',
    statLabel: 'of customer data you keep on marketplaces',
  },
];

// ============================================================================
// FEATURE HIGHLIGHTS
// ============================================================================

export interface FeatureHighlight {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export const FEATURES_HEADER = {
  tag: 'All-in-One Platform',
  title: 'Everything You Need to Run Your Restaurant',
  subtitle: 'One system. One login. One bill.',
};

export const FEATURE_HIGHLIGHTS: FeatureHighlight[] = [
  {
    id: 'pos',
    icon: 'bi-tv',
    title: 'Point of Sale',
    description:
      'Full-service, quick-service, bar, and register modes. ' +
      'Floor plans, modifiers, split checks, and tipping built in.',
  },
  {
    id: 'online',
    icon: 'bi-globe',
    title: 'Online Ordering',
    description:
      'Your own branded ordering portal \u2014 no commissions. ' +
      'Pickup, delivery, and dine-in QR code ordering.',
  },
  {
    id: 'kds',
    icon: 'bi-display',
    title: 'Kitchen Display System',
    description:
      'Real-time order routing to kitchen stations. ' +
      'Priority queues, prep timers, and bump-bar support.',
  },
  {
    id: 'delivery',
    icon: 'bi-truck',
    title: 'Delivery Management',
    description:
      'Dispatch drivers via DoorDash Drive or Uber Direct \u2014 ' +
      'without the marketplace commission. You keep the margin.',
  },
  {
    id: 'analytics',
    icon: 'bi-bar-chart-line',
    title: 'Analytics & Reports',
    description:
      'Sales dashboards, menu engineering, food cost tracking, ' +
      'and close-of-day reports. Know your numbers in real time.',
  },
  {
    id: 'staff',
    icon: 'bi-people',
    title: 'Staff & Scheduling',
    description:
      'Team management, role-based POS access, time clock, ' +
      'tip pooling, and labor cost tracking.',
  },
];

// ============================================================================
// STATS STRIP
// ============================================================================

export interface StatItem {
  value: string;
  label: string;
}

export const STATS: StatItem[] = [
  { value: '0%', label: 'Marketplace Commissions' },
  { value: '1', label: 'Platform for Everything' },
  { value: '5 min', label: 'Setup Time' },
  { value: '100%', label: 'Your Customer Data' },
];

// ============================================================================
// HOW IT WORKS
// ============================================================================

export interface HowItWorksStep {
  step: number;
  icon: string;
  title: string;
  description: string;
}

export const HOW_IT_WORKS_HEADER = {
  tag: 'Get Started',
  title: 'Up and Running in Three Steps',
};

export const HOW_IT_WORKS_STEPS: HowItWorksStep[] = [
  {
    step: 1,
    icon: 'bi-person-plus',
    title: 'Create Your Account',
    description: 'Sign up free \u2014 no credit card required. Tell us about your business.',
  },
  {
    step: 2,
    icon: 'bi-sliders',
    title: 'Configure Your Setup',
    description:
      'Add your menu, connect payment processing, set up floor plans and stations. ' +
      'The setup wizard walks you through it.',
  },
  {
    step: 3,
    icon: 'bi-rocket-takeoff',
    title: 'Go Live',
    description:
      'Start taking orders on any device \u2014 tablet, phone, or laptop. ' +
      'BYOD means no proprietary hardware required.',
  },
];

// ============================================================================
// FINAL CTA
// ============================================================================

export const FINAL_CTA = {
  title: 'Ready to Take Control of Your Restaurant?',
  subtitle: 'Join restaurants saving thousands by cutting out the middleman.',
  primaryCta: { label: 'Start Free Trial', route: '/signup' },
  secondaryCta: { label: 'See Pricing', route: '/pricing' },
};

// ============================================================================
// PRICING PAGE
// ============================================================================

export type BillingInterval = 'monthly' | 'annual';

export interface PricingPlan {
  id: string;
  name: string;
  monthlyCents: number;
  annualMonthlyCents: number;
  annualTotalCents: number;
  description: string;
  features: string[];
  highlighted: boolean;
  cta: { label: string; route: string };
}

export const PRICING_HERO = {
  title: 'Simple, Transparent Pricing',
  subtitle: 'No hidden fees. No long-term contracts. Cancel anytime.',
};

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    monthlyCents: 0,
    annualMonthlyCents: 0,
    annualTotalCents: 0,
    description: 'Everything you need to start taking orders.',
    features: [
      'POS for 1 location',
      'Unlimited transactions',
      'Online ordering page',
      'KDS (Kitchen Display)',
      'Basic reporting',
      'Email support',
    ],
    highlighted: false,
    cta: { label: 'Get Started Free', route: '/signup' },
  },
  {
    id: 'plus',
    name: 'Plus',
    monthlyCents: 2900,
    annualMonthlyCents: 2417,
    annualTotalCents: 29000,
    description: 'For growing restaurants that need more power.',
    features: [
      'Everything in Free, plus:',
      'Multi-location management',
      'Advanced analytics & reports',
      'Staff scheduling & labor tools',
      'Loyalty program',
      'Marketing automations',
      'Inventory management',
      'Priority support',
    ],
    highlighted: true,
    cta: { label: 'Start Free Trial', route: '/signup' },
  },
  {
    id: 'premium',
    name: 'Premium',
    monthlyCents: 7900,
    annualMonthlyCents: 6583,
    annualTotalCents: 79000,
    description: 'Full platform for multi-unit and high-volume operations.',
    features: [
      'Everything in Plus, plus:',
      'Menu engineering & AI insights',
      'Course-based firing',
      'Food cost tracking',
      'Franchise compliance tools',
      'Custom reporting & exports',
      'Dedicated account manager',
    ],
    highlighted: false,
    cta: { label: 'Start Free Trial', route: '/signup' },
  },
];

// ============================================================================
// PROCESSING RATES
// ============================================================================

export interface ProcessingRate {
  type: string;
  description: string;
  rate: string;
}

export const PROCESSING_RATES_HEADER = {
  title: 'Processing Rates',
  subtitle: 'One transparent rate. No surprise fees. Same rate on every plan.',
};

export const PROCESSING_RATES: ProcessingRate[] = [
  {
    type: 'In-Person',
    description: 'Tap, dip, or swipe at the terminal',
    rate: '3.29% + 49\u00A2',
  },
  {
    type: 'Online',
    description: 'Orders placed through your online portal',
    rate: '3.79% + 49\u00A2',
  },
  {
    type: 'Keyed-In',
    description: 'Manually entered card numbers',
    rate: '3.80% + 49\u00A2',
  },
];

export const PROCESSING_RATES_NOTE = 'Same rate on every plan. No volume tiers. No hidden surcharges.';

// ============================================================================
// COMPETITOR COMPARISON
// ============================================================================

export interface CompetitorRow {
  feature: string;
  orderstack: string | boolean;
  toast: string | boolean;
  square: string | boolean;
}

export const COMPETITOR_HEADER = {
  tag: 'Compare',
  title: 'How OrderStack Stacks Up',
  subtitle: 'See how we compare to the industry incumbents.',
};

export const COMPETITOR_ROWS: CompetitorRow[] = [
  { feature: 'Monthly starting price', orderstack: 'Free', toast: '$0 (with lock-in)', square: 'Free' },
  { feature: 'In-person processing', orderstack: '3.29% + 49\u00A2', toast: '2.49% + 15\u00A2', square: '2.6% + 10\u00A2' },
  { feature: 'Online ordering commission', orderstack: '0%', toast: '0% (own channel)', square: '0% (own channel)' },
  { feature: 'Marketplace commissions', orderstack: '0% \u2014 use DaaS instead', toast: 'Up to 30%', square: 'N/A' },
  { feature: 'Hardware required', orderstack: 'No \u2014 BYOD', toast: 'Yes \u2014 proprietary', square: 'Yes \u2014 proprietary' },
  { feature: 'Long-term contract', orderstack: false, toast: true, square: false },
  { feature: 'KDS included', orderstack: true, toast: 'Add-on ($25/mo)', square: 'Add-on' },
  { feature: 'Multi-location', orderstack: true, toast: true, square: true },
  { feature: 'Delivery dispatch (DaaS)', orderstack: true, toast: true, square: false },
  { feature: 'Staff scheduling', orderstack: true, toast: 'Add-on', square: 'Add-on ($35/mo)' },
  { feature: 'Loyalty program', orderstack: true, toast: 'Add-on', square: 'Add-on ($45/mo)' },
  { feature: 'Inventory management', orderstack: true, toast: true, square: true },
  { feature: 'AI insights', orderstack: true, toast: false, square: false },
  { feature: 'Own your customer data', orderstack: true, toast: 'Limited', square: 'Limited' },
];

// ============================================================================
// PRICING FAQ
// ============================================================================

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export const PRICING_FAQ_HEADER = {
  title: 'Frequently Asked Questions',
};

export const PRICING_FAQS: FaqItem[] = [
  {
    id: 'free-catch',
    question: 'What\'s the catch with the Free plan?',
    answer:
      'No catch. You get a fully functional POS, online ordering, and KDS at no monthly cost. ' +
      'We make money on processing fees \u2014 the same model Square uses. ' +
      'Upgrade to Plus or Premium when you need multi-location support, advanced analytics, or marketing tools.',
  },
  {
    id: 'cancel',
    question: 'Can I cancel anytime?',
    answer:
      'Yes. There are no long-term contracts. Cancel your subscription anytime from Settings. ' +
      'You\'ll keep access through the end of your billing period.',
  },
  {
    id: 'hardware',
    question: 'Do I need to buy hardware?',
    answer:
      'No. OrderStack is BYOD (Bring Your Own Device). Use any tablet, phone, or laptop you already have. ' +
      'We support iPads, Android tablets, and desktop browsers. ' +
      'If you want dedicated hardware, we recommend compatible card readers that work with PayPal Zettle.',
  },
  {
    id: 'processing',
    question: 'Why are processing rates higher than Toast or Square?',
    answer:
      'Our processing rates include the full cost of payment handling with no hidden fees, no hardware lock-in, ' +
      'and no long-term contracts. Toast\'s lower rates come with mandatory proprietary hardware and multi-year agreements. ' +
      'When you factor in monthly add-on costs for KDS ($25), scheduling ($35), and loyalty ($45) that OrderStack includes free, ' +
      'most restaurants actually pay less with us.',
  },
  {
    id: 'switch',
    question: 'Can I switch plans later?',
    answer:
      'Yes. Upgrade or downgrade anytime. When you upgrade, you get immediate access to new features. ' +
      'When you downgrade, you keep your current plan through the end of the billing period.',
  },
  {
    id: 'trial',
    question: 'Is there a free trial for paid plans?',
    answer:
      'Yes. Plus and Premium both come with a 14-day free trial. ' +
      'No credit card required to start. You can explore all features before committing.',
  },
  {
    id: 'annual',
    question: 'How much do I save with annual billing?',
    answer:
      'Annual billing gives you 2 months free \u2014 you pay for 10 months instead of 12. ' +
      'That\'s $58 saved on Plus and $158 saved on Premium per year.',
  },
  {
    id: 'marketplace',
    question: 'How does OrderStack eliminate marketplace fees?',
    answer:
      'Instead of listing on DoorDash or Uber Eats (which charge 15\u201330% commissions), ' +
      'you take orders through your own branded online ordering portal \u2014 commission-free. ' +
      'When you need delivery drivers, we dispatch them via DoorDash Drive or Uber Direct (Delivery as a Service) ' +
      'at a flat per-delivery fee \u2014 typically $5\u20138 instead of 30% of the order.',
  },
];

// ============================================================================
// DEMO PAGE
// ============================================================================

export type DemoBusinessType = 'restaurant' | 'retail' | 'services';

export interface DemoBusinessOption {
  id: DemoBusinessType;
  label: string;
  icon: string;
}

export const DEMO_HERO = {
  title: 'See OrderStack in Action',
  subtitle: 'Explore the features built for your business \u2014 no signup required.',
};

export const DEMO_BUSINESS_TYPES: DemoBusinessOption[] = [
  { id: 'restaurant', label: 'Restaurant', icon: 'bi-cup-hot' },
  { id: 'retail', label: 'Retail', icon: 'bi-bag' },
  { id: 'services', label: 'Services', icon: 'bi-briefcase' },
];

export interface DemoWorkflowStep {
  icon: string;
  title: string;
  description: string;
}

export interface DemoFeature {
  id: string;
  title: string;
  icon: string;
  businessTypes: DemoBusinessType[];
  headline: string;
  description: string;
  steps: DemoWorkflowStep[];
  screenshotAlt: string;
}

export const DEMO_FEATURES: DemoFeature[] = [
  {
    id: 'pos',
    title: 'Point of Sale',
    icon: 'bi-tv',
    businessTypes: ['restaurant', 'retail'],
    headline: 'Fast, Flexible Checkout on Any Device',
    description:
      'Ring up orders on an iPad, Android tablet, or laptop. Full-service mode gives you ' +
      'floor plans, open checks, and coursing. Quick-service mode gives you speed \u2014 ' +
      'conversational modifiers, order numbers, and a customer-facing display.',
    steps: [
      { icon: 'bi-grid-3x3', title: 'Choose a Table or Counter', description: 'Tap a table from the floor plan or start a quick counter order.' },
      { icon: 'bi-book', title: 'Build the Order', description: 'Browse the menu, add items with modifiers, and apply discounts.' },
      { icon: 'bi-credit-card', title: 'Take Payment', description: 'Card tap/dip, cash, split checks, or open a tab.' },
      { icon: 'bi-printer', title: 'Print & Route', description: 'Receipt prints. Order fires to KDS stations automatically.' },
    ],
    screenshotAlt: 'OrderStack POS interface showing menu grid and active order',
  },
  {
    id: 'online-ordering',
    title: 'Online Ordering',
    icon: 'bi-globe',
    businessTypes: ['restaurant'],
    headline: 'Your Own Ordering Portal \u2014 Zero Commissions',
    description:
      'Customers order from your branded portal for pickup, delivery, or dine-in via QR code. ' +
      'No marketplace fees. Orders flow directly into your POS and KDS.',
    steps: [
      { icon: 'bi-qr-code', title: 'Customer Scans or Visits', description: 'QR code at the table, link on your website, or Google listing.' },
      { icon: 'bi-cart', title: 'Browse & Order', description: 'Full menu with photos, allergens, and nutrition. Apply loyalty rewards.' },
      { icon: 'bi-wallet2', title: 'Pay Online', description: 'Secure checkout with tip selection and order confirmation.' },
      { icon: 'bi-bell', title: 'Kitchen Gets the Order', description: 'Appears on KDS instantly. Customer gets real-time status updates.' },
    ],
    screenshotAlt: 'Online ordering portal showing menu categories and cart',
  },
  {
    id: 'kds',
    title: 'Kitchen Display',
    icon: 'bi-display',
    businessTypes: ['restaurant'],
    headline: 'Real-Time Order Flow to Every Station',
    description:
      'Replace paper tickets with a kitchen display system. Orders route to the right station \u2014 ' +
      'grill, fry, expo \u2014 with color-coded timers and bump-bar support.',
    steps: [
      { icon: 'bi-arrow-right-circle', title: 'Order Arrives', description: 'New orders appear instantly, sorted by priority and time.' },
      { icon: 'bi-palette', title: 'Color-Coded Timing', description: 'Green for on time, yellow for getting late, red for overdue.' },
      { icon: 'bi-hand-index', title: 'Bump When Done', description: 'Tap to mark items ready. Expo screen shows what\'s waiting for pickup.' },
      { icon: 'bi-graph-up', title: 'Track Speed', description: 'Avg. ticket times, station performance, and bottleneck detection.' },
    ],
    screenshotAlt: 'KDS display showing order cards with timer badges',
  },
  {
    id: 'delivery',
    title: 'Delivery',
    icon: 'bi-truck',
    businessTypes: ['restaurant'],
    headline: 'Dispatch Drivers Without the 30% Fee',
    description:
      'Use DoorDash Drive or Uber Direct to dispatch delivery drivers on demand \u2014 ' +
      'at a flat per-delivery fee (typically $5\u20138) instead of marketplace commissions.',
    steps: [
      { icon: 'bi-bag-check', title: 'Online Order Placed', description: 'Customer orders delivery through your portal.' },
      { icon: 'bi-send', title: 'Auto-Dispatch', description: 'OrderStack requests a driver via DoorDash Drive or Uber Direct.' },
      { icon: 'bi-geo-alt', title: 'Live Tracking', description: 'You and the customer track the driver in real time.' },
      { icon: 'bi-check-circle', title: 'Delivered', description: 'Flat fee deducted. You keep the rest of the order value.' },
    ],
    screenshotAlt: 'Delivery management screen with driver tracking map',
  },
  {
    id: 'analytics',
    title: 'Analytics',
    icon: 'bi-bar-chart-line',
    businessTypes: ['restaurant', 'retail', 'services'],
    headline: 'Know Your Numbers in Real Time',
    description:
      'Sales dashboards, menu engineering, food cost tracking, and close-of-day reports. ' +
      'See what\'s selling, what\'s not, and where your margins are.',
    steps: [
      { icon: 'bi-speedometer2', title: 'Live Dashboard', description: 'Today\'s sales, order count, and avg. ticket \u2014 updated in real time.' },
      { icon: 'bi-pie-chart', title: 'Menu Engineering', description: 'Stars, plowhorses, puzzles, and dogs \u2014 know which items to promote or cut.' },
      { icon: 'bi-file-earmark-text', title: 'Close-of-Day Report', description: 'One-tap report with sales breakdown, tips, voids, and discounts.' },
      { icon: 'bi-download', title: 'Export & Share', description: 'CSV and PDF exports for your accountant or partners.' },
    ],
    screenshotAlt: 'Analytics dashboard with sales chart and summary cards',
  },
  {
    id: 'staff',
    title: 'Staff & Scheduling',
    icon: 'bi-people',
    businessTypes: ['restaurant', 'retail', 'services'],
    headline: 'Manage Your Team from One Place',
    description:
      'Role-based POS access, time clock, shift scheduling, tip pooling, and labor cost tracking. ' +
      'Staff clock in from the POS \u2014 no third-party app needed.',
    steps: [
      { icon: 'bi-calendar-week', title: 'Build the Schedule', description: 'Drag-and-drop shifts with role requirements and labor budget.' },
      { icon: 'bi-clock-history', title: 'Clock In/Out', description: 'Staff punch in from the POS. Overtime alerts and break tracking.' },
      { icon: 'bi-cash-coin', title: 'Tips & Payroll', description: 'Automatic tip pooling, distribution reports, and payroll export.' },
      { icon: 'bi-shield-lock', title: 'Permissions', description: 'Manager PIN for voids, discounts, and cash drawer access.' },
    ],
    screenshotAlt: 'Staff scheduling calendar with shift blocks',
  },
  {
    id: 'online-store',
    title: 'Online Store',
    icon: 'bi-shop-window',
    businessTypes: ['retail'],
    headline: 'Sell Online and In-Store from One Catalog',
    description:
      'Your product catalog powers both your physical POS and your online store. ' +
      'Inventory syncs automatically \u2014 sell a unit in-store and it updates online instantly.',
    steps: [
      { icon: 'bi-box', title: 'Add Products', description: 'Photos, variants, SKUs, and pricing \u2014 all in one place.' },
      { icon: 'bi-globe', title: 'Publish Your Store', description: 'Branded storefront with categories, search, and filtering.' },
      { icon: 'bi-bag-check', title: 'Customer Orders', description: 'Pickup or shipping. Order appears in your dashboard immediately.' },
      { icon: 'bi-arrow-repeat', title: 'Inventory Syncs', description: 'Stock levels update across online and in-store in real time.' },
    ],
    screenshotAlt: 'Online storefront showing product grid and cart',
  },
  {
    id: 'inventory',
    title: 'Inventory',
    icon: 'bi-box-seam',
    businessTypes: ['retail'],
    headline: 'Track Every Unit Across Every Channel',
    description:
      'Barcode scanning, low-stock alerts, purchase orders, and supplier management. ' +
      'Know exactly what you have, where it is, and when to reorder.',
    steps: [
      { icon: 'bi-upc-scan', title: 'Scan Items In', description: 'Barcode scan to receive shipments and update stock counts.' },
      { icon: 'bi-bell', title: 'Low-Stock Alerts', description: 'Get notified when items hit reorder thresholds.' },
      { icon: 'bi-file-earmark-plus', title: 'Create PO', description: 'Generate purchase orders and send to suppliers.' },
      { icon: 'bi-clipboard-data', title: 'Audit Trail', description: 'Full history of every stock movement \u2014 receives, sales, adjustments.' },
    ],
    screenshotAlt: 'Inventory management screen with stock levels and alerts',
  },
  {
    id: 'bookings',
    title: 'Bookings',
    icon: 'bi-calendar-check',
    businessTypes: ['services'],
    headline: 'Fill Your Calendar Without the Phone Tag',
    description:
      'Online booking, waitlist management, automated reminders, and calendar sync. ' +
      'Clients book themselves \u2014 you focus on the work.',
    steps: [
      { icon: 'bi-calendar-plus', title: 'Client Books Online', description: 'Your booking page shows availability and lets clients self-schedule.' },
      { icon: 'bi-envelope', title: 'Confirmation Sent', description: 'Automatic email/SMS confirmation with calendar invite.' },
      { icon: 'bi-alarm', title: 'Reminder Before', description: 'Automated reminder reduces no-shows.' },
      { icon: 'bi-check2-all', title: 'Check In & Pay', description: 'Client arrives, you mark complete, and collect payment.' },
    ],
    screenshotAlt: 'Booking calendar with available time slots',
  },
  {
    id: 'invoicing',
    title: 'Invoicing',
    icon: 'bi-receipt-cutoff',
    businessTypes: ['services'],
    headline: 'Send Invoices, Get Paid Faster',
    description:
      'Create and send professional invoices. Clients pay online with one click. ' +
      'Track outstanding balances and send automated follow-ups.',
    steps: [
      { icon: 'bi-file-earmark-plus', title: 'Create Invoice', description: 'Line items, tax, discounts \u2014 ready in seconds.' },
      { icon: 'bi-send', title: 'Send to Client', description: 'Email with a secure payment link.' },
      { icon: 'bi-wallet2', title: 'Client Pays Online', description: 'One-click payment via the invoice link.' },
      { icon: 'bi-check-circle', title: 'Auto-Reconcile', description: 'Payment recorded, receipt sent, books updated.' },
    ],
    screenshotAlt: 'Invoice editor with line items and send button',
  },
  {
    id: 'crm',
    title: 'CRM',
    icon: 'bi-person-rolodex',
    businessTypes: ['services'],
    headline: 'Know Every Client by Name',
    description:
      'Client profiles with visit history, preferences, notes, and lifetime value. ' +
      'Build relationships that drive repeat business.',
    steps: [
      { icon: 'bi-person-plus', title: 'Client Created', description: 'Auto-created on first booking or purchase.' },
      { icon: 'bi-journal-text', title: 'Full History', description: 'Every visit, purchase, and note in one timeline.' },
      { icon: 'bi-tags', title: 'Segment & Tag', description: 'Group clients by service type, spend tier, or custom tags.' },
      { icon: 'bi-megaphone', title: 'Targeted Outreach', description: 'Email or SMS campaigns to specific segments.' },
    ],
    screenshotAlt: 'CRM client profile with visit timeline',
  },
];

export const DEMO_CTA = {
  title: 'Ready to Try It Yourself?',
  subtitle: 'Start free \u2014 no credit card required. Set up in under 5 minutes.',
  primaryCta: { label: 'Start Free Trial', route: '/signup' },
  secondaryCta: { label: 'Talk to Sales', route: '/contact' },
};

// ============================================================================
// BLOG
// ============================================================================

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  category: string;
  tags: string[];
  image: string;
  readTime: number;
  featured: boolean;
  body: string;
}

export interface BlogCategory {
  id: string;
  label: string;
  icon: string;
}

export const BLOG_CATEGORIES: BlogCategory[] = [
  { id: 'all', label: 'All Posts', icon: 'bi-grid' },
  { id: 'Restaurant Tech', label: 'Restaurant Tech', icon: 'bi-tv' },
  { id: 'Delivery', label: 'Delivery', icon: 'bi-truck' },
  { id: 'AI & Automation', label: 'AI & Automation', icon: 'bi-robot' },
  { id: 'Industry News', label: 'Industry News', icon: 'bi-newspaper' },
];

export const BLOG_HERO = {
  title: 'The OrderStack Blog',
  subtitle: 'Practical insights for restaurant owners who want to run smarter, leaner operations.',
};
