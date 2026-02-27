import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  signal,
  computed,
  effect,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MenuService } from '@services/menu';
import { OrderService } from '@services/order';
import { RestaurantSettingsService } from '@services/restaurant-settings';
import { TableService } from '@services/table';
import { LoyaltyService } from '@services/loyalty';
import { PaymentTerminal } from '@shared/payment-terminal/payment-terminal';
import {
  MenuCategory,
  MenuItem,
  RestaurantTable,
  isItemAvailable,
} from '@models/index';

type TopTab = 'keypad' | 'library' | 'favorites' | 'menu';
type BottomTab = 'checkout' | 'transactions' | 'notifications' | 'more';
type DiningOption = 'dine_in' | 'takeout';
type CheckoutStep = 'idle' | 'dining-option' | 'table-select' | 'customer-info' | 'payment' | 'loyalty-prompt' | 'success' | 'failed';

interface KioskCartItem {
  id: string;
  menuItem: MenuItem;
  quantity: number;
  modifierSummary: string;
  unitPrice: number;
  totalPrice: number;
}

interface CustomerInfo {
  name: string;
  phone: string;
  email: string;
}

@Component({
  selector: 'os-kiosk-terminal',
  imports: [CurrencyPipe, FormsModule, PaymentTerminal],
  templateUrl: './kiosk-terminal.html',
  styleUrl: './kiosk-terminal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KioskTerminal implements OnInit {
  private readonly menuService = inject(MenuService);
  private readonly orderService = inject(OrderService);
  private readonly settingsService = inject(RestaurantSettingsService);
  private readonly tableService = inject(TableService);
  private readonly loyaltyService = inject(LoyaltyService);

  // Top tab state — default to Favorites
  private readonly _activeTopTab = signal<TopTab>('favorites');
  readonly activeTopTab = this._activeTopTab.asReadonly();

  // Bottom nav state
  private readonly _activeBottomTab = signal<BottomTab>('checkout');
  readonly activeBottomTab = this._activeBottomTab.asReadonly();

  // Menu state
  private readonly _categories = signal<MenuCategory[]>([]);
  private readonly _selectedCategoryId = signal<string | null>(null);
  readonly categories = this._categories.asReadonly();
  readonly selectedCategoryId = this._selectedCategoryId.asReadonly();

  // Cart state
  private readonly _cartItems = signal<KioskCartItem[]>([]);
  readonly cartItems = this._cartItems.asReadonly();

  // Checkout flow state
  private readonly _checkoutStep = signal<CheckoutStep>('idle');
  private readonly _diningOption = signal<DiningOption | null>(null);
  private readonly _selectedTable = signal<RestaurantTable | null>(null);
  private readonly _createdOrderId = signal<string | null>(null);
  private readonly _checkoutError = signal<string | null>(null);
  private readonly _isCreatingOrder = signal(false);

  readonly checkoutStep = this._checkoutStep.asReadonly();
  readonly diningOption = this._diningOption.asReadonly();
  readonly selectedTable = this._selectedTable.asReadonly();
  readonly createdOrderId = this._createdOrderId.asReadonly();
  readonly checkoutError = this._checkoutError.asReadonly();
  readonly isCreatingOrder = this._isCreatingOrder.asReadonly();

  // Customer info state
  private readonly _customerName = signal('');
  private readonly _customerPhone = signal('');
  private readonly _customerEmail = signal('');

  readonly customerName = this._customerName.asReadonly();
  readonly customerPhone = this._customerPhone.asReadonly();
  readonly customerEmail = this._customerEmail.asReadonly();

  readonly hasCustomerContact = computed(() =>
    this._customerName().trim().length > 0 ||
    this._customerPhone().trim().length > 0 ||
    this._customerEmail().trim().length > 0
  );

  // Loyalty
  readonly loyaltyConfig = this.loyaltyService.config;
  readonly loyaltyEnabled = computed(() => this.loyaltyConfig().enabled);

  readonly showLoyaltyPrompt = computed(() =>
    this.loyaltyEnabled() && this.hasCustomerContact()
  );

  // Tables for table selection
  readonly tables = this.tableService.tables;
  readonly tablesLoading = this.tableService.isLoading;

  readonly availableTables = computed(() =>
    this.tableService.tables().filter(t => t.status === 'available')
  );

  // Payment settings — determines which payment methods to show
  readonly paymentSettings = this.settingsService.paymentSettings;
  readonly showOnScreenPayment = computed(() => {
    const p = this.paymentSettings().processor;
    return p === 'paypal' || p === 'stripe';
  });
  readonly showCardReader = computed(() => {
    const p = this.paymentSettings().processor;
    return p === 'zettle_reader' || p === 'stripe';
  });

  // Loading
  readonly isLoading = this.menuService.isLoading;
  readonly menuError = this.menuService.error;

  // Collect all items from a category tree (handles nested subcategories)
  private collectItems(cats: MenuCategory[]): MenuItem[] {
    const items: MenuItem[] = [];
    for (const cat of cats) {
      if (cat.items) items.push(...cat.items);
      if (cat.subcategories) items.push(...this.collectItems(cat.subcategories));
    }
    return items;
  }

  private kioskFilter(items: MenuItem[]): MenuItem[] {
    return items.filter(i =>
      i.isActive !== false &&
      !i.eightySixed &&
      i.channelVisibility?.kiosk !== false &&
      isItemAvailable(i) &&
      this.menuService.isItemInActiveDaypart(i)
    );
  }

  // All available kiosk items (used for Favorites fallback)
  private readonly allKioskItems = computed(() => {
    return this.kioskFilter(this.collectItems(this._categories()));
  });

  // Filtered items for the grid based on active top tab
  readonly gridItems = computed(() => {
    const tab = this._activeTopTab();
    const cats = this._categories();
    const allItems = this.allKioskItems();

    if (tab === 'favorites') {
      const popular = allItems.filter(i => i.popular || i.isPopular);
      // Fallback: if no items are marked popular, show all items
      return popular.length > 0 ? popular : allItems;
    }

    if (tab === 'menu') {
      const catId = this._selectedCategoryId();
      if (catId) {
        const cat = cats.find(c => c.id === catId);
        return cat ? this.kioskFilter(this.collectItems([cat])) : [];
      }
      return allItems;
    }

    if (tab === 'library') {
      return allItems;
    }

    // Keypad tab shows nothing (keypad input mode)
    return [];
  });

  // Cart computeds
  readonly cartCount = computed(() =>
    this._cartItems().reduce((sum, item) => sum + item.quantity, 0)
  );

  readonly subtotal = computed(() =>
    this._cartItems().reduce((sum, item) => sum + item.totalPrice, 0)
  );

  readonly taxRate = 0.087; // 8.7% — configurable later

  readonly tax = computed(() =>
    Math.round(this.subtotal() * this.taxRate * 100) / 100
  );

  readonly total = computed(() =>
    Math.round((this.subtotal() + this.tax()) * 100) / 100
  );

  // Keypad state
  private readonly _keypadValue = signal('');
  readonly keypadValue = this._keypadValue.asReadonly();

  // React to categories loading — field initializer keeps injection context
  private readonly _categoryEffect = effect(() => {
    const cats = this.menuService.categories();
    if (cats.length > 0) {
      this._categories.set(cats);
      if (!this._selectedCategoryId() && cats[0]) {
        this._selectedCategoryId.set(cats[0].id);
      }
    }
  });

  ngOnInit(): void {
    // Kiosk is always authenticated — use the selected restaurant
    this.menuService.loadMenu();

    // Load tables for dine-in selection
    this.tableService.loadTables();

    // Load restaurant settings for payment config
    this.settingsService.loadSettings();

    // Load loyalty config for rewards opt-in prompt
    this.loyaltyService.loadConfig();
  }

  // --- Tab navigation ---

  selectTopTab(tab: TopTab): void {
    this._activeTopTab.set(tab);
  }

  selectBottomTab(tab: BottomTab): void {
    this._activeBottomTab.set(tab);
  }

  selectCategory(categoryId: string): void {
    this._selectedCategoryId.set(categoryId);
  }

  // --- Cart operations ---

  addItem(item: MenuItem): void {
    const price = typeof item.price === 'string' ? Number.parseFloat(item.price) : item.price;
    const existing = this._cartItems().find(ci => ci.menuItem.id === item.id && !ci.modifierSummary);

    if (existing) {
      this._cartItems.update(items =>
        items.map(ci =>
          ci.id === existing.id
            ? { ...ci, quantity: ci.quantity + 1, totalPrice: (ci.quantity + 1) * ci.unitPrice }
            : ci
        )
      );
    } else {
      const cartItem: KioskCartItem = {
        id: crypto.randomUUID(),
        menuItem: item,
        quantity: 1,
        modifierSummary: '',
        unitPrice: price,
        totalPrice: price,
      };
      this._cartItems.update(items => [...items, cartItem]);
    }
  }

  removeItem(cartItemId: string): void {
    this._cartItems.update(items => items.filter(ci => ci.id !== cartItemId));
  }

  incrementItem(cartItemId: string): void {
    this._cartItems.update(items =>
      items.map(ci =>
        ci.id === cartItemId
          ? { ...ci, quantity: ci.quantity + 1, totalPrice: (ci.quantity + 1) * ci.unitPrice }
          : ci
      )
    );
  }

  decrementItem(cartItemId: string): void {
    this._cartItems.update(items =>
      items
        .map(ci =>
          ci.id === cartItemId
            ? { ...ci, quantity: ci.quantity - 1, totalPrice: (ci.quantity - 1) * ci.unitPrice }
            : ci
        )
        .filter(ci => ci.quantity > 0)
    );
  }

  clearCart(): void {
    this._cartItems.set([]);
  }

  // --- Keypad ---

  onKeypadPress(key: string): void {
    if (key === 'clear') {
      this._keypadValue.set('');
    } else if (key === 'backspace') {
      this._keypadValue.update(v => v.slice(0, -1));
    } else {
      this._keypadValue.update(v => v + key);
    }
  }

  // --- Checkout flow ---

  charge(): void {
    if (this._cartItems().length === 0) return;
    this._checkoutStep.set('dining-option');
    this._checkoutError.set(null);
  }

  selectDiningOption(option: DiningOption): void {
    this._diningOption.set(option);

    if (option === 'dine_in' && this.availableTables().length > 0) {
      this._checkoutStep.set('table-select');
    } else {
      this._checkoutStep.set('customer-info');
    }
  }

  selectTable(table: RestaurantTable): void {
    this._selectedTable.set(table);
    this._checkoutStep.set('customer-info');
  }

  skipTableSelection(): void {
    this._selectedTable.set(null);
    this._checkoutStep.set('customer-info');
  }

  // --- Customer info ---

  onCustomerNameChange(value: string): void {
    this._customerName.set(value);
  }

  onCustomerPhoneChange(value: string): void {
    this._customerPhone.set(value);
  }

  onCustomerEmailChange(value: string): void {
    this._customerEmail.set(value);
  }

  submitCustomerInfo(): void {
    void this.createOrderAndPay();
  }

  skipCustomerInfo(): void {
    this._customerName.set('');
    this._customerPhone.set('');
    this._customerEmail.set('');
    void this.createOrderAndPay();
  }

  private buildCustomerInfo(): CustomerInfo | undefined {
    const name = this._customerName().trim();
    const phone = this._customerPhone().trim();
    const email = this._customerEmail().trim();

    if (!name && !phone && !email) return undefined;
    return { name, phone, email };
  }

  private async createOrderAndPay(): Promise<void> {
    this._isCreatingOrder.set(true);
    this._checkoutError.set(null);

    const items = this._cartItems().map(ci => ({
      menuItemId: ci.menuItem.id,
      name: ci.menuItem.name,
      quantity: ci.quantity,
      unitPrice: ci.unitPrice,
      totalPrice: ci.totalPrice,
      modifiers: ci.modifierSummary || undefined,
    }));

    const table = this._selectedTable();
    const isDineIn = this._diningOption() === 'dine_in';
    const customerInfo = this.buildCustomerInfo();

    const orderData: Record<string, unknown> = {
      items,
      orderType: isDineIn ? 'dine-in' : 'takeout',
      orderSource: 'kiosk',
      ...(table ? { tableId: table.id, tableNumber: table.tableNumber } : {}),
      ...(customerInfo ? { customerInfo } : {}),
    };

    const order = await this.orderService.createOrder(orderData);

    this._isCreatingOrder.set(false);

    if (!order) {
      this._checkoutError.set(this.orderService.error() ?? 'Failed to create order');
      this._checkoutStep.set('failed');
      return;
    }

    this._createdOrderId.set(order.guid);
    this._checkoutStep.set('payment');
  }

  onPaymentComplete(): void {
    if (this.showLoyaltyPrompt()) {
      this._checkoutStep.set('loyalty-prompt');
    } else {
      this._checkoutStep.set('success');
    }
  }

  onPaymentFailed(errorMsg: string): void {
    this._checkoutError.set(errorMsg);
    this._checkoutStep.set('failed');
  }

  retryPayment(): void {
    this._checkoutError.set(null);
    this._checkoutStep.set('payment');
  }

  // --- Loyalty prompt ---

  joinLoyalty(): void {
    // Enroll customer in loyalty by awarding 0 points (creates profile on backend)
    const customerInfo = this.buildCustomerInfo();
    if (customerInfo) {
      // Backend auto-creates customer + loyalty profile on order creation when customerInfo is present.
      // The adjustPoints call with 0 points ensures the loyalty profile exists.
      const orderId = this._createdOrderId();
      if (orderId) {
        this.loyaltyService.adjustPoints(orderId, 0, 'Enrolled via kiosk').catch(() => {
          // Enrollment is best-effort — don't block the success screen
        });
      }
    }
    this._checkoutStep.set('success');
  }

  skipLoyalty(): void {
    this._checkoutStep.set('success');
  }

  resetCheckout(): void {
    this._checkoutStep.set('idle');
    this._diningOption.set(null);
    this._selectedTable.set(null);
    this._createdOrderId.set(null);
    this._checkoutError.set(null);
    this._isCreatingOrder.set(false);
    this._customerName.set('');
    this._customerPhone.set('');
    this._customerEmail.set('');
  }

  finishAndNewOrder(): void {
    this.clearCart();
    this.resetCheckout();
  }

  cancelCheckout(): void {
    this.resetCheckout();
  }

  // --- Helpers ---

  getItemImage(item: MenuItem): string | null {
    return item.imageUrl ?? item.thumbnailUrl ?? item.image ?? null;
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    const container = img.parentElement;
    if (container) {
      container.classList.add('item-image-placeholder');
    }
  }

  formatPrice(price: number | string): number {
    return typeof price === 'string' ? Number.parseFloat(price) : price;
  }
}
