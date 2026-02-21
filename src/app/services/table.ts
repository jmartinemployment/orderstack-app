import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { RestaurantTable, TableFormData } from '../models';
import { AuthService } from './auth';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root',
})
export class TableService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  private readonly _tables = signal<RestaurantTable[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly tables = this._tables.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  private get restaurantId(): string {
    return this.authService.selectedRestaurantId() ?? '';
  }

  async loadTables(): Promise<void> {
    if (!this.restaurantId) return;
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const tables = await firstValueFrom(
        this.http.get<RestaurantTable[]>(`${this.apiUrl}/restaurant/${this.restaurantId}/tables`)
      );
      this._tables.set(tables);
    } catch {
      this._error.set('Failed to load tables');
    } finally {
      this._isLoading.set(false);
    }
  }

  async createTable(data: TableFormData): Promise<RestaurantTable | null> {
    if (!this.restaurantId) return null;
    this._error.set(null);

    try {
      const table = await firstValueFrom(
        this.http.post<RestaurantTable>(`${this.apiUrl}/restaurant/${this.restaurantId}/tables`, data)
      );
      this._tables.update(tables => [...tables, table]);
      return table;
    } catch {
      this._error.set('Failed to create table');
      return null;
    }
  }

  async updateTable(tableId: string, data: Partial<RestaurantTable>): Promise<RestaurantTable | null> {
    if (!this.restaurantId) return null;
    this._error.set(null);

    try {
      const updated = await firstValueFrom(
        this.http.patch<RestaurantTable>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/tables/${tableId}`,
          data
        )
      );
      this._tables.update(tables =>
        tables.map(t => t.id === tableId ? updated : t)
      );
      return updated;
    } catch {
      this._error.set('Failed to update table');
      return null;
    }
  }

  async updatePosition(tableId: string, posX: number, posY: number): Promise<void> {
    const result = await this.updateTable(tableId, { posX, posY });
    if (!result) {
      this._error.set('Failed to save table position');
    }
  }

  async updateStatus(tableId: string, status: string): Promise<void> {
    await this.updateTable(tableId, { status });
  }

  async deleteTable(tableId: string): Promise<boolean> {
    if (!this.restaurantId) return false;
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.delete(`${this.apiUrl}/restaurant/${this.restaurantId}/tables/${tableId}`)
      );
      this._tables.update(tables => tables.filter(t => t.id !== tableId));
      return true;
    } catch {
      this._error.set('Failed to delete table');
      return false;
    }
  }
}
