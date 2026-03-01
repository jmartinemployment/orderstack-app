import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '@services/auth';
import { StaffManagementService } from '@services/staff-management';

@Component({
  selector: 'os-team-onboarding',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './team-onboarding.html',
  styleUrl: './team-onboarding.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamOnboarding {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly staffService = inject(StaffManagementService);

  private readonly _isSaving = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _currentStep = signal(0);

  readonly isSaving = this._isSaving.asReadonly();
  readonly error = this._error.asReadonly();
  readonly currentStep = this._currentStep.asReadonly();

  readonly userName = computed(() => {
    const user = this.authService.user();
    if (!user) return '';
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
    return name || user.email;
  });

  readonly steps = [
    { key: 'personal_info', label: 'Personal Information', icon: 'bi-person-vcard' },
    { key: 'emergency', label: 'Emergency Contact', icon: 'bi-telephone' },
    { key: 'acknowledgment', label: 'Handbook Acknowledgment', icon: 'bi-file-earmark-check' },
  ] as const;

  readonly totalSteps = this.steps.length;

  readonly progress = computed(() => Math.round((this._currentStep() / this.totalSteps) * 100));

  readonly personalForm = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    address: [''],
    city: [''],
    state: [''],
    zip: [''],
    phone: ['', Validators.required],
  });

  readonly emergencyForm = this.fb.group({
    emergencyName: ['', Validators.required],
    emergencyPhone: ['', Validators.required],
    emergencyRelation: [''],
  });

  private readonly _handbookAcknowledged = signal(false);
  readonly handbookAcknowledged = this._handbookAcknowledged.asReadonly();

  constructor() {
    // Pre-fill from user data if available
    const user = this.authService.user();
    if (user) {
      this.personalForm.patchValue({
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
      });
    }

    // Redirect if onboarding is already complete
    if (user?.onboardingStatus === 'complete') {
      this.router.navigate(['/administration']);
    }
  }

  toggleHandbookAcknowledged(): void {
    this._handbookAcknowledged.update(v => !v);
  }

  nextStep(): void {
    if (this._currentStep() < this.totalSteps - 1) {
      this._currentStep.update(s => s + 1);
    }
  }

  prevStep(): void {
    if (this._currentStep() > 0) {
      this._currentStep.update(s => s - 1);
    }
  }

  canProceed(): boolean {
    const step = this._currentStep();
    if (step === 0) return this.personalForm.valid;
    if (step === 1) return this.emergencyForm.valid;
    if (step === 2) return this._handbookAcknowledged();
    return false;
  }

  async submit(): Promise<void> {
    if (this._isSaving() || !this.canProceed()) return;

    const user = this.authService.user();
    if (!user) return;

    this._isSaving.set(true);
    this._error.set(null);

    const merchantId = this.authService.selectedMerchantId();
    if (!merchantId) {
      this._error.set('No restaurant selected');
      this._isSaving.set(false);
      return;
    }

    // Mark all onboarding steps as complete via the backend
    const success = await this.staffService.completeOnboarding(user.id);

    this._isSaving.set(false);

    if (success) {
      // Log the user out — they're done with the computer
      await this.authService.logout();
      this.router.navigate(['/login']);
    } else {
      this._error.set('Failed to complete onboarding. Please try again.');
    }
  }
}
