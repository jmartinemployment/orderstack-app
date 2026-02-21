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
import { PaymentService } from '@services/payment';
import { RestaurantSettingsService } from '@services/restaurant-settings';
import { CheckService, AddItemRequest } from '@services/check';
import { ModifierPrompt, ModifierPromptResult } from '../modifier-prompt';
import { DiscountModal, DiscountResult } from '../discount-modal';
import { VoidModal, VoidResult, CompResult } from '../void-modal';
import {
  RestaurantTable,
  Order,
  Check,
  Selection,
  MenuItem,
  MenuCategory,
  GuestOrderStatus,
} from '@models/index';

type PosModal = 'none' | 'modifier' | 'discount' | 'void' | 'comp' | 'split' | 'transfer' | 'tab';

@Component({
  selector: 'os-pos-terminal',
  imports: [
    CurrencyPipe,
    ModifierPrompt,
    DiscountModal,
    VoidModal,
  ],
  templateUrl: './server-pos-terminal.html',
  styleUrl: './server-pos-terminal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServerPosTerminal implements OnInit, OnDestroy {
  private readonly menuService = inject(MenuService);
  private readonly orderService = inject(OrderService);
  private readonly tableService = inject(TableService);
  private readonly authService = inject(AuthService);
  private readonly paymentService = inject(PaymentService);
  private readonly settingsService = inject(RestaurantSettingsService);
  private readonly checkService = inject(CheckService);

  readonly tables = this.tableService.tables;
  readonly orders = this.orderService.orders;
  readonly isLoading = computed(() => this.menuService.isLoading() || this.orderService.isLoading());

  // Menu state
  private readonly _categories = signal<MenuCategory[]>([]);
  private readonly _selectedCategoryId = signal<string | null>(null);
  private readonly _searchQuery = signal('');

  readonly categories = this._categories.asReadonly();
  readonly selectedCategoryId = this._selectedCategoryId.asReadonly();
  readonly searchQuery = this._searchQuery.asReadonly();

  readonly currentCategoryItems = computed(() => {
    const catId = this._selectedCategoryId();
    const query = this._searchQuery().toLowerCase().trim();
    const cats = this._categories();

    let items: MenuItem[] = [];
    if (catId) {
      const cat = cats.find(c => c.id === catId);
      items = cat?.items ?? [];
    } else {
      items = cats.flatMap(c => c.items ?? []);
    }

    if (query) {
      items = items.filter(i =>
        i.name.toLowerCase().includes(query) ||
        (i.nameEn ?? '').toLowerCase().includes(query)
      );
    }

    return items.filter(i => i.isActive !== false && !i.eightySixed);
  });

  // Table/Order state
  private readonly _selectedTableId = signal<string | null>(null);
  private readonly _activeOrderId = signal<string | null>(null);
  private readonly _activeCheckIndex = signal(0);

  readonly selectedTableId = this._selectedTableId.asReadonly();
  readonly activeOrderId = this._activeOrderId.asReadonly();

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
    const idx = this._activeCheckIndex();
    return order.checks[idx] ?? order.checks[0] ?? null;
  });

  readonly activeCheckIndex = this._activeCheckIndex.asReadonly();

  readonly tableOrders = computed(() => {
    const tableId = this._selectedTableId();
    if (!tableId) return [];
    return this.orders().filter(
      o => o.table?.guid === tableId && o.guestOrderStatus !== 'CLOSED' && o.guestOrderStatus !== 'VOIDED'
    );
  });

  readonly tableElapsedMinutes = computed(() => {
    const orders = this.tableOrders();
    if (orders.length === 0) return 0;
    const earliest = Math.min(...orders.map(o => o.timestamps.createdDate.getTime()));
    return Math.floor((Date.now() - earliest) / 60000);
  });

  // Compact table list for left panel
  readonly tableList = computed(() => {
    return this.tables().map(table => {
      const orders = this.orders().filter(
        o => o.table?.guid === table.id && o.guestOrderStatus !== 'CLOSED' && o.guestOrderStatus !== 'VOIDED'
      );
      const total = orders.reduce((sum, o) => sum + o.totalAmount, 0);
      const elapsed = orders.length > 0
        ? Math.floor((Date.now() - Math.min(...orders.map(o => o.timestamps.createdDate.getTime()))) / 60000)
        : 0;
      return { ...table, orderCount: orders.length, total, elapsed };
    });
  });

  // Open tabs (bar tabs not tied to tables)
  readonly openTabs = computed(() => {
    return this.orders().filter(o => {
      const check = o.checks[0];
      return check?.tabName && !check.tabClosedAt && o.guestOrderStatus !== 'CLOSED' && o.guestOrderStatus !== 'VOIDED';
    });
  });

  // Modal state
  private readonly _activeModal = signal<PosModal>('none');
  private readonly _modifierItem = signal<MenuItem | null>(null);
  private readonly _voidSelection = signal<Selection | null>(null);
  private readonly _splitMode = signal<'item' | 'equal' | 'seat'>('item');
  private readonly _splitCount = signal(2);
  private readonly _transferTargetId = signal<string | null>(null);
  private readonly _tabName = signal('');
  private readonly _tabPreauthEnabled = signal(false);
  private readonly _tabPreauthAmount = signal(50);
  private readonly _isTabProcessing = signal(false);

  readonly activeModal = this._activeModal.asReadonly();
  readonly modifierItem = this._modifierItem.asReadonly();
  readonly voidSelection = this._voidSelection.asReadonly();
  readonly splitMode = this._splitMode.asReadonly();
  readonly splitCount = this._splitCount.asReadonly();
  readonly transferTargetId = this._transferTargetId.asReadonly();
  readonly tabName = this._tabName.asReadonly();
  readonly tabPreauthEnabled = this._tabPreauthEnabled.asReadonly();
  readonly tabPreauthAmount = this._tabPreauthAmount.asReadonly();
  readonly isTabProcessing = this._isTabProcessing.asReadonly();

  // Seat assignment for next item
  private readonly _currentSeat = signal<number | undefined>(undefined);
  readonly currentSeat = this._currentSeat.asReadonly();

  private orderEventCleanup: (() => void) | null = null;

  ngOnInit(): void {
    this.menuService.loadMenu();
    this.tableService.loadTables();
    this.orderService.loadOrders();

    // Subscribe to menu loaded
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

    // Listen for order updates to keep state fresh
    this.orderEventCleanup = this.orderService.onMappedOrderEvent((event: MappedOrderEvent) => {
      // If active order was updated, state refreshes via signals automatically
    });
  }

  ngOnDestroy(): void {
    this.orderEventCleanup?.();
  }

  // --- Table selection ---

  selectTable(tableId: string): void {
    this._selectedTableId.set(tableId);

    // Auto-select the first active order for this table
    const orders = this.orders().filter(
      o => o.table?.guid === tableId && o.guestOrderStatus !== 'CLOSED' && o.guestOrderStatus !== 'VOIDED'
    );
    if (orders.length > 0) {
      this._activeOrderId.set(orders[0].guid);
      this._activeCheckIndex.set(0);
    } else {
      this._activeOrderId.set(null);
    }
  }

  selectOrder(orderId: string): void {
    this._activeOrderId.set(orderId);
    this._activeCheckIndex.set(0);
  }

  selectCheck(index: number): void {
    this._activeCheckIndex.set(index);
  }

  // --- Menu navigation ---

  selectCategory(categoryId: string | null): void {
    this._selectedCategoryId.set(categoryId);
  }

  setSearchQuery(query: string): void {
    this._searchQuery.set(query);
  }

  // --- Item entry ---

  onItemTap(item: MenuItem): void {
    if (item.modifierGroups && item.modifierGroups.length > 0) {
      this._modifierItem.set(item);
      this._activeModal.set('modifier');
    } else {
      this.addItemDirectly(item);
    }
  }

  async onModifierConfirmed(result: ModifierPromptResult): Promise<void> {
    this._activeModal.set('none');
    this._modifierItem.set(null);

    const order = this.activeOrder();
    const check = this.activeCheck();
    if (!order || !check) return;

    const request = this.checkService.buildAddItemRequest(
      result.menuItem,
      result.quantity,
      result.selectedModifiers,
      result.seatNumber ?? this._currentSeat(),
      result.specialInstructions
    );

    await this.checkService.addItemToCheck(order.guid, check.guid, request);
    this.orderService.loadOrders();
  }

  onModifierCancelled(): void {
    this._activeModal.set('none');
    this._modifierItem.set(null);
  }

  private async addItemDirectly(item: MenuItem): Promise<void> {
    const order = this.activeOrder();
    const check = this.activeCheck();

    if (!order || !check) {
      // Need to create order first
      await this.createNewOrder();
      // Retry after creation
      setTimeout(() => this.addItemDirectly(item), 300);
      return;
    }

    const request = this.checkService.buildAddItemRequest(
      item,
      1,
      [],
      this._currentSeat()
    );

    await this.checkService.addItemToCheck(order.guid, check.guid, request);
    this.orderService.loadOrders();
  }

  // --- Order lifecycle ---

  async createNewOrder(): Promise<void> {
    const table = this.selectedTable();
    if (!table) return;

    const order = await this.orderService.createOrder({
      orderType: 'dine-in',
      tableId: table.id,
      tableNumber: table.tableNumber,
      items: [],
    });

    if (order) {
      this._activeOrderId.set(order.guid);
      this._activeCheckIndex.set(0);
      await this.tableService.updateStatus(table.id, 'occupied');
    }
  }

  async sendToKitchen(): Promise<void> {
    const order = this.activeOrder();
    if (!order) return;
    await this.orderService.updateOrderStatus(order.guid, 'IN_PREPARATION');
  }

  async fireCourse(courseGuid: string): Promise<void> {
    const order = this.activeOrder();
    if (!order) return;
    await this.orderService.fireCourse(order.guid, courseGuid);
  }

  // --- Check actions ---

  async addNewCheck(): Promise<void> {
    const order = this.activeOrder();
    if (!order) return;

    const check = await this.checkService.addCheck(order.guid);
    if (check) {
      this.orderService.loadOrders();
      this._activeCheckIndex.set(order.checks.length); // Select new check
    }
  }

  // --- Void/Comp ---

  openVoidModal(selection: Selection): void {
    this._voidSelection.set(selection);
    this._activeModal.set('void');
  }

  openCompModal(selection: Selection): void {
    this._voidSelection.set(selection);
    this._activeModal.set('comp');
  }

  async onVoidConfirm(result: VoidResult): Promise<void> {
    const order = this.activeOrder();
    const check = this.activeCheck();
    const sel = this._voidSelection();
    if (!order || !check || !sel) return;

    const success = await this.checkService.voidItem(
      order.guid, check.guid, sel.guid,
      { reason: result.reason, managerPin: result.managerPin }
    );

    if (success) {
      this._activeModal.set('none');
      this._voidSelection.set(null);
      this.orderService.loadOrders();
    }
  }

  async onCompConfirm(result: CompResult): Promise<void> {
    const order = this.activeOrder();
    const check = this.activeCheck();
    const sel = this._voidSelection();
    if (!order || !check || !sel) return;

    const success = await this.checkService.compItem(
      order.guid, check.guid, sel.guid,
      { reason: result.reason, managerPin: result.managerPin }
    );

    if (success) {
      this._activeModal.set('none');
      this._voidSelection.set(null);
      this.orderService.loadOrders();
    }
  }

  // --- Discount ---

  openDiscountModal(): void {
    this._activeModal.set('discount');
  }

  async onDiscountApply(result: DiscountResult): Promise<void> {
    const order = this.activeOrder();
    const check = this.activeCheck();
    if (!order || !check) return;

    const success = await this.checkService.applyDiscount(
      order.guid, check.guid,
      { type: result.type, value: result.value, reason: result.reason }
    );

    if (success) {
      this._activeModal.set('none');
      this.orderService.loadOrders();
    }
  }

  // --- Split ---

  openSplitModal(): void {
    this._splitMode.set('item');
    this._splitCount.set(2);
    this._activeModal.set('split');
  }

  setSplitMode(mode: 'item' | 'equal' | 'seat'): void {
    this._splitMode.set(mode);
  }

  setSplitCount(count: number): void {
    this._splitCount.set(Math.max(2, count));
  }

  async executeSplit(): Promise<void> {
    const order = this.activeOrder();
    const check = this.activeCheck();
    if (!order || !check) return;

    const mode = this._splitMode();

    if (mode === 'equal') {
      await this.checkService.splitCheckByEqual(order.guid, check.guid, { numberOfWays: this._splitCount() });
    } else if (mode === 'seat') {
      await this.checkService.splitCheckBySeat(order.guid, check.guid);
    }

    this._activeModal.set('none');
    this.orderService.loadOrders();
  }

  // --- Transfer ---

  openTransferModal(): void {
    this._transferTargetId.set(null);
    this._activeModal.set('transfer');
  }

  setTransferTarget(tableId: string): void {
    this._transferTargetId.set(tableId);
  }

  async executeTransfer(): Promise<void> {
    const order = this.activeOrder();
    const check = this.activeCheck();
    const targetId = this._transferTargetId();
    if (!order || !check || !targetId) return;

    await this.checkService.transferCheck(order.guid, check.guid, { targetTableId: targetId });
    this._activeModal.set('none');
    this.orderService.loadOrders();
  }

  // --- Tab ---

  openTabModal(): void {
    this._tabName.set('');
    this._tabPreauthEnabled.set(false);
    this._tabPreauthAmount.set(50);
    this._isTabProcessing.set(false);
    this._activeModal.set('tab');
  }

  setTabName(name: string): void {
    this._tabName.set(name);
  }

  toggleTabPreauth(): void {
    this._tabPreauthEnabled.update(v => !v);
  }

  setTabPreauthAmount(amount: number): void {
    this._tabPreauthAmount.set(Math.max(1, amount));
  }

  async openTab(): Promise<void> {
    const order = this.activeOrder();
    const check = this.activeCheck();
    const name = this._tabName().trim();
    if (!order || !check || !name) return;

    this._isTabProcessing.set(true);

    try {
      // If pre-auth enabled, authorize the card hold first
      if (this._tabPreauthEnabled()) {
        const preauthAmount = this._tabPreauthAmount();
        const preauth = await this.paymentService.preauthorize(order.guid, preauthAmount);
        if (!preauth) {
          this._isTabProcessing.set(false);
          return; // Error already set in PaymentService
        }

        // Open tab with pre-auth data
        const success = await this.checkService.openTab(order.guid, check.guid, {
          tabName: name,
          preauthData: {
            paymentMethodId: preauth.preauthId,
            amount: preauth.amount,
          },
        });

        if (success) {
          this._activeModal.set('none');
          this.orderService.loadOrders();
        }
      } else {
        // Open tab without pre-auth
        const success = await this.checkService.openTab(order.guid, check.guid, { tabName: name });
        if (success) {
          this._activeModal.set('none');
          this.orderService.loadOrders();
        }
      }
    } finally {
      this._isTabProcessing.set(false);
    }
  }

  async closeActiveTab(): Promise<void> {
    const order = this.activeOrder();
    const check = this.activeCheck();
    if (!order || !check) return;

    this._isTabProcessing.set(true);

    try {
      // If tab has pre-auth, capture it for the final amount
      if (check.preauthId) {
        const captureResult = await this.paymentService.capturePreauth(
          order.guid,
          check.totalAmount
        );

        if (captureResult?.success) {
          this.orderService.loadOrders();
        }
      } else {
        await this.checkService.closeTab(order.guid, check.guid);
        this.orderService.loadOrders();
      }
    } finally {
      this._isTabProcessing.set(false);
    }
  }

  isTabOpen(): boolean {
    const check = this.activeCheck();
    return !!check?.tabName && !check.tabClosedAt;
  }

  getTabDuration(): number {
    const check = this.activeCheck();
    if (!check?.tabOpenedAt) return 0;
    return Math.floor((Date.now() - check.tabOpenedAt.getTime()) / 60000);
  }

  // --- Payment ---

  async closeAndPay(): Promise<void> {
    const order = this.activeOrder();
    if (!order) return;

    const check = this.activeCheck();
    if (!check) return;

    // If tab has pre-auth, capture it
    if (check.preauthId && check.tabName && !check.tabClosedAt) {
      await this.closeActiveTab();
      return;
    }

    // Initiate payment via PaymentService
    const settings = this.settingsService.paymentSettings();
    this.paymentService.setProcessorType(settings.processor);

    if (this.paymentService.isConfigured()) {
      await this.paymentService.initiatePayment(order.guid, check.totalAmount);
    } else {
      // Mark as cash / no processor
      await this.orderService.completeOrder(order.guid);
    }
  }

  // --- Seat management ---

  setCurrentSeat(seat: number | undefined): void {
    this._currentSeat.set(seat);
  }

  // --- Print ---

  printCheck(): void {
    const order = this.activeOrder();
    if (!order) return;
    this.orderService.triggerPrint(order.guid);
  }

  // --- Modal close ---

  closeModal(): void {
    this._activeModal.set('none');
    this._modifierItem.set(null);
    this._voidSelection.set(null);
  }

  // --- Helpers ---

  getStatusClass(status: string): string {
    switch (status) {
      case 'available': return 'status-available';
      case 'occupied': return 'status-occupied';
      case 'reserved': return 'status-reserved';
      case 'dirty': return 'status-dirty';
      default: return 'status-available';
    }
  }

  getCheckSubtotal(): number {
    return this.activeCheck()?.subtotal ?? 0;
  }
}
