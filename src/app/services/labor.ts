import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  StaffMember,
  Shift,
  ShiftFormData,
  TimeEntry,
  LaborReport,
  LaborRecommendation,
  LaborTarget,
  SwapRequest,
  AvailabilityPreference,
  StaffEarnings,
  Timecard,
  TimecardBreak,
  BreakType,
  TimecardEdit,
  TimecardEditStatus,
  WorkweekConfig,
  PosSession,
  ScheduleTemplate,
  LiveLaborData,
  StaffNotification,
  PayrollPeriod,
  CommissionRule,
  CommissionCalculation,
  PtoPolicy,
  PtoRequest,
  PtoRequestStatus,
  PtoBalance,
  LaborForecast,
  ComplianceAlert,
  ComplianceSummary,
} from '../models';
import { AuthService } from './auth';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root',
})
export class LaborService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  private readonly _staffMembers = signal<StaffMember[]>([]);
  private readonly _shifts = signal<Shift[]>([]);
  private readonly _activeClocks = signal<TimeEntry[]>([]);
  private readonly _laborReport = signal<LaborReport | null>(null);
  private readonly _recommendations = signal<LaborRecommendation[]>([]);
  private readonly _laborTargets = signal<LaborTarget[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly staffMembers = this._staffMembers.asReadonly();
  readonly shifts = this._shifts.asReadonly();
  readonly activeClocks = this._activeClocks.asReadonly();
  readonly laborReport = this._laborReport.asReadonly();
  readonly recommendations = this._recommendations.asReadonly();
  readonly laborTargets = this._laborTargets.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  // --- Timecard signals ---
  private readonly _timecards = signal<Timecard[]>([]);
  private readonly _breakTypes = signal<BreakType[]>([]);
  private readonly _workweekConfig = signal<WorkweekConfig | null>(null);
  private readonly _posSession = signal<PosSession | null>(null);
  private readonly _timecardEdits = signal<TimecardEdit[]>([]);

  readonly timecards = this._timecards.asReadonly();
  readonly breakTypes = this._breakTypes.asReadonly();
  readonly workweekConfig = this._workweekConfig.asReadonly();
  readonly posSession = this._posSession.asReadonly();
  readonly timecardEdits = this._timecardEdits.asReadonly();

  // --- Schedule Template signals ---
  private readonly _scheduleTemplates = signal<ScheduleTemplate[]>([]);
  readonly scheduleTemplates = this._scheduleTemplates.asReadonly();

  // --- Live Labor signals ---
  private readonly _liveLabor = signal<LiveLaborData | null>(null);
  readonly liveLabor = this._liveLabor.asReadonly();

  // --- Notification signals ---
  private readonly _notifications = signal<StaffNotification[]>([]);
  readonly notifications = this._notifications.asReadonly();

  // --- Payroll signals ---
  private readonly _payrollPeriods = signal<PayrollPeriod[]>([]);
  private readonly _selectedPayroll = signal<PayrollPeriod | null>(null);
  readonly payrollPeriods = this._payrollPeriods.asReadonly();
  readonly selectedPayroll = this._selectedPayroll.asReadonly();

  // --- Commission signals ---
  private readonly _commissionRules = signal<CommissionRule[]>([]);
  private readonly _commissionCalculations = signal<CommissionCalculation[]>([]);
  readonly commissionRules = this._commissionRules.asReadonly();
  readonly commissionCalculations = this._commissionCalculations.asReadonly();

  // --- PTO signals ---
  private readonly _ptoPolicies = signal<PtoPolicy[]>([]);
  private readonly _ptoRequests = signal<PtoRequest[]>([]);
  private readonly _ptoBalances = signal<PtoBalance[]>([]);
  readonly ptoPolicies = this._ptoPolicies.asReadonly();
  readonly ptoRequests = this._ptoRequests.asReadonly();
  readonly ptoBalances = this._ptoBalances.asReadonly();

  // --- Labor Forecasting signals ---
  private readonly _laborForecast = signal<LaborForecast | null>(null);
  readonly laborForecast = this._laborForecast.asReadonly();

  // --- Compliance signals ---
  private readonly _complianceAlerts = signal<ComplianceAlert[]>([]);
  private readonly _complianceSummary = signal<ComplianceSummary | null>(null);
  readonly complianceAlerts = this._complianceAlerts.asReadonly();
  readonly complianceSummary = this._complianceSummary.asReadonly();

  private get restaurantId(): string | null {
    return this.authService.selectedRestaurantId();
  }

  async loadStaffMembers(): Promise<void> {
    if (!this.restaurantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<StaffMember[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/staff/pins`
        )
      );
      this._staffMembers.set(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load staff members';
      this._error.set(message);
    }
  }

  async loadShifts(startDate: string, endDate: string): Promise<void> {
    if (!this.restaurantId) return;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const data = await firstValueFrom(
        this.http.get<Shift[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/staff/shifts`,
          { params: { startDate, endDate } }
        )
      );
      this._shifts.set(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load shifts';
      this._error.set(message);
    } finally {
      this._isLoading.set(false);
    }
  }

  async createShift(data: ShiftFormData): Promise<Shift | null> {
    if (!this.restaurantId) return null;

    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.post<Shift>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/staff/shifts`,
          data
        )
      );
      this._shifts.update(s => [...s, result]);
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create shift';
      this._error.set(message);
      return null;
    }
  }

  async updateShift(shiftId: string, data: Partial<ShiftFormData>): Promise<Shift | null> {
    if (!this.restaurantId) return null;

    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.patch<Shift>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/staff/shifts/${shiftId}`,
          data
        )
      );
      this._shifts.update(s => s.map(sh => sh.id === shiftId ? result : sh));
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update shift';
      this._error.set(message);
      return null;
    }
  }

  async deleteShift(shiftId: string): Promise<boolean> {
    if (!this.restaurantId) return false;

    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.delete(
          `${this.apiUrl}/restaurant/${this.restaurantId}/staff/shifts/${shiftId}`
        )
      );
      this._shifts.update(s => s.filter(sh => sh.id !== shiftId));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete shift';
      this._error.set(message);
      return false;
    }
  }

  async publishWeek(weekStartDate: string): Promise<boolean> {
    if (!this.restaurantId) return false;

    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/restaurant/${this.restaurantId}/staff/shifts/publish`,
          { weekStartDate }
        )
      );
      this._shifts.update(s => s.map(sh => ({ ...sh, isPublished: true })));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to publish week';
      this._error.set(message);
      return false;
    }
  }

  async clockIn(staffPinId: string, shiftId?: string): Promise<TimeEntry | null> {
    if (!this.restaurantId) return null;

    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.post<TimeEntry>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/staff/clock-in`,
          { staffPinId, shiftId }
        )
      );
      this._activeClocks.update(c => [...c, result]);
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to clock in';
      this._error.set(message);
      return null;
    }
  }

  async clockOut(timeEntryId: string, breakMinutes?: number): Promise<boolean> {
    if (!this.restaurantId) return false;

    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/restaurant/${this.restaurantId}/staff/clock-out/${timeEntryId}`,
          { breakMinutes }
        )
      );
      this._activeClocks.update(c => c.filter(e => e.id !== timeEntryId));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to clock out';
      this._error.set(message);
      return false;
    }
  }

  async loadActiveClocks(): Promise<void> {
    if (!this.restaurantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<TimeEntry[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/staff/active-clocks`
        )
      );
      this._activeClocks.set(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load active clocks';
      this._error.set(message);
    }
  }

  async loadLaborReport(startDate: string, endDate: string): Promise<void> {
    if (!this.restaurantId) return;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const data = await firstValueFrom(
        this.http.get<LaborReport>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/staff/labor-report`,
          { params: { startDate, endDate } }
        )
      );
      this._laborReport.set(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load labor report';
      this._error.set(message);
    } finally {
      this._isLoading.set(false);
    }
  }

  async loadRecommendations(): Promise<void> {
    if (!this.restaurantId) return;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const data = await firstValueFrom(
        this.http.get<LaborRecommendation[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/staff/labor-recommendations`
        )
      );
      this._recommendations.set(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load recommendations';
      this._error.set(message);
    } finally {
      this._isLoading.set(false);
    }
  }

  async loadTargets(): Promise<void> {
    if (!this.restaurantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<LaborTarget[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/staff/labor-targets`
        )
      );
      // Cast targetPercent from Prisma Decimal (string) to number
      this._laborTargets.set(data.map(t => ({
        ...t,
        targetPercent: Number(t.targetPercent),
        targetCost: t.targetCost !== null ? Number(t.targetCost) : null,
      })));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load labor targets';
      this._error.set(message);
    }
  }

  // --- Staff Portal methods ---

  async validateStaffPin(pin: string): Promise<StaffMember | null> {
    if (!this.restaurantId) return null;

    try {
      const result = await firstValueFrom(
        this.http.post<{ valid: boolean; staffPinId: string; name: string; role: string }>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/auth/validate-pin`,
          { pin }
        )
      );
      if (result.valid) {
        return { id: result.staffPinId, name: result.name, role: result.role };
      }
      return null;
    } catch {
      return null;
    }
  }

  async loadStaffShifts(staffPinId: string, startDate: string, endDate: string): Promise<Shift[]> {
    if (!this.restaurantId) return [];

    try {
      const data = await firstValueFrom(
        this.http.get<Shift[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/staff/shifts`,
          { params: { startDate, endDate, staffPinId } }
        )
      );
      return data;
    } catch {
      return [];
    }
  }

  async loadStaffEarnings(staffPinId: string, startDate: string, endDate: string): Promise<StaffEarnings | null> {
    if (!this.restaurantId) return null;

    try {
      return await firstValueFrom(
        this.http.get<StaffEarnings>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/staff/${staffPinId}/earnings`,
          { params: { startDate, endDate } }
        )
      );
    } catch {
      return null;
    }
  }

  async loadAvailability(staffPinId: string): Promise<AvailabilityPreference[]> {
    if (!this.restaurantId) return [];

    try {
      return await firstValueFrom(
        this.http.get<AvailabilityPreference[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/staff/${staffPinId}/availability`
        )
      );
    } catch {
      return [];
    }
  }

  async saveAvailability(staffPinId: string, prefs: Partial<AvailabilityPreference>[]): Promise<boolean> {
    if (!this.restaurantId) return false;

    try {
      await firstValueFrom(
        this.http.put(
          `${this.apiUrl}/restaurant/${this.restaurantId}/staff/${staffPinId}/availability`,
          { preferences: prefs }
        )
      );
      return true;
    } catch {
      return false;
    }
  }

  async loadSwapRequests(staffPinId: string): Promise<SwapRequest[]> {
    if (!this.restaurantId) return [];

    try {
      return await firstValueFrom(
        this.http.get<SwapRequest[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/staff/${staffPinId}/swap-requests`
        )
      );
    } catch {
      return [];
    }
  }

  async createSwapRequest(shiftId: string, requestorPinId: string, reason: string): Promise<SwapRequest | null> {
    if (!this.restaurantId) return null;

    try {
      return await firstValueFrom(
        this.http.post<SwapRequest>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/staff/swap-requests`,
          { shiftId, requestorPinId, reason }
        )
      );
    } catch {
      return null;
    }
  }

  async respondToSwapRequest(requestId: string, action: 'approved' | 'rejected', respondedBy: string): Promise<boolean> {
    if (!this.restaurantId) return false;

    try {
      await firstValueFrom(
        this.http.patch(
          `${this.apiUrl}/restaurant/${this.restaurantId}/staff/swap-requests/${requestId}`,
          { status: action, respondedBy }
        )
      );
      return true;
    } catch {
      return false;
    }
  }

  async setTarget(dayOfWeek: number, targetPercent: number, targetCost?: number): Promise<boolean> {
    if (!this.restaurantId) return false;

    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.put(
          `${this.apiUrl}/restaurant/${this.restaurantId}/staff/labor-targets`,
          { dayOfWeek, targetPercent, targetCost }
        )
      );
      await this.loadTargets();
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to set labor target';
      this._error.set(message);
      return false;
    }
  }

  // ============ Timecard Methods ============

  async loadTimecards(filters?: { status?: string; startDate?: string; endDate?: string; teamMemberId?: string }): Promise<void> {
    if (!this.restaurantId) return;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const params: Record<string, string> = {};
      if (filters?.status) params['status'] = filters.status;
      if (filters?.startDate) params['startDate'] = filters.startDate;
      if (filters?.endDate) params['endDate'] = filters.endDate;
      if (filters?.teamMemberId) params['teamMemberId'] = filters.teamMemberId;

      const data = await firstValueFrom(
        this.http.get<Timecard[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/timecards`,
          { params }
        )
      );
      this._timecards.set(data);
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to load timecards');
    } finally {
      this._isLoading.set(false);
    }
  }

  async getTimecard(id: string): Promise<Timecard | null> {
    if (!this.restaurantId) return null;

    try {
      return await firstValueFrom(
        this.http.get<Timecard>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/timecards/${id}`
        )
      );
    } catch {
      return null;
    }
  }

  async clockInWithJob(teamMemberId: string, jobTitle?: string): Promise<Timecard | null> {
    if (!this.restaurantId) return null;

    this._error.set(null);

    try {
      const body: Record<string, string> = { teamMemberId };
      if (jobTitle) body['jobTitle'] = jobTitle;

      const result = await firstValueFrom(
        this.http.post<Timecard>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/timecards`,
          body
        )
      );
      this._timecards.update(tc => [...tc, result]);
      return result;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to clock in');
      return null;
    }
  }

  async clockOutWithTips(timecardId: string, declaredCashTips?: number): Promise<boolean> {
    if (!this.restaurantId) return false;

    this._error.set(null);

    try {
      const body: Record<string, unknown> = { status: 'CLOSED' };
      if (declaredCashTips !== undefined) body['declaredCashTips'] = declaredCashTips;

      const result = await firstValueFrom(
        this.http.patch<Timecard>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/timecards/${timecardId}`,
          body
        )
      );
      this._timecards.update(tc => tc.map(t => t.id === timecardId ? result : t));
      return true;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to clock out');
      return false;
    }
  }

  async startBreak(timecardId: string, breakTypeId: string): Promise<TimecardBreak | null> {
    if (!this.restaurantId) return null;

    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.post<TimecardBreak>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/timecards/${timecardId}/breaks`,
          { breakTypeId }
        )
      );
      this._timecards.update(tc => tc.map(t => {
        if (t.id === timecardId) {
          return { ...t, breaks: [...t.breaks, result] };
        }
        return t;
      }));
      return result;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to start break');
      return null;
    }
  }

  async endBreak(timecardId: string, breakId: string): Promise<boolean> {
    if (!this.restaurantId) return false;

    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.patch<TimecardBreak>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/timecards/${timecardId}/breaks/${breakId}`,
          {}
        )
      );
      this._timecards.update(tc => tc.map(t => {
        if (t.id === timecardId) {
          return { ...t, breaks: t.breaks.map(b => b.id === breakId ? result : b) };
        }
        return t;
      }));
      return true;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to end break');
      return false;
    }
  }

  // ============ Break Types ============

  async loadBreakTypes(): Promise<void> {
    if (!this.restaurantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<BreakType[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/break-types`
        )
      );
      this._breakTypes.set(data);
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to load break types');
    }
  }

  async createBreakType(data: Omit<BreakType, 'id' | 'restaurantId'>): Promise<BreakType | null> {
    if (!this.restaurantId) return null;

    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.post<BreakType>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/break-types`,
          data
        )
      );
      this._breakTypes.update(bt => [...bt, result]);
      return result;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to create break type');
      return null;
    }
  }

  async updateBreakType(id: string, data: Partial<BreakType>): Promise<boolean> {
    if (!this.restaurantId) return false;

    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.patch<BreakType>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/break-types/${id}`,
          data
        )
      );
      this._breakTypes.update(bt => bt.map(b => b.id === id ? result : b));
      return true;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to update break type');
      return false;
    }
  }

  // ============ Timecard Edits ============

  async loadTimecardEdits(filters?: { status?: string; teamMemberId?: string }): Promise<void> {
    if (!this.restaurantId) return;

    try {
      const params: Record<string, string> = {};
      if (filters?.status) params['status'] = filters.status;
      if (filters?.teamMemberId) params['teamMemberId'] = filters.teamMemberId;

      const data = await firstValueFrom(
        this.http.get<TimecardEdit[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/timecard-edits`,
          { params }
        )
      );
      this._timecardEdits.set(data);
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to load timecard edits');
    }
  }

  async requestTimecardEdit(data: { timecardId: string; editType: string; originalValue: string; newValue: string; reason: string }): Promise<TimecardEdit | null> {
    if (!this.restaurantId) return null;

    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.post<TimecardEdit>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/timecard-edits`,
          data
        )
      );
      this._timecardEdits.update(edits => [...edits, result]);
      return result;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to request timecard edit');
      return null;
    }
  }

  async resolveTimecardEdit(id: string, status: TimecardEditStatus): Promise<boolean> {
    if (!this.restaurantId) return false;

    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.patch<TimecardEdit>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/timecard-edits/${id}`,
          { status }
        )
      );
      this._timecardEdits.update(edits => edits.map(e => e.id === id ? result : e));
      return true;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to resolve timecard edit');
      return false;
    }
  }

  // ============ Workweek Config ============

  async loadWorkweekConfig(): Promise<void> {
    if (!this.restaurantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<WorkweekConfig>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/staff/workweek-config`
        )
      );
      this._workweekConfig.set(data);
    } catch {
      // Default if not configured
      this._workweekConfig.set(null);
    }
  }

  async updateWorkweekConfig(data: Partial<WorkweekConfig>): Promise<boolean> {
    if (!this.restaurantId) return false;

    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.put<WorkweekConfig>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/staff/workweek-config`,
          data
        )
      );
      this._workweekConfig.set(result);
      return true;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to update workweek config');
      return false;
    }
  }

  // ============ POS Login ============

  async posLogin(passcode: string): Promise<PosSession | null> {
    if (!this.restaurantId) return null;

    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.post<PosSession>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/pos/login`,
          { passcode }
        )
      );
      this._posSession.set(result);
      return result;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Invalid passcode');
      return null;
    }
  }

  async posLogout(): Promise<void> {
    if (!this.restaurantId) return;

    try {
      await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/restaurant/${this.restaurantId}/pos/logout`,
          {}
        )
      );
    } catch {
      // Silent logout failure — clear session anyway
    }

    this._posSession.set(null);
  }

  clearPosSession(): void {
    this._posSession.set(null);
  }

  // ============ Schedule Templates ============

  async loadTemplates(): Promise<void> {
    if (!this.restaurantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<ScheduleTemplate[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/staff/schedule-templates`
        )
      );
      this._scheduleTemplates.set(data);
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to load templates');
    }
  }

  async saveAsTemplate(name: string, weekStartDate: string): Promise<ScheduleTemplate | null> {
    if (!this.restaurantId) return null;

    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.post<ScheduleTemplate>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/staff/schedule-templates`,
          { name, weekStartDate }
        )
      );
      this._scheduleTemplates.update(t => [...t, result]);
      return result;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to save template');
      return null;
    }
  }

  async applyTemplate(templateId: string, weekStartDate: string): Promise<Shift[]> {
    if (!this.restaurantId) return [];

    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.post<Shift[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/staff/schedule-templates/${templateId}/apply`,
          { weekStartDate }
        )
      );
      this._shifts.update(existing => [...existing, ...result]);
      return result;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to apply template');
      return [];
    }
  }

  async deleteTemplate(id: string): Promise<boolean> {
    if (!this.restaurantId) return false;

    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.delete(
          `${this.apiUrl}/restaurant/${this.restaurantId}/staff/schedule-templates/${id}`
        )
      );
      this._scheduleTemplates.update(t => t.filter(tpl => tpl.id !== id));
      return true;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to delete template');
      return false;
    }
  }

  async copyPreviousWeek(targetWeekStart: string): Promise<Shift[]> {
    if (!this.restaurantId) return [];

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.post<Shift[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/labor/copy-week`,
          { targetWeekStart }
        )
      );
      this._shifts.update(existing => [...existing, ...result]);
      return result;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to copy previous week');
      return [];
    } finally {
      this._isLoading.set(false);
    }
  }

  // ============ Live Labor ============

  async getLiveLabor(): Promise<void> {
    if (!this.restaurantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<LiveLaborData>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/staff/labor-live`
        )
      );
      this._liveLabor.set(data);
    } catch {
      // Silent — gauge simply won't show if API unavailable
      this._liveLabor.set(null);
    }
  }

  // ============ Staff Notifications ============

  async sendScheduleNotification(weekStart: string): Promise<boolean> {
    if (!this.restaurantId) return false;

    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/restaurant/${this.restaurantId}/labor/notifications/schedule-published`,
          { weekStart }
        )
      );
      return true;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to send notification');
      return false;
    }
  }

  async sendAnnouncement(message: string, recipientPinIds: string[]): Promise<boolean> {
    if (!this.restaurantId) return false;

    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/restaurant/${this.restaurantId}/labor/notifications/announcement`,
          { message, recipientPinIds }
        )
      );
      return true;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to send announcement');
      return false;
    }
  }

  async loadNotifications(pinId: string): Promise<void> {
    if (!this.restaurantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<StaffNotification[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/labor/notifications`,
          { params: { pinId } }
        )
      );
      this._notifications.set(data);
    } catch {
      this._notifications.set([]);
    }
  }

  async markNotificationRead(id: string): Promise<boolean> {
    if (!this.restaurantId) return false;

    try {
      await firstValueFrom(
        this.http.patch(
          `${this.apiUrl}/restaurant/${this.restaurantId}/labor/notifications/${id}/read`,
          {}
        )
      );
      this._notifications.update(n => n.map(notif => notif.id === id ? { ...notif, isRead: true } : notif));
      return true;
    } catch {
      return false;
    }
  }

  // ============ Payroll ============

  async loadPayrollPeriods(): Promise<void> {
    if (!this.restaurantId) return;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const data = await firstValueFrom(
        this.http.get<PayrollPeriod[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/labor/payroll`
        )
      );
      this._payrollPeriods.set(data);
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to load payroll periods');
    } finally {
      this._isLoading.set(false);
    }
  }

  async generatePayrollPeriod(periodStart: string, periodEnd: string): Promise<PayrollPeriod | null> {
    if (!this.restaurantId) return null;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.post<PayrollPeriod>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/labor/payroll/generate`,
          { periodStart, periodEnd }
        )
      );
      this._payrollPeriods.update(p => [result, ...p]);
      return result;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to generate payroll period');
      return null;
    } finally {
      this._isLoading.set(false);
    }
  }

  async getPayrollPeriod(id: string): Promise<PayrollPeriod | null> {
    if (!this.restaurantId) return null;

    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.get<PayrollPeriod>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/labor/payroll/${id}`
        )
      );
      this._selectedPayroll.set(result);
      return result;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to load payroll period');
      return null;
    }
  }

  async approvePayroll(id: string): Promise<boolean> {
    if (!this.restaurantId) return false;

    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.patch<PayrollPeriod>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/labor/payroll/${id}/approve`,
          {}
        )
      );
      this._payrollPeriods.update(p => p.map(pp => pp.id === id ? result : pp));
      this._selectedPayroll.set(result);
      return true;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to approve payroll');
      return false;
    }
  }

  async exportPayroll(id: string, format: 'csv' | 'pdf'): Promise<Blob | null> {
    if (!this.restaurantId) return null;

    this._error.set(null);

    try {
      const data = await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/restaurant/${this.restaurantId}/labor/payroll/${id}/export`,
          { format },
          { responseType: 'blob' }
        )
      );
      return data;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to export payroll');
      return null;
    }
  }

  clearSelectedPayroll(): void {
    this._selectedPayroll.set(null);
  }

  // ============ Commission Rules ============

  async loadCommissionRules(): Promise<void> {
    if (!this.restaurantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<CommissionRule[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/labor/commissions/rules`
        )
      );
      this._commissionRules.set(data);
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to load commission rules');
    }
  }

  async createCommissionRule(data: Omit<CommissionRule, 'id' | 'restaurantId'>): Promise<CommissionRule | null> {
    if (!this.restaurantId) return null;

    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.post<CommissionRule>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/labor/commissions/rules`,
          data
        )
      );
      this._commissionRules.update(r => [...r, result]);
      return result;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to create commission rule');
      return null;
    }
  }

  async updateCommissionRule(id: string, data: Partial<CommissionRule>): Promise<boolean> {
    if (!this.restaurantId) return false;

    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.patch<CommissionRule>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/labor/commissions/rules/${id}`,
          data
        )
      );
      this._commissionRules.update(r => r.map(rule => rule.id === id ? result : rule));
      return true;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to update commission rule');
      return false;
    }
  }

  async deleteCommissionRule(id: string): Promise<boolean> {
    if (!this.restaurantId) return false;

    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.delete(
          `${this.apiUrl}/restaurant/${this.restaurantId}/labor/commissions/rules/${id}`
        )
      );
      this._commissionRules.update(r => r.filter(rule => rule.id !== id));
      return true;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to delete commission rule');
      return false;
    }
  }

  async calculateCommissions(periodStart: string, periodEnd: string): Promise<void> {
    if (!this.restaurantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<CommissionCalculation[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/labor/commissions/calculate`,
          { params: { start: periodStart, end: periodEnd } }
        )
      );
      this._commissionCalculations.set(data);
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to calculate commissions');
    }
  }

  // ============ PTO Policies ============

  async loadPtoPolicies(): Promise<void> {
    if (!this.restaurantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<PtoPolicy[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/labor/pto/policies`
        )
      );
      this._ptoPolicies.set(data);
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to load PTO policies');
    }
  }

  async createPtoPolicy(data: Omit<PtoPolicy, 'id' | 'restaurantId'>): Promise<PtoPolicy | null> {
    if (!this.restaurantId) return null;

    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.post<PtoPolicy>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/labor/pto/policies`,
          data
        )
      );
      this._ptoPolicies.update(p => [...p, result]);
      return result;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to create PTO policy');
      return null;
    }
  }

  async updatePtoPolicy(id: string, data: Partial<PtoPolicy>): Promise<boolean> {
    if (!this.restaurantId) return false;

    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.patch<PtoPolicy>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/labor/pto/policies/${id}`,
          data
        )
      );
      this._ptoPolicies.update(p => p.map(policy => policy.id === id ? result : policy));
      return true;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to update PTO policy');
      return false;
    }
  }

  // ============ PTO Requests ============

  async loadPtoRequests(status?: PtoRequestStatus): Promise<void> {
    if (!this.restaurantId) return;

    try {
      const params: Record<string, string> = {};
      if (status) params['status'] = status;

      const data = await firstValueFrom(
        this.http.get<PtoRequest[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/labor/pto/requests`,
          { params }
        )
      );
      this._ptoRequests.set(data);
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to load PTO requests');
    }
  }

  async submitPtoRequest(data: { teamMemberId: string; type: string; startDate: string; endDate: string; hoursRequested: number; reason?: string }): Promise<PtoRequest | null> {
    if (!this.restaurantId) return null;

    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.post<PtoRequest>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/labor/pto/requests`,
          data
        )
      );
      this._ptoRequests.update(r => [result, ...r]);
      return result;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to submit PTO request');
      return null;
    }
  }

  async approvePtoRequest(id: string): Promise<boolean> {
    if (!this.restaurantId) return false;

    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.patch<PtoRequest>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/labor/pto/requests/${id}`,
          { status: 'approved' }
        )
      );
      this._ptoRequests.update(r => r.map(req => req.id === id ? result : req));
      return true;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to approve PTO request');
      return false;
    }
  }

  async denyPtoRequest(id: string): Promise<boolean> {
    if (!this.restaurantId) return false;

    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.patch<PtoRequest>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/labor/pto/requests/${id}`,
          { status: 'denied' }
        )
      );
      this._ptoRequests.update(r => r.map(req => req.id === id ? result : req));
      return true;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to deny PTO request');
      return false;
    }
  }

  async getPtoBalances(teamMemberId: string): Promise<void> {
    if (!this.restaurantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<PtoBalance[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/labor/pto/balances/${teamMemberId}`
        )
      );
      this._ptoBalances.set(data);
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to load PTO balances');
    }
  }

  // --- Labor Forecasting ---

  async getLaborForecast(weekStart: string): Promise<void> {
    if (!this.restaurantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<LaborForecast>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/labor/forecast`,
          { params: { weekStart } }
        )
      );
      this._laborForecast.set(data);
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to load labor forecast');
    }
  }

  // --- Compliance ---

  async loadComplianceAlerts(): Promise<void> {
    if (!this.restaurantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<ComplianceAlert[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/labor/compliance/alerts`
        )
      );
      this._complianceAlerts.set(data);
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to load compliance alerts');
    }
  }

  async loadComplianceSummary(): Promise<void> {
    if (!this.restaurantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<ComplianceSummary>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/labor/compliance/summary`
        )
      );
      this._complianceSummary.set(data);
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to load compliance summary');
    }
  }

  async resolveComplianceAlert(id: string): Promise<boolean> {
    if (!this.restaurantId) return false;

    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.patch<ComplianceAlert>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/labor/compliance/alerts/${id}`,
          { isResolved: true }
        )
      );
      this._complianceAlerts.update(alerts =>
        alerts.map(a => a.id === id ? result : a)
      );
      return true;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to resolve alert');
      return false;
    }
  }
}
