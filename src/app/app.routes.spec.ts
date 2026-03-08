import { describe, it, expect } from 'vitest';

/**
 * BUG-17: /app/dashboard must redirect to /app/administration.
 *
 * Cannot import `routes` directly because guard imports trigger Angular JIT
 * compilation. Instead we read the route file as text and verify the redirect
 * entries exist — same pure-function strategy used in guards.spec.ts.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const routeSource = readFileSync(resolve(__dirname, 'app.routes.ts'), 'utf-8');

describe('app.routes — dashboard redirect (BUG-17)', () => {
  it('top-level /dashboard redirects to /app/administration', () => {
    expect(routeSource).toContain("{ path: 'dashboard', redirectTo: '/app/administration', pathMatch: 'full' }");
  });

  it('child /app/dashboard redirects to administration', () => {
    expect(routeSource).toContain("{ path: 'dashboard', redirectTo: 'administration', pathMatch: 'full' }");
  });

  it('/app/administration route is registered', () => {
    expect(routeSource).toContain("path: 'administration'");
    expect(routeSource).toContain("home-dashboard/home-dashboard");
  });
});

describe('NAVIGATION_ITEMS — dashboard route (BUG-17)', () => {
  const modelSource = readFileSync(resolve(__dirname, 'models/platform.model.ts'), 'utf-8');

  it('Dashboard nav item uses /administration route', () => {
    expect(modelSource).toContain("route: '/administration'");
    expect(modelSource).not.toContain("route: '/dashboard'");
  });
});
