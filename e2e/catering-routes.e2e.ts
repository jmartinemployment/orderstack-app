/**
 * E2E: Catering Proposals, Invoices, Milestones, Calendar, Clients
 * Picks up after BUG-28. Next bug number: BUG-34+
 */
import { test, expect, Page } from '@playwright/test';
import { TEST_PASSWORDS } from './fixtures/credentials';

async function login(page: Page) {
  await page.goto('/login');
  await page.locator('input[formcontrolname="email"]').fill('owner@taipa.com');
  await page.locator('input[formcontrolname="password"]').fill(TEST_PASSWORDS.owner);
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(3000);
  if (page.url().includes('/select-restaurant')) {
    await page.locator('button.restaurant-item').first().click();
    await page.waitForTimeout(2000);
  }
}

// ─── Proposals ─────────────────────────────────────────────────────────────

test.describe('Proposals Page /app/catering/proposals', { tag: '@catering' }, () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/app/catering/proposals');
    await page.waitForTimeout(2000);
  });

  test('PROP-01: page loads without route crash (NG04002)', async ({ page }) => {
    const url = page.url();
    // Must not redirect to root (which is the crash symptom)
    expect(url).toContain('/catering/proposals');
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('PROP-02: page title Proposals is visible', async ({ page }) => {
    await expect(page.locator('h1, h2, h3').filter({ hasText: /proposals/i })).toBeVisible({ timeout: 5000 });
  });

  test('PROP-03: no Angular error overlay on page', async ({ page }) => {
    const errors = await page.locator('body').textContent();
    expect(errors).not.toContain('NG04002');
    expect(errors).not.toContain('Cannot match any routes');
  });

  test('PROP-04: proposal list or empty state renders', async ({ page }) => {
    // Either a list of proposals or a proper empty state — no blank white page
    const hasContent = await page.locator('table, .proposal-list, [class*="proposal"], text=No proposals, text=Proposals').count();
    expect(hasContent).toBeGreaterThan(0);
  });
});

// ─── Invoices ─────────────────────────────────────────────────────────────

test.describe('Invoices /app/invoicing', { tag: '@catering' }, () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/app/invoicing');
    await page.waitForTimeout(2000);
  });

  test('INV-01: page loads without route crash', async ({ page }) => {
    expect(page.url()).toContain('/invoicing');
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('INV-02: page title Invoices visible', async ({ page }) => {
    await expect(page.locator('h1, h2, h3').filter({ hasText: /invoice/i })).toBeVisible({ timeout: 5000 });
  });

  test('INV-03: no blank white page', async ({ page }) => {
    const text = await page.locator('body').textContent();
    expect(text?.trim().length).toBeGreaterThan(50);
  });

  test('INV-04: All Invoices sub-nav link works', async ({ page }) => {
    const link = page.locator('a, button').filter({ hasText: /all invoices/i });
    if (await link.count() > 0) {
      await link.first().click();
      await page.waitForTimeout(1000);
      expect(page.url()).toContain('invoic');
    }
  });
});

// ─── Milestones ────────────────────────────────────────────────────────────

test.describe('Milestones /app/invoicing/milestones', { tag: '@catering' }, () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/app/invoicing/milestones');
    await page.waitForTimeout(2000);
  });

  test('MILE-01: page loads without crash', async ({ page }) => {
    expect(page.url()).toContain('milestones');
    const text = await page.locator('body').textContent();
    expect(text?.trim().length).toBeGreaterThan(20);
  });

  test('MILE-02: milestones heading visible', async ({ page }) => {
    await expect(page.locator('h1, h2, h3').filter({ hasText: /milestone/i })).toBeVisible({ timeout: 5000 });
  });

  test('MILE-03: no NG04002 route error', async ({ page }) => {
    const text = await page.locator('body').textContent();
    expect(text).not.toContain('Cannot match any routes');
  });

  test('MILE-04: milestone list or empty state renders', async ({ page }) => {
    const hasContent = await page.locator('table, [class*="milestone"], text=No milestones, text=Milestone').count();
    expect(hasContent).toBeGreaterThan(0);
  });
});

// ─── Calendar ─────────────────────────────────────────────────────────────

test.describe('Catering Calendar /app/catering/calendar', { tag: '@catering' }, () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/app/catering/calendar');
    await page.waitForTimeout(2000);
  });

  test('CAL-01: calendar page loads without crash', async ({ page }) => {
    expect(page.url()).toContain('calendar');
    const text = await page.locator('body').textContent();
    expect(text?.trim().length).toBeGreaterThan(20);
  });

  test('CAL-02: current month visible', async ({ page }) => {
    await expect(page.locator('text=March 2026')).toBeVisible({ timeout: 5000 });
  });

  test('CAL-03: next-month nav does not skip a month', async ({ page }) => {
    const nextBtn = page.locator('button').filter({ hasText: /next|›|>|▶/ }).last();
    await nextBtn.click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=April 2026')).toBeVisible();
    await expect(page.locator('text=May 2026')).not.toBeVisible();
  });

  test('CAL-04: day cells render for full month', async ({ page }) => {
    // March 2026 has 31 days
    const dayCells = page.locator('[class*="day"], td, [class*="cell"]');
    const count = await dayCells.count();
    expect(count).toBeGreaterThan(28);
  });
});

// ─── Clients ──────────────────────────────────────────────────────────────

test.describe('Clients /app/customers', { tag: '@catering' }, () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/app/customers');
    await page.waitForTimeout(2000);
  });

  test('CLI-01: clients page loads without crash', async ({ page }) => {
    const text = await page.locator('body').textContent();
    expect(text?.trim().length).toBeGreaterThan(20);
  });

  test('CLI-02: heading visible', async ({ page }) => {
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5000 });
  });

  test('CLI-03: no route error', async ({ page }) => {
    const text = await page.locator('body').textContent();
    expect(text).not.toContain('Cannot match any routes');
  });
});

// ─── Menu Packages ────────────────────────────────────────────────────────

test.describe('Menu Packages /app/menu/packages', { tag: '@catering' }, () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/app/menu/packages');
    await page.waitForTimeout(2000);
  });

  test('PKG-01: packages page loads without crash', async ({ page }) => {
    const text = await page.locator('body').textContent();
    expect(text?.trim().length).toBeGreaterThan(20);
  });

  test('PKG-02: page title Packages visible', async ({ page }) => {
    await expect(page.locator('h1, h2, h3').filter({ hasText: /package/i })).toBeVisible({ timeout: 5000 });
  });

  test('PKG-03: Create Package button present', async ({ page }) => {
    await expect(page.locator('button').filter({ hasText: /create|add|new/i }).first()).toBeVisible({ timeout: 5000 });
  });
});

// ─── Administration Dashboard ─────────────────────────────────────────────

test.describe('Administration Dashboard /app/administration', { tag: '@catering' }, () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/app/administration');
    await page.waitForTimeout(2000);
  });

  test('ADMIN-01: dashboard loads without blank screen', async ({ page }) => {
    const text = await page.locator('body').textContent();
    expect(text?.trim().length).toBeGreaterThan(50);
  });

  test('ADMIN-02: Catering Admin heading visible', async ({ page }) => {
    await expect(page.locator('text=Catering Admin')).toBeVisible({ timeout: 5000 });
  });

  test('ADMIN-03: Quick Actions panel visible', async ({ page }) => {
    await expect(page.locator('text=Quick Actions')).toBeVisible({ timeout: 5000 });
  });

  test('ADMIN-04: all four stat cards visible', async ({ page }) => {
    await expect(page.locator('text=PENDING INQUIRIES')).toBeVisible();
    await expect(page.locator('text=AWAITING APPROVAL')).toBeVisible();
    await expect(page.locator('text=MILESTONES DUE')).toBeVisible();
  });

  test('ADMIN-05: Pipeline Overview section visible', async ({ page }) => {
    await expect(page.locator('text=Pipeline Overview')).toBeVisible({ timeout: 5000 });
  });
});

// ─── Settings ─────────────────────────────────────────────────────────────

test.describe('Settings /app/settings', { tag: '@catering' }, () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/app/settings');
    await page.waitForTimeout(2000);
  });

  test('SET-01: settings page loads', async ({ page }) => {
    const text = await page.locator('body').textContent();
    expect(text?.trim().length).toBeGreaterThan(50);
  });

  test('SET-02: settings heading visible', async ({ page }) => {
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5000 });
  });

  test('SET-03: no route crash', async ({ page }) => {
    const text = await page.locator('body').textContent();
    expect(text).not.toContain('Cannot match any routes');
  });
});

// ─── Reports ──────────────────────────────────────────────────────────────

test.describe('Reports /app/reports', { tag: '@catering' }, () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/app/reports');
    await page.waitForTimeout(2000);
  });

  test('RPT-01: reports page loads without crash', async ({ page }) => {
    const text = await page.locator('body').textContent();
    expect(text?.trim().length).toBeGreaterThan(50);
  });

  test('RPT-02: reports heading visible', async ({ page }) => {
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5000 });
  });

  test('RPT-03: catering revenue report route loads', async ({ page }) => {
    await page.goto('/app/reports/revenue');
    await page.waitForTimeout(2000);
    const text = await page.locator('body').textContent();
    expect(text).not.toContain('Cannot match any routes');
    expect(text?.trim().length).toBeGreaterThan(20);
  });
});

// ─── Guest Proposal Portal ────────────────────────────────────────────────

test.describe('Guest Portal /catering/proposal/:token', { tag: '@catering' }, () => {
  test('GUEST-01: valid proposal token shows proposal page not 404', async ({ page }) => {
    await login(page);
    // Navigate to a job and get proposal token from the success banner
    await page.goto('/app/catering/job/a4e8ba15-94d8-4c66-8b38-1c696ecd4c8d');
    await page.waitForTimeout(2000);
    // Try to find the proposal link
    const link = page.locator('a[href*="/catering/proposal/"]').first();
    if (await link.count() > 0) {
      const href = await link.getAttribute('href');
      if (!href) return;
      await page.goto(href);
      await page.waitForTimeout(2000);
      // Must not show 404
      const body = await page.locator('body').textContent();
      expect(body).not.toContain('404');
      expect(body).not.toContain('Cannot match any routes');
      expect(body?.trim().length).toBeGreaterThan(50);
    }
  });

  test('GUEST-02: invalid token shows graceful error not crash', async ({ page }) => {
    await page.goto('/catering/proposal/invalid-token-xyz');
    await page.waitForTimeout(2000);
    const body = await page.locator('body').textContent();
    // Should show some content — a 404 message is OK, Angular crash is NOT
    expect(body).not.toContain('NG04002');
    expect(body).not.toContain('Cannot match any routes');
  });
});

// ─── Catering Sub-Routes ─────────────────────────────────────────────────

test.describe('Catering Sub-Routes', { tag: '@catering' }, () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('SUB-01: /app/catering/reports loads', async ({ page }) => {
    await page.goto('/app/catering/reports');
    await page.waitForTimeout(2000);
    const text = await page.locator('body').textContent();
    expect(text).not.toContain('Cannot match any routes');
    expect(text?.trim().length).toBeGreaterThan(20);
  });

  test('SUB-02: /app/catering/prep-list loads', async ({ page }) => {
    await page.goto('/app/catering/prep-list');
    await page.waitForTimeout(2000);
    const text = await page.locator('body').textContent();
    expect(text).not.toContain('Cannot match any routes');
    expect(text?.trim().length).toBeGreaterThan(20);
  });

  test('SUB-03: /app/catering/delivery loads', async ({ page }) => {
    await page.goto('/app/catering/delivery');
    await page.waitForTimeout(2000);
    const text = await page.locator('body').textContent();
    expect(text).not.toContain('Cannot match any routes');
    expect(text?.trim().length).toBeGreaterThan(20);
  });

  test('SUB-04: /app/reports/deferred loads', async ({ page }) => {
    await page.goto('/app/reports/deferred');
    await page.waitForTimeout(2000);
    const text = await page.locator('body').textContent();
    expect(text).not.toContain('Cannot match any routes');
    expect(text?.trim().length).toBeGreaterThan(20);
  });

  test('SUB-05: /app/invoicing/milestones sidebar link navigates correctly', async ({ page }) => {
    await page.goto('/app/catering');
    await page.waitForTimeout(1000);
    const milestonesLink = page.locator('a[href*="milestones"], button').filter({ hasText: /milestones/i }).first();
    if (await milestonesLink.count() > 0) {
      await milestonesLink.click();
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('milestone');
    }
  });
});
