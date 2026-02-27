import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '@services/auth';

// Public routes that should not attach auth tokens or trigger session expiry
const PUBLIC_ROUTE_PATTERNS = ['/kiosk/', '/order/', '/shop/', '/pay/'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.token();
  const currentPath = globalThis.location?.pathname ?? '';
  const isPublicRoute = PUBLIC_ROUTE_PATTERNS.some(p => currentPath.startsWith(p));

  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !req.url.includes('/auth/login') && !isPublicRoute) {
        authService.handleSessionExpired();
      }
      return throwError(() => err);
    })
  );
};
