import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { DeviceService } from '@services/device';

export const deviceModeRedirectGuard = () => {
  const deviceService = inject(DeviceService);
  const router = inject(Router);

  if (!deviceService.isCurrentDevicePaired()) {
    return router.createUrlTree(['/device-setup']);
  }

  const posMode = deviceService.currentDevicePosMode();

  switch (posMode) {
    case 'full_service':
      return router.createUrlTree(['/floor-plan']);
    case 'quick_service':
      return router.createUrlTree(['/order-pad']);
    case 'bar':
      return router.createUrlTree(['/pos']);
    case 'bookings':
      return router.createUrlTree(['/reservations']);
    case 'services':
      return router.createUrlTree(['/invoicing']);
    default:
      return router.createUrlTree(['/home']);
  }
};
