import { Component, signal, computed, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { PlatformService } from '@services/platform';
import { AuthService } from '@services/auth';

type BusinessTypeOption = 'catering' | 'full_service';

@Component({
  selector: 'os-business-type-select',
  imports: [],
  templateUrl: './business-type-select.html',
  styleUrl: './business-type-select.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BusinessTypeSelect {
  private readonly router = inject(Router);
  private readonly platformService = inject(PlatformService);
  private readonly authService = inject(AuthService);

  readonly selected = signal<BusinessTypeOption | null>(null);
  readonly isSubmitting = signal(false);
  readonly error = signal<string | null>(null);

  readonly canProceed = computed(() =>
    this.selected() !== null && !this.isSubmitting()
  );

  select(type: BusinessTypeOption): void {
    this.selected.set(type);
  }

  async next(): Promise<void> {
    const type = this.selected();
    if (!type) return;

    this.isSubmitting.set(true);
    this.error.set(null);

    const businessCategory = type === 'catering' ? 'Caterer' : 'Full Service Restaurant';
    const defaultDeviceMode = type === 'catering' ? 'catering' : 'full_service';

    const result = await this.platformService.createMerchantEarly(
      businessCategory,
      businessCategory,
      'food_and_drink',
      defaultDeviceMode,
    );

    this.isSubmitting.set(false);

    if (!result) {
      this.error.set(this.platformService.error() ?? 'Failed to create your business. Please try again.');
      return;
    }

    const merchantId: string | undefined =
      result.merchantId
      ?? (result.restaurant?.['id'] as string | undefined);

    if (!merchantId || merchantId === 'undefined') {
      this.error.set('Something went wrong. Please try again.');
      return;
    }

    this.authService.selectMerchant(merchantId, businessCategory);
    localStorage.setItem('pending_business_type', type);
    this.router.navigate(['/setup']);
  }
}
