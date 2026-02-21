import { Component, ChangeDetectionStrategy, signal, inject, computed } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '@services/auth';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  group: string;
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

  readonly sidebarCollapsed = signal(false);
  readonly mobileMenuOpen = signal(false);

  readonly user = this.auth.user;
  readonly selectedRestaurantName = this.auth.selectedRestaurantName;

  readonly navItems: NavItem[] = [
    { label: 'Orders', icon: 'bi-receipt', route: '/orders', group: 'Orders' },
    { label: 'Order Pad', icon: 'bi-pencil-square', route: '/order-pad', group: 'Orders' },
    { label: 'POS Terminal', icon: 'bi-tv', route: '/pos', group: 'Orders' },
    { label: 'KDS', icon: 'bi-display', route: '/kds', group: 'Kitchen' },
    { label: 'Floor Plan', icon: 'bi-grid-3x3', route: '/floor-plan', group: 'Front of House' },
    { label: 'Reservations', icon: 'bi-calendar-check', route: '/reservations', group: 'Front of House' },
    { label: 'Menu', icon: 'bi-book', route: '/menu', group: 'Menu' },
    { label: 'Combos', icon: 'bi-box', route: '/combos', group: 'Menu' },
    { label: 'Inventory', icon: 'bi-boxes', route: '/inventory', group: 'Menu' },
    { label: 'Command Center', icon: 'bi-speedometer2', route: '/command-center', group: 'Analytics' },
    { label: 'Sales', icon: 'bi-graph-up', route: '/sales', group: 'Analytics' },
    { label: 'Menu Engineering', icon: 'bi-stars', route: '/menu-engineering', group: 'Analytics' },
    { label: 'Close of Day', icon: 'bi-journal-check', route: '/close-of-day', group: 'Analytics' },
    { label: 'Customers', icon: 'bi-people', route: '/customers', group: 'Customers' },
    { label: 'Marketing', icon: 'bi-megaphone', route: '/marketing', group: 'Customers' },
    { label: 'Food Cost', icon: 'bi-calculator', route: '/food-cost', group: 'Operations' },
    { label: 'Scheduling', icon: 'bi-calendar-week', route: '/scheduling', group: 'Operations' },
    { label: 'Invoicing', icon: 'bi-file-earmark-text', route: '/invoicing', group: 'Operations' },
    { label: 'Cash Drawer', icon: 'bi-cash-stack', route: '/cash-drawer', group: 'Operations' },
    { label: 'Monitoring', icon: 'bi-shield-check', route: '/monitoring', group: 'Operations' },
    { label: 'AI Chat', icon: 'bi-chat-dots', route: '/ai-chat', group: 'AI Tools' },
    { label: 'Voice Order', icon: 'bi-mic', route: '/voice-order', group: 'AI Tools' },
    { label: 'Dynamic Pricing', icon: 'bi-tag', route: '/dynamic-pricing', group: 'AI Tools' },
    { label: 'Waste Tracker', icon: 'bi-trash3', route: '/waste-tracker', group: 'AI Tools' },
    { label: 'Sentiment', icon: 'bi-emoji-smile', route: '/sentiment', group: 'AI Tools' },
    { label: 'Multi-Location', icon: 'bi-building', route: '/multi-location', group: 'Admin' },
    { label: 'Settings', icon: 'bi-gear', route: '/settings', group: 'Admin' },
  ];

  readonly navGroups = computed(() => {
    const groups: { name: string; items: NavItem[] }[] = [];
    const seen = new Set<string>();

    for (const item of this.navItems) {
      if (!seen.has(item.group)) {
        seen.add(item.group);
        groups.push({
          name: item.group,
          items: this.navItems.filter(i => i.group === item.group),
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
