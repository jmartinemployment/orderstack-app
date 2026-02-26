import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@services/auth';

export const authGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  return false;
};
