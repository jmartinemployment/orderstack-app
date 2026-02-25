import { test, expect } from './fixtures/auth.fixture';
import { ROUTES } from './fixtures/test-data';
import { waitForApiSettled } from './helpers/wait-helpers';

test.describe('Table Management', { tag: '@important' }, () => {
  test('should load floor plan page', async ({ authedPage: page }) => {
    await page.goto(ROUTES.floorPlan);
    await waitForApiSettled(page);

    // Floor plan container should render
    const floorPlan = page.locator('.floor-plan');
    await expect(floorPlan).toBeVisible({ timeout: 15_000 });

    // Title should be visible
    const heading = page.locator('h2:has-text("Table Management")');
    await expect(heading).toBeVisible();
  });

  test('should display KPI strip with table stats', async ({ authedPage: page }) => {
    await page.goto(ROUTES.floorPlan);
    await waitForApiSettled(page);

    await expect(page.locator('.floor-plan')).toBeVisible({ timeout: 15_000 });

    // KPI strip should show table statistics
    const kpiStrip = page.locator('.kpi-strip');
    await expect(kpiStrip).toBeVisible();

    // Should have KPI cards
    const kpiCards = page.locator('.kpi-card');
    const count = await kpiCards.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('should show view toggle buttons (Floor Plan / List View)', async ({ authedPage: page }) => {
    await page.goto(ROUTES.floorPlan);
    await waitForApiSettled(page);

    await expect(page.locator('.floor-plan')).toBeVisible({ timeout: 15_000 });

    // View toggle buttons
    const floorPlanBtn = page.locator('button:has-text("Floor Plan")');
    const listViewBtn = page.locator('button:has-text("List View")');

    await expect(floorPlanBtn).toBeVisible();
    await expect(listViewBtn).toBeVisible();
  });

  test('should switch to list view', async ({ authedPage: page }) => {
    await page.goto(ROUTES.floorPlan);
    await waitForApiSettled(page);

    await expect(page.locator('.floor-plan')).toBeVisible({ timeout: 15_000 });

    // Click List View
    await page.locator('button:has-text("List View")').click();
    await waitForApiSettled(page);

    // List view should be visible
    const tableList = page.locator('.table-list');
    await expect(tableList).toBeVisible({ timeout: 5000 });
  });

  test('should show Add Table button', async ({ authedPage: page }) => {
    await page.goto(ROUTES.floorPlan);
    await waitForApiSettled(page);

    await expect(page.locator('.floor-plan')).toBeVisible({ timeout: 15_000 });

    // Add Table button should be present
    const addBtn = page.locator('button:has-text("Add Table")');
    await expect(addBtn).toBeVisible();
  });
});
