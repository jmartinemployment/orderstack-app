import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  InventoryItem,
  InventoryAlert,
  StockPrediction,
  InventoryReport,
} from '../models';
import { AuthService } from './auth';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root',
})
export class InventoryService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  private readonly _report = signal<InventoryReport | null>(null);
  private readonly _items = signal<InventoryItem[]>([]);
  private readonly _alerts = signal<InventoryAlert[]>([]);
  private readonly _predictions = signal<StockPrediction[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly report = this._report.asReadonly();
  readonly items = this._items.asReadonly();
  readonly alerts = this._alerts.asReadonly();
  readonly predictions = this._predictions.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  private get restaurantId(): string | null {
    return this.authService.selectedRestaurantId();
  }

  async loadReport(): Promise<void> {
    if (!this.restaurantId) return;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const data = await firstValueFrom(
        this.http.get<InventoryReport>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/inventory/report`
        )
      );
      this._report.set(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load inventory report';
      this._error.set(message);
    } finally {
      this._isLoading.set(false);
    }
  }

  async loadItems(): Promise<void> {
    if (!this.restaurantId) return;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const data = await firstValueFrom(
        this.http.get<InventoryItem[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/inventory`
        )
      );
      this._items.set(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load inventory items';
      this._error.set(message);
    } finally {
      this._isLoading.set(false);
    }
  }

  async loadAlerts(): Promise<void> {
    if (!this.restaurantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<InventoryAlert[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/inventory/alerts`
        )
      );
      this._alerts.set(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load alerts';
      this._error.set(message);
    }
  }

  async loadPredictions(): Promise<void> {
    if (!this.restaurantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<StockPrediction[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/inventory/predictions`
        )
      );
      this._predictions.set(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load predictions';
      this._error.set(message);
    }
  }

  async createItem(data: Partial<InventoryItem>): Promise<InventoryItem | null> {
    if (!this.restaurantId) return null;

    try {
      const item = await firstValueFrom(
        this.http.post<InventoryItem>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/inventory`,
          data
        )
      );
      this._items.update(items => [...items, item]);
      return item;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create item';
      this._error.set(message);
      return null;
    }
  }

  async updateStock(itemId: string, stock: number, reason: string): Promise<boolean> {
    if (!this.restaurantId) return false;

    try {
      await firstValueFrom(
        this.http.patch(
          `${this.apiUrl}/restaurant/${this.restaurantId}/inventory/${itemId}/stock`,
          { currentStock: stock, reason }
        )
      );
      this._items.update(items =>
        items.map(item => item.id === itemId ? { ...item, currentStock: stock } : item)
      );
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update stock';
      this._error.set(message);
      return false;
    }
  }

  async recordUsage(itemId: string, quantity: number, reason: string): Promise<boolean> {
    if (!this.restaurantId) return false;

    try {
      await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/restaurant/${this.restaurantId}/inventory/${itemId}/usage`,
          { quantity, reason }
        )
      );
      this._items.update(items =>
        items.map(item => item.id === itemId
          ? { ...item, currentStock: Math.max(0, item.currentStock - quantity) }
          : item
        )
      );
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to record usage';
      this._error.set(message);
      return false;
    }
  }

  async recordRestock(itemId: string, quantity: number, invoiceNumber?: string): Promise<boolean> {
    if (!this.restaurantId) return false;

    try {
      await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/restaurant/${this.restaurantId}/inventory/${itemId}/restock`,
          { quantity, invoiceNumber }
        )
      );
      this._items.update(items =>
        items.map(item => item.id === itemId
          ? { ...item, currentStock: item.currentStock + quantity, lastRestocked: new Date().toISOString() }
          : item
        )
      );
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to record restock';
      this._error.set(message);
      return false;
    }
  }

  async predictItem(itemId: string): Promise<StockPrediction | null> {
    if (!this.restaurantId) return null;

    try {
      const prediction = await firstValueFrom(
        this.http.get<StockPrediction>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/inventory/${itemId}/predict`
        )
      );
      this._predictions.update(preds => {
        const existing = preds.findIndex(p => p.inventoryItemId === itemId);
        if (existing >= 0) {
          const updated = [...preds];
          updated[existing] = prediction;
          return updated;
        }
        return [...preds, prediction];
      });
      return prediction;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to predict stock';
      this._error.set(message);
      return null;
    }
  }

  async refresh(): Promise<void> {
    if (!this.restaurantId) return;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      await Promise.all([
        this.loadReport(),
        this.loadItems(),
        this.loadAlerts(),
        this.loadPredictions(),
      ]);
    } finally {
      this._isLoading.set(false);
    }
  }

  clearError(): void {
    this._error.set(null);
  }
}
