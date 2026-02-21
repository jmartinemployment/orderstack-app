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
import { PlatformService, OnboardingPayload } from '@services/platform';
import { AuthService } from '@services/auth';

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

const TOTAL_STEPS = 11;

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

  readonly usStates = US_STATES;
  readonly verticalCatalog = BUSINESS_VERTICAL_CATALOG;
  readonly totalSteps = TOTAL_STEPS;

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

  // --- Step 7: Device Mode ---
  readonly _selectedMode = signal<DevicePosMode>('full_service');

  readonly availableModes = computed<DevicePosModeConfig[]>(() => {
    const modes = getModesForVerticals(this._selectedVerticals());
    return DEVICE_POS_MODE_CATALOG.filter(c => modes.includes(c.mode));
  });

  // --- Step 8: Payment ---
  readonly _paymentProcessor = signal<PaymentProcessorType>('none');

  // --- Step 9: Menu Setup ---
  readonly _menuTemplates = this.platformService.menuTemplates;
  readonly _selectedTemplateId = signal<string | null>(null);
  readonly _quickAddItems = signal<{ name: string; price: number; category: string }[]>([]);
  readonly _quickAddName = signal('');
  readonly _quickAddPrice = signal(0);
  readonly _quickAddCategory = signal('');

  // --- Step 10: Owner PIN ---
  readonly _ownerName = signal('');
  readonly _ownerPin = signal('');
  readonly _ownerPinConfirm = signal('');
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
      case 1: return this._businessName().trim().length > 0 && this._address().state.length > 0;
      case 2: return this._selectedVerticals().length > 0;
      case 3: return this.effectivePrimaryVertical() !== null;
      case 4: return true;
      case 5: return true;
      case 6: return true;
      case 7: return this._selectedMode() !== null;
      case 8: return true;
      case 9: return true;
      case 10: return this._ownerName().trim().length > 0 && this.pinMatch() && this._ownerEmail().includes('@') && this._ownerPassword().length >= 6;
      case 11: return !this._isSubmitting();
      default: return false;
    }
  });

  // --- Navigation ---

  next(): void {
    const current = this._currentStep();
    if (current === 2 && !this.showStep3()) {
      this._currentStep.set(4);
      return;
    }
    if (current < TOTAL_STEPS) {
      this._currentStep.set(current + 1);
    }
  }

  prev(): void {
    const current = this._currentStep();
    if (current === 4 && !this.showStep3()) {
      this._currentStep.set(2);
      return;
    }
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

  // --- Step 5: Tax auto-detect ---

  async autoDetectTax(): Promise<void> {
    const address = this._address();
    if (!address.state) return;

    this._isAutoDetecting.set(true);
    const rate = await this.platformService.lookupTaxRate(address.state, address.zip);
    this._isAutoDetecting.set(false);

    if (rate !== null) {
      this._taxLocale.update(t => ({ ...t, taxRate: rate }));
    }
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

  // --- Step 7: Mode selection ---

  selectMode(mode: DevicePosMode): void {
    this._selectedMode.set(mode);
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
    if (!name || price <= 0) return;

    this._quickAddItems.update(items => [...items, { name, price, category: category || 'General' }]);
    this._quickAddName.set('');
    this._quickAddPrice.set(0);
    this._quickAddCategory.set('');
  }

  removeQuickItem(index: number): void {
    this._quickAddItems.update(items => items.filter((_, i) => i !== index));
  }

  // --- Step 10: PIN helpers ---

  appendPinDigit(digit: string): void {
    const current = this._ownerPin();
    if (current.length < 6) {
      this._ownerPin.set(current + digit);
    }
  }

  clearPin(): void {
    this._ownerPin.set('');
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
}
