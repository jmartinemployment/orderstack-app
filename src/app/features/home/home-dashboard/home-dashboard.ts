import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { PlatformService } from '@services/platform';
import { AnalyticsService } from '@services/analytics';

interface SetupCheckItem {
  label: string;
  description: string;
  icon: string;
  route: string;
  done: boolean;
}

interface QuickAction {
  label: string;
  icon: string;
  route: string;
  color: string;
}

@Component({
  selector: 'os-home-dashboard',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './home-dashboard.html',
  styleUrl: './home-dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeDashboard implements OnInit {
  private readonly router = inject(Router);
  private readonly platform = inject(PlatformService);
  private readonly analytics = inject(AnalyticsService);

  readonly businessName = computed(() => this.platform.merchantProfile()?.businessName ?? 'Your Business');
  readonly todayDate = signal(new Date());

  readonly _todayNetSales = signal(0);
  readonly _todayOrderCount = signal(0);
  readonly _yesterdayNetSales = signal(0);
  readonly _yesterdayOrderCount = signal(0);

  readonly todayAvgTicket = computed(() => {
    const orders = this._todayOrderCount();
    const sales = this._todayNetSales();
    return orders > 0 ? sales / orders : 0;
  });

  readonly salesChangePercent = computed(() => {
    const yesterday = this._yesterdayNetSales();
    const today = this._todayNetSales();
    if (yesterday === 0) return 0;
    return ((today - yesterday) / yesterday) * 100;
  });

  readonly ordersChangePercent = computed(() => {
    const yesterday = this._yesterdayOrderCount();
    const today = this._todayOrderCount();
    if (yesterday === 0) return 0;
    return ((today - yesterday) / yesterday) * 100;
  });

  readonly _menuSetUp = signal(false);
  readonly _paymentsConfigured = signal(false);
  readonly _teamAdded = signal(false);

  readonly setupChecklist = computed<SetupCheckItem[]>(() => [
    {
      label: 'Set up your menu',
      description: 'Add items, categories, and modifiers',
      icon: 'bi-book',
      route: '/menu',
      done: this._menuSetUp(),
    },
    {
      label: 'Configure payments',
      description: 'Connect a payment processor',
      icon: 'bi-credit-card',
      route: '/settings',
      done: this._paymentsConfigured(),
    },
    {
      label: 'Add team members',
      description: 'Invite staff and set permissions',
      icon: 'bi-people',
      route: '/settings',
      done: this._teamAdded(),
    },
    {
      label: 'Take your first order',
      description: 'Process a test transaction',
      icon: 'bi-receipt',
      route: '/pos',
      done: this._todayOrderCount() > 0,
    },
  ]);

  readonly setupProgress = computed(() => {
    const items = this.setupChecklist();
    const done = items.filter(i => i.done).length;
    return Math.round((done / items.length) * 100);
  });

  readonly isSetupComplete = computed(() => this.setupProgress() === 100);

  readonly quickActions: QuickAction[] = [
    { label: 'Take payment', icon: 'bi-tv', route: '/pos', color: 'blue' },
    { label: 'View orders', icon: 'bi-receipt', route: '/orders', color: 'green' },
    { label: 'Add item', icon: 'bi-plus-circle', route: '/menu', color: 'purple' },
    { label: 'View reports', icon: 'bi-graph-up', route: '/command-center', color: 'amber' },
  ];

  ngOnInit(): void {
    this.loadTodayStats();
  }

  private async loadTodayStats(): Promise<void> {
    try {
      const stats = await this.analytics.getTodaySalesStats();
      if (stats) {
        this._todayNetSales.set(stats.netSales ?? 0);
        this._todayOrderCount.set(stats.orderCount ?? 0);
        this._yesterdayNetSales.set(stats.priorDayNetSales ?? 0);
        this._yesterdayOrderCount.set(stats.priorDayOrderCount ?? 0);
      }
    } catch {
      // Stats will show zeros — acceptable for first load
    }
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }

  formatPercent(value: number): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  }
}
