import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { MenuService } from '@services/menu';
import { OrderService, MappedOrderEvent } from '@services/order';
import { TableService } from '@services/table';
import { AuthService } from '@services/auth';
import { CheckService } from '@services/check';
import { PlatformService } from '@services/platform';
import { ModifierPrompt, ModifierPromptResult } from '../modifier-prompt';
import {
  RestaurantTable,
  Order,
  Check,
  Selection,
  MenuItem,
  MenuCategory,
} from '@models/index';

@Component({
  selector: 'os-order-pad',
  imports: [CurrencyPipe, ModifierPrompt],
  templateUrl: './order-pad.html',
  styleUrl: './order-pad.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderPad implements OnInit, OnDestroy {
  private readonly menuService = inject(MenuService);
  private readonly orderService = inject(OrderService);
  private readonly tableService = inject(TableService);
  private readonly authService = inject(AuthService);
  private readonly checkService = inject(CheckService);
  private readonly platformService = inject(PlatformService);

  // Mode-aware feature flags
  readonly canUseFloorPlan = this.platformService.canUseFloorPlan;
  readonly canUseSeatAssignment = this.platformService.canUseSeatAssignment;
  readonly canUseOrderNumbers = this.platformService.canUseOrderNumbers;

  readonly tables = this.tableService.tables;
  readonly orders = this.orderService.orders;

  // Menu state
  private readonly _categories = signal<MenuCategory[]>([]);
  private readonly _selectedCategoryId = signal<string | null>(null);

  readonly categories = this._categories.asReadonly();
  readonly selectedCategoryId = this._selectedCategoryId.asReadonly();

  readonly currentCategoryItems = computed(() => {
    const catId = this._selectedCategoryId();
    const cats = this._categories();

    let items: MenuItem[] = [];
    if (catId) {
      const cat = cats.find(c => c.id === catId);
      items = cat?.items ?? [];
    } else {
      items = cats.flatMap(c => c.items ?? []);
    }

    return items.filter(i => i.isActive !== false && !i.eightySixed);
  });

  // Table / Order state
  private readonly _selectedTableId = signal<string | null>(null);
  private readonly _activeOrderId = signal<string | null>(null);
  private readonly _activeCheckGuid = signal<string | null>(null);
  private readonly _currentSeat = signal<number | undefined>(undefined);

  readonly selectedTableId = this._selectedTableId.asReadonly();
  readonly activeOrderId = this._activeOrderId.asReadonly();
  readonly currentSeat = this._currentSeat.asReadonly();

  readonly selectedTable = computed(() => {
    const id = this._selectedTableId();
    return id ? this.tables().find(t => t.id === id) ?? null : null;
  });

  readonly activeOrder = computed(() => {
    const id = this._activeOrderId();
    return id ? this.orders().find(o => o.guid === id) ?? null : null;
  });

  readonly activeCheck = computed(() => {
    const order = this.activeOrder();
    if (!order) return null;
    const guid = this._activeCheckGuid();
    if (guid) {
      return order.checks.find(c => c.guid === guid) ?? order.checks[0] ?? null;
    }
    return order.checks[0] ?? null;
  });

  readonly orderItems = computed(() => {
    const check = this.activeCheck();
    return check?.selections ?? [];
  });

  readonly itemCount = computed(() =>
    this.orderItems().reduce((sum, s) => sum + s.quantity, 0)
  );

  readonly subtotal = computed(() => this.activeCheck()?.subtotal ?? 0);

  readonly orderNumber = computed(() => {
    const order = this.activeOrder();
    return order?.orderNumber ?? '';
  });

  readonly availableTables = computed(() => {
    return this.tables().map(table => {
      const hasOrder = this.orders().some(
        o => o.table?.guid === table.id
          && o.guestOrderStatus !== 'CLOSED'
          && o.guestOrderStatus !== 'VOIDED'
      );
      return { ...table, hasOrder };
    });
  });

  // Modifier modal state
  private readonly _showModifier = signal(false);
  private readonly _modifierItem = signal<MenuItem | null>(null);

  readonly showModifier = this._showModifier.asReadonly();
  readonly modifierItem = this._modifierItem.asReadonly();

  // Footer expansion
  private readonly _footerExpanded = signal(false);
  readonly footerExpanded = this._footerExpanded.asReadonly();

  // Loading / error
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly isLoading = computed(() =>
    this._isLoading() || this.menuService.isLoading() || this.orderService.isLoading()
  );
  readonly error = this._error.asReadonly();

  // Seat options (1-8)
  readonly seatOptions = [1, 2, 3, 4, 5, 6, 7, 8];

  private orderEventCleanup: (() => void) | null = null;

  ngOnInit(): void {
    this.menuService.loadMenu();
    if (this.canUseFloorPlan()) {
      this.tableService.loadTables();
    }
    this.orderService.loadOrders();

    const checkMenu = setInterval(() => {
      const cats = this.menuService.categories();
      if (cats.length > 0) {
        this._categories.set(cats);
        if (!this._selectedCategoryId() && cats.length > 0) {
          this._selectedCategoryId.set(cats[0].id);
        }
        clearInterval(checkMenu);
      }
    }, 200);

    this.orderEventCleanup = this.orderService.onMappedOrderEvent(
      (_event: MappedOrderEvent) => {}
    );
  }

  ngOnDestroy(): void {
    this.orderEventCleanup?.();
  }

  // --- Table selection ---

  async selectTable(tableId: string): Promise<void> {
    this._selectedTableId.set(tableId);
    this._error.set(null);

    // Find existing active order for this table
    const existing = this.orders().find(
      o => o.table?.guid === tableId
        && o.guestOrderStatus !== 'CLOSED'
        && o.guestOrderStatus !== 'VOIDED'
    );

    if (existing) {
      this._activeOrderId.set(existing.guid);
      this._activeCheckGuid.set(existing.checks[0]?.guid ?? null);
    } else {
      // Auto-create a new order for this table
      await this.createNewOrder(tableId);
    }
  }

  async createNewOrder(tableId?: string): Promise<void> {
    const table = this.canUseFloorPlan()
      ? this.tables().find(t => t.id === (tableId ?? this._selectedTableId()))
      : null;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const order = await this.orderService.createOrder({
        orderType: table ? 'dine-in' : 'takeout',
        tableId: table?.id ?? null,
        tableNumber: table?.tableNumber ?? null,
        items: [],
      });

      if (order) {
        this._activeOrderId.set(order.guid);
        this._activeCheckGuid.set(order.checks?.[0]?.guid ?? null);
        if (table) {
          await this.tableService.updateStatus(table.id, 'occupied');
        }
      }
    } catch {
      this._error.set('Failed to create order');
    } finally {
      this._isLoading.set(false);
    }
  }

  // --- Category navigation ---

  selectCategory(categoryId: string): void {
    this._selectedCategoryId.set(categoryId);
  }

  // --- Seat selection ---

  setSeat(seat: number | undefined): void {
    this._currentSeat.set(seat);
  }

  // --- Item entry ---

  onItemTap(item: MenuItem): void {
    if (!this.activeOrder()) {
      this._error.set(this.canUseFloorPlan() ? 'Select a table first' : 'Create an order first');
      return;
    }

    if (item.modifierGroups && item.modifierGroups.length > 0) {
      this._modifierItem.set(item);
      this._showModifier.set(true);
    } else {
      this.addItemDirectly(item);
    }
  }

  async onModifierConfirmed(result: ModifierPromptResult): Promise<void> {
    this._showModifier.set(false);
    this._modifierItem.set(null);

    const order = this.activeOrder();
    const check = this.activeCheck();
    if (!order || !check) return;

    this._isLoading.set(true);

    try {
      const request = this.checkService.buildAddItemRequest(
        result.menuItem,
        result.quantity,
        result.selectedModifiers,
        result.seatNumber ?? this._currentSeat(),
        result.specialInstructions
      );

      await this.checkService.addItemToCheck(order.guid, check.guid, request);
      this.orderService.loadOrders();
    } catch {
      this._error.set('Failed to add item');
    } finally {
      this._isLoading.set(false);
    }
  }

  onModifierCancelled(): void {
    this._showModifier.set(false);
    this._modifierItem.set(null);
  }

  private async addItemDirectly(item: MenuItem): Promise<void> {
    const order = this.activeOrder();
    const check = this.activeCheck();
    if (!order || !check) return;

    this._isLoading.set(true);

    try {
      const request = this.checkService.buildAddItemRequest(
        item,
        1,
        [],
        this._currentSeat()
      );

      await this.checkService.addItemToCheck(order.guid, check.guid, request);
      this.orderService.loadOrders();
    } catch {
      this._error.set('Failed to add item');
    } finally {
      this._isLoading.set(false);
    }
  }

  // --- Item removal ---

  async removeItem(selection: Selection): Promise<void> {
    const order = this.activeOrder();
    const check = this.activeCheck();
    if (!order || !check) return;

    this._isLoading.set(true);

    try {
      await this.checkService.voidItem(
        order.guid,
        check.guid,
        selection.guid,
        { reason: 'customer_request' }
      );
      this.orderService.loadOrders();
    } catch {
      this._error.set('Failed to remove item');
    } finally {
      this._isLoading.set(false);
    }
  }

  // --- Footer ---

  toggleFooter(): void {
    this._footerExpanded.update(v => !v);
  }

  // --- Refresh ---

  refreshOrder(): void {
    this.orderService.loadOrders();
  }

  // --- Error dismiss ---

  dismissError(): void {
    this._error.set(null);
  }

  // --- Helpers ---

  getTableStatusClass(table: RestaurantTable & { hasOrder: boolean }): string {
    if (table.id === this._selectedTableId()) return 'table-selected';
    if (table.hasOrder) return 'table-occupied';
    return 'table-available';
  }
}
