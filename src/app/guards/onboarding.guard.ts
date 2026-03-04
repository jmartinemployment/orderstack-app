import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { PlatformService } from '@services/platform';
import { AuthService } from '@services/auth';

export const onboardingGuard = async () => {
  const platform = inject(PlatformService);
  const authService = inject(AuthService);
  const router = inject(Router);

  // Fast path: profile already in memory
  const profile = platform.merchantProfile();
  if (profile && profile.businessName) {
    return true;
  }

  // Fast path: user has merchants from login — they completed onboarding
  // Don't block navigation on a cold API call just to confirm this
  if (authService.merchants().length > 0) {
    // Kick off profile load in background — don't await it
    const merchantId = authService.selectedMerchantId();
    if (merchantId) {
      platform.loadMerchantProfile(); // intentionally not awaited
    }
    return true;
  }

  // Page refresh scenario: no merchants in memory, but merchantId in localStorage
  const merchantId = authService.selectedMerchantId();
  if (merchantId) {
    await platform.loadMerchantProfile();
    const reloaded = platform.merchantProfile();
    if (reloaded && reloaded.businessName) {
      return true;
    }
  }

  return router.createUrlTree(['/setup']);
};
