import { Injectable, inject, signal, computed } from '@angular/core';
import { AuthService } from './auth';
import {
  CashEvent,
  CashEventType,
  CashDrawerSession,
  CashDenomination,
  CashReconciliation,
  isCashInflow,
  calculateDenominationTotal,
} from '../models/cash-drawer.model';

@Injectable({
  providedIn: 'root',
})
export class CashDrawerService {
  private readonly authService = inject(AuthService);

  private readonly _session = signal<CashDrawerSession | null>(null);
  private readonly _isOpen = signal(false);
  private readonly _sessionHistory = signal<CashDrawerSession[]>([]);
  private readonly _isLoadingHistory = signal(false);

  readonly session = this._session.asReadonly();
  readonly isOpen = this._isOpen.asReadonly();
  readonly sessionHistory = this._sessionHistory.asReadonly();
  readonly isLoadingHistory = this._isLoadingHistory.asReadonly();

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
      .filter(e => !isCashInflow(e.type) && e.type !== 'opening_float')
      .reduce((sum, e) => sum + e.amount, 0);
  });

  readonly totalPaidOut = computed(() => {
    const session = this._session();
    if (!session) return 0;
    return session.events
      .filter(e => e.type === 'paid_out' || e.type === 'petty_cash')
      .reduce((sum, e) => sum + e.amount, 0);
  });

  readonly totalDropped = computed(() => {
    const session = this._session();
    if (!session) return 0;
    return session.events
      .filter(e => e.type === 'drop_to_safe' || e.type === 'bank_deposit')
      .reduce((sum, e) => sum + e.amount, 0);
  });

  readonly todaysReconciliations = computed<CashReconciliation[]>(() => {
    const history = this._sessionHistory();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return history
      .filter(s => s.closedAt && new Date(s.closedAt) >= today)
      .map(s => this.buildReconciliation(s));
  });

  private get restaurantId(): string | null {
    return this.authService.selectedRestaurantId();
  }

  private get storageKey(): string {
    return `cash-drawer-${this.restaurantId ?? 'unknown'}`;
  }

  private get historyKey(): string {
    return `cash-drawer-history-${this.restaurantId ?? 'unknown'}`;
  }

  constructor() {
    this.restoreFromStorage();
  }

  openDrawer(openingFloat: number): void {
    const performer = this.authService.user()?.email ?? 'unknown';
    const session: CashDrawerSession = {
      id: crypto.randomUUID(),
      restaurantId: this.restaurantId ?? undefined,
      openedAt: new Date(),
      openedBy: performer,
      openingFloat,
      events: [{
        id: crypto.randomUUID(),
        type: 'opening_float',
        amount: openingFloat,
        reason: 'Opening float',
        performedBy: performer,
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

  recordPaidOut(amount: number, reason: string): void {
    this.addEvent('paid_out', amount, reason);
  }

  recordDropToSafe(amount: number): void {
    this.addEvent('drop_to_safe', amount, 'Cash drop to safe');
  }

  recordTipPayout(amount: number, reason: string): void {
    this.addEvent('tip_payout', amount, reason);
  }

  recordPettyCash(amount: number, reason: string): void {
    this.addEvent('petty_cash', amount, reason);
  }

  closeDrawer(actualCash: number, denomination?: CashDenomination): void {
    const session = this._session();
    if (!session) return;

    const expected = this.runningBalance();
    const overShort = actualCash - expected;
    const closedBy = this.authService.user()?.email ?? 'unknown';

    const closedSession: CashDrawerSession = {
      ...session,
      closedAt: new Date(),
      expectedCash: expected,
      actualCash,
      overShort,
      closedBy,
      denomination,
    };

    this._session.set(closedSession);
    this._isOpen.set(false);
    this.persist();
    this.addToHistory(closedSession);
  }

  closeDrawerWithDenomination(denomination: CashDenomination): void {
    const total = calculateDenominationTotal(denomination);
    this.closeDrawer(Math.round(total * 100) / 100, denomination);
  }

  clearSession(): void {
    this._session.set(null);
    this._isOpen.set(false);
    localStorage.removeItem(this.storageKey);
  }

  loadSessionHistory(): void {
    this._isLoadingHistory.set(true);
    try {
      const stored = localStorage.getItem(this.historyKey);
      if (stored) {
        const raw = JSON.parse(stored) as unknown[];
        const sessions = (raw as Record<string, unknown>[])
          .map(r => this.deserializeSession(r))
          .filter((s): s is CashDrawerSession => s !== null);
        this._sessionHistory.set(sessions);
      }
    } catch {
      // Ignore corrupted storage
    }
    this._isLoadingHistory.set(false);
  }

  private addToHistory(session: CashDrawerSession): void {
    const history = [...this._sessionHistory(), session];
    this._sessionHistory.set(history);
    try {
      localStorage.setItem(this.historyKey, JSON.stringify(history));
    } catch {
      // Storage quota exceeded — trim oldest
      const trimmed = history.slice(-50);
      localStorage.setItem(this.historyKey, JSON.stringify(trimmed));
    }
  }

  private buildReconciliation(s: CashDrawerSession): CashReconciliation {
    const cashSales = s.events
      .filter(e => e.type === 'cash_sale')
      .reduce((sum, e) => sum + e.amount, 0);
    const cashOut = s.events
      .filter(e => !isCashInflow(e.type))
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      sessionId: s.id,
      openedAt: s.openedAt,
      closedAt: s.closedAt!,
      openedBy: s.openedBy,
      closedBy: s.closedBy ?? 'unknown',
      openingFloat: s.openingFloat,
      expectedCash: s.expectedCash,
      actualCash: s.actualCash ?? 0,
      overShort: s.overShort ?? 0,
      cashSalesTotal: cashSales,
      cashOutTotal: cashOut,
      eventCount: s.events.length,
    };
  }

  private restoreFromStorage(): void {
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
    this.loadSessionHistory();
  }

  private persist(): void {
    const session = this._session();
    if (!session) return;
    localStorage.setItem(this.storageKey, JSON.stringify(session));
  }

  private deserializeSession(raw: Record<string, unknown>): CashDrawerSession | null {
    if (!raw?.id) return null;
    return {
      ...(raw as unknown as CashDrawerSession),
      openedAt: new Date(raw['openedAt'] as string),
      closedAt: raw['closedAt'] ? new Date(raw['closedAt'] as string) : undefined,
      openedBy: (raw['openedBy'] as string) ?? (raw['closedBy'] as string) ?? 'unknown',
      events: ((raw['events'] as Record<string, unknown>[]) ?? []).map(e => ({
        ...(e as unknown as CashEvent),
        timestamp: new Date(e['timestamp'] as string),
      })),
    };
  }
}
