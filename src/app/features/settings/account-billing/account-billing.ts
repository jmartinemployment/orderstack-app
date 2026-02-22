import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { SubscriptionService } from '@services/subscription';
import { CancelSubscription } from '../cancel-subscription';

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

  readonly showCancelModal = signal(false);

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

  ngOnInit(): void {
    this.subscriptionService.loadSubscription();
  }

  openCancelModal(): void {
    this.showCancelModal.set(true);
  }

  closeCancelModal(): void {
    this.showCancelModal.set(false);
  }
}
