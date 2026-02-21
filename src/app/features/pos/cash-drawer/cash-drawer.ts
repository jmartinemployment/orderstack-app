import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { CashDrawerService } from '@services/cash-drawer';
import { CashEventType, getCashEventLabel, isCashInflow } from '@models/cash-drawer.model';

type DrawerView = 'status' | 'open' | 'close' | 'event';

@Component({
  selector: 'os-cash-drawer',
  imports: [CurrencyPipe, DatePipe],
  templateUrl: './cash-drawer.html',
  styleUrl: './cash-drawer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CashDrawer {
  readonly drawerService = inject(CashDrawerService);

  private readonly _view = signal<DrawerView>('status');
  private readonly _openingFloat = signal(200);
  private readonly _actualCash = signal(0);
  private readonly _eventType = signal<CashEventType>('cash_out');
  private readonly _eventAmount = signal(0);
  private readonly _eventReason = signal('');

  readonly view = this._view.asReadonly();
  readonly openingFloat = this._openingFloat.asReadonly();
  readonly actualCash = this._actualCash.asReadonly();
  readonly eventType = this._eventType.asReadonly();
  readonly eventAmount = this._eventAmount.asReadonly();
  readonly eventReason = this._eventReason.asReadonly();

  readonly eventLog = computed(() => {
    const session = this.drawerService.session();
    if (!session) return [];
    return [...session.events].reverse();
  });

  readonly overShortClass = computed(() => {
    const session = this.drawerService.session();
    if (session?.overShort === undefined) return '';
    if (session.overShort > 0) return 'over';
    if (session.overShort < 0) return 'short';
    return 'even';
  });

  showOpenDrawer(): void {
    this._openingFloat.set(200);
    this._view.set('open');
  }

  showCloseDrawer(): void {
    this._actualCash.set(Math.round(this.drawerService.runningBalance() * 100) / 100);
    this._view.set('close');
  }

  showAddEvent(): void {
    this._eventType.set('cash_out');
    this._eventAmount.set(0);
    this._eventReason.set('');
    this._view.set('event');
  }

  cancelView(): void {
    this._view.set('status');
  }

  setOpeningFloat(val: number): void {
    this._openingFloat.set(Math.max(0, val));
  }

  setActualCash(val: number): void {
    this._actualCash.set(Math.max(0, val));
  }

  setEventType(type: CashEventType): void {
    this._eventType.set(type);
  }

  setEventAmount(val: number): void {
    this._eventAmount.set(Math.max(0, val));
  }

  setEventReason(val: string): void {
    this._eventReason.set(val);
  }

  openDrawer(): void {
    this.drawerService.openDrawer(this._openingFloat());
    this._view.set('status');
  }

  closeDrawer(): void {
    this.drawerService.closeDrawer(this._actualCash());
    this._view.set('status');
  }

  submitEvent(): void {
    const type = this._eventType();
    const amount = this._eventAmount();
    const reason = this._eventReason().trim();
    if (amount <= 0 || !reason) return;

    this.drawerService.addEvent(type, amount, reason);
    this._view.set('status');
  }

  startNewSession(): void {
    this.drawerService.clearSession();
    this.showOpenDrawer();
  }

  getEventLabel(type: CashEventType): string {
    return getCashEventLabel(type);
  }

  isInflow(type: CashEventType): boolean {
    return isCashInflow(type);
  }
}
