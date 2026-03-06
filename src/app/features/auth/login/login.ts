import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@services/auth';
import { ErrorDisplay } from '@shared/error-display/error-display';

@Component({
  selector: 'os-login',
  imports: [ReactiveFormsModule, ErrorDisplay],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly isLoading = this.authService.isLoading;
  readonly error = this.authService.error;
  readonly sessionExpiredMessage = this.authService.sessionExpiredMessage;

  private readonly _showPassword = signal(false);
  readonly showPassword = this._showPassword.asReadonly();

  private readonly _agreedToTerms = signal(false);
  readonly agreedToTerms = this._agreedToTerms.asReadonly();

  private readonly _infoMessage = signal<string | null>(null);
  readonly infoMessage = this._infoMessage.asReadonly();

  // Forgot password modal state
  private readonly _showForgotModal = signal(false);
  readonly showForgotModal = this._showForgotModal.asReadonly();

  private readonly _newPassword = signal('');
  readonly newPassword = this._newPassword.asReadonly();

  private readonly _showNewPassword = signal(false);
  readonly showNewPassword = this._showNewPassword.asReadonly();

  private readonly _forgotLoading = signal(false);
  readonly forgotLoading = this._forgotLoading.asReadonly();

  private readonly _forgotError = signal<string | null>(null);
  readonly forgotError = this._forgotError.asReadonly();

  private readonly _forgotSuccess = signal(false);
  readonly forgotSuccess = this._forgotSuccess.asReadonly();

  form: FormGroup = this.fb.group({
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  togglePasswordVisibility(): void {
    this._showPassword.update(show => !show);
  }

  toggleTerms(): void {
    this._agreedToTerms.update(v => !v);
  }

  // Forgot password modal
  openForgotPassword(): void {
    this._newPassword.set('');
    this._showNewPassword.set(false);
    this._forgotError.set(null);
    this._forgotSuccess.set(false);
    this._showForgotModal.set(true);
  }

  closeForgotPassword(): void {
    this._showForgotModal.set(false);
    this._newPassword.set('');
    this._showNewPassword.set(false);
    this._forgotError.set(null);
    this._forgotSuccess.set(false);
  }

  toggleNewPasswordVisibility(): void {
    this._showNewPassword.update(v => !v);
  }

  onNewPasswordInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this._newPassword.set(input.value);
  }

  async submitForgotPassword(): Promise<void> {
    const password = this._newPassword();
    if (password.length < 6) return;

    const email = (this.form.get('email')?.value ?? '').trim();

    this._forgotLoading.set(true);
    this._forgotError.set(null);

    const result = await this.authService.resetPassword(email, password);

    this._forgotLoading.set(false);

    if (result.success) {
      this._forgotSuccess.set(true);
    } else {
      this._forgotError.set(result.error ?? 'Something went wrong. Please try again.');
    }
  }

  async onCreateAccount(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this._agreedToTerms()) return;

    const { firstName, lastName, email, password } = this.form.value;
    const success = await this.authService.signup({ firstName, lastName, email, password });

    if (success) {
      this.router.navigate(['/setup']);
    }
  }

  async onSignIn(): Promise<void> {
    const emailControl = this.form.get('email');
    const passwordControl = this.form.get('password');

    if (emailControl?.invalid || passwordControl?.invalid) {
      emailControl?.markAsTouched();
      passwordControl?.markAsTouched();
      return;
    }

    const email = this.form.value.email;
    const password = this.form.value.password;
    this.authService.clearSessionExpiredMessage();
    const success = await this.authService.login({ email, password });

    if (success) {
      const restaurants = this.authService.merchants();

      if (restaurants.length === 0 && !this.authService.selectedMerchantId()) {
        this._infoMessage.set('No restaurant found for this account. Please create your account below.');
        this.form.patchValue({ email, password });
        document.querySelector('.form-panel')?.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      } else if (restaurants.length === 0) {
        this.router.navigate(['/setup']);
      } else if (restaurants.length === 1) {
        this.authService.selectMerchant(restaurants[0].id, restaurants[0].name);
        this.router.navigate(['/app/administration']);
      } else {
        this.router.navigate(['/select-restaurant']);
      }
    }
  }

  clearError(): void {
    this.authService.clearError();
  }

  get firstNameControl() {
    return this.form.get('firstName');
  }

  get lastNameControl() {
    return this.form.get('lastName');
  }

  get emailControl() {
    return this.form.get('email');
  }

  get passwordControl() {
    return this.form.get('password');
  }
}
