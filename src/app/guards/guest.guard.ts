import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@services/auth';

/**
 * Redirects already-authenticated users away from login/signup pages.
 */
export const guestGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return true; // Not logged in — allow access to login/signup
  }

  return router.createUrlTree(['/app/administration']);
};
