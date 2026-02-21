import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { AnalyticsService } from '@services/analytics';
import { AuthService } from '@services/auth';
import { LoadingSpinner } from '@shared/loading-spinner/loading-spinner';
import { ErrorDisplay } from '@shared/error-display/error-display';

@Component({
  selector: 'os-sales-dashboard',
  imports: [CurrencyPipe, LoadingSpinner, ErrorDisplay],
  templateUrl: './sales-dashboard.html',
  styleUrl: './sales-dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalesDashboard implements OnInit {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly authService = inject(AuthService);

  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly report = this.analyticsService.salesReport;
  readonly isLoading = this.analyticsService.isLoadingSales;
  readonly error = this.analyticsService.salesError;

  private readonly _period = signal<'daily' | 'weekly'>('daily');
  readonly period = this._period.asReadonly();

  ngOnInit(): void {
    if (this.isAuthenticated()) {
      this.analyticsService.loadSalesReport(this._period());
    }
  }

  setPeriod(period: 'daily' | 'weekly'): void {
    this._period.set(period);
    this.analyticsService.loadSalesReport(period);
  }

  formatHour(hour: number): string {
    if (hour === 0) return '12am';
    if (hour < 12) return `${hour}am`;
    if (hour === 12) return '12pm';
    return `${hour - 12}pm`;
  }

  getChangeClass(change: number | undefined): string {
    if (change === undefined) return '';
    if (change > 0) return 'text-success';
    if (change < 0) return 'text-danger';
    return 'text-muted';
  }

  getChangeIcon(change: number | undefined): string {
    if (change === undefined) return '';
    if (change > 0) return '+';
    return '';
  }

  getInsightClass(type: string): string {
    switch (type) {
      case 'positive': return 'insight-positive';
      case 'negative': return 'insight-negative';
      default: return 'insight-neutral';
    }
  }

  retry(): void {
    this.analyticsService.loadSalesReport(this._period());
  }
}
