import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@services/auth';

/**
 * Redirects already-authenticated users away from login/signup pages.
 * If they have restaurants → /home, otherwise → /setup.
 */
export const guestGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return true; // Not logged in — allow access to login/signup
  }

  // Authenticated — redirect based on whether they have a restaurant
  if (auth.selectedRestaurantId() || auth.restaurants().length > 0) {
    return router.createUrlTree(['/home']);
  }

  return router.createUrlTree(['/setup']);
};
