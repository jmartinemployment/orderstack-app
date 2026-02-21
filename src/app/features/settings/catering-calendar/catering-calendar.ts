import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RestaurantSettingsService } from '@services/restaurant-settings';
import { AuthService } from '@services/auth';
import {
  CateringEvent,
  CalendarDay,
  CapacityBlock,
  CateringCapacitySettings,
} from '@models/index';
import { Order } from '@models/index';

@Component({
  selector: 'os-catering-calendar',
  imports: [FormsModule],
  templateUrl: './catering-calendar.html',
  styleUrl: './catering-calendar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CateringCalendar implements OnInit {
  private readonly settingsService = inject(RestaurantSettingsService);
  private readonly authService = inject(AuthService);

  readonly isLoading = this.settingsService.isLoading;
  readonly isSaving = this.settingsService.isSaving;

  // Capacity settings form signals
  private readonly _maxEventsPerDay = signal(3);
  private readonly _maxHeadcountPerDay = signal(200);
  private readonly _conflictAlertsEnabled = signal(true);
  private readonly _hasCapacityChanges = signal(false);
  private readonly _showCapacitySaveSuccess = signal(false);

  readonly maxEventsPerDay = this._maxEventsPerDay.asReadonly();
  readonly maxHeadcountPerDay = this._maxHeadcountPerDay.asReadonly();
  readonly conflictAlertsEnabled = this._conflictAlertsEnabled.asReadonly();
  readonly hasCapacityChanges = this._hasCapacityChanges.asReadonly();
  readonly showCapacitySaveSuccess = this._showCapacitySaveSuccess.asReadonly();

  // Calendar navigation
  private readonly _currentYear = signal(new Date().getFullYear());
  private readonly _currentMonth = signal(new Date().getMonth());
  private readonly _selectedDate = signal<string | null>(null);

  readonly currentYear = this._currentYear.asReadonly();
  readonly currentMonth = this._currentMonth.asReadonly();
  readonly selectedDate = this._selectedDate.asReadonly();

  // Add block form
  private readonly _showBlockForm = signal(false);
  private readonly _blockStartTime = signal('');
  private readonly _blockEndTime = signal('');
  private readonly _blockReason = signal('');

  readonly showBlockForm = this._showBlockForm.asReadonly();
  readonly blockStartTime = this._blockStartTime.asReadonly();
  readonly blockEndTime = this._blockEndTime.asReadonly();
  readonly blockReason = this._blockReason.asReadonly();

  readonly isManagerOrAbove = computed(() => {
    const role = this.authService.user()?.role;
    return role === 'owner' || role === 'manager' || role === 'super_admin';
  });

  readonly monthLabel = computed(() => {
    const date = new Date(this._currentYear(), this._currentMonth(), 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  });

  readonly weekdayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Map orders to CateringEvents
  readonly cateringEvents = computed(() => {
    return this.settingsService.cateringOrders().map(order => this.mapOrderToEvent(order));
  });

  readonly capacityBlocks = this.settingsService.capacityBlocks;

  // Build the calendar grid
  readonly calendarWeeks = computed(() => {
    const year = this._currentYear();
    const month = this._currentMonth();
    const maxEvents = this._maxEventsPerDay();
    const maxHeadcount = this._maxHeadcountPerDay();
    const events = this.cateringEvents();
    const blocks = this.capacityBlocks();

    const today = new Date();
    const todayStr = this.formatDate(today);

    const firstOfMonth = new Date(year, month, 1);
    const lastOfMonth = new Date(year, month + 1, 0);
    const startDay = firstOfMonth.getDay();
    const daysInMonth = lastOfMonth.getDate();

    // Previous month padding
    const prevMonth = new Date(year, month, 0);
    const prevDays = prevMonth.getDate();

    const days: CalendarDay[] = [];

    // Previous month padding
    for (let i = startDay - 1; i >= 0; i--) {
      const day = prevDays - i;
      const date = this.formatDate(new Date(year, month - 1, day));
      const dayEvents = events.filter(e => e.eventDate === date);
      const totalHc = dayEvents.reduce((sum, e) => sum + e.headcount, 0);
      days.push({
        date,
        dayOfMonth: day,
        events: dayEvents,
        totalHeadcount: totalHc,
        isOverCapacityEvents: dayEvents.length > maxEvents,
        isOverCapacityHeadcount: totalHc > maxHeadcount,
        isToday: date === todayStr,
        isPast: date < todayStr,
        isCurrentMonth: false,
      });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const date = this.formatDate(new Date(year, month, d));
      const dayEvents = events.filter(e => e.eventDate === date);
      const totalHc = dayEvents.reduce((sum, e) => sum + e.headcount, 0);
      days.push({
        date,
        dayOfMonth: d,
        events: dayEvents,
        totalHeadcount: totalHc,
        isOverCapacityEvents: dayEvents.length > maxEvents,
        isOverCapacityHeadcount: totalHc > maxHeadcount,
        isToday: date === todayStr,
        isPast: date < todayStr,
        isCurrentMonth: true,
      });
    }

    // Next month padding (fill to 42 cells = 6 rows)
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const date = this.formatDate(new Date(year, month + 1, d));
      const dayEvents = events.filter(e => e.eventDate === date);
      const totalHc = dayEvents.reduce((sum, e) => sum + e.headcount, 0);
      days.push({
        date,
        dayOfMonth: d,
        events: dayEvents,
        totalHeadcount: totalHc,
        isOverCapacityEvents: dayEvents.length > maxEvents,
        isOverCapacityHeadcount: totalHc > maxHeadcount,
        isToday: date === todayStr,
        isPast: date < todayStr,
        isCurrentMonth: false,
      });
    }

    // Chunk into weeks
    const weeks: CalendarDay[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    return weeks;
  });

  // Selected day details
  readonly selectedDayEvents = computed(() => {
    const date = this._selectedDate();
    if (!date) return [];
    return this.cateringEvents().filter(e => e.eventDate === date);
  });

  readonly selectedDayBlocks = computed(() => {
    const date = this._selectedDate();
    if (!date) return [];
    return this.capacityBlocks().filter(b => b.date === date);
  });

  // KPI computations
  readonly upcomingEventsCount = computed(() => {
    const today = this.formatDate(new Date());
    return this.cateringEvents().filter(e => e.eventDate >= today).length;
  });

  readonly totalUpcomingHeadcount = computed(() => {
    const today = this.formatDate(new Date());
    return this.cateringEvents()
      .filter(e => e.eventDate >= today)
      .reduce((sum, e) => sum + e.headcount, 0);
  });

  readonly conflictDaysCount = computed(() => {
    const maxEvents = this._maxEventsPerDay();
    const maxHeadcount = this._maxHeadcountPerDay();
    const events = this.cateringEvents();
    const today = this.formatDate(new Date());

    const dayMap = new Map<string, { count: number; headcount: number }>();
    for (const e of events) {
      if (e.eventDate < today) continue;
      const existing = dayMap.get(e.eventDate) ?? { count: 0, headcount: 0 };
      existing.count++;
      existing.headcount += e.headcount;
      dayMap.set(e.eventDate, existing);
    }

    let conflicts = 0;
    for (const val of dayMap.values()) {
      if (val.count > maxEvents || val.headcount > maxHeadcount) {
        conflicts++;
      }
    }
    return conflicts;
  });

  readonly pendingApprovalsCount = computed(() => {
    return this.cateringEvents().filter(e => e.approvalStatus === 'NEEDS_APPROVAL').length;
  });

  ngOnInit(): void {
    this.loadCapacityFromService();
    this.settingsService.loadCateringOrders();
  }

  private loadCapacityFromService(): void {
    const s = this.settingsService.cateringCapacitySettings();
    this._maxEventsPerDay.set(s.maxEventsPerDay);
    this._maxHeadcountPerDay.set(s.maxHeadcountPerDay);
    this._conflictAlertsEnabled.set(s.conflictAlertsEnabled);
    this._hasCapacityChanges.set(false);
  }

  onMaxEvents(event: Event): void {
    this._maxEventsPerDay.set(Number.parseInt((event.target as HTMLInputElement).value, 10) || 3);
    this._hasCapacityChanges.set(true);
  }

  onMaxHeadcount(event: Event): void {
    this._maxHeadcountPerDay.set(Number.parseInt((event.target as HTMLInputElement).value, 10) || 200);
    this._hasCapacityChanges.set(true);
  }

  onConflictAlerts(event: Event): void {
    this._conflictAlertsEnabled.set((event.target as HTMLInputElement).checked);
    this._hasCapacityChanges.set(true);
  }

  async saveCapacity(): Promise<void> {
    await this.settingsService.saveCateringCapacitySettings({
      maxEventsPerDay: this._maxEventsPerDay(),
      maxHeadcountPerDay: this._maxHeadcountPerDay(),
      conflictAlertsEnabled: this._conflictAlertsEnabled(),
    });
    this._hasCapacityChanges.set(false);
    this._showCapacitySaveSuccess.set(true);
    setTimeout(() => this._showCapacitySaveSuccess.set(false), 3000);
  }

  discardCapacity(): void {
    this.loadCapacityFromService();
  }

  prevMonth(): void {
    const m = this._currentMonth();
    if (m === 0) {
      this._currentMonth.set(11);
      this._currentYear.update(y => y - 1);
    } else {
      this._currentMonth.set(m - 1);
    }
    this._selectedDate.set(null);
  }

  nextMonth(): void {
    const m = this._currentMonth();
    if (m === 11) {
      this._currentMonth.set(0);
      this._currentYear.update(y => y + 1);
    } else {
      this._currentMonth.set(m + 1);
    }
    this._selectedDate.set(null);
  }

  selectDate(date: string): void {
    this._selectedDate.set(date === this._selectedDate() ? null : date);
    this._showBlockForm.set(false);
  }

  hasBlock(date: string): boolean {
    return this.capacityBlocks().some(b => b.date === date);
  }

  getApprovalClass(status: string): string {
    switch (status) {
      case 'APPROVED': return 'approval-approved';
      case 'NOT_APPROVED': return 'approval-rejected';
      default: return 'approval-pending';
    }
  }

  getApprovalLabel(status: string): string {
    switch (status) {
      case 'APPROVED': return 'Approved';
      case 'NOT_APPROVED': return 'Not Approved';
      default: return 'Needs Approval';
    }
  }

  getBlockTimeLabel(block: CapacityBlock): string {
    if (block.startTime && block.endTime) {
      return `${block.startTime} – ${block.endTime}`;
    }
    return 'All day';
  }

  toggleBlockForm(): void {
    this._showBlockForm.update(v => !v);
    if (this._showBlockForm()) {
      this._blockStartTime.set('');
      this._blockEndTime.set('');
      this._blockReason.set('');
    }
  }

  onBlockStartTime(event: Event): void {
    this._blockStartTime.set((event.target as HTMLInputElement).value);
  }

  onBlockEndTime(event: Event): void {
    this._blockEndTime.set((event.target as HTMLInputElement).value);
  }

  onBlockReason(event: Event): void {
    this._blockReason.set((event.target as HTMLInputElement).value);
  }

  addBlock(): void {
    const date = this._selectedDate();
    if (!date || !this._blockReason().trim()) return;

    this.settingsService.addCapacityBlock({
      date,
      startTime: this._blockStartTime() || undefined,
      endTime: this._blockEndTime() || undefined,
      reason: this._blockReason().trim(),
    });
    this._showBlockForm.set(false);
  }

  removeBlock(blockId: string): void {
    this.settingsService.removeCapacityBlock(blockId);
  }

  private mapOrderToEvent(order: Order): CateringEvent {
    const catering = order.cateringInfo;
    return {
      orderId: order.guid,
      orderNumber: order.orderNumber,
      customerName: [order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(' ') || 'Unknown',
      eventDate: catering?.eventDate ? this.formatDate(new Date(catering.eventDate)) : '',
      eventTime: catering?.eventTime ?? '',
      headcount: catering?.headcount ?? 0,
      eventType: catering?.eventType ?? '',
      setupRequired: catering?.setupRequired ?? false,
      depositAmount: catering?.depositAmount ?? 0,
      depositPaid: catering?.depositPaid ?? false,
      approvalStatus: order.approvalStatus ?? 'NEEDS_APPROVAL',
      totalAmount: order.totalAmount,
      specialInstructions: catering?.specialInstructions ?? order.specialInstructions ?? '',
    };
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
