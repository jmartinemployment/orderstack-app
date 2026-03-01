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
  private readonly _merchants = signal<UserRestaurant[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _selectedMerchantId = signal<string | null>(null);
  private readonly _selectedMerchantName = signal<string | null>(null);
  private readonly _selectedMerchantLogo = signal<string | null>(null);
  private readonly _selectedMerchantAddress = signal<string | null>(null);
  private readonly _sessionExpiredMessage = signal<string | null>(null);

  // Public readonly signals
  readonly user = this._user.asReadonly();
  readonly token = this._token.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly selectedMerchantId = this._selectedMerchantId.asReadonly();
  readonly selectedMerchantName = this._selectedMerchantName.asReadonly();
  readonly selectedMerchantLogo = this._selectedMerchantLogo.asReadonly();
  readonly selectedMerchantAddress = this._selectedMerchantAddress.asReadonly();
  readonly sessionExpiredMessage = this._sessionExpiredMessage.asReadonly();

  // Computed signals
  readonly isAuthenticated = computed(() => !!this._token() && !!this._user());
  readonly userMerchants = computed(() => this._merchants().map(r => r.id));
  readonly merchants = this._merchants.asReadonly();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    const token = localStorage.getItem('auth_token');
    const userJson = localStorage.getItem('auth_user');
    const merchantsJson = localStorage.getItem('auth_merchants');
    const merchantId = localStorage.getItem('selected_merchant_id');
    const merchantName = localStorage.getItem('selected_merchant_name');
    const merchantLogo = localStorage.getItem('selected_merchant_logo');
    const merchantAddress = localStorage.getItem('selected_merchant_address');

    if (token && userJson) {
      try {
        const user = JSON.parse(userJson) as User;
        this._token.set(token);
        this._user.set(user);

        if (merchantsJson) {
          const merchants = JSON.parse(merchantsJson) as UserRestaurant[];
          this._merchants.set(merchants);
        }
      } catch {
        this.clearStorage();
      }
    }

    if (merchantId) {
      this._selectedMerchantId.set(merchantId);
      this._selectedMerchantName.set(merchantName);
      this._selectedMerchantLogo.set(merchantLogo);
      this._selectedMerchantAddress.set(merchantAddress);
    }
  }

  private saveToStorage(token: string, user: User, merchants: UserRestaurant[]): void {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem('auth_merchants', JSON.stringify(merchants));
  }

  private clearStorage(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_merchants');
    localStorage.removeItem('selected_merchant_id');
    localStorage.removeItem('selected_merchant_name');
    localStorage.removeItem('selected_merchant_logo');
    localStorage.removeItem('selected_merchant_address');
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
      this._merchants.set(response.restaurants || []);
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
      this._merchants.set(response.restaurants || []);
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
      this._merchants.set([]);
      this._selectedMerchantId.set(null);
      this._selectedMerchantName.set(null);
      this._selectedMerchantLogo.set(null);
      this._selectedMerchantAddress.set(null);
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
    this._merchants.set([]);
    this._selectedMerchantId.set(null);
    this._selectedMerchantName.set(null);
    this._selectedMerchantLogo.set(null);
    this._selectedMerchantAddress.set(null);
    this.clearStorage();
    this._sessionExpiredMessage.set('Your session has expired. Please sign in again.');
    this.router.navigate(['/login']);
  }

  clearSessionExpiredMessage(): void {
    this._sessionExpiredMessage.set(null);
  }

  selectMerchant(merchantId: string, merchantName: string, merchantLogo?: string, merchantAddress?: string): void {
    this._selectedMerchantId.set(merchantId);
    this._selectedMerchantName.set(merchantName);
    this._selectedMerchantLogo.set(merchantLogo ?? null);
    this._selectedMerchantAddress.set(merchantAddress ?? null);
    localStorage.setItem('selected_merchant_id', merchantId);
    localStorage.setItem('selected_merchant_name', merchantName);
    if (merchantLogo) {
      localStorage.setItem('selected_merchant_logo', merchantLogo);
    } else {
      localStorage.removeItem('selected_merchant_logo');
    }
    if (merchantAddress) {
      localStorage.setItem('selected_merchant_address', merchantAddress);
    } else {
      localStorage.removeItem('selected_merchant_address');
    }
  }

  async resetPassword(email: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      await firstValueFrom(
        this.http.post(`${this.apiUrl}/auth/reset-password`, { email, newPassword })
      );
      return { success: true };
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'error' in err) {
        const httpErr = err as { error?: { message?: string } };
        return { success: false, error: httpErr.error?.message };
      }
      return { success: false, error: 'Unable to reset password. Please try again.' };
    }
  }

  clearError(): void {
    this._error.set(null);
  }

  setSession(data: { token: string; user: User; restaurants?: UserRestaurant[] }): void {
    this._token.set(data.token);
    this._user.set(data.user);
    this._merchants.set(data.restaurants || []);
    this.saveToStorage(data.token, data.user, data.restaurants || []);
  }

  async resolveMerchantBySlug(slug: string): Promise<Restaurant | null> {
    try {
      return await firstValueFrom(
        this.http.get<Restaurant>(`${this.apiUrl}/merchant/slug/${slug}`)
      );
    } catch {
      return null;
    }
  }
}
