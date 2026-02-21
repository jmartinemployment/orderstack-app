// ===================================================================
// GOS-SPEC-01: Platform Architecture & Mode System
// All types, interfaces, constants, and factory functions for the
// mode-aware platform that controls feature visibility by business
// vertical (account-level) and device POS mode (per-device).
// ===================================================================

// --- Business Verticals ---

export type BusinessVertical =
  | 'food_and_drink'
  | 'retail'
  | 'grocery'
  | 'beauty_wellness'
  | 'healthcare'
  | 'sports_fitness'
  | 'home_repair'
  | 'professional_services';

export interface BusinessVerticalConfig {
  vertical: BusinessVertical;
  label: string;
  description: string;
  icon: string;
  availableModes: DevicePosMode[];
  enabledModules: PlatformModule[];
}

export const BUSINESS_VERTICAL_CATALOG: BusinessVerticalConfig[] = [
  {
    vertical: 'food_and_drink',
    label: 'Food & Drink',
    description: 'Restaurants, cafes, food trucks, bars, breweries',
    icon: 'bi-cup-hot',
    availableModes: ['quick_service', 'full_service', 'bar', 'standard'],
    enabledModules: [
      'menu_management', 'table_management', 'kds', 'reservations',
      'online_ordering', 'inventory', 'marketing', 'loyalty',
      'delivery', 'gift_cards', 'staff_scheduling', 'payroll',
      'reports', 'crm', 'multi_location',
    ],
  },
  {
    vertical: 'retail',
    label: 'Retail Goods',
    description: 'Boutiques, shops, merchandise, e-commerce',
    icon: 'bi-bag',
    availableModes: ['retail', 'standard'],
    enabledModules: [
      'inventory', 'online_ordering', 'marketing', 'loyalty',
      'gift_cards', 'staff_scheduling', 'payroll', 'reports',
      'crm', 'multi_location',
    ],
  },
  {
    vertical: 'grocery',
    label: 'Grocery & Gourmet',
    description: 'Grocery stores, specialty food, wine shops',
    icon: 'bi-cart',
    availableModes: ['retail', 'standard'],
    enabledModules: [
      'inventory', 'online_ordering', 'marketing', 'loyalty',
      'gift_cards', 'staff_scheduling', 'payroll', 'reports',
      'crm', 'multi_location',
    ],
  },
  {
    vertical: 'beauty_wellness',
    label: 'Beauty & Wellness',
    description: 'Salons, spas, wellness centers',
    icon: 'bi-scissors',
    availableModes: ['bookings', 'retail', 'standard'],
    enabledModules: [
      'appointments', 'inventory', 'marketing', 'loyalty',
      'gift_cards', 'staff_scheduling', 'payroll', 'reports',
      'crm', 'multi_location',
    ],
  },
  {
    vertical: 'healthcare',
    label: 'Healthcare Services',
    description: 'Clinics, dental offices, therapy practices',
    icon: 'bi-heart-pulse',
    availableModes: ['bookings', 'services', 'standard'],
    enabledModules: [
      'appointments', 'invoicing', 'marketing', 'staff_scheduling',
      'payroll', 'reports', 'crm',
    ],
  },
  {
    vertical: 'sports_fitness',
    label: 'Sports & Fitness',
    description: 'Gyms, studios, sports facilities',
    icon: 'bi-lightning',
    availableModes: ['bookings', 'retail', 'standard'],
    enabledModules: [
      'appointments', 'inventory', 'marketing', 'loyalty',
      'gift_cards', 'staff_scheduling', 'payroll', 'reports',
      'crm', 'multi_location',
    ],
  },
  {
    vertical: 'home_repair',
    label: 'Home & Repair Services',
    description: 'Plumbers, electricians, contractors',
    icon: 'bi-tools',
    availableModes: ['services', 'standard'],
    enabledModules: [
      'invoicing', 'marketing', 'staff_scheduling', 'payroll',
      'reports', 'crm',
    ],
  },
  {
    vertical: 'professional_services',
    label: 'Professional Services',
    description: 'Consultants, accountants, agencies',
    icon: 'bi-briefcase',
    availableModes: ['services', 'standard'],
    enabledModules: [
      'invoicing', 'marketing', 'staff_scheduling', 'payroll',
      'reports', 'crm',
    ],
  },
];

// --- Platform Modules ---

export type PlatformModule =
  | 'menu_management'
  | 'table_management'
  | 'kds'
  | 'reservations'
  | 'online_ordering'
  | 'inventory'
  | 'invoicing'
  | 'appointments'
  | 'marketing'
  | 'loyalty'
  | 'delivery'
  | 'gift_cards'
  | 'staff_scheduling'
  | 'payroll'
  | 'reports'
  | 'crm'
  | 'multi_location';

// --- Device POS Modes ---

export type DevicePosMode =
  | 'quick_service'
  | 'full_service'
  | 'bar'
  | 'retail'
  | 'bookings'
  | 'services'
  | 'standard';

export interface DevicePosModeConfig {
  mode: DevicePosMode;
  label: string;
  description: string;
  icon: string;
  category: 'restaurant' | 'retail' | 'services' | 'general';
  featureFlags: ModeFeatureFlags;
}

// --- Mode Feature Flags ---

export interface ModeFeatureFlags {
  // Order Workflow
  enableOpenChecks: boolean;
  enableCoursing: boolean;
  enableSeatAssignment: boolean;
  enableCheckSplitting: boolean;
  enableCheckTransfer: boolean;
  enablePreAuthTabs: boolean;
  enableConversationalModifiers: boolean;
  enableMultiChannelMenus: boolean;

  // Floor & Table
  enableFloorPlan: boolean;
  enableTableManagement: boolean;
  enableWaitlist: boolean;

  // Kitchen
  enableKds: boolean;
  enableExpoStation: boolean;

  // Inventory
  enableBarcodeScanning: boolean;
  enableReturnsExchanges: boolean;

  // Scheduling & Booking
  enableAppointmentBooking: boolean;
  enableProjectTracking: boolean;

  // Payments
  enableTipping: boolean;
  enableSurcharging: boolean;

  // Display
  enableDarkModeDisplay: boolean;
  showItemImages: boolean;
  showCategoryNavigation: boolean;
  enableOrderNumberTracking: boolean;
}

// --- Mode Presets ---

export const RESTAURANT_MODE_QUICK_SERVICE: ModeFeatureFlags = {
  enableOpenChecks: false,
  enableCoursing: false,
  enableSeatAssignment: false,
  enableCheckSplitting: false,
  enableCheckTransfer: false,
  enablePreAuthTabs: false,
  enableConversationalModifiers: true,
  enableMultiChannelMenus: true,
  enableFloorPlan: false,
  enableTableManagement: false,
  enableWaitlist: false,
  enableKds: true,
  enableExpoStation: false,
  enableBarcodeScanning: false,
  enableReturnsExchanges: false,
  enableAppointmentBooking: false,
  enableProjectTracking: false,
  enableTipping: true,
  enableSurcharging: true,
  enableDarkModeDisplay: false,
  showItemImages: true,
  showCategoryNavigation: true,
  enableOrderNumberTracking: true,
};

export const RESTAURANT_MODE_FULL_SERVICE: ModeFeatureFlags = {
  enableOpenChecks: true,
  enableCoursing: true,
  enableSeatAssignment: true,
  enableCheckSplitting: true,
  enableCheckTransfer: true,
  enablePreAuthTabs: true,
  enableConversationalModifiers: false,
  enableMultiChannelMenus: false,
  enableFloorPlan: true,
  enableTableManagement: true,
  enableWaitlist: true,
  enableKds: true,
  enableExpoStation: true,
  enableBarcodeScanning: false,
  enableReturnsExchanges: false,
  enableAppointmentBooking: false,
  enableProjectTracking: false,
  enableTipping: true,
  enableSurcharging: true,
  enableDarkModeDisplay: false,
  showItemImages: true,
  showCategoryNavigation: true,
  enableOrderNumberTracking: false,
};

export const RESTAURANT_MODE_BAR: ModeFeatureFlags = {
  enableOpenChecks: true,
  enableCoursing: false,
  enableSeatAssignment: true,
  enableCheckSplitting: true,
  enableCheckTransfer: false,
  enablePreAuthTabs: true,
  enableConversationalModifiers: true,
  enableMultiChannelMenus: false,
  enableFloorPlan: false,
  enableTableManagement: false,
  enableWaitlist: false,
  enableKds: true,
  enableExpoStation: false,
  enableBarcodeScanning: false,
  enableReturnsExchanges: false,
  enableAppointmentBooking: false,
  enableProjectTracking: false,
  enableTipping: true,
  enableSurcharging: true,
  enableDarkModeDisplay: true,
  showItemImages: false,
  showCategoryNavigation: true,
  enableOrderNumberTracking: false,
};

export const RETAIL_MODE: ModeFeatureFlags = {
  enableOpenChecks: false,
  enableCoursing: false,
  enableSeatAssignment: false,
  enableCheckSplitting: false,
  enableCheckTransfer: false,
  enablePreAuthTabs: false,
  enableConversationalModifiers: false,
  enableMultiChannelMenus: true,
  enableFloorPlan: false,
  enableTableManagement: false,
  enableWaitlist: false,
  enableKds: false,
  enableExpoStation: false,
  enableBarcodeScanning: true,
  enableReturnsExchanges: true,
  enableAppointmentBooking: false,
  enableProjectTracking: false,
  enableTipping: false,
  enableSurcharging: true,
  enableDarkModeDisplay: false,
  showItemImages: true,
  showCategoryNavigation: true,
  enableOrderNumberTracking: false,
};

export const BOOKINGS_MODE: ModeFeatureFlags = {
  enableOpenChecks: false,
  enableCoursing: false,
  enableSeatAssignment: false,
  enableCheckSplitting: false,
  enableCheckTransfer: false,
  enablePreAuthTabs: false,
  enableConversationalModifiers: false,
  enableMultiChannelMenus: false,
  enableFloorPlan: false,
  enableTableManagement: false,
  enableWaitlist: true,
  enableKds: false,
  enableExpoStation: false,
  enableBarcodeScanning: false,
  enableReturnsExchanges: false,
  enableAppointmentBooking: true,
  enableProjectTracking: false,
  enableTipping: true,
  enableSurcharging: true,
  enableDarkModeDisplay: false,
  showItemImages: false,
  showCategoryNavigation: false,
  enableOrderNumberTracking: false,
};

export const SERVICES_MODE: ModeFeatureFlags = {
  enableOpenChecks: false,
  enableCoursing: false,
  enableSeatAssignment: false,
  enableCheckSplitting: false,
  enableCheckTransfer: false,
  enablePreAuthTabs: false,
  enableConversationalModifiers: false,
  enableMultiChannelMenus: false,
  enableFloorPlan: false,
  enableTableManagement: false,
  enableWaitlist: false,
  enableKds: false,
  enableExpoStation: false,
  enableBarcodeScanning: false,
  enableReturnsExchanges: false,
  enableAppointmentBooking: true,
  enableProjectTracking: true,
  enableTipping: false,
  enableSurcharging: true,
  enableDarkModeDisplay: false,
  showItemImages: false,
  showCategoryNavigation: false,
  enableOrderNumberTracking: false,
};

export const STANDARD_MODE: ModeFeatureFlags = {
  enableOpenChecks: false,
  enableCoursing: false,
  enableSeatAssignment: false,
  enableCheckSplitting: false,
  enableCheckTransfer: false,
  enablePreAuthTabs: false,
  enableConversationalModifiers: false,
  enableMultiChannelMenus: false,
  enableFloorPlan: false,
  enableTableManagement: false,
  enableWaitlist: false,
  enableKds: false,
  enableExpoStation: false,
  enableBarcodeScanning: false,
  enableReturnsExchanges: false,
  enableAppointmentBooking: false,
  enableProjectTracking: false,
  enableTipping: true,
  enableSurcharging: true,
  enableDarkModeDisplay: false,
  showItemImages: false,
  showCategoryNavigation: true,
  enableOrderNumberTracking: false,
};

// --- Mode Preset Lookup ---

const MODE_PRESET_MAP: Record<DevicePosMode, ModeFeatureFlags> = {
  quick_service: RESTAURANT_MODE_QUICK_SERVICE,
  full_service: RESTAURANT_MODE_FULL_SERVICE,
  bar: RESTAURANT_MODE_BAR,
  retail: RETAIL_MODE,
  bookings: BOOKINGS_MODE,
  services: SERVICES_MODE,
  standard: STANDARD_MODE,
};

export const DEVICE_POS_MODE_CATALOG: DevicePosModeConfig[] = [
  {
    mode: 'quick_service',
    label: 'Quick Service',
    description: 'Speed up ordering with conversational modifiers and multi-channel menus.',
    icon: 'bi-lightning',
    category: 'restaurant',
    featureFlags: RESTAURANT_MODE_QUICK_SERVICE,
  },
  {
    mode: 'full_service',
    label: 'Full Service',
    description: 'Offer service with open checks, coursing, and customized restaurant floor plans.',
    icon: 'bi-layout-text-sidebar',
    category: 'restaurant',
    featureFlags: RESTAURANT_MODE_FULL_SERVICE,
  },
  {
    mode: 'bar',
    label: 'Bar',
    description: 'Place orders using conversational modifiers and allow card pre-authorization.',
    icon: 'bi-cup-straw',
    category: 'restaurant',
    featureFlags: RESTAURANT_MODE_BAR,
  },
  {
    mode: 'retail',
    label: 'Retail',
    description: 'Manage inventory, orders, and customers across in-person and online sales.',
    icon: 'bi-shop',
    category: 'retail',
    featureFlags: RETAIL_MODE,
  },
  {
    mode: 'bookings',
    label: 'Bookings',
    description: 'Manage your calendar and use waitlists to fill gaps in your schedule.',
    icon: 'bi-calendar-check',
    category: 'services',
    featureFlags: BOOKINGS_MODE,
  },
  {
    mode: 'services',
    label: 'Services',
    description: 'Manage projects, send invoices, and take payments anytime, anywhere.',
    icon: 'bi-clipboard-check',
    category: 'services',
    featureFlags: SERVICES_MODE,
  },
  {
    mode: 'standard',
    label: 'Standard',
    description: 'Accept simple payments without anything extra. Trusted by more than 2 million businesses globally.',
    icon: 'bi-credit-card',
    category: 'general',
    featureFlags: STANDARD_MODE,
  },
];

// --- Platform Complexity ---

export type PlatformComplexity =
  | 'full'
  | 'catalog'
  | 'payments_only';

// --- Merchant Profile ---

export interface MerchantProfile {
  id: string;
  businessName: string;
  address: BusinessAddress;
  verticals: BusinessVertical[];
  primaryVertical: BusinessVertical;
  complexity: PlatformComplexity;
  enabledModules: PlatformModule[];
  defaultDeviceMode: DevicePosMode;
  taxLocale: TaxLocaleConfig;
  businessHours: BusinessHoursDay[];
  onboardingComplete: boolean;
  createdAt: string;
}

export interface BusinessAddress {
  street: string;
  street2: string | null;
  city: string;
  state: string;
  zip: string;
  country: string;
  timezone: string;
  phone: string | null;
  lat: number | null;
  lng: number | null;
}

export interface TaxLocaleConfig {
  taxRate: number;
  taxInclusive: boolean;
  currency: string;
  defaultLanguage: 'en' | 'es';
}

export interface BusinessHoursDay {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  open: string;
  close: string;
  closed: boolean;
}

// --- Device Mode Assignment ---

export interface DeviceModeAssignment {
  deviceId: string;
  mode: DevicePosMode;
  featureFlagOverrides: Partial<ModeFeatureFlags>;
  assignedAt: string;
  assignedBy: string;
}

// --- Onboarding ---

export interface OnboardingPinData {
  displayName: string;
  pin: string;
  role: 'owner' | 'manager' | 'staff';
}

// --- Menu Templates ---

export interface MenuTemplate {
  id: string;
  vertical: BusinessVertical;
  name: string;
  description: string;
  categories: MenuTemplateCategory[];
  itemCount: number;
}

export interface MenuTemplateCategory {
  name: string;
  sortOrder: number;
  items: MenuTemplateItem[];
}

export interface MenuTemplateItem {
  name: string;
  description: string | null;
  price: number;
  sortOrder: number;
  prepTimeMinutes: number | null;
  sku: string | null;
  durationMinutes: number | null;
}

// --- Navigation ---

export interface NavigationItem {
  label: string;
  icon: string;
  route: string;
  requiredModule?: PlatformModule;
  requiredFeatureFlag?: keyof ModeFeatureFlags;
  verticals?: BusinessVertical[];
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  { label: 'Dashboard', icon: 'bi-grid', route: '/dashboard' },
  { label: 'Orders', icon: 'bi-receipt', route: '/orders' },
  { label: 'Customers', icon: 'bi-people', route: '/customers', requiredModule: 'crm' },
  { label: 'Reports', icon: 'bi-bar-chart', route: '/reports', requiredModule: 'reports' },
  { label: 'Team', icon: 'bi-person-badge', route: '/team', requiredModule: 'staff_scheduling' },
  { label: 'Settings', icon: 'bi-gear', route: '/settings' },
  { label: 'Menu', icon: 'bi-book', route: '/menu', requiredModule: 'menu_management', verticals: ['food_and_drink'] },
  { label: 'Floor Plan', icon: 'bi-grid-3x3', route: '/floor-plan', requiredFeatureFlag: 'enableFloorPlan' },
  { label: 'KDS', icon: 'bi-display', route: '/kds', requiredFeatureFlag: 'enableKds' },
  { label: 'Reservations', icon: 'bi-calendar-event', route: '/reservations', requiredModule: 'reservations' },
  { label: 'Catalog', icon: 'bi-box', route: '/catalog', verticals: ['retail', 'grocery'] },
  { label: 'Appointments', icon: 'bi-calendar-check', route: '/appointments', requiredFeatureFlag: 'enableAppointmentBooking' },
  { label: 'Invoices', icon: 'bi-receipt-cutoff', route: '/invoices', requiredModule: 'invoicing' },
];

// --- Helper Functions ---

export function getModePreset(mode: DevicePosMode): ModeFeatureFlags {
  return MODE_PRESET_MAP[mode];
}

export function getModesForVerticals(verticals: BusinessVertical[]): DevicePosMode[] {
  const modeSet = new Set<DevicePosMode>();
  for (const vertical of verticals) {
    const config = BUSINESS_VERTICAL_CATALOG.find(c => c.vertical === vertical);
    if (config) {
      for (const mode of config.availableModes) {
        modeSet.add(mode);
      }
    }
  }
  return [...modeSet];
}

export function getModulesForVerticals(verticals: BusinessVertical[]): PlatformModule[] {
  const moduleSet = new Set<PlatformModule>();
  for (const vertical of verticals) {
    const config = BUSINESS_VERTICAL_CATALOG.find(c => c.vertical === vertical);
    if (config) {
      for (const mod of config.enabledModules) {
        moduleSet.add(mod);
      }
    }
  }
  return [...moduleSet];
}

export function defaultBusinessAddress(): BusinessAddress {
  return {
    street: '',
    street2: null,
    city: '',
    state: '',
    zip: '',
    country: 'US',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    phone: null,
    lat: null,
    lng: null,
  };
}

export function defaultTaxLocaleConfig(): TaxLocaleConfig {
  return {
    taxRate: 0,
    taxInclusive: false,
    currency: 'USD',
    defaultLanguage: 'en',
  };
}

export function defaultBusinessHours(): BusinessHoursDay[] {
  const days: BusinessHoursDay['day'][] = [
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  ];
  return days.map(day => ({
    day,
    open: '09:00',
    close: '17:00',
    closed: false,
  }));
}

export function defaultMerchantProfile(): MerchantProfile {
  return {
    id: '',
    businessName: '',
    address: defaultBusinessAddress(),
    verticals: ['food_and_drink'],
    primaryVertical: 'food_and_drink',
    complexity: 'full',
    enabledModules: getModulesForVerticals(['food_and_drink']),
    defaultDeviceMode: 'full_service',
    taxLocale: defaultTaxLocaleConfig(),
    businessHours: defaultBusinessHours(),
    onboardingComplete: true,
    createdAt: new Date().toISOString(),
  };
}
