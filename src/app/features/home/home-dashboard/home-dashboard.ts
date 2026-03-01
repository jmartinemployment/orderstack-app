import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { PlatformService } from '@services/platform';
import { AnalyticsService } from '@services/analytics';
import { MenuService } from '@services/menu';
import { PwaInstallService } from '@services/pwa-install';

interface SetupTask {
  id: string;
  label: string;
  description: string;
  icon: string;
  route: string;
  done: boolean;
  category: 'essential' | 'advanced';
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
  private readonly menuService = inject(MenuService);
  readonly pwaInstall = inject(PwaInstallService);

  readonly businessName = computed(() => this.platform.merchantProfile()?.businessName ?? 'Your Business');
  readonly todayDate = signal(new Date());

  readonly isRetailMode = this.platform.isRetailMode;
  readonly isServiceMode = this.platform.isServiceMode;
  readonly isRestaurantMode = this.platform.isRestaurantMode;

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

  // Setup task completion state (persisted in localStorage)
  readonly _completedTasks = signal<Set<string>>(new Set());
  readonly _showAdvancedTasks = signal(false);

  // Whether menu has been seeded (from cuisine template or manual creation)
  readonly _menuHasCategories = signal(false);

  readonly setupTasks = computed<SetupTask[]>(() => {
    const done = this._completedTasks();
    const retail = this.isRetailMode();
    const service = this.isServiceMode();
    const menuSeeded = this._menuHasCategories();

    const itemsExplicitlyDone = done.has('items');
    const itemsLabel = menuSeeded
      ? (retail ? 'Review your products' : service ? 'Review your services' : 'Review your menu')
      : (retail ? 'Add your first products' : service ? 'Create your first services' : 'Create your first menu items');
    const itemsDesc = menuSeeded
      ? (retail ? 'Review and update your catalog' : service ? 'Review your service offerings' : 'Review menu categories and items')
      : (retail ? 'Add products to your catalog' : service ? 'Set up your service offerings' : 'Add menu items, categories, and modifiers');
    const itemsRoute = retail ? '/retail/catalog' : '/menu';
    const itemsIcon = retail ? 'bi-grid-3x3-gap' : 'bi-book';

    return [
      // Essential tasks
      {
        id: 'items',
        label: itemsLabel,
        description: itemsDesc,
        icon: itemsIcon,
        route: itemsRoute,
        done: itemsExplicitlyDone,
        category: 'essential',
      },
      {
        id: 'taxes',
        label: 'Set up taxes',
        description: 'Configure tax rates for your location',
        icon: 'bi-percent',
        route: '/settings',
        done: done.has('taxes'),
        category: 'essential',
      },
      {
        id: 'team',
        label: 'Add team members',
        description: 'Invite staff and set permissions',
        icon: 'bi-people',
        route: '/settings',
        done: done.has('team'),
        category: 'essential',
      },
      {
        id: 'hours',
        label: 'Set your business hours',
        description: 'Configure your regular operating hours',
        icon: 'bi-clock',
        route: '/settings',
        done: true, // Wizard always sets default business hours
        category: 'essential',
      },
      // Advanced tasks
      {
        id: 'display',
        label: 'Configure your display',
        description: 'Set up KDS, customer display, or kiosk',
        icon: 'bi-display',
        route: '/settings',
        done: done.has('display'),
        category: 'advanced',
      },
      {
        id: 'discounts',
        label: 'Create discounts',
        description: 'Set up promotions and special offers',
        icon: 'bi-tag',
        route: '/settings',
        done: done.has('discounts'),
        category: 'advanced',
      },
      {
        id: 'hardware',
        label: 'Set up hardware',
        description: 'Tablets, card readers, printers, and more',
        icon: 'bi-cpu',
        route: '/hardware-guide',
        done: done.has('hardware'),
        category: 'advanced',
      },
      {
        id: 'pin',
        label: 'Set owner PIN',
        description: 'Security PIN for POS access and clock-in',
        icon: 'bi-shield-lock',
        route: '/settings',
        done: done.has('pin'),
        category: 'advanced',
      },
    ];
  });

  readonly essentialTasks = computed(() =>
    this.setupTasks().filter(t => t.category === 'essential' && !t.done)
  );

  readonly advancedTasks = computed(() =>
    this.setupTasks().filter(t => t.category === 'advanced' && !t.done)
  );

  readonly essentialProgress = computed(() => {
    const tasks = this.setupTasks().filter(t => t.category === 'essential');
    const done = tasks.filter(t => t.done).length;
    return Math.round((done / tasks.length) * 100);
  });

  readonly isEssentialComplete = computed(() => this.essentialProgress() === 100);

  readonly quickActions = computed<QuickAction[]>(() => {
    const retail = this.isRetailMode();
    const service = this.isServiceMode();

    if (retail) {
      return [
        { label: 'Scan item', icon: 'bi-upc-scan', route: '/retail/pos', color: 'blue' },
        { label: 'View orders', icon: 'bi-receipt', route: '/orders', color: 'green' },
        { label: 'Add product', icon: 'bi-plus-circle', route: '/retail/catalog', color: 'purple' },
        { label: 'View reports', icon: 'bi-graph-up', route: '/reports', color: 'amber' },
      ];
    }

    if (service) {
      return [
        { label: 'New invoice', icon: 'bi-file-earmark-text', route: '/invoicing', color: 'blue' },
        { label: 'Bookings', icon: 'bi-calendar-check', route: '/bookings', color: 'green' },
        { label: 'Add service', icon: 'bi-plus-circle', route: '/menu', color: 'purple' },
        { label: 'View reports', icon: 'bi-graph-up', route: '/reports', color: 'amber' },
      ];
    }

    return [
      { label: 'Take payment', icon: 'bi-tv', route: '/pos', color: 'blue' },
      { label: 'View orders', icon: 'bi-receipt', route: '/orders', color: 'green' },
      { label: 'Add item', icon: 'bi-plus-circle', route: '/menu', color: 'purple' },
      { label: 'View reports', icon: 'bi-graph-up', route: '/reports', color: 'amber' },
    ];
  });

  ngOnInit(): void {
    this.loadTodayStats();
    this.loadCompletedTasks();
    this.checkMenuSeeded();
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

  private async checkMenuSeeded(): Promise<void> {
    try {
      await this.menuService.loadMenu();
      const categories = this.menuService.categories();
      if (categories.length > 0) {
        this._menuHasCategories.set(true);
      }
    } catch {
      // If menu fetch fails, leave as false — task stays undone
    }
  }

  private loadCompletedTasks(): void {
    const raw = localStorage.getItem('os-setup-tasks');
    if (raw) {
      try {
        const arr = JSON.parse(raw) as string[];
        this._completedTasks.set(new Set(arr));
      } catch {
        // Ignore invalid data
      }
    }
  }

  private saveCompletedTasks(): void {
    const arr = [...this._completedTasks()];
    localStorage.setItem('os-setup-tasks', JSON.stringify(arr));
  }

  markTaskDone(taskId: string): void {
    this._completedTasks.update(set => {
      const next = new Set(set);
      next.add(taskId);
      return next;
    });
    this.saveCompletedTasks();
  }

  toggleAdvancedTasks(): void {
    this._showAdvancedTasks.update(v => !v);
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  navigateAndMark(task: SetupTask): void {
    if (!task.done) {
      this.markTaskDone(task.id);
    }
    this.router.navigate([task.route]);
  }

  dismissInstallBanner(): void {
    this.pwaInstall.dismissInstall();
  }

  async installApp(): Promise<void> {
    await this.pwaInstall.promptInstall();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }

  formatPercent(value: number): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  }
}
