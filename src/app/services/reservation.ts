import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Reservation, ReservationFormData, ReservationStatus, WaitlistEntry, WaitlistFormData, DayAvailability, PublicReservationFormData } from '../models';
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

  readonly reservations = this._reservations.asReadonly();
  readonly waitlist = this._waitlist.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

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

  private get restaurantId(): string | null {
    return this.authService.selectedRestaurantId();
  }

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

  // --- Waitlist ---

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

  // --- Public Booking Widget (unauthenticated) ---

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

  clearError(): void {
    this._error.set(null);
  }
}
