import '../../../../test-setup';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signal } from '@angular/core';
import { Login } from './login';
import { AuthService } from '@services/auth';

function createMockAuthService() {
  const _isLoading = signal(false);
  const _error = signal<string | null>(null);
  const _sessionExpiredMessage = signal<string | null>(null);
  const _merchants = signal<{ id: string; name: string }[]>([]);
  const _selectedMerchantId = signal<string | null>(null);

  return {
    _isLoading,
    _error,
    _sessionExpiredMessage,
    _merchants,
    _selectedMerchantId,
    isLoading: _isLoading.asReadonly(),
    error: _error.asReadonly(),
    sessionExpiredMessage: _sessionExpiredMessage.asReadonly(),
    merchants: _merchants.asReadonly(),
    selectedMerchantId: _selectedMerchantId.asReadonly(),
    login: vi.fn().mockResolvedValue(true),
    signup: vi.fn().mockResolvedValue(true),
    clearError: vi.fn(),
    clearSessionExpiredMessage: vi.fn(),
    selectMerchant: vi.fn(),
  };
}

function createMockRouter() {
  return { navigate: vi.fn() };
}

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let component: Login;
  let authService: ReturnType<typeof createMockAuthService>;
  let router: ReturnType<typeof createMockRouter>;

  beforeEach(() => {
    authService = createMockAuthService();
    router = createMockRouter();

    TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });
    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // --- Rendering ---

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the two-panel layout', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.auth-layout')).toBeTruthy();
    expect(el.querySelector('.promo-panel')).toBeTruthy();
    expect(el.querySelector('.form-panel')).toBeTruthy();
  });

  it('shows all form fields', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('#firstName')).toBeTruthy();
    expect(el.querySelector('#lastName')).toBeTruthy();
    expect(el.querySelector('#email')).toBeTruthy();
    expect(el.querySelector('#password')).toBeTruthy();
  });

  it('shows both Create Account and Sign In buttons', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.btn-create')).toBeTruthy();
    expect(el.querySelector('.btn-signin')).toBeTruthy();
  });

  it('email input has autocomplete="off"', () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#email');
    expect(input.getAttribute('autocomplete')).toBe('off');
  });

  it('password input has autocomplete="new-password"', () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#password');
    expect(input.getAttribute('autocomplete')).toBe('new-password');
  });

  // --- Password visibility ---

  it('toggles password visibility', () => {
    expect(component.showPassword()).toBe(false);
    component.togglePasswordVisibility();
    expect(component.showPassword()).toBe(true);
    component.togglePasswordVisibility();
    expect(component.showPassword()).toBe(false);
  });

  it('renders password field as password type by default', () => {
    const input = fixture.nativeElement.querySelector('#password');
    expect(input.type).toBe('password');
  });

  it('renders password field as text when visibility toggled', () => {
    component.togglePasswordVisibility();
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('#password');
    expect(input.type).toBe('text');
  });

  // --- Terms checkbox ---

  it('toggles terms agreement', () => {
    expect(component.agreedToTerms()).toBe(false);
    component.toggleTerms();
    expect(component.agreedToTerms()).toBe(true);
  });

  it('disables Create Account when terms not agreed', () => {
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-create');
    expect(btn.disabled).toBe(true);
  });

  it('enables Create Account when terms agreed', () => {
    component.toggleTerms();
    fixture.detectChanges();
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-create');
    expect(btn.disabled).toBe(false);
  });

  // --- Terms of Service validation ---

  it('shows terms error when checkbox unchecked and Create Account clicked', async () => {
    component.form.setValue({
      firstName: 'Jeff', lastName: 'Doe',
      email: 'test@example.com', password: 'password123',
    });
    component.toggleTerms(); // agree
    component.toggleTerms(); // un-agree (back to false)

    await component.onCreateAccount();
    fixture.detectChanges();

    const errorEl = fixture.nativeElement.querySelector('.invalid-feedback');
    expect(errorEl).toBeTruthy();
    expect(errorEl.textContent).toContain('Terms of Service');
  });

  it('does not show terms error when checkbox is checked', () => {
    component.toggleTerms(); // agree
    fixture.detectChanges();

    const errorEl = fixture.nativeElement.querySelector('.terms-check .invalid-feedback');
    expect(errorEl).toBeFalsy();
  });

  it('clears terms error when checkbox is checked after failed submit', async () => {
    component.form.setValue({
      firstName: 'Jeff', lastName: 'Doe',
      email: 'test@example.com', password: 'password123',
    });
    await component.onCreateAccount();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.terms-check .invalid-feedback')).toBeTruthy();

    component.toggleTerms(); // now agree
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.terms-check .invalid-feedback')).toBeFalsy();
  });

  // --- Create Account ---

  it('marks form touched on invalid Create Account', async () => {
    component.toggleTerms();
    await component.onCreateAccount();
    expect(component.form.touched).toBe(true);
    expect(authService.signup).not.toHaveBeenCalled();
  });

  it('does not signup when terms not agreed', async () => {
    component.form.setValue({
      firstName: 'John', lastName: 'Doe',
      email: 'john@test.com', password: 'pass123',
    });
    await component.onCreateAccount();
    expect(authService.signup).not.toHaveBeenCalled();
  });

  it('calls signup with valid form and terms agreed', async () => {
    component.form.setValue({
      firstName: 'John', lastName: 'Doe',
      email: 'john@test.com', password: 'pass123',
    });
    component.toggleTerms();

    await component.onCreateAccount();

    expect(authService.signup).toHaveBeenCalledWith({
      firstName: 'John', lastName: 'Doe',
      email: 'john@test.com', password: 'pass123',
    });
  });

  it('navigates to /business-type on successful signup', async () => {
    component.form.setValue({
      firstName: 'John', lastName: 'Doe',
      email: 'john@test.com', password: 'pass123',
    });
    component.toggleTerms();
    await component.onCreateAccount();
    expect(router.navigate).toHaveBeenCalledWith(['/business-type']);
  });

  it('does not navigate on failed signup', async () => {
    authService.signup.mockResolvedValue(false);
    component.form.setValue({
      firstName: 'John', lastName: 'Doe',
      email: 'john@test.com', password: 'pass123',
    });
    component.toggleTerms();
    await component.onCreateAccount();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  // --- Sign In ---

  it('marks email and password touched on invalid Sign In', async () => {
    await component.onSignIn();
    expect(component.emailControl?.touched).toBe(true);
    expect(component.passwordControl?.touched).toBe(true);
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('calls login with email and password only', async () => {
    component.form.setValue({
      firstName: 'John', lastName: 'Doe',
      email: 'user@test.com', password: 'pass123',
    });
    await component.onSignIn();
    expect(authService.login).toHaveBeenCalledWith({
      email: 'user@test.com', password: 'pass123',
    });
    expect(authService.clearSessionExpiredMessage).toHaveBeenCalled();
  });

  // --- Post-login routing ---

  it('navigates to /business-type when no restaurants', async () => {
    component.form.patchValue({ email: 'user@test.com', password: 'pass123' });
    await component.onSignIn();
    expect(router.navigate).toHaveBeenCalledWith(['/business-type']);
  });

  it('selects restaurant and navigates to /app/administration when exactly 1 restaurant', async () => {
    authService._merchants.set([{ id: 'r-1', name: 'Test' }]);
    component.form.patchValue({ email: 'user@test.com', password: 'pass123' });
    await component.onSignIn();
    expect(authService.selectMerchant).toHaveBeenCalledWith('r-1', 'Test');
    expect(router.navigate).toHaveBeenCalledWith(['/app/administration']);
  });

  it('navigates to /select-restaurant when multiple restaurants', async () => {
    authService._merchants.set([
      { id: 'r-1', name: 'A' },
      { id: 'r-2', name: 'B' },
    ]);
    component.form.patchValue({ email: 'user@test.com', password: 'pass123' });
    await component.onSignIn();
    expect(router.navigate).toHaveBeenCalledWith(['/select-restaurant']);
  });

  // --- Error display ---

  it('shows error when error signal has value', () => {
    authService._error.set('Invalid credentials');
    fixture.detectChanges();
    const errorDisplay = fixture.nativeElement.querySelector('os-error-display');
    expect(errorDisplay).toBeTruthy();
  });

  // --- Session expired ---

  it('shows session expired warning', () => {
    authService._sessionExpiredMessage.set('Session expired');
    fixture.detectChanges();
    const alert = fixture.nativeElement.querySelector('.alert-warning');
    expect(alert?.textContent).toContain('Session expired');
  });

  // --- clearError ---

  it('calls authService.clearError()', () => {
    component.clearError();
    expect(authService.clearError).toHaveBeenCalled();
  });

  // --- Form accessors ---

  it('exposes form control accessors', () => {
    expect(component.firstNameControl).toBe(component.form.get('firstName'));
    expect(component.lastNameControl).toBe(component.form.get('lastName'));
    expect(component.emailControl).toBe(component.form.get('email'));
    expect(component.passwordControl).toBe(component.form.get('password'));
  });
});
