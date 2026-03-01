import { Component, ChangeDetectionStrategy, signal, inject, computed } from '@angular/core';
import { AuthService } from '@services/auth';
import { Sidebar, type NavItem } from '@shared/sidebar/sidebar';
import { BookingManager } from '../booking-manager';

@Component({
  selector: 'os-booking',
  standalone: true,
  imports: [Sidebar, BookingManager],
  templateUrl: './booking.html',
  styleUrl: './booking.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Booking {
  private readonly auth = inject(AuthService);

  readonly sidebarCollapsed = signal(false);
  readonly restaurantName = this.auth.selectedMerchantName;
  readonly restaurantAddress = this.auth.selectedMerchantAddress;
  readonly userName = computed(() => this.auth.user()?.firstName ?? null);

  readonly navItems = computed<NavItem[]>(() => [
    { label: 'Bookings', icon: 'bi-calendar-check', route: '/bookings-terminal' },
    { label: 'Settings', icon: 'bi-gear', route: '/settings' },
  ]);

  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => !v);
  }

  logout(): void {
    this.auth.logout();
  }
}
