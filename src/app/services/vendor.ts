import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  Vendor,
  VendorFormData,
  PurchaseInvoice,
  PurchaseInvoiceFormData,
  PurchaseInvoiceStatus,
  IngredientPriceHistory,
} from '../models';
import { AuthService } from './auth';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root',
})
export class VendorService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  private readonly _vendors = signal<Vendor[]>([]);
  private readonly _invoices = signal<PurchaseInvoice[]>([]);
  private readonly _priceHistory = signal<IngredientPriceHistory[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _isUploading = signal(false);

  readonly vendors = this._vendors.asReadonly();
  readonly invoices = this._invoices.asReadonly();
  readonly priceHistory = this._priceHistory.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly isUploading = this._isUploading.asReadonly();

  readonly activeVendors = computed(() =>
    this._vendors().filter(v => v.isActive)
  );

  readonly invoicesByStatus = computed(() => {
    const map = new Map<PurchaseInvoiceStatus, PurchaseInvoice[]>();
    for (const inv of this._invoices()) {
      const list = map.get(inv.status) ?? [];
      list.push(inv);
      map.set(inv.status, list);
    }
    return map;
  });

  readonly pendingInvoiceCount = computed(() =>
    this._invoices().filter(i => i.status === 'pending_review').length
  );

  private get restaurantId(): string | null {
    return this.authService.selectedRestaurantId();
  }

  async loadVendors(): Promise<void> {
    if (!this.restaurantId) return;
    this._isLoading.set(true);
    this._error.set(null);
    try {
      const vendors = await firstValueFrom(
        this.http.get<Vendor[]>(`${this.apiUrl}/restaurant/${this.restaurantId}/vendors`)
      );
      this._vendors.set(vendors);
    } catch {
      this._error.set('Failed to load vendors');
    } finally {
      this._isLoading.set(false);
    }
  }

  async createVendor(data: VendorFormData): Promise<Vendor | null> {
    if (!this.restaurantId) return null;
    this._error.set(null);
    try {
      const vendor = await firstValueFrom(
        this.http.post<Vendor>(`${this.apiUrl}/restaurant/${this.restaurantId}/vendors`, data)
      );
      this._vendors.update(list => [...list, vendor]);
      return vendor;
    } catch {
      this._error.set('Failed to create vendor');
      return null;
    }
  }

  async updateVendor(id: string, data: Partial<VendorFormData> & { isActive?: boolean }): Promise<void> {
    if (!this.restaurantId) return;
    this._error.set(null);
    try {
      const updated = await firstValueFrom(
        this.http.patch<Vendor>(`${this.apiUrl}/restaurant/${this.restaurantId}/vendors/${id}`, data)
      );
      this._vendors.update(list => list.map(v => v.id === id ? updated : v));
    } catch {
      this._error.set('Failed to update vendor');
    }
  }

  async deleteVendor(id: string): Promise<void> {
    if (!this.restaurantId) return;
    this._error.set(null);
    try {
      await firstValueFrom(
        this.http.delete(`${this.apiUrl}/restaurant/${this.restaurantId}/vendors/${id}`)
      );
      this._vendors.update(list => list.filter(v => v.id !== id));
    } catch {
      this._error.set('Failed to delete vendor');
    }
  }

  async loadInvoices(): Promise<void> {
    if (!this.restaurantId) return;
    this._isLoading.set(true);
    this._error.set(null);
    try {
      const invoices = await firstValueFrom(
        this.http.get<PurchaseInvoice[]>(`${this.apiUrl}/restaurant/${this.restaurantId}/purchase-invoices`)
      );
      this._invoices.set(invoices);
    } catch {
      this._error.set('Failed to load invoices');
    } finally {
      this._isLoading.set(false);
    }
  }

  async uploadInvoice(file: File): Promise<PurchaseInvoice | null> {
    if (!this.restaurantId) return null;
    this._isUploading.set(true);
    this._error.set(null);
    try {
      const formData = new FormData();
      formData.append('invoice', file);
      const invoice = await firstValueFrom(
        this.http.post<PurchaseInvoice>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/purchase-invoices/upload`,
          formData
        )
      );
      this._invoices.update(list => [invoice, ...list]);
      return invoice;
    } catch {
      this._error.set('Failed to upload invoice');
      return null;
    } finally {
      this._isUploading.set(false);
    }
  }

  async createInvoice(data: PurchaseInvoiceFormData): Promise<PurchaseInvoice | null> {
    if (!this.restaurantId) return null;
    this._error.set(null);
    try {
      const invoice = await firstValueFrom(
        this.http.post<PurchaseInvoice>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/purchase-invoices`,
          data
        )
      );
      this._invoices.update(list => [invoice, ...list]);
      return invoice;
    } catch {
      this._error.set('Failed to create invoice');
      return null;
    }
  }

  async approveInvoice(id: string): Promise<void> {
    if (!this.restaurantId) return;
    this._error.set(null);
    try {
      const updated = await firstValueFrom(
        this.http.patch<PurchaseInvoice>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/purchase-invoices/${id}/approve`,
          {}
        )
      );
      this._invoices.update(list => list.map(i => i.id === id ? updated : i));
    } catch {
      this._error.set('Failed to approve invoice');
    }
  }

  async markInvoicePaid(id: string): Promise<void> {
    if (!this.restaurantId) return;
    this._error.set(null);
    try {
      const updated = await firstValueFrom(
        this.http.patch<PurchaseInvoice>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/purchase-invoices/${id}/paid`,
          {}
        )
      );
      this._invoices.update(list => list.map(i => i.id === id ? updated : i));
    } catch {
      this._error.set('Failed to mark invoice as paid');
    }
  }

  async deleteInvoice(id: string): Promise<void> {
    if (!this.restaurantId) return;
    this._error.set(null);
    try {
      await firstValueFrom(
        this.http.delete(`${this.apiUrl}/restaurant/${this.restaurantId}/purchase-invoices/${id}`)
      );
      this._invoices.update(list => list.filter(i => i.id !== id));
    } catch {
      this._error.set('Failed to delete invoice');
    }
  }

  async loadPriceHistory(ingredientName?: string): Promise<void> {
    if (!this.restaurantId) return;
    this._error.set(null);
    try {
      const params: Record<string, string> = {};
      if (ingredientName) params['ingredient'] = ingredientName;
      const history = await firstValueFrom(
        this.http.get<IngredientPriceHistory[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/purchase-invoices/price-history`,
          { params }
        )
      );
      this._priceHistory.set(history);
    } catch {
      this._error.set('Failed to load price history');
    }
  }

  clearError(): void {
    this._error.set(null);
  }
}
