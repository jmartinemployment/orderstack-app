import { loadStripe, Stripe, StripeElements, StripePaymentElement } from '@stripe/stripe-js';
import {
  PaymentProvider,
  PaymentContext,
  PaymentCreateResult,
  PaymentIntentResponse,
  RefundResponse,
} from '../../models/payment.model';
import { environment } from '@environments/environment';

export class StripePaymentProvider implements PaymentProvider {
  readonly type = 'stripe' as const;

  private stripeInstance: Stripe | null = null;
  private elements: StripeElements | null = null;
  private paymentElement: StripePaymentElement | null = null;
  private clientSecret: string | null = null;
  private storedContext: PaymentContext | null = null;

  private buildHeaders(ctx: PaymentContext): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (ctx.authToken) {
      headers['Authorization'] = `Bearer ${ctx.authToken}`;
    }
    return headers;
  }

  async createPayment(orderId: string, _amount: number, context: PaymentContext): Promise<PaymentCreateResult> {
    this.storedContext = context;

    if (environment.stripePublishableKey.includes('placeholder')) {
      throw new Error('Stripe publishable key not configured — replace pk_test_placeholder in environment files');
    }

    if (!this.stripeInstance) {
      this.stripeInstance = await loadStripe(environment.stripePublishableKey);
    }

    if (!this.stripeInstance) {
      throw new Error('Failed to load Stripe');
    }

    const response = await fetch(
      `${context.apiUrl}/merchant/${context.merchantId}/orders/${orderId}/payment-intent`,
      { method: 'POST', headers: this.buildHeaders(context), body: '{}' }
    );

    if (!response.ok) {
      throw new Error('Failed to create payment intent');
    }

    const data: PaymentIntentResponse = await response.json();
    this.clientSecret = data.clientSecret;

    return {
      paymentId: data.paymentIntentId,
      clientToken: data.clientSecret,
    };
  }

  async mountPaymentUI(container: HTMLElement): Promise<boolean> {
    if (!this.stripeInstance || !this.clientSecret) {
      return false;
    }

    this.elements = this.stripeInstance.elements({
      clientSecret: this.clientSecret,
      appearance: {
        theme: 'night',
        variables: {
          colorPrimary: '#7E5EF2',
          colorBackground: '#03020D',
          colorText: '#ffffff',
          colorDanger: '#dc3545',
          borderRadius: '0.375rem',
          fontFamily: 'inherit',
        },
      },
    });

    this.paymentElement = this.elements.create('payment');
    this.paymentElement.mount(container);
    return true;
  }

  async confirmPayment(): Promise<boolean> {
    if (!this.stripeInstance || !this.elements) {
      throw new Error('Payment not initialized');
    }

    const { error } = await this.stripeInstance.confirmPayment({
      elements: this.elements,
      confirmParams: {
        return_url: globalThis.location.href,
      },
      redirect: 'if_required',
    });

    if (error) {
      throw new Error(error.message ?? 'Payment failed');
    }

    return true;
  }

  async cancelPayment(orderId: string, context: PaymentContext): Promise<boolean> {
    const ctx = context ?? this.storedContext;
    if (!ctx) return false;

    const response = await fetch(
      `${ctx.apiUrl}/merchant/${ctx.merchantId}/orders/${orderId}/cancel-payment`,
      { method: 'POST', headers: this.buildHeaders(ctx), body: '{}' }
    );

    return response.ok;
  }

  async requestRefund(orderId: string, context: PaymentContext, amount?: number): Promise<RefundResponse | null> {
    const ctx = context ?? this.storedContext;
    if (!ctx) return null;

    const body = amount !== undefined ? JSON.stringify({ amount }) : '{}';
    const response = await fetch(
      `${ctx.apiUrl}/merchant/${ctx.merchantId}/orders/${orderId}/refund`,
      { method: 'POST', headers: this.buildHeaders(ctx), body }
    );

    if (!response.ok) return null;
    return response.json();
  }

  destroy(): void {
    this.paymentElement?.destroy();
    this.paymentElement = null;
    this.elements = null;
    this.clientSecret = null;
    this.storedContext = null;
  }
}
