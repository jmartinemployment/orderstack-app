import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '@environments/environment';
import { AuthService } from './auth';

export type ConnectStatus = 'none' | 'pending' | 'connected';

interface StripeStatusResponse {
  status: ConnectStatus;
  chargesEnabled?: boolean;
  detailsSubmitted?: boolean;
  payoutsEnabled?: boolean;
  accountId?: string;
}

interface PayPalStatusResponse {
  status: ConnectStatus;
  paymentsReceivable?: boolean;
  primaryEmailConfirmed?: boolean;
  merchantId?: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentConnectService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  readonly stripeStatus = signal<ConnectStatus>('none');
  readonly paypalStatus = signal<ConnectStatus>('none');
  readonly isConnecting = signal(false);
  readonly error = signal<string | null>(null);

  private get merchantId(): string {
    return this.authService.selectedMerchantId() ?? '';
  }

  // --- Stripe Connect ---

  async startStripeConnect(): Promise<string | null> {
    const rid = this.merchantId;
    if (!rid) return null;

    this.isConnecting.set(true);
    this.error.set(null);

    try {
      // Step 1: Create account
      const createRes = await firstValueFrom(
        this.http.post<{ accountId: string }>(`${this.apiUrl}/merchant/${rid}/connect/stripe/create-account`, {}),
      );

      // Step 2: Get account link URL
      const linkRes = await firstValueFrom(
        this.http.post<{ url: string }>(`${this.apiUrl}/merchant/${rid}/connect/stripe/account-link`, {
          returnUrl: `${window.location.origin}/setup?stripe=complete`,
          refreshUrl: `${window.location.origin}/setup?stripe=refresh`,
        }),
      );

      this.stripeStatus.set('pending');
      return linkRes.url;
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Failed to start Stripe Connect');
      return null;
    } finally {
      this.isConnecting.set(false);
    }
  }

  async checkStripeStatus(): Promise<ConnectStatus> {
    const rid = this.merchantId;
    if (!rid) return 'none';

    try {
      const res = await firstValueFrom(
        this.http.get<StripeStatusResponse>(`${this.apiUrl}/merchant/${rid}/connect/stripe/status`),
      );
      this.stripeStatus.set(res.status);
      return res.status;
    } catch {
      return 'none';
    }
  }

  async pollStripeUntilConnected(maxAttempts = 30, intervalMs = 3000): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
      const status = await this.checkStripeStatus();
      if (status === 'connected') return true;
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    return false;
  }

  // --- PayPal Partner Referrals ---

  async startPayPalConnect(): Promise<string | null> {
    const rid = this.merchantId;
    if (!rid) return null;

    this.isConnecting.set(true);
    this.error.set(null);

    try {
      const res = await firstValueFrom(
        this.http.post<{ actionUrl?: string; merchantId?: string; status?: string }>(
          `${this.apiUrl}/merchant/${rid}/connect/paypal/create-referral`, {},
        ),
      );

      if (res.status === 'already_connected') {
        this.paypalStatus.set('connected');
        return null;
      }

      this.paypalStatus.set('pending');
      return res.actionUrl ?? null;
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Failed to start PayPal Connect');
      return null;
    } finally {
      this.isConnecting.set(false);
    }
  }

  async completePayPalConnect(merchantId: string): Promise<boolean> {
    const rid = this.merchantId;
    if (!rid) return false;

    try {
      await firstValueFrom(
        this.http.post(`${this.apiUrl}/merchant/${rid}/connect/paypal/complete`, { merchantId }),
      );
      this.paypalStatus.set('connected');
      return true;
    } catch {
      return false;
    }
  }

  async checkPayPalStatus(): Promise<ConnectStatus> {
    const rid = this.merchantId;
    if (!rid) return 'none';

    try {
      const res = await firstValueFrom(
        this.http.get<PayPalStatusResponse>(`${this.apiUrl}/merchant/${rid}/connect/paypal/status`),
      );
      this.paypalStatus.set(res.status);
      return res.status;
    } catch {
      return 'none';
    }
  }

  async pollPayPalUntilConnected(maxAttempts = 30, intervalMs = 3000): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
      const status = await this.checkPayPalStatus();
      if (status === 'connected') return true;
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    return false;
  }
}
