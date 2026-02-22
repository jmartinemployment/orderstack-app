import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  effect,
  input,
  OnDestroy,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { MenuService } from '@services/menu';
import { CartService } from '@services/cart';
import { OrderService } from '@services/order';
import { AuthService } from '@services/auth';
import { AnalyticsService } from '@services/analytics';
import { RestaurantSettingsService } from '@services/restaurant-settings';
import { LoadingSpinner } from '@shared/loading-spinner/loading-spinner';
import { MenuItem, getOrderIdentifier, Allergen, isItemAvailable, getItemAvailabilityLabel, getAllergenLabel, AllergenType } from '@models/index';

type KioskStep = 'welcome' | 'menu' | 'upsell' | 'checkout' | 'confirm';

@Component({
  selector: 'os-kiosk',
  imports: [CurrencyPipe, LoadingSpinner],
  templateUrl: './kiosk-terminal.html',
  styleUrl: './kiosk-terminal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KioskTerminal implements OnDestroy {
  private readonly menuService = inject(MenuService);
  private readonly cartService = inject(CartService);
  private readonly orderService = inject(OrderService);
  private readonly authService = inject(AuthService);
  private readonly analyticsService = inject(AnalyticsService);
  private readonly settingsService = inject(RestaurantSettingsService);

  readonly restaurantSlug = input<string>('');

  private readonly _step = signal<KioskStep>('welcome');
  private readonly _selectedCategory = signal<string | null>(null);
  private readonly _isSubmitting = signal(false);
  private readonly _orderNumber = signal('');
  private readonly _error = signal<string | null>(null);
  private _resetTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly _resetCountdown = signal(60);
  private _countdownInterval: ReturnType<typeof setInterval> | null = null;

  readonly step = this._step.asReadonly();
  readonly selectedCategory = this._selectedCategory.asReadonly();
  readonly isSubmitting = this._isSubmitting.asReadonly();
  readonly orderNumber = this._orderNumber.asReadonly();
  readonly error = this._error.asReadonly();
  readonly resetCountdown = this._resetCountdown.asReadonly();

  readonly categories = this.menuService.categories;
  readonly isLoading = this.menuService.isLoading;
  readonly cartItems = this.cartService.items;
  readonly cartTotal = this.cartService.total;
  readonly cartSubtotal = this.cartService.subtotal;
  readonly cartTax = this.cartService.tax;
  readonly cartItemCount = this.cartService.itemCount;

  readonly filteredItems = computed(() => {
    let items = this.menuService.allItems().filter(i => i.isActive !== false && !i.eightySixed);
    const catId = this._selectedCategory();
    if (catId) {
      items = items.filter(i => i.categoryId === catId);
    }
    return items;
  });

  readonly upsellItems = computed(() => {
    const suggestions = this.analyticsService.upsellSuggestions();
    if (suggestions.length > 0) {
      return suggestions.slice(0, 4).map(s => s.item).filter((i): i is MenuItem => !!i);
    }
    // Fallback: show popular items not already in cart
    const cartIds = new Set(this.cartItems().map(c => c.menuItem.id));
    return this.menuService.allItems()
      .filter(i => i.isActive !== false && !i.eightySixed && !cartIds.has(i.id))
      .slice(0, 4);
  });

  readonly restaurantName = this.authService.selectedRestaurantName;

  constructor() {
    effect(() => {
      const slug = this.restaurantSlug();
      const authId = this.authService.selectedRestaurantId();

      if (slug) {
        void this.resolveSlug(slug);
      } else if (authId) {
        this.menuService.loadMenuForRestaurant(authId);
        void this.settingsService.loadSettings();
      }
    });
  }

  private async resolveSlug(slug: string): Promise<void> {
    const restaurant = await this.authService.resolveRestaurantBySlug(slug);
    if (restaurant) {
      this.authService.selectRestaurant(restaurant.id, restaurant.name, restaurant.logo);
      if (restaurant.taxRate > 0) {
        this.cartService.setTaxRate(restaurant.taxRate);
      }
      this.menuService.loadMenuForRestaurant(restaurant.id);
      await this.settingsService.loadSettings();
    }
  }

  startOrder(): void {
    this._step.set('menu');
    this._selectedCategory.set(null);
    this.cartService.clear();
    this.cartService.setOrderType('dine-in');
  }

  selectCategory(categoryId: string | null): void {
    this._selectedCategory.set(categoryId);
  }

  addToCart(item: MenuItem): void {
    this.cartService.addItem(item);
  }

  getItemQuantity(menuItemId: string): number {
    return this.cartItems().find(i => i.menuItem.id === menuItemId)?.quantity ?? 0;
  }

  incrementItem(menuItemId: string): void {
    const cartItem = this.cartItems().find(i => i.menuItem.id === menuItemId);
    if (cartItem) {
      this.cartService.incrementQuantity(cartItem.id);
    }
  }

  decrementItem(menuItemId: string): void {
    const item = this.cartItems().find(i => i.menuItem.id === menuItemId);
    if (item) {
      if (item.quantity <= 1) {
        this.cartService.removeItem(item.id);
      } else {
        this.cartService.decrementQuantity(item.id);
      }
    }
  }

  removeFromCart(cartItemId: string): void {
    this.cartService.removeItem(cartItemId);
  }

  goToUpsell(): void {
    this._step.set('upsell');
  }

  skipUpsell(): void {
    this._step.set('checkout');
  }

  addUpsellItem(item: MenuItem): void {
    this.cartService.addItem(item);
  }

  goToCheckout(): void {
    this._step.set('checkout');
  }

  backToMenu(): void {
    this._step.set('menu');
  }

  async submitOrder(): Promise<void> {
    if (this.cartItemCount() === 0 || this._isSubmitting()) return;

    this._isSubmitting.set(true);
    this._error.set(null);

    try {
      const orderData: Record<string, unknown> = {
        orderType: 'dine-in',
        orderSource: 'kiosk',
        items: this.cartItems().map(item => ({
          menuItemId: item.menuItem.id,
          name: item.menuItem.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          modifiers: item.selectedModifiers.map(m => ({
            id: m.id,
            name: m.name,
            priceAdjustment: m.priceAdjustment,
          })),
        })),
        subtotal: this.cartSubtotal(),
        tax: this.cartTax(),
        tip: 0,
        total: this.cartTotal(),
      };

      const order = await this.orderService.createOrder(orderData as Partial<any>);
      if (order) {
        this._orderNumber.set(getOrderIdentifier(order));
        this._step.set('confirm');
        this.cartService.clear();
        this.startResetTimer();
      } else {
        this._error.set(this.orderService.error() ?? 'Failed to place order');
      }
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      this._isSubmitting.set(false);
    }
  }

  resetKiosk(): void {
    this.stopResetTimer();
    this._step.set('welcome');
    this._orderNumber.set('');
    this._error.set(null);
    this._selectedCategory.set(null);
    this.cartService.clear();
  }

  ngOnDestroy(): void {
    this.stopResetTimer();
  }

  getCategoryName(categoryId: string): string {
    return this.categories().find(c => c.id === categoryId)?.name ?? '';
  }

  getItemAllergens(item: MenuItem): Allergen[] {
    return item.allergens ?? [];
  }

  getAllergenLabel(type: AllergenType): string {
    return getAllergenLabel(type);
  }

  isItemAvailable(item: MenuItem): boolean {
    return isItemAvailable(item);
  }

  getAvailabilityLabel(item: MenuItem): string {
    return getItemAvailabilityLabel(item);
  }

  private startResetTimer(): void {
    this.stopResetTimer();
    this._resetCountdown.set(60);

    this._countdownInterval = setInterval(() => {
      this._resetCountdown.update(c => c - 1);
      if (this._resetCountdown() <= 0) {
        this.resetKiosk();
      }
    }, 1000);
  }

  private stopResetTimer(): void {
    if (this._countdownInterval) {
      clearInterval(this._countdownInterval);
      this._countdownInterval = null;
    }
    if (this._resetTimer) {
      clearTimeout(this._resetTimer);
      this._resetTimer = null;
    }
  }
}
