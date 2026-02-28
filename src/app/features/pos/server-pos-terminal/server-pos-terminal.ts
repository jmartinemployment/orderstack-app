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
import { WeightScale, WeightScaleResult } from '@shared/weight-scale';
import {
  MenuCategory,
  MenuItem,
  RestaurantTable,
  WeightUnit,
  WEIGHT_UNIT_LABELS,
  isItemAvailable,
} from '@models/index';

type TopTab = 'keypad' | 'library' | 'favorites' | 'menu';
type BottomTab = 'checkout' | 'open-orders' | 'notifications' | 'more';
type DiningOption = 'dine_in' | 'takeout';
type SendStep = 'idle' | 'dining-option' | 'table-select' | 'sending' | 'success' | 'failed';

interface PosCartItem {
  id: string;
  menuItem: MenuItem;
  quantity: number;
  modifierSummary: string;
  unitPrice: number;
  totalPrice: number;
  weightUnit?: WeightUnit;
}

@Component({
  selector: 'os-pos-terminal',
  imports: [CurrencyPipe, FormsModule, WeightScale],
  templateUrl: './server-pos-terminal.html',
  styleUrl: './server-pos-terminal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServerPosTerminal implements OnInit {
  private readonly menuService = inject(MenuService);
  private readonly orderService = inject(OrderService);
  private readonly settingsService = inject(RestaurantSettingsService);
  private readonly tableService = inject(TableService);

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
  private readonly _cartItems = signal<PosCartItem[]>([]);
  readonly cartItems = this._cartItems.asReadonly();

  // Send-to-kitchen flow state
  private readonly _sendStep = signal<SendStep>('idle');
  private readonly _diningOption = signal<DiningOption | null>(null);
  private readonly _selectedTable = signal<RestaurantTable | null>(null);
  private readonly _sendError = signal<string | null>(null);
  private readonly _isSending = signal(false);

  readonly sendStep = this._sendStep.asReadonly();
  readonly diningOption = this._diningOption.asReadonly();
  readonly selectedTable = this._selectedTable.asReadonly();
  readonly sendError = this._sendError.asReadonly();
  readonly isSending = this._isSending.asReadonly();

  // Weight scale state
  private readonly _weightScaleItem = signal<MenuItem | null>(null);
  readonly weightScaleItem = this._weightScaleItem.asReadonly();
  readonly showWeightScale = computed(() => this._weightScaleItem() !== null);

  readonly weightScaleUnitPrice = computed(() => {
    const item = this._weightScaleItem();
    if (!item) return 0;
    return typeof item.price === 'string' ? Number.parseFloat(item.price) : item.price;
  });

  readonly weightScaleUnit = computed<WeightUnit>(() =>
    this._weightScaleItem()?.weightUnit ?? 'lb'
  );

  // Tables for table selection
  readonly tables = this.tableService.tables;
  readonly tablesLoading = this.tableService.isLoading;

  readonly availableTables = computed(() =>
    this.tableService.tables().filter(t => t.status === 'available')
  );

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

  private terminalFilter(items: MenuItem[]): MenuItem[] {
    return items.filter(i =>
      i.isActive !== false &&
      !i.eightySixed &&
      isItemAvailable(i) &&
      this.menuService.isItemInActiveDaypart(i)
    );
  }

  // All available items (used for Favorites fallback)
  private readonly allItems = computed(() => {
    return this.terminalFilter(this.collectItems(this._categories()));
  });

  // Filtered items for the grid based on active top tab
  readonly gridItems = computed(() => {
    const tab = this._activeTopTab();
    const cats = this._categories();
    const items = this.allItems();

    if (tab === 'favorites') {
      const popular = items.filter(i => i.popular || i.isPopular);
      return popular.length > 0 ? popular : items;
    }

    if (tab === 'menu') {
      const catId = this._selectedCategoryId();
      if (catId) {
        const cat = cats.find(c => c.id === catId);
        return cat ? this.terminalFilter(this.collectItems([cat])) : [];
      }
      return items;
    }

    if (tab === 'library') {
      return items;
    }

    // Keypad tab shows nothing (keypad input mode)
    return [];
  });

  // Cart computeds
  readonly cartCount = computed(() =>
    this._cartItems().reduce((sum, item) => sum + (item.weightUnit ? 1 : item.quantity), 0)
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

  // Helper for weight unit labels in template
  readonly weightUnitLabels = WEIGHT_UNIT_LABELS;

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
    this.menuService.loadMenu();
    this.tableService.loadTables();
    this.settingsService.loadSettings();
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
    if (item.soldByWeight) {
      this._weightScaleItem.set(item);
      return;
    }

    const price = typeof item.price === 'string' ? Number.parseFloat(item.price) : item.price;
    const existing = this._cartItems().find(ci => ci.menuItem.id === item.id && !ci.modifierSummary && !ci.weightUnit);

    if (existing) {
      this._cartItems.update(items =>
        items.map(ci =>
          ci.id === existing.id
            ? { ...ci, quantity: ci.quantity + 1, totalPrice: (ci.quantity + 1) * ci.unitPrice }
            : ci
        )
      );
    } else {
      const cartItem: PosCartItem = {
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

  onWeightConfirmed(result: WeightScaleResult): void {
    const item = this._weightScaleItem();
    if (!item) return;

    const cartItem: PosCartItem = {
      id: crypto.randomUUID(),
      menuItem: item,
      quantity: result.weight,
      modifierSummary: '',
      unitPrice: typeof item.price === 'string' ? Number.parseFloat(item.price) : item.price,
      totalPrice: result.totalPrice,
      weightUnit: result.unit,
    };
    this._cartItems.update(items => [...items, cartItem]);
    this._weightScaleItem.set(null);
  }

  closeWeightScale(): void {
    this._weightScaleItem.set(null);
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

  // --- Send to Kitchen flow ---

  sendToKitchen(): void {
    if (this._cartItems().length === 0) return;
    this._sendStep.set('dining-option');
    this._sendError.set(null);
  }

  selectDiningOption(option: DiningOption): void {
    this._diningOption.set(option);

    if (option === 'dine_in' && this.availableTables().length > 0) {
      this._sendStep.set('table-select');
    } else {
      void this.createOrder();
    }
  }

  selectTable(table: RestaurantTable): void {
    this._selectedTable.set(table);
    void this.createOrder();
  }

  skipTableSelection(): void {
    this._selectedTable.set(null);
    void this.createOrder();
  }

  private async createOrder(): Promise<void> {
    this._isSending.set(true);
    this._sendStep.set('sending');
    this._sendError.set(null);

    const items = this._cartItems().map(ci => ({
      menuItemId: ci.menuItem.id,
      name: ci.menuItem.name,
      quantity: ci.quantity,
      unitPrice: ci.unitPrice,
      totalPrice: ci.totalPrice,
      modifiers: ci.modifierSummary || undefined,
      ...(ci.weightUnit ? { weightUnit: ci.weightUnit } : {}),
    }));

    const table = this._selectedTable();
    const isDineIn = this._diningOption() === 'dine_in';

    const orderData: Record<string, unknown> = {
      items,
      orderType: isDineIn ? 'dine-in' : 'takeout',
      orderSource: 'terminal',
      ...(table ? { tableId: table.id, tableNumber: table.tableNumber } : {}),
    };

    const order = await this.orderService.createOrder(orderData);

    this._isSending.set(false);

    if (!order) {
      this._sendError.set(this.orderService.error() ?? 'Failed to create order');
      this._sendStep.set('failed');
      return;
    }

    this._sendStep.set('success');

    // Auto-dismiss success after 2 seconds
    setTimeout(() => this.finishAndNewOrder(), 2000);
  }

  finishAndNewOrder(): void {
    this.clearCart();
    this.resetSend();
  }

  cancelSend(): void {
    this.resetSend();
  }

  retrySend(): void {
    this._sendError.set(null);
    this._sendStep.set('dining-option');
  }

  private resetSend(): void {
    this._sendStep.set('idle');
    this._diningOption.set(null);
    this._selectedTable.set(null);
    this._sendError.set(null);
    this._isSending.set(false);
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
