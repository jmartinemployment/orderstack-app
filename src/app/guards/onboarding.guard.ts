import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { PlatformService } from '@services/platform';
import { AuthService } from '@services/auth';

export const onboardingGuard = async () => {
  const platform = inject(PlatformService);
  const authService = inject(AuthService);
  const router = inject(Router);

  const profile = platform.merchantProfile();
  if (profile && profile.businessName) {
    return true;
  }

  // Page refresh scenario: profile lost from memory but restaurantId restored from localStorage
  const restaurantId = authService.selectedRestaurantId();
  if (restaurantId) {
    await platform.loadMerchantProfile();
    const reloaded = platform.merchantProfile();
    if (reloaded && reloaded.businessName) {
      return true;
    }
  }

  // Returning user: has restaurants from backend (login response) — skip onboarding
  if (authService.restaurants().length > 0) {
    return true;
  }

  return router.createUrlTree(['/setup']);
};
