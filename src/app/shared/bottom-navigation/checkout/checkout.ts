import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { CheckoutService, CheckoutMode } from '@services/checkout';
import { Checkout } from '../../checkout/checkout';

const ROUTE_CHECKOUT_CONFIG: Record<string, { mode: CheckoutMode; source: string }> = {
  '/register': { mode: 'charge', source: 'register' },
  '/bar': { mode: 'charge', source: 'bar' },
  '/pos': { mode: 'send', source: 'terminal' },
};

@Component({
  selector: 'os-bottom-nav-checkout',
  imports: [Checkout],
  template: `
    <os-checkout
      [mode]="checkoutMode()"
      [orderSource]="checkoutSource()" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomNavCheckout {
  private readonly router = inject(Router);

  readonly checkoutMode = computed<CheckoutMode>(() => {
    const config = ROUTE_CHECKOUT_CONFIG[this.router.url];
    return config?.mode ?? 'charge';
  });

  readonly checkoutSource = computed(() => {
    const config = ROUTE_CHECKOUT_CONFIG[this.router.url];
    return config?.source ?? 'terminal';
  });
}
