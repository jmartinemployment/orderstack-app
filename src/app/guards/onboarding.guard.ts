import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { PlatformService } from '@services/platform';

export const onboardingGuard = () => {
  const platform = inject(PlatformService);
  const router = inject(Router);

  const profile = platform.merchantProfile();
  if (profile && profile.businessName) {
    return true;
  }

  return router.createUrlTree(['/setup']);
};
