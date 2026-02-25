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
import { MarketplaceProviderType } from '@models/delivery.model';
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

// Cuisine -> menu template mapping (IDs must match backend MENU_TEMPLATES in menu-templates.ts)
const CUISINE_TEMPLATE_MAP: Record<string, string> = {
  'American': 'tmpl-american-grill',
  'BBQ': 'tmpl-bbq',
  'Bakery / Coffee Shop': 'tmpl-coffee-shop',
  'Bar / Brewery / Lounge': 'tmpl-bar-and-grill',
  'Chinese': 'tmpl-asian',
  'Ice Cream': 'tmpl-ice-cream',
  'Indian': 'tmpl-indian',
  'Italian': 'tmpl-pizza-restaurant',
  'Japanese': 'tmpl-asian',
  'Korean': 'tmpl-asian',
  'Mediterranean': 'tmpl-mediterranean',
  'Mexican': 'tmpl-taco-truck',
  'Seafood': 'tmpl-seafood',
  'Soul Food': 'tmpl-american-grill',
  'Tex-Mex': 'tmpl-taco-truck',
  'Thai': 'tmpl-asian',
  'Vietnamese': 'tmpl-asian',
};

// Default template for cuisines without a specific match
const DEFAULT_MENU_TEMPLATE = 'tmpl-bar-and-grill';

// --- Delivery Provider Config ---

export interface DeliveryProviderConfig {
  id: MarketplaceProviderType;
  name: string;
  icon: string;
  color: string;
  fields: { key: string; label: string; placeholder: string; type: string }[];
}

const DELIVERY_PROVIDERS: DeliveryProviderConfig[] = [
  {
    id: 'doordash_marketplace',
    name: 'DoorDash',
    icon: 'bi-truck',
    color: '#ff3008',
    fields: [
      { key: 'storeId', label: 'Store ID', placeholder: 'Your DoorDash Store ID', type: 'text' },
      { key: 'developerId', label: 'Developer ID', placeholder: 'Your DoorDash Developer ID', type: 'text' },
      { key: 'signingSecret', label: 'Signing Secret', placeholder: 'Your webhook signing secret', type: 'password' },
    ],
  },
  {
    id: 'ubereats',
    name: 'Uber Eats',
    icon: 'bi-bag',
    color: '#06c167',
    fields: [
      { key: 'storeId', label: 'Restaurant ID', placeholder: 'Your Uber Eats Restaurant ID', type: 'text' },
      { key: 'clientId', label: 'Client ID', placeholder: 'Your Uber Eats Client ID', type: 'text' },
      { key: 'clientSecret', label: 'Client Secret', placeholder: 'Your client secret', type: 'password' },
    ],
  },
  {
    id: 'grubhub',
    name: 'Grubhub',
    icon: 'bi-basket',
    color: '#f63440',
    fields: [
      { key: 'restaurantId', label: 'Restaurant ID', placeholder: 'Your Grubhub Restaurant ID', type: 'text' },
      { key: 'apiKey', label: 'API Key', placeholder: 'Your Grubhub API Key', type: 'password' },
    ],
  },
];

// --- Hardware Recommendations ---

export interface HardwareRecommendation {
  id: string;
  category: string;
  icon: string;
  name: string;
  description: string;
  reason: string;
  price: string;
  imageUrl: string;
  buyUrl: string;
  buyLabel: string;
  essential: boolean;
  modes: DevicePosMode[];
  processorOnly?: PaymentProcessor;
}

const ALL_HARDWARE: HardwareRecommendation[] = [
  {
    id: 'tablet',
    category: 'POS Terminal',
    icon: 'bi-tablet',
    name: 'iPad 10th Gen (10.9", 64GB, Wi-Fi)',
    description: 'Your primary countertop POS. Large touchscreen, all-day battery, runs OrderStack as a web app or PWA.',
    reason: 'The gold standard for POS terminals. Fast, reliable, long battery life, and your staff already knows how to use it.',
    price: '$349',
    imageUrl: '/assets/hardware/tablet.webp',
    buyUrl: 'https://www.apple.com/shop/buy-ipad/ipad',
    buyLabel: 'apple.com',
    essential: true,
    modes: ['full_service', 'quick_service', 'bar', 'retail', 'services', 'bookings', 'standard'],
  },
  {
    id: 'phone',
    category: 'Mobile POS',
    icon: 'bi-phone',
    name: 'iPhone SE (3rd Gen)',
    description: 'Compact and affordable. For tableside ordering, line-busting, and mobile checkout anywhere in your business.',
    reason: 'Pocket-sized and affordable. Perfect for tableside ordering, line-busting, or mobile checkout anywhere in your business.',
    price: '$429',
    imageUrl: '/assets/hardware/phone.webp',
    buyUrl: 'https://www.apple.com/shop/buy-iphone/iphone-se',
    buyLabel: 'apple.com',
    essential: false,
    modes: ['full_service', 'bar', 'retail', 'services', 'bookings', 'standard'],
  },
  {
    id: 'card-reader-stripe',
    category: 'Card Reader',
    icon: 'bi-credit-card-2-front',
    name: 'Stripe Reader S700',
    description: 'Countertop card reader with a touchscreen. Accepts tap, chip, swipe, and contactless payments including Apple Pay and Google Pay.',
    reason: 'Accepts tap, chip, swipe, and contactless payments including Apple Pay and Google Pay. Connects to your Stripe account automatically.',
    price: '$349',
    imageUrl: '/assets/hardware/card-reader-stripe.webp',
    buyUrl: 'https://stripe.com/terminal',
    buyLabel: 'stripe.com',
    essential: true,
    modes: ['full_service', 'quick_service', 'bar', 'retail', 'services', 'bookings', 'standard'],
    processorOnly: 'stripe',
  },
  {
    id: 'card-reader-paypal',
    category: 'Card Reader',
    icon: 'bi-credit-card-2-front',
    name: 'PayPal Zettle Reader 2',
    description: 'Compact card reader. Accepts tap, chip, and contactless payments. Pairs with your PayPal account instantly.',
    reason: 'Affordable card reader at just $29. Accepts tap, chip, and contactless. Pairs with your PayPal account out of the box.',
    price: '$29',
    imageUrl: '/assets/hardware/card-reader-paypal.webp',
    buyUrl: 'https://www.zettle.com/us/card-reader',
    buyLabel: 'zettle.com',
    essential: true,
    modes: ['full_service', 'quick_service', 'bar', 'retail', 'services', 'bookings', 'standard'],
    processorOnly: 'paypal',
  },
  {
    id: 'kds',
    category: 'Order Display (KDS)',
    icon: 'bi-display',
    name: 'Samsung Galaxy Tab A9+ (11")',
    description: 'Budget-friendly Android tablet. Wall-mount it in the kitchen to display incoming orders and course timing.',
    reason: 'Large 11" screen at a budget-friendly price. Wall-mount it in the kitchen to display incoming orders and course timing in real time.',
    price: '$219',
    imageUrl: '/assets/hardware/kds.webp',
    buyUrl: 'https://www.samsung.com/us/tablets/galaxy-tab-a9-plus/',
    buyLabel: 'samsung.com',
    essential: false,
    modes: ['full_service', 'quick_service', 'bar'],
  },
  {
    id: 'kiosk',
    category: 'Self-Order Kiosk',
    icon: 'bi-person-badge',
    name: 'Heckler WindFall Stand for iPad',
    description: 'Secure kiosk enclosure designed specifically for iPad. Tamper-resistant, sleek design for customer self-ordering.',
    reason: 'Secure kiosk enclosure designed specifically for iPad. Tamper-resistant, sleek design. Customers can self-order without staff.',
    price: '$225',
    imageUrl: '/assets/hardware/kiosk.webp',
    buyUrl: 'https://www.amazon.com/s?k=Heckler+WindFall+Stand+iPad',
    buyLabel: 'Amazon',
    essential: false,
    modes: ['quick_service', 'retail'],
  },
  {
    id: 'barcode-scanner',
    category: 'Barcode Scanner',
    icon: 'bi-upc-scan',
    name: 'Socket Mobile S740',
    description: 'Bluetooth 2D barcode scanner. Pairs wirelessly with your tablet or phone for fast product scanning.',
    reason: 'Bluetooth 2D barcode scanner. Pairs wirelessly with your tablet or phone. Scans product barcodes instantly for fast retail checkout.',
    price: '$396',
    imageUrl: '/assets/hardware/barcode-scanner.webp',
    buyUrl: 'https://www.amazon.com/s?k=Socket+Mobile+SocketScan+S740',
    buyLabel: 'Amazon',
    essential: false,
    modes: ['retail'],
  },
  {
    id: 'receipt-printer',
    category: 'Receipt Printer',
    icon: 'bi-printer',
    name: 'Star Micronics mC-Print3',
    description: 'Thermal receipt printer. Connects via USB, Bluetooth, or Wi-Fi. Prints customer receipts and kitchen tickets.',
    reason: 'Industry standard thermal receipt printer. Connects via USB, Bluetooth, or Wi-Fi. Prints customer receipts and kitchen tickets automatically.',
    price: '$450',
    imageUrl: '/assets/hardware/receipt-printer.webp',
    buyUrl: 'https://www.amazon.com/s?k=Star+Micronics+mC-Print3',
    buyLabel: 'Amazon',
    essential: false,
    modes: ['full_service', 'quick_service', 'bar', 'retail'],
  },
  {
    id: 'cash-drawer',
    category: 'Cash Drawer',
    icon: 'bi-safe',
    name: 'APG Vasario 1616',
    description: 'Auto-opens when connected to your receipt printer. Multiple bill and coin slots for organized cash handling.',
    reason: 'Auto-opens when connected to your receipt printer on cash sales. Multiple bill and coin slots. Reliable and affordable at $89.',
    price: '$89',
    imageUrl: '/assets/hardware/cash-drawer.webp',
    buyUrl: 'https://www.amazon.com/s?k=APG+Vasario+1616+cash+drawer',
    buyLabel: 'Amazon',
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
  readonly deliveryProviders = DELIVERY_PROVIDERS;

  // --- Step map ---
  // Food & Drink (9 steps): address, biztype, cuisine, revenue, locations, delivery, plan, hardware, done
  // Other (7 steps):        address, biztype, revenue, locations, plan, hardware, done
  readonly totalSteps = computed(() => this.isFoodBusiness() ? 9 : 7);

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

  // --- Multiple Locations (Step 5) ---
  readonly _hasMultipleLocations = signal(false);
  readonly _locationCount = signal(2);

  // --- Delivery Providers (Step 6, food_and_drink only) ---
  readonly _enabledProviders = signal<Set<MarketplaceProviderType>>(new Set());
  readonly _providerCredentials = signal<Record<string, Record<string, string>>>({});

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
    const processor = this._selectedProcessor();
    return ALL_HARDWARE.filter(hw => {
      if (!hw.modes.includes(mode)) return false;
      // Processor-aware card reader filtering
      if (hw.processorOnly && hw.processorOnly !== processor) return false;
      return true;
    });
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

  // --- Step identity computeds ---
  // Food:  1=address, 2=biztype, 3=cuisine, 4=revenue, 5=locations, 6=delivery, 7=plan, 8=hardware, 9=done
  // Other: 1=address, 2=biztype, 3=revenue, 4=locations, 5=plan, 6=hardware, 7=done

  readonly isCuisineStep = computed(() =>
    this.isFoodBusiness() && this._currentStep() === 3
  );

  readonly isRevenueStep = computed(() => {
    const step = this._currentStep();
    return this.isFoodBusiness() ? step === 4 : step === 3;
  });

  readonly isLocationsStep = computed(() => {
    const step = this._currentStep();
    return this.isFoodBusiness() ? step === 5 : step === 4;
  });

  readonly isDeliveryStep = computed(() =>
    this.isFoodBusiness() && this._currentStep() === 6
  );

  readonly isPlanStep = computed(() => {
    const step = this._currentStep();
    return this.isFoodBusiness() ? step === 7 : step === 5;
  });

  readonly isHardwareStep = computed(() => {
    const step = this._currentStep();
    return this.isFoodBusiness() ? step === 8 : step === 6;
  });

  readonly isDoneStep = computed(() =>
    this._currentStep() === this.totalSteps()
  );

  readonly stepLabel = computed(() => {
    const step = this._currentStep();
    const isFood = this.isFoodBusiness();
    const labels = isFood
      ? ['Business Info', 'Business Type', 'Cuisine', 'Revenue', 'Locations', 'Delivery', 'Plan & Payment', 'Hardware', 'All Set']
      : ['Business Info', 'Business Type', 'Revenue', 'Locations', 'Plan & Payment', 'Hardware', 'All Set'];
    return labels[step - 1] ?? '';
  });

  // --- Submission ---
  readonly _isSubmitting = signal(false);
  readonly _submitError = signal<string | null>(null);
  readonly _submitSuccess = signal(false);
  readonly _onboardingDone = signal(false);

  readonly isLoading = this.platformService.isLoading;

  // --- Address validation helpers ---

  private isValidStreet(street: string): boolean {
    const s = street.trim();
    // Must be at least 5 chars, contain at least one digit and one letter
    return s.length >= 5 && /\d/.exec(s) !== null && /[a-zA-Z]/.exec(s) !== null;
  }

  private isValidZip(zip: string): boolean {
    return ZIP_REGEX.exec(zip.trim()) !== null;
  }

  private isHomeAddressValid(): boolean {
    return this.isValidStreet(this._homeStreet())
      && this._homeCity().trim().length > 0
      && this._homeState().trim().length > 0
      && this.isValidZip(this._homeZip());
  }

  private isBizAddressValid(): boolean {
    if (this._bizNoPhysical()) return true;
    return this.isValidStreet(this._bizStreet())
      && this._bizCity().trim().length > 0
      && this._bizState().trim().length > 0
      && this.isValidZip(this._bizZip());
  }

  // --- Step validation ---
  readonly canProceed = computed(() => {
    const step = this._currentStep();

    if (step === 1) {
      return this._businessName().trim().length > 0
        && this.isHomeAddressValid()
        && this.isBizAddressValid();
    }
    if (step === 2) {
      return this._selectedBusinessType() !== null;
    }
    if (this.isCuisineStep()) return true; // cuisine is optional
    if (this.isRevenueStep()) return this._selectedRevenue() !== null;
    if (this.isLocationsStep()) return true; // always valid
    if (this.isDeliveryStep()) return true; // always valid (skip allowed)
    // TODO: Change to `this.isProcessorConnected()` before production launch
    if (this.isPlanStep()) return true;
    if (this.isHardwareStep()) return true; // informational
    if (this.isDoneStep()) return !this._isSubmitting();
    return false;
  });

  // --- Popstate listener for browser back ---
  private popstateHandler = (event: PopStateEvent): void => {
    const step = this._currentStep();
    if (step > 1) {
      event.preventDefault();
      this._currentStep.set(step - 1);
      history.pushState({ step: step - 1 }, '');
    }
  };

  ngOnInit(): void {
    history.pushState({ step: 1 }, '');
    window.addEventListener('popstate', this.popstateHandler);
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('popstate', this.popstateHandler);
    });
  }

  // --- Navigation ---

  async next(): Promise<void> {
    const current = this._currentStep();
    const total = this.totalSteps();

    // Submit onboarding when leaving the revenue step
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

  toggleNoPhysical(): void {
    this._bizNoPhysical.update(v => !v);
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
    const template = CUISINE_TEMPLATE_MAP[cuisine] ?? DEFAULT_MENU_TEMPLATE;
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

  // --- Locations ---

  selectSingleLocation(): void {
    this._hasMultipleLocations.set(false);
    this._locationCount.set(1);
  }

  selectMultipleLocations(): void {
    this._hasMultipleLocations.set(true);
    if (this._locationCount() < 2) {
      this._locationCount.set(2);
    }
  }

  // --- Delivery Providers ---

  toggleProvider(providerId: MarketplaceProviderType): void {
    this._enabledProviders.update(set => {
      const next = new Set(set);
      if (next.has(providerId)) {
        next.delete(providerId);
      } else {
        next.add(providerId);
      }
      return next;
    });
  }

  isProviderEnabled(providerId: MarketplaceProviderType): boolean {
    return this._enabledProviders().has(providerId);
  }

  setProviderCredential(providerId: string, fieldKey: string, value: string): void {
    this._providerCredentials.update(creds => {
      const providerCreds = { ...(creds[providerId] ?? {}), [fieldKey]: value };
      return { ...creds, [providerId]: providerCreds };
    });
  }

  getProviderCredential(providerId: string, fieldKey: string): string {
    return this._providerCredentials()[providerId]?.[fieldKey] ?? '';
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
    if (this._bizNoPhysical()) {
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
      paymentProcessor: this.isProcessorConnected() ? this._selectedProcessor() : 'none',
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
