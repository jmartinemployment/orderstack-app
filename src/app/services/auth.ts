import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { User, UserRestaurant, LoginRequest, LoginResponse, Restaurant, SignupData } from '../models';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = environment.apiUrl;

  // Private writable signals
  private readonly _user = signal<User | null>(null);
  private readonly _token = signal<string | null>(null);
  private readonly _restaurants = signal<UserRestaurant[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _selectedRestaurantId = signal<string | null>(null);
  private readonly _selectedRestaurantName = signal<string | null>(null);
  private readonly _selectedRestaurantLogo = signal<string | null>(null);
  private readonly _sessionExpiredMessage = signal<string | null>(null);

  // Public readonly signals
  readonly user = this._user.asReadonly();
  readonly token = this._token.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly selectedRestaurantId = this._selectedRestaurantId.asReadonly();
  readonly selectedRestaurantName = this._selectedRestaurantName.asReadonly();
  readonly selectedRestaurantLogo = this._selectedRestaurantLogo.asReadonly();
  readonly sessionExpiredMessage = this._sessionExpiredMessage.asReadonly();

  // Computed signals
  readonly isAuthenticated = computed(() => !!this._token() && !!this._user());
  readonly userRestaurants = computed(() => this._restaurants().map(r => r.id));
  readonly restaurants = this._restaurants.asReadonly();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    const token = localStorage.getItem('auth_token');
    const userJson = localStorage.getItem('auth_user');
    const restaurantsJson = localStorage.getItem('auth_restaurants');
    const restaurantId = localStorage.getItem('selected_restaurant_id');
    const restaurantName = localStorage.getItem('selected_restaurant_name');
    const restaurantLogo = localStorage.getItem('selected_restaurant_logo');

    if (token && userJson) {
      try {
        const user = JSON.parse(userJson) as User;
        this._token.set(token);
        this._user.set(user);

        if (restaurantsJson) {
          const restaurants = JSON.parse(restaurantsJson) as UserRestaurant[];
          this._restaurants.set(restaurants);
        }
      } catch {
        this.clearStorage();
      }
    }

    if (restaurantId) {
      this._selectedRestaurantId.set(restaurantId);
      this._selectedRestaurantName.set(restaurantName);
      this._selectedRestaurantLogo.set(restaurantLogo);
    }
  }

  private saveToStorage(token: string, user: User, restaurants: UserRestaurant[]): void {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem('auth_restaurants', JSON.stringify(restaurants));
  }

  private clearStorage(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_restaurants');
    localStorage.removeItem('selected_restaurant_id');
    localStorage.removeItem('selected_restaurant_name');
    localStorage.removeItem('selected_restaurant_logo');
  }

  async login(credentials: LoginRequest): Promise<boolean> {
    this._isLoading.set(true);
    this._error.set(null);
    this._sessionExpiredMessage.set(null);

    try {
      const response = await firstValueFrom(
        this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, credentials)
      );

      this._token.set(response.token);
      this._user.set(response.user);
      this._restaurants.set(response.restaurants || []);
      this.saveToStorage(response.token, response.user, response.restaurants || []);

      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      if (typeof err === 'object' && err !== null && 'error' in err) {
        const httpErr = err as { error?: { message?: string; error?: string } };
        this._error.set(httpErr.error?.message ?? httpErr.error?.error ?? message);
      } else {
        this._error.set(message);
      }
      return false;
    } finally {
      this._isLoading.set(false);
    }
  }

  async signup(data: SignupData): Promise<boolean> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.post<LoginResponse>(`${this.apiUrl}/auth/signup`, data)
      );

      this._token.set(response.token);
      this._user.set(response.user);
      this._restaurants.set(response.restaurants || []);
      this.saveToStorage(response.token, response.user, response.restaurants || []);

      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Signup failed';
      if (typeof err === 'object' && err !== null && 'error' in err) {
        const httpErr = err as { error?: { message?: string; error?: string } };
        this._error.set(httpErr.error?.message ?? httpErr.error?.error ?? message);
      } else {
        this._error.set(message);
      }
      return false;
    } finally {
      this._isLoading.set(false);
    }
  }

  async logout(): Promise<void> {
    this._isLoading.set(true);

    try {
      await firstValueFrom(
        this.http.post(`${this.apiUrl}/auth/logout`, {})
      );
    } catch {
      // Ignore logout errors
    } finally {
      this._token.set(null);
      this._user.set(null);
      this._restaurants.set([]);
      this._selectedRestaurantId.set(null);
      this._selectedRestaurantName.set(null);
      this._selectedRestaurantLogo.set(null);
      this.clearStorage();
      this._isLoading.set(false);
    }
  }

  async validateSession(): Promise<boolean> {
    if (!this._token()) {
      return false;
    }

    this._isLoading.set(true);

    try {
      const user = await firstValueFrom(
        this.http.get<User>(`${this.apiUrl}/auth/me`)
      );

      this._user.set(user);
      return true;
    } catch {
      this._token.set(null);
      this._user.set(null);
      this.clearStorage();
      return false;
    } finally {
      this._isLoading.set(false);
    }
  }

  handleSessionExpired(): void {
    this._token.set(null);
    this._user.set(null);
    this._restaurants.set([]);
    this._selectedRestaurantId.set(null);
    this._selectedRestaurantName.set(null);
    this._selectedRestaurantLogo.set(null);
    this.clearStorage();
    this._sessionExpiredMessage.set('Your session has expired. Please sign in again.');
    this.router.navigate(['/login']);
  }

  clearSessionExpiredMessage(): void {
    this._sessionExpiredMessage.set(null);
  }

  selectRestaurant(restaurantId: string, restaurantName: string, restaurantLogo?: string): void {
    this._selectedRestaurantId.set(restaurantId);
    this._selectedRestaurantName.set(restaurantName);
    this._selectedRestaurantLogo.set(restaurantLogo ?? null);
    localStorage.setItem('selected_restaurant_id', restaurantId);
    localStorage.setItem('selected_restaurant_name', restaurantName);
    if (restaurantLogo) {
      localStorage.setItem('selected_restaurant_logo', restaurantLogo);
    } else {
      localStorage.removeItem('selected_restaurant_logo');
    }
  }

  clearError(): void {
    this._error.set(null);
  }

  setSession(data: { token: string; user: User; restaurants?: UserRestaurant[] }): void {
    this._token.set(data.token);
    this._user.set(data.user);
    this._restaurants.set(data.restaurants || []);
    this.saveToStorage(data.token, data.user, data.restaurants || []);
  }

  async resolveRestaurantBySlug(slug: string): Promise<Restaurant | null> {
    try {
      return await firstValueFrom(
        this.http.get<Restaurant>(`${this.apiUrl}/restaurant/slug/${slug}`)
      );
    } catch {
      return null;
    }
  }
}
