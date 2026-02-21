import { Component, inject, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { CurrencyPipe, DecimalPipe, DatePipe } from '@angular/common';
import { CustomerService } from '@services/customer';
import { AuthService } from '@services/auth';
import { LoyaltyService } from '@services/loyalty';
import { LoadingSpinner } from '@shared/loading-spinner/loading-spinner';
import { ErrorDisplay } from '@shared/error-display/error-display';
import { Customer, CustomerSegment, CrmTab, CrmSortField, LoyaltyTransaction, getTierLabel, getTierColor } from '@models/index';

@Component({
  selector: 'os-crm',
  imports: [CurrencyPipe, DecimalPipe, DatePipe, LoadingSpinner, ErrorDisplay],
  templateUrl: './customer-dashboard.html',
  styleUrl: './customer-dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerDashboard {
  private readonly customerService = inject(CustomerService);
  private readonly authService = inject(AuthService);
  private readonly loyaltyService = inject(LoyaltyService);

  readonly isAuthenticated = this.authService.isAuthenticated;

  private readonly _activeTab = signal<CrmTab>('customers');
  private readonly _searchTerm = signal('');
  private readonly _segmentFilter = signal<CustomerSegment | null>(null);
  private readonly _sortField = signal<CrmSortField>('totalSpent');
  private readonly _sortAsc = signal(false);
  private readonly _selectedCustomer = signal<Customer | null>(null);

  // Loyalty detail
  private readonly _loyaltyHistory = signal<LoyaltyTransaction[]>([]);
  private readonly _isLoadingLoyalty = signal(false);
  private readonly _adjustPoints = signal(0);
  private readonly _adjustReason = signal('');
  private readonly _isAdjusting = signal(false);

  readonly activeTab = this._activeTab.asReadonly();
  readonly searchTerm = this._searchTerm.asReadonly();
  readonly segmentFilter = this._segmentFilter.asReadonly();
  readonly sortField = this._sortField.asReadonly();
  readonly sortAsc = this._sortAsc.asReadonly();
  readonly selectedCustomer = this._selectedCustomer.asReadonly();
  readonly loyaltyHistory = this._loyaltyHistory.asReadonly();
  readonly isLoadingLoyalty = this._isLoadingLoyalty.asReadonly();
  readonly adjustPoints = this._adjustPoints.asReadonly();
  readonly adjustReason = this._adjustReason.asReadonly();
  readonly isAdjusting = this._isAdjusting.asReadonly();
  readonly loyaltyConfig = this.loyaltyService.config;

  readonly customers = this.customerService.customers;
  readonly isLoading = this.customerService.isLoading;
  readonly error = this.customerService.error;

  readonly filteredCustomers = computed(() => {
    let list = this.customers();
    const search = this._searchTerm().toLowerCase();
    const segment = this._segmentFilter();

    if (search) {
      list = list.filter(c =>
        (c.firstName ?? '').toLowerCase().includes(search) ||
        (c.lastName ?? '').toLowerCase().includes(search) ||
        (c.email ?? '').toLowerCase().includes(search) ||
        (c.phone ?? '').includes(search)
      );
    }

    if (segment) {
      list = list.filter(c => this.customerService.getSegment(c).segment === segment);
    }

    const field = this._sortField();
    const asc = this._sortAsc();
    list = [...list].sort((a, b) => {
      let cmp = 0;
      switch (field) {
        case 'name':
          cmp = (a.firstName ?? '').localeCompare(b.firstName ?? '');
          break;
        case 'totalSpent':
          cmp = a.totalSpent - b.totalSpent;
          break;
        case 'totalOrders':
          cmp = a.totalOrders - b.totalOrders;
          break;
        case 'lastOrderDate':
          cmp = new Date(a.lastOrderDate ?? 0).getTime() - new Date(b.lastOrderDate ?? 0).getTime();
          break;
        case 'loyaltyPoints':
          cmp = a.loyaltyPoints - b.loyaltyPoints;
          break;
      }
      return asc ? cmp : -cmp;
    });

    return list;
  });

  readonly segmentCounts = computed(() => {
    const counts = { vip: 0, regular: 0, new: 0, 'at-risk': 0, dormant: 0 };
    for (const customer of this.customers()) {
      const seg = this.customerService.getSegment(customer).segment;
      counts[seg]++;
    }
    return counts;
  });

  readonly totalCustomers = computed(() => this.customers().length);
  readonly totalRevenue = computed(() =>
    this.customers().reduce((sum, c) => sum + c.totalSpent, 0)
  );
  readonly avgLifetimeValue = computed(() => {
    const count = this.totalCustomers();
    return count > 0 ? this.totalRevenue() / count : 0;
  });
  readonly totalLoyaltyPoints = computed(() =>
    this.customers().reduce((sum, c) => sum + c.loyaltyPoints, 0)
  );

  constructor() {
    effect(() => {
      if (this.isAuthenticated() && this.authService.selectedRestaurantId()) {
        this.customerService.loadCustomers();
        this.loyaltyService.loadConfig();
      }
    });
  }

  setTab(tab: CrmTab): void {
    this._activeTab.set(tab);
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this._searchTerm.set(value);
  }

  setSegmentFilter(segment: CustomerSegment | null): void {
    this._segmentFilter.set(segment);
  }

  toggleSort(field: CrmSortField): void {
    if (this._sortField() === field) {
      this._sortAsc.update(v => !v);
    } else {
      this._sortField.set(field);
      this._sortAsc.set(false);
    }
  }

  selectCustomer(customer: Customer): void {
    this._selectedCustomer.set(customer);
    this._loyaltyHistory.set([]);
    this._adjustPoints.set(0);
    this._adjustReason.set('');
    this.loadLoyaltyHistory(customer.id);
  }

  closeDetail(): void {
    this._selectedCustomer.set(null);
    this._loyaltyHistory.set([]);
  }

  // --- Loyalty ---

  getLoyaltyTierLabel(customer: Customer): string {
    return getTierLabel(customer.loyaltyTier);
  }

  getLoyaltyTierColor(customer: Customer): string {
    return getTierColor(customer.loyaltyTier);
  }

  getTierProgress(customer: Customer): number {
    const config = this.loyaltyConfig();
    const earned = customer.totalPointsEarned;
    const tier = customer.loyaltyTier;
    if (tier === 'platinum') return 100;
    const thresholds = { bronze: 0, silver: config.tierSilverMin, gold: config.tierGoldMin, platinum: config.tierPlatinumMin };
    const nextTier = tier === 'bronze' ? 'silver' : tier === 'silver' ? 'gold' : 'platinum';
    const current = thresholds[tier];
    const next = thresholds[nextTier];
    if (next <= current) return 100;
    return Math.min(100, Math.round(((earned - current) / (next - current)) * 100));
  }

  getNextTierLabel(customer: Customer): string {
    const tier = customer.loyaltyTier;
    if (tier === 'platinum') return '';
    return tier === 'bronze' ? 'Silver' : tier === 'silver' ? 'Gold' : 'Platinum';
  }

  onAdjustPointsInput(event: Event): void {
    this._adjustPoints.set(Number.parseInt((event.target as HTMLInputElement).value, 10) || 0);
  }

  onAdjustReasonInput(event: Event): void {
    this._adjustReason.set((event.target as HTMLInputElement).value);
  }

  async submitAdjustment(): Promise<void> {
    const customer = this._selectedCustomer();
    const points = this._adjustPoints();
    const reason = this._adjustReason().trim();
    if (!customer || points === 0 || !reason) return;

    this._isAdjusting.set(true);
    try {
      const success = await this.loyaltyService.adjustPoints(customer.id, points, reason);
      if (success) {
        this._adjustPoints.set(0);
        this._adjustReason.set('');
        await this.loadLoyaltyHistory(customer.id);
        this.customerService.loadCustomers();
      }
    } finally {
      this._isAdjusting.set(false);
    }
  }

  private async loadLoyaltyHistory(customerId: string): Promise<void> {
    this._isLoadingLoyalty.set(true);
    try {
      const history = await this.loyaltyService.getPointsHistory(customerId);
      this._loyaltyHistory.set(history);
    } finally {
      this._isLoadingLoyalty.set(false);
    }
  }

  getSegment(customer: Customer) {
    return this.customerService.getSegment(customer);
  }

  getCustomerName(customer: Customer): string {
    const parts = [customer.firstName, customer.lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : 'Unknown';
  }

  getDaysSinceOrder(customer: Customer): number | null {
    if (!customer.lastOrderDate) return null;
    return Math.floor((Date.now() - new Date(customer.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24));
  }

  getSortIcon(field: CrmSortField): string {
    if (this._sortField() !== field) return '';
    return this._sortAsc() ? 'asc' : 'desc';
  }

  clearError(): void {
    this.customerService.clearError();
  }

  retry(): void {
    this.customerService.loadCustomers();
  }
}
