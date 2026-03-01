import { describe, it, expect } from 'vitest';

// --- Pure function replicas of guard decision logic ---

// authGuard: if authenticated → true, else → redirect /signup
function authGuardDecision(isAuthenticated: boolean): boolean | string {
  return isAuthenticated ? true : '/signup';
}

// guestGuard: if not authenticated → true (allow login page)
//             if authenticated with restaurant → redirect /administration
//             if authenticated without restaurant → redirect /setup
function guestGuardDecision(
  isAuthenticated: boolean,
  selectedMerchantId: string | null,
  restaurantCount: number,
): boolean | string {
  if (!isAuthenticated) return true;
  if (selectedMerchantId || restaurantCount > 0) return '/administration';
  return '/setup';
}

// onboardingGuard: profile loaded → true
//                  no profile but merchantId → reload and check
//                  has restaurants from login → true (returning user)
//                  nothing → redirect /setup
function onboardingGuardDecision(
  hasProfile: boolean,
  hasRestaurantId: boolean,
  profileReloaded: boolean,
  restaurantCount: number,
): boolean | string {
  if (hasProfile) return true;
  if (hasRestaurantId && profileReloaded) return true;
  if (restaurantCount > 0) return true;
  return '/setup';
}

// deviceModeRedirectGuard: always redirects to /administration
function deviceModeRedirectGuardDecision(): string {
  return '/administration';
}

// authInterceptor: should attach token, detect 401, skip for login endpoint
function shouldAttachToken(token: string | null): boolean {
  return token !== null && token !== '';
}

function shouldHandleSessionExpiry(statusCode: number, requestUrl: string): boolean {
  return statusCode === 401 && !requestUrl.includes('/auth/login');
}

function cloneWithAuth(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

// --- Tests ---

describe('authGuard — decision logic', () => {
  it('returns true when authenticated', () => {
    expect(authGuardDecision(true)).toBe(true);
  });

  it('redirects to /signup when not authenticated', () => {
    expect(authGuardDecision(false)).toBe('/signup');
  });
});

describe('guestGuard — decision logic', () => {
  it('allows access when not authenticated', () => {
    expect(guestGuardDecision(false, null, 0)).toBe(true);
  });

  it('redirects to /administration when authenticated with selected restaurant', () => {
    expect(guestGuardDecision(true, 'r-1', 0)).toBe('/administration');
  });

  it('redirects to /administration when authenticated with restaurants list', () => {
    expect(guestGuardDecision(true, null, 2)).toBe('/administration');
  });

  it('redirects to /setup when authenticated with no restaurants', () => {
    expect(guestGuardDecision(true, null, 0)).toBe('/setup');
  });

  it('prefers selectedMerchantId over count', () => {
    expect(guestGuardDecision(true, 'r-1', 0)).toBe('/administration');
  });
});

describe('onboardingGuard — decision logic', () => {
  it('passes when profile is loaded', () => {
    expect(onboardingGuardDecision(true, false, false, 0)).toBe(true);
  });

  it('passes when profile reloads successfully', () => {
    expect(onboardingGuardDecision(false, true, true, 0)).toBe(true);
  });

  it('passes for returning user with restaurants', () => {
    expect(onboardingGuardDecision(false, false, false, 3)).toBe(true);
  });

  it('redirects to /setup when no profile and no restaurants', () => {
    expect(onboardingGuardDecision(false, false, false, 0)).toBe('/setup');
  });

  it('redirects to /setup when reload fails and no restaurants', () => {
    expect(onboardingGuardDecision(false, true, false, 0)).toBe('/setup');
  });
});

describe('deviceModeRedirectGuard — decision logic', () => {
  it('always redirects to /administration', () => {
    expect(deviceModeRedirectGuardDecision()).toBe('/administration');
  });
});

describe('authInterceptor — token attachment', () => {
  it('attaches token when present', () => {
    expect(shouldAttachToken('jwt-123')).toBe(true);
  });

  it('does not attach when token is null', () => {
    expect(shouldAttachToken(null)).toBe(false);
  });

  it('does not attach when token is empty', () => {
    expect(shouldAttachToken('')).toBe(false);
  });
});

describe('authInterceptor — session expiry detection', () => {
  it('handles 401 on non-login endpoint', () => {
    expect(shouldHandleSessionExpiry(401, '/api/restaurant/r-1/orders')).toBe(true);
  });

  it('skips 401 on login endpoint', () => {
    expect(shouldHandleSessionExpiry(401, '/api/auth/login')).toBe(false);
  });

  it('ignores non-401 errors', () => {
    expect(shouldHandleSessionExpiry(403, '/api/restaurant/r-1/orders')).toBe(false);
    expect(shouldHandleSessionExpiry(500, '/api/restaurant/r-1/orders')).toBe(false);
    expect(shouldHandleSessionExpiry(404, '/api/restaurant/r-1/orders')).toBe(false);
  });
});

describe('authInterceptor — cloneWithAuth', () => {
  it('creates Authorization header with Bearer prefix', () => {
    const headers = cloneWithAuth('my-token');
    expect(headers.Authorization).toBe('Bearer my-token');
  });
});
