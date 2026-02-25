import { test, expect } from './fixtures/auth.fixture';
import { ROUTES } from './fixtures/test-data';
import { waitForApiSettled } from './helpers/wait-helpers';

test.describe('Reporting', { tag: '@nice-to-have' }, () => {
  test('should load close-of-day report', async ({ authedPage: page }) => {
    await page.goto(ROUTES.closeOfDay);
    await waitForApiSettled(page);

    // Close of day report should render
    const codReport = page.locator('.cod-report');
    await expect(codReport).toBeVisible({ timeout: 15_000 });

    // Title should be visible
    const title = page.locator('h4:has-text("Close of Day")');
    await expect(title).toBeVisible();
  });

  test('should display KPI cards in close-of-day', async ({ authedPage: page }) => {
    await page.goto(ROUTES.closeOfDay);
    await waitForApiSettled(page);

    await expect(page.locator('.cod-report')).toBeVisible({ timeout: 15_000 });

    // KPI cards should be present
    const kpiCards = page.locator('.kpi-card');
    const count = await kpiCards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('should show close-of-day tabs', async ({ authedPage: page }) => {
    await page.goto(ROUTES.closeOfDay);
    await waitForApiSettled(page);

    await expect(page.locator('.cod-report')).toBeVisible({ timeout: 15_000 });

    // Tab navigation should be present
    const tabs = page.locator('.cod-tabs');
    await expect(tabs).toBeVisible();

    // Summary tab should be visible
    const summaryTab = page.locator('.cod-tab:has-text("Summary")');
    await expect(summaryTab).toBeVisible();
  });

  test('should switch between close-of-day tabs', async ({ authedPage: page }) => {
    await page.goto(ROUTES.closeOfDay);
    await waitForApiSettled(page);

    await expect(page.locator('.cod-report')).toBeVisible({ timeout: 15_000 });

    // Click Payments tab
    const paymentsTab = page.locator('.cod-tab:has-text("Payments")');
    if (await paymentsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await paymentsTab.click();
      await waitForApiSettled(page);

      // Should show payments content (table or section)
      const section = page.locator('.section-card, .cod-table');
      await expect(section.first()).toBeVisible({ timeout: 5000 });
    }

    // Report should still be functional
    await expect(page.locator('.cod-report')).toBeVisible();
  });

  test('should load reports dashboard', async ({ authedPage: page }) => {
    await page.goto(ROUTES.reports);
    await waitForApiSettled(page);

    // Reports page should render without crashing
    const content = page.locator('.os-page-content, .report-dashboard, h1, h2');
    await expect(content.first()).toBeVisible({ timeout: 15_000 });
  });

  test('should have date picker on close-of-day', async ({ authedPage: page }) => {
    await page.goto(ROUTES.closeOfDay);
    await waitForApiSettled(page);

    await expect(page.locator('.cod-report')).toBeVisible({ timeout: 15_000 });

    // Date picker should be present
    const datePicker = page.locator('input[type="date"]');
    await expect(datePicker).toBeVisible();
  });
});
