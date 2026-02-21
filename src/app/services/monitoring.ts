import { Injectable, inject, signal, computed, DestroyRef } from '@angular/core';
import { AnalyticsService } from './analytics';
import { InventoryService } from './inventory';
import { OrderService } from './order';
import { AuthService } from './auth';
import {
  MonitoringAlert,
  MonitoringSnapshot,
  AnomalyRule,
  AlertSeverity,
  AlertCategory,
} from '../models/monitoring.model';

@Injectable({
  providedIn: 'root',
})
export class MonitoringService {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly inventoryService = inject(InventoryService);
  private readonly orderService = inject(OrderService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  private pollInterval: ReturnType<typeof setInterval> | null = null;

  private readonly _alerts = signal<MonitoringAlert[]>([]);
  private readonly _snapshots = signal<MonitoringSnapshot[]>([]);
  private readonly _isRunning = signal(false);
  private readonly _lastScanTime = signal<Date | null>(null);
  private readonly _scanCount = signal(0);
  private readonly _error = signal<string | null>(null);
  private readonly _baselineAov = signal<number | null>(null);

  private readonly _rules = signal<AnomalyRule[]>([
    { id: 'rev-drop', name: 'Revenue Drop', category: 'revenue', severity: 'critical', enabled: true, description: 'Alert when current revenue is 30%+ below average' },
    { id: 'low-stock', name: 'Low Stock', category: 'inventory', severity: 'warning', enabled: true, description: 'Alert when items fall below minimum stock level' },
    { id: 'out-stock', name: 'Out of Stock', category: 'inventory', severity: 'critical', enabled: true, description: 'Alert when items reach zero stock' },
    { id: 'overdue-order', name: 'Overdue Orders', category: 'kitchen', severity: 'warning', enabled: true, description: 'Alert when orders exceed estimated prep time by 50%' },
    { id: 'high-cancel', name: 'High Cancellations', category: 'orders', severity: 'warning', enabled: true, description: 'Alert when cancellation rate exceeds 10%' },
    { id: 'restock-urgent', name: 'Urgent Restock', category: 'inventory', severity: 'critical', enabled: true, description: 'Alert when predicted stock-out is within 3 days' },
    { id: 'avg-order-drop', name: 'Avg Order Value Drop', category: 'revenue', severity: 'info', enabled: true, description: 'Alert when average order value drops 20%+ below baseline' },
    { id: 'peak-surge', name: 'Peak Hour Surge', category: 'orders', severity: 'info', enabled: true, description: 'Notify when order volume exceeds 150% of hourly average' },
  ]);

  readonly alerts = this._alerts.asReadonly();
  readonly snapshots = this._snapshots.asReadonly();
  readonly isRunning = this._isRunning.asReadonly();
  readonly lastScanTime = this._lastScanTime.asReadonly();
  readonly scanCount = this._scanCount.asReadonly();
  readonly error = this._error.asReadonly();
  readonly rules = this._rules.asReadonly();

  readonly activeAlerts = computed(() =>
    this._alerts().filter(a => !a.acknowledged)
  );

  readonly criticalCount = computed(() =>
    this.activeAlerts().filter(a => a.severity === 'critical').length
  );

  readonly warningCount = computed(() =>
    this.activeAlerts().filter(a => a.severity === 'warning').length
  );

  readonly alertsByCategory = computed(() => {
    const map = new Map<AlertCategory, MonitoringAlert[]>();
    for (const alert of this.activeAlerts()) {
      const existing = map.get(alert.category) ?? [];
      existing.push(alert);
      map.set(alert.category, existing);
    }
    return map;
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.stop());
  }

  start(intervalMs = 60_000): void {
    if (this._isRunning()) return;
    this._isRunning.set(true);
    this._error.set(null);

    this.runScan();
    this.pollInterval = setInterval(() => this.runScan(), intervalMs);
  }

  stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this._isRunning.set(false);
  }

  toggleRule(ruleId: string): void {
    this._rules.update(rules =>
      rules.map(r => r.id === ruleId ? { ...r, enabled: !r.enabled } : r)
    );
  }

  acknowledgeAlert(alertId: string): void {
    this._alerts.update(alerts =>
      alerts.map(a => a.id === alertId ? { ...a, acknowledged: true } : a)
    );
  }

  acknowledgeAll(): void {
    this._alerts.update(alerts =>
      alerts.map(a => ({ ...a, acknowledged: true }))
    );
  }

  clearAcknowledged(): void {
    this._alerts.update(alerts => alerts.filter(a => !a.acknowledged));
  }

  async runScan(): Promise<void> {
    const restaurantId = this.authService.selectedRestaurantId();
    if (!restaurantId) return;

    try {
      const enabledRules = this._rules().filter(r => r.enabled);
      const newAlerts: MonitoringAlert[] = [];

      // Load data from existing services
      await Promise.allSettled([
        this.analyticsService.loadSalesReport('daily'),
        this.inventoryService.loadAlerts(),
        this.inventoryService.loadPredictions(),
        this.inventoryService.loadItems(),
      ]);

      const salesReport = this.analyticsService.salesReport();
      const invAlerts = this.inventoryService.alerts();
      const predictions = this.inventoryService.predictions();
      const invItems = this.inventoryService.items();

      // Revenue anomalies
      if (this.isRuleEnabled(enabledRules, 'rev-drop') && salesReport) {
        const revenue = salesReport.summary?.totalRevenue ?? 0;
        const revenueChange = salesReport.comparison?.revenueChange ?? 0;
        if (revenueChange < -30) {
          newAlerts.push(this.createAlert(
            'revenue', 'critical',
            'Revenue Drop Detected',
            `Current revenue ($${revenue.toFixed(0)}) is ${Math.abs(Math.round(revenueChange))}% below comparison period`,
            'Review pricing, promotions, and staffing levels',
            `$${revenue.toFixed(0)}`, revenue, 0,
          ));
        }
      }

      // Set baseline AOV from first scan's sales data
      if (this._baselineAov() === null && salesReport?.summary?.averageOrderValue) {
        this._baselineAov.set(salesReport.summary.averageOrderValue);
      }

      if (this.isRuleEnabled(enabledRules, 'avg-order-drop') && salesReport) {
        const avgOrder = salesReport.summary?.averageOrderValue ?? 0;
        const baseline = this._baselineAov();
        if (baseline !== null && avgOrder > 0 && avgOrder < baseline * 0.8) {
          newAlerts.push(this.createAlert(
            'revenue', 'info',
            'Average Order Value Low',
            `Average order ($${avgOrder.toFixed(2)}) is below restaurant baseline ($${baseline.toFixed(2)})`,
            'Consider upselling prompts or combo deals',
            `$${avgOrder.toFixed(2)}`, avgOrder, baseline * 0.8,
          ));
        }
      }

      // Inventory alerts from existing service
      if (this.isRuleEnabled(enabledRules, 'low-stock')) {
        for (const alert of invAlerts.filter(a => a.type === 'low_stock')) {
          newAlerts.push(this.createAlert(
            'inventory', 'warning',
            `Low Stock: ${alert.itemName}`,
            alert.message,
            alert.suggestedAction,
            `${alert.currentStock} units`, alert.currentStock, alert.threshold,
          ));
        }
      }

      if (this.isRuleEnabled(enabledRules, 'out-stock')) {
        for (const alert of invAlerts.filter(a => a.type === 'out_of_stock')) {
          newAlerts.push(this.createAlert(
            'inventory', 'critical',
            `Out of Stock: ${alert.itemName}`,
            alert.message,
            alert.suggestedAction ?? 'Reorder immediately',
            '0 units', 0, alert.threshold,
          ));
        }
      }

      // Urgent restock predictions
      if (this.isRuleEnabled(enabledRules, 'restock-urgent')) {
        for (const pred of predictions.filter(p => p.daysUntilEmpty <= 3 && p.reorderRecommended)) {
          newAlerts.push(this.createAlert(
            'inventory', 'critical',
            `Urgent Restock: ${pred.itemName}`,
            `Predicted to run out in ${pred.daysUntilEmpty} day${pred.daysUntilEmpty === 1 ? '' : 's'} (${pred.currentStock} ${pred.unit} remaining)`,
            `Order ${pred.reorderQuantity} ${pred.unit} now`,
            `${pred.daysUntilEmpty}d remaining`, pred.daysUntilEmpty, 3,
          ));
        }
      }

      // Record snapshot
      const snapshot: MonitoringSnapshot = {
        timestamp: new Date(),
        revenue: salesReport?.summary?.totalRevenue ?? 0,
        orderCount: salesReport?.summary?.totalOrders ?? 0,
        avgOrderValue: salesReport?.summary?.averageOrderValue ?? 0,
        activeAlerts: newAlerts.filter(a => a.severity === 'critical' || a.severity === 'warning').length,
        criticalAlerts: newAlerts.filter(a => a.severity === 'critical').length,
        lowStockItems: invItems.filter(i => i.active && i.currentStock <= i.minStock).length,
        overdueOrders: 0,
      };

      // Deduplicate alerts — don't re-add alerts with same title that already exist unacknowledged
      const existingTitles = new Set(this._alerts().filter(a => !a.acknowledged).map(a => a.title));
      const uniqueNew = newAlerts.filter(a => !existingTitles.has(a.title));

      this._alerts.update(prev => [...uniqueNew, ...prev].slice(0, 200));
      this._snapshots.update(prev => [snapshot, ...prev].slice(0, 100));
      this._lastScanTime.set(new Date());
      this._scanCount.update(c => c + 1);
      this._error.set(null);
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Scan failed');
    }
  }

  private isRuleEnabled(rules: AnomalyRule[], ruleId: string): boolean {
    return rules.some(r => r.id === ruleId);
  }

  private createAlert(
    category: AlertCategory,
    severity: AlertSeverity,
    title: string,
    message: string,
    suggestedAction?: string,
    metric?: string,
    currentValue?: number,
    threshold?: number,
  ): MonitoringAlert {
    return {
      id: crypto.randomUUID(),
      category,
      severity,
      title,
      message,
      metric,
      currentValue,
      threshold,
      suggestedAction,
      timestamp: new Date(),
      acknowledged: false,
    };
  }
}
