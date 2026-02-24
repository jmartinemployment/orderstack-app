import { Component, ChangeDetectionStrategy, signal, inject, computed } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '@services/auth';
import { PlatformService } from '@services/platform';
import type { PlatformModule, ModeFeatureFlags } from '@models/index';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  group: string;
  requiredModule?: PlatformModule;
  requiredFlag?: keyof ModeFeatureFlags;
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

  private readonly allNavItems: NavItem[] = [
    // Home — always visible
    { label: 'Home', icon: 'bi-house', route: '/home', group: 'Home' },

    // Orders — always visible
    { label: 'Orders', icon: 'bi-receipt', route: '/orders', group: 'Orders' },
    { label: 'Order Pad', icon: 'bi-pencil-square', route: '/order-pad', group: 'Orders' },
    { label: 'POS Terminal', icon: 'bi-tv', route: '/pos', group: 'Orders' },

    // Kitchen
    { label: 'KDS', icon: 'bi-display', route: '/kds', group: 'Kitchen', requiredFlag: 'enableKds' },

    // Front of House
    { label: 'Floor Plan', icon: 'bi-grid-3x3', route: '/floor-plan', group: 'Front of House', requiredFlag: 'enableFloorPlan' },
    { label: 'Reservations', icon: 'bi-calendar-check', route: '/reservations', group: 'Front of House', requiredModule: 'reservations' },

    // Menu
    { label: 'Menu', icon: 'bi-book', route: '/menu', group: 'Menu', requiredModule: 'menu_management' },
    { label: 'Combos', icon: 'bi-box', route: '/combos', group: 'Menu', requiredModule: 'menu_management' },
    { label: 'Inventory', icon: 'bi-boxes', route: '/inventory', group: 'Menu', requiredModule: 'inventory' },

    // Analytics — always visible
    { label: 'Command Center', icon: 'bi-speedometer2', route: '/command-center', group: 'Analytics' },
    { label: 'Sales', icon: 'bi-graph-up', route: '/sales', group: 'Analytics' },
    { label: 'Menu Engineering', icon: 'bi-stars', route: '/menu-engineering', group: 'Analytics', requiredModule: 'menu_management' },
    { label: 'Close of Day', icon: 'bi-journal-check', route: '/close-of-day', group: 'Analytics' },

    // Customers
    { label: 'Customers', icon: 'bi-people', route: '/customers', group: 'Customers' },
    { label: 'Marketing', icon: 'bi-megaphone', route: '/marketing', group: 'Customers', requiredModule: 'marketing' },

    // Operations
    { label: 'Food Cost', icon: 'bi-calculator', route: '/food-cost', group: 'Operations' },
    { label: 'Scheduling', icon: 'bi-calendar-week', route: '/scheduling', group: 'Operations', requiredModule: 'staff_scheduling' },
    { label: 'Invoicing', icon: 'bi-file-earmark-text', route: '/invoicing', group: 'Operations', requiredModule: 'invoicing' },
    { label: 'Cash Drawer', icon: 'bi-cash-stack', route: '/cash-drawer', group: 'Operations' },
    { label: 'Monitoring', icon: 'bi-shield-check', route: '/monitoring', group: 'Operations' },

    // Retail
    { label: 'Catalog', icon: 'bi-grid-3x3-gap', route: '/retail/catalog', group: 'Retail', requiredFlag: 'enableBarcodeScanning' },
    { label: 'Variations', icon: 'bi-diagram-3', route: '/retail/variations', group: 'Retail', requiredFlag: 'enableBarcodeScanning' },
    { label: 'Retail POS', icon: 'bi-upc-scan', route: '/retail/pos', group: 'Retail', requiredFlag: 'enableBarcodeScanning' },
    { label: 'Returns', icon: 'bi-arrow-return-left', route: '/retail/returns', group: 'Retail', requiredFlag: 'enableBarcodeScanning' },
    { label: 'Inventory', icon: 'bi-box-seam', route: '/retail/inventory', group: 'Retail', requiredFlag: 'enableBarcodeScanning' },
    { label: 'Vendors', icon: 'bi-truck', route: '/retail/vendors', group: 'Retail', requiredFlag: 'enableBarcodeScanning' },
    { label: 'Purchase Orders', icon: 'bi-clipboard-check', route: '/retail/purchase-orders', group: 'Retail', requiredFlag: 'enableBarcodeScanning' },
    { label: 'Reports', icon: 'bi-bar-chart-line', route: '/retail/reports', group: 'Retail', requiredFlag: 'enableBarcodeScanning' },
    { label: 'Fulfillment', icon: 'bi-box2', route: '/retail/fulfillment', group: 'Retail', requiredFlag: 'enableBarcodeScanning' },
    { label: 'Online Store', icon: 'bi-globe', route: '/retail/ecommerce', group: 'Retail', requiredFlag: 'enableBarcodeScanning' },

    // AI Tools
    { label: 'AI Chat', icon: 'bi-chat-dots', route: '/ai-chat', group: 'AI Tools' },
    { label: 'Voice Order', icon: 'bi-mic', route: '/voice-order', group: 'AI Tools' },
    { label: 'Dynamic Pricing', icon: 'bi-tag', route: '/dynamic-pricing', group: 'AI Tools' },
    { label: 'Waste Tracker', icon: 'bi-trash3', route: '/waste-tracker', group: 'AI Tools' },
    { label: 'Sentiment', icon: 'bi-emoji-smile', route: '/sentiment', group: 'AI Tools' },

    // Admin — always visible
    { label: 'Multi-Location', icon: 'bi-building', route: '/multi-location', group: 'Admin', requiredModule: 'multi_location' },
    { label: 'Settings', icon: 'bi-gear', route: '/settings', group: 'Admin' },
  ];

  readonly filteredNavItems = computed(() => {
    const flags = this.platform.featureFlags();
    return this.allNavItems.filter(item => {
      if (item.requiredModule && !this.platform.isModuleEnabled(item.requiredModule)) {
        return false;
      }
      if (item.requiredFlag && !flags[item.requiredFlag]) {
        return false;
      }
      return true;
    });
  });

  readonly navGroups = computed(() => {
    const items = this.filteredNavItems();
    const groups: { name: string; items: NavItem[] }[] = [];
    const seen = new Set<string>();

    for (const item of items) {
      if (!seen.has(item.group)) {
        seen.add(item.group);
        groups.push({
          name: item.group,
          items: items.filter(i => i.group === item.group),
        });
      }
    }

    return groups;
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
