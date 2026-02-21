import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  LocationGroup,
  LocationGroupFormData,
  LocationGroupMember,
  CrossLocationReport,
  MenuSyncPreview,
  MenuSyncResult,
  MenuSyncHistory,
  SettingsPropagation,
} from '../models';
import { AuthService } from './auth';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root',
})
export class MultiLocationService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  private readonly _groups = signal<LocationGroup[]>([]);
  private readonly _groupMembers = signal<Map<string, LocationGroupMember[]>>(new Map());
  private readonly _crossLocationReport = signal<CrossLocationReport | null>(null);
  private readonly _syncPreview = signal<MenuSyncPreview | null>(null);
  private readonly _syncHistory = signal<MenuSyncResult[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _isSyncing = signal(false);
  private readonly _isPropagating = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly groups = this._groups.asReadonly();
  readonly groupMembers = this._groupMembers.asReadonly();
  readonly crossLocationReport = this._crossLocationReport.asReadonly();
  readonly syncPreview = this._syncPreview.asReadonly();
  readonly syncHistory = this._syncHistory.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly isSyncing = this._isSyncing.asReadonly();
  readonly isPropagating = this._isPropagating.asReadonly();
  readonly error = this._error.asReadonly();

  readonly groupCount = computed(() => this._groups().length);

  private get groupId(): string | null {
    return this.authService.user()?.restaurantGroupId ?? null;
  }

  // ── Location Groups ──

  async loadGroups(): Promise<void> {
    if (!this.groupId) return;
    this._isLoading.set(true);
    this._error.set(null);
    try {
      const groups = await firstValueFrom(
        this.http.get<LocationGroup[]>(
          `${this.apiUrl}/restaurant-groups/${this.groupId}/location-groups`
        )
      );
      this._groups.set(groups);
    } catch {
      this._error.set('Failed to load location groups');
    } finally {
      this._isLoading.set(false);
    }
  }

  async createGroup(data: LocationGroupFormData): Promise<LocationGroup | null> {
    if (!this.groupId) return null;
    this._error.set(null);
    try {
      const group = await firstValueFrom(
        this.http.post<LocationGroup>(
          `${this.apiUrl}/restaurant-groups/${this.groupId}/location-groups`,
          data
        )
      );
      this._groups.update(list => [...list, group]);
      return group;
    } catch {
      this._error.set('Failed to create group');
      return null;
    }
  }

  async updateGroup(id: string, data: Partial<LocationGroupFormData>): Promise<void> {
    if (!this.groupId) return;
    this._error.set(null);
    try {
      const updated = await firstValueFrom(
        this.http.patch<LocationGroup>(
          `${this.apiUrl}/restaurant-groups/${this.groupId}/location-groups/${id}`,
          data
        )
      );
      this._groups.update(list => list.map(g => g.id === id ? updated : g));
    } catch {
      this._error.set('Failed to update group');
    }
  }

  async deleteGroup(id: string): Promise<void> {
    if (!this.groupId) return;
    this._error.set(null);
    try {
      await firstValueFrom(
        this.http.delete(
          `${this.apiUrl}/restaurant-groups/${this.groupId}/location-groups/${id}`
        )
      );
      this._groups.update(list => list.filter(g => g.id !== id));
    } catch {
      this._error.set('Failed to delete group');
    }
  }

  async loadGroupMembers(groupId: string): Promise<void> {
    if (!this.groupId) return;
    this._error.set(null);
    try {
      const members = await firstValueFrom(
        this.http.get<LocationGroupMember[]>(
          `${this.apiUrl}/restaurant-groups/${this.groupId}/location-groups/${groupId}/members`
        )
      );
      this._groupMembers.update(map => {
        const updated = new Map(map);
        updated.set(groupId, members);
        return updated;
      });
    } catch {
      this._error.set('Failed to load group members');
    }
  }

  async addMember(groupId: string, restaurantId: string): Promise<void> {
    if (!this.groupId) return;
    this._error.set(null);
    try {
      const member = await firstValueFrom(
        this.http.post<LocationGroupMember>(
          `${this.apiUrl}/restaurant-groups/${this.groupId}/location-groups/${groupId}/members`,
          { restaurantId }
        )
      );
      this._groupMembers.update(map => {
        const updated = new Map(map);
        const existing = updated.get(groupId) ?? [];
        updated.set(groupId, [...existing, member]);
        return updated;
      });
    } catch {
      this._error.set('Failed to add member');
    }
  }

  async removeMember(groupId: string, memberId: string): Promise<void> {
    if (!this.groupId) return;
    this._error.set(null);
    try {
      await firstValueFrom(
        this.http.delete(
          `${this.apiUrl}/restaurant-groups/${this.groupId}/location-groups/${groupId}/members/${memberId}`
        )
      );
      this._groupMembers.update(map => {
        const updated = new Map(map);
        const existing = updated.get(groupId) ?? [];
        updated.set(groupId, existing.filter(m => m.id !== memberId));
        return updated;
      });
    } catch {
      this._error.set('Failed to remove member');
    }
  }

  // ── Cross-Location Analytics ──

  async loadCrossLocationReport(days: number = 30): Promise<void> {
    if (!this.groupId) return;
    this._isLoading.set(true);
    this._error.set(null);
    try {
      const report = await firstValueFrom(
        this.http.get<CrossLocationReport>(
          `${this.apiUrl}/restaurant-groups/${this.groupId}/cross-location-report`,
          { params: { days: days.toString() } }
        )
      );
      this._crossLocationReport.set(report);
    } catch {
      this._error.set('Failed to load cross-location report');
    } finally {
      this._isLoading.set(false);
    }
  }

  // ── Menu Sync ──

  async previewMenuSync(sourceRestaurantId: string, targetRestaurantIds: string[]): Promise<void> {
    if (!this.groupId) return;
    this._isSyncing.set(true);
    this._error.set(null);
    try {
      const preview = await firstValueFrom(
        this.http.post<MenuSyncPreview>(
          `${this.apiUrl}/restaurant-groups/${this.groupId}/sync-menu/preview`,
          { sourceRestaurantId, targetRestaurantIds }
        )
      );
      this._syncPreview.set(preview);
    } catch {
      this._error.set('Failed to generate sync preview');
    } finally {
      this._isSyncing.set(false);
    }
  }

  async executeMenuSync(sourceRestaurantId: string, targetRestaurantIds: string[]): Promise<MenuSyncResult | null> {
    if (!this.groupId) return null;
    this._isSyncing.set(true);
    this._error.set(null);
    try {
      const result = await firstValueFrom(
        this.http.post<MenuSyncResult>(
          `${this.apiUrl}/restaurant-groups/${this.groupId}/sync-menu`,
          { sourceRestaurantId, targetRestaurantIds }
        )
      );
      this._syncHistory.update(list => [result, ...list]);
      this._syncPreview.set(null);
      return result;
    } catch {
      this._error.set('Failed to sync menu');
      return null;
    } finally {
      this._isSyncing.set(false);
    }
  }

  async loadSyncHistory(): Promise<void> {
    if (!this.groupId) return;
    this._error.set(null);
    try {
      const history = await firstValueFrom(
        this.http.get<MenuSyncHistory>(
          `${this.apiUrl}/restaurant-groups/${this.groupId}/sync-menu/history`
        )
      );
      this._syncHistory.set(history.syncs);
    } catch {
      this._error.set('Failed to load sync history');
    }
  }

  clearSyncPreview(): void {
    this._syncPreview.set(null);
  }

  // ── Settings Propagation ──

  async propagateSettings(data: SettingsPropagation): Promise<void> {
    if (!this.groupId) return;
    this._isPropagating.set(true);
    this._error.set(null);
    try {
      await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/restaurant-groups/${this.groupId}/propagate-settings`,
          data
        )
      );
    } catch {
      this._error.set('Failed to propagate settings');
    } finally {
      this._isPropagating.set(false);
    }
  }

  clearError(): void {
    this._error.set(null);
  }
}
