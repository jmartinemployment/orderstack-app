import { Component, inject, signal, computed, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { Order, GuestOrderStatus, CourseFireStatus, getOrderIdentifier } from '@models/index';
import { SocketService } from '@services/socket';
import { OrderService, MappedOrderEvent } from '@services/order';

type NotificationType = 'success' | 'info' | 'warning' | 'urgent';

interface Notification {
  id: string;
  order: Order;
  message: string;
  type: NotificationType;
  timestamp: Date;
  eventType: MappedOrderEvent['type'];
}

@Component({
  selector: 'os-order-notifications',
  imports: [],
  templateUrl: './order-notifications.html',
  styleUrl: './order-notifications.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderNotifications implements OnInit, OnDestroy {
  private readonly socketService = inject(SocketService);
  private readonly orderService = inject(OrderService);

  private readonly _notifications = signal<Notification[]>([]);
  private readonly _soundEnabled = signal(true);
  private readonly _desktopEnabled = signal(false);
  private readonly _courseStatuses = signal<Map<string, Map<string, CourseFireStatus>>>(new Map());

  readonly notifications = this._notifications.asReadonly();
  readonly soundEnabled = this._soundEnabled.asReadonly();
  readonly desktopEnabled = this._desktopEnabled.asReadonly();

  readonly notificationCount = computed(() => this._notifications().length);

  private readonly autoDismissMs = 15000;
  private unsubscribe: (() => void) | null = null;
  private audioContext: AudioContext | null = null;
  private elapsedInterval: ReturnType<typeof setInterval> | null = null;

  // Force re-render for elapsed time display
  private readonly _tick = signal(0);
  readonly tick = this._tick.asReadonly();

  ngOnInit(): void {
    this.unsubscribe = this.orderService.onMappedOrderEvent((event) => {
      this.handleOrderEvent(event);
    });

    // Tick every 30s to update elapsed times
    this.elapsedInterval = setInterval(() => {
      this._tick.update(t => t + 1);
    }, 30000);

    // Check desktop notification permission
    if ('Notification' in globalThis && Notification.permission === 'granted') {
      this._desktopEnabled.set(true);
    }
  }

  ngOnDestroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    if (this.elapsedInterval) {
      clearInterval(this.elapsedInterval);
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }

  private handleOrderEvent(event: MappedOrderEvent): void {
    const order = event.order;
    const deviceId = this.socketService.deviceId();

    // For 'new' events, only show if it's NOT from this device (staff sees incoming orders)
    // For 'updated'/'cancelled', show if it IS from this device (customer sees their updates)
    if (event.type === 'new') {
      if (order.device.guid === deviceId) return;
    } else {
      if (order.device.guid !== 'unknown' && order.device.guid !== deviceId) return;
    }

    // Detect course READY transitions — if found, skip the standard notification
    // to avoid duplicate toasts for the same event
    let courseReadyHandled = false;
    if (event.type === 'updated') {
      courseReadyHandled = this.detectCourseReady(order);
    }
    this.updateCourseTracking(order);

    if (!courseReadyHandled) {
      this.addNotification(order, order.guestOrderStatus, event.type);
    }
  }

  addNotification(order: Order, status: GuestOrderStatus, eventType: MappedOrderEvent['type']): void {
    const message = this.getStatusMessage(order, status, eventType);
    const type = this.getNotificationType(status, eventType, order);

    const notification: Notification = {
      id: crypto.randomUUID(),
      order,
      message,
      type,
      timestamp: new Date(),
      eventType,
    };

    this._notifications.update(notifications => [notification, ...notifications]);

    // Play sound
    if (this._soundEnabled()) {
      this.playSound(type);
    }

    // Desktop notification
    if (this._desktopEnabled()) {
      this.showDesktopNotification(notification);
    }

    // Auto-dismiss — urgent notifications stay longer
    const dismissMs = type === 'urgent' ? this.autoDismissMs * 2 : this.autoDismissMs;
    setTimeout(() => {
      this.dismissNotification(notification.id);
    }, dismissMs);
  }

  dismissNotification(id: string): void {
    this._notifications.update(notifications =>
      notifications.filter(n => n.id !== id)
    );
  }

  clearAll(): void {
    this._notifications.set([]);
  }

  toggleSound(): void {
    this._soundEnabled.update(v => !v);
  }

  async requestDesktopPermission(): Promise<void> {
    if (!('Notification' in globalThis)) return;

    if (Notification.permission === 'granted') {
      this._desktopEnabled.set(true);
      return;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      this._desktopEnabled.set(permission === 'granted');
    }
  }

  getElapsedText(timestamp: Date): string {
    // Reference tick to trigger reactivity
    this._tick();
    const seconds = Math.floor((Date.now() - timestamp.getTime()) / 1000);
    if (seconds < 10) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  }

  private getStatusMessage(order: Order, status: GuestOrderStatus, eventType: MappedOrderEvent['type']): string {
    const orderNumber = getOrderIdentifier(order);

    if (eventType === 'new') {
      const itemCount = order.checks.flatMap(c => c.selections).reduce((sum, sel) => sum + sel.quantity, 0);
      return `New order #${orderNumber} — ${itemCount} item${itemCount !== 1 ? 's' : ''} ($${order.totalAmount.toFixed(2)})`;
    }

    switch (status) {
      case 'RECEIVED':
        return `Order #${orderNumber} received`;
      case 'IN_PREPARATION':
        return `Order #${orderNumber} is being prepared`;
      case 'READY_FOR_PICKUP':
        return `Order #${orderNumber} is READY for pickup!`;
      case 'CLOSED':
        return `Order #${orderNumber} completed`;
      case 'VOIDED':
        return `Order #${orderNumber} cancelled`;
      default:
        return `Order #${orderNumber} status updated`;
    }
  }

  private getNotificationType(
    status: GuestOrderStatus,
    eventType: MappedOrderEvent['type'],
    order: Order
  ): NotificationType {
    // New incoming orders are urgent for staff
    if (eventType === 'new') return 'urgent';

    // Cancelled orders are warnings
    if (eventType === 'cancelled' || status === 'VOIDED') return 'warning';

    // Ready orders are success + high priority
    if (status === 'READY_FOR_PICKUP') return 'success';

    // Orders waiting a long time to be confirmed get urgency
    if (status === 'RECEIVED') {
      const waitMs = Date.now() - order.timestamps.createdDate.getTime();
      if (waitMs > 5 * 60 * 1000) return 'urgent'; // >5 min wait
    }

    if (status === 'CLOSED') return 'success';

    return 'info';
  }

  private playSound(type: NotificationType): void {
    try {
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }

      const ctx = this.audioContext;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      gain.gain.value = 0.15;

      switch (type) {
        case 'urgent': {
          // Double beep — high pitch
          oscillator.frequency.value = 880;
          oscillator.type = 'sine';
          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
          gain.gain.setValueAtTime(0.15, ctx.currentTime + 0.2);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.4);
          break;
        }
        case 'success': {
          // Rising chime
          oscillator.frequency.value = 523;
          oscillator.frequency.setValueAtTime(523, ctx.currentTime);
          oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
          oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
          oscillator.type = 'sine';
          gain.gain.setValueAtTime(0.12, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.45);
          break;
        }
        case 'warning': {
          // Low tone
          oscillator.frequency.value = 330;
          oscillator.type = 'triangle';
          gain.gain.setValueAtTime(0.12, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.35);
          break;
        }
        default: {
          // Simple blip
          oscillator.frequency.value = 660;
          oscillator.type = 'sine';
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.2);
          break;
        }
      }
    } catch {
      // AudioContext may not be available
    }
  }

  private showDesktopNotification(notification: Notification): void {
    try {
      const title = notification.type === 'urgent'
        ? 'New Order!'
        : 'Order Update';

      new Notification(title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.order.guid,
        requireInteraction: notification.type === 'urgent',
      });
    } catch {
      // Desktop notifications may not be available
    }
  }

  private detectCourseReady(order: Order): boolean {
    if (!order.courses || order.courses.length === 0) return false;

    const previousMap = this._courseStatuses().get(order.guid);
    if (!previousMap) return false;

    let detected = false;
    for (const course of order.courses) {
      if (course.fireStatus === 'READY' && previousMap.get(course.guid) !== 'READY') {
        detected = true;
        const message = `${course.name} is READY on order #${getOrderIdentifier(order)}`;

        const notification: Notification = {
          id: crypto.randomUUID(),
          order,
          message,
          type: 'success',
          timestamp: new Date(),
          eventType: 'updated',
        };

        this._notifications.update(notifications => [notification, ...notifications]);

        if (this._soundEnabled()) {
          this.playCourseReadySound();
        }

        if (this._desktopEnabled()) {
          try {
            new globalThis.Notification('Course Ready', {
              body: message,
              icon: '/favicon.ico',
              tag: `${order.guid}-course-${course.guid}`,
            });
          } catch {
            // Desktop notifications may not be available
          }
        }

        const dismissMs = this.autoDismissMs;
        setTimeout(() => {
          this.dismissNotification(notification.id);
        }, dismissMs);
      }
    }
    return detected;
  }

  private updateCourseTracking(order: Order): void {
    if (!order.courses || order.courses.length === 0) {
      this._courseStatuses.update(map => {
        const updated = new Map(map);
        updated.delete(order.guid);
        return updated;
      });
      return;
    }

    const courseMap = new Map<string, CourseFireStatus>();
    for (const course of order.courses) {
      courseMap.set(course.guid, course.fireStatus);
    }

    this._courseStatuses.update(map => {
      const updated = new Map(map);
      updated.set(order.guid, courseMap);
      return updated;
    });
  }

  private playCourseReadySound(): void {
    try {
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }

      const ctx = this.audioContext;

      // First note: G5 (784 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.frequency.value = 784;
      osc1.type = 'sine';
      gain1.gain.setValueAtTime(0.12, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.15);

      // Second note: B5 (988 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = 988;
      osc2.type = 'sine';
      gain2.gain.setValueAtTime(0.12, ctx.currentTime + 0.18);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.38);
      osc2.start(ctx.currentTime + 0.18);
      osc2.stop(ctx.currentTime + 0.38);
    } catch {
      // AudioContext may not be available
    }
  }
}
