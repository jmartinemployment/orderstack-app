import { Component, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  BusinessVertical,
  BusinessVerticalConfig,
  BusinessAddress,
  PlatformComplexity,
  DevicePosMode,
  DevicePosModeConfig,
  TaxLocaleConfig,
  BusinessHoursDay,
  OnboardingPinData,
  MenuTemplate,
  BUSINESS_VERTICAL_CATALOG,
  DEVICE_POS_MODE_CATALOG,
  getModesForVerticals,
  getModulesForVerticals,
  defaultBusinessAddress,
  defaultTaxLocaleConfig,
  defaultBusinessHours,
  PaymentProcessorType,
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

const TOTAL_STEPS = 12;

type QuickAddItemType = 'item' | 'combo' | 'inventory';

interface QuickSuggestion {
  name: string;
  price: number;
  category: string;
  unit?: string;
  comboItems?: string;
  sideUpgrades?: string;
  includes?: string;
}

interface SuggestionGroup {
  category: string;
  items: QuickSuggestion[];
}

const MENU_SUGGESTIONS_BEFORE_SIDES: SuggestionGroup[] = [
  {
    category: 'Appetizers',
    items: [
      { name: 'Wings', price: 12.99, category: 'Appetizers', includes: 'Choice of Buffalo, BBQ, or Garlic Parmesan sauce, celery, ranch' },
      { name: 'Mozzarella Sticks', price: 9.99, category: 'Appetizers', includes: 'Marinara sauce' },
      { name: 'Nachos', price: 11.99, category: 'Appetizers', includes: 'Cheese, jalapeños, sour cream, pico de gallo' },
      { name: 'Soup of the Day', price: 6.99, category: 'Appetizers', includes: 'Crackers' },
      { name: 'Onion Rings', price: 8.99, category: 'Appetizers', includes: 'Ranch dipping sauce' },
      { name: 'Bruschetta', price: 9.99, category: 'Appetizers', includes: 'Diced tomatoes, basil, garlic, olive oil, toasted bread' },
    ],
  },
  {
    category: 'Entrees',
    items: [
      { name: 'Cheeseburger', price: 13.99, category: 'Entrees', includes: 'Lettuce, tomato, pickle, onion, ketchup, mustard' },
      { name: 'Grilled Chicken', price: 16.99, category: 'Entrees', includes: 'Seasonal vegetables, rice' },
      { name: 'Salmon', price: 22.99, category: 'Entrees', includes: 'Lemon butter sauce, rice, asparagus' },
      { name: 'Ribeye Steak', price: 28.99, category: 'Entrees', includes: 'Baked potato, steamed broccoli' },
      { name: 'Fish & Chips', price: 15.99, category: 'Entrees', includes: 'Beer-battered cod, french fries, coleslaw, tartar sauce' },
      { name: 'Pasta Primavera', price: 14.99, category: 'Entrees', includes: 'Penne, sautéed vegetables, cream sauce, parmesan' },
      { name: 'Chicken Sandwich', price: 12.99, category: 'Entrees', includes: 'Lettuce, tomato, pickle, mayo, brioche bun' },
      { name: 'Tacos', price: 11.99, category: 'Entrees', includes: 'Lettuce, cheese, pico de gallo, sour cream, salsa' },
      { name: 'Pizza', price: 14.99, category: 'Entrees', includes: 'Mozzarella, tomato sauce (add toppings for extra)' },
    ],
  },
];

const MENU_SUGGESTIONS_AFTER_SIDES: SuggestionGroup[] = [
  {
    category: 'Drinks',
    items: [
      { name: 'Soft Drink', price: 2.99, category: 'Drinks', includes: 'Coke, Sprite, Dr Pepper, Lemonade' },
      { name: 'Iced Tea', price: 2.99, category: 'Drinks', includes: 'Sweet or unsweetened' },
      { name: 'Coffee', price: 3.49, category: 'Drinks', includes: 'Regular or decaf, cream & sugar' },
      { name: 'Lemonade', price: 3.49, category: 'Drinks', includes: 'Fresh-squeezed' },
      { name: 'Juice', price: 3.99, category: 'Drinks', includes: 'Orange, apple, or cranberry' },
      { name: 'Milkshake', price: 5.99, category: 'Drinks', includes: 'Chocolate, vanilla, or strawberry, whipped cream' },
      { name: 'Water', price: 1.49, category: 'Drinks' },
    ],
  },
  {
    category: 'Desserts',
    items: [
      { name: 'Chocolate Cake', price: 8.99, category: 'Desserts', includes: 'Triple layer, chocolate ganache' },
      { name: 'Cheesecake', price: 8.99, category: 'Desserts', includes: 'Berry compote, whipped cream' },
      { name: 'Ice Cream Sundae', price: 6.99, category: 'Desserts', includes: 'Vanilla, chocolate, or strawberry, whipped cream, cherry' },
      { name: 'Brownie', price: 7.99, category: 'Desserts', includes: 'Warm brownie, vanilla ice cream, chocolate drizzle' },
    ],
  },
];

const COMBO_SUGGESTIONS: SuggestionGroup[] = [
  {
    category: 'Steak Combos',
    items: [
      { name: 'Steak & Baked Potato', price: 26.99, category: 'Combos', comboItems: 'Ribeye Steak, Baked Potato, Side Salad' },
      { name: 'Steak & Mashed Potatoes', price: 25.99, category: 'Combos', comboItems: 'Ribeye Steak, Mashed Potatoes, Steamed Vegetables' },
      { name: 'Steak & Fries', price: 24.99, category: 'Combos', comboItems: 'Ribeye Steak, French Fries, Coleslaw' },
    ],
  },
  {
    category: 'Burger Combos',
    items: [
      { name: 'Burger & Fries', price: 12.99, category: 'Combos', comboItems: 'Cheeseburger, French Fries, Soft Drink' },
      { name: 'Burger & Onion Rings', price: 13.99, category: 'Combos', comboItems: 'Cheeseburger, Onion Rings, Soft Drink' },
      { name: 'Double Burger & Fries', price: 15.99, category: 'Combos', comboItems: 'Double Cheeseburger, French Fries, Soft Drink' },
    ],
  },
  {
    category: 'Chicken Combos',
    items: [
      { name: 'Chicken & Rice', price: 15.99, category: 'Combos', comboItems: 'Grilled Chicken, Rice, Steamed Vegetables' },
      { name: 'Chicken Tenders & Fries', price: 12.99, category: 'Combos', comboItems: 'Chicken Tenders, French Fries, Ranch' },
      { name: 'Chicken Sandwich & Fries', price: 13.99, category: 'Combos', comboItems: 'Chicken Sandwich, French Fries, Soft Drink' },
    ],
  },
  {
    category: 'Seafood Combos',
    items: [
      { name: 'Salmon & Rice', price: 22.99, category: 'Combos', comboItems: 'Salmon Fillet, Rice, Steamed Vegetables' },
      { name: 'Fish & Chips', price: 14.99, category: 'Combos', comboItems: 'Fried Fish, French Fries, Coleslaw' },
      { name: 'Shrimp & Fries', price: 16.99, category: 'Combos', comboItems: 'Fried Shrimp, French Fries, Hush Puppies' },
    ],
  },
  {
    category: 'Kids Meals',
    items: [
      { name: 'Kids Burger & Fries', price: 7.99, category: 'Combos', comboItems: 'Mini Burger, Fries, Juice Box' },
      { name: 'Kids Chicken Tenders & Fries', price: 7.99, category: 'Combos', comboItems: 'Chicken Tenders, Fries, Juice Box' },
      { name: 'Kids Mac & Cheese', price: 6.99, category: 'Combos', comboItems: 'Mac & Cheese, Apple Slices, Juice Box' },
      { name: 'Kids Grilled Cheese & Fries', price: 6.99, category: 'Combos', comboItems: 'Grilled Cheese, Fries, Juice Box' },
    ],
  },
];

const SIDE_SUGGESTIONS: string[] = [
  'French Fries', 'Sweet Potato Fries', 'Onion Rings', 'Coleslaw',
  'Side Salad', 'Baked Potato', 'Mashed Potatoes', 'Rice',
  'Steamed Vegetables', 'Mac & Cheese', 'Corn on the Cob', 'Fruit Cup',
];

const INVENTORY_SUGGESTIONS: SuggestionGroup[] = [
  {
    category: 'Produce',
    items: [
      { name: 'Lettuce', price: 2.50, category: 'Produce', unit: 'head' },
      { name: 'Tomatoes', price: 2.99, category: 'Produce', unit: 'lb' },
      { name: 'Onions', price: 1.49, category: 'Produce', unit: 'lb' },
      { name: 'Pickles', price: 4.99, category: 'Produce', unit: 'jar' },
      { name: 'Jalapeños', price: 1.99, category: 'Produce', unit: 'lb' },
      { name: 'Avocado', price: 1.50, category: 'Produce', unit: 'each' },
      { name: 'Lemons', price: 0.50, category: 'Produce', unit: 'each' },
      { name: 'Mushrooms', price: 3.99, category: 'Produce', unit: 'lb' },
    ],
  },
  {
    category: 'Dairy & Cheese',
    items: [
      { name: 'Cheddar Cheese', price: 6.99, category: 'Dairy & Cheese', unit: 'lb' },
      { name: 'Mozzarella', price: 5.99, category: 'Dairy & Cheese', unit: 'lb' },
      { name: 'Sour Cream', price: 3.49, category: 'Dairy & Cheese', unit: 'tub' },
      { name: 'Butter', price: 4.99, category: 'Dairy & Cheese', unit: 'lb' },
      { name: 'Heavy Cream', price: 5.49, category: 'Dairy & Cheese', unit: 'qt' },
      { name: 'Eggs', price: 4.99, category: 'Dairy & Cheese', unit: 'dozen' },
    ],
  },
  {
    category: 'Sauces & Condiments',
    items: [
      { name: 'Ketchup', price: 4.99, category: 'Sauces & Condiments', unit: 'bottle' },
      { name: 'Mustard', price: 3.49, category: 'Sauces & Condiments', unit: 'bottle' },
      { name: 'Mayo', price: 4.49, category: 'Sauces & Condiments', unit: 'jar' },
      { name: 'BBQ Sauce', price: 5.99, category: 'Sauces & Condiments', unit: 'bottle' },
      { name: 'Hot Sauce', price: 3.99, category: 'Sauces & Condiments', unit: 'bottle' },
      { name: 'Ranch Dressing', price: 4.99, category: 'Sauces & Condiments', unit: 'bottle' },
    ],
  },
];

interface QuickAddItem {
  name: string;
  price: number;
  category: string;
  type: QuickAddItemType;
  unit?: string;
  includes?: string;
  comboItems?: string;
  sideUpgrades?: string;
}

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
  readonly verticalCatalog = BUSINESS_VERTICAL_CATALOG.filter(c => c.vertical === 'food_and_drink');
  readonly totalSteps = TOTAL_STEPS;
  readonly menuSuggestionsBeforeSides = MENU_SUGGESTIONS_BEFORE_SIDES;
  readonly menuSuggestionsAfterSides = MENU_SUGGESTIONS_AFTER_SIDES;
  readonly comboSuggestions = COMBO_SUGGESTIONS;
  readonly inventorySuggestions = INVENTORY_SUGGESTIONS;
  readonly sideSuggestions = SIDE_SUGGESTIONS;

  // --- Wizard navigation ---
  readonly _currentStep = signal(1);
  readonly currentStep = this._currentStep.asReadonly();

  readonly progressPercent = computed(() =>
    Math.round((this._currentStep() / TOTAL_STEPS) * 100)
  );

  // --- Step 1: Business Info ---
  readonly _businessName = signal('');
  readonly _address = signal<BusinessAddress>(defaultBusinessAddress());
  readonly _phone = signal('');

  // --- Step 2: Verticals ---
  readonly _selectedVerticals = signal<BusinessVertical[]>([]);

  // --- Step 3: Primary Vertical ---
  readonly _primaryVertical = signal<BusinessVertical | null>(null);

  readonly showStep3 = computed(() => this._selectedVerticals().length > 1);

  readonly effectivePrimaryVertical = computed<BusinessVertical>(() => {
    const verticals = this._selectedVerticals();
    if (verticals.length === 1) return verticals[0];
    return this._primaryVertical() ?? verticals[0];
  });

  // --- Step 4: Complexity ---
  readonly _complexity = signal<PlatformComplexity>('full');

  // --- Step 5: Tax & Locale ---
  readonly _taxLocale = signal<TaxLocaleConfig>(defaultTaxLocaleConfig());
  readonly _isAutoDetecting = signal(false);

  // --- Step 6: Business Hours ---
  readonly _businessHours = signal<BusinessHoursDay[]>(defaultBusinessHours());

  // --- Step 5: Recommended Mode ---
  readonly _selectedMode = signal<DevicePosMode>('full_service');
  readonly _showAllModes = signal(false);

  private readonly hiddenModes: DevicePosMode[] = ['retail', 'services'];

  readonly availableModes = computed<DevicePosModeConfig[]>(() => {
    const modes = getModesForVerticals(this._selectedVerticals());
    return DEVICE_POS_MODE_CATALOG.filter(c => modes.includes(c.mode) && !this.hiddenModes.includes(c.mode));
  });

  readonly otherModes = computed<DevicePosModeConfig[]>(() => {
    const modes = getModesForVerticals(this._selectedVerticals());
    return DEVICE_POS_MODE_CATALOG.filter(c => !modes.includes(c.mode) && !this.hiddenModes.includes(c.mode));
  });

  readonly recommendedMode = computed<DevicePosModeConfig | undefined>(() => {
    const primary = this.effectivePrimaryVertical();
    const complexity = this._complexity();
    let mode: DevicePosMode = 'full_service';
    if (primary === 'food_and_drink') {
      switch (complexity) {
        case 'full': mode = 'full_service'; break;
        case 'catalog': mode = 'quick_service'; break;
        case 'payments_only': mode = 'standard'; break;
      }
    } else if (primary === 'retail' || primary === 'grocery') {
      mode = 'retail';
    } else {
      mode = 'standard';
    }
    return DEVICE_POS_MODE_CATALOG.find(c => c.mode === mode);
  });

  // --- Step 8: Payment ---
  readonly _paymentProcessor = signal<PaymentProcessorType>('none');

  // --- Step 9: Menu Setup ---
  readonly _menuTemplates = this.platformService.menuTemplates;
  readonly _selectedTemplateId = signal<string | null>(null);
  readonly _quickAddItems = signal<QuickAddItem[]>([]);
  readonly _quickAddName = signal('');
  readonly _quickAddPrice = signal(0);
  readonly _quickAddCategory = signal('');
  readonly _quickAddType = signal<QuickAddItemType>('item');
  readonly _quickAddUnit = signal('');
  readonly _quickAddComboItems = signal('');
  readonly _quickAddIncludes = signal('');
  readonly _quickAddSideUpgrades = signal('');
  readonly _quickAddUpcharge = signal(0);

  readonly quickAddItemsByType = computed(() => {
    const items = this._quickAddItems();
    return {
      items: items.filter(i => i.type === 'item'),
      combos: items.filter(i => i.type === 'combo'),
      inventory: items.filter(i => i.type === 'inventory'),
    };
  });

  readonly addedItemNames = computed(() =>
    new Set(this._quickAddItems().map(i => i.name))
  );

  // --- Step 10: Owner PIN ---
  readonly _ownerName = signal('');
  readonly _ownerPin = signal('');
  readonly _ownerPinConfirm = signal('');
  readonly _pinConfirming = signal(false);
  readonly _ownerEmail = signal('');
  readonly _ownerPassword = signal('');

  readonly pinMatch = computed(() => {
    const pin = this._ownerPin();
    const confirm = this._ownerPinConfirm();
    return pin.length >= 4 && pin === confirm;
  });

  // --- Step 11: Confirmation ---
  readonly _isSubmitting = signal(false);
  readonly _submitError = signal<string | null>(null);
  readonly _submitSuccess = signal(false);

  readonly isLoading = this.platformService.isLoading;

  // --- Step validation ---

  readonly canProceed = computed(() => {
    const step = this._currentStep();
    switch (step) {
      case 1: return this._businessName().trim().length > 0;
      case 2: return this._selectedVerticals().length > 0;
      case 3: return this._primaryVertical() !== null;
      case 4: return true;
      case 5: return this._selectedMode() !== null;
      case 6: return this._taxLocale().taxRate > 0;
      case 7: return true;
      case 8: return true;
      case 9: return true;
      case 10: return true;
      case 11: return this._ownerName().trim().length > 0 && this.pinMatch() && this._ownerEmail().includes('@') && this._ownerPassword().length >= 6;
      case 12: return !this._isSubmitting();
      default: return false;
    }
  });

  // --- Navigation ---

  next(): void {
    const current = this._currentStep();
    if (current < TOTAL_STEPS) {
      const nextStep = current + 1;
      if (nextStep === 5) {
        this._showAllModes.set(false);
        const rec = this.recommendedMode();
        if (rec) {
          this._selectedMode.set(rec.mode);
        }
      }
      if (nextStep === 9 && this._complexity() !== 'payments_only') {
        this.platformService.loadMenuTemplates(this.effectivePrimaryVertical());
      }
      this._currentStep.set(nextStep);
    }
  }

  prev(): void {
    const current = this._currentStep();
    if (current > 1) {
      this._currentStep.set(current - 1);
    }
  }

  goToStep(step: number): void {
    if (step >= 1 && step <= this._currentStep()) {
      this._currentStep.set(step);
    }
  }

  // --- Step 1: Address helpers ---

  updateAddress(field: keyof BusinessAddress, value: string): void {
    this._address.update(a => ({ ...a, [field]: value }));
  }

  // --- Step 2: Vertical selection ---

  toggleVertical(vertical: BusinessVertical): void {
    this._selectedVerticals.update(vs => {
      if (vs.includes(vertical)) {
        return vs.filter(v => v !== vertical);
      }
      return [...vs, vertical];
    });
  }

  isVerticalSelected(vertical: BusinessVertical): boolean {
    return this._selectedVerticals().includes(vertical);
  }

  getVerticalConfig(vertical: BusinessVertical): BusinessVerticalConfig | undefined {
    return BUSINESS_VERTICAL_CATALOG.find(c => c.vertical === vertical);
  }

  // --- Step 6: Tax auto-detect ---

  async autoDetectTax(): Promise<void> {
    const profile = this.platformService.merchantProfile();
    const address = profile?.address ?? this._address();

    this._isAutoDetecting.set(true);

    // Try API first, fall back to state-based estimate
    let rate: number | null = null;
    if (address.state) {
      rate = await this.platformService.lookupTaxRate(address.state, address.zip);
    }
    if (rate === null) {
      rate = this.estimateStateTaxRate(address.state);
    }

    this._isAutoDetecting.set(false);

    if (rate !== null) {
      this._taxLocale.update(t => ({ ...t, taxRate: rate }));
    }
  }

  private estimateStateTaxRate(state: string): number {
    const rates: Record<string, number> = {
      AL: 4, AK: 0, AZ: 5.6, AR: 6.5, CA: 7.25, CO: 2.9, CT: 6.35,
      DE: 0, FL: 6, GA: 4, HI: 4, ID: 6, IL: 6.25, IN: 7, IA: 6,
      KS: 6.5, KY: 6, LA: 4.45, ME: 5.5, MD: 6, MA: 6.25, MI: 6,
      MN: 6.875, MS: 7, MO: 4.225, MT: 0, NE: 5.5, NV: 6.85,
      NH: 0, NJ: 6.625, NM: 5.125, NY: 4, NC: 4.75, ND: 5, OH: 5.75,
      OK: 4.5, OR: 0, PA: 6, RI: 7, SC: 6, SD: 4.5, TN: 7,
      TX: 6.25, UT: 6.1, VT: 6, VA: 5.3, WA: 6.5, WV: 6, WI: 5, WY: 4, DC: 6,
    };
    return rates[state] ?? 6;
  }

  updateTaxLocale(field: keyof TaxLocaleConfig, value: unknown): void {
    this._taxLocale.update(t => ({ ...t, [field]: value }));
  }

  // --- Step 6: Business Hours ---

  updateHoursField(dayIndex: number, field: 'open' | 'close', value: string): void {
    this._businessHours.update(days => {
      const updated = [...days];
      updated[dayIndex] = { ...updated[dayIndex], [field]: value };
      return updated;
    });
  }

  toggleClosed(dayIndex: number): void {
    this._businessHours.update(days => {
      const updated = [...days];
      updated[dayIndex] = { ...updated[dayIndex], closed: !updated[dayIndex].closed };
      return updated;
    });
  }

  copyToAll(dayIndex: number): void {
    const source = this._businessHours()[dayIndex];
    this._businessHours.update(days =>
      days.map(d => ({ ...d, open: source.open, close: source.close, closed: source.closed }))
    );
  }

  applyHoursPreset(open: string, close: string): void {
    this._businessHours.update(days =>
      days.map(d => ({ ...d, open, close, closed: false }))
    );
  }

  // --- Step 5: Mode selection ---

  selectMode(mode: DevicePosMode): void {
    this._selectedMode.set(mode);
    this._showAllModes.set(false);
  }

  acceptRecommendedMode(): void {
    const rec = this.recommendedMode();
    if (rec) {
      this._selectedMode.set(rec.mode);
    }
  }

  toggleAllModes(): void {
    this._showAllModes.update(v => !v);
  }

  // --- Step 9: Menu templates ---

  async loadTemplates(): Promise<void> {
    await this.platformService.loadMenuTemplates(this.effectivePrimaryVertical());
  }

  selectTemplate(id: string | null): void {
    this._selectedTemplateId.set(id);
  }

  addQuickItem(): void {
    const name = this._quickAddName().trim();
    const price = this._quickAddPrice();
    const category = this._quickAddCategory().trim();
    const includes = this._quickAddIncludes().trim();
    const sideUpgrades = this._quickAddSideUpgrades().trim();
    const upcharge = this._quickAddUpcharge();

    if (!name || price <= 0) return;

    // Build side upgrades string with upcharge if provided
    let sideUpgradesFinal = sideUpgrades;
    if (sideUpgrades && upcharge > 0) {
      sideUpgradesFinal = `${sideUpgrades} +$${upcharge.toFixed(2)}`;
    }

    const item: QuickAddItem = {
      name,
      price,
      category: category || 'General',
      type: 'item',
      ...(includes ? { includes } : {}),
      ...(sideUpgradesFinal ? { sideUpgrades: sideUpgradesFinal } : {}),
    };

    this._quickAddItems.update(items => [...items, item]);
    this._quickAddName.set('');
    this._quickAddPrice.set(0);
    this._quickAddCategory.set('');
    this._quickAddIncludes.set('');
    this._quickAddSideUpgrades.set('');
    this._quickAddUpcharge.set(0);
  }

  removeQuickItem(index: number): void {
    this._quickAddItems.update(items => items.filter((_, i) => i !== index));
  }

  addSuggestion(suggestion: QuickSuggestion, type: QuickAddItemType): void {
    if (this.addedItemNames().has(suggestion.name)) {
      this._quickAddItems.update(items => items.filter(i => i.name !== suggestion.name));
      return;
    }

    // Populate the form fields so user can review/edit before adding
    this._quickAddName.set(suggestion.name);
    this._quickAddPrice.set(suggestion.price);
    this._quickAddCategory.set(suggestion.category);
  }

  toggleIngredient(name: string): void {
    const current = this._quickAddIncludes();
    const ingredients = current ? current.split(',').map(s => s.trim()).filter(Boolean) : [];
    const index = ingredients.indexOf(name);
    if (index >= 0) {
      ingredients.splice(index, 1);
    } else {
      ingredients.push(name);
    }
    this._quickAddIncludes.set(ingredients.join(', '));
  }

  readonly includedIngredientNames = computed(() => {
    const includes = this._quickAddIncludes();
    if (!includes) return new Set<string>();
    return new Set(includes.split(',').map(s => s.trim()).filter(Boolean));
  });

  toggleSide(name: string): void {
    const current = this._quickAddSideUpgrades();
    const sides = current ? current.split(',').map(s => s.trim()).filter(Boolean) : [];
    const index = sides.indexOf(name);
    if (index >= 0) {
      sides.splice(index, 1);
    } else {
      sides.push(name);
    }
    this._quickAddSideUpgrades.set(sides.join(', '));
  }

  readonly selectedSideNames = computed(() => {
    const sides = this._quickAddSideUpgrades();
    if (!sides) return new Set<string>();
    return new Set(sides.split(',').map(s => s.trim()).filter(Boolean));
  });

  // --- Step 10: PIN helpers ---

  appendPinDigit(digit: string): void {
    const current = this._ownerPin();
    if (current.length < 6) {
      this._ownerPin.set(current + digit);
    }
  }

  confirmPinEntry(): void {
    this._pinConfirming.set(true);
  }

  clearPin(): void {
    this._ownerPin.set('');
    this._pinConfirming.set(false);
    this._ownerPinConfirm.set('');
  }

  appendConfirmDigit(digit: string): void {
    const current = this._ownerPinConfirm();
    if (current.length < 6) {
      this._ownerPinConfirm.set(current + digit);
    }
  }

  clearConfirmPin(): void {
    this._ownerPinConfirm.set('');
  }

  // --- Step 11: Submit ---

  async submit(): Promise<void> {
    this._isSubmitting.set(true);
    this._submitError.set(null);

    const payload: OnboardingPayload = {
      businessName: this._businessName(),
      address: { ...this._address(), phone: this._phone() || null },
      verticals: this._selectedVerticals(),
      primaryVertical: this.effectivePrimaryVertical(),
      complexity: this._complexity(),
      defaultDeviceMode: this._selectedMode(),
      taxLocale: this._taxLocale(),
      businessHours: this._businessHours(),
      paymentProcessor: this._paymentProcessor(),
      menuTemplateId: this._selectedTemplateId(),
      ownerPin: {
        displayName: this._ownerName(),
        pin: this._ownerPin(),
        role: 'owner',
      },
      ownerEmail: this._ownerEmail(),
      ownerPassword: this._ownerPassword(),
    };

    const result = await this.platformService.completeOnboarding(payload);

    this._isSubmitting.set(false);

    if (result) {
      this.authService.selectRestaurant(result.restaurantId, payload.businessName);
      this._submitSuccess.set(true);
    } else {
      this._submitError.set(this.platformService.error() ?? 'Something went wrong');
    }
  }

  // --- Summary helpers for Step 11 ---

  getVerticalLabels(): string {
    return this._selectedVerticals()
      .map(v => BUSINESS_VERTICAL_CATALOG.find(c => c.vertical === v)?.label ?? v)
      .join(', ');
  }

  getModeLabel(): string {
    return DEVICE_POS_MODE_CATALOG.find(c => c.mode === this._selectedMode())?.label ?? this._selectedMode();
  }

  getComplexityLabel(): string {
    switch (this._complexity()) {
      case 'full': return 'Full (Payments + Catalog + Inventory)';
      case 'catalog': return 'Catalog (Payments + Catalog)';
      case 'payments_only': return 'Payments Only';
    }
  }

  getPaymentLabel(): string {
    switch (this._paymentProcessor()) {
      case 'paypal': return 'PayPal Zettle';
      case 'stripe': return 'Stripe';
      case 'none': return 'Cash Only / Set Up Later';
    }
  }

  getTemplateName(): string {
    const id = this._selectedTemplateId();
    if (!id) return 'Start from scratch';
    return this._menuTemplates()?.find(t => t.id === id)?.name ?? id;
  }

  // --- Time generation for selects ---

  readonly timeOptions = this.generateTimeOptions();

  private generateTimeOptions(): string[] {
    const options: string[] = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 15) {
        const hh = String(h).padStart(2, '0');
        const mm = String(m).padStart(2, '0');
        options.push(`${hh}:${mm}`);
      }
    }
    return options;
  }

  formatTime(time: string): string {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hour}:${String(m).padStart(2, '0')} ${period}`;
  }

  capitalizeDay(day: string): string {
    return day.charAt(0).toUpperCase() + day.slice(1);
  }

  goToDashboard(): void {
    // After onboarding, skip formal device pairing — use default mode
    const defaultMode = this._selectedMode();
    this.deviceService.skipDeviceSetup(defaultMode);
    this.platformService.setDeviceModeFromDevice(defaultMode);

    // Go to POS login (PIN screen)
    this.router.navigate(['/pos-login']);
  }
}
