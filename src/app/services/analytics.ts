import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { UpsellSuggestion, MenuEngineeringData, SalesReport, MenuItemBadge } from '../models';
import { AuthService } from './auth';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  private readonly _upsellSuggestions = signal<UpsellSuggestion[]>([]);
  private readonly _isLoadingUpsell = signal(false);
  private readonly _menuEngineering = signal<MenuEngineeringData | null>(null);
  private readonly _isLoadingEngineering = signal(false);
  private readonly _engineeringError = signal<string | null>(null);
  private readonly _salesReport = signal<SalesReport | null>(null);
  private readonly _isLoadingSales = signal(false);
  private readonly _salesError = signal<string | null>(null);

  readonly upsellSuggestions = this._upsellSuggestions.asReadonly();
  readonly isLoadingUpsell = this._isLoadingUpsell.asReadonly();
  readonly menuEngineering = this._menuEngineering.asReadonly();
  readonly isLoadingEngineering = this._isLoadingEngineering.asReadonly();
  readonly engineeringError = this._engineeringError.asReadonly();
  readonly salesReport = this._salesReport.asReadonly();
  readonly isLoadingSales = this._isLoadingSales.asReadonly();
  readonly salesError = this._salesError.asReadonly();

  readonly itemBadges = computed<Map<string, MenuItemBadge>>(() => {
    const data = this._menuEngineering();
    const badges = new Map<string, MenuItemBadge>();
    if (!data) return badges;

    for (const item of data.items) {
      switch (item.classification) {
        case 'star':
          badges.set(item.id, { type: 'best-seller', label: 'Best Seller', cssClass: 'badge-best-seller' });
          break;
        case 'cash-cow':
          badges.set(item.id, { type: 'chefs-pick', label: "Chef's Pick", cssClass: 'badge-chefs-pick' });
          break;
        case 'puzzle':
          badges.set(item.id, { type: 'popular', label: 'Popular', cssClass: 'badge-popular' });
          break;
      }
    }
    return badges;
  });

  getItemBadge(itemId: string, createdAt?: string): MenuItemBadge | null {
    if (createdAt) {
      const created = new Date(createdAt);
      const daysOld = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
      if (daysOld < 14) {
        return { type: 'new', label: 'New', cssClass: 'badge-new' };
      }
    }
    return this.itemBadges().get(itemId) ?? null;
  }

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  private get restaurantId(): string | null {
    return this.authService.selectedRestaurantId();
  }

  fetchUpsellSuggestions(cartItemIds: string[]): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.loadUpsellSuggestions(cartItemIds);
    }, 500);
  }

  clearUpsellSuggestions(): void {
    this._upsellSuggestions.set([]);
  }

  async loadMenuEngineering(days = 30): Promise<void> {
    if (!this.restaurantId) return;

    this._isLoadingEngineering.set(true);
    this._engineeringError.set(null);

    try {
      const data = await firstValueFrom(
        this.http.get<MenuEngineeringData>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/analytics/menu-engineering?days=${days}`
        )
      );
      this._menuEngineering.set(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load menu engineering data';
      this._engineeringError.set(message);
    } finally {
      this._isLoadingEngineering.set(false);
    }
  }

  async loadSalesReport(period: 'daily' | 'weekly' = 'daily'): Promise<void> {
    if (!this.restaurantId) return;

    this._isLoadingSales.set(true);
    this._salesError.set(null);

    try {
      const data = await firstValueFrom(
        this.http.get<SalesReport>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/analytics/sales/${period}`
        )
      );
      this._salesReport.set(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load sales report';
      this._salesError.set(message);
    } finally {
      this._isLoadingSales.set(false);
    }
  }

  private async loadUpsellSuggestions(cartItemIds: string[]): Promise<void> {
    if (!this.restaurantId || cartItemIds.length === 0) {
      this._upsellSuggestions.set([]);
      return;
    }

    this._isLoadingUpsell.set(true);

    try {
      const params = cartItemIds.join(',');
      const raw = await firstValueFrom(
        this.http.get<any[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/analytics/upsell-suggestions?cartItems=${params}`
        )
      );
      const mapped: UpsellSuggestion[] = (raw ?? []).map(s => ({
        item: {
          id: s.menuItemId,
          name: s.menuItemName,
          price: Number(s.price) || 0,
          description: '',
          categoryId: '',
          available: true,
          popular: false,
          dietary: [],
          displayOrder: 0,
          image: s.image || null,
        } as any,
        reason: s.reason || '',
        suggestedScript: s.suggestedScript || '',
      }));
      this._upsellSuggestions.set(mapped);
    } catch {
      this._upsellSuggestions.set([]);
    } finally {
      this._isLoadingUpsell.set(false);
    }
  }
}
