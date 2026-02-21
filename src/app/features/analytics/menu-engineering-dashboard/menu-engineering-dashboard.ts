import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { AnalyticsService } from '@services/analytics';
import { AuthService } from '@services/auth';
import { LoadingSpinner } from '@shared/loading-spinner/loading-spinner';
import { ErrorDisplay } from '@shared/error-display/error-display';
import { MenuEngineeringItem, MenuQuadrant } from '@models/index';

@Component({
  selector: 'os-menu-engineering',
  imports: [CurrencyPipe, LoadingSpinner, ErrorDisplay],
  templateUrl: './menu-engineering-dashboard.html',
  styleUrl: './menu-engineering-dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuEngineeringDashboard implements OnInit {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly authService = inject(AuthService);

  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly data = this.analyticsService.menuEngineering;
  readonly isLoading = this.analyticsService.isLoadingEngineering;
  readonly error = this.analyticsService.engineeringError;

  private readonly _days = signal(30);
  private readonly _sortField = signal<'name' | 'profitMargin' | 'popularity'>('profitMargin');
  private readonly _sortAsc = signal(false);
  private readonly _filterQuadrant = signal<MenuQuadrant | 'all'>('all');

  readonly days = this._days.asReadonly();
  readonly sortField = this._sortField.asReadonly();
  readonly sortAsc = this._sortAsc.asReadonly();
  readonly filterQuadrant = this._filterQuadrant.asReadonly();

  readonly filteredItems = computed(() => {
    const engineering = this.data();
    if (!engineering) return [];

    let items = [...engineering.items];
    const quadrant = this._filterQuadrant();
    if (quadrant !== 'all') {
      items = items.filter(item => item.classification === quadrant);
    }

    const field = this._sortField();
    const asc = this._sortAsc();
    items.sort((a, b) => {
      const aVal = a[field];
      const bVal = b[field];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return asc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return asc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

    return items;
  });

  ngOnInit(): void {
    if (this.isAuthenticated()) {
      this.analyticsService.loadMenuEngineering(this._days());
    }
  }

  setDays(days: number): void {
    this._days.set(days);
    this.analyticsService.loadMenuEngineering(days);
  }

  setSort(field: 'name' | 'profitMargin' | 'popularity'): void {
    if (this._sortField() === field) {
      this._sortAsc.update(v => !v);
    } else {
      this._sortField.set(field);
      this._sortAsc.set(false);
    }
  }

  setFilter(quadrant: MenuQuadrant | 'all'): void {
    this._filterQuadrant.set(quadrant);
  }

  getQuadrantClass(classification: MenuQuadrant): string {
    switch (classification) {
      case 'star': return 'quadrant-star';
      case 'cash-cow': return 'quadrant-cash-cow';
      case 'puzzle': return 'quadrant-puzzle';
      case 'dog': return 'quadrant-dog';
    }
  }

  getQuadrantLabel(classification: MenuQuadrant): string {
    switch (classification) {
      case 'star': return 'Star';
      case 'cash-cow': return 'Cash Cow';
      case 'puzzle': return 'Puzzle';
      case 'dog': return 'Dog';
    }
  }

  getInsightIcon(type: string): string {
    switch (type) {
      case 'action': return '!';
      case 'warning': return '!!';
      default: return 'i';
    }
  }

  retry(): void {
    this.analyticsService.loadMenuEngineering(this._days());
  }
}
