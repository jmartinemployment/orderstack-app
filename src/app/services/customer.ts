import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Customer, CustomerSegment, CustomerSegmentInfo, SavedAddress, SavedAddressFormData } from '../models';
import { AuthService } from './auth';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root',
})
export class CustomerService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  private readonly _customers = signal<Customer[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _savedAddresses = signal<SavedAddress[]>([]);

  readonly customers = this._customers.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly savedAddresses = this._savedAddresses.asReadonly();

  readonly customerCount = computed(() => this._customers().length);

  readonly defaultAddress = computed(() =>
    this._savedAddresses().find(a => a.isDefault) ?? null
  );

  private get restaurantId(): string | null {
    return this.authService.selectedRestaurantId();
  }

  async loadCustomers(): Promise<void> {
    if (!this.restaurantId) return;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const data = await firstValueFrom(
        this.http.get<Customer[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/customers`
        )
      );
      this._customers.set(data ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load customers';
      this._error.set(message);
    } finally {
      this._isLoading.set(false);
    }
  }

  async searchCustomers(query: string): Promise<void> {
    if (!this.restaurantId) return;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const data = await firstValueFrom(
        this.http.get<Customer[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/customers?search=${encodeURIComponent(query)}`
        )
      );
      this._customers.set(data ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to search customers';
      this._error.set(message);
    } finally {
      this._isLoading.set(false);
    }
  }

  async updateTags(customerId: string, tags: string[]): Promise<boolean> {
    if (!this.restaurantId) return false;

    try {
      await firstValueFrom(
        this.http.patch(
          `${this.apiUrl}/restaurant/${this.restaurantId}/customers/${customerId}`,
          { tags }
        )
      );
      this._customers.update(customers =>
        customers.map(c => c.id === customerId ? { ...c, tags } : c)
      );
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update tags';
      this._error.set(message);
      return false;
    }
  }

  // --- Saved Addresses ---

  async loadSavedAddresses(customerId: string): Promise<void> {
    if (!this.restaurantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<SavedAddress[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/customers/${customerId}/addresses`
        )
      );
      this._savedAddresses.set(data ?? []);
    } catch {
      this._savedAddresses.set([]);
    }
  }

  async saveAddress(customerId: string, data: SavedAddressFormData): Promise<SavedAddress | null> {
    if (!this.restaurantId) return null;

    try {
      const address = await firstValueFrom(
        this.http.post<SavedAddress>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/customers/${customerId}/addresses`,
          data
        )
      );
      this._savedAddresses.update(list => [...list, address]);
      return address;
    } catch {
      return null;
    }
  }

  async deleteAddress(customerId: string, addressId: string): Promise<void> {
    if (!this.restaurantId) return;

    try {
      await firstValueFrom(
        this.http.delete(
          `${this.apiUrl}/restaurant/${this.restaurantId}/customers/${customerId}/addresses/${addressId}`
        )
      );
      this._savedAddresses.update(list => list.filter(a => a.id !== addressId));
    } catch {
      // Keep existing state
    }
  }

  clearSavedAddresses(): void {
    this._savedAddresses.set([]);
  }

  getSegment(customer: Customer): CustomerSegmentInfo {
    const daysSinceOrder = customer.lastOrderDate
      ? Math.floor((Date.now() - new Date(customer.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    if (customer.totalSpent >= 500 || customer.totalOrders >= 20) {
      return { segment: 'vip', label: 'VIP', cssClass: 'segment-vip', description: 'High-value customer' };
    }
    if (daysSinceOrder > 90) {
      return { segment: 'dormant', label: 'Dormant', cssClass: 'segment-dormant', description: 'No orders in 90+ days' };
    }
    if (daysSinceOrder > 30 && customer.totalOrders >= 3) {
      return { segment: 'at-risk', label: 'At Risk', cssClass: 'segment-at-risk', description: 'Previously active, fading' };
    }
    if (customer.totalOrders <= 2) {
      return { segment: 'new', label: 'New', cssClass: 'segment-new', description: 'Recent first-time customer' };
    }
    return { segment: 'regular', label: 'Regular', cssClass: 'segment-regular', description: 'Active customer' };
  }

  clearError(): void {
    this._error.set(null);
  }
}
