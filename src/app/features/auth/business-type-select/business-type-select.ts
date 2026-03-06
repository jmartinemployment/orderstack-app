import { Component, signal, computed, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PlatformService } from '@services/platform';
import { AuthService } from '@services/auth';

type BusinessTypeOption = 'catering' | 'full_service';

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

@Component({
  selector: 'os-business-type-select',
  imports: [FormsModule],
  templateUrl: './business-type-select.html',
  styleUrl: './business-type-select.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BusinessTypeSelect {
  private readonly router = inject(Router);
  private readonly platformService = inject(PlatformService);
  private readonly authService = inject(AuthService);

  readonly states = US_STATES;

  readonly businessName = signal('');
  readonly street = signal('');
  readonly city = signal('');
  readonly state = signal('');
  readonly zip = signal('');
  readonly phone = signal('');
  readonly selected = signal<BusinessTypeOption | null>(null);
  readonly isSubmitting = signal(false);
  readonly error = signal<string | null>(null);

  readonly canProceed = computed(() =>
    this.businessName().trim().length > 0
    && this.street().trim().length > 0
    && this.city().trim().length > 0
    && this.state().trim().length > 0
    && this.zip().trim().length >= 5
    && this.selected() !== null
    && !this.isSubmitting()
  );

  select(type: BusinessTypeOption): void {
    this.selected.set(type);
  }

  async next(): Promise<void> {
    const type = this.selected();
    const name = this.businessName().trim();
    if (!type || !name) return;

    this.isSubmitting.set(true);
    this.error.set(null);

    const businessCategory = type === 'catering' ? 'Caterer' : 'Full Service Restaurant';
    const defaultDeviceMode = type === 'catering' ? 'catering' : 'full_service';

    const result = await this.platformService.createMerchantEarly(
      name,
      businessCategory,
      'food_and_drink',
      defaultDeviceMode,
      {
        street: this.street().trim(),
        city: this.city().trim(),
        state: this.state().trim(),
        zip: this.zip().trim(),
        phone: this.phone().trim() || null,
      },
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

    this.authService.selectMerchant(merchantId, name);
    localStorage.setItem('pending_business_type', type);
    this.router.navigate(['/setup']);
  }
}
