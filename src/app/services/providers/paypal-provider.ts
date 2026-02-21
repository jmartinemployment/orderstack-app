import { loadScript, PayPalNamespace } from '@paypal/paypal-js';
import {
  PaymentProvider,
  PaymentContext,
  PaymentCreateResult,
  RefundResponse,
} from '../../models/payment.model';
import { environment } from '@environments/environment';

export class PayPalPaymentProvider implements PaymentProvider {
  readonly type = 'paypal' as const;

  private paypalInstance: PayPalNamespace | null = null;
  private paypalOrderId: string | null = null;
  private storedContext: PaymentContext | null = null;
  private storedOrderId: string | null = null;

  // Promise-based confirm flow: confirmPayment() blocks until onApprove fires
  private resolveConfirm: ((value: boolean) => void) | null = null;
  private rejectConfirm: ((reason: Error) => void) | null = null;
  private paypalApproved = false;

  async createPayment(orderId: string, _amount: number, context: PaymentContext): Promise<PaymentCreateResult> {
    this.storedContext = context;
    this.storedOrderId = orderId;
    this.paypalApproved = false;

    if (environment.paypalClientId === 'sb') {
      // Sandbox mode — allowed but warn in console
      console.warn('PayPal is running in sandbox mode');
    }

    const response = await fetch(
      `${context.apiUrl}/restaurant/${context.restaurantId}/orders/${orderId}/paypal-create`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }
    );

    if (!response.ok) {
      throw new Error('Failed to create PayPal order');
    }

    const data = await response.json();
    this.paypalOrderId = data.paypalOrderId;

    return {
      paymentId: data.paypalOrderId,
    };
  }

  async mountPaymentUI(container: HTMLElement): Promise<boolean> {
    if (!this.paypalOrderId || !this.storedContext || !this.storedOrderId) {
      return false;
    }

    if (!this.paypalInstance) {
      this.paypalInstance = await loadScript({
        clientId: environment.paypalClientId,
        currency: 'USD',
        intent: 'capture',
      });
    }

    if (!this.paypalInstance?.Buttons) {
      return false;
    }

    const context = this.storedContext;
    const orderId = this.storedOrderId;
    const paypalOrderId = this.paypalOrderId;

    const buttons = this.paypalInstance.Buttons({
      createOrder: async () => paypalOrderId,
      onApprove: async () => {
        // Capture payment on the backend
        const captureResponse = await fetch(
          `${context.apiUrl}/restaurant/${context.restaurantId}/orders/${orderId}/paypal-capture`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }
        );

        if (!captureResponse.ok) {
          const err = new Error('PayPal capture failed');
          if (this.rejectConfirm) {
            this.rejectConfirm(err);
            this.resolveConfirm = null;
            this.rejectConfirm = null;
          }
          throw err;
        }

        this.paypalApproved = true;
        if (this.resolveConfirm) {
          this.resolveConfirm(true);
          this.resolveConfirm = null;
          this.rejectConfirm = null;
        }
      },
      onCancel: () => {
        if (this.rejectConfirm) {
          this.rejectConfirm(new Error('Payment cancelled by customer'));
          this.resolveConfirm = null;
          this.rejectConfirm = null;
        }
      },
      onError: (err: Record<string, unknown>) => {
        const error = new Error(String(err['message'] ?? 'PayPal error'));
        if (this.rejectConfirm) {
          this.rejectConfirm(error);
          this.resolveConfirm = null;
          this.rejectConfirm = null;
        }
      },
    });

    if (buttons) {
      await buttons.render(container);
    }

    return true;
  }

  async confirmPayment(): Promise<boolean> {
    // If onApprove already fired before confirmPayment() was called
    if (this.paypalApproved) {
      return true;
    }

    return new Promise<boolean>((resolve, reject) => {
      this.resolveConfirm = resolve;
      this.rejectConfirm = reject;
    });
  }

  async cancelPayment(orderId: string, context: PaymentContext): Promise<boolean> {
    const ctx = context ?? this.storedContext;
    if (!ctx) return false;

    const response = await fetch(
      `${ctx.apiUrl}/restaurant/${ctx.restaurantId}/orders/${orderId}/cancel-payment`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }
    );

    return response.ok;
  }

  async requestRefund(orderId: string, context: PaymentContext, amount?: number): Promise<RefundResponse | null> {
    const ctx = context ?? this.storedContext;
    if (!ctx) return null;

    const body = amount !== undefined ? JSON.stringify({ amount }) : '{}';
    const response = await fetch(
      `${ctx.apiUrl}/restaurant/${ctx.restaurantId}/orders/${orderId}/refund`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }
    );

    if (!response.ok) return null;
    return response.json();
  }

  destroy(): void {
    this.paypalOrderId = null;
    this.storedContext = null;
    this.storedOrderId = null;
    this.paypalApproved = false;

    if (this.rejectConfirm) {
      this.rejectConfirm(new Error('Payment provider destroyed'));
      this.resolveConfirm = null;
      this.rejectConfirm = null;
    }
  }
}
