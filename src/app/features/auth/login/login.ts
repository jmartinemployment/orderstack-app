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

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  private readonly _showPassword = signal(false);
  readonly showPassword = this._showPassword.asReadonly();

  togglePasswordVisibility(): void {
    this._showPassword.update(show => !show);
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { email, password } = this.loginForm.value;
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

  get emailControl() {
    return this.loginForm.get('email');
  }

  get passwordControl() {
    return this.loginForm.get('password');
  }
}
