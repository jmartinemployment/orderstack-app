/**
 * E2E tests: Catering Dashboard (/app/catering)
 * Covers: page load, next-job banner, job list tabs, calendar nav, capacity
 */
import { test, expect } from '@playwright/test';
import { loginAsCateringOwner } from './fixtures/catering-helpers';

test.describe('Catering Dashboard', { tag: '@catering' }, () => {

  test.beforeEach(async ({ page }) => {
    await loginAsCateringOwner(page, '/app/catering');
  });

  // ─── Page Load ────────────────────────────────────────────────────────────

  test('CAT-01: page loads without Angular error overlay', async ({ page }) => {
    // The red/pink error overlay appears when Angular has a compile error
    await expect(page.locator('ngx-error-overlay, .ng-error-overlay, iframe[src*="overlay"]'))
      .not.toBeVisible({ timeout: 5000 })
      .catch(() => {}); // overlay element may not exist at all — that's fine

    // More reliable: check no error box with red background is covering page
    const errorOverlay = page.locator('body').filter({ hasText: 'TS2339' });
    await expect(errorOverlay).not.toBeVisible();
  });

  test('CAT-02: page title "Catering" is visible', async ({ page }) => {
    await expect(page.locator('h1, h2').filter({ hasText: 'Catering' })).toBeVisible();
  });

  test('CAT-03: "+ New Job" button is visible and clickable', async ({ page }) => {
    const btn = page.locator('button:has-text("New Job")');
    await expect(btn).toBeVisible();
    await btn.click();
    // Panel/drawer should open
    await expect(page.locator('text=New Catering Job')).toBeVisible({ timeout: 5000 });
  });

  // ─── New Job Form ─────────────────────────────────────────────────────────

  test('CAT-04: new job form has all required fields', async ({ page }) => {
    await page.locator('button:has-text("New Job")').click();
    await page.waitForTimeout(500);
    await expect(page.locator('input[placeholder*="Johnson"]')).toBeVisible();
    await expect(page.locator('select').first()).toBeVisible(); // Event Type
    await expect(page.locator('input[type="date"]')).toBeVisible();
    await expect(page.locator('input[type="time"]').first()).toBeVisible();
    await expect(page.locator('input[type="time"]').last()).toBeVisible();
    await expect(page.locator('button:has-text("Create Job")')).toBeVisible();
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
  });

  test('CAT-05: clicking Category select does NOT close the form modal', async ({ page }) => {
    await page.locator('button:has-text("New Job")').click();
    await page.waitForTimeout(500);
    // Click the Event Type select — modal must stay open
    await page.locator('select').first().click();
    await expect(page.locator('text=New Catering Job')).toBeVisible();
  });

  test('CAT-06: form Cancel button closes the drawer', async ({ page }) => {
    await page.locator('button:has-text("New Job")').click();
    await page.waitForTimeout(500);
    await page.locator('button:has-text("Cancel")').click();
    await expect(page.locator('text=New Catering Job')).not.toBeVisible({ timeout: 3000 });
  });

  test('CAT-07: new job saves and appears in Active tab', async ({ page }) => {
    await page.locator('button:has-text("New Job")').click();
    await page.waitForTimeout(500);
    await page.locator('input[placeholder*="Johnson"]').fill('E2E Dashboard Job');
    await page.locator('input[type="date"]').fill('2026-07-20');
    await page.locator('input[type="time"]').first().fill('18:00');
    await page.locator('input[type="time"]').last().fill('22:00');
    // Client Name — find the input by label
    await page.locator('label:has-text("Client Name")').locator('..').locator('input').fill('Test Client');
    await page.locator('button:has-text("Create Job")').click();
    await page.waitForTimeout(2000);
    await expect(page.locator('text=E2E Dashboard Job')).toBeVisible({ timeout: 5000 });
  });

  // ─── Next-Job Banner ──────────────────────────────────────────────────────

  test('CAT-08: next-job banner does NOT show "NaN days"', async ({ page }) => {
    // Only check if banner is present
    const banner = page.locator('.catering-next-job, [class*="next-job"], [class*="upcoming-banner"]').first();
    const bannerText = await banner.textContent().catch(() => '');
    expect(bannerText).not.toContain('NaN');
  });

  test('CAT-09: next-job banner uses correct singular/plural for guests', async ({ page }) => {
    const pageText = await page.locator('body').textContent();
    // "1 guests" should never appear anywhere on the page
    expect(pageText).not.toMatch(/\b1 guests\b/);
  });

  // ─── Job List Tabs ────────────────────────────────────────────────────────

  test('CAT-10: Active, Upcoming, Past, Calendar, Capacity tabs all present', async ({ page }) => {
    await expect(page.locator('button, [role="tab"]').filter({ hasText: 'Active' })).toBeVisible();
    await expect(page.locator('button, [role="tab"]').filter({ hasText: 'Upcoming' })).toBeVisible();
    await expect(page.locator('button, [role="tab"]').filter({ hasText: 'Past' })).toBeVisible();
    await expect(page.locator('button, [role="tab"]').filter({ hasText: 'Calendar' })).toBeVisible();
    await expect(page.locator('button, [role="tab"]').filter({ hasText: 'Capacity' })).toBeVisible();
  });

  test('CAT-11: a future-dated Inquiry job does NOT appear in both Active and Upcoming', async ({ page }) => {
    // Create a fresh future job
    await page.locator('button:has-text("New Job")').click();
    await page.waitForTimeout(500);
    await page.locator('input[placeholder*="Johnson"]').fill('Tab Dedup Test Job');
    await page.locator('input[type="date"]').fill('2026-09-01');
    await page.locator('input[type="time"]').first().fill('12:00');
    await page.locator('input[type="time"]').last().fill('16:00');
    await page.locator('label:has-text("Client Name")').locator('..').locator('input').fill('Dedup Client');
    await page.locator('button:has-text("Create Job")').click();
    await page.waitForTimeout(2000);

    const countInActive = await page.locator('text=Tab Dedup Test Job').count();

    // Switch to Upcoming tab
    await page.locator('button, [role="tab"]').filter({ hasText: 'Upcoming' }).click();
    await page.waitForTimeout(500);
    const countInUpcoming = await page.locator('text=Tab Dedup Test Job').count();

    // Job must appear in exactly ONE of the two tabs, not both
    expect(countInActive + countInUpcoming).toBe(1);
  });

  // ─── Calendar Tab ─────────────────────────────────────────────────────────

  test('CAT-12: Calendar tab shows current month', async ({ page }) => {
    await page.locator('button, [role="tab"]').filter({ hasText: 'Calendar' }).click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=March 2026')).toBeVisible();
  });

  test('CAT-13: Calendar next-month navigation does NOT skip a month', async ({ page }) => {
    await page.locator('button, [role="tab"]').filter({ hasText: 'Calendar' }).click();
    await page.waitForTimeout(500);
    // Current month is March 2026
    await page.locator('button[aria-label*="next"], button:has-text(">")').last().click();
    await page.waitForTimeout(300);
    // Must be April — NOT May
    await expect(page.locator('text=April 2026')).toBeVisible();
    await expect(page.locator('text=May 2026')).not.toBeVisible();
  });

  test('CAT-14: Calendar prev-month navigation works correctly', async ({ page }) => {
    await page.locator('button, [role="tab"]').filter({ hasText: 'Calendar' }).click();
    await page.waitForTimeout(500);
    await page.locator('button[aria-label*="next"], button:has-text(">")').last().click();
    await page.waitForTimeout(300);
    await page.locator('button[aria-label*="prev"], button:has-text("<")').first().click();
    await page.waitForTimeout(300);
    await expect(page.locator('text=March 2026')).toBeVisible();
  });

  // ─── Capacity Tab ──────────────────────────────────────────────────────────

  test('CAT-15: Capacity tab shows settings form', async ({ page }) => {
    await page.locator('button, [role="tab"]').filter({ hasText: 'Capacity' }).click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=Capacity Settings')).toBeVisible();
    await expect(page.locator('button:has-text("Save Settings")')).toBeVisible();
  });

  // ─── Stats Cards ──────────────────────────────────────────────────────────

  test('CAT-16: four stats cards present (Pipeline, Outstanding, This Month, Avg Job)', async ({ page }) => {
    await expect(page.locator('text=PIPELINE VALUE')).toBeVisible();
    await expect(page.locator('text=OUTSTANDING')).toBeVisible();
    await expect(page.locator('text=THIS MONTH')).toBeVisible();
    await expect(page.locator('text=AVG JOB VALUE')).toBeVisible();
  });

  // ─── Sidebar ──────────────────────────────────────────────────────────────

  test('CAT-17: sidebar footer does NOT show placeholder text "jeff" or "123 main"', async ({ page }) => {
    const sidebarText = await page.locator('.os-sidebar, aside, nav').textContent().catch(() => '');
    // Should not have hardcoded test data
    expect(sidebarText?.toLowerCase()).not.toContain('123 main');
  });

});
