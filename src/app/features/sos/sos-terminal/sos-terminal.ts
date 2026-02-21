import { Component, inject, signal, effect, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { MenuDisplay } from '../menu-display/menu-display';
import { CheckoutModal } from '../checkout-modal/checkout-modal';
import { UpsellBar } from '../upsell-bar/upsell-bar';
import { OrderNotifications } from '../order-notifications/order-notifications';
import { CategoryManagement } from '../../menu-mgmt/category-management/category-management';
import { ItemManagement } from '../../menu-mgmt/item-management/item-management';
import { PendingOrders } from '../../orders/pending-orders/pending-orders';
import { OrderHistory } from '../../orders/order-history/order-history';
import { AnalyticsService } from '@services/analytics';
import { MenuService } from '@services/menu';
import { CartService } from '@services/cart';
import { SocketService } from '@services/socket';
import { AuthService } from '@services/auth';

type SosView = 'menu' | 'menu-mgmt' | 'orders';

@Component({
  selector: 'os-sos-terminal',
  imports: [
    MenuDisplay,
    CheckoutModal,
    UpsellBar,
    OrderNotifications,
    CategoryManagement,
    ItemManagement,
    PendingOrders,
    OrderHistory,
  ],
  templateUrl: './sos-terminal.html',
  styleUrl: './sos-terminal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SosTerminal implements OnDestroy {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly menuService = inject(MenuService);
  private readonly cartService = inject(CartService);
  private readonly socketService = inject(SocketService);
  private readonly authService = inject(AuthService);

  private readonly _lastOrderId = signal<string | null>(null);
  private readonly _drawerOpen = signal(false);
  private readonly _currentView = signal<SosView>('menu');
  private readonly _socketConnected = signal(false);

  readonly lastOrderId = this._lastOrderId.asReadonly();
  readonly cartItemCount = this.cartService.itemCount;
  readonly isCartOpen = this.cartService.isOpen;
  readonly drawerOpen = this._drawerOpen.asReadonly();
  readonly currentView = this._currentView.asReadonly();

  readonly upsellSuggestions = this.analyticsService.upsellSuggestions;
  readonly isLoadingUpsell = this.analyticsService.isLoadingUpsell;
  readonly fallbackUpsellItems = this.menuService.popularItems;
  readonly currentLanguage = this.menuService.currentLanguage;
  readonly restaurantLogo = this.authService.selectedRestaurantLogo;
  readonly restaurantName = this.authService.selectedRestaurantName;

  constructor() {
    effect(() => {
      const restaurantId = this.authService.selectedRestaurantId();
      if (restaurantId && !this._socketConnected()) {
        this._socketConnected.set(true);
        this.socketService.connect(restaurantId, 'pos');
      }
    });

    effect(() => {
      const items = this.cartService.items();
      if (items.length > 0) {
        const cartItemIds = items.map(item => item.menuItem.id);
        this.analyticsService.fetchUpsellSuggestions(cartItemIds);
      } else {
        this.analyticsService.clearUpsellSuggestions();
      }
    });

    // Load menu engineering data for item badges
    effect(() => {
      const restaurantId = this.authService.selectedRestaurantId();
      if (restaurantId && !this.analyticsService.menuEngineering()) {
        this.analyticsService.loadMenuEngineering();
      }
    });
  }

  toggleLanguage(): void {
    const newLang = this.currentLanguage() === 'en' ? 'es' : 'en';
    this.menuService.setLanguage(newLang);
  }

  toggleDrawer(): void {
    this._drawerOpen.update(open => !open);
  }

  closeDrawer(): void {
    this._drawerOpen.set(false);
  }

  setView(view: SosView): void {
    this._currentView.set(view);
    this._drawerOpen.set(false);
  }

  ngOnDestroy(): void {
    this.socketService.disconnect();
  }

  toggleCart(): void {
    this.cartService.toggle();
  }

  onOrderPlaced(orderId: string): void {
    this._lastOrderId.set(orderId);
  }

  logout(): void {
    this.authService.logout();
  }
}
