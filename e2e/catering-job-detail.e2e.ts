/**
 * E2E tests: Catering Job Detail (/app/catering/job/:id)
 * Covers: all tabs, header buttons, date display, proposals, BEO, clone, .ics
 */
import { test, expect } from '@playwright/test';
import { loginAsCateringOwner } from './fixtures/catering-helpers';

let jobUrl = '';

test.describe('Catering Job Detail', { tag: '@catering' }, () => {

  test.beforeAll(async ({ browser }) => {
    // Create one job to use across all tests in this suite
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAsCateringOwner(page, '/app/catering');
    await page.locator('button:has-text("New Job")').click();
    await page.waitForTimeout(500);
    await page.locator('input[placeholder*="Johnson"]').fill('Job Detail E2E');
    await page.locator('input[type="date"]').fill('2026-08-10');
    await page.locator('input[type="time"]').first().fill('17:00');
    await page.locator('input[type="time"]').last().fill('21:00');
    await page.locator('label:has-text("Client Name")').locator('..').locator('input').fill('Detail Client');
    await page.locator('button:has-text("Create Job")').click();
    await page.waitForTimeout(2000);
    // Click View on the first job card to get the job URL
    await page.locator('a, button').filter({ hasText: 'View' }).first().click();
    await page.waitForTimeout(1000);
    jobUrl = page.url();
    await ctx.close();
  });

  test.beforeEach(async ({ page }) => {
    await loginAsCateringOwner(page, jobUrl || '/app/catering');
    await page.waitForTimeout(1000);
  });

  // ─── Page Load ────────────────────────────────────────────────────────────

  test('JD-01: job title is visible in heading', async ({ page }) => {
    await expect(page.locator('h1, h2').filter({ hasText: 'Job Detail E2E' })).toBeVisible();
  });

  test('JD-02: event date is NOT off-by-one (shows Aug 10 not Aug 9)', async ({ page }) => {
    await expect(page.locator('text=August 10, 2026')).toBeVisible();
    await expect(page.locator('text=August 9, 2026')).not.toBeVisible();
  });

  test('JD-03: header date badge shows correct date', async ({ page }) => {
    // The "Event Apr XX" text in the subtitle
    const subtitle = await page.locator('text=Event').textContent().catch(() => '');
    expect(subtitle).not.toContain('Aug 9');
    expect(subtitle).toContain('Aug 10');
  });

  test('JD-04: new job does NOT show "Proposal Sent" badge before sending proposal', async ({ page }) => {
    // A fresh Inquiry job should NOT have Proposal Sent status
    const badge = page.locator('.badge, [class*="badge"], [class*="status"]').filter({ hasText: 'Proposal Sent' });
    await expect(badge).not.toBeVisible();
  });

  test('JD-05: "1 guests" incorrect grammar does not appear anywhere', async ({ page }) => {
    const body = await page.locator('body').textContent();
    expect(body).not.toMatch(/\b1 guests\b/);
  });

  // ─── All Tabs Render ──────────────────────────────────────────────────────

  test('JD-06: Overview tab shows Event Details and Financial Summary', async ({ page }) => {
    await page.locator('[role="tab"], button').filter({ hasText: 'Overview' }).click();
    await page.waitForTimeout(300);
    await expect(page.locator('text=Event Details')).toBeVisible();
    await expect(page.locator('text=Financial Summary')).toBeVisible();
  });

  test('JD-07: Packages tab renders without error', async ({ page }) => {
    await page.locator('[role="tab"], button').filter({ hasText: 'Packages' }).click();
    await page.waitForTimeout(300);
    await expect(page.locator('text=Packages')).toBeVisible();
    await expect(page.locator('text=Add Package, text=No packages').or(page.locator('button:has-text("Add Package")'))).toBeVisible();
  });

  test('JD-08: Milestones tab shows Deposit and Final Payment rows', async ({ page }) => {
    await page.locator('[role="tab"], button').filter({ hasText: 'Milestones' }).click();
    await page.waitForTimeout(300);
    await expect(page.locator('text=Payment Milestones')).toBeVisible();
    await expect(page.locator('text=Deposit')).toBeVisible();
    await expect(page.locator('text=Final Payment')).toBeVisible();
  });

  test('JD-09: Dietary tab renders without error', async ({ page }) => {
    await page.locator('[role="tab"], button').filter({ hasText: 'Dietary' }).click();
    await page.waitForTimeout(300);
    await expect(page.locator('text=Dietary Requirements')).toBeVisible();
    await expect(page.locator('button:has-text("Save Dietary")')).toBeVisible();
  });

  test('JD-10: Delivery tab renders correct message for on-site event', async ({ page }) => {
    await page.locator('[role="tab"], button').filter({ hasText: 'Delivery' }).click();
    await page.waitForTimeout(300);
    await expect(page.locator('text=on-site')).toBeVisible();
  });

  test('JD-11: Tastings tab renders without error', async ({ page }) => {
    await page.locator('[role="tab"], button').filter({ hasText: 'Tastings' }).click();
    await page.waitForTimeout(300);
    await expect(page.locator('text=Tasting')).toBeVisible();
  });

  test('JD-12: Activity tab shows job-created entry', async ({ page }) => {
    await page.locator('[role="tab"], button').filter({ hasText: 'Activity' }).click();
    await page.waitForTimeout(300);
    await expect(page.locator('text=Activity Timeline')).toBeVisible();
    await expect(page.locator('text=created')).toBeVisible();
  });

  // ─── Header Action Buttons ────────────────────────────────────────────────

  test('JD-13: BEO button does NOT activate Dietary tab', async ({ page }) => {
    // Start on Overview
    await page.locator('[role="tab"], button').filter({ hasText: 'Overview' }).click();
    await page.waitForTimeout(300);
    await page.locator('button:has-text("BEO")').click();
    await page.waitForTimeout(500);
    // Dietary tab must NOT be active
    const dietaryTab = page.locator('[role="tab"], button').filter({ hasText: 'Dietary' });
    const isActive = await dietaryTab.evaluate(el =>
      el.classList.contains('active') || el.getAttribute('aria-selected') === 'true'
    ).catch(() => false);
    expect(isActive).toBe(false);
    // Overview panel must still be visible
    await expect(page.locator('text=Event Details')).toBeVisible();
  });

  test('JD-14: .ics button does NOT activate Dietary tab', async ({ page }) => {
    await page.locator('[role="tab"], button').filter({ hasText: 'Overview' }).click();
    await page.waitForTimeout(300);
    await page.locator('button:has-text(".ics"), button[title*="calendar"], button[title*="ics"]').click();
    await page.waitForTimeout(500);
    const dietaryTab = page.locator('[role="tab"], button').filter({ hasText: 'Dietary' });
    const isActive = await dietaryTab.evaluate(el =>
      el.classList.contains('active') || el.getAttribute('aria-selected') === 'true'
    ).catch(() => false);
    expect(isActive).toBe(false);
  });

  test('JD-15: Clone button creates new job with Inquiry status (not Proposal Sent)', async ({ page }) => {
    await page.locator('button:has-text("Clone")').click();
    await page.waitForTimeout(2000);
    // New URL = new job
    expect(page.url()).not.toBe(jobUrl);
    // Status must be Inquiry, not Proposal Sent
    const body = await page.locator('body').textContent();
    expect(body).not.toContain('Proposal Sent');
    // Should contain Inquiry
    expect(body).toContain('Inquiry');
  });

  // ─── Send Proposal Flow ───────────────────────────────────────────────────

  test('JD-16: Send Proposal updates status badge to Proposal Sent', async ({ page }) => {
    await page.locator('button:has-text("Send Proposal")').click();
    await page.waitForTimeout(3000);
    await expect(page.locator('.badge, [class*="status"]').filter({ hasText: 'Proposal Sent' })).toBeVisible({ timeout: 5000 });
  });

  test('JD-17: Send Proposal success banner URL uses production domain not localhost', async ({ page }) => {
    await page.locator('button:has-text("Send Proposal")').click();
    await page.waitForTimeout(3000);
    const bannerText = await page.locator('.alert, [class*="success"], [class*="banner"]').textContent().catch(() => '');
    expect(bannerText).not.toContain('localhost');
    expect(bannerText).toContain('getorderstack.com');
  });

  test('JD-18: Activity timeline has exactly ONE proposal entry after one send', async ({ page }) => {
    await page.locator('button:has-text("Send Proposal")').click();
    await page.waitForTimeout(3000);
    await page.locator('[role="tab"], button').filter({ hasText: 'Activity' }).click();
    await page.waitForTimeout(500);
    const proposalEntries = page.locator('text=Proposal generated');
    await expect(proposalEntries).toHaveCount(1);
  });

  // ─── Guest Portal ─────────────────────────────────────────────────────────

  test('JD-19: proposal URL navigates to a real page (not 404)', async ({ page }) => {
    await page.locator('button:has-text("Send Proposal")').click();
    await page.waitForTimeout(3000);
    // Find the proposal URL in the success banner
    const link = page.locator('a[href*="/catering/proposal/"], a[href*="proposal"]').first();
    const href = await link.getAttribute('href').catch(() => '');
    if (href) {
      await page.goto(href);
      await page.waitForTimeout(2000);
      // Must NOT be a 404 / error page
      await expect(page.locator('text=404')).not.toBeVisible();
      await expect(page.locator('text=Page not found')).not.toBeVisible();
    }
  });

});
