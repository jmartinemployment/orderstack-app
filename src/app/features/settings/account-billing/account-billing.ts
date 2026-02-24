import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { SubscriptionService } from '@services/subscription';
import { CancelSubscription } from '../cancel-subscription';
import { PLAN_TIERS, PlanTierKey } from '@models/index';

@Component({
  selector: 'os-account-billing',
  imports: [DatePipe, CancelSubscription],
  templateUrl: './account-billing.html',
  styleUrl: './account-billing.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountBilling implements OnInit {
  private readonly subscriptionService = inject(SubscriptionService);

  readonly subscription = this.subscriptionService.subscription;
  readonly status = this.subscriptionService.status;
  readonly isTrial = this.subscriptionService.isTrial;
  readonly isCanceled = this.subscriptionService.isCanceled;
  readonly trialDaysRemaining = this.subscriptionService.trialDaysRemaining;
  readonly trialProgress = this.subscriptionService.trialProgress;
  readonly formattedAmount = this.subscriptionService.formattedAmount;
  readonly isLoading = this.subscriptionService.isLoading;
  readonly currentTier = this.subscriptionService.planTier;

  readonly showCancelModal = signal(false);
  readonly _showPlanComparison = signal(false);
  readonly _billingInterval = signal<'month' | 'year'>('month');

  readonly planTiers = PLAN_TIERS;

  readonly statusLabel = computed(() => {
    switch (this.status()) {
      case 'active': return 'Active';
      case 'trialing': return 'Free Trial';
      case 'canceled': return 'Canceled';
      case 'expired': return 'Expired';
      case 'past_due': return 'Past Due';
      default: return 'Unknown';
    }
  });

  readonly statusClass = computed(() => {
    switch (this.status()) {
      case 'active': return 'bg-success';
      case 'trialing': return 'bg-primary';
      case 'canceled': return 'bg-warning text-dark';
      case 'expired': return 'bg-danger';
      case 'past_due': return 'bg-danger';
      default: return 'bg-secondary';
    }
  });

  readonly annualSavingsPercent = computed(() => {
    // Plus: $49/mo vs $40/mo annual = ~18% savings
    return 18;
  });

  ngOnInit(): void {
    this.subscriptionService.loadSubscription();
  }

  openCancelModal(): void {
    this.showCancelModal.set(true);
  }

  closeCancelModal(): void {
    this.showCancelModal.set(false);
  }

  togglePlanComparison(): void {
    this._showPlanComparison.update(v => !v);
  }

  setBillingInterval(interval: 'month' | 'year'): void {
    this._billingInterval.set(interval);
  }

  formatPrice(tier: typeof PLAN_TIERS[number]): string {
    const interval = this._billingInterval();
    const cents = interval === 'year' ? tier.annualPriceCents : tier.monthlyPriceCents;
    if (cents === 0) return '$0';
    return `$${cents / 100}`;
  }

  isCurrentTier(tierKey: PlanTierKey): boolean {
    return this.currentTier() === tierKey;
  }

  isUpgrade(tierKey: PlanTierKey): boolean {
    const order: PlanTierKey[] = ['free', 'plus', 'premium'];
    return order.indexOf(tierKey) > order.indexOf(this.currentTier());
  }

  async changePlan(tierKey: PlanTierKey): Promise<void> {
    if (this.isCurrentTier(tierKey)) return;
    await this.subscriptionService.changePlan(tierKey);
    this._showPlanComparison.set(false);
  }
}
