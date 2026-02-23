import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  UpsellSuggestion,
  MenuEngineeringData,
  SalesReport,
  MenuItemBadge,
  SalesGoal,
  SalesGoalFormData,
  GoalProgress,
  TeamSalesReport,
  ConversionFunnel,
  SalesAlert,
  ItemProfitabilityTrend,
  PriceElasticityIndicator,
  CannibalizationResult,
  SeasonalPattern,
  RevenueForecast,
  DemandForecastItem,
  StaffingRecommendation,
} from '../models';
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

  // --- Sales Goals ---
  private readonly _goals = signal<SalesGoal[]>([]);
  private readonly _activeGoalProgress = signal<GoalProgress | null>(null);
  private readonly _isLoadingGoals = signal(false);

  // --- Team Performance ---
  private readonly _teamReport = signal<TeamSalesReport | null>(null);
  private readonly _isLoadingTeam = signal(false);

  // --- Conversion Funnel ---
  private readonly _conversionFunnel = signal<ConversionFunnel | null>(null);
  private readonly _isLoadingFunnel = signal(false);

  // --- Sales Alerts ---
  private readonly _salesAlerts = signal<SalesAlert[]>([]);
  private readonly _isLoadingAlerts = signal(false);

  readonly upsellSuggestions = this._upsellSuggestions.asReadonly();
  readonly isLoadingUpsell = this._isLoadingUpsell.asReadonly();
  readonly menuEngineering = this._menuEngineering.asReadonly();
  readonly isLoadingEngineering = this._isLoadingEngineering.asReadonly();
  readonly engineeringError = this._engineeringError.asReadonly();
  readonly salesReport = this._salesReport.asReadonly();
  readonly isLoadingSales = this._isLoadingSales.asReadonly();
  readonly salesError = this._salesError.asReadonly();
  readonly goals = this._goals.asReadonly();
  readonly activeGoalProgress = this._activeGoalProgress.asReadonly();
  readonly isLoadingGoals = this._isLoadingGoals.asReadonly();
  readonly teamReport = this._teamReport.asReadonly();
  readonly isLoadingTeam = this._isLoadingTeam.asReadonly();
  readonly conversionFunnel = this._conversionFunnel.asReadonly();
  readonly isLoadingFunnel = this._isLoadingFunnel.asReadonly();
  readonly salesAlerts = this._salesAlerts.asReadonly();
  readonly isLoadingAlerts = this._isLoadingAlerts.asReadonly();

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

  readonly unacknowledgedAlertCount = computed(() =>
    this._salesAlerts().filter(a => !a.acknowledged).length
  );

  readonly teamLeaderboard = computed(() => {
    const report = this._teamReport();
    if (!report) return [];
    return [...report.members].sort((a, b) => b.totalRevenue - a.totalRevenue);
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

  // === Upsell ===

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

  // === Menu Engineering ===

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

  // === Sales Report ===

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

  // === Sales Goals ===

  async loadGoals(): Promise<void> {
    if (!this.restaurantId) return;

    this._isLoadingGoals.set(true);

    try {
      const data = await firstValueFrom(
        this.http.get<SalesGoal[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/analytics/goals`
        )
      );
      this._goals.set(data);

      const active = data.find(g => g.isActive);
      if (active) {
        await this.loadGoalProgress(active.id);
      }
    } catch {
      this._goals.set([]);
    } finally {
      this._isLoadingGoals.set(false);
    }
  }

  async createGoal(data: SalesGoalFormData): Promise<SalesGoal | null> {
    if (!this.restaurantId) return null;

    try {
      const goal = await firstValueFrom(
        this.http.post<SalesGoal>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/analytics/goals`,
          data
        )
      );
      this._goals.update(goals => [...goals, goal]);
      await this.loadGoalProgress(goal.id);
      return goal;
    } catch {
      return null;
    }
  }

  async updateGoal(goalId: string, data: Partial<SalesGoalFormData>): Promise<boolean> {
    if (!this.restaurantId) return false;

    try {
      const updated = await firstValueFrom(
        this.http.patch<SalesGoal>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/analytics/goals/${goalId}`,
          data
        )
      );
      this._goals.update(goals => goals.map(g => g.id === goalId ? updated : g));
      return true;
    } catch {
      return false;
    }
  }

  async deleteGoal(goalId: string): Promise<boolean> {
    if (!this.restaurantId) return false;

    try {
      await firstValueFrom(
        this.http.delete(
          `${this.apiUrl}/restaurant/${this.restaurantId}/analytics/goals/${goalId}`
        )
      );
      this._goals.update(goals => goals.filter(g => g.id !== goalId));
      if (this._activeGoalProgress()?.goalId === goalId) {
        this._activeGoalProgress.set(null);
      }
      return true;
    } catch {
      return false;
    }
  }

  async loadGoalProgress(goalId: string): Promise<void> {
    if (!this.restaurantId) return;

    try {
      const progress = await firstValueFrom(
        this.http.get<GoalProgress>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/analytics/goals/${goalId}/progress`
        )
      );
      this._activeGoalProgress.set(progress);
    } catch {
      this._activeGoalProgress.set(null);
    }
  }

  // === Team Performance ===

  async loadTeamSalesReport(startDate: string, endDate: string): Promise<void> {
    if (!this.restaurantId) return;

    this._isLoadingTeam.set(true);

    try {
      const data = await firstValueFrom(
        this.http.get<TeamSalesReport>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/analytics/team/sales`,
          { params: { startDate, endDate } }
        )
      );
      this._teamReport.set(data);
    } catch {
      this._teamReport.set(null);
    } finally {
      this._isLoadingTeam.set(false);
    }
  }

  // === Conversion Funnel ===

  async loadConversionFunnel(startDate: string, endDate: string): Promise<void> {
    if (!this.restaurantId) return;

    this._isLoadingFunnel.set(true);

    try {
      const data = await firstValueFrom(
        this.http.get<ConversionFunnel>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/analytics/conversion-funnel`,
          { params: { startDate, endDate } }
        )
      );
      this._conversionFunnel.set(data);
    } catch {
      this._conversionFunnel.set(null);
    } finally {
      this._isLoadingFunnel.set(false);
    }
  }

  // === Sales Alerts ===

  async loadSalesAlerts(): Promise<void> {
    if (!this.restaurantId) return;

    this._isLoadingAlerts.set(true);

    try {
      const data = await firstValueFrom(
        this.http.get<SalesAlert[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/analytics/sales-alerts`
        )
      );
      this._salesAlerts.set(data);
    } catch {
      this._salesAlerts.set([]);
    } finally {
      this._isLoadingAlerts.set(false);
    }
  }

  async acknowledgeSalesAlert(alertId: string): Promise<void> {
    if (!this.restaurantId) return;

    try {
      await firstValueFrom(
        this.http.patch(
          `${this.apiUrl}/restaurant/${this.restaurantId}/analytics/sales-alerts/${alertId}/acknowledge`,
          {}
        )
      );
      this._salesAlerts.update(alerts =>
        alerts.map(a => a.id === alertId ? { ...a, acknowledged: true } : a)
      );
    } catch {
      // Silent — alert stays unacknowledged
    }
  }

  // === Menu Deep Dive (Phase 3) ===

  async getItemProfitabilityTrend(itemId: string, days = 30): Promise<ItemProfitabilityTrend | null> {
    if (!this.restaurantId) return null;

    try {
      return await firstValueFrom(
        this.http.get<ItemProfitabilityTrend>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/analytics/menu/item/${itemId}/profitability?days=${days}`
        )
      );
    } catch {
      return null;
    }
  }

  async getPriceElasticity(): Promise<PriceElasticityIndicator[]> {
    if (!this.restaurantId) return [];

    try {
      return await firstValueFrom(
        this.http.get<PriceElasticityIndicator[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/analytics/menu/price-elasticity`
        )
      ) ?? [];
    } catch {
      return [];
    }
  }

  async getCannibalization(days = 60): Promise<CannibalizationResult[]> {
    if (!this.restaurantId) return [];

    try {
      return await firstValueFrom(
        this.http.get<CannibalizationResult[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/analytics/menu/cannibalization?days=${days}`
        )
      ) ?? [];
    } catch {
      return [];
    }
  }

  async getSeasonalPattern(itemId: string): Promise<SeasonalPattern | null> {
    if (!this.restaurantId) return null;

    try {
      return await firstValueFrom(
        this.http.get<SeasonalPattern>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/analytics/menu/item/${itemId}/seasonal`
        )
      );
    } catch {
      return null;
    }
  }

  // === Predictive Analytics (Phase 3) ===

  async getRevenueForecast(days = 14): Promise<RevenueForecast | null> {
    if (!this.restaurantId) return null;

    try {
      return await firstValueFrom(
        this.http.get<RevenueForecast>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/analytics/forecast/revenue?days=${days}`
        )
      );
    } catch {
      return null;
    }
  }

  async getDemandForecast(date: string): Promise<DemandForecastItem[]> {
    if (!this.restaurantId) return [];

    try {
      return await firstValueFrom(
        this.http.get<DemandForecastItem[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/analytics/forecast/demand?date=${encodeURIComponent(date)}`
        )
      ) ?? [];
    } catch {
      return [];
    }
  }

  async getStaffingRecommendation(date: string): Promise<StaffingRecommendation | null> {
    if (!this.restaurantId) return null;

    try {
      return await firstValueFrom(
        this.http.get<StaffingRecommendation>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/analytics/forecast/staffing?date=${encodeURIComponent(date)}`
        )
      );
    } catch {
      return null;
    }
  }

  // === Private ===

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
