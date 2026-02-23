import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { OrderService } from '@services/order';
import { Check, ScanToPaySession, ScanToPayStatus } from '@models/index';

type PageState = 'loading' | 'check' | 'paying' | 'success' | 'error';

@Component({
  selector: 'os-scan-to-pay',
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl: './scan-to-pay.html',
  styleUrl: './scan-to-pay.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScanToPay implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly orderService = inject(OrderService);

  // State
  private readonly _pageState = signal<PageState>('loading');
  private readonly _session = signal<(ScanToPaySession & { check: Check; restaurantName: string; restaurantLogo?: string }) | null>(null);
  private readonly _errorMessage = signal('');
  private readonly _receiptNumber = signal('');

  // Tip
  private readonly _tipPercent = signal(20);
  private readonly _customTipAmount = signal<number | null>(null);
  private readonly _showCustomTip = signal(false);

  // Payment
  private readonly _cardNumber = signal('');
  private readonly _cardExpiry = signal('');
  private readonly _cardCvc = signal('');
  private readonly _cardName = signal('');
  private readonly _isProcessing = signal(false);

  readonly pageState = this._pageState.asReadonly();
  readonly session = this._session.asReadonly();
  readonly errorMessage = this._errorMessage.asReadonly();
  readonly receiptNumber = this._receiptNumber.asReadonly();
  readonly tipPercent = this._tipPercent.asReadonly();
  readonly customTipAmount = this._customTipAmount.asReadonly();
  readonly showCustomTip = this._showCustomTip.asReadonly();
  readonly cardNumber = this._cardNumber.asReadonly();
  readonly cardExpiry = this._cardExpiry.asReadonly();
  readonly cardCvc = this._cardCvc.asReadonly();
  readonly cardName = this._cardName.asReadonly();
  readonly isProcessing = this._isProcessing.asReadonly();

  readonly tipPresets = [15, 18, 20, 25];

  readonly subtotal = computed(() => this._session()?.check.subtotal ?? 0);
  readonly taxAmount = computed(() => this._session()?.check.taxAmount ?? 0);

  readonly tipAmount = computed(() => {
    if (this._customTipAmount() !== null) return this._customTipAmount()!;
    return Math.round(this.subtotal() * this._tipPercent() / 100 * 100) / 100;
  });

  readonly totalWithTip = computed(() => {
    const s = this._session();
    if (!s) return 0;
    return s.check.subtotal + s.check.taxAmount + this.tipAmount();
  });

  readonly restaurantName = computed(() => this._session()?.restaurantName ?? '');
  readonly restaurantLogo = computed(() => this._session()?.restaurantLogo);

  readonly canPay = computed(() => {
    return this._cardNumber().length >= 15 &&
      this._cardExpiry().length >= 5 &&
      this._cardCvc().length >= 3 &&
      this._cardName().trim().length > 0 &&
      !this._isProcessing();
  });

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('checkToken');
    if (!token) {
      this._errorMessage.set('Invalid payment link');
      this._pageState.set('error');
      return;
    }
    this.loadCheck(token);
  }

  private async loadCheck(token: string): Promise<void> {
    const result = await this.orderService.getCheckByToken(token);

    if (!result) {
      this._errorMessage.set('This payment link is invalid or has expired.');
      this._pageState.set('error');
      return;
    }

    if (result.status === 'completed') {
      this._errorMessage.set('This check has already been paid.');
      this._pageState.set('error');
      return;
    }

    if (result.status === 'expired') {
      this._errorMessage.set('This payment link has expired. Please ask your server for a new one.');
      this._pageState.set('error');
      return;
    }

    this._session.set(result);
    this._pageState.set('check');
  }

  selectTipPercent(percent: number): void {
    this._tipPercent.set(percent);
    this._customTipAmount.set(null);
    this._showCustomTip.set(false);
  }

  openCustomTip(): void {
    this._showCustomTip.set(true);
    this._customTipAmount.set(null);
  }

  setCustomTipAmount(value: string): void {
    const amount = Number.parseFloat(value);
    if (!Number.isNaN(amount) && amount >= 0) {
      this._customTipAmount.set(Math.round(amount * 100) / 100);
    } else {
      this._customTipAmount.set(null);
    }
  }

  setCardNumber(value: string): void {
    this._cardNumber.set(value.replaceAll(/[^\d\s]/g, '').slice(0, 19));
  }

  setCardExpiry(value: string): void {
    let clean = value.replaceAll(/[^\d/]/g, '');
    if (clean.length === 2 && !clean.includes('/') && this._cardExpiry().length < 3) {
      clean += '/';
    }
    this._cardExpiry.set(clean.slice(0, 5));
  }

  setCardCvc(value: string): void {
    this._cardCvc.set(value.replaceAll(/\D/g, '').slice(0, 4));
  }

  setCardName(value: string): void {
    this._cardName.set(value);
  }

  async submitPayment(): Promise<void> {
    const token = this.route.snapshot.paramMap.get('checkToken');
    if (!token || this._isProcessing()) return;

    this._isProcessing.set(true);
    this._pageState.set('paying');

    const result = await this.orderService.submitScanToPayment(token, {
      tipAmount: this.tipAmount(),
      paymentMethodNonce: `card_${this._cardNumber().replaceAll(' ', '').slice(-4)}`,
    });

    this._isProcessing.set(false);

    if (result.success) {
      this._receiptNumber.set(result.receiptNumber ?? '');
      this._pageState.set('success');
    } else {
      this._errorMessage.set(result.error ?? 'Payment failed. Please try again.');
      this._pageState.set('check');
    }
  }
}
