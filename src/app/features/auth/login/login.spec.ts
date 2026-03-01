import '../../../../test-setup';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signal } from '@angular/core';
import { Login } from './login';
import { AuthService } from '@services/auth';

function createMockAuthService() {
  const _isLoading = signal(false);
  const _error = signal<string | null>(null);
  const _sessionExpiredMessage = signal<string | null>(null);
  const _merchants = signal<{ id: string; name: string }[]>([]);

  const _user = signal<{ onboardingStatus?: string } | null>(null);

  return {
    _isLoading,
    _error,
    _sessionExpiredMessage,
    _merchants,
    _user,
    isLoading: _isLoading.asReadonly(),
    error: _error.asReadonly(),
    sessionExpiredMessage: _sessionExpiredMessage.asReadonly(),
    merchants: _merchants.asReadonly(),
    user: _user.asReadonly(),
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

function createMockActivatedRoute() {
  return {
    snapshot: { parent: { routeConfig: { path: 'signup' } } },
  };
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
        { provide: ActivatedRoute, useValue: createMockActivatedRoute() },
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

  it('defaults to sign-up view', () => {
    expect(component.isSignUp()).toBe(true);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.signup-layout')).toBeTruthy();
  });

  it('switches to sign-in view', () => {
    component.switchToSignIn();
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.login-card')).toBeTruthy();
    expect(el.querySelector('.signup-layout')).toBeNull();
  });

  it('switches back to sign-up view', () => {
    component.switchToSignIn();
    component.switchToSignUp();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.signup-layout')).toBeTruthy();
  });

  it('clears error when switching views', () => {
    component.switchToSignIn();
    expect(authService.clearError).toHaveBeenCalled();

    authService.clearError.mockClear();
    component.switchToSignUp();
    expect(authService.clearError).toHaveBeenCalled();
  });

  // --- Sign-in view when route is /login ---

  it('defaults to sign-in when parent route is login', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: Router, useValue: createMockRouter() },
        { provide: ActivatedRoute, useValue: {
          snapshot: { parent: { routeConfig: { path: 'login' } } },
        }},
      ],
    });
    const f = TestBed.createComponent(Login);
    f.detectChanges();
    expect(f.componentInstance.isSignUp()).toBe(false);
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
    const input = fixture.nativeElement.querySelector('#signupPassword');
    expect(input.type).toBe('password');
  });

  it('renders password field as text when visibility toggled', () => {
    component.togglePasswordVisibility();
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('#signupPassword');
    expect(input.type).toBe('text');
  });

  // --- Terms checkbox ---

  it('toggles terms agreement', () => {
    expect(component.agreedToTerms()).toBe(false);
    component.toggleTerms();
    expect(component.agreedToTerms()).toBe(true);
  });

  it('disables submit when terms not agreed', () => {
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-create');
    expect(btn.disabled).toBe(true);
  });

  it('enables submit when terms agreed', () => {
    component.toggleTerms();
    fixture.detectChanges();
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-create');
    expect(btn.disabled).toBe(false);
  });

  // --- Sign-up form validation ---

  it('marks signup form touched on invalid submit', async () => {
    component.toggleTerms();
    await component.onSignUp();
    expect(component.signupForm.touched).toBe(true);
    expect(authService.signup).not.toHaveBeenCalled();
  });

  it('does not signup when terms not agreed', async () => {
    component.signupForm.setValue({
      firstName: 'John', lastName: 'Doe',
      email: 'john@test.com', password: 'pass123',
    });
    await component.onSignUp();
    expect(authService.signup).not.toHaveBeenCalled();
  });

  it('calls signup with valid form and terms agreed', async () => {
    component.signupForm.setValue({
      firstName: 'John', lastName: 'Doe',
      email: 'john@test.com', password: 'pass123',
    });
    component.toggleTerms();

    await component.onSignUp();

    expect(authService.signup).toHaveBeenCalledWith({
      firstName: 'John', lastName: 'Doe',
      email: 'john@test.com', password: 'pass123',
    });
  });

  it('navigates to /setup on successful signup', async () => {
    component.signupForm.setValue({
      firstName: 'John', lastName: 'Doe',
      email: 'john@test.com', password: 'pass123',
    });
    component.toggleTerms();
    await component.onSignUp();
    expect(router.navigate).toHaveBeenCalledWith(['/setup']);
  });

  it('does not navigate on failed signup', async () => {
    authService.signup.mockResolvedValue(false);
    component.signupForm.setValue({
      firstName: 'John', lastName: 'Doe',
      email: 'john@test.com', password: 'pass123',
    });
    component.toggleTerms();
    await component.onSignUp();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  // --- Sign-in form validation ---

  it('marks login form touched on invalid submit', async () => {
    component.switchToSignIn();
    await component.onSignIn();
    expect(component.loginForm.touched).toBe(true);
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('calls login with valid credentials', async () => {
    component.switchToSignIn();
    component.loginForm.setValue({ email: 'user@test.com', password: 'pass123' });
    await component.onSignIn();
    expect(authService.login).toHaveBeenCalledWith({
      email: 'user@test.com', password: 'pass123',
    });
    expect(authService.clearSessionExpiredMessage).toHaveBeenCalled();
  });

  // --- Post-login routing ---

  it('navigates to /setup when no restaurants', async () => {
    component.switchToSignIn();
    component.loginForm.setValue({ email: 'user@test.com', password: 'pass123' });
    await component.onSignIn();
    expect(router.navigate).toHaveBeenCalledWith(['/setup']);
  });

  it('selects restaurant and navigates to / when exactly 1 restaurant', async () => {
    const mockAuth = createMockAuthService();
    mockAuth._merchants.set([{ id: 'r-1', name: 'Test' }]);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        { provide: AuthService, useValue: mockAuth },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: createMockActivatedRoute() },
      ],
    });
    const f = TestBed.createComponent(Login);
    const c = f.componentInstance;
    c.switchToSignIn();
    c.loginForm.setValue({ email: 'user@test.com', password: 'pass123' });
    await c.onSignIn();
    expect(mockAuth.selectMerchant).toHaveBeenCalledWith('r-1', 'Test');
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('navigates to /select-restaurant when multiple restaurants', async () => {
    const mockAuth = createMockAuthService();
    mockAuth._merchants.set([
      { id: 'r-1', name: 'A' },
      { id: 'r-2', name: 'B' },
    ]);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        { provide: AuthService, useValue: mockAuth },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: createMockActivatedRoute() },
      ],
    });
    const f = TestBed.createComponent(Login);
    const c = f.componentInstance;
    c.switchToSignIn();
    c.loginForm.setValue({ email: 'user@test.com', password: 'pass123' });
    await c.onSignIn();
    expect(router.navigate).toHaveBeenCalledWith(['/select-restaurant']);
  });

  // --- Form validation feedback in DOM ---

  it('shows email required error when touched and empty', () => {
    component.switchToSignIn();
    fixture.detectChanges();
    component.emailControl?.markAsTouched();
    fixture.detectChanges();
    const feedback = fixture.nativeElement.querySelector('.invalid-feedback');
    expect(feedback?.textContent).toContain('Email is required');
  });

  it('shows email format error when touched and invalid', () => {
    component.switchToSignIn();
    fixture.detectChanges();
    component.loginForm.get('email')?.setValue('notanemail');
    component.emailControl?.markAsTouched();
    fixture.detectChanges();
    const feedbacks = fixture.nativeElement.querySelectorAll('.invalid-feedback');
    const emailFeedback = Array.from(feedbacks).find(
      (f: Element) => f.textContent?.includes('valid email')
    );
    expect(emailFeedback).toBeTruthy();
  });

  it('shows password min length error', () => {
    component.switchToSignIn();
    fixture.detectChanges();
    component.loginForm.get('password')?.setValue('abc');
    component.passwordControl?.markAsTouched();
    fixture.detectChanges();
    const feedbacks = fixture.nativeElement.querySelectorAll('.invalid-feedback');
    const pwFeedback = Array.from(feedbacks).find(
      (f: Element) => f.textContent?.includes('6 characters')
    );
    expect(pwFeedback).toBeTruthy();
  });

  // --- Loading state ---

  it('shows loading spinner when isLoading is true', () => {
    component.switchToSignIn();
    authService._isLoading.set(true);
    fixture.detectChanges();
    const spinner = fixture.nativeElement.querySelector('.spinner-border');
    expect(spinner).toBeTruthy();
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(btn.disabled).toBe(true);
  });

  // --- Error display ---

  it('shows error alert when error signal has value', () => {
    component.switchToSignIn();
    authService._error.set('Invalid credentials');
    fixture.detectChanges();
    const errorDisplay = fixture.nativeElement.querySelector('os-error-display');
    expect(errorDisplay).toBeTruthy();
  });

  // --- Session expired ---

  it('shows session expired warning', () => {
    component.switchToSignIn();
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

  // --- Signup form accessors ---

  it('exposes signup form control accessors', () => {
    expect(component.signupFirstName).toBe(component.signupForm.get('firstName'));
    expect(component.signupLastName).toBe(component.signupForm.get('lastName'));
    expect(component.signupEmail).toBe(component.signupForm.get('email'));
    expect(component.signupPassword).toBe(component.signupForm.get('password'));
  });

  // --- Login form accessors ---

  it('exposes login form control accessors', () => {
    expect(component.emailControl).toBe(component.loginForm.get('email'));
    expect(component.passwordControl).toBe(component.loginForm.get('password'));
  });
});
