import '../test-setup';
import { describe, it, expect } from 'vitest';

const routeSource = (() => {
  const { readFileSync } = require('node:fs');
  const { resolve } = require('node:path');
  return readFileSync(resolve(__dirname, 'app.routes.ts'), 'utf-8');
})();

/**
 * BUG-34: Wildcard catch-all under /app children prevents blank pages.
 */
describe('BUG-34 — /app wildcard route and legacy redirects', () => {
  it('has a wildcard catch-all route in the /app children', () => {
    // The wildcard must redirect to administration
    expect(routeSource).toContain("path: '**', redirectTo: 'administration'");
  });

  it('wildcard appears AFTER the empty-path default redirect', () => {
    const defaultIdx = routeSource.indexOf("path: '', redirectTo: 'administration'");
    const wildcardIdx = routeSource.indexOf("path: '**', redirectTo: 'administration'");
    expect(defaultIdx).toBeGreaterThan(-1);
    expect(wildcardIdx).toBeGreaterThan(-1);
    expect(wildcardIdx).toBeGreaterThan(defaultIdx);
  });

  it('has /app/home redirect to administration', () => {
    expect(routeSource).toContain("path: 'home', redirectTo: 'administration'");
  });

  it('has /app/pos redirect to top-level /pos', () => {
    expect(routeSource).toContain("path: 'pos', redirectTo: '/pos'");
  });

  it('has /app/kds redirect to top-level /kds', () => {
    expect(routeSource).toContain("path: 'kds', redirectTo: '/kds'");
  });

  it('has /app/kiosk redirect to top-level /kiosk', () => {
    expect(routeSource).toContain("path: 'kiosk', redirectTo: '/kiosk'");
  });

  it('top-level /pos route exists', () => {
    expect(routeSource).toContain("path: 'pos',");
  });

  it('top-level /kds route exists', () => {
    expect(routeSource).toContain("path: 'kds',");
  });

  it('top-level /kiosk route exists', () => {
    expect(routeSource).toContain("path: 'kiosk',");
  });
});
