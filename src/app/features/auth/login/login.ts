import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
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
  private readonly route = inject(ActivatedRoute);

  readonly isLoading = this.authService.isLoading;
  readonly error = this.authService.error;
  readonly sessionExpiredMessage = this.authService.sessionExpiredMessage;

  readonly _isSignUp = signal(true);
  readonly isSignUp = this._isSignUp.asReadonly();

  private readonly _showPassword = signal(false);
  readonly showPassword = this._showPassword.asReadonly();

  private readonly _agreedToTerms = signal(false);
  readonly agreedToTerms = this._agreedToTerms.asReadonly();

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

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  signupForm: FormGroup = this.fb.group({
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor() {
    // If navigated to /login, show sign-in view
    const parentPath = this.route.snapshot.parent?.routeConfig?.path;
    if (parentPath === 'login') {
      this._isSignUp.set(false);
    }
  }

  togglePasswordVisibility(): void {
    this._showPassword.update(show => !show);
  }

  toggleTerms(): void {
    this._agreedToTerms.update(v => !v);
  }

  switchToSignIn(): void {
    this._isSignUp.set(false);
    this.authService.clearError();
  }

  switchToSignUp(): void {
    this._isSignUp.set(true);
    this.authService.clearError();
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

    const email = (this.loginForm.get('email')?.value ?? '').trim();

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

  async onSignUp(): Promise<void> {
    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      return;
    }

    if (!this._agreedToTerms()) return;

    const { firstName, lastName, email, password } = this.signupForm.value;
    const success = await this.authService.signup({ firstName, lastName, email, password });

    if (success) {
      this.router.navigate(['/setup']);
    }
  }

  async onSignIn(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { email, password } = this.loginForm.value;
    this.authService.clearSessionExpiredMessage();
    const success = await this.authService.login({ email, password });

    if (success) {
      const restaurants = this.authService.restaurants();

      if (restaurants.length === 0) {
        this.router.navigate(['/setup']);
      } else if (restaurants.length === 1) {
        this.authService.selectRestaurant(restaurants[0].id, restaurants[0].name);
        this.router.navigate(['/']);
      } else {
        this.router.navigate(['/select-restaurant']);
      }
    }
  }

  clearError(): void {
    this.authService.clearError();
  }

  // Sign-in form accessors
  get emailControl() {
    return this.loginForm.get('email');
  }

  get passwordControl() {
    return this.loginForm.get('password');
  }

  // Sign-up form accessors
  get signupFirstName() {
    return this.signupForm.get('firstName');
  }

  get signupLastName() {
    return this.signupForm.get('lastName');
  }

  get signupEmail() {
    return this.signupForm.get('email');
  }

  get signupPassword() {
    return this.signupForm.get('password');
  }
}
