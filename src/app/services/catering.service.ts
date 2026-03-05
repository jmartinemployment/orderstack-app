import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  CateringEvent,
  CateringEventStatus,
  CateringCapacitySettings,
} from '../models';
import { AuthService } from './auth';
import { environment } from '@environments/environment';

@Injectable({ providedIn: 'root' })
export class CateringService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  private get merchantId(): string | null {
    return this.authService.selectedMerchantId() ?? null;
  }

  private readonly _events = signal<CateringEvent[]>([]);
  private readonly _capacitySettings = signal<CateringCapacitySettings | null>(null);
  readonly isLoading = signal(false);

  readonly events = this._events.asReadonly();
  readonly capacitySettings = this._capacitySettings.asReadonly();

  readonly activeEvents = computed(() =>
    this._events().filter(e =>
      e.status === 'inquiry' || e.status === 'proposal_sent' || e.status === 'confirmed'
    ).sort((a, b) => {
      const order: Record<CateringEventStatus, number> = {
        confirmed: 0, proposal_sent: 1, inquiry: 2, completed: 3, cancelled: 4,
      };
      return order[a.status] - order[b.status];
    })
  );

  readonly upcomingEvents = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this._events()
      .filter(e => e.eventDate >= today && e.status !== 'cancelled')
      .sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  });

  readonly pastEvents = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this._events()
      .filter(e => e.eventDate < today || e.status === 'completed' || e.status === 'cancelled')
      .sort((a, b) => b.eventDate.localeCompare(a.eventDate));
  });

  readonly conflictDays = computed(() => {
    const settings = this._capacitySettings();
    if (!settings) return [];
    const confirmed = this._events().filter(e => e.status === 'confirmed');
    const byDate: Record<string, number> = {};
    for (const e of confirmed) {
      byDate[e.eventDate] = (byDate[e.eventDate] ?? 0) + e.headcount;
    }
    return Object.entries(byDate)
      .filter(([, total]) => total > settings.maxHeadcountPerDay)
      .map(([date]) => date);
  });

  async loadEvents(): Promise<void> {
    const id = this.merchantId;
    if (!id) return;

    this.isLoading.set(true);
    try {
      const events = await firstValueFrom(
        this.http.get<CateringEvent[]>(
          `${this.apiUrl}/merchant/${id}/catering/events`
        )
      );
      this._events.set(events);
    } catch {
      this._events.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadCapacitySettings(): Promise<void> {
    const id = this.merchantId;
    if (!id) return;

    try {
      const settings = await firstValueFrom(
        this.http.get<CateringCapacitySettings>(
          `${this.apiUrl}/merchant/${id}/catering/capacity`
        )
      );
      this._capacitySettings.set(settings);
    } catch {
      this._capacitySettings.set(null);
    }
  }

  async createEvent(
    data: Omit<CateringEvent, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<CateringEvent | null> {
    const id = this.merchantId;
    if (!id) {
      console.error('[CateringService] createEvent called with no merchantId');
      return null;
    }

    try {
      const event = await firstValueFrom(
        this.http.post<CateringEvent>(
          `${this.apiUrl}/merchant/${id}/catering/events`,
          data
        )
      );
      this._events.update(list => [...list, event]);
      return event;
    } catch {
      return null;
    }
  }

  async updateEvent(id: string, data: Partial<CateringEvent>): Promise<void> {
    const mid = this.merchantId;
    if (!mid) return;

    try {
      const updated = await firstValueFrom(
        this.http.patch<CateringEvent>(
          `${this.apiUrl}/merchant/${mid}/catering/events/${id}`,
          data
        )
      );
      this._events.update(list =>
        list.map(e => e.id === id ? updated : e)
      );
    } catch {
      // silently fail — caller can check events signal
    }
  }

  async updateStatus(id: string, status: CateringEventStatus): Promise<void> {
    await this.updateEvent(id, { status });
  }

  async deleteEvent(id: string): Promise<void> {
    const mid = this.merchantId;
    if (!mid) return;

    try {
      await firstValueFrom(
        this.http.delete(
          `${this.apiUrl}/merchant/${mid}/catering/events/${id}`
        )
      );
      this._events.update(list => list.filter(e => e.id !== id));
    } catch {
      // silently fail
    }
  }

  async saveCapacitySettings(settings: CateringCapacitySettings): Promise<void> {
    const id = this.merchantId;
    if (!id) return;

    try {
      const saved = await firstValueFrom(
        this.http.put<CateringCapacitySettings>(
          `${this.apiUrl}/merchant/${id}/catering/capacity`,
          settings
        )
      );
      this._capacitySettings.set(saved);
    } catch {
      // silently fail
    }
  }
}
