import { Component, inject, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { AnalyticsService } from '@services/analytics';
import { InventoryService } from '@services/inventory';
import { OrderService } from '@services/order';
import { AuthService } from '@services/auth';
import { LoadingSpinner } from '@shared/loading-spinner/loading-spinner';
import { ErrorDisplay } from '@shared/error-display/error-display';
import {
  MenuEngineeringInsight,
  SalesInsight,
  InventoryAlert,
  StockPrediction,
  RecentProfitSummary,
} from '@models/index';

type CommandTab = 'overview' | 'insights' | 'alerts';

interface UnifiedInsight {
  id: string;
  source: 'sales' | 'menu' | 'inventory' | 'profit';
  text: string;
  priority: 'high' | 'medium' | 'low';
  type: 'positive' | 'negative' | 'neutral' | 'action' | 'warning';
}

@Component({
  selector: 'os-command-center',
  imports: [CurrencyPipe, DecimalPipe, LoadingSpinner, ErrorDisplay],
  templateUrl: './command-center.html',
  styleUrl: './command-center.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommandCenter {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly inventoryService = inject(InventoryService);
  private readonly orderService = inject(OrderService);
  private readonly authService = inject(AuthService);

  readonly isAuthenticated = this.authService.isAuthenticated;

  private readonly _activeTab = signal<CommandTab>('overview');
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _profitSummary = signal<RecentProfitSummary | null>(null);
  private readonly _lastRefresh = signal<Date | null>(null);

  readonly activeTab = this._activeTab.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly profitSummary = this._profitSummary.asReadonly();
  readonly lastRefresh = this._lastRefresh.asReadonly();

  // Existing service signals
  readonly salesReport = this.analyticsService.salesReport;
  readonly menuEngineering = this.analyticsService.menuEngineering;
  readonly inventoryAlerts = this.inventoryService.alerts;
  readonly inventoryPredictions = this.inventoryService.predictions;
  readonly activeOrderCount = this.orderService.activeOrderCount;

  // KPI computeds
  readonly todayRevenue = computed(() => {
    const report = this.salesReport();
    return report?.summary.totalRevenue ?? 0;
  });

  readonly todayOrders = computed(() => {
    const report = this.salesReport();
    return report?.summary.totalOrders ?? 0;
  });

  readonly avgOrderValue = computed(() => {
    const report = this.salesReport();
    return report?.summary.averageOrderValue ?? 0;
  });

  readonly revenueChange = computed(() => {
    const report = this.salesReport();
    return report?.comparison?.revenueChange ?? null;
  });

  readonly avgProfitMargin = computed(() => {
    return this._profitSummary()?.averageMargin ?? null;
  });

  readonly totalAlertCount = computed(() => {
    return this.inventoryAlerts().length;
  });

  readonly criticalAlertCount = computed(() => {
    return this.inventoryAlerts().filter(a => a.severity === 'critical').length;
  });

  readonly menuStars = computed(() => {
    return this.menuEngineering()?.summary.stars ?? 0;
  });

  readonly menuDogs = computed(() => {
    return this.menuEngineering()?.summary.dogs ?? 0;
  });

  readonly urgentPredictions = computed(() => {
    return this.inventoryPredictions()
      .filter(p => p.daysUntilEmpty < 7)
      .sort((a, b) => a.daysUntilEmpty - b.daysUntilEmpty)
      .slice(0, 5);
  });

  readonly topSellers = computed(() => {
    return this.salesReport()?.summary.topSellingItems?.slice(0, 5) ?? [];
  });

  // Unified insights feed — combine all AI insights from all sources
  readonly unifiedInsights = computed<UnifiedInsight[]>(() => {
    const insights: UnifiedInsight[] = [];

    // Sales insights
    const salesInsights = this.salesReport()?.insights ?? [];
    for (const si of salesInsights) {
      insights.push({
        id: `sales-${si.text.slice(0, 20)}`,
        source: 'sales',
        text: si.text,
        priority: si.change !== undefined && Math.abs(si.change) > 20 ? 'high' : 'medium',
        type: si.type,
      });
    }

    // Menu engineering insights
    const menuInsights = this.menuEngineering()?.insights ?? [];
    for (const mi of menuInsights) {
      insights.push({
        id: `menu-${mi.text.slice(0, 20)}`,
        source: 'menu',
        text: mi.text,
        priority: mi.priority,
        type: mi.type === 'warning' ? 'warning' : mi.type === 'action' ? 'action' : 'neutral',
      });
    }

    // Inventory alerts as insights
    const critAlerts = this.inventoryAlerts().filter(a => a.severity === 'critical');
    for (const alert of critAlerts.slice(0, 3)) {
      insights.push({
        id: `inv-${alert.itemId}`,
        source: 'inventory',
        text: `${alert.itemName}: ${alert.message}. ${alert.suggestedAction}`,
        priority: 'high',
        type: 'warning',
      });
    }

    // Profit insights
    const profit = this._profitSummary();
    if (profit && profit.averageMargin < 30) {
      insights.push({
        id: 'profit-low-margin',
        source: 'profit',
        text: `Average profit margin is ${profit.averageMargin.toFixed(1)}% — below the 30% target. Review item pricing.`,
        priority: 'high',
        type: 'negative',
      });
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return insights;
  });

  constructor() {
    effect(() => {
      if (this.isAuthenticated() && this.authService.selectedRestaurantId()) {
        this.loadAllData();
      }
    });
  }

  setTab(tab: CommandTab): void {
    this._activeTab.set(tab);
  }

  async loadAllData(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      await Promise.all([
        this.analyticsService.loadSalesReport('daily'),
        this.analyticsService.loadMenuEngineering(30),
        this.inventoryService.loadAlerts(),
        this.inventoryService.loadPredictions(),
        this.orderService.loadOrders(20),
        this.loadProfitSummary(),
      ]);
      this._lastRefresh.set(new Date());
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      this._isLoading.set(false);
    }
  }

  async refresh(): Promise<void> {
    await this.loadAllData();
  }

  clearError(): void {
    this._error.set(null);
  }

  getInsightIcon(type: UnifiedInsight['type']): string {
    switch (type) {
      case 'positive': return 'arrow-up';
      case 'negative': return 'arrow-down';
      case 'warning': return 'exclamation';
      case 'action': return 'lightning';
      default: return 'info';
    }
  }

  getInsightClass(type: UnifiedInsight['type']): string {
    switch (type) {
      case 'positive': return 'insight-positive';
      case 'negative': return 'insight-negative';
      case 'warning': return 'insight-warning';
      case 'action': return 'insight-action';
      default: return 'insight-neutral';
    }
  }

  getSourceLabel(source: UnifiedInsight['source']): string {
    switch (source) {
      case 'sales': return 'Sales';
      case 'menu': return 'Menu';
      case 'inventory': return 'Inventory';
      case 'profit': return 'Profit';
    }
  }

  getAlertSeverityClass(severity: string): string {
    switch (severity) {
      case 'critical': return 'alert-critical';
      case 'warning': return 'alert-warn';
      default: return 'alert-info';
    }
  }

  getPredictionUrgencyClass(days: number): string {
    if (days < 3) return 'urgency-critical';
    if (days < 7) return 'urgency-warning';
    if (days < 14) return 'urgency-caution';
    return 'urgency-ok';
  }

  getRefreshTimeText(): string {
    const last = this._lastRefresh();
    if (!last) return '';
    const seconds = Math.floor((Date.now() - last.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  }

  private async loadProfitSummary(): Promise<void> {
    const result = await this.orderService.getRecentProfit(10);
    if (result) {
      this._profitSummary.set(result);
    }
  }
}
