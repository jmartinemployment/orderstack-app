import { Component, ChangeDetectionStrategy, signal, inject, computed } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '@services/auth';
import { PlatformService } from '@services/platform';
import { InventoryService } from '@services/inventory';
import { StaffManagementService } from '@services/staff-management';
import { MenuService } from '@services/menu';
import { TableService } from '@services/table';
import { OrderService } from '@services/order';

type AlertSeverity = 'critical' | 'warning' | 'info' | null;

interface NavItem {
  label: string;
  icon: string;
  route: string;
  key?: string;
  alertSeverity?: AlertSeverity;
}

@Component({
  selector: 'os-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent {
  private readonly auth = inject(AuthService);
  private readonly platform = inject(PlatformService);
  private readonly inventoryService = inject(InventoryService);
  private readonly staffService = inject(StaffManagementService);
  private readonly menuService = inject(MenuService);
  private readonly tableService = inject(TableService);
  private readonly orderService = inject(OrderService);

  readonly sidebarCollapsed = signal(false);
  readonly mobileMenuOpen = signal(false);

  readonly user = this.auth.user;
  readonly selectedRestaurantName = this.auth.selectedRestaurantName;

  private readonly sidebarAlerts = computed<Record<string, AlertSeverity>>(() => {
    const alerts: Record<string, AlertSeverity> = {};

    // Inventory — severity from alert data
    const invAlerts = this.inventoryService.alerts();
    if (invAlerts.length > 0) {
      const hasCritical = invAlerts.some(a => a.severity === 'critical' || a.type === 'out_of_stock');
      alerts['/inventory'] = hasCritical ? 'critical' : 'warning';
      alerts['/retail/inventory'] = alerts['/inventory'];
    }

    // Orders — pending count drives severity
    const pending = this.orderService.pendingOrders().length;
    const ready = this.orderService.readyOrders().length;
    if (pending > 5 || ready > 3) {
      alerts['/orders'] = 'critical';
    } else if (pending > 0 || ready > 0) {
      alerts['/orders'] = 'warning';
    }

    // POS — active orders
    const active = this.orderService.activeOrderCount();
    if (active > 10) {
      alerts['/pos'] = 'critical';
      alerts['/retail/pos'] = 'critical';
    } else if (active > 0) {
      alerts['/pos'] = 'info';
      alerts['/retail/pos'] = 'info';
    }

    // Staff — no team members is a warning
    const team = this.staffService.teamMembers();
    if (team.length === 0) {
      alerts['/scheduling'] = 'warning';
    }

    // Items — empty menu is info-level
    const items = this.menuService.allItems();
    if (items.length === 0) {
      alerts['/menu'] = 'info';
      alerts['/retail/catalog'] = 'info';
    }

    // Floor Plan — no tables configured
    const tables = this.tableService.tables();
    if (tables.length === 0) {
      alerts['/floor-plan'] = 'warning';
    }

    return alerts;
  });

  readonly navItems = computed<NavItem[]>(() => {
    const retail = this.platform.isRetailMode();
    const service = this.platform.isServiceMode();
    const restaurant = this.platform.isRestaurantMode();
    const mode = this.platform.currentDeviceMode();
    const flags = this.platform.featureFlags();
    const modules = this.platform.enabledModules();
    const alerts = this.sidebarAlerts();

    const items: NavItem[] = [
      { label: 'Home', icon: 'bi-speedometer2', route: '/home' },
    ];

    if (!service) {
      items.push({ label: 'Orders', icon: 'bi-receipt', route: '/orders' });
    }

    if (retail) {
      items.push({ label: 'POS', icon: 'bi-upc-scan', route: '/retail/pos' });
    } else if (!service) {
      items.push({ label: 'POS', icon: 'bi-tv', route: '/pos' });
    }

    if (retail) {
      items.push({ label: 'Items', icon: 'bi-grid-3x3-gap', route: '/retail/catalog' });
    } else if (service) {
      items.push({ label: 'Items & Services', icon: 'bi-grid-3x3-gap', route: '/menu' });
    } else if (hasModule(modules, 'menu_management')) {
      items.push({ label: 'Items', icon: 'bi-book', route: '/menu' });
    }

    if (retail) {
      items.push({ label: 'Online Store', icon: 'bi-globe', route: '/retail/ecommerce' });
    } else if (restaurant && hasModule(modules, 'online_ordering')) {
      items.push({ label: 'Online', icon: 'bi-globe', route: '/settings', key: 'online-settings' });
    }

    items.push({ label: 'Customers', icon: 'bi-people', route: '/customers' });
    items.push({ label: 'Reports', icon: 'bi-bar-chart-line', route: '/reports' });
    items.push({ label: 'Staff', icon: 'bi-person-badge', route: '/scheduling' });

    if (retail) {
      items.push({ label: 'Inventory', icon: 'bi-box-seam', route: '/retail/inventory' });
    } else if (hasModule(modules, 'inventory')) {
      items.push({ label: 'Inventory', icon: 'bi-box-seam', route: '/inventory' });
    }

    if (!retail && !service && hasModule(modules, 'inventory')) {
      items.push({ label: 'Suppliers', icon: 'bi-truck', route: '/suppliers' });
    }

    if (mode === 'full_service' || mode === 'bar') {
      if (flags.enableFloorPlan) {
        items.push({ label: 'Floor Plan', icon: 'bi-columns-gap', route: '/floor-plan' });
      }
      if (hasModule(modules, 'reservations')) {
        items.push({ label: 'Reservations', icon: 'bi-calendar-event', route: '/reservations' });
      }
    }

    if (retail) {
      items.push({ label: 'Vendors', icon: 'bi-truck', route: '/retail/vendors' });
      items.push({ label: 'Fulfillment', icon: 'bi-box2', route: '/retail/fulfillment' });
    }

    if (mode === 'bookings') {
      items.push({ label: 'Appointments', icon: 'bi-calendar-check', route: '/reservations' });
    }

    if (mode === 'services' && hasModule(modules, 'invoicing')) {
      items.push({ label: 'Invoices', icon: 'bi-file-earmark-text', route: '/invoicing' });
    }

    items.push({ label: 'Settings', icon: 'bi-gear', route: '/settings' });

    // Apply alert severities from service signals
    for (const item of items) {
      item.alertSeverity = alerts[item.route] ?? null;
    }

    return items;
  });

  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => !v);
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update(v => !v);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  logout(): void {
    this.auth.logout();
  }
}

function hasModule(modules: readonly string[], mod: string): boolean {
  return modules.includes(mod);
}
