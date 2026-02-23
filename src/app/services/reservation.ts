import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  Reservation,
  ReservationFormData,
  ReservationStatus,
  WaitlistEntry,
  WaitlistFormData,
  DayAvailability,
  PublicReservationFormData,
  RecurringReservation,
  EventBooking,
  EventFormData,
  EventAttendee,
  TurnTimeStats,
  GuestPreferences,
} from '../models';
import { AuthService } from './auth';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ReservationService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  private readonly _reservations = signal<Reservation[]>([]);
  private readonly _waitlist = signal<WaitlistEntry[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);

  // Phase 2 signals
  private readonly _recurringReservations = signal<RecurringReservation[]>([]);
  private readonly _events = signal<EventBooking[]>([]);
  private readonly _turnTimeStats = signal<TurnTimeStats | null>(null);
  private readonly _isLoadingEvents = signal(false);
  private readonly _isLoadingRecurring = signal(false);

  readonly reservations = this._reservations.asReadonly();
  readonly waitlist = this._waitlist.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly recurringReservations = this._recurringReservations.asReadonly();
  readonly events = this._events.asReadonly();
  readonly turnTimeStats = this._turnTimeStats.asReadonly();
  readonly isLoadingEvents = this._isLoadingEvents.asReadonly();
  readonly isLoadingRecurring = this._isLoadingRecurring.asReadonly();

  readonly activeWaitlist = computed(() =>
    this._waitlist()
      .filter(e => e.status === 'waiting' || e.status === 'notified')
      .sort((a, b) => a.position - b.position)
  );

  readonly waitlistCount = computed(() => this.activeWaitlist().length);

  readonly todayReservations = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this._reservations().filter(r => r.reservationTime.startsWith(today));
  });

  readonly upcomingReservations = computed(() => {
    const now = new Date().toISOString();
    return this._reservations()
      .filter(r => r.reservationTime > now && r.status !== 'cancelled' && r.status !== 'no-show')
      .sort((a, b) => a.reservationTime.localeCompare(b.reservationTime));
  });

  readonly pastReservations = computed(() => {
    const now = new Date().toISOString();
    return this._reservations()
      .filter(r => r.reservationTime < now || r.status === 'completed' || r.status === 'cancelled' || r.status === 'no-show')
      .sort((a, b) => b.reservationTime.localeCompare(a.reservationTime));
  });

  readonly upcomingEvents = computed(() => {
    const now = new Date().toISOString().split('T')[0];
    return this._events()
      .filter(e => e.date >= now)
      .sort((a, b) => a.date.localeCompare(b.date));
  });

  readonly pastEvents = computed(() => {
    const now = new Date().toISOString().split('T')[0];
    return this._events()
      .filter(e => e.date < now)
      .sort((a, b) => b.date.localeCompare(a.date));
  });

  readonly activeRecurring = computed(() =>
    this._recurringReservations().filter(r => r.isActive)
  );

  readonly dynamicTurnTime = computed(() => {
    const stats = this._turnTimeStats();
    return stats?.overall ?? 45;
  });

  private get restaurantId(): string | null {
    return this.authService.selectedRestaurantId();
  }

  // ── Reservations ──

  async loadReservations(): Promise<void> {
    if (!this.restaurantId) return;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const data = await firstValueFrom(
        this.http.get<Reservation[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/reservations`
        )
      );
      this._reservations.set(data ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load reservations';
      this._error.set(message);
    } finally {
      this._isLoading.set(false);
    }
  }

  async createReservation(data: ReservationFormData): Promise<Reservation | null> {
    if (!this.restaurantId) return null;

    try {
      const reservation = await firstValueFrom(
        this.http.post<Reservation>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/reservations`,
          data
        )
      );
      this._reservations.update(list => [reservation, ...list]);
      return reservation;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create reservation';
      this._error.set(message);
      return null;
    }
  }

  async updateStatus(reservationId: string, status: ReservationStatus): Promise<boolean> {
    if (!this.restaurantId) return false;

    try {
      const updated = await firstValueFrom(
        this.http.patch<Reservation>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/reservations/${reservationId}`,
          { status }
        )
      );
      this._reservations.update(list =>
        list.map(r => r.id === reservationId ? updated : r)
      );
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update reservation';
      this._error.set(message);
      return false;
    }
  }

  async assignTable(reservationId: string, tableNumber: string): Promise<boolean> {
    if (!this.restaurantId) return false;

    try {
      const updated = await firstValueFrom(
        this.http.patch<Reservation>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/reservations/${reservationId}`,
          { tableNumber }
        )
      );
      this._reservations.update(list =>
        list.map(r => r.id === reservationId ? updated : r)
      );
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to assign table';
      this._error.set(message);
      return false;
    }
  }

  async cancelReservation(reservationId: string): Promise<boolean> {
    return this.updateStatus(reservationId, 'cancelled');
  }

  // ── Waitlist ──

  async loadWaitlist(): Promise<void> {
    if (!this.restaurantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<WaitlistEntry[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/waitlist`
        )
      );
      this._waitlist.set(data ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load waitlist';
      this._error.set(message);
    }
  }

  async addToWaitlist(data: WaitlistFormData): Promise<WaitlistEntry | null> {
    if (!this.restaurantId) return null;

    try {
      const entry = await firstValueFrom(
        this.http.post<WaitlistEntry>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/waitlist`,
          data
        )
      );
      this._waitlist.update(list => [...list, entry]);
      return entry;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add to waitlist';
      this._error.set(message);
      return null;
    }
  }

  async notifyWaitlistEntry(entryId: string): Promise<boolean> {
    if (!this.restaurantId) return false;

    try {
      const updated = await firstValueFrom(
        this.http.patch<WaitlistEntry>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/waitlist/${entryId}`,
          { status: 'notified' }
        )
      );
      this._waitlist.update(list => list.map(e => e.id === entryId ? updated : e));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to notify guest';
      this._error.set(message);
      return false;
    }
  }

  async seatWaitlistEntry(entryId: string): Promise<boolean> {
    if (!this.restaurantId) return false;

    try {
      const updated = await firstValueFrom(
        this.http.patch<WaitlistEntry>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/waitlist/${entryId}`,
          { status: 'seated' }
        )
      );
      this._waitlist.update(list => list.map(e => e.id === entryId ? updated : e));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to seat guest';
      this._error.set(message);
      return false;
    }
  }

  async removeFromWaitlist(entryId: string): Promise<boolean> {
    if (!this.restaurantId) return false;

    try {
      const updated = await firstValueFrom(
        this.http.patch<WaitlistEntry>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/waitlist/${entryId}`,
          { status: 'cancelled' }
        )
      );
      this._waitlist.update(list => list.map(e => e.id === entryId ? updated : e));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to remove from waitlist';
      this._error.set(message);
      return false;
    }
  }

  async reorderWaitlist(entryId: string, newPosition: number): Promise<boolean> {
    if (!this.restaurantId) return false;

    try {
      await firstValueFrom(
        this.http.patch<WaitlistEntry>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/waitlist/${entryId}`,
          { position: newPosition }
        )
      );
      await this.loadWaitlist();
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reorder waitlist';
      this._error.set(message);
      return false;
    }
  }

  // ── Public Booking Widget (unauthenticated) ──

  async getPublicAvailability(restaurantSlug: string, date: string, partySize: number): Promise<DayAvailability | null> {
    try {
      return await firstValueFrom(
        this.http.get<DayAvailability>(
          `${this.apiUrl}/public/restaurant/${restaurantSlug}/availability`,
          { params: { date, partySize: String(partySize) } }
        )
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load availability';
      this._error.set(message);
      return null;
    }
  }

  async createPublicReservation(restaurantSlug: string, data: PublicReservationFormData): Promise<Reservation | null> {
    try {
      return await firstValueFrom(
        this.http.post<Reservation>(
          `${this.apiUrl}/public/restaurant/${restaurantSlug}/reservations`,
          data
        )
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create reservation';
      this._error.set(message);
      return null;
    }
  }

  async getCustomerReservations(customerId: string): Promise<Reservation[]> {
    if (!this.restaurantId) return [];

    try {
      const data = await firstValueFrom(
        this.http.get<Reservation[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/reservations?customerId=${encodeURIComponent(customerId)}`
        )
      );
      return data ?? [];
    } catch {
      return [];
    }
  }

  // ── Recurring Reservations (Phase 2) ──

  async loadRecurringReservations(): Promise<void> {
    if (!this.restaurantId) return;
    this._isLoadingRecurring.set(true);
    this._error.set(null);

    try {
      const data = await firstValueFrom(
        this.http.get<RecurringReservation[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/reservations/recurring`
        )
      );
      this._recurringReservations.set(data ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load recurring reservations';
      this._error.set(message);
    } finally {
      this._isLoadingRecurring.set(false);
    }
  }

  async createRecurringReservation(data: ReservationFormData): Promise<RecurringReservation | null> {
    if (!this.restaurantId) return null;

    try {
      const recurring = await firstValueFrom(
        this.http.post<RecurringReservation>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/reservations/recurring`,
          data
        )
      );
      this._recurringReservations.update(list => [recurring, ...list]);
      return recurring;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create recurring reservation';
      this._error.set(message);
      return null;
    }
  }

  async cancelRecurringReservation(id: string): Promise<boolean> {
    if (!this.restaurantId) return false;

    try {
      await firstValueFrom(
        this.http.delete(
          `${this.apiUrl}/restaurant/${this.restaurantId}/reservations/recurring/${id}`
        )
      );
      this._recurringReservations.update(list => list.filter(r => r.id !== id));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to cancel recurring reservation';
      this._error.set(message);
      return false;
    }
  }

  async toggleRecurring(id: string, isActive: boolean): Promise<boolean> {
    if (!this.restaurantId) return false;

    try {
      const updated = await firstValueFrom(
        this.http.patch<RecurringReservation>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/reservations/recurring/${id}`,
          { isActive }
        )
      );
      this._recurringReservations.update(list =>
        list.map(r => r.id === id ? updated : r)
      );
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update recurring reservation';
      this._error.set(message);
      return false;
    }
  }

  // ── Events & Classes (Phase 2) ──

  async loadEvents(): Promise<void> {
    if (!this.restaurantId) return;
    this._isLoadingEvents.set(true);
    this._error.set(null);

    try {
      const data = await firstValueFrom(
        this.http.get<EventBooking[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/events`
        )
      );
      this._events.set(data ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load events';
      this._error.set(message);
    } finally {
      this._isLoadingEvents.set(false);
    }
  }

  async createEvent(data: EventFormData): Promise<EventBooking | null> {
    if (!this.restaurantId) return null;

    try {
      const event = await firstValueFrom(
        this.http.post<EventBooking>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/events`,
          data
        )
      );
      this._events.update(list => [event, ...list]);
      return event;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create event';
      this._error.set(message);
      return null;
    }
  }

  async updateEvent(id: string, data: Partial<EventFormData>): Promise<boolean> {
    if (!this.restaurantId) return false;

    try {
      const updated = await firstValueFrom(
        this.http.patch<EventBooking>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/events/${id}`,
          data
        )
      );
      this._events.update(list => list.map(e => e.id === id ? updated : e));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update event';
      this._error.set(message);
      return false;
    }
  }

  async deleteEvent(id: string): Promise<boolean> {
    if (!this.restaurantId) return false;

    try {
      await firstValueFrom(
        this.http.delete(`${this.apiUrl}/restaurant/${this.restaurantId}/events/${id}`)
      );
      this._events.update(list => list.filter(e => e.id !== id));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete event';
      this._error.set(message);
      return false;
    }
  }

  async toggleEventPublished(id: string, isPublished: boolean): Promise<boolean> {
    return this.updateEvent(id, { isPublished });
  }

  async checkInAttendee(eventId: string, attendeeId: string): Promise<boolean> {
    if (!this.restaurantId) return false;

    try {
      const updated = await firstValueFrom(
        this.http.patch<EventBooking>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/events/${eventId}/attendees/${attendeeId}`,
          { checkedIn: true }
        )
      );
      this._events.update(list => list.map(e => e.id === eventId ? updated : e));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to check in attendee';
      this._error.set(message);
      return false;
    }
  }

  async refundAttendee(eventId: string, attendeeId: string): Promise<boolean> {
    if (!this.restaurantId) return false;

    try {
      const updated = await firstValueFrom(
        this.http.post<EventBooking>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/events/${eventId}/attendees/${attendeeId}/refund`,
          {}
        )
      );
      this._events.update(list => list.map(e => e.id === eventId ? updated : e));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to refund attendee';
      this._error.set(message);
      return false;
    }
  }

  // ── Dynamic Turn Times (Phase 2) ──

  async loadTurnTimeStats(): Promise<void> {
    if (!this.restaurantId) return;

    try {
      const stats = await firstValueFrom(
        this.http.get<TurnTimeStats>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/reservations/turn-time-stats`
        )
      );
      this._turnTimeStats.set(stats);
    } catch {
      // Non-critical — falls back to 45min default via dynamicTurnTime computed
    }
  }

  // ── Guest Preferences (Phase 2) ──

  async updateGuestPreferences(reservationId: string, preferences: GuestPreferences): Promise<boolean> {
    if (!this.restaurantId) return false;

    try {
      const updated = await firstValueFrom(
        this.http.patch<Reservation>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/reservations/${reservationId}`,
          { preferences }
        )
      );
      this._reservations.update(list =>
        list.map(r => r.id === reservationId ? updated : r)
      );
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update guest preferences';
      this._error.set(message);
      return false;
    }
  }

  clearError(): void {
    this._error.set(null);
  }
}
