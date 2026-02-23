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
  OnlineOrderEventType,
  AiInsightCard,
  PinnedWidget,
  AiQueryResponse,
  PrepTimeAccuracyRow,
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

  // === Today's Sales Stats (Home Dashboard) ===

  async getTodaySalesStats(): Promise<{
    netSales: number;
    orderCount: number;
    priorDayNetSales: number;
    priorDayOrderCount: number;
  } | null> {
    if (!this.restaurantId) return null;

    try {
      return await firstValueFrom(
        this.http.get<{
          netSales: number;
          orderCount: number;
          priorDayNetSales: number;
          priorDayOrderCount: number;
        }>(`${this.apiUrl}/restaurant/${this.restaurantId}/analytics/today-stats`)
      );
    } catch {
      return null;
    }
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

  // === Prep Time Accuracy (GAP-R05 Phase 2) ===

  private readonly _prepTimeAccuracy = signal<PrepTimeAccuracyRow[]>([]);
  private readonly _isLoadingPrepAccuracy = signal(false);

  readonly prepTimeAccuracy = this._prepTimeAccuracy.asReadonly();
  readonly isLoadingPrepAccuracy = this._isLoadingPrepAccuracy.asReadonly();

  readonly flaggedPrepItems = computed(() =>
    this._prepTimeAccuracy().filter(row => row.suggestedAdjustment !== null)
  );

  async loadPrepTimeAccuracy(days = 30): Promise<void> {
    if (!this.restaurantId) return;

    this._isLoadingPrepAccuracy.set(true);

    try {
      const data = await firstValueFrom(
        this.http.get<PrepTimeAccuracyRow[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/analytics/prep-time-accuracy?days=${days}`
        )
      );
      this._prepTimeAccuracy.set(data);
    } catch {
      this._prepTimeAccuracy.set([]);
    } finally {
      this._isLoadingPrepAccuracy.set(false);
    }
  }

  async applyPrepTimeSuggestion(itemId: string, newMinutes: number): Promise<boolean> {
    if (!this.restaurantId) return false;

    try {
      await firstValueFrom(
        this.http.patch(
          `${this.apiUrl}/restaurant/${this.restaurantId}/menu/items/${itemId}`,
          { prepTimeMinutes: newMinutes }
        )
      );
      // Update local state — clear the suggestion for the applied item
      this._prepTimeAccuracy.update(rows =>
        rows.map(r => r.itemId === itemId ? { ...r, estimatedMinutes: newMinutes, suggestedAdjustment: null } : r)
      );
      return true;
    } catch {
      return false;
    }
  }

  getQueueAdjustedEstimate(baseMinutes: number, queueDepth: number): number {
    // Each order in queue adds ~3 minutes of delay (configurable constant)
    const perOrderDelay = 3;
    return baseMinutes + (queueDepth * perOrderDelay);
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

  // --- Online Ordering Analytics Events (GOS-SPEC-07 Phase 3) ---

  private _onlineSessionId: string | null = null;

  private getOnlineSessionId(): string {
    if (!this._onlineSessionId) {
      this._onlineSessionId = crypto.randomUUID();
    }
    return this._onlineSessionId;
  }

  async trackOnlineEvent(type: OnlineOrderEventType, metadata: Record<string, unknown> = {}): Promise<void> {
    const restaurantId = this.authService.selectedRestaurantId();
    if (!restaurantId) return;
    try {
      await firstValueFrom(
        this.http.post(`${this.apiUrl}/analytics/online-events`, {
          type,
          restaurantId,
          sessionId: this.getOnlineSessionId(),
          metadata,
          timestamp: new Date().toISOString(),
        })
      );
    } catch {
      // Non-critical — silently drop analytics events on failure
    }
  }

  resetOnlineSession(): void {
    this._onlineSessionId = null;
  }

  // --- AI Dashboard Widgets (GAP-R02) ---

  private readonly _pinnedWidgets = signal<PinnedWidget[]>([]);
  private readonly _isQueryingAi = signal(false);
  private readonly _proactiveInsights = signal<AiInsightCard[]>([]);
  private readonly _isLoadingProactiveInsights = signal(false);
  private readonly _dismissedInsightIds = signal<Set<string>>(new Set());

  readonly pinnedWidgets = this._pinnedWidgets.asReadonly();
  readonly isQueryingAi = this._isQueryingAi.asReadonly();
  readonly proactiveInsights = computed(() =>
    this._proactiveInsights().filter(c => !this._dismissedInsightIds().has(c.id))
  );
  readonly isLoadingProactiveInsights = this._isLoadingProactiveInsights.asReadonly();

  async loadProactiveInsights(): Promise<void> {
    const restaurantId = this.authService.selectedRestaurantId();
    if (!restaurantId) return;
    this._isLoadingProactiveInsights.set(true);
    try {
      const cards = await firstValueFrom(
        this.http.get<AiInsightCard[]>(`${this.apiUrl}/analytics/proactive-insights?restaurantId=${restaurantId}`)
      );
      this._proactiveInsights.set(cards);
    } catch {
      // Generate proactive insights locally from existing data
      const insights: AiInsightCard[] = [];
      const now = new Date().toISOString();

      // From sales alerts
      const alerts = this._salesAlerts();
      for (const alert of alerts.filter(a => !a.acknowledged).slice(0, 5)) {
        const typeLabels: Record<string, string> = {
          revenue_anomaly: 'Revenue Anomaly',
          aov_anomaly: 'AOV Anomaly',
          volume_spike: 'Volume Spike',
          volume_drop: 'Volume Drop',
          new_customer_surge: 'New Customer Surge',
          channel_shift: 'Channel Shift',
        };
        insights.push({
          id: `proactive-alert-${alert.id}`,
          query: 'proactive',
          responseType: 'text',
          title: `${typeLabels[alert.type] ?? 'Alert'} Detected`,
          data: { text: alert.message },
          trend: alert.severity === 'critical' ? 'down' : 'flat',
          createdAt: now,
        });
      }

      // From menu engineering — underperformers
      const engineering = this._menuEngineering();
      if (engineering) {
        const dogs = engineering.items.filter(i => i.classification === 'dog');
        if (dogs.length > 2) {
          insights.push({
            id: 'proactive-dogs',
            query: 'proactive',
            responseType: 'kpi',
            title: 'Underperforming Items',
            data: {},
            value: dogs.length,
            unit: 'items',
            trend: 'down',
            createdAt: now,
          });
        }

        if (engineering.summary.averageMargin < 30) {
          insights.push({
            id: 'proactive-low-margin',
            query: 'proactive',
            responseType: 'text',
            title: 'Low Profit Margin',
            data: { text: `Average menu profit margin is ${engineering.summary.averageMargin.toFixed(1)}%, below the 30% target. Consider reviewing pricing or food costs.` },
            trend: 'down',
            createdAt: now,
          });
        }
      }

      // From sales report — revenue anomaly
      const sales = this._salesReport();
      if (sales?.comparison) {
        if (sales.comparison.revenueChange < -15) {
          insights.push({
            id: 'proactive-revenue-drop',
            query: 'proactive',
            responseType: 'kpi',
            title: 'Revenue Declining',
            data: {},
            value: sales.comparison.revenueChange,
            unit: '%',
            trend: 'down',
            createdAt: now,
          });
        }
        if (sales.comparison.revenueChange > 20) {
          insights.push({
            id: 'proactive-revenue-surge',
            query: 'proactive',
            responseType: 'kpi',
            title: 'Revenue Surge',
            data: {},
            value: sales.comparison.revenueChange,
            unit: '%',
            trend: 'up',
            createdAt: now,
          });
        }
      }

      // From prep time accuracy — flagged items
      const flagged = this.flaggedPrepItems();
      if (flagged.length > 0) {
        insights.push({
          id: 'proactive-prep-accuracy',
          query: 'proactive',
          responseType: 'text',
          title: 'Prep Time Inaccuracies',
          data: { text: `${flagged.length} menu item(s) have prep time estimates that deviate significantly from actual times. Review in Menu Engineering > Prep Time tab.` },
          trend: 'flat',
          createdAt: now,
        });
      }

      this._proactiveInsights.set(insights);
    } finally {
      this._isLoadingProactiveInsights.set(false);
    }
  }

  dismissInsight(cardId: string): void {
    this._dismissedInsightIds.update(ids => {
      const next = new Set(ids);
      next.add(cardId);
      return next;
    });
  }

  async queryAi(question: string): Promise<AiQueryResponse> {
    const restaurantId = this.authService.selectedRestaurantId();
    this._isQueryingAi.set(true);
    try {
      const response = await firstValueFrom(
        this.http.post<AiQueryResponse>(`${this.apiUrl}/analytics/ai-query`, {
          question,
          restaurantId,
        })
      );
      return response;
    } catch {
      // Return a text fallback if the AI query endpoint is not available
      return {
        query: question,
        cards: [{
          id: crypto.randomUUID(),
          query: question,
          responseType: 'text',
          title: 'Response',
          data: { text: 'AI query processing is being set up. Your question has been received.' },
          createdAt: new Date().toISOString(),
        }],
        suggestedFollowUps: [],
      };
    } finally {
      this._isQueryingAi.set(false);
    }
  }

  async loadPinnedWidgets(): Promise<void> {
    const restaurantId = this.authService.selectedRestaurantId();
    if (!restaurantId) return;
    try {
      const widgets = await firstValueFrom(
        this.http.get<PinnedWidget[]>(`${this.apiUrl}/analytics/pinned-widgets?restaurantId=${restaurantId}`)
      );
      this._pinnedWidgets.set(widgets);
    } catch {
      // Load from localStorage fallback
      const stored = localStorage.getItem(`pinned-widgets-${restaurantId}`);
      if (stored) {
        this._pinnedWidgets.set(JSON.parse(stored) as PinnedWidget[]);
      }
    }
  }

  pinWidget(card: AiInsightCard): void {
    const restaurantId = this.authService.selectedRestaurantId();
    const widget: PinnedWidget = {
      id: crypto.randomUUID(),
      insightCard: card,
      position: this._pinnedWidgets().length,
      size: card.responseType === 'kpi' ? 'small' : 'medium',
      pinnedAt: new Date().toISOString(),
      pinnedBy: this.authService.user()?.firstName ?? 'unknown',
    };
    this._pinnedWidgets.update(w => [...w, widget]);
    if (restaurantId) {
      localStorage.setItem(`pinned-widgets-${restaurantId}`, JSON.stringify(this._pinnedWidgets()));
    }
    // Fire and forget API persistence
    firstValueFrom(
      this.http.post(`${this.apiUrl}/analytics/pinned-widgets`, { ...widget, restaurantId })
    ).catch(() => { /* localStorage fallback already saved */ });
  }

  unpinWidget(widgetId: string): void {
    const restaurantId = this.authService.selectedRestaurantId();
    this._pinnedWidgets.update(w => w.filter(pw => pw.id !== widgetId));
    if (restaurantId) {
      localStorage.setItem(`pinned-widgets-${restaurantId}`, JSON.stringify(this._pinnedWidgets()));
    }
    firstValueFrom(
      this.http.delete(`${this.apiUrl}/analytics/pinned-widgets/${widgetId}`)
    ).catch(() => { /* localStorage fallback already saved */ });
  }
}
