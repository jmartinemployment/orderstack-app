import { Component, signal, computed, ChangeDetectionStrategy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PlatformService } from '@services/platform';
import { AuthService } from '@services/auth';

type BusinessTypeOption = 'catering' | 'full_service';

const ZIP_REGEX = /^\d{5}(-\d{4})?$/;

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

  // Business type
  readonly selected = signal<BusinessTypeOption | null>(null);

  // Business info
  readonly businessName = signal('');
  readonly email = signal('');
  readonly address = signal('');
  readonly city = signal('');
  readonly state = signal('');
  readonly zip = signal('');

  readonly usStates = US_STATES;

  readonly isSubmitting = signal(false);
  readonly error = signal<string | null>(null);

  readonly canProceed = computed(() => {
    if (this.isSubmitting()) return false;
    if (!this.selected()) return false;
    if (this.businessName().trim().length === 0) return false;
    if (this.email().trim().length === 0) return false;
    if (!this.isValidAddress()) return false;
    return true;
  });

  constructor() {
    // Pre-fill email from auth user or localStorage
    const userEmail = this.authService.user()?.email;
    const pendingEmail = localStorage.getItem('pending_email');
    if (userEmail) {
      this.email.set(userEmail);
    } else if (pendingEmail) {
      this.email.set(pendingEmail);
    }
  }

  select(type: BusinessTypeOption): void {
    this.selected.set(type);
  }

  async next(): Promise<void> {
    const type = this.selected();
    if (!type || !this.canProceed()) return;

    this.isSubmitting.set(true);
    this.error.set(null);

    const businessCategory = type === 'catering' ? 'Caterer' : 'Full Service Restaurant';
    const defaultDeviceMode = type === 'catering' ? 'catering' : 'full_service';

    const result = await this.platformService.createMerchantEarly({
      businessName: this.businessName().trim(),
      businessCategory,
      primaryVertical: 'food_and_drink',
      defaultDeviceMode,
      email: this.email().trim(),
      address: this.address().trim(),
      city: this.city().trim(),
      state: this.state(),
      zip: this.zip().trim(),
    });

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

    this.authService.selectMerchant(merchantId, this.businessName().trim());
    this.authService.clearPendingCredentials();
    localStorage.setItem('pending_business_type', type);
    this.router.navigate(['/setup']);
  }

  private isValidAddress(): boolean {
    const street = this.address().trim();
    if (street.length < 5) return false;
    if (/\d/.exec(street) === null || /[a-zA-Z]/.exec(street) === null) return false;
    if (this.city().trim().length === 0) return false;
    if (this.state().trim().length === 0) return false;
    if (ZIP_REGEX.exec(this.zip().trim()) === null) return false;
    return true;
  }
}
