import { Component, signal, computed, inject, ChangeDetectionStrategy, DestroyRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  BusinessVertical,
  BusinessAddress,
  DevicePosMode,
  BusinessCategory,
  BUSINESS_CATEGORIES,
  REVENUE_RANGES,
  BUSINESS_VERTICAL_CATALOG,
  DEVICE_POS_MODE_CATALOG,
  defaultBusinessAddress,
  defaultTaxLocaleConfig,
  defaultBusinessHours,
  PLAN_TIERS,
  PlanTierKey,
  PaymentProcessor,
} from '@models/index';
import { Router } from '@angular/router';
import { PlatformService, OnboardingPayload } from '@services/platform';
import { AuthService } from '@services/auth';
import { DeviceService } from '@services/device';
import { PwaInstallService } from '@services/pwa-install';
import { PaymentConnectService } from '@services/payment-connect';

const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }, { code: 'DC', name: 'Washington DC' },
];

const ZIP_REGEX = /^\d{5}(-\d{4})?$/;

// --- Business type -> mode mapping ---
const BUSINESS_TYPE_MODE_MAP: Record<string, DevicePosMode> = {
  // Food & Drink
  'Fine Dining': 'full_service',
  'Casual Dining': 'full_service',
  'Club / Lounge': 'full_service',
  'Fast Food Restaurant': 'quick_service',
  'Counter Service Restaurant': 'quick_service',
  'Food Truck / Cart': 'quick_service',
  'Ghost / Virtual Kitchen': 'quick_service',
  'Bakery / Pastry Shop': 'quick_service',
  'Coffee / Tea Cafe': 'quick_service',
  'Caterer': 'quick_service',
  'Bar': 'bar',
  'Brewery': 'bar',

  // Retail
  'Specialty Shop': 'retail',
  'Electronics': 'retail',
  'Clothing and Accessories': 'retail',
  'Outdoor Markets': 'retail',
  'Books / Mags / Music / Video': 'retail',
  'Jewelry and Watches': 'retail',
  'Beer / Wine Bottle Shops': 'retail',
  'Baby / Children\'s Goods': 'retail',
  'Sporting Goods': 'retail',
  'Antique Shop': 'retail',
  'Art / Photo / Film Shop': 'retail',
  'Beauty Supplies': 'retail',
  'Convenience Store': 'retail',
  'Eyewear': 'retail',
  'Flowers and Gifts': 'retail',
  'Furniture / Home Goods': 'retail',
  'Grocery / Market': 'retail',
  'Hobby / Toy / Game Shop': 'retail',
  'Pet Store': 'retail',
  'Other Retail': 'retail',
  'Miscellaneous Goods': 'retail',

  // Beauty & Wellness (bookings)
  'Blow Dry Bar': 'bookings',
  'Brows / Lashes': 'bookings',
  'Ear / Body Piercing': 'bookings',
  'Hair Salon': 'bookings',
  'Makeup Artistry': 'bookings',
  'Nail Salon': 'bookings',
  'Skin Care / Esthetics': 'bookings',
  'Tanning Salon': 'bookings',
  'Body Grooming': 'bookings',
  'Day Spa': 'bookings',
  'Barber Shop': 'bookings',
  'Other Beauty & Personal Care': 'bookings',

  // Sports & Fitness (bookings)
  'Barre': 'bookings',
  'Boxing Gym': 'bookings',
  'Dance Studio': 'bookings',
  'Fitness Studio': 'bookings',
  'Gym / Health Club': 'bookings',
  'Martial Arts': 'bookings',
  'Pilates Studio': 'bookings',
  'Swimming / Water Aerobics': 'bookings',
  'Yoga Studio': 'bookings',
  'Other Fitness': 'bookings',

  // Healthcare (services)
  'Audiology': 'services',
  'Anesthesiology': 'services',
  'Chiropractor': 'services',
  'Cardiology': 'services',
  'Dentistry': 'services',
  'Emergency Medicine': 'services',
  'Family Medicine': 'services',
  'Nutrition / Dietetics': 'services',
  'Obstetrics / Gynecology': 'services',
  'Optometry / Eyewear': 'services',
  'Pathology': 'services',
  'Psychotherapy': 'services',
  'Other Healthcare': 'services',

  // Home & Repair (services)
  'Automotive Services': 'services',
  'Cleaning': 'services',
  'Clothing / Shoe Repair / Alterations': 'services',
  'Computer / Electronics / Appliances': 'services',
  'Flooring': 'services',
  'Heating and Air Conditioning': 'services',
  'Installation Services': 'services',
  'Locksmith Services': 'services',
  'Moving and Storage': 'services',
  'Plumbing': 'services',
  'Towing Services': 'services',
  'Other Home & Repair': 'services',

  // Professional Services (services)
  'Consulting': 'services',
  'Software Development': 'services',
  'Art and Design': 'services',
  'Marketing / Advertising': 'services',
  'Accounting': 'services',
  'Architect': 'services',
  'Photography': 'services',
  'Printing Services': 'services',
  'Real Estate': 'services',
  'Interior Design': 'services',
  'Child Care': 'services',
  'Graphic Design': 'services',
  'Car Washes': 'services',
  'Delivery': 'services',
  'Other Professional Services': 'services',

  // Leisure & Entertainment (services)
  'Events / Festivals': 'services',
  'Movies / Film': 'services',
  'Museum / Cultural': 'services',
  'Music': 'services',
  'Performing Arts': 'services',
  'Sports Recreation': 'services',
  'Tourism': 'services',
  'Other Leisure & Entertainment': 'services',

  // Charities, Education (services)
  'Charitable Organization': 'services',
  'Instructor / Teacher': 'bookings',
  'Membership Organization': 'services',
  'School': 'services',
  'Tutor': 'bookings',
  'Other Education & Membership': 'services',

  // Pet Care (services)
  'Pet Boarding / Daycare': 'bookings',
  'Pet Sitting': 'bookings',
  'Pet Store (Services)': 'services',
  'Other Pet Care': 'services',

  // Transportation (services)
  'Bus': 'services',
  'Delivery Service': 'services',
  'Private Shuttle': 'services',
  'Taxi': 'services',
  'Town Car': 'services',
  'Other Transportation': 'services',

  // Casual
  'Miscellaneous Services': 'services',
  'Other': 'standard',
};

// Search aliases so common keywords match business types that don't contain them literally
const BUSINESS_TYPE_SEARCH_ALIASES: Record<string, string[]> = {
  'Fine Dining': ['restaurant', 'dining', 'sit down', 'dine in'],
  'Casual Dining': ['restaurant', 'dining', 'sit down', 'dine in'],
  'Club / Lounge': ['restaurant', 'nightclub', 'bar'],
  'Bakery / Pastry Shop': ['restaurant', 'cafe', 'dessert'],
  'Coffee / Tea Cafe': ['restaurant', 'cafe', 'shop'],
  'Ghost / Virtual Kitchen': ['restaurant', 'delivery', 'cloud kitchen'],
  'Caterer': ['restaurant', 'events', 'catering'],
  'Hair Salon': ['salon', 'haircut', 'stylist'],
  'Barber Shop': ['salon', 'haircut'],
  'Day Spa': ['salon', 'massage', 'wellness'],
  'Gym / Health Club': ['gym', 'fitness', 'workout'],
  'Fitness Studio': ['gym', 'workout'],
  'Grocery / Market': ['store', 'supermarket', 'food'],
  'Convenience Store': ['store', 'shop', 'market'],
};

// --- Cuisine options ---
const CUISINES = [
  'American',
  'BBQ',
  'Bakery / Coffee Shop',
  'Bar / Brewery / Lounge',
  'Chinese',
  'Ice Cream',
  'Indian',
  'Italian',
  'Japanese',
  'Korean',
  'Mediterranean',
  'Mexican',
  'Seafood',
  'Soul Food',
  'Tex-Mex',
  'Thai',
  'Vietnamese',
];

// Cuisine -> menu template mapping
const CUISINE_TEMPLATE_MAP: Record<string, string> = {
  'Bakery / Coffee Shop': 'coffee-shop',
  'Bar / Brewery / Lounge': 'bar-grill',
};

// --- Hardware Recommendations ---

export interface HardwareRecommendation {
  id: string;
  category: string;
  icon: string;
  name: string;
  description: string;
  reason: string;
  priceRange: string;
  imageUrl: string;
  buyUrl: string;
  essential: boolean;
  modes: DevicePosMode[];
}

const ALL_HARDWARE: HardwareRecommendation[] = [
  {
    id: 'tablet',
    category: 'POS Terminal',
    icon: 'bi-tablet',
    name: 'iPad 10th Generation (10.9")',
    description: 'Apple\'s latest entry-level iPad — your primary countertop POS. Large touchscreen, long battery life, and runs OrderStack as a web app or PWA.',
    reason: 'The gold standard for POS terminals. Fast, reliable, and every staff member already knows how to use it.',
    priceRange: '$349',
    imageUrl: '/assets/hardware/tablet.svg',
    buyUrl: 'https://www.amazon.com/s?k=iPad+10th+generation',
    essential: true,
    modes: ['full_service', 'quick_service', 'bar', 'retail', 'services', 'bookings', 'standard'],
  },
  {
    id: 'phone',
    category: 'Mobile POS',
    icon: 'bi-phone',
    name: 'iPhone 13 or newer',
    description: 'For tableside ordering, line-busting, and mobile checkout anywhere in your business.',
    reason: 'Portable and pocket-sized — perfect for servers taking orders tableside or staff on the go.',
    priceRange: '$200 – $800',
    imageUrl: '/assets/hardware/phone.svg',
    buyUrl: 'https://www.amazon.com/s?k=iPhone+13',
    essential: false,
    modes: ['full_service', 'bar', 'retail', 'services', 'bookings', 'standard'],
  },
  {
    id: 'card-reader',
    category: 'Card Reader',
    icon: 'bi-credit-card-2-front',
    name: 'Stripe Reader S700 / PayPal Zettle',
    description: 'Accepts tap, chip, and contactless payments including Apple Pay and Google Pay.',
    reason: 'Accept every payment type your customers want to use. Connects to your chosen processor automatically.',
    priceRange: '$29 – $59',
    imageUrl: '/assets/hardware/card-reader.svg',
    buyUrl: 'https://www.amazon.com/s?k=Stripe+Terminal+card+reader',
    essential: true,
    modes: ['full_service', 'quick_service', 'bar', 'retail', 'services', 'bookings', 'standard'],
  },
  {
    id: 'kds',
    category: 'Order Display',
    icon: 'bi-display',
    name: 'Wall-Mount Touchscreen (15"–22")',
    description: 'Dedicated kitchen or prep area display for incoming orders and course timing.',
    reason: 'Eliminates paper tickets, reduces mistakes, and shows real-time order status to your kitchen team.',
    priceRange: '$200 – $700',
    imageUrl: '/assets/hardware/kds.svg',
    buyUrl: 'https://www.amazon.com/s?k=touchscreen+monitor+wall+mount+kitchen',
    essential: false,
    modes: ['full_service', 'quick_service', 'bar'],
  },
  {
    id: 'kiosk',
    category: 'Self-Order Kiosk',
    icon: 'bi-person-badge',
    name: 'iPad + Heckler Kiosk Stand',
    description: 'Customer-facing self-ordering station — iPad on a secure kiosk stand.',
    reason: 'Reduces wait times and increases average order value with upsell prompts. Frees up staff.',
    priceRange: '$400 – $800',
    imageUrl: '/assets/hardware/kiosk.svg',
    buyUrl: 'https://www.amazon.com/s?k=iPad+kiosk+stand',
    essential: false,
    modes: ['quick_service', 'retail'],
  },
  {
    id: 'barcode-scanner',
    category: 'Barcode Scanner',
    icon: 'bi-upc-scan',
    name: 'Socket Mobile SocketScan S740',
    description: 'Bluetooth 2D barcode scanner — pairs with your tablet or phone wirelessly.',
    reason: 'Scan product barcodes instantly for fast checkout. Essential for high-volume retail.',
    priceRange: '$200 – $400',
    imageUrl: '/assets/hardware/barcode-scanner.svg',
    buyUrl: 'https://www.amazon.com/s?k=Socket+Mobile+SocketScan+S740',
    essential: false,
    modes: ['retail'],
  },
  {
    id: 'receipt-printer',
    category: 'Receipt Printer',
    icon: 'bi-printer',
    name: 'Star Micronics TSP143IV',
    description: 'Thermal receipt printer — connects via USB, Bluetooth, or Wi-Fi. Prints receipts and kitchen tickets.',
    reason: 'Print customer receipts and order tickets automatically. Industry standard for speed and reliability.',
    priceRange: '$300 – $500',
    imageUrl: '/assets/hardware/receipt-printer.svg',
    buyUrl: 'https://www.amazon.com/s?k=Star+Micronics+TSP143IV',
    essential: false,
    modes: ['full_service', 'quick_service', 'bar', 'retail'],
  },
  {
    id: 'cash-drawer',
    category: 'Cash Drawer',
    icon: 'bi-safe',
    name: 'APG Vasario Cash Drawer',
    description: 'Auto-opens when connected to your receipt printer. Secure cash storage with multiple bill and coin slots.',
    reason: 'Automatically pops open on cash sales. Integrates with your receipt printer for seamless operation.',
    priceRange: '$50 – $150',
    imageUrl: '/assets/hardware/cash-drawer.svg',
    buyUrl: 'https://www.amazon.com/s?k=APG+Vasario+cash+drawer',
    essential: false,
    modes: ['full_service', 'quick_service', 'bar', 'retail'],
  },
];

@Component({
  selector: 'os-setup-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './setup-wizard.html',
  styleUrl: './setup-wizard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetupWizard implements OnInit {
  private readonly platformService = inject(PlatformService);
  private readonly authService = inject(AuthService);
  private readonly deviceService = inject(DeviceService);
  readonly pwaInstall = inject(PwaInstallService);
  readonly paymentConnect = inject(PaymentConnectService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly usStates = US_STATES;
  readonly revenueRanges = REVENUE_RANGES;
  readonly planTiers = PLAN_TIERS;
  readonly cuisines = CUISINES;

  // Total steps: 7 for food & drink, 6 for others
  readonly totalSteps = computed(() => this.isFoodBusiness() ? 7 : 6);

  // --- Wizard navigation ---
  readonly _currentStep = signal(1);
  readonly currentStep = this._currentStep.asReadonly();

  readonly progressPercent = computed(() =>
    Math.round((this._currentStep() / this.totalSteps()) * 100)
  );

  // --- Step 1: Business Name + Addresses ---
  readonly _businessName = signal('');

  // Home address (billing/legal)
  readonly _homeStreet = signal('');
  readonly _homeStreet2 = signal('');
  readonly _homeCity = signal('');
  readonly _homeState = signal('');
  readonly _homeZip = signal('');

  // Business address
  readonly _bizSameAsHome = signal(false);
  readonly _bizNoPhysical = signal(false);
  readonly _bizStreet = signal('');
  readonly _bizStreet2 = signal('');
  readonly _bizCity = signal('');
  readonly _bizState = signal('');
  readonly _bizZip = signal('');

  // --- Step 2: Business Type ---
  readonly _businessTypeSearch = signal('');
  readonly _selectedBusinessType = signal<BusinessCategory | null>(null);

  readonly filteredBusinessTypes = computed(() => {
    const search = this._businessTypeSearch().toLowerCase().trim();
    if (!search) return BUSINESS_CATEGORIES;
    return BUSINESS_CATEGORIES.filter(c => {
      const name = c.name.toLowerCase();
      const verticalLabel = this.getVerticalLabel(c.vertical).toLowerCase();
      if (name.includes(search)) return true;
      if (verticalLabel.includes(search)) return true;
      const aliases = BUSINESS_TYPE_SEARCH_ALIASES[c.name];
      if (aliases?.some(a => a.includes(search))) return true;
      return false;
    });
  });

  // Derive vertical from business type selection
  readonly effectivePrimaryVertical = computed<BusinessVertical>(() => {
    const bt = this._selectedBusinessType();
    return bt?.vertical ?? 'food_and_drink';
  });

  readonly selectedVerticals = computed<BusinessVertical[]>(() => {
    return [this.effectivePrimaryVertical()];
  });

  readonly isFoodBusiness = computed(() =>
    this.effectivePrimaryVertical() === 'food_and_drink'
  );

  // --- Cuisine (food_and_drink only) ---
  readonly _selectedCuisine = signal<string | null>(null);
  readonly _cuisineSearch = signal('');

  readonly filteredCuisines = computed(() => {
    const search = this._cuisineSearch().toLowerCase().trim();
    if (!search) return CUISINES;
    return CUISINES.filter(c => c.toLowerCase().includes(search));
  });

  readonly _selectedMenuTemplateId = signal<string | null>(null);

  // --- Annual Revenue ---
  readonly _selectedRevenue = signal<string | null>(null);

  // --- Plan + Processor ---
  readonly _selectedTier = signal<PlanTierKey>('free');
  readonly _selectedProcessor = signal<PaymentProcessor>('stripe');

  readonly currentRates = computed(() => {
    const processor = this._selectedProcessor();
    return this.planTiers.map(tier =>
      processor === 'stripe' ? tier.stripeRates : tier.paypalRates
    );
  });

  readonly isProcessorConnected = computed(() => {
    return this.paymentConnect.stripeStatus() === 'connected'
      || this.paymentConnect.paypalStatus() === 'connected';
  });

  // --- Hardware Recommendations ---
  readonly recommendedHardware = computed<HardwareRecommendation[]>(() => {
    const mode = this.autoDetectedMode();
    return ALL_HARDWARE.filter(hw => hw.modes.includes(mode));
  });

  readonly essentialHardware = computed(() =>
    this.recommendedHardware().filter(hw => hw.essential)
  );

  readonly optionalHardware = computed(() =>
    this.recommendedHardware().filter(hw => !hw.essential)
  );

  // --- Auto-detect mode from business type ---
  readonly autoDetectedMode = computed<DevicePosMode>(() => {
    const bt = this._selectedBusinessType();
    if (bt) {
      const mapped = BUSINESS_TYPE_MODE_MAP[bt.name];
      if (mapped) return mapped;
    }
    return 'standard';
  });

  readonly autoDetectedModeLabel = computed(() => {
    const mode = this.autoDetectedMode();
    return DEVICE_POS_MODE_CATALOG.find(c => c.mode === mode)?.label ?? mode;
  });

  // --- Submission ---
  readonly _isSubmitting = signal(false);
  readonly _submitError = signal<string | null>(null);
  readonly _submitSuccess = signal(false);
  readonly _onboardingDone = signal(false);

  readonly isLoading = this.platformService.isLoading;

  // --- Address validation helpers ---
  private isValidZip(zip: string): boolean {
    return ZIP_REGEX.exec(zip.trim()) !== null;
  }

  private isHomeAddressValid(): boolean {
    return this._homeStreet().trim().length > 0
      && this._homeCity().trim().length > 0
      && this._homeState().trim().length > 0
      && this.isValidZip(this._homeZip());
  }

  private isBizAddressValid(): boolean {
    if (this._bizSameAsHome() || this._bizNoPhysical()) return true;
    return this._bizStreet().trim().length > 0
      && this._bizCity().trim().length > 0
      && this._bizState().trim().length > 0
      && this.isValidZip(this._bizZip());
  }

  // --- Step validation ---
  readonly canProceed = computed(() => {
    const step = this._currentStep();
    const isFood = this.isFoodBusiness();

    // Map logical step to content step
    // Steps: 1=address, 2=biztype, 3=cuisine(food)/revenue(other),
    //         4=revenue(food)/plan(other), 5=plan(food)/hardware(other),
    //         6=hardware(food)/done(other), 7=done(food)
    switch (step) {
      case 1:
        return this._businessName().trim().length > 0
          && this.isHomeAddressValid()
          && this.isBizAddressValid();
      case 2:
        return this._selectedBusinessType() !== null;
      case 3:
        if (isFood) return true; // cuisine is optional (can skip via "Create Items Manually")
        return this._selectedRevenue() !== null;
      case 4:
        if (isFood) return this._selectedRevenue() !== null;
        return true; // plan selection always has a default (free)
      case 5:
        if (isFood) return true; // plan
        return true; // hardware is informational
      case 6:
        if (isFood) return true; // hardware
        return !this._isSubmitting(); // done screen
      case 7:
        return !this._isSubmitting(); // done screen (food only)
      default:
        return false;
    }
  });

  // Which "logical" step is this?
  readonly stepLabel = computed(() => {
    const step = this._currentStep();
    const isFood = this.isFoodBusiness();
    const labels = isFood
      ? ['Business Info', 'Business Type', 'Cuisine', 'Revenue', 'Plan & Payment', 'Hardware', 'All Set']
      : ['Business Info', 'Business Type', 'Revenue', 'Plan & Payment', 'Hardware', 'All Set'];
    return labels[step - 1] ?? '';
  });

  // Is current step the plan+payment step?
  readonly isPlanStep = computed(() => {
    const step = this._currentStep();
    return this.isFoodBusiness() ? step === 5 : step === 4;
  });

  // Is current step the hardware step?
  readonly isHardwareStep = computed(() => {
    const step = this._currentStep();
    return this.isFoodBusiness() ? step === 6 : step === 5;
  });

  // Is current step the "done" step?
  readonly isDoneStep = computed(() => {
    return this._currentStep() === this.totalSteps();
  });

  // Is current step the cuisine step?
  readonly isCuisineStep = computed(() => {
    return this.isFoodBusiness() && this._currentStep() === 3;
  });

  // Is current step the revenue step?
  readonly isRevenueStep = computed(() => {
    const step = this._currentStep();
    return this.isFoodBusiness() ? step === 4 : step === 3;
  });

  // --- Popstate listener for browser back ---
  private popstateHandler = (event: PopStateEvent): void => {
    const step = this._currentStep();
    if (step > 1) {
      event.preventDefault();
      this._currentStep.set(step - 1);
      // Push a new state so the back button works again
      history.pushState({ step: step - 1 }, '');
    }
  };

  ngOnInit(): void {
    // Push initial state
    history.pushState({ step: 1 }, '');
    // Listen for back button
    window.addEventListener('popstate', this.popstateHandler);
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('popstate', this.popstateHandler);
    });
  }

  // --- Navigation ---

  async next(): Promise<void> {
    const current = this._currentStep();
    const total = this.totalSteps();

    // When moving past revenue step, submit onboarding
    if (this.isRevenueStep() && !this._onboardingDone()) {
      await this.submitOnboarding();
      if (!this._onboardingDone()) return; // submission failed
    }

    if (current < total) {
      const nextStep = current + 1;
      this._currentStep.set(nextStep);
      history.pushState({ step: nextStep }, '');
    }
  }

  prev(): void {
    const current = this._currentStep();
    if (current > 1) {
      this._currentStep.set(current - 1);
      history.pushState({ step: current - 1 }, '');
    }
  }

  // --- Step 1: Address helpers ---

  toggleSameAsHome(): void {
    const next = !this._bizSameAsHome();
    this._bizSameAsHome.set(next);
    if (next) {
      this._bizNoPhysical.set(false);
    }
  }

  toggleNoPhysical(): void {
    const next = !this._bizNoPhysical();
    this._bizNoPhysical.set(next);
    if (next) {
      this._bizSameAsHome.set(false);
    }
  }

  // --- Step 2: Business Type selection ---

  selectBusinessType(type: BusinessCategory): void {
    this._selectedBusinessType.set(type);
  }

  getVerticalLabel(vertical: BusinessVertical): string {
    return BUSINESS_VERTICAL_CATALOG.find(c => c.vertical === vertical)?.label ?? vertical;
  }

  // --- Cuisine ---

  selectCuisine(cuisine: string): void {
    this._selectedCuisine.set(cuisine);
    // Map to template
    const template = CUISINE_TEMPLATE_MAP[cuisine] ?? 'casual-dining';
    this._selectedMenuTemplateId.set(template);
  }

  skipCuisine(): void {
    this._selectedCuisine.set(null);
    this._selectedMenuTemplateId.set(null);
    void this.next();
  }

  // --- Revenue selection ---

  selectRevenue(id: string): void {
    this._selectedRevenue.set(id);
  }

  // --- Plan + Processor ---

  selectTier(tierKey: PlanTierKey): void {
    this._selectedTier.set(tierKey);
  }

  selectProcessor(processor: PaymentProcessor): void {
    this._selectedProcessor.set(processor);
  }

  formatPrice(tier: typeof PLAN_TIERS[number]): string {
    if (tier.monthlyPriceCents === 0) return '$0';
    return `$${tier.monthlyPriceCents / 100}`;
  }

  getRatesForTier(tierIndex: number): { inPerson: string; online: string; keyedIn: string } {
    return this.currentRates()[tierIndex];
  }

  async connectProcessor(): Promise<void> {
    const processor = this._selectedProcessor();
    if (processor === 'stripe') {
      const url = await this.paymentConnect.startStripeConnect();
      if (url) {
        window.open(url, '_blank');
        await this.paymentConnect.pollStripeUntilConnected();
      }
    } else {
      const url = await this.paymentConnect.startPayPalConnect();
      if (url) {
        window.open(url, '_blank');
        await this.paymentConnect.pollPayPalUntilConnected();
      }
    }
  }

  // --- Onboarding submission ---

  private async submitOnboarding(): Promise<void> {
    this._isSubmitting.set(true);
    this._submitError.set(null);

    const detectedMode = this.autoDetectedMode();
    const user = this.authService.user();

    // Build business address
    let bizAddress: BusinessAddress;
    if (this._bizSameAsHome()) {
      bizAddress = {
        street: this._homeStreet(),
        street2: this._homeStreet2() || null,
        city: this._homeCity(),
        state: this._homeState(),
        zip: this._homeZip(),
        country: 'US',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        phone: null,
        lat: null,
        lng: null,
      };
    } else if (this._bizNoPhysical()) {
      bizAddress = {
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
    } else {
      bizAddress = {
        street: this._bizStreet(),
        street2: this._bizStreet2() || null,
        city: this._bizCity(),
        state: this._bizState(),
        zip: this._bizZip(),
        country: 'US',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        phone: null,
        lat: null,
        lng: null,
      };
    }

    const payload: OnboardingPayload = {
      businessName: this._businessName(),
      address: bizAddress,
      verticals: this.selectedVerticals(),
      primaryVertical: this.effectivePrimaryVertical(),
      complexity: 'full',
      defaultDeviceMode: detectedMode,
      taxLocale: defaultTaxLocaleConfig(),
      businessHours: defaultBusinessHours(),
      paymentProcessor: 'none',
      menuTemplateId: this._selectedMenuTemplateId(),
      ownerPin: {
        displayName: user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Owner' : 'Owner',
        pin: '',
        role: 'owner',
      },
      ownerEmail: user?.email ?? '',
      ownerPassword: '',
    };

    const result = await this.platformService.completeOnboarding(payload);

    this._isSubmitting.set(false);

    if (result) {
      this.authService.selectRestaurant(result.restaurantId, payload.businessName);
      this._onboardingDone.set(true);

      // Register device in background
      const device = await this.deviceService.registerBrowserDevice(detectedMode);
      if (device) {
        this.platformService.setDeviceModeFromDevice(detectedMode);
      }
    } else {
      this._submitError.set(this.platformService.error() ?? 'Something went wrong');
    }
  }

  // --- Done screen ---

  goToDashboard(): void {
    this.router.navigate(['/home']);
  }

  async installApp(): Promise<void> {
    await this.pwaInstall.promptInstall();
  }
}
