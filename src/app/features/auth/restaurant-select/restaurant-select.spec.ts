import '../../../../test-setup';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signal, computed } from '@angular/core';
import { of, throwError } from 'rxjs';
import { RestaurantSelect } from './restaurant-select';
import { AuthService } from '@services/auth';

function createMockAuthService(opts: {
  authenticated?: boolean;
  restaurantIds?: string[];
  user?: { firstName: string } | null;
} = {}) {
  const _token = signal(opts.authenticated !== false ? 'tok' : null);
  const _user = signal(opts.user ?? (opts.authenticated !== false ? { firstName: 'Jeff' } : null));
  const _restaurants = signal((opts.restaurantIds ?? []).map(id => ({ id })));

  return {
    isAuthenticated: computed(() => !!_token() && !!_user()),
    user: _user.asReadonly(),
    userRestaurants: computed(() => _restaurants().map(r => r.id)),
    selectedRestaurantId: signal<string | null>(null).asReadonly(),
    selectRestaurant: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
    restaurants: _restaurants.asReadonly(),
  };
}

describe('RestaurantSelect', () => {
  let fixture: ComponentFixture<RestaurantSelect>;
  let component: RestaurantSelect;
  let authService: ReturnType<typeof createMockAuthService>;
  let router: { navigate: ReturnType<typeof vi.fn> };
  let httpClient: { get: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authService = createMockAuthService({
      authenticated: true,
      restaurantIds: ['r-1', 'r-2'],
    });
    router = { navigate: vi.fn() };
    httpClient = {
      get: vi.fn().mockImplementation((url: string) => {
        if (url.includes('r-1')) return of({ id: 'r-1', name: 'Taipa', address: '123 Main', logo: null });
        if (url.includes('r-2')) return of({ id: 'r-2', name: 'Burger Joint', address: '456 Oak', logo: 'logo.png' });
        return throwError(() => new Error('Not found'));
      }),
    };

    TestBed.configureTestingModule({
      imports: [RestaurantSelect],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
        { provide: HttpClient, useValue: httpClient },
      ],
    });
    fixture = TestBed.createComponent(RestaurantSelect);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows welcome message with user name', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Welcome, Jeff');
  });

  it('renders restaurant list after loading', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    const items = fixture.nativeElement.querySelectorAll('.restaurant-item');
    expect(items.length).toBe(2);
  });

  it('shows restaurant names', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    const names = fixture.nativeElement.querySelectorAll('.restaurant-name');
    expect(names[0].textContent).toBe('Taipa');
    expect(names[1].textContent).toBe('Burger Joint');
  });

  it('shows logo placeholder when no logo', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    const placeholder = fixture.nativeElement.querySelector('.restaurant-logo-placeholder');
    expect(placeholder).toBeTruthy();
    expect(placeholder.textContent.trim()).toBe('T');
  });

  it('shows img when logo exists', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    const img = fixture.nativeElement.querySelector('.restaurant-logo');
    expect(img).toBeTruthy();
    expect(img.src).toContain('logo.png');
  });

  it('navigates on restaurant select', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    const items = fixture.nativeElement.querySelectorAll('.restaurant-item');
    items[0].click();
    expect(authService.selectRestaurant).toHaveBeenCalledWith('r-1', 'Taipa', null);
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('calls logout on sign out click', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    const signOutBtn = fixture.nativeElement.querySelector('.btn-outline-secondary');
    signOutBtn.click();
    expect(authService.logout).toHaveBeenCalled();
  });

  it('clears error on clearError()', () => {
    component.clearError();
    expect(component.error()).toBeNull();
  });

  it('does not render when not authenticated', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [RestaurantSelect],
      providers: [
        { provide: AuthService, useValue: createMockAuthService({ authenticated: false }) },
        { provide: Router, useValue: router },
        { provide: HttpClient, useValue: httpClient },
      ],
    });
    const f = TestBed.createComponent(RestaurantSelect);
    f.detectChanges();
    expect(f.nativeElement.querySelector('.restaurant-select-container')).toBeNull();
  });
});
