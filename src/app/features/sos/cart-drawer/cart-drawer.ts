import { Component, inject, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CartService } from '@services/cart';
import { AuthService } from '@services/auth';
import { SocketService } from '@services/socket';
import { environment } from '@environments/environment';

@Component({
  selector: 'os-cart-drawer',
  templateUrl: './cart-drawer.html',
  styleUrl: './cart-drawer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartDrawer {
  private readonly http = inject(HttpClient);
  private readonly cartService = inject(CartService);
  private readonly authService = inject(AuthService);
  private readonly socketService = inject(SocketService);
  private readonly apiUrl = environment.apiUrl;

  orderPlaced = output<string>();

  private readonly _tableNumber = signal('');
  private readonly _isSubmitting = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly tableNumber = this._tableNumber.asReadonly();
  readonly isSubmitting = this._isSubmitting.asReadonly();
  readonly error = this._error.asReadonly();

  readonly isOpen = this.cartService.isOpen;
  readonly items = this.cartService.items;
  readonly isEmpty = this.cartService.isEmpty;
  readonly itemCount = this.cartService.itemCount;

  close(): void {
    this.cartService.close();
  }

  incrementQuantity(itemId: string): void {
    this.cartService.incrementQuantity(itemId);
  }

  decrementQuantity(itemId: string): void {
    this.cartService.decrementQuantity(itemId);
  }

  removeItem(itemId: string): void {
    this.cartService.removeItem(itemId);
  }

  clearCart(): void {
    this.cartService.clear();
  }

  onTableNumberInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this._tableNumber.set(value);
    this._error.set(null);
  }

  async submitOrder(): Promise<void> {
    if (this._isSubmitting()) return;

    if (!this._tableNumber().trim()) {
      this._error.set('Please enter a table number');
      return;
    }

    this._isSubmitting.set(true);
    this._error.set(null);

    try {
      const restaurantId = this.authService.selectedRestaurantId();

      const orderData = {
        orderType: 'dine-in',
        orderSource: 'pos',
        sourceDeviceId: this.socketService.deviceId(),
        tableNumber: this._tableNumber().trim(),
        items: this.items().map(item => ({
          menuItemId: item.menuItem.id,
          quantity: item.quantity,
          specialInstructions: item.specialInstructions,
          modifiers: item.selectedModifiers.map(m => ({ modifierId: m.id })),
        })),
      };

      const response = await firstValueFrom(
        this.http.post<any>(`${this.apiUrl}/restaurant/${restaurantId}/orders`, orderData)
      );

      if (response) {
        this._tableNumber.set('');
        this.cartService.clear();
        this.orderPlaced.emit(response.orderNumber || response.id);
      } else {
        this._error.set('Failed to place order. Please try again.');
      }
    } catch (err: any) {
      this._error.set(err?.error?.error || 'An error occurred. Please try again.');
    } finally {
      this._isSubmitting.set(false);
    }
  }
}
