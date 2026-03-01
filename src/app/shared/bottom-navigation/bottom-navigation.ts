import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { OrderService } from '@services/order';
import { BottomNavCheckout } from './checkout/checkout';
import { Transactions } from '../transactions/transactions';
import { DeviceService } from '@services/device';
import {
  DevicePosMode,
  DEVICE_POS_MODE_CATALOG,
  DEVICE_POS_MODE_ROUTES,
} from '@models/platform.model';

type BottomNavModal = 'checkout' | 'transactions' | 'notifications' | 'more' | null;

const HIDDEN_MODES: ReadonlySet<DevicePosMode> = new Set(['retail', 'services']);

@Component({
  selector: 'os-bottom-navigation',
  imports: [BottomNavCheckout, Transactions],
  templateUrl: './bottom-navigation.html',
  styleUrl: './bottom-navigation.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomNavigation {
  readonly orderService = inject(OrderService);
  private readonly deviceService = inject(DeviceService);
  private readonly router = inject(Router);

  private readonly _activeModal = signal<BottomNavModal>(null);
  readonly activeModal = this._activeModal.asReadonly();

  readonly availableModes = DEVICE_POS_MODE_CATALOG;

  isModeHidden(mode: DevicePosMode): boolean {
    return HIDDEN_MODES.has(mode);
  }

  isModeActive(mode: DevicePosMode): boolean {
    return this.deviceService.currentDevicePosMode() === mode;
  }

  openModal(modal: BottomNavModal): void {
    this._activeModal.set(modal);
  }

  closeModal(): void {
    this._activeModal.set(null);
  }

  async selectMode(mode: DevicePosMode): Promise<void> {
    await this.deviceService.registerBrowserDevice(mode);
    this._activeModal.set(null);
    this.router.navigate([DEVICE_POS_MODE_ROUTES[mode]]);
  }

  dismissNotification(id: string): void {
    this.orderService.clearItemReadyNotification(id);
  }

  getTimeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  }
}
