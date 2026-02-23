import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@services/auth';
import { environment } from '@environments/environment';
import {
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
} from '@models/report.model';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
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

  // --- Saved Reports ---

  async loadSavedReports(): Promise<void> {
    if (!this.restaurantId) return;
    this._isLoading.set(true);
    try {
      const reports = await firstValueFrom(
        this.http.get<SavedReport[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/reports/saved`
        )
      );
      this._savedReports.set(reports ?? []);
    } catch {
      this._savedReports.set([]);
    } finally {
      this._isLoading.set(false);
    }
  }

  async createSavedReport(data: SavedReportFormData): Promise<SavedReport | null> {
    if (!this.restaurantId) return null;
    try {
      const report = await firstValueFrom(
        this.http.post<SavedReport>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/reports/saved`,
          data
        )
      );
      this._savedReports.update(list => [...list, report]);
      return report;
    } catch {
      this._error.set('Failed to create report');
      return null;
    }
  }

  async updateSavedReport(id: string, data: SavedReportFormData): Promise<void> {
    if (!this.restaurantId) return;
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
    } catch {
      this._error.set('Failed to update report');
    }
  }

  async deleteSavedReport(id: string): Promise<void> {
    if (!this.restaurantId) return;
    try {
      await firstValueFrom(
        this.http.delete(
          `${this.apiUrl}/restaurant/${this.restaurantId}/reports/saved/${id}`
        )
      );
      this._savedReports.update(list => list.filter(r => r.id !== id));
    } catch {
      this._error.set('Failed to delete report');
    }
  }

  // --- Report Execution ---

  async runReport(reportId: string, dateRange: ReportDateRange): Promise<Record<string, unknown> | null> {
    if (!this.restaurantId) return null;
    try {
      return await firstValueFrom(
        this.http.post<Record<string, unknown>>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/reports/run`,
          { reportId, ...dateRange }
        )
      );
    } catch {
      this._error.set('Failed to run report');
      return null;
    }
  }

  async exportReport(reportId: string, dateRange: ReportDateRange, format: ReportExportFormat): Promise<Blob | null> {
    if (!this.restaurantId) return null;
    try {
      return await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/restaurant/${this.restaurantId}/reports/export`,
          { reportId, format, ...dateRange },
          { responseType: 'blob' }
        )
      );
    } catch {
      this._error.set('Failed to export report');
      return null;
    }
  }

  // --- Schedules ---

  async loadSchedules(): Promise<void> {
    if (!this.restaurantId) return;
    try {
      const schedules = await firstValueFrom(
        this.http.get<ReportSchedule[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/reports/schedules`
        )
      );
      this._schedules.set(schedules ?? []);
    } catch {
      this._schedules.set([]);
    }
  }

  async createSchedule(data: ReportScheduleFormData): Promise<ReportSchedule | null> {
    if (!this.restaurantId) return null;
    try {
      const schedule = await firstValueFrom(
        this.http.post<ReportSchedule>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/reports/schedules`,
          data
        )
      );
      this._schedules.update(list => [...list, schedule]);
      return schedule;
    } catch {
      this._error.set('Failed to create schedule');
      return null;
    }
  }

  async deleteSchedule(id: string): Promise<void> {
    if (!this.restaurantId) return;
    try {
      await firstValueFrom(
        this.http.delete(
          `${this.apiUrl}/restaurant/${this.restaurantId}/reports/schedules/${id}`
        )
      );
      this._schedules.update(list => list.filter(s => s.id !== id));
    } catch {
      this._error.set('Failed to delete schedule');
    }
  }

  // --- Report Data Endpoints ---

  async getHourlySales(dateRange: ReportDateRange): Promise<HourlySalesRow[]> {
    if (!this.restaurantId) return [];
    try {
      const rows = await firstValueFrom(
        this.http.get<HourlySalesRow[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/reports/hourly-sales`,
          { params: { startDate: dateRange.startDate, endDate: dateRange.endDate } }
        )
      );
      return rows ?? [];
    } catch {
      return [];
    }
  }

  async getSectionSales(dateRange: ReportDateRange): Promise<SectionSalesRow[]> {
    if (!this.restaurantId) return [];
    try {
      const rows = await firstValueFrom(
        this.http.get<SectionSalesRow[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/reports/section-sales`,
          { params: { startDate: dateRange.startDate, endDate: dateRange.endDate } }
        )
      );
      return rows ?? [];
    } catch {
      return [];
    }
  }

  async getChannelBreakdown(dateRange: ReportDateRange): Promise<ChannelBreakdownRow[]> {
    if (!this.restaurantId) return [];
    try {
      const rows = await firstValueFrom(
        this.http.get<ChannelBreakdownRow[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/reports/channel-breakdown`,
          { params: { startDate: dateRange.startDate, endDate: dateRange.endDate } }
        )
      );
      return rows ?? [];
    } catch {
      return [];
    }
  }

  async getDiscountReport(dateRange: ReportDateRange): Promise<DiscountReportRow[]> {
    if (!this.restaurantId) return [];
    try {
      const rows = await firstValueFrom(
        this.http.get<DiscountReportRow[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/reports/discounts`,
          { params: { startDate: dateRange.startDate, endDate: dateRange.endDate } }
        )
      );
      return rows ?? [];
    } catch {
      return [];
    }
  }

  async getRefundReport(dateRange: ReportDateRange): Promise<RefundReportRow[]> {
    if (!this.restaurantId) return [];
    try {
      const rows = await firstValueFrom(
        this.http.get<RefundReportRow[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/reports/refunds`,
          { params: { startDate: dateRange.startDate, endDate: dateRange.endDate } }
        )
      );
      return rows ?? [];
    } catch {
      return [];
    }
  }

  clearError(): void {
    this._error.set(null);
  }
}
