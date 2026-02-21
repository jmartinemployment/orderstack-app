import { Component, inject, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { CurrencyPipe, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LaborService } from '@services/labor';
import { AuthService } from '@services/auth';
import { LoadingSpinner } from '@shared/loading-spinner/loading-spinner';
import { ErrorDisplay } from '@shared/error-display/error-display';
import {
  StaffScheduleTab,
  ReportRange,
  Shift,
  ShiftFormData,
  ShiftPosition,
  StaffMember,
  TimecardEdit,
  TimecardEditStatus,
  TimecardEditType,
} from '@models/index';

@Component({
  selector: 'os-staff-scheduling',
  imports: [CurrencyPipe, DecimalPipe, DatePipe, FormsModule, LoadingSpinner, ErrorDisplay],
  templateUrl: './staff-scheduling.html',
  styleUrl: './staff-scheduling.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffScheduling {
  private readonly laborService = inject(LaborService);
  private readonly authService = inject(AuthService);

  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly staffMembers = this.laborService.staffMembers;
  readonly shifts = this.laborService.shifts;
  readonly activeClocks = this.laborService.activeClocks;
  readonly laborReport = this.laborService.laborReport;
  readonly recommendations = this.laborService.recommendations;
  readonly laborTargets = this.laborService.laborTargets;
  readonly isLoading = this.laborService.isLoading;
  readonly error = this.laborService.error;

  // UI state
  private readonly _activeTab = signal<StaffScheduleTab>('schedule');
  private readonly _weekOffset = signal(0);
  private readonly _showShiftModal = signal(false);
  private readonly _editingShift = signal<Shift | null>(null);
  private readonly _shiftForm = signal<ShiftFormData>({
    staffPinId: '',
    date: '',
    startTime: '09:00',
    endTime: '17:00',
    position: 'server',
    breakMinutes: 0,
    notes: '',
  });
  private readonly _clockInPin = signal('');
  private readonly _clockOutBreak = signal(0);
  private readonly _reportRange = signal<ReportRange>('week');
  private readonly _isSaving = signal(false);
  private readonly _sortField = signal<'name' | 'hours' | 'cost'>('name');
  private readonly _sortAsc = signal(true);

  // Pending edits state
  private readonly _editsFilter = signal<TimecardEditStatus | 'all'>('pending');
  private readonly _isResolvingEdit = signal(false);

  readonly activeTab = this._activeTab.asReadonly();
  readonly weekOffset = this._weekOffset.asReadonly();
  readonly showShiftModal = this._showShiftModal.asReadonly();
  readonly editingShift = this._editingShift.asReadonly();
  readonly shiftForm = this._shiftForm.asReadonly();
  readonly clockInPin = this._clockInPin.asReadonly();
  readonly clockOutBreak = this._clockOutBreak.asReadonly();
  readonly reportRange = this._reportRange.asReadonly();
  readonly isSaving = this._isSaving.asReadonly();
  readonly editsFilter = this._editsFilter.asReadonly();
  readonly isResolvingEdit = this._isResolvingEdit.asReadonly();
  readonly timecardEdits = this.laborService.timecardEdits;

  readonly pendingEditsCount = computed(() =>
    this.laborService.timecardEdits().filter(e => e.status === 'pending').length
  );

  readonly filteredEdits = computed(() => {
    const edits = this.laborService.timecardEdits();
    const filter = this._editsFilter();
    if (filter === 'all') return edits;
    return edits.filter(e => e.status === filter);
  });

  // Computed: week boundaries
  readonly weekStart = computed(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + this._weekOffset() * 7);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  readonly weekEnd = computed(() => {
    const d = new Date(this.weekStart());
    d.setDate(d.getDate() + 6);
    return d;
  });

  readonly weekStartStr = computed(() => this.formatDate(this.weekStart()));
  readonly weekEndStr = computed(() => this.formatDate(this.weekEnd()));

  readonly weekDays = computed(() => {
    const days: string[] = [];
    const start = new Date(this.weekStart());
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(this.formatDate(d));
    }
    return days;
  });

  // Computed: shifts grouped by day
  readonly shiftsByDay = computed(() => {
    const map = new Map<string, Shift[]>();
    for (const day of this.weekDays()) {
      map.set(day, []);
    }
    for (const shift of this.shifts()) {
      const existing = map.get(shift.date);
      if (existing) {
        existing.push(shift);
      }
    }
    return map;
  });

  // Computed: unique staff on schedule
  readonly staffOnSchedule = computed(() => {
    const ids = new Set(this.shifts().map(s => s.staffPinId));
    return ids.size;
  });

  // Computed: total scheduled hours
  readonly totalScheduledHours = computed(() => {
    return this.shifts().reduce((sum, s) => sum + this.getShiftDuration(s), 0);
  });

  // Computed: all shifts published
  readonly isPublished = computed(() => {
    const s = this.shifts();
    return s.length > 0 && s.every(sh => sh.isPublished);
  });

  // Computed: staff rows for grid
  readonly staffRows = computed(() => {
    const staffMap = new Map<string, StaffMember>();
    for (const shift of this.shifts()) {
      if (!staffMap.has(shift.staffPinId)) {
        staffMap.set(shift.staffPinId, {
          id: shift.staffPinId,
          name: shift.staffName,
          role: shift.staffRole,
        });
      }
    }
    // Also add staff members not on schedule
    for (const member of this.staffMembers()) {
      if (!staffMap.has(member.id)) {
        staffMap.set(member.id, member);
      }
    }
    return [...staffMap.values()].sort((a, b) => a.name.localeCompare(b.name));
  });

  // Computed: sorted staff summaries for report
  readonly sortedStaffSummaries = computed(() => {
    const report = this.laborReport();
    if (!report) return [];
    const summaries = [...report.staffSummaries];
    const field = this._sortField();
    const asc = this._sortAsc();
    summaries.sort((a, b) => {
      let cmp = 0;
      if (field === 'name') cmp = a.staffName.localeCompare(b.staffName);
      else if (field === 'hours') cmp = a.totalHours - b.totalHours;
      else if (field === 'cost') cmp = a.laborCost - b.laborCost;
      return asc ? cmp : -cmp;
    });
    return summaries;
  });

  // Workweek config
  readonly workweekConfig = this.laborService.workweekConfig;

  readonly overtimeThresholdLabel = computed(() => {
    const config = this.workweekConfig();
    return config ? `${config.overtimeThresholdHours}h/week` : '40h/week';
  });

  readonly weekStartDayLabel = computed(() => {
    const config = this.workweekConfig();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return config ? days[config.startDay] : 'Sunday';
  });

  // Labor vs sales computeds
  readonly totalOvertimeHours = computed(() => {
    const report = this.laborReport();
    if (!report) return 0;
    return report.staffSummaries.reduce((sum, s) => sum + s.overtimeHours, 0);
  });

  readonly totalOvertimeCost = computed(() => {
    const report = this.laborReport();
    if (!report) return 0;
    return report.overtimeFlags.reduce((sum, f) => sum + (f.overtimeHours * 22.5), 0);
  });

  readonly avgDailyLaborPercent = computed(() => {
    const report = this.laborReport();
    if (!report || report.dailyBreakdown.length === 0) return 0;
    const sum = report.dailyBreakdown.reduce((total, d) => total + d.laborPercent, 0);
    return sum / report.dailyBreakdown.length;
  });

  constructor() {
    effect(() => {
      if (this.authService.isAuthenticated() && this.authService.selectedRestaurantId()) {
        this.laborService.loadStaffMembers();
        this.loadCurrentWeek();
        this.laborService.loadActiveClocks();
        this.laborService.loadWorkweekConfig();
      }
    });
  }

  // Tab navigation
  setTab(tab: StaffScheduleTab): void {
    this._activeTab.set(tab);
    if (tab === 'labor-report') {
      this.loadReport();
    } else if (tab === 'ai-insights') {
      this.laborService.loadRecommendations();
    } else if (tab === 'edits') {
      this.laborService.loadTimecardEdits();
    }
  }

  refreshRecommendations(): void {
    this.laborService.loadRecommendations();
  }

  // Week navigation
  prevWeek(): void {
    this._weekOffset.update(o => o - 1);
    this.loadCurrentWeek();
  }

  nextWeek(): void {
    this._weekOffset.update(o => o + 1);
    this.loadCurrentWeek();
  }

  thisWeek(): void {
    this._weekOffset.set(0);
    this.loadCurrentWeek();
  }

  private loadCurrentWeek(): void {
    this.laborService.loadShifts(this.weekStartStr(), this.weekEndStr());
  }

  // Shift modal
  openNewShift(staffPinId: string, date: string): void {
    this._editingShift.set(null);
    this._shiftForm.set({
      staffPinId,
      date,
      startTime: '09:00',
      endTime: '17:00',
      position: 'server',
      breakMinutes: 0,
      notes: '',
    });
    this._showShiftModal.set(true);
  }

  openEditShift(shift: Shift): void {
    this._editingShift.set(shift);
    this._shiftForm.set({
      staffPinId: shift.staffPinId,
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      position: shift.position,
      breakMinutes: shift.breakMinutes,
      notes: shift.notes ?? '',
    });
    this._showShiftModal.set(true);
  }

  closeShiftModal(): void {
    this._showShiftModal.set(false);
    this._editingShift.set(null);
  }

  updateShiftForm(field: keyof ShiftFormData, value: string | number): void {
    this._shiftForm.update(f => ({ ...f, [field]: value }));
  }

  async saveShift(): Promise<void> {
    this._isSaving.set(true);
    const editing = this._editingShift();
    const form = this._shiftForm();

    if (editing) {
      await this.laborService.updateShift(editing.id, form);
    } else {
      await this.laborService.createShift(form);
    }

    this._isSaving.set(false);
    this.closeShiftModal();
  }

  async deleteShift(): Promise<void> {
    const editing = this._editingShift();
    if (!editing) return;

    this._isSaving.set(true);
    await this.laborService.deleteShift(editing.id);
    this._isSaving.set(false);
    this.closeShiftModal();
  }

  async publishWeek(): Promise<void> {
    this._isSaving.set(true);
    await this.laborService.publishWeek(this.weekStartStr());
    this._isSaving.set(false);
  }

  // Time clock
  setClockInPin(pinId: string): void {
    this._clockInPin.set(pinId);
  }

  setClockOutBreak(minutes: number): void {
    this._clockOutBreak.set(minutes);
  }

  async clockIn(): Promise<void> {
    const pinId = this._clockInPin();
    if (!pinId) return;
    await this.laborService.clockIn(pinId);
    this._clockInPin.set('');
  }

  async clockOut(timeEntryId: string): Promise<void> {
    await this.laborService.clockOut(timeEntryId, this._clockOutBreak());
    this._clockOutBreak.set(0);
  }

  // Labor report
  setReportRange(range: ReportRange): void {
    this._reportRange.set(range);
    this.loadReport();
  }

  private loadReport(): void {
    const now = new Date();
    const start = new Date(now);
    const range = this._reportRange();

    if (range === 'week') {
      start.setDate(now.getDate() - 7);
    } else if (range === 'biweek') {
      start.setDate(now.getDate() - 14);
    } else {
      start.setDate(now.getDate() - 30);
    }

    this.laborService.loadLaborReport(this.formatDate(start), this.formatDate(now));
  }

  sortReport(field: 'name' | 'hours' | 'cost'): void {
    if (this._sortField() === field) {
      this._sortAsc.update(a => !a);
    } else {
      this._sortField.set(field);
      this._sortAsc.set(true);
    }
  }

  exportCSV(): void {
    const report = this.laborReport();
    if (!report) return;

    const rows = [
      ['Name', 'Role', 'Regular Hours', 'OT Hours', 'Total Hours', 'Labor Cost'],
      ...report.staffSummaries.map(s => [
        s.staffName,
        s.staffRole,
        s.regularHours.toFixed(2),
        s.overtimeHours.toFixed(2),
        s.totalHours.toFixed(2),
        s.laborCost.toFixed(2),
      ]),
    ];

    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `labor-report-${report.startDate}-to-${report.endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Edits
  setEditsFilter(filter: TimecardEditStatus | 'all'): void {
    this._editsFilter.set(filter);
  }

  async approveEdit(editId: string): Promise<void> {
    this._isResolvingEdit.set(true);
    await this.laborService.resolveTimecardEdit(editId, 'approved');
    this._isResolvingEdit.set(false);
  }

  async denyEdit(editId: string): Promise<void> {
    this._isResolvingEdit.set(true);
    await this.laborService.resolveTimecardEdit(editId, 'denied');
    this._isResolvingEdit.set(false);
  }

  getEditTypeLabel(type: TimecardEditType): string {
    const labels: Record<TimecardEditType, string> = {
      clock_in: 'Clock In',
      clock_out: 'Clock Out',
      break_start: 'Break Start',
      break_end: 'Break End',
      job_change: 'Job Title',
    };
    return labels[type] ?? type;
  }

  getEditStatusClass(status: TimecardEditStatus): string {
    if (status === 'approved') return 'badge bg-success';
    if (status === 'denied') return 'badge bg-danger';
    if (status === 'expired') return 'badge bg-secondary';
    return 'badge bg-warning text-dark';
  }

  // Helpers
  getShiftDuration(shift: Shift): number {
    const [startH, startM] = shift.startTime.split(':').map(Number);
    const [endH, endM] = shift.endTime.split(':').map(Number);
    let startMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;
    if (endMinutes <= startMinutes) {
      endMinutes += 1440;
    }
    return (endMinutes - startMinutes) / 60 - (shift.breakMinutes / 60);
  }

  getPositionColor(position: ShiftPosition): string {
    const colors: Record<ShiftPosition, string> = {
      server: '#4a90d9',
      cook: '#d94a4a',
      bartender: '#9b59b6',
      host: '#27ae60',
      manager: '#f39c12',
      expo: '#e67e22',
    };
    return colors[position] ?? '#6c757d';
  }

  getPositionLabel(position: ShiftPosition): string {
    const labels: Record<ShiftPosition, string> = {
      server: 'Server',
      cook: 'Cook',
      bartender: 'Bartender',
      host: 'Host',
      manager: 'Manager',
      expo: 'Expo',
    };
    return labels[position] ?? position;
  }

  formatTime(hhmm: string): string {
    const [h, m] = hhmm.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
  }

  formatDate(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  formatDayLabel(dateStr: string): string {
    const d = new Date(dateStr + 'T12:00:00');
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `${days[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`;
  }

  getElapsedTime(clockIn: string): string {
    const diff = Date.now() - new Date(clockIn).getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  }

  getLaborPercentClass(percent: number): string {
    if (percent < 30) return 'labor-good';
    if (percent <= 35) return 'labor-warning';
    return 'labor-critical';
  }

  getPriorityColor(priority: 'high' | 'medium' | 'low'): string {
    if (priority === 'high') return '#dc3545';
    if (priority === 'medium') return '#ffc107';
    return '#28a745';
  }

  getRecommendationIcon(type: string): string {
    if (type === 'overstaffed') return 'bi-person-dash';
    if (type === 'understaffed') return 'bi-person-plus';
    if (type === 'cost_optimization') return 'bi-piggy-bank';
    return 'bi-lightbulb';
  }

  getShiftsForCell(staffId: string, day: string): Shift[] {
    return this.shiftsByDay().get(day)?.filter(s => s.staffPinId === staffId) ?? [];
  }

  trackByShiftId(_index: number, shift: Shift): string {
    return shift.id;
  }
}
