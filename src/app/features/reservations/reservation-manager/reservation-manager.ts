import { Component, inject, signal, computed, effect, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ReservationService } from '@services/reservation';
import { TableService } from '@services/table';
import { AuthService } from '@services/auth';
import { LoadingSpinner } from '@shared/loading-spinner/loading-spinner';
import { ErrorDisplay } from '@shared/error-display/error-display';
import {
  Reservation,
  ReservationTab,
  ReservationStatus,
  WaitlistEntry,
  WaitlistFormData,
  RecurrencePattern,
  EventBooking,
  EventFormData,
  GuestPreferences,
  SeatingPreference,
  TimelineBlock,
  DIETARY_OPTIONS,
  OCCASION_OPTIONS,
} from '@models/index';

@Component({
  selector: 'os-reservations',
  imports: [ReactiveFormsModule, DatePipe, LoadingSpinner, ErrorDisplay],
  templateUrl: './reservation-manager.html',
  styleUrl: './reservation-manager.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReservationManager {
  private readonly fb = inject(FormBuilder);
  private readonly reservationService = inject(ReservationService);
  private readonly tableService = inject(TableService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly dietaryOptions = DIETARY_OPTIONS;
  readonly occasionOptions = OCCASION_OPTIONS;

  // ── Core state ──
  private readonly _activeTab = signal<ReservationTab>('today');
  private readonly _showForm = signal(false);
  private readonly _isSaving = signal(false);
  private readonly _selectedReservation = signal<Reservation | null>(null);
  private readonly _localError = signal<string | null>(null);

  readonly activeTab = this._activeTab.asReadonly();
  readonly showForm = this._showForm.asReadonly();
  readonly isSaving = this._isSaving.asReadonly();
  readonly selectedReservation = this._selectedReservation.asReadonly();
  readonly localError = this._localError.asReadonly();

  readonly isLoading = this.reservationService.isLoading;
  readonly todayReservations = this.reservationService.todayReservations;
  readonly upcomingReservations = this.reservationService.upcomingReservations;
  readonly pastReservations = this.reservationService.pastReservations;
  readonly activeWaitlist = this.reservationService.activeWaitlist;
  readonly waitlistCount = this.reservationService.waitlistCount;
  readonly tables = this.tableService.tables;

  readonly availableTables = computed(() =>
    this.tableService.tables().filter(t => t.status === 'available' && t.active)
  );

  readonly todayCount = computed(() => this.todayReservations().length);
  readonly upcomingCount = computed(() => this.upcomingReservations().length);
  readonly totalSeats = computed(() =>
    this.todayReservations()
      .filter(r => r.status !== 'cancelled' && r.status !== 'no-show')
      .reduce((sum, r) => sum + r.partySize, 0)
  );

  // ── Waitlist ──
  private readonly _showWaitlistForm = signal(false);
  private readonly _waitlistSaving = signal(false);
  private readonly _waitlistName = signal('');
  private readonly _waitlistSize = signal(2);
  private readonly _waitlistPhone = signal('');
  private readonly _waitlistNotes = signal('');

  readonly showWaitlistForm = this._showWaitlistForm.asReadonly();
  readonly waitlistSaving = this._waitlistSaving.asReadonly();
  readonly waitlistName = this._waitlistName.asReadonly();
  readonly waitlistSize = this._waitlistSize.asReadonly();
  readonly waitlistPhone = this._waitlistPhone.asReadonly();
  readonly waitlistNotes = this._waitlistNotes.asReadonly();

  // ── Dynamic Turn Time (Phase 2) ──
  readonly turnTimeStats = this.reservationService.turnTimeStats;
  readonly avgTableTurnMinutes = this.reservationService.dynamicTurnTime;

  // ── Recurring Reservations (Phase 2) ──
  readonly recurringReservations = this.reservationService.recurringReservations;
  readonly activeRecurring = this.reservationService.activeRecurring;
  readonly isLoadingRecurring = this.reservationService.isLoadingRecurring;
  private readonly _showRecurringForm = signal(false);
  private readonly _recurringPattern = signal<RecurrencePattern>('weekly');
  private readonly _recurringEndDate = signal('');
  readonly showRecurringForm = this._showRecurringForm.asReadonly();
  readonly recurringPattern = this._recurringPattern.asReadonly();
  readonly recurringEndDate = this._recurringEndDate.asReadonly();

  // ── Events (Phase 2) ──
  readonly events = this.reservationService.events;
  readonly upcomingEvents = this.reservationService.upcomingEvents;
  readonly pastEvents = this.reservationService.pastEvents;
  readonly isLoadingEvents = this.reservationService.isLoadingEvents;
  private readonly _showEventForm = signal(false);
  private readonly _selectedEvent = signal<EventBooking | null>(null);
  private readonly _eventFilter = signal<'upcoming' | 'past'>('upcoming');
  private readonly _isSavingEvent = signal(false);
  readonly showEventForm = this._showEventForm.asReadonly();
  readonly selectedEvent = this._selectedEvent.asReadonly();
  readonly eventFilter = this._eventFilter.asReadonly();
  readonly isSavingEvent = this._isSavingEvent.asReadonly();

  readonly eventForm = this.fb.group({
    bookingType: ['event' as string, Validators.required],
    title: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    date: ['', Validators.required],
    startTime: ['', Validators.required],
    endTime: ['', Validators.required],
    maxAttendees: [20, [Validators.required, Validators.min(1)]],
    pricePerPerson: [0, [Validators.required, Validators.min(0)]],
    requiresPrepayment: [false],
    isPublished: [false],
  });

  // ── Guest Preferences (Phase 2) ──
  private readonly _showPreferencesModal = signal(false);
  private readonly _preferencesReservationId = signal<string | null>(null);
  private readonly _prefSeating = signal<SeatingPreference>('no_preference');
  private readonly _prefHighChairs = signal(0);
  private readonly _prefWheelchair = signal(false);
  private readonly _prefDietary = signal<string[]>([]);
  private readonly _prefCelebration = signal<string | null>(null);
  private readonly _prefNotes = signal<string | null>(null);
  readonly showPreferencesModal = this._showPreferencesModal.asReadonly();
  readonly prefSeating = this._prefSeating.asReadonly();
  readonly prefHighChairs = this._prefHighChairs.asReadonly();
  readonly prefWheelchair = this._prefWheelchair.asReadonly();
  readonly prefDietary = this._prefDietary.asReadonly();
  readonly prefCelebration = this._prefCelebration.asReadonly();
  readonly prefNotes = this._prefNotes.asReadonly();

  // ── Timeline View (Phase 2) ──
  private readonly _timelineDate = signal(new Date().toISOString().split('T')[0]);
  readonly timelineDate = this._timelineDate.asReadonly();
  readonly timelineHours = computed(() => {
    const hours: string[] = [];
    for (let h = 9; h <= 23; h++) {
      hours.push(`${String(h).padStart(2, '0')}:00`);
    }
    return hours;
  });

  readonly timelineBlocks = computed((): TimelineBlock[] => {
    const date = this._timelineDate();
    const dayReservations = this.reservationService.reservations()
      .filter(r => r.reservationTime.startsWith(date) && r.status !== 'cancelled' && r.status !== 'no-show');

    const allTables = this.tableService.tables().filter(t => t.active);
    const blocks: TimelineBlock[] = [];

    for (const res of dayReservations) {
      const resDate = new Date(res.reservationTime);
      const startMinute = (resDate.getHours() - 9) * 60 + resDate.getMinutes();
      const duration = this.getTurnTimeForParty(res.partySize);

      const table = res.tableNumber
        ? allTables.find(t => t.tableNumber === res.tableNumber)
        : null;

      blocks.push({
        reservation: res,
        startMinute,
        durationMinutes: duration,
        tableId: table?.id ?? 'unassigned',
        tableName: table ? (table.tableName ?? `Table ${table.tableNumber}`) : 'Unassigned',
      });
    }

    return blocks;
  });

  readonly timelineTables = computed(() => {
    const allTables = this.tableService.tables().filter(t => t.active);
    const tableNames = allTables.map(t => ({
      id: t.id,
      name: t.tableName ?? `Table ${t.tableNumber}`,
      capacity: t.capacity,
      section: t.section ?? '',
    }));
    tableNames.sort((a, b) => a.section.localeCompare(b.section) || a.name.localeCompare(b.name));

    const hasUnassigned = this.timelineBlocks().some(b => b.tableId === 'unassigned');
    if (hasUnassigned) {
      tableNames.push({ id: 'unassigned', name: 'Unassigned', capacity: 0, section: 'zzz' });
    }
    return tableNames;
  });

  readonly currentTimeOffset = computed(() => {
    const now = new Date();
    return (now.getHours() - 9) * 60 + now.getMinutes();
  });

  readonly capacityByHour = computed(() => {
    const blocks = this.timelineBlocks();
    const hours: { hour: string; covers: number; maxCovers: number }[] = [];
    const totalCapacity = this.tableService.tables()
      .filter(t => t.active)
      .reduce((sum, t) => sum + t.capacity, 0);

    for (let h = 9; h <= 23; h++) {
      const startMin = (h - 9) * 60;
      const endMin = startMin + 60;
      const covers = blocks
        .filter(b => b.startMinute < endMin && b.startMinute + b.durationMinutes > startMin)
        .reduce((sum, b) => sum + b.reservation.partySize, 0);
      hours.push({
        hour: `${String(h).padStart(2, '0')}:00`,
        covers,
        maxCovers: totalCapacity,
      });
    }
    return hours;
  });

  // ── Reservation Form ──
  readonly reservationForm = this.fb.group({
    customerName: ['', [Validators.required, Validators.minLength(2)]],
    customerPhone: ['', [Validators.required]],
    customerEmail: [''],
    partySize: [2, [Validators.required, Validators.min(1), Validators.max(20)]],
    reservationDate: ['', Validators.required],
    reservationTime: ['', Validators.required],
    tableNumber: [''],
    specialRequests: [''],
  });

  private eventsLoaded = false;
  private recurringLoaded = false;

  constructor() {
    effect(() => {
      if (this.isAuthenticated() && this.authService.selectedRestaurantId()) {
        this.reservationService.loadReservations();
        this.reservationService.loadWaitlist();
        this.reservationService.loadTurnTimeStats();
        this.tableService.loadTables();
      }
    });
  }

  // ── Tab Navigation ──

  setTab(tab: ReservationTab): void {
    this._activeTab.set(tab);
    if (tab === 'waitlist') {
      this.reservationService.loadWaitlist();
    }
    if (tab === 'events' && !this.eventsLoaded) {
      this.reservationService.loadEvents();
      this.eventsLoaded = true;
    }
    if ((tab === 'today' || tab === 'upcoming') && !this.recurringLoaded) {
      this.reservationService.loadRecurringReservations();
      this.recurringLoaded = true;
    }
  }

  // ── Reservation CRUD ──

  openForm(): void {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = `${String(now.getHours() + 1).padStart(2, '0')}:00`;

    this.reservationForm.reset({
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      partySize: 2,
      reservationDate: dateStr,
      reservationTime: timeStr,
      tableNumber: '',
      specialRequests: '',
    });
    this._showRecurringForm.set(false);
    this._recurringPattern.set('weekly');
    this._recurringEndDate.set('');
    this._showForm.set(true);
  }

  closeForm(): void {
    this._showForm.set(false);
    this.reservationForm.reset();
  }

  toggleRecurringForm(): void {
    this._showRecurringForm.update(v => !v);
  }

  setRecurringPattern(event: Event): void {
    this._recurringPattern.set((event.target as HTMLSelectElement).value as RecurrencePattern);
  }

  setRecurringEndDate(event: Event): void {
    this._recurringEndDate.set((event.target as HTMLInputElement).value);
  }

  async saveReservation(): Promise<void> {
    if (this.reservationForm.invalid || this._isSaving()) return;

    this._isSaving.set(true);
    this._localError.set(null);

    try {
      const form = this.reservationForm.value;
      const reservationTime = `${form.reservationDate}T${form.reservationTime}:00`;

      const data = {
        customerName: form.customerName!,
        customerPhone: form.customerPhone!,
        customerEmail: form.customerEmail || undefined,
        partySize: form.partySize!,
        reservationTime,
        tableNumber: form.tableNumber || undefined,
        specialRequests: form.specialRequests || undefined,
        recurringPattern: this._showRecurringForm() ? this._recurringPattern() : undefined,
        recurringEndDate: this._showRecurringForm() && this._recurringEndDate() ? this._recurringEndDate() : undefined,
      };

      if (this._showRecurringForm()) {
        const result = await this.reservationService.createRecurringReservation(data);
        if (result) {
          this.closeForm();
          await this.reservationService.loadReservations();
        } else {
          this._localError.set(this.reservationService.error() ?? 'Failed to create recurring reservation');
        }
      } else {
        const result = await this.reservationService.createReservation(data);
        if (result) {
          this.closeForm();
        } else {
          this._localError.set(this.reservationService.error() ?? 'Failed to create reservation');
        }
      }
    } catch (err: unknown) {
      this._localError.set(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      this._isSaving.set(false);
    }
  }

  async updateStatus(reservation: Reservation, status: ReservationStatus): Promise<void> {
    this._localError.set(null);
    const success = await this.reservationService.updateStatus(reservation.id, status);
    if (!success) {
      this._localError.set(this.reservationService.error() ?? 'Failed to update status');
    }
  }

  selectReservation(reservation: Reservation): void {
    this._selectedReservation.set(reservation);
  }

  closeDetail(): void {
    this._selectedReservation.set(null);
  }

  isRecurring(reservation: Reservation): boolean {
    return reservation.recurringReservationId !== null;
  }

  async cancelRecurring(id: string): Promise<void> {
    this._localError.set(null);
    const success = await this.reservationService.cancelRecurringReservation(id);
    if (!success) {
      this._localError.set(this.reservationService.error() ?? 'Failed to cancel recurring reservation');
    }
  }

  async toggleRecurringActive(id: string, isActive: boolean): Promise<void> {
    await this.reservationService.toggleRecurring(id, isActive);
  }

  getRecurrenceLabel(pattern: RecurrencePattern): string {
    switch (pattern) {
      case 'weekly': return 'Weekly';
      case 'biweekly': return 'Biweekly';
      case 'monthly': return 'Monthly';
      case 'first_weekday': return '1st of Month';
      case 'last_weekday': return 'Last of Month';
    }
  }

  // ── Waitlist ──

  openWaitlistForm(): void {
    this._waitlistName.set('');
    this._waitlistSize.set(2);
    this._waitlistPhone.set('');
    this._waitlistNotes.set('');
    this._showWaitlistForm.set(true);
  }

  closeWaitlistForm(): void {
    this._showWaitlistForm.set(false);
  }

  onWaitlistField(field: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    switch (field) {
      case 'name': this._waitlistName.set(value); break;
      case 'size': this._waitlistSize.set(Number.parseInt(value, 10) || 2); break;
      case 'phone': this._waitlistPhone.set(value); break;
      case 'notes': this._waitlistNotes.set(value); break;
    }
  }

  async saveWaitlistEntry(): Promise<void> {
    const name = this._waitlistName().trim();
    if (!name || this._waitlistSaving()) return;

    this._waitlistSaving.set(true);
    this._localError.set(null);

    const data: WaitlistFormData = {
      partyName: name,
      partySize: this._waitlistSize(),
      phone: this._waitlistPhone().trim(),
      notes: this._waitlistNotes().trim() || undefined,
    };

    const result = await this.reservationService.addToWaitlist(data);
    this._waitlistSaving.set(false);

    if (result) {
      this.closeWaitlistForm();
    } else {
      this._localError.set(this.reservationService.error() ?? 'Failed to add to waitlist');
    }
  }

  async notifyGuest(entry: WaitlistEntry): Promise<void> {
    await this.reservationService.notifyWaitlistEntry(entry.id);
  }

  async seatGuest(entry: WaitlistEntry): Promise<void> {
    await this.reservationService.seatWaitlistEntry(entry.id);
  }

  async removeGuest(entry: WaitlistEntry): Promise<void> {
    await this.reservationService.removeFromWaitlist(entry.id);
  }

  async moveUp(entry: WaitlistEntry): Promise<void> {
    if (entry.position <= 1) return;
    await this.reservationService.reorderWaitlist(entry.id, entry.position - 1);
  }

  async moveDown(entry: WaitlistEntry): Promise<void> {
    await this.reservationService.reorderWaitlist(entry.id, entry.position + 1);
  }

  getEstimatedWait(entry: WaitlistEntry): number {
    return entry.estimatedWaitMinutes || entry.position * this.avgTableTurnMinutes();
  }

  getElapsedWait(createdAt: string): string {
    const diff = Date.now() - new Date(createdAt).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return `${hours}h ${remainder}m`;
  }

  // ── Events (Phase 2) ──

  setEventFilter(filter: 'upcoming' | 'past'): void {
    this._eventFilter.set(filter);
  }

  openEventForm(): void {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    this.eventForm.reset({
      bookingType: 'event',
      title: '',
      description: '',
      date: dateStr,
      startTime: '18:00',
      endTime: '21:00',
      maxAttendees: 20,
      pricePerPerson: 0,
      requiresPrepayment: false,
      isPublished: false,
    });
    this._showEventForm.set(true);
  }

  closeEventForm(): void {
    this._showEventForm.set(false);
  }

  async saveEvent(): Promise<void> {
    if (this.eventForm.invalid || this._isSavingEvent()) return;
    this._isSavingEvent.set(true);
    this._localError.set(null);

    try {
      const form = this.eventForm.value;
      const data: EventFormData = {
        bookingType: form.bookingType as 'event' | 'class',
        title: form.title!,
        description: form.description ?? '',
        date: form.date!,
        startTime: form.startTime!,
        endTime: form.endTime!,
        maxAttendees: form.maxAttendees!,
        pricePerPerson: form.pricePerPerson!,
        requiresPrepayment: form.requiresPrepayment ?? false,
        isPublished: form.isPublished ?? false,
      };

      const result = await this.reservationService.createEvent(data);
      if (result) {
        this.closeEventForm();
      } else {
        this._localError.set(this.reservationService.error() ?? 'Failed to create event');
      }
    } catch (err: unknown) {
      this._localError.set(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      this._isSavingEvent.set(false);
    }
  }

  selectEvent(event: EventBooking): void {
    this._selectedEvent.set(event);
  }

  closeEventDetail(): void {
    this._selectedEvent.set(null);
  }

  async togglePublished(event: EventBooking): Promise<void> {
    await this.reservationService.toggleEventPublished(event.id, !event.isPublished);
  }

  async deleteEvent(event: EventBooking): Promise<void> {
    this._localError.set(null);
    const success = await this.reservationService.deleteEvent(event.id);
    if (!success) {
      this._localError.set(this.reservationService.error() ?? 'Failed to delete event');
    }
    this._selectedEvent.set(null);
  }

  async checkInAttendee(eventId: string, attendeeId: string): Promise<void> {
    await this.reservationService.checkInAttendee(eventId, attendeeId);
  }

  async refundAttendee(eventId: string, attendeeId: string): Promise<void> {
    await this.reservationService.refundAttendee(eventId, attendeeId);
  }

  getEventTypeLabel(type: string): string {
    switch (type) {
      case 'event': return 'Event';
      case 'class': return 'Class';
      default: return 'Event';
    }
  }

  getAttendeePaymentClass(status: string): string {
    switch (status) {
      case 'paid': return 'badge-success';
      case 'pending': return 'badge-warning';
      case 'refunded': return 'badge-secondary';
      default: return 'badge-secondary';
    }
  }

  // ── Guest Preferences (Phase 2) ──

  openPreferences(reservation: Reservation): void {
    const prefs = reservation.preferences;
    this._preferencesReservationId.set(reservation.id);
    this._prefSeating.set(prefs?.seatingPreference ?? 'no_preference');
    this._prefHighChairs.set(prefs?.highChairsNeeded ?? 0);
    this._prefWheelchair.set(prefs?.wheelchairAccessible ?? false);
    this._prefDietary.set(prefs?.dietaryRestrictions ?? []);
    this._prefCelebration.set(prefs?.celebration ?? null);
    this._prefNotes.set(prefs?.notes ?? null);
    this._showPreferencesModal.set(true);
  }

  closePreferences(): void {
    this._showPreferencesModal.set(false);
    this._preferencesReservationId.set(null);
  }

  onPrefField(field: string, event: Event): void {
    const target = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    switch (field) {
      case 'seating': this._prefSeating.set(target.value as SeatingPreference); break;
      case 'highChairs': this._prefHighChairs.set(Number.parseInt(target.value, 10) || 0); break;
      case 'wheelchair': this._prefWheelchair.set((target as HTMLInputElement).checked); break;
      case 'celebration': this._prefCelebration.set(target.value || null); break;
      case 'notes': this._prefNotes.set(target.value || null); break;
    }
  }

  toggleDietary(option: string): void {
    this._prefDietary.update(list => {
      if (list.includes(option)) {
        return list.filter(d => d !== option);
      }
      return [...list, option];
    });
  }

  isDietarySelected(option: string): boolean {
    return this._prefDietary().includes(option);
  }

  async savePreferences(): Promise<void> {
    const resId = this._preferencesReservationId();
    if (!resId) return;

    const preferences: GuestPreferences = {
      seatingPreference: this._prefSeating(),
      highChairsNeeded: this._prefHighChairs(),
      wheelchairAccessible: this._prefWheelchair(),
      dietaryRestrictions: this._prefDietary(),
      celebration: this._prefCelebration(),
      notes: this._prefNotes(),
    };

    const success = await this.reservationService.updateGuestPreferences(resId, preferences);
    if (success) {
      this.closePreferences();
      // Update selected reservation if open
      const sel = this._selectedReservation();
      if (sel?.id === resId) {
        this._selectedReservation.set({ ...sel, preferences });
      }
    } else {
      this._localError.set(this.reservationService.error() ?? 'Failed to save preferences');
    }
  }

  getSeatingLabel(pref: SeatingPreference): string {
    switch (pref) {
      case 'no_preference': return 'No Preference';
      case 'indoor': return 'Indoor';
      case 'outdoor': return 'Outdoor';
      case 'bar': return 'Bar';
      case 'private': return 'Private';
    }
  }

  // ── Timeline View (Phase 2) ──

  setTimelineDate(event: Event): void {
    this._timelineDate.set((event.target as HTMLInputElement).value);
  }

  getBlockStyle(block: TimelineBlock): Record<string, string> {
    const totalMinutes = 15 * 60; // 9:00 to 24:00
    const leftPercent = (block.startMinute / totalMinutes) * 100;
    const widthPercent = (block.durationMinutes / totalMinutes) * 100;
    return {
      left: `${leftPercent}%`,
      width: `${Math.max(widthPercent, 1.5)}%`,
    };
  }

  getBlocksForTable(tableId: string): TimelineBlock[] {
    return this.timelineBlocks().filter(b => b.tableId === tableId);
  }

  getBlockClass(block: TimelineBlock): string {
    switch (block.reservation.status) {
      case 'pending': return 'block-pending';
      case 'confirmed': return 'block-confirmed';
      case 'seated': return 'block-seated';
      case 'completed': return 'block-completed';
      default: return 'block-pending';
    }
  }

  getCapacityPercent(covers: number, max: number): number {
    if (max === 0) return 0;
    return Math.min((covers / max) * 100, 100);
  }

  getCapacityColor(covers: number, max: number): string {
    const pct = this.getCapacityPercent(covers, max);
    if (pct >= 90) return 'var(--os-danger)';
    if (pct >= 70) return 'var(--os-warning)';
    return 'var(--os-success)';
  }

  getCurrentTimeStyle(): Record<string, string> {
    const offset = this.currentTimeOffset();
    const totalMinutes = 15 * 60;
    const leftPercent = (offset / totalMinutes) * 100;
    return { left: `${leftPercent}%` };
  }

  // ── Helpers ──

  getTurnTimeForParty(partySize: number): number {
    const stats = this.turnTimeStats();
    if (!stats) return 45;

    const match = stats.byPartySize.find(s => {
      if (s.range === '1-2' && partySize <= 2) return true;
      if (s.range === '3-4' && partySize >= 3 && partySize <= 4) return true;
      if (s.range === '5-6' && partySize >= 5 && partySize <= 6) return true;
      if (s.range === '7+' && partySize >= 7) return true;
      return false;
    });
    return match?.avgMinutes ?? stats.overall;
  }

  getWaitlistStatusClass(status: string): string {
    switch (status) {
      case 'waiting': return 'status-pending';
      case 'notified': return 'status-confirmed';
      case 'seated': return 'status-seated';
      case 'cancelled': return 'status-cancelled';
      case 'no-show': return 'status-noshow';
      default: return 'status-pending';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'confirmed': return 'status-confirmed';
      case 'seated': return 'status-seated';
      case 'completed': return 'status-completed';
      case 'cancelled': return 'status-cancelled';
      case 'no-show': return 'status-noshow';
      default: return 'status-pending';
    }
  }

  formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  clearLocalError(): void {
    this._localError.set(null);
  }

  retry(): void {
    this._localError.set(null);
    this.reservationService.loadReservations();
  }
}
