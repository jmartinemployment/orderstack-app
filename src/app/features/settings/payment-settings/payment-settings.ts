import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RestaurantSettingsService } from '@services/restaurant-settings';
import { PaymentProcessorType, PaymentSettings } from '@models/index';

@Component({
  selector: 'os-payment-settings',
  templateUrl: './payment-settings.html',
  styleUrl: './payment-settings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentSettingsComponent implements OnInit {
  private readonly settingsService = inject(RestaurantSettingsService);

  private readonly _processor = signal<PaymentProcessorType>('none');
  private readonly _requirePayment = signal(false);
  private readonly _surchargeEnabled = signal(false);
  private readonly _surchargePercent = signal(3.5);
  private readonly _saved = signal(false);

  readonly processor = this._processor.asReadonly();
  readonly requirePayment = this._requirePayment.asReadonly();
  readonly surchargeEnabled = this._surchargeEnabled.asReadonly();
  readonly surchargePercent = this._surchargePercent.asReadonly();
  readonly isSaving = this.settingsService.isSaving;
  readonly saved = this._saved.asReadonly();

  readonly isDirty = computed(() => {
    const current = this.settingsService.paymentSettings();
    return this._processor() !== current.processor
      || this._requirePayment() !== current.requirePaymentBeforeKitchen
      || this._surchargeEnabled() !== current.surchargeEnabled
      || this._surchargePercent() !== current.surchargePercent;
  });

  ngOnInit(): void {
    const s = this.settingsService.paymentSettings();
    this._processor.set(s.processor);
    this._requirePayment.set(s.requirePaymentBeforeKitchen);
    this._surchargeEnabled.set(s.surchargeEnabled);
    this._surchargePercent.set(s.surchargePercent);
  }

  onProcessorChange(event: Event): void {
    this._processor.set((event.target as HTMLInputElement).value as PaymentProcessorType);
    this._saved.set(false);
  }

  onRequirePaymentChange(event: Event): void {
    this._requirePayment.set((event.target as HTMLInputElement).checked);
    this._saved.set(false);
  }

  onSurchargeEnabledChange(event: Event): void {
    this._surchargeEnabled.set((event.target as HTMLInputElement).checked);
    this._saved.set(false);
  }

  onSurchargePercentChange(event: Event): void {
    const value = Number.parseFloat((event.target as HTMLInputElement).value) || 0;
    this._surchargePercent.set(Math.max(0, Math.min(10, value)));
    this._saved.set(false);
  }

  async save(): Promise<void> {
    const settings: PaymentSettings = {
      processor: this._processor(),
      requirePaymentBeforeKitchen: this._requirePayment(),
      surchargeEnabled: this._surchargeEnabled(),
      surchargePercent: this._surchargePercent(),
    };
    await this.settingsService.savePaymentSettings(settings);
    this._saved.set(true);
  }

  discard(): void {
    const s = this.settingsService.paymentSettings();
    this._processor.set(s.processor);
    this._requirePayment.set(s.requirePaymentBeforeKitchen);
    this._surchargeEnabled.set(s.surchargeEnabled);
    this._surchargePercent.set(s.surchargePercent);
    this._saved.set(false);
  }
}
