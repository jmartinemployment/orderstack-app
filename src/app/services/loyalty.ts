import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  LoyaltyConfig,
  LoyaltyProfile,
  LoyaltyTransaction,
  LoyaltyReward,
  defaultLoyaltyConfig,
  Customer,
} from '../models';
import { AuthService } from './auth';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root',
})
export class LoyaltyService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  private readonly _config = signal<LoyaltyConfig>(defaultLoyaltyConfig());
  private readonly _rewards = signal<LoyaltyReward[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly config = this._config.asReadonly();
  readonly rewards = this._rewards.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  private get restaurantId(): string {
    return this.authService.selectedRestaurantId() ?? '';
  }

  // --- Config ---

  async loadConfig(): Promise<void> {
    if (!this.restaurantId) return;
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const config = await firstValueFrom(
        this.http.get<LoyaltyConfig>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/loyalty/config`
        )
      );
      this._config.set(config);
    } catch {
      this._error.set('Failed to load loyalty config');
    } finally {
      this._isLoading.set(false);
    }
  }

  async saveConfig(config: Partial<LoyaltyConfig>): Promise<boolean> {
    if (!this.restaurantId) return false;
    this._error.set(null);

    try {
      const updated = await firstValueFrom(
        this.http.patch<LoyaltyConfig>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/loyalty/config`,
          config
        )
      );
      this._config.set(updated);
      return true;
    } catch {
      this._error.set('Failed to save loyalty config');
      return false;
    }
  }

  // --- Rewards ---

  async loadRewards(): Promise<void> {
    if (!this.restaurantId) return;
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const rewards = await firstValueFrom(
        this.http.get<LoyaltyReward[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/loyalty/rewards`
        )
      );
      this._rewards.set(rewards);
    } catch {
      this._error.set('Failed to load loyalty rewards');
    } finally {
      this._isLoading.set(false);
    }
  }

  async createReward(data: Partial<LoyaltyReward>): Promise<LoyaltyReward | null> {
    if (!this.restaurantId) return null;
    this._error.set(null);

    try {
      const reward = await firstValueFrom(
        this.http.post<LoyaltyReward>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/loyalty/rewards`,
          data
        )
      );
      this._rewards.update(rewards => [...rewards, reward]);
      return reward;
    } catch {
      this._error.set('Failed to create reward');
      return null;
    }
  }

  async updateReward(id: string, data: Partial<LoyaltyReward>): Promise<boolean> {
    if (!this.restaurantId) return false;
    this._error.set(null);

    try {
      const updated = await firstValueFrom(
        this.http.patch<LoyaltyReward>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/loyalty/rewards/${id}`,
          data
        )
      );
      this._rewards.update(rewards => rewards.map(r => r.id === id ? updated : r));
      return true;
    } catch {
      this._error.set('Failed to update reward');
      return false;
    }
  }

  async deleteReward(id: string): Promise<boolean> {
    if (!this.restaurantId) return false;
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.delete(
          `${this.apiUrl}/restaurant/${this.restaurantId}/loyalty/rewards/${id}`
        )
      );
      this._rewards.update(rewards => rewards.filter(r => r.id !== id));
      return true;
    } catch {
      this._error.set('Failed to delete reward');
      return false;
    }
  }

  // --- Customer Loyalty ---

  async getCustomerLoyalty(customerId: string): Promise<LoyaltyProfile | null> {
    if (!this.restaurantId) return null;

    try {
      return await firstValueFrom(
        this.http.get<LoyaltyProfile>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/customers/${customerId}/loyalty`
        )
      );
    } catch {
      return null;
    }
  }

  async getPointsHistory(customerId: string): Promise<LoyaltyTransaction[]> {
    if (!this.restaurantId) return [];

    try {
      return await firstValueFrom(
        this.http.get<LoyaltyTransaction[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/customers/${customerId}/loyalty/history`
        )
      );
    } catch {
      return [];
    }
  }

  async adjustPoints(customerId: string, points: number, reason: string): Promise<boolean> {
    if (!this.restaurantId) return false;
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/restaurant/${this.restaurantId}/customers/${customerId}/loyalty/adjust`,
          { points, reason }
        )
      );
      return true;
    } catch {
      this._error.set('Failed to adjust points');
      return false;
    }
  }

  async lookupCustomerByPhone(phone: string): Promise<Customer | null> {
    if (!this.restaurantId) return null;

    try {
      return await firstValueFrom(
        this.http.get<Customer>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/customers/lookup?phone=${encodeURIComponent(phone)}`
        )
      );
    } catch {
      return null;
    }
  }

  // --- Local computation ---

  calculatePointsForOrder(subtotal: number): number {
    const config = this._config();
    if (!config.enabled) return 0;
    return Math.floor(subtotal * config.pointsPerDollar);
  }

  calculateRedemptionDiscount(points: number): number {
    const config = this._config();
    return Math.round(points * config.pointsRedemptionRate * 100) / 100;
  }
}
