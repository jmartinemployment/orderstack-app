import { inject } from '@angular/core';
import { ResolveFn, Router } from '@angular/router';
import { DeviceService } from '@services/device';
import { PlatformService } from '@services/platform';
import { AuthService } from '@services/auth';

export const deviceInitResolver: ResolveFn<boolean> = async () => {
  const deviceService = inject(DeviceService);
  const platformService = inject(PlatformService);
  const authService = inject(AuthService);
  const router = inject(Router);

  // Ensure restaurantId is set before loading anything
  if (!authService.selectedRestaurantId()) {
    const restaurants = authService.restaurants();

    if (restaurants.length === 0) {
      router.navigate(['/setup']);
      return false;
    }

    if (restaurants.length === 1) {
      const r = restaurants[0];
      authService.selectRestaurant(r.id, r.name);
    } else {
      router.navigate(['/select-restaurant']);
      return false;
    }
  }

  // Load merchant profile and device state in parallel
  await Promise.all([
    platformService.loadMerchantProfile(),
    deviceService.resolveCurrentDevice(),
  ]);

  const posMode = deviceService.currentDevicePosMode();
  if (posMode) {
    platformService.setDeviceModeFromDevice(posMode);
  }

  return true;
};
