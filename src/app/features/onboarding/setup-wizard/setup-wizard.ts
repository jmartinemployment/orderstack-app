import { Component, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
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
} from '@models/index';
import { Router } from '@angular/router';
import { PlatformService, OnboardingPayload } from '@services/platform';
import { AuthService } from '@services/auth';
import { DeviceService } from '@services/device';

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

const TOTAL_STEPS = 5;

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

@Component({
  selector: 'os-setup-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './setup-wizard.html',
  styleUrl: './setup-wizard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetupWizard {
  private readonly platformService = inject(PlatformService);
  private readonly authService = inject(AuthService);
  private readonly deviceService = inject(DeviceService);
  private readonly router = inject(Router);

  readonly usStates = US_STATES;
  readonly revenueRanges = REVENUE_RANGES;
  readonly totalSteps = TOTAL_STEPS;

  // --- Wizard navigation ---
  readonly _currentStep = signal(1);
  readonly currentStep = this._currentStep.asReadonly();

  readonly progressPercent = computed(() =>
    Math.round((this._currentStep() / TOTAL_STEPS) * 100)
  );

  // --- Step 1: Business Info + Address ---
  readonly _businessName = signal('');
  readonly _businessAddress = signal('');
  readonly _noPhysicalAddress = signal(false);
  readonly _address = signal<BusinessAddress>(defaultBusinessAddress());
  readonly _phone = signal('');

  // --- Step 2: Business Type ---
  readonly _businessTypeSearch = signal('');
  readonly _selectedBusinessType = signal<BusinessCategory | null>(null);

  readonly filteredBusinessTypes = computed(() => {
    const search = this._businessTypeSearch().toLowerCase().trim();
    if (!search) return BUSINESS_CATEGORIES;
    return BUSINESS_CATEGORIES.filter(c =>
      c.name.toLowerCase().includes(search)
    );
  });

  // Derive vertical from business type selection
  readonly effectivePrimaryVertical = computed<BusinessVertical>(() => {
    const bt = this._selectedBusinessType();
    return bt?.vertical ?? 'food_and_drink';
  });

  readonly selectedVerticals = computed<BusinessVertical[]>(() => {
    return [this.effectivePrimaryVertical()];
  });

  // --- Step 3: Annual Revenue ---
  readonly _selectedRevenue = signal<string | null>(null);

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

  readonly isLoading = this.platformService.isLoading;

  // --- Step validation ---
  readonly canProceed = computed(() => {
    const step = this._currentStep();
    switch (step) {
      case 1: return this._businessName().trim().length > 0;
      case 2: return this._selectedBusinessType() !== null;
      case 3: return this._selectedRevenue() !== null;
      case 4: return true; // welcome screen — always can proceed
      case 5: return !this._isSubmitting();
      default: return false;
    }
  });

  // --- Navigation ---

  next(): void {
    const current = this._currentStep();
    if (current < TOTAL_STEPS) {
      this._currentStep.set(current + 1);
    }
  }

  prev(): void {
    const current = this._currentStep();
    if (current > 1) {
      this._currentStep.set(current - 1);
    }
  }

  // --- Step 1: Address helpers ---

  updateAddress(field: keyof BusinessAddress, value: string): void {
    this._address.update(a => ({ ...a, [field]: value }));
  }

  // --- Step 2: Business Type selection ---

  selectBusinessType(type: BusinessCategory): void {
    this._selectedBusinessType.set(type);
  }

  getVerticalLabel(vertical: BusinessVertical): string {
    return BUSINESS_VERTICAL_CATALOG.find(c => c.vertical === vertical)?.label ?? vertical;
  }

  // --- Step 3: Revenue selection ---

  selectRevenue(id: string): void {
    this._selectedRevenue.set(id);
  }

  // --- Step 4: Welcome → Submit onboarding ---

  async submitAndContinue(): Promise<void> {
    this._isSubmitting.set(true);
    this._submitError.set(null);

    const detectedMode = this.autoDetectedMode();

    const payload: OnboardingPayload = {
      businessName: this._businessName(),
      address: { ...this._address(), phone: this._phone() || null },
      verticals: this.selectedVerticals(),
      primaryVertical: this.effectivePrimaryVertical(),
      complexity: 'full',
      defaultDeviceMode: detectedMode,
      taxLocale: defaultTaxLocaleConfig(),
      businessHours: defaultBusinessHours(),
      paymentProcessor: 'none',
      menuTemplateId: null,
      ownerPin: {
        displayName: '',
        pin: '',
        role: 'owner',
      },
      ownerEmail: '',
      ownerPassword: '',
    };

    const result = await this.platformService.completeOnboarding(payload);

    this._isSubmitting.set(false);

    if (result) {
      this.authService.selectRestaurant(result.restaurantId, payload.businessName);
      this._submitSuccess.set(true);
      await this.goToDashboard(detectedMode);
    } else {
      this._submitError.set(this.platformService.error() ?? 'Something went wrong');
    }
  }

  async skipToHome(): Promise<void> {
    await this.submitAndContinue();
  }

  private async goToDashboard(mode: DevicePosMode): Promise<void> {
    const device = await this.deviceService.registerBrowserDevice(mode);
    if (!device) {
      this._submitError.set(this.deviceService.error() ?? 'Failed to register device');
      return;
    }

    this.platformService.setDeviceModeFromDevice(mode);
    this.router.navigate(['/home']);
  }
}
