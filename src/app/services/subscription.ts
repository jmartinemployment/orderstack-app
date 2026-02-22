import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Subscription, SubscriptionStatus, CancellationFeedback } from '../models';
import { AuthService } from './auth';
import { environment } from '@environments/environment';

/**
 * STUBBED — API endpoints for subscription management do not exist yet.
 * This service uses mock data for the current subscription state.
 * Connect to real billing API (Stripe) when backend endpoints are built.
 */
@Injectable({
  providedIn: 'root',
})
export class SubscriptionService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  private readonly _subscription = signal<Subscription | null>(null);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly subscription = this._subscription.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly status = computed<SubscriptionStatus>(() => {
    const sub = this._subscription();
    if (!sub) return 'trialing';
    return sub.status;
  });

  readonly isTrial = computed(() => this.status() === 'trialing');
  readonly isCanceled = computed(() => {
    const sub = this._subscription();
    return sub?.status === 'canceled' || sub?.cancelAtPeriodEnd === true;
  });

  readonly trialDaysRemaining = computed(() => {
    const sub = this._subscription();
    if (!sub?.trialEnd) return 0;
    const end = new Date(sub.trialEnd);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  });

  readonly trialProgress = computed(() => {
    const sub = this._subscription();
    if (!sub?.trialStart || !sub?.trialEnd) return 0;
    const start = new Date(sub.trialStart).getTime();
    const end = new Date(sub.trialEnd).getTime();
    const now = Date.now();
    const total = end - start;
    if (total <= 0) return 100;
    return Math.min(100, Math.round(((now - start) / total) * 100));
  });

  readonly formattedAmount = computed(() => {
    const sub = this._subscription();
    if (!sub || sub.amountCents === 0) return 'Free';
    const dollars = sub.amountCents / 100;
    const suffix = sub.interval === 'year' ? '/yr' : '/mo';
    return `$${dollars}${suffix}`;
  });

  private get restaurantId(): string {
    return this.authService.selectedRestaurantId() ?? '';
  }

  async loadSubscription(): Promise<void> {
    if (!this.restaurantId) return;
    if (this._subscription() !== null) return;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const sub = await firstValueFrom(
        this.http.get<Subscription>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/subscription`
        )
      );
      this._subscription.set(sub);
    } catch {
      // STUBBED — API not available, load mock trial subscription
      this.loadMockSubscription();
    } finally {
      this._isLoading.set(false);
    }
  }

  async cancelSubscription(feedback: CancellationFeedback): Promise<boolean> {
    if (!this.restaurantId) return false;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const updated = await firstValueFrom(
        this.http.post<Subscription>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/subscription/cancel`,
          feedback
        )
      );
      this._subscription.set(updated);
      return true;
    } catch {
      // STUBBED — simulate cancellation locally
      const current = this._subscription();
      if (current) {
        this._subscription.set({
          ...current,
          status: 'canceled',
          cancelAtPeriodEnd: true,
          canceledAt: new Date().toISOString(),
        });
      }
      return true;
    } finally {
      this._isLoading.set(false);
    }
  }

  async extendTrial(): Promise<boolean> {
    if (!this.restaurantId) return false;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const updated = await firstValueFrom(
        this.http.post<Subscription>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/subscription/extend-trial`,
          {}
        )
      );
      this._subscription.set(updated);
      return true;
    } catch {
      // STUBBED — simulate 30-day extension locally
      const current = this._subscription();
      if (current?.trialEnd) {
        const newEnd = new Date(current.trialEnd);
        newEnd.setDate(newEnd.getDate() + 30);
        this._subscription.set({
          ...current,
          trialEnd: newEnd.toISOString(),
          currentPeriodEnd: newEnd.toISOString(),
        });
      }
      return true;
    } finally {
      this._isLoading.set(false);
    }
  }

  async applyDiscount(): Promise<boolean> {
    if (!this.restaurantId) return false;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const updated = await firstValueFrom(
        this.http.post<Subscription>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/subscription/apply-discount`,
          { discountPercent: 50, durationMonths: 3 }
        )
      );
      this._subscription.set(updated);
      return true;
    } catch {
      // STUBBED — simulate discount locally
      const current = this._subscription();
      if (current) {
        this._subscription.set({
          ...current,
          amountCents: Math.round(current.amountCents / 2),
        });
      }
      return true;
    } finally {
      this._isLoading.set(false);
    }
  }

  private loadMockSubscription(): void {
    const now = new Date();
    const trialStart = new Date(now);
    trialStart.setDate(trialStart.getDate() - 5);
    const trialEnd = new Date(trialStart);
    trialEnd.setDate(trialEnd.getDate() + 14);

    this._subscription.set({
      id: 'sub_mock_trial',
      restaurantId: this.restaurantId,
      planName: 'OrderStack Pro',
      status: 'trialing',
      currentPeriodStart: trialStart.toISOString(),
      currentPeriodEnd: trialEnd.toISOString(),
      trialStart: trialStart.toISOString(),
      trialEnd: trialEnd.toISOString(),
      cancelAtPeriodEnd: false,
      amountCents: 7900,
      interval: 'month',
    });
  }
}
