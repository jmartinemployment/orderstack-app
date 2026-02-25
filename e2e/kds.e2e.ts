import { test, expect } from './fixtures/auth.fixture';
import { ROUTES } from './fixtures/test-data';
import { SEL } from './helpers/selectors';
import { waitForApiSettled, collectApiErrors } from './helpers/wait-helpers';

test.describe('Kitchen Display System', { tag: '@critical' }, () => {
  test('should load KDS and display header', async ({ authedPage: page }) => {
    const apiErrors = collectApiErrors(page);
    await page.goto(ROUTES.kds);
    await waitForApiSettled(page);

    // KDS display should render
    await expect(page.locator(SEL.kdsDisplay)).toBeVisible({ timeout: 15_000 });

    // Header with "Kitchen Display" title
    await expect(page.locator(SEL.kdsHeader)).toBeVisible();
    await expect(page.locator('h1:has-text("Kitchen Display")')).toBeVisible();
  });

  test('should show KDS stats (active, overdue, avg wait)', async ({ authedPage: page }) => {
    await page.goto(ROUTES.kds);
    await waitForApiSettled(page);

    await expect(page.locator(SEL.kdsDisplay)).toBeVisible({ timeout: 15_000 });

    // Stats bar should show Active, Overdue, Avg Wait
    const stats = page.locator(SEL.kdsStats);
    await expect(stats).toBeVisible();
    await expect(page.locator('.stat-label:has-text("Active")')).toBeVisible();
    await expect(page.locator('.stat-label:has-text("Overdue")')).toBeVisible();
    await expect(page.locator('.stat-label:has-text("Avg Wait")')).toBeVisible();
  });

  test('should display order cards if orders exist', async ({ authedPage: page }) => {
    await page.goto(ROUTES.kds);
    await waitForApiSettled(page, 5000);

    await expect(page.locator(SEL.kdsDisplay)).toBeVisible({ timeout: 15_000 });

    // Check for order cards — may be empty if no active orders
    const orderCards = page.locator(SEL.orderCard);
    const count = await orderCards.count();

    if (count > 0) {
      // At least one order card is visible
      await expect(orderCards.first()).toBeVisible();
    } else {
      // Empty state is acceptable — just verify no crash
      await expect(page.locator(SEL.kdsDisplay)).toBeVisible();
    }
  });

  test('should show station selector if stations configured', async ({ authedPage: page }) => {
    await page.goto(ROUTES.kds);
    await waitForApiSettled(page);

    await expect(page.locator(SEL.kdsDisplay)).toBeVisible({ timeout: 15_000 });

    // Station selector may or may not be present depending on restaurant config
    const stationSelect = page.locator(SEL.stationSelect);
    const hasStations = await stationSelect.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasStations) {
      await expect(stationSelect).toBeVisible();
    }
    // Either way, KDS should still be functional
    await expect(page.locator(SEL.kdsDisplay)).toBeVisible();
  });

  test('should show course pacing controls', async ({ authedPage: page }) => {
    await page.goto(ROUTES.kds);
    await waitForApiSettled(page);

    await expect(page.locator(SEL.kdsDisplay)).toBeVisible({ timeout: 15_000 });

    // Course pacing select should be present
    const pacingSelect = page.locator('.pacing-select');
    await expect(pacingSelect).toBeVisible();
  });
});
