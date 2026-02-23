import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@services/auth';
import { PlatformService } from '@services/platform';
import { environment } from '@environments/environment';
import {
  ReportBlock,
  ReportBlockType,
  SavedReport,
  SavedReportFormData,
  ReportSchedule,
  ReportScheduleFormData,
  ReportDateRange,
  ReportExportFormat,
  HourlySalesRow,
  SectionSalesRow,
  ChannelBreakdownRow,
  DiscountReportRow,
  RefundReportRow,
  TeamMemberSalesRow,
  TaxServiceChargeReport,
  RealTimeKpi,
} from '@models/report.model';

const ALL_REPORT_BLOCKS: ReportBlock[] = [
  { type: 'sales_summary', label: 'Sales Summary', displayOrder: 1 },
  { type: 'payment_methods', label: 'Payment Methods', displayOrder: 2 },
  { type: 'item_sales', label: 'Item Sales', displayOrder: 3 },
  { type: 'category_sales', label: 'Category Sales', displayOrder: 4 },
  { type: 'modifier_sales', label: 'Modifier Sales', displayOrder: 5 },
  { type: 'team_member_sales', label: 'Team Member Sales', displayOrder: 6 },
  { type: 'discounts', label: 'Discounts', displayOrder: 7 },
  { type: 'voids_comps', label: 'Voids & Comps', displayOrder: 8 },
  { type: 'taxes_fees', label: 'Taxes & Fees', displayOrder: 9 },
  { type: 'tips', label: 'Tips', displayOrder: 10 },
  { type: 'hourly_breakdown', label: 'Hourly Breakdown', displayOrder: 11 },
  { type: 'section_sales', label: 'Section Sales', displayOrder: 12 },
  { type: 'channel_breakdown', label: 'Channel Breakdown', displayOrder: 13 },
  { type: 'refunds', label: 'Refunds', displayOrder: 14 },
];

@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly platformService = inject(PlatformService);
  private readonly apiUrl = environment.apiUrl;

  private get restaurantId(): string | null {
    return this.authService.selectedRestaurantId();
  }

  private readonly _savedReports = signal<SavedReport[]>([]);
  private readonly _schedules = signal<ReportSchedule[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly savedReports = this._savedReports.asReadonly();
  readonly schedules = this._schedules.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly availableBlocks = computed<ReportBlock[]>(() => {
    const flags = this.platformService.featureFlags();
    const modules = this.platformService.enabledModules();
    return ALL_REPORT_BLOCKS.filter(block => {
      switch (block.type) {
        case 'modifier_sales':
        case 'voids_comps':
          return flags.enableConversationalModifiers || modules.includes('menu_management');
        case 'tips':
          return flags.enableTipping;
        case 'section_sales':
          return flags.enableFloorPlan;
        case 'channel_breakdown':
          return modules.includes('online_ordering') || modules.includes('delivery');
        default:
          return true;
      }
    });
  });

  // --- Saved Reports ---

  async loadSavedReports(): Promise<void> {
    if (!this.restaurantId) return;
    this._isLoading.set(true);
    this._error.set(null);
    try {
      const reports = await firstValueFrom(
        this.http.get<SavedReport[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/reports/saved`
        )
      );
      this._savedReports.set(reports ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load saved reports';
      this._error.set(message);
      this._savedReports.set([]);
    } finally {
      this._isLoading.set(false);
    }
  }

  async createSavedReport(data: SavedReportFormData): Promise<SavedReport | null> {
    if (!this.restaurantId) return null;
    this._error.set(null);
    try {
      const report = await firstValueFrom(
        this.http.post<SavedReport>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/reports/saved`,
          data
        )
      );
      this._savedReports.update(list => [...list, report]);
      return report;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create report';
      this._error.set(message);
      return null;
    }
  }

  async updateSavedReport(id: string, data: SavedReportFormData): Promise<void> {
    if (!this.restaurantId) return;
    this._error.set(null);
    try {
      const updated = await firstValueFrom(
        this.http.patch<SavedReport>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/reports/saved/${id}`,
          data
        )
      );
      this._savedReports.update(list =>
        list.map(r => (r.id === id ? updated : r))
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update report';
      this._error.set(message);
    }
  }

  async deleteSavedReport(id: string): Promise<void> {
    if (!this.restaurantId) return;
    this._error.set(null);
    try {
      await firstValueFrom(
        this.http.delete(
          `${this.apiUrl}/restaurant/${this.restaurantId}/reports/saved/${id}`
        )
      );
      this._savedReports.update(list => list.filter(r => r.id !== id));
      this._schedules.update(list => list.filter(s => s.savedReportId !== id));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete report';
      this._error.set(message);
    }
  }

  // --- Report Execution ---

  async runReport(reportId: string, dateRange: ReportDateRange): Promise<Record<string, unknown> | null> {
    if (!this.restaurantId) return null;
    this._error.set(null);
    try {
      return await firstValueFrom(
        this.http.post<Record<string, unknown>>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/reports/run`,
          { reportId, ...dateRange }
        )
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to run report';
      this._error.set(message);
      return null;
    }
  }

  async exportReport(reportId: string, dateRange: ReportDateRange, format: ReportExportFormat): Promise<Blob | null> {
    if (!this.restaurantId) return null;
    this._error.set(null);
    try {
      return await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/restaurant/${this.restaurantId}/reports/export`,
          { reportId, format, ...dateRange },
          { responseType: 'blob' }
        )
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to export report';
      this._error.set(message);
      return null;
    }
  }

  // --- Schedules ---

  async loadSchedules(): Promise<void> {
    if (!this.restaurantId) return;
    this._error.set(null);
    try {
      const schedules = await firstValueFrom(
        this.http.get<ReportSchedule[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/reports/schedules`
        )
      );
      this._schedules.set(schedules ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load schedules';
      this._error.set(message);
      this._schedules.set([]);
    }
  }

  async createSchedule(data: ReportScheduleFormData): Promise<ReportSchedule | null> {
    if (!this.restaurantId) return null;
    this._error.set(null);
    try {
      const schedule = await firstValueFrom(
        this.http.post<ReportSchedule>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/reports/schedules`,
          data
        )
      );
      this._schedules.update(list => [...list, schedule]);
      return schedule;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create schedule';
      this._error.set(message);
      return null;
    }
  }

  async toggleSchedule(id: string, isActive: boolean): Promise<void> {
    if (!this.restaurantId) return;
    this._error.set(null);
    try {
      const updated = await firstValueFrom(
        this.http.patch<ReportSchedule>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/reports/schedules/${id}`,
          { isActive }
        )
      );
      this._schedules.update(list =>
        list.map(s => (s.id === id ? updated : s))
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update schedule';
      this._error.set(message);
    }
  }

  async deleteSchedule(id: string): Promise<void> {
    if (!this.restaurantId) return;
    this._error.set(null);
    try {
      await firstValueFrom(
        this.http.delete(
          `${this.apiUrl}/restaurant/${this.restaurantId}/reports/schedules/${id}`
        )
      );
      this._schedules.update(list => list.filter(s => s.id !== id));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete schedule';
      this._error.set(message);
    }
  }

  // --- Report Data Endpoints ---

  async getHourlySales(dateRange: ReportDateRange): Promise<HourlySalesRow[]> {
    if (!this.restaurantId) return [];
    this._error.set(null);
    try {
      const rows = await firstValueFrom(
        this.http.get<HourlySalesRow[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/reports/hourly-sales`,
          { params: { startDate: dateRange.startDate, endDate: dateRange.endDate } }
        )
      );
      return rows ?? [];
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load hourly sales';
      this._error.set(message);
      return [];
    }
  }

  async getSectionSales(dateRange: ReportDateRange): Promise<SectionSalesRow[]> {
    if (!this.restaurantId) return [];
    this._error.set(null);
    try {
      const rows = await firstValueFrom(
        this.http.get<SectionSalesRow[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/reports/section-sales`,
          { params: { startDate: dateRange.startDate, endDate: dateRange.endDate } }
        )
      );
      return rows ?? [];
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load section sales';
      this._error.set(message);
      return [];
    }
  }

  async getChannelBreakdown(dateRange: ReportDateRange): Promise<ChannelBreakdownRow[]> {
    if (!this.restaurantId) return [];
    this._error.set(null);
    try {
      const rows = await firstValueFrom(
        this.http.get<ChannelBreakdownRow[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/reports/channel-breakdown`,
          { params: { startDate: dateRange.startDate, endDate: dateRange.endDate } }
        )
      );
      return rows ?? [];
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load channel breakdown';
      this._error.set(message);
      return [];
    }
  }

  async getDiscountReport(dateRange: ReportDateRange): Promise<DiscountReportRow[]> {
    if (!this.restaurantId) return [];
    this._error.set(null);
    try {
      const rows = await firstValueFrom(
        this.http.get<DiscountReportRow[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/reports/discounts`,
          { params: { startDate: dateRange.startDate, endDate: dateRange.endDate } }
        )
      );
      return rows ?? [];
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load discount report';
      this._error.set(message);
      return [];
    }
  }

  async getRefundReport(dateRange: ReportDateRange): Promise<RefundReportRow[]> {
    if (!this.restaurantId) return [];
    this._error.set(null);
    try {
      const rows = await firstValueFrom(
        this.http.get<RefundReportRow[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/reports/refunds`,
          { params: { startDate: dateRange.startDate, endDate: dateRange.endDate } }
        )
      );
      return rows ?? [];
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load refund report';
      this._error.set(message);
      return [];
    }
  }

  // --- Phase 3: Team Member Sales ---

  async getTeamMemberSales(dateRange: ReportDateRange): Promise<TeamMemberSalesRow[]> {
    if (!this.restaurantId) return [];
    this._error.set(null);
    try {
      const rows = await firstValueFrom(
        this.http.get<TeamMemberSalesRow[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/reports/team-member-sales`,
          { params: { startDate: dateRange.startDate, endDate: dateRange.endDate } }
        )
      );
      return rows ?? [];
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load team member sales';
      this._error.set(message);
      return [];
    }
  }

  // --- Phase 3: Tax & Service Charge Report ---

  async getTaxServiceChargeReport(dateRange: ReportDateRange): Promise<TaxServiceChargeReport | null> {
    if (!this.restaurantId) return null;
    this._error.set(null);
    try {
      return await firstValueFrom(
        this.http.get<TaxServiceChargeReport>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/reports/tax-service-charges`,
          { params: { startDate: dateRange.startDate, endDate: dateRange.endDate } }
        )
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load tax report';
      this._error.set(message);
      return null;
    }
  }

  // --- Phase 3: Real-Time KPI ---

  async getRealTimeKpis(): Promise<RealTimeKpi | null> {
    if (!this.restaurantId) return null;
    try {
      return await firstValueFrom(
        this.http.get<RealTimeKpi>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/reports/realtime-kpis`
        )
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load real-time KPIs';
      console.error('[ReportService] getRealTimeKpis failed:', message);
      this._error.set(message);
      return null;
    }
  }

  clearError(): void {
    this._error.set(null);
  }
}
