import { Injectable, inject, signal, computed } from '@angular/core';
import { AuthService } from './auth';
import { OrderService } from './order';
import {
  CashEvent,
  CashEventType,
  CashDrawerSession,
  isCashInflow,
} from '../models/cash-drawer.model';

@Injectable({
  providedIn: 'root',
})
export class CashDrawerService {
  private readonly authService = inject(AuthService);
  private readonly orderService = inject(OrderService);

  private readonly _session = signal<CashDrawerSession | null>(null);
  private readonly _isOpen = signal(false);

  readonly session = this._session.asReadonly();
  readonly isOpen = this._isOpen.asReadonly();

  readonly runningBalance = computed(() => {
    const session = this._session();
    if (!session) return 0;

    return session.events.reduce((balance, event) => {
      return isCashInflow(event.type)
        ? balance + event.amount
        : balance - event.amount;
    }, 0);
  });

  readonly cashSalesTotal = computed(() => {
    const session = this._session();
    if (!session) return 0;
    return session.events
      .filter(e => e.type === 'cash_sale')
      .reduce((sum, e) => sum + e.amount, 0);
  });

  readonly cashOutTotal = computed(() => {
    const session = this._session();
    if (!session) return 0;
    return session.events
      .filter(e => e.type === 'cash_out' || e.type === 'tip_payout' || e.type === 'bank_deposit')
      .reduce((sum, e) => sum + e.amount, 0);
  });

  private get restaurantId(): string | null {
    return this.authService.selectedRestaurantId();
  }

  private get storageKey(): string {
    return `cash-drawer-${this.restaurantId ?? 'unknown'}`;
  }

  constructor() {
    // Restore session from localStorage on init
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const raw = JSON.parse(stored);
        const session = this.deserializeSession(raw);
        if (session && !session.closedAt) {
          this._session.set(session);
          this._isOpen.set(true);
        }
      }
    } catch {
      // Ignore corrupted storage
    }
  }

  openDrawer(openingFloat: number): void {
    const session: CashDrawerSession = {
      id: crypto.randomUUID(),
      openedAt: new Date(),
      openingFloat,
      events: [{
        id: crypto.randomUUID(),
        type: 'opening_float',
        amount: openingFloat,
        reason: 'Opening float',
        performedBy: this.authService.user()?.email ?? 'unknown',
        timestamp: new Date(),
      }],
      expectedCash: openingFloat,
    };

    this._session.set(session);
    this._isOpen.set(true);
    this.persist();
  }

  addEvent(type: CashEventType, amount: number, reason: string, orderId?: string): void {
    const session = this._session();
    if (!session || session.closedAt) return;

    const event: CashEvent = {
      id: crypto.randomUUID(),
      type,
      amount: Math.abs(amount),
      reason,
      performedBy: this.authService.user()?.email ?? 'unknown',
      timestamp: new Date(),
      orderId,
    };

    this._session.set({
      ...session,
      events: [...session.events, event],
    });
    this.persist();
  }

  recordCashSale(amount: number, orderId: string): void {
    this.addEvent('cash_sale', amount, 'Cash payment', orderId);
  }

  closeDrawer(actualCash: number): void {
    const session = this._session();
    if (!session) return;

    const expected = this.runningBalance();
    const overShort = actualCash - expected;

    this._session.set({
      ...session,
      closedAt: new Date(),
      expectedCash: expected,
      actualCash,
      overShort,
      closedBy: this.authService.user()?.email ?? 'unknown',
    });
    this._isOpen.set(false);
    this.persist();
  }

  clearSession(): void {
    this._session.set(null);
    this._isOpen.set(false);
    localStorage.removeItem(this.storageKey);
  }

  private persist(): void {
    const session = this._session();
    if (!session) return;
    localStorage.setItem(this.storageKey, JSON.stringify(session));
  }

  private deserializeSession(raw: any): CashDrawerSession | null {
    if (!raw?.id) return null;
    return {
      ...raw,
      openedAt: new Date(raw.openedAt),
      closedAt: raw.closedAt ? new Date(raw.closedAt) : undefined,
      events: (raw.events ?? []).map((e: any) => ({
        ...e,
        timestamp: new Date(e.timestamp),
      })),
    };
  }
}
