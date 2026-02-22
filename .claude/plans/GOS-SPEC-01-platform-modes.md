# GOS-SPEC-01: Platform Architecture & Mode System

## Context

Square operates as a **multi-vertical commerce platform**, not a single-purpose POS. At the account level, merchants declare what they sell (food, retail, services, etc.). At the device level, each POS terminal runs in a specific **mode** that tailors the UI, workflow, and available features. A single location can have multiple devices running different modes simultaneously — a Full Service iPad in the dining room, a Bar terminal at the bar, and a Quick Service kiosk at the counter.

OrderStack is currently hardcoded as a full-service restaurant system. Every component assumes restaurant concepts (tables, courses, KDS, modifiers, floor plans). To scale beyond restaurants and to properly handle the variation *within* restaurants (QSR vs FSR vs Bar), OrderStack needs a **mode-aware architecture** where:

1. **Core platform concepts** (items, orders, payments, customers, staff, inventory) are vertical-agnostic
2. **Business verticals** (restaurant, retail, services, bookings) extend the core with domain-specific models and UI
3. **Device POS modes** (quick_service, full_service, bar, retail, bookings, services, standard) control per-device feature visibility, layout, and workflow
4. **Restaurant is the first vertical** — all existing OrderStack features live under the restaurant vertical

**Square's mode architecture (from documentation + product analysis):**

- **Modes are per-device**, not per-restaurant — assigned during device pairing or from the dashboard
- **7 built-in modes**: Quick Service, Full Service, Bar, Retail, Bookings, Services, Standard
- **Mode settings categories**: Checkout, Security, Add-ons, Display
- **Modes are combinable across devices** — a bike shop might use Retail on the counter iPad and Bookings on the service desk iPad
- **Cannot combine modes on a single device** — one mode active per device at a time, but switchable
- **Restaurant modes (3)**: Quick Service (counter/kiosk, speed-focused, no open checks), Full Service (tables, coursing, floor plans, open checks, seat management), Bar (tabs with pre-auth, conversational modifiers, dark display)
- **Onboarding flow**: Business name → What do you sell? (multi-select verticals) → Primary focus → Complexity level (full/catalog/payments-only) → Select device mode

---

## Two-Level Mode Hierarchy

### Level 1: Business Vertical (Account-Level)

Set during merchant onboarding. Determines which add-on modules, settings tabs, and reporting categories are available across the entire account. A merchant can select **multiple verticals** (e.g., a brewery that sells food + retail merchandise).

### Level 2: Device POS Mode (Per-Device)

Set per device during pairing or from the dashboard. Determines the UI layout, workflow, and feature visibility on that specific terminal. Each device runs exactly one mode at a time but can switch modes.

### How They Interact

The business vertical(s) determine which modes are **available** for devices at that location. A pure retail account won't see Full Service mode as an option. A food & drink account gets Quick Service, Full Service, and Bar modes. A multi-vertical account (food + retail) gets all restaurant modes plus Retail mode.

---

## Phase 1 — Core Platform Types (Steps 1-4)

### Step 1: Create `models/platform.model.ts`

New foundational model file defining the mode hierarchy, feature flags, and presets:

```ts
// =============================================
// Level 1: Business Verticals (Account-Level)
// =============================================

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
  icon: string;                           // Bootstrap Icon class
  availableModes: DevicePosMode[];        // Which device modes this vertical unlocks
  enabledModules: PlatformModule[];       // Which platform modules this vertical enables
}

/** Platform modules that verticals can enable */
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

// =============================================
// Level 2: Device POS Modes (Per-Device)
// =============================================

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

// =============================================
// Feature Flags (Per-Mode Capabilities)
// =============================================

export interface ModeFeatureFlags {
  // --- Order Workflow ---
  /** Open checks that persist until closed (FSR, Bar) */
  enableOpenChecks: boolean;
  /** Course management with fire control (FSR only) */
  enableCoursing: boolean;
  /** Assign items to seats within a check (FSR, Bar) */
  enableSeatAssignment: boolean;
  /** Split checks by item, seat, or equal portions (FSR, Bar) */
  enableCheckSplitting: boolean;
  /** Transfer checks between tables/servers (FSR) */
  enableCheckTransfer: boolean;
  /** Pre-authorized card holds for tabs (Bar) */
  enablePreAuthTabs: boolean;
  /** Conversational modifier flow — one-tap modifiers (QSR, Bar) */
  enableConversationalModifiers: boolean;
  /** Multi-channel menu display — kiosk, online, QR (QSR) */
  enableMultiChannelMenus: boolean;

  // --- Floor & Table ---
  /** Visual floor plan with drag-drop tables (FSR) */
  enableFloorPlan: boolean;
  /** Table management — assign orders to tables (FSR) */
  enableTableManagement: boolean;
  /** Waitlist for walk-ins (FSR, Bookings) */
  enableWaitlist: boolean;

  // --- Kitchen ---
  /** Kitchen Display System routing (QSR, FSR, Bar) */
  enableKds: boolean;
  /** Expo station for order assembly verification (FSR) */
  enableExpoStation: boolean;

  // --- Inventory ---
  /** Barcode scanning for item lookup (Retail, Grocery) */
  enableBarcodeScanning: boolean;
  /** Returns and exchanges workflow (Retail) */
  enableReturnsExchanges: boolean;

  // --- Scheduling & Booking ---
  /** Appointment calendar and booking (Bookings) */
  enableAppointmentBooking: boolean;
  /** Project and invoice tracking (Services) */
  enableProjectTracking: boolean;

  // --- Payments ---
  /** Tip prompt on checkout (all restaurant modes) */
  enableTipping: boolean;
  /** Credit card surcharge pass-through */
  enableSurcharging: boolean;

  // --- Display ---
  /** Dark/low-light optimized display (Bar) */
  enableDarkModeDisplay: boolean;
  /** Item images in grid (FSR, QSR, Retail) */
  showItemImages: boolean;
  /** Category tabs/sidebar navigation */
  showCategoryNavigation: boolean;
  /** Order number / name tracking for pickup (QSR) */
  enableOrderNumberTracking: boolean;
}

// =============================================
// Complexity Levels (Onboarding)
// =============================================

/** How much of the platform the merchant wants to use initially */
export type PlatformComplexity =
  | 'full'             // Payments + catalog + inventory
  | 'catalog'          // Payments + catalog (no inventory tracking)
  | 'payments_only';   // Just take payments

// =============================================
// Merchant Profile (Account-Level)
// =============================================

export interface MerchantProfile {
  id: string;
  businessName: string;
  verticals: BusinessVertical[];
  primaryVertical: BusinessVertical;
  complexity: PlatformComplexity;
  enabledModules: PlatformModule[];      // Computed from verticals + complexity
  createdAt: string;
}

// =============================================
// Mode Assignment (Per-Device)
// =============================================

export interface DeviceModeAssignment {
  deviceId: string;
  mode: DevicePosMode;
  /** Overrides to the mode's default feature flags (restaurant-level customization) */
  featureFlagOverrides: Partial<ModeFeatureFlags>;
  assignedAt: string;
  assignedBy: string;
}
```

### Step 2: Define Mode Presets

```ts
// --- Business Vertical Catalog ---

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

// --- Device POS Mode Presets ---

export const RESTAURANT_MODE_QUICK_SERVICE: ModeFeatureFlags = {
  // Order Workflow
  enableOpenChecks: false,
  enableCoursing: false,
  enableSeatAssignment: false,
  enableCheckSplitting: false,
  enableCheckTransfer: false,
  enablePreAuthTabs: false,
  enableConversationalModifiers: true,
  enableMultiChannelMenus: true,
  // Floor & Table
  enableFloorPlan: false,
  enableTableManagement: false,
  enableWaitlist: false,
  // Kitchen
  enableKds: true,
  enableExpoStation: false,
  // Inventory
  enableBarcodeScanning: false,
  enableReturnsExchanges: false,
  // Scheduling & Booking
  enableAppointmentBooking: false,
  enableProjectTracking: false,
  // Payments
  enableTipping: true,
  enableSurcharging: true,
  // Display
  enableDarkModeDisplay: false,
  showItemImages: true,
  showCategoryNavigation: true,
  enableOrderNumberTracking: true,
};

export const RESTAURANT_MODE_FULL_SERVICE: ModeFeatureFlags = {
  // Order Workflow
  enableOpenChecks: true,
  enableCoursing: true,
  enableSeatAssignment: true,
  enableCheckSplitting: true,
  enableCheckTransfer: true,
  enablePreAuthTabs: true,
  enableConversationalModifiers: false,
  enableMultiChannelMenus: false,
  // Floor & Table
  enableFloorPlan: true,
  enableTableManagement: true,
  enableWaitlist: true,
  // Kitchen
  enableKds: true,
  enableExpoStation: true,
  // Inventory
  enableBarcodeScanning: false,
  enableReturnsExchanges: false,
  // Scheduling & Booking
  enableAppointmentBooking: false,
  enableProjectTracking: false,
  // Payments
  enableTipping: true,
  enableSurcharging: true,
  // Display
  enableDarkModeDisplay: false,
  showItemImages: true,
  showCategoryNavigation: true,
  enableOrderNumberTracking: false,
};

export const RESTAURANT_MODE_BAR: ModeFeatureFlags = {
  // Order Workflow
  enableOpenChecks: true,
  enableCoursing: false,
  enableSeatAssignment: true,
  enableCheckSplitting: true,
  enableCheckTransfer: false,
  enablePreAuthTabs: true,
  enableConversationalModifiers: true,
  enableMultiChannelMenus: false,
  // Floor & Table
  enableFloorPlan: false,
  enableTableManagement: false,
  enableWaitlist: false,
  // Kitchen
  enableKds: true,
  enableExpoStation: false,
  // Inventory
  enableBarcodeScanning: false,
  enableReturnsExchanges: false,
  // Scheduling & Booking
  enableAppointmentBooking: false,
  enableProjectTracking: false,
  // Payments
  enableTipping: true,
  enableSurcharging: true,
  // Display
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
```

### Step 3: Create `services/platform.ts` — PlatformService

Central service that manages the merchant profile, resolves feature flags for the current device, and provides mode-aware computed signals:

```ts
@Injectable({ providedIn: 'root' })
export class PlatformService {
  // --- State ---
  private readonly _merchantProfile = signal<MerchantProfile | null>(null);
  private readonly _currentDeviceMode = signal<DevicePosMode>('full_service');
  private readonly _featureFlagOverrides = signal<Partial<ModeFeatureFlags>>({});

  // --- Public Readonly ---
  readonly merchantProfile = this._merchantProfile.asReadonly();
  readonly currentDeviceMode = this._currentDeviceMode.asReadonly();

  // --- Computed: Resolved Feature Flags ---
  /** Merges mode preset with any per-device overrides */
  readonly featureFlags = computed<ModeFeatureFlags>(() => {
    const mode = this._currentDeviceMode();
    const preset = DEVICE_POS_MODE_CATALOG.find(m => m.mode === mode);
    const base = preset?.featureFlags ?? STANDARD_MODE;
    const overrides = this._featureFlagOverrides();
    return { ...base, ...overrides };
  });

  // --- Computed: Convenience Accessors ---
  readonly isRestaurantMode = computed(() =>
    ['quick_service', 'full_service', 'bar'].includes(this._currentDeviceMode())
  );
  readonly isRetailMode = computed(() => this._currentDeviceMode() === 'retail');
  readonly isServiceMode = computed(() =>
    ['bookings', 'services'].includes(this._currentDeviceMode())
  );

  /** Available modes based on merchant's verticals */
  readonly availableModes = computed<DevicePosMode[]>(() => {
    const profile = this._merchantProfile();
    if (!profile) return ['standard'];
    const verticals = profile.verticals;
    const modeSet = new Set<DevicePosMode>();
    for (const v of verticals) {
      const config = BUSINESS_VERTICAL_CATALOG.find(c => c.vertical === v);
      if (config) {
        for (const m of config.availableModes) modeSet.add(m);
      }
    }
    return [...modeSet];
  });

  /** Enabled platform modules based on merchant's verticals */
  readonly enabledModules = computed<PlatformModule[]>(() => {
    const profile = this._merchantProfile();
    if (!profile) return [];
    return profile.enabledModules;
  });

  // --- Feature Flag Shortcut Computeds ---
  readonly canUseOpenChecks = computed(() => this.featureFlags().enableOpenChecks);
  readonly canUseCoursing = computed(() => this.featureFlags().enableCoursing);
  readonly canUseFloorPlan = computed(() => this.featureFlags().enableFloorPlan);
  readonly canUseTableManagement = computed(() => this.featureFlags().enableTableManagement);
  readonly canUsePreAuthTabs = computed(() => this.featureFlags().enablePreAuthTabs);
  readonly canUseKds = computed(() => this.featureFlags().enableKds);
  readonly canUseExpoStation = computed(() => this.featureFlags().enableExpoStation);
  readonly canUseBarcodeScanning = computed(() => this.featureFlags().enableBarcodeScanning);
  readonly canUseAppointments = computed(() => this.featureFlags().enableAppointmentBooking);
  readonly canUseInvoicing = computed(() => this.featureFlags().enableProjectTracking);

  // --- Methods ---

  /** Load merchant profile from backend */
  loadMerchantProfile(restaurantId: string): Promise<void> { ... }

  /** Set device mode (persisted to localStorage + backend) */
  setDeviceMode(mode: DevicePosMode): void { ... }

  /** Override specific feature flags for this device */
  setFeatureFlagOverrides(overrides: Partial<ModeFeatureFlags>): void { ... }

  /** Check if a specific module is enabled for this merchant */
  isModuleEnabled(module: PlatformModule): boolean { ... }

  /** Resolve mode from localStorage or default based on merchant's primary vertical */
  resolveDeviceMode(): DevicePosMode { ... }
}
```

### Step 4: Mode-Aware Navigation & Dashboard

The platform sidebar/navigation adapts based on the current merchant's verticals and the device's mode:

```ts
export interface NavigationItem {
  label: string;
  icon: string;
  route: string;
  requiredModule?: PlatformModule;        // Only show if module enabled
  requiredFeatureFlag?: keyof ModeFeatureFlags;  // Only show if flag is true
  verticals?: BusinessVertical[];         // Only show for these verticals (null = all)
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  // Universal
  { label: 'Dashboard', icon: 'bi-grid', route: '/dashboard' },
  { label: 'Orders', icon: 'bi-receipt', route: '/orders' },
  { label: 'Customers', icon: 'bi-people', route: '/customers', requiredModule: 'crm' },
  { label: 'Reports', icon: 'bi-bar-chart', route: '/reports', requiredModule: 'reports' },
  { label: 'Team', icon: 'bi-person-badge', route: '/team', requiredModule: 'staff_scheduling' },
  { label: 'Settings', icon: 'bi-gear', route: '/settings' },

  // Restaurant-specific
  { label: 'Menu', icon: 'bi-book', route: '/menu', requiredModule: 'menu_management', verticals: ['food_and_drink'] },
  { label: 'Floor Plan', icon: 'bi-grid-3x3', route: '/floor-plan', requiredFeatureFlag: 'enableFloorPlan' },
  { label: 'KDS', icon: 'bi-display', route: '/kds', requiredFeatureFlag: 'enableKds' },
  { label: 'Reservations', icon: 'bi-calendar-event', route: '/reservations', requiredModule: 'reservations' },

  // Retail-specific
  { label: 'Catalog', icon: 'bi-box', route: '/catalog', verticals: ['retail', 'grocery'] },

  // Service-specific
  { label: 'Appointments', icon: 'bi-calendar-check', route: '/appointments', requiredFeatureFlag: 'enableAppointmentBooking' },
  { label: 'Invoices', icon: 'bi-receipt-cutoff', route: '/invoices', requiredModule: 'invoicing' },
];
```

---

## Phase 2 — Restaurant Mode Differentiation (Steps 5-8)

### Step 5: POS Terminal Mode Adaptation

The `ServerPosTerminal` component reads `PlatformService.featureFlags()` and adapts its layout:

| Feature | Quick Service | Full Service | Bar |
|---------|:---:|:---:|:---:|
| Table list (left panel) | Hidden | Shown | Hidden |
| Floor plan picker | Hidden | Shown | Hidden |
| Seat assignment bar | Hidden | Shown | Shown (bar seats) |
| Course management | Hidden | Shown | Hidden |
| Open checks / multi-check | Hidden | Shown | Shown |
| Pre-auth tab opening | Hidden | Shown | Shown |
| Check splitting | Hidden | Shown | Shown |
| Check transfer | Hidden | Shown | Hidden |
| Conversational modifiers | Shown | Hidden | Shown |
| Order number tracking | Shown | Hidden | Hidden |
| Item images | Shown (large) | Shown (medium) | Hidden |
| Dark display theme | No | No | Yes |
| Tip prompt | Yes | Yes | Yes |
| Auto-send to KDS | Yes (immediate) | Manual (fire) | Yes (immediate) |

**Implementation:** `ServerPosTerminal` injects `PlatformService`, uses `@if (platform.canUseOpenChecks())` to conditionally render panels. No separate component per mode — one component adapts.

### Step 6: KDS Mode Adaptation

| Feature | Quick Service | Full Service | Bar |
|---------|:---:|:---:|:---:|
| Station routing | Yes | Yes | Yes |
| Course grouping | No | Yes | No |
| Expo station | No | Yes | No |
| Course fire controls | No | Yes | No |
| Prep time tracking | Yes | Yes | Yes |
| Rush priority | Yes | Yes | Yes |
| Order number display | Prominent | Small | Small |
| Table/seat display | Hidden | Prominent | Seat only |

### Step 7: Online Ordering Mode Adaptation

| Feature | Quick Service | Full Service | Bar |
|---------|:---:|:---:|:---:|
| Order types | Pickup, Delivery | Pickup, Delivery, Dine-in, Curbside | Pickup only |
| Table QR ordering | No | Yes | Yes (seat QR) |
| Scheduled ordering | Yes | Yes | No |
| Course selection | No | Optional | No |
| Reservation + order | No | Yes | No |

### Step 8: Onboarding Flow Component

**New: `onboarding/setup-wizard/` (4 files)**

Multi-step onboarding wizard for new merchants:

1. **Business Name & Address** — name, address, optional logo upload (see Step 1 Detail below)
2. **What do you sell?** — multi-select pill buttons (8 verticals from catalog)
3. **Primary Focus** — if multiple verticals selected, choose primary (determines default device mode)
4. **Complexity Level** — "How do you plan to use OrderStack?"
   - Full (payments + catalog + inventory)
   - Catalog (payments + catalog)
   - Payments only
5. **Tax & Locale** — sales tax rate (auto-suggested from address), currency, receipt language (see Step 5 Detail below)
6. **Business Hours** — weekly open/close schedule (see Step 6 Detail below)
7. **First Device Mode** — mode selector filtered by selected verticals, with description and feature summary per mode
8. **Payment Setup** — how the merchant will accept payments (see Step 8 Detail below)
9. **Initial Menu / Catalog Setup** — quick-start item entry adapted by vertical (see Step 9 Detail below)
10. **First Team Member / Owner PIN** — create the owner's staff PIN for POS access (see Step 10 Detail below)
11. **Confirmation** — summary of all selections with item count, "Get Started" button

Selections saved to `MerchantProfile` via `PlatformService`.

#### Step 1 Detail: Business Name & Address

This step collects the merchant's identity and physical location — critical for tax calculation, timezone, delivery zones, receipts, and multi-location identity.

**Fields:**
- **Business name** — text input (required)
- **Logo** — image upload (optional, used on receipts, online ordering, kiosk welcome screen)
- **Street address** — text input with address autocomplete (Google Places or similar)
- **City** — auto-populated from address autocomplete
- **State/Province** — auto-populated
- **ZIP/Postal code** — auto-populated
- **Country** — dropdown, default "United States"
- **Phone number** — text input (optional, displayed on receipts and online ordering)
- **Timezone** — auto-detected from address, editable dropdown

**Behavior:**
- Address autocomplete reduces friction and ensures consistent formatting
- Timezone auto-detection ensures scheduled orders, business hours, and reports use the correct local time
- Address persisted to `Restaurant.address`, `Restaurant.timezone` fields
- If the merchant has multiple locations, additional locations are added later via Multi-Location (GOS-SPEC-11) — onboarding sets up the first

```ts
// Add to models/platform.model.ts
export interface BusinessAddress {
  street: string;
  street2: string | null;
  city: string;
  state: string;
  zip: string;
  country: string;
  timezone: string;          // e.g. 'America/New_York'
  phone: string | null;
  lat: number | null;        // Geocoded from address (for delivery zone calculations)
  lng: number | null;
}
```

#### Step 5 Detail: Tax & Locale

Sales tax is applied to every order. Getting it wrong from day one means incorrect totals and reporting.

**Fields:**
- **Sales tax rate** — number input (percentage, e.g. `7.5`), pre-populated from address-based lookup
  - "Based on your address in Broward County, FL, we suggest 7.0%"
  - Editable — merchant may have a different effective rate (exemptions, food vs non-food)
- **Currency** — dropdown, auto-selected from country (default USD)
- **Receipt language** — radio: English / Spanish / Both (matches existing `?lang=en|es` support)

**Tax auto-suggestion:**
- Backend endpoint: `GET /api/platform/tax-rate?state=FL&zip=33301` → `{ suggestedRate: 7.0, breakdown: { state: 6.0, county: 1.0 } }`
- Uses a tax rate lookup table seeded with US state + county rates (or integrates with a tax API like TaxJar/Avalara in future)
- If lookup fails, field is empty and merchant enters manually

**Behavior:**
- Tax rate persisted to `Restaurant.taxRate` (already exists, currently set later in settings)
- Currency persisted to `Restaurant.currency` (new field, default `'USD'`)
- Language preference persisted to `Restaurant.defaultLanguage` (new field, default `'en'`)
- `CartService.setTaxRate()` is called with this value on app initialization

```ts
// Add to models/platform.model.ts
export interface TaxLocaleConfig {
  taxRate: number;               // Percentage (e.g. 7.5)
  taxInclusive: boolean;         // Tax included in listed prices (common outside US)
  currency: string;              // ISO 4217 (e.g. 'USD', 'EUR')
  defaultLanguage: 'en' | 'es';
}
```

#### Step 6 Detail: Business Hours

Business hours control online ordering availability, scheduled order windows, reservation/appointment slots, and staff scheduling. Without them, online ordering doesn't know when the business is open.

**UI:**
- 7-row grid (Monday–Sunday), each row has:
  - **Open/Closed toggle** — switch to mark a day as closed
  - **Open time** — time picker (5-minute increments, default 9:00 AM)
  - **Close time** — time picker (default 9:00 PM)
  - **"Add split hours"** — for businesses with lunch/dinner breaks (e.g., 11am-2pm, 5pm-10pm)
- **"Copy to all days"** button — applies current row's hours to Mon-Fri or all 7 days (saves time)
- **Timezone display** — shows the timezone from Step 1 for confirmation ("All times in Eastern Time")

**Presets by vertical:**
- `food_and_drink`: Mon-Thu 11am-10pm, Fri-Sat 11am-11pm, Sun 12pm-9pm
- `retail` / `grocery`: Mon-Sat 9am-9pm, Sun 10am-6pm
- `beauty_wellness` / `healthcare`: Mon-Fri 9am-6pm, Sat 9am-3pm, Sun closed
- `professional_services` / `home_repair`: Mon-Fri 8am-5pm, Sat-Sun closed

**Behavior:**
- Merchant can accept the preset and move on, or customize per day
- Hours persisted via `PlatformService.saveBusinessHours(restaurantId, hours[])`
- GOS-SPEC-07 `BusinessHours` interface is used for storage
- GOS-SPEC-10 reads these hours for booking availability windows
- Online ordering portal shows "Currently Closed — opens at X" when outside hours
- "You can always change hours later in Settings" reassurance text

```ts
// Reuses GOS-SPEC-07 interface — no new type needed
// BusinessHours { dayOfWeek, openTime, closeTime, isOpen, orderTypes }
// Add to PlatformService:
// saveBusinessHours(restaurantId, hours: BusinessHours[]) — POST /api/restaurant/:id/business-hours
```

#### Step 8 Detail: Payment Setup

A merchant can't process a real transaction without payment configuration. This step gets them to a working state with minimal friction.

**UI:**
- "How will you accept payments?" — card-style selector:
  - **PayPal Zettle** (Recommended) — "Accept cards with PayPal Zettle readers. 2.29% + $0.09 per tap."
    - If selected: "Connect PayPal Account" button → OAuth flow (or "I'll set this up later" skip)
  - **Stripe** — "Accept cards via Stripe Terminal. 2.7% + $0.05 per in-person tap."
    - If selected: "Connect Stripe Account" button → OAuth flow (or "I'll set this up later" skip)
  - **Cash Only** — "I'll only accept cash for now."
    - No further setup needed, skips OAuth
  - **I'll set this up later** — skips entirely, payment settings accessible in Control Panel
- **Credit Card Surcharge** — checkbox: "Pass credit card processing fees to customers" (off by default)
  - If enabled: percentage input (default 3.0%, max 4.0% per Visa/MC rules)
  - Legal note: "Surcharging is prohibited in CT, MA, PR. Check your local regulations."

**Behavior:**
- Selected processor saved to `PaymentSettings.processorType` (existing)
- If OAuth completed: processor is immediately active, test charge optional
- If OAuth skipped ("I'll set this up later"): processor type saved but not active, Control Panel shows setup prompt
- Surcharge settings saved to `PaymentSettings.surchargeEnabled` / `surchargePercent` (existing)
- `Cash Only` sets `processorType: 'none'` — cash drawer flow only, no card payment option in checkout
- "You can always change your payment processor later in Settings > Payments"

#### Step 10 Detail: First Team Member / Owner PIN

The POS Terminal, KDS, and Staff Portal all require PIN authentication. Without at least one PIN, the merchant is locked out of their own POS on day one.

**UI:**
- "Create your owner PIN" — auto-populated from the onboarding user's info:
  - **Display name** — pre-filled from login account name (editable)
  - **4-digit PIN** — numeric input with masked dots + "Show PIN" toggle
  - **Confirm PIN** — must match
- PIN uniqueness validation (no conflict — this is the first PIN)
- "You'll use this PIN to log in to the POS terminal and approve manager actions."
- **Optional: "Add another team member"** — expandable section to create a second PIN (manager or staff role)
  - Name, role dropdown (Manager / Staff), 4-digit PIN
  - "You can add more team members later in Settings > Staff"

**Behavior:**
- Creates a `StaffPin` record with role `'owner'` via `StaffManagementService.createPin()`
- Also creates a `TeamMember` record linked to this PIN with all permissions enabled
- PIN persisted to backend immediately
- If the merchant adds a second member, creates with selected role and corresponding default permission set
- Owner PIN is protected — cannot be deleted, only changed (enforced in Staff Management)

```ts
// Add to models/platform.model.ts
export interface OnboardingPinData {
  displayName: string;
  pin: string;
  role: 'owner' | 'manager' | 'staff';
}
```

#### Step 9 Detail: Initial Menu / Catalog Setup

This step ensures the merchant has items to sell immediately after onboarding. The UI adapts based on selected vertical and complexity:

**If complexity is `payments_only`:** Skip this step entirely — merchant just needs to take payments, no catalog.

**`food_and_drink` vertical:**
- **Quick-start templates** — pre-built menu templates the merchant can start from:
  - "Coffee Shop" (12 items: espresso drinks, pastries, cold brew)
  - "Pizza Restaurant" (20 items: pizzas, sides, drinks, desserts)
  - "Bar & Grill" (25 items: appetizers, burgers, entrees, cocktails, beer, wine)
  - "Taco Truck" (15 items: tacos, burritos, sides, drinks)
  - "Blank Menu" (start from scratch)
- **Template preview** — shows categories and items in the selected template, merchant can customize before confirming
- **Quick add form** — add/edit items inline: name, price, category (auto-created), optional description
- **CSV import option** — "Already have a menu? Import from CSV" (links to GOS-SPEC-03 import flow)
- Categories auto-created from template (e.g., "Appetizers", "Entrees", "Drinks", "Desserts")
- Items created with sensible defaults: `isActive: true`, no modifiers (can add later in full Menu Management)

**`retail` / `grocery` vertical:**
- **Quick-start templates:**
  - "Clothing Boutique" (10 items with size/color variations)
  - "Gift Shop" (15 items across 4 categories)
  - "Convenience Store" (20 items: snacks, drinks, essentials)
  - "Blank Catalog" (start from scratch)
- **Quick add form** — name, price, SKU (optional, auto-generate offered), category
- **Barcode scan option** — "Scan products to add" (if device has camera, uses barcode lookup API to populate name/price)
- **CSV import option** — bulk product import

**`beauty_wellness` / `healthcare` / `sports_fitness` vertical:**
- **Quick-start templates:**
  - "Hair Salon" (8 services: cuts, color, styling, treatments)
  - "Spa" (10 services: massage, facial, body treatment, packages)
  - "Fitness Studio" (6 services: personal training, group classes, assessments)
  - "Blank Services" (start from scratch)
- **Quick add form** — service name, price, duration (minutes), category
- No barcode/CSV — services are typically few and manually configured

**`professional_services` / `home_repair` vertical:**
- **Quick-start templates:**
  - "Consulting" (5 services: hourly consultation, project assessment, retainer, training, audit)
  - "Home Repair" (8 services: diagnostic, repair, installation, maintenance, emergency)
  - "Blank Services" (start from scratch)
- **Quick add form** — service name, hourly rate or flat price, estimated duration

**All verticals — shared UX patterns:**
- Minimum 1 item required to proceed (ensures merchant can take an order immediately)
- "Skip for now" option that creates a single placeholder item ("Sample Item — $0.00") to unblock onboarding
- Item count badge updates live as items are added
- "You can always add more items later in Menu Management" reassurance text
- All items created via `MenuService.createItem()` (or batch endpoint) — persisted immediately, not just local state

#### Menu Templates — Backend Storage

```ts
// Add to models/platform.model.ts
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
  // Restaurant-specific
  prepTimeMinutes: number | null;
  // Retail-specific
  sku: string | null;
  // Services-specific
  durationMinutes: number | null;
}
```

**Add to `PlatformService`:**
- `loadMenuTemplates(vertical)` — GET `/api/platform/menu-templates?vertical=food_and_drink`
- `applyMenuTemplate(restaurantId, templateId)` — POST `/api/restaurant/:id/apply-template` (creates categories + items in batch)

**Seed data:** Templates are seeded in the backend database. Each template contains 5-25 realistic items with appropriate prices, categories, and vertical-specific fields populated.

---

## Phase 3 — Core Model Refactoring (Steps 9-12)

### Step 9: Universal vs Vertical-Specific Model Fields

Current OrderStack models mix universal and restaurant-specific fields. The mode-aware architecture separates them conceptually (not necessarily into separate interfaces — backward compatibility matters):

**`MenuItem` — Universal fields:**
- `id`, `name`, `description`, `price`, `categoryId`, `isActive`, `imageUrl`, `sortOrder`
- `sku`, `barcode`, `barcodeFormat` (added in GOS-SPEC-03)
- `channelVisibility` (added in GOS-SPEC-03)

**`MenuItem` — Restaurant vertical extensions:**
- `prepTimeMinutes`, `modifierGroupIds`, `dietaryInfo`, `spiceLevel`
- `allergens`, `nutritionFacts` (added in GOS-SPEC-03)
- `availabilityWindows` (added in GOS-SPEC-03)
- `requiresAgeVerification` (added in GOS-SPEC-07)

**`MenuItem` — Retail vertical extensions (future):**
- `weight`, `dimensions`, `shelfLocation`, `reorderPoint`, `supplier`

**`MenuItem` — Services vertical extension (future):**
- `durationMinutes`, `requiresStaffAssignment`, `depositRequired`

**Implementation approach:** Keep all fields on `MenuItem` but mark vertical-specific fields as `| null`. The PlatformService's enabled modules determine which fields appear in the UI. No runtime cost for unused fields.

### Step 10: Order Model Vertical Awareness

**`Order` — Universal fields:**
- `id`, `orderNumber`, `status`, `checks`, `payments`, `customerId`, `createdAt`, `total`
- `orderSource`, `channelVisibility`

**`Order` — Restaurant extensions (already exist):**
- `tableId`, `serverId`, `partySize`, `courses`, `diningOption`, `deliveryInfo`

**`Order` — Retail extensions (future):**
- `returnOf` (link to original order for returns), `exchangeItems`

**`Order` — Services extensions (future):**
- `appointmentId`, `projectId`, `invoiceId`

### Step 11: Customer Model Vertical Awareness

**`Customer` — Universal:**
- `id`, `name`, `email`, `phone`, `loyaltyTier`, `totalSpent`, `visitCount`, `tags`

**`Customer` — Restaurant extensions:**
- `dietaryRestrictions`, `seatingPreference`, `favoriteItems`, `allergens`

**`Customer` — Retail extensions (future):**
- `shirtSize`, `preferredBrands`, `wishlist`

**`Customer` — Services extensions (future):**
- `preferredStaff`, `serviceHistory`, `contractId`

### Step 12: Backend API Vertical Scoping

API endpoints are universal but responses adapt based on the merchant's verticals:

- `GET /api/restaurant/:id/menu/items` returns items with restaurant-specific fields populated
- Same endpoint for a retail merchant returns items with retail-specific fields populated
- `GET /api/merchant/:id/platform-profile` returns the `MerchantProfile` with verticals and enabled modules
- `PATCH /api/merchant/:id/platform-profile` updates verticals, complexity, enabled modules

---

## Phase 4 — Mode Switching & Multi-Mode (Steps 13-15)

### Step 13: Device Mode Switching

From the screenshots: "You can always change this later" — devices can switch modes.

**Implementation:**
- Settings > Device > "Switch Mode" button
- Mode selector modal (same as onboarding Step 5)
- Switching mode: saves to backend + localStorage, triggers full UI re-render via `PlatformService.setDeviceMode()`
- Unsaved work warning before mode switch
- Mode switch is instant — no page reload required (signal-driven reactivity)

### Step 14: Multi-Mode Locations

A single restaurant can have devices running different modes:
- **Dining room iPad** → Full Service mode
- **Bar terminal** → Bar mode
- **Counter kiosk** → Quick Service mode
- **Back office desktop** → Full Service (dashboard/reports)

Each device's mode is stored in `DeviceModeAssignment` and synced via `DeviceService` (GOS-SPEC-02). The dashboard and reports aggregate data across all modes at the location.

### Step 15: Mode-Aware Reports & Analytics

Reports adapt based on context:
- **Location-level reports** aggregate across all device modes
- **Mode-specific reports** filter by device mode (e.g., "Bar sales only")
- **Cross-mode comparison** shows revenue/orders/AOV per mode side by side
- Report builder (GOS-SPEC-04) includes "Device Mode" as a filter dimension

---

## Files Summary

### New Files
| File | Purpose |
|------|---------|
| `models/platform.model.ts` | Business verticals, device modes, feature flags, mode presets, merchant profile |
| `services/platform.ts` | PlatformService — mode resolution, feature flag computation, module enablement |
| `onboarding/setup-wizard/` (4 files) | Multi-step onboarding wizard for new merchants |

### Modified Files
| File | Changes |
|------|---------|
| `models/restaurant.model.ts` | Add `address: BusinessAddress`, `timezone`, `currency`, `defaultLanguage`, `businessHours` fields to Restaurant |
| `models/index.ts` | Add platform.model export |
| `public-api.ts` | Add PlatformService, SetupWizard exports |
| `elements/src/main.ts` | Register `get-order-stack-setup-wizard` custom element |
| `pos/server-pos-terminal/` | Inject PlatformService, conditionally render panels based on feature flags |
| `kds/kds-display/` | Inject PlatformService, adapt display based on mode |
| `online-ordering/online-order-portal/` | Adapt order types and features based on mode |
| All other components | Inject PlatformService where mode-conditional rendering is needed |

### Impact on Existing Specs (GOS-SPEC-02 through GOS-SPEC-11)

Every spec gains a **Mode Awareness** section documenting:
1. Which **business verticals** the spec's features apply to
2. Which **device modes** enable/disable specific features
3. Which **model fields** are universal vs vertical extensions
4. How **UI components** adapt per mode

---

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/merchant/:id/platform-profile` | Get merchant profile (verticals, modules, complexity) |
| PATCH | `/api/merchant/:id/platform-profile` | Update merchant profile |
| GET | `/api/merchant/:id/available-modes` | List available device modes for this merchant |
| GET | `/api/device/:deviceId/mode` | Get current device mode assignment |
| PATCH | `/api/device/:deviceId/mode` | Set/switch device mode |
| GET | `/api/platform/verticals` | List all business vertical configs |
| GET | `/api/platform/modes` | List all device POS mode configs |
| GET | `/api/platform/menu-templates?vertical=...` | List menu templates for a business vertical |
| POST | `/api/restaurant/:id/apply-template` | Apply a menu template (batch-create categories + items) |
| GET | `/api/platform/tax-rate?state=...&zip=...` | Suggest sales tax rate from address |
| POST | `/api/restaurant/:id/business-hours` | Save business hours schedule |
| GET | `/api/restaurant/:id/business-hours` | Get business hours schedule |
| POST | `/api/restaurant/:id/onboarding/pin` | Create owner/staff PIN during onboarding |

---

## Restaurant Mode Feature Matrix

Comprehensive feature-flag matrix for the three restaurant modes:

| Feature | Quick Service | Full Service | Bar |
|---------|:---:|:---:|:---:|
| **Order Workflow** | | | |
| Open checks | - | ✓ | ✓ |
| Coursing (fire control) | - | ✓ | - |
| Seat assignment | - | ✓ | ✓ |
| Check splitting | - | ✓ | ✓ |
| Check transfer | - | ✓ | - |
| Pre-auth tabs | - | ✓ | ✓ |
| Conversational modifiers | ✓ | - | ✓ |
| Multi-channel menus | ✓ | - | - |
| Order number tracking | ✓ | - | - |
| **Floor & Table** | | | |
| Floor plan | - | ✓ | - |
| Table management | - | ✓ | - |
| Waitlist | - | ✓ | - |
| **Kitchen** | | | |
| KDS | ✓ | ✓ | ✓ |
| Expo station | - | ✓ | - |
| **Display** | | | |
| Dark mode display | - | - | ✓ |
| Item images | Large | Medium | Hidden |
| Category navigation | ✓ | ✓ | ✓ |
| **Payments** | | | |
| Tipping | ✓ | ✓ | ✓ |
| Surcharging | ✓ | ✓ | ✓ |
| **Online Ordering** | | | |
| Pickup | ✓ | ✓ | ✓ |
| Delivery | ✓ | ✓ | - |
| Dine-in (QR tableside) | - | ✓ | ✓ |
| Curbside | ✓ | ✓ | - |
| Scheduled ordering | ✓ | ✓ | - |

---

## Verification

1. `ng build` both library and elements — zero errors
2. `PlatformService` correctly resolves feature flags for all 7 modes
3. `MerchantProfile` persists verticals and complexity to backend
4. Onboarding wizard walks through all 11 steps and creates profile
5. Business address saves and auto-detects timezone
6. Tax rate auto-suggests from address and persists to `Restaurant.taxRate`
7. Business hours save per day-of-week with split-hours support
8. Payment processor selection connects via OAuth or defers to Control Panel
9. Menu template selection pre-populates categories and items for the chosen vertical
10. Owner PIN is created and usable for POS login immediately after onboarding
11. POS Terminal adapts layout for Quick Service vs Full Service vs Bar
12. KDS hides coursing controls in Quick Service mode
13. Navigation sidebar hides irrelevant items based on merchant verticals
14. Device mode switch works without page reload
15. Reports include device mode as a filter dimension
16. All existing features continue to work in Full Service mode (backward compatibility)

---

## Implementation Priority

**Phase 1 is the foundation** — must be built before any spec (02-11) is implemented. The `PlatformService` and `ModeFeatureFlags` system is the backbone that all other components read from.

**Backward compatibility**: Existing OrderStack defaults to `food_and_drink` vertical with `full_service` mode. All current features work exactly as before. Mode awareness is additive, not breaking.

**Restaurant first**: Only the 3 restaurant modes (QSR, FSR, Bar) need full implementation now. Retail, Bookings, Services, and Standard modes are defined in the model but their UI implementations are deferred to future verticals.

---

## Sources

- [Square POS Modes Documentation](https://squareup.com/help/us/en/article/8458-use-modes-with-square-point-of-sale)
- [Create and Assign Modes (Device Profiles)](https://squareup.com/help/us/en/article/8114-create-and-manage-device-profiles)
- [Square Launches Unified POS App](https://www.pymnts.com/news/point-of-sale/2025/square-launches-customizable-unified-pos-app/)
- [Square for Restaurants Setup](https://squareup.com/help/us/en/article/6407-get-started-with-square-for-restaurants)
- [Square Restaurant Checkout Settings](https://squareup.com/help/us/en/article/7723-reintroducing-settings-with-square-for-restaurants)
- [Square Revised POS App with Custom Modes](https://www.digitaltransactions.net/square-releases-revised-point-of-sale-app-with-custom-modes/)
- [Square Unified POS for Sellers](https://retail-insider.com/retail-insider/2025/05/introducing-the-next-generation-square-point-of-sale-app-a-single-unified-app-to-power-commerce-and-growth-for-every-seller/)
