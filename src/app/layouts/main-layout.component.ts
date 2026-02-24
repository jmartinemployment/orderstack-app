import { Component, ChangeDetectionStrategy, signal, inject, computed } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '@services/auth';
import { PlatformService } from '@services/platform';

interface NavItem {
  label: string;
  icon: string;
  route: string;
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

  readonly sidebarCollapsed = signal(false);
  readonly mobileMenuOpen = signal(false);

  readonly user = this.auth.user;
  readonly selectedRestaurantName = this.auth.selectedRestaurantName;

  readonly navItems = computed<NavItem[]>(() => {
    const retail = this.platform.isRetailMode();
    const service = this.platform.isServiceMode();
    const restaurant = this.platform.isRestaurantMode();
    const mode = this.platform.currentDeviceMode();
    const flags = this.platform.featureFlags();
    const modules = this.platform.enabledModules();

    const items: NavItem[] = [
      // Always visible
      { label: 'Home', icon: 'bi-house', route: '/home' },
    ];

    // Orders — all except pure services
    if (!service) {
      items.push({ label: 'Orders', icon: 'bi-receipt', route: '/orders' });
    }

    // POS — mode-aware route
    if (retail) {
      items.push({ label: 'POS', icon: 'bi-upc-scan', route: '/retail/pos' });
    } else if (!service) {
      items.push({ label: 'POS', icon: 'bi-tv', route: '/pos' });
    }

    // Items — mode-aware label and route
    if (retail) {
      items.push({ label: 'Items', icon: 'bi-grid-3x3-gap', route: '/retail/catalog' });
    } else if (service) {
      items.push({ label: 'Items & Services', icon: 'bi-grid-3x3-gap', route: '/menu' });
    } else if (hasModule(modules, 'menu_management')) {
      items.push({ label: 'Items', icon: 'bi-book', route: '/menu' });
    }

    // Online — food and retail only
    if (retail) {
      items.push({ label: 'Online Store', icon: 'bi-globe', route: '/retail/ecommerce' });
    } else if (restaurant && hasModule(modules, 'online_ordering')) {
      items.push({ label: 'Online', icon: 'bi-globe', route: '/settings' });
    }

    // Customers — always
    items.push({ label: 'Customers', icon: 'bi-people', route: '/customers' });

    // Reports — always
    items.push({ label: 'Reports', icon: 'bi-bar-chart-line', route: '/reports' });

    // Staff — always
    items.push({ label: 'Staff', icon: 'bi-person-badge', route: '/scheduling' });

    // Inventory — food and retail
    if (retail) {
      items.push({ label: 'Inventory', icon: 'bi-box-seam', route: '/retail/inventory' });
    } else if (hasModule(modules, 'inventory')) {
      items.push({ label: 'Inventory', icon: 'bi-box-seam', route: '/inventory' });
    }

    // --- Mode-specific additions ---

    // Full Service / Bar: Floor Plan, Reservations
    if (mode === 'full_service' || mode === 'bar') {
      if (flags.enableFloorPlan) {
        items.push({ label: 'Floor Plan', icon: 'bi-columns-gap', route: '/floor-plan' });
      }
      if (hasModule(modules, 'reservations')) {
        items.push({ label: 'Reservations', icon: 'bi-calendar-event', route: '/reservations' });
      }
    }

    // Retail: Vendors, Fulfillment
    if (retail) {
      items.push({ label: 'Vendors', icon: 'bi-truck', route: '/retail/vendors' });
      items.push({ label: 'Fulfillment', icon: 'bi-box2', route: '/retail/fulfillment' });
    }

    // Bookings: Appointments
    if (mode === 'bookings') {
      items.push({ label: 'Appointments', icon: 'bi-calendar-check', route: '/reservations' });
    }

    // Services: Invoices
    if (mode === 'services' && hasModule(modules, 'invoicing')) {
      items.push({ label: 'Invoices', icon: 'bi-file-earmark-text', route: '/invoicing' });
    }

    // --- Bottom section ---
    items.push({ label: 'Settings', icon: 'bi-gear', route: '/settings' });

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
