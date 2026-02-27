import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  input,
  output,
  viewChild,
  ElementRef,
  computed,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { PaymentService } from '@services/payment';
import { AuthService } from '@services/auth';

type PaymentTerminalState = 'idle' | 'screen-pay' | 'reader-connecting' | 'reader-waiting' | 'processing' | 'success' | 'failed';

@Component({
  selector: 'os-payment-terminal',
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl: './payment-terminal.html',
  styleUrl: './payment-terminal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentTerminal {
  private readonly paymentService = inject(PaymentService);
  private readonly authService = inject(AuthService);

  readonly amount = input.required<number>();
  readonly orderId = input.required<string>();
  readonly showOnScreen = input(true);
  readonly showCardReader = input(true);
  readonly paymentComplete = output<void>();
  readonly paymentFailed = output<string>();

  readonly paypalContainer = viewChild<ElementRef>('paypalContainer');
  readonly readerStatusContainer = viewChild<ElementRef>('readerStatusContainer');

  private readonly _state = signal<PaymentTerminalState>('idle');
  private readonly _error = signal<string | null>(null);

  readonly state = this._state.asReadonly();
  readonly error = this._error.asReadonly();

  readonly isIdle = computed(() => this._state() === 'idle');
  readonly isScreenPay = computed(() => this._state() === 'screen-pay');
  readonly isReaderActive = computed(() => {
    const s = this._state();
    return s === 'reader-connecting' || s === 'reader-waiting' || (s === 'processing' && this._selectedMethod === 'reader');
  });
  readonly isProcessing = computed(() => this._state() === 'processing');
  readonly isSuccess = computed(() => this._state() === 'success');
  readonly isFailed = computed(() => this._state() === 'failed');

  private _selectedMethod: 'screen' | 'reader' | null = null;

  async selectOnScreen(): Promise<void> {
    this._selectedMethod = 'screen';
    this._state.set('screen-pay');
    this._error.set(null);

    this.paymentService.setProcessorType('paypal');

    const initiated = await this.paymentService.initiatePayment(this.orderId(), this.amount());
    if (!initiated) {
      this._state.set('failed');
      this._error.set(this.paymentService.error() ?? 'Failed to start payment');
      this.paymentFailed.emit(this._error()!);
      return;
    }

    // Wait a tick for the container to render
    setTimeout(async () => {
      const container = this.paypalContainer()?.nativeElement;
      if (!container) {
        this._state.set('failed');
        this._error.set('Payment UI container not available');
        this.paymentFailed.emit(this._error()!);
        return;
      }

      const mounted = await this.paymentService.mountPaymentUI(container);
      if (!mounted) {
        this._state.set('failed');
        this._error.set('Failed to load payment buttons');
        this.paymentFailed.emit(this._error()!);
        return;
      }

      // PayPal: confirmPayment() blocks until onApprove fires
      try {
        const confirmed = await this.paymentService.confirmPayment();
        if (confirmed) {
          this._state.set('success');
          this.paymentComplete.emit();
        } else {
          this._state.set('failed');
          this._error.set('Payment was not approved');
          this.paymentFailed.emit(this._error()!);
        }
      } catch (err: unknown) {
        this._state.set('failed');
        this._error.set(err instanceof Error ? err.message : 'Payment failed');
        this.paymentFailed.emit(this._error()!);
      }
    });
  }

  async selectCardReader(): Promise<void> {
    this._selectedMethod = 'reader';
    this._state.set('reader-connecting');
    this._error.set(null);

    this.paymentService.setProcessorType('zettle_reader');

    const initiated = await this.paymentService.initiatePayment(this.orderId(), this.amount());
    if (!initiated) {
      this._state.set('failed');
      this._error.set(this.paymentService.error() ?? 'Failed to start payment');
      this.paymentFailed.emit(this._error()!);
      return;
    }

    // Mount status UI into the reader container
    setTimeout(async () => {
      const container = this.readerStatusContainer()?.nativeElement;
      if (container) {
        await this.paymentService.mountPaymentUI(container);
      }

      try {
        const confirmed = await this.paymentService.confirmPayment();
        if (confirmed) {
          this._state.set('success');
          this.paymentComplete.emit();
        } else {
          this._state.set('failed');
          this._error.set('Card payment was not approved');
          this.paymentFailed.emit(this._error()!);
        }
      } catch (err: unknown) {
        this._state.set('failed');
        this._error.set(err instanceof Error ? err.message : 'Card payment failed');
        this.paymentFailed.emit(this._error()!);
      }
    });
  }

  retry(): void {
    this._state.set('idle');
    this._error.set(null);
    this.paymentService.reset();
  }

  cancel(): void {
    this.paymentService.reset();
    this._state.set('idle');
    this._error.set(null);
    this._selectedMethod = null;
  }
}
