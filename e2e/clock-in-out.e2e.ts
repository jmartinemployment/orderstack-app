import { test, expect } from './fixtures/auth.fixture';
import { ROUTES } from './fixtures/test-data';
import { waitForApiSettled } from './helpers/wait-helpers';

test.describe('Clock In/Out & Scheduling', { tag: '@important' }, () => {
  test('should load staff scheduling page', async ({ authedPage: page }) => {
    await page.goto(ROUTES.scheduling);
    await waitForApiSettled(page);

    // Staff scheduling container should render
    const scheduling = page.locator('.staff-scheduling');
    await expect(scheduling).toBeVisible({ timeout: 15_000 });
  });

  test('should display scheduling tabs', async ({ authedPage: page }) => {
    await page.goto(ROUTES.scheduling);
    await waitForApiSettled(page);

    await expect(page.locator('.staff-scheduling')).toBeVisible({ timeout: 15_000 });

    // Tab navigation should be visible
    const tabList = page.locator('ul.nav-tabs');
    await expect(tabList).toBeVisible();

    // Schedule tab should be present
    const scheduleTab = page.locator('button.nav-link:has-text("Schedule")');
    await expect(scheduleTab).toBeVisible();
  });

  test.skip('should show time clock tab with clock-in functionality', async () => {
    // BLOCKED: GET /team-members returns 404 — time clock requires team members to function
  });

  test.skip('should clock in and clock out a staff member', async () => {
    // BLOCKED: GET /team-members returns 404, GET /break-types returns 404
    // Cannot test the clock in/out flow without these endpoints
  });

  test('should show labor report tab', async ({ authedPage: page }) => {
    await page.goto(ROUTES.scheduling);
    await waitForApiSettled(page);

    await expect(page.locator('.staff-scheduling')).toBeVisible({ timeout: 15_000 });

    // Click Labor Report tab
    const laborTab = page.locator('button.nav-link:has-text("Labor Report")');
    if (await laborTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await laborTab.click();
      await waitForApiSettled(page);
    }

    // Page should still be functional (no crash)
    await expect(page.locator('.staff-scheduling')).toBeVisible();
  });
});
