import { test, expect } from './fixtures/auth.fixture';
import { ROUTES } from './fixtures/test-data';
import { SEL } from './helpers/selectors';
import { waitForApiSettled } from './helpers/wait-helpers';

test.describe('Menu Management', { tag: '@important' }, () => {
  test('should load menu management page with tabs', async ({ authedPage: page }) => {
    await page.goto(ROUTES.menu);
    await waitForApiSettled(page);

    // Page should render
    const heading = page.locator('h2:has-text("Menu Management"), h1:has-text("Menu")');
    await expect(heading.first()).toBeVisible({ timeout: 15_000 });

    // Tabs should be visible
    const tabs = page.locator(SEL.menuTabs);
    await expect(tabs).toBeVisible();
  });

  test('should display Categories tab by default', async ({ authedPage: page }) => {
    await page.goto(ROUTES.menu);
    await waitForApiSettled(page);

    await expect(page.locator(SEL.menuTabs)).toBeVisible({ timeout: 15_000 });

    // Categories tab should be active
    const categoriesTab = page.locator('.os-tab:has-text("Categories")');
    await expect(categoriesTab).toBeVisible();

    // Category management component should render
    const categoryMgmt = page.locator('os-category-management');
    await expect(categoryMgmt).toBeVisible({ timeout: 10_000 });
  });

  test('should switch to Items tab', async ({ authedPage: page }) => {
    await page.goto(ROUTES.menu);
    await waitForApiSettled(page);

    await expect(page.locator(SEL.menuTabs)).toBeVisible({ timeout: 15_000 });

    // Click Items tab
    const itemsTab = page.locator('.os-tab:has-text("Items")');
    await itemsTab.click();
    await waitForApiSettled(page);

    // Item management component should render
    const itemMgmt = page.locator('os-item-management');
    await expect(itemMgmt).toBeVisible({ timeout: 10_000 });
  });

  test('should switch to Modifiers tab', async ({ authedPage: page }) => {
    await page.goto(ROUTES.menu);
    await waitForApiSettled(page);

    await expect(page.locator(SEL.menuTabs)).toBeVisible({ timeout: 15_000 });

    // Click Modifiers tab
    const modifiersTab = page.locator('.os-tab:has-text("Modifiers")');
    await modifiersTab.click();
    await waitForApiSettled(page);

    // Modifier management component should render
    const modifierMgmt = page.locator('os-modifier-management');
    await expect(modifierMgmt).toBeVisible({ timeout: 10_000 });
  });

  test('should switch to Schedules tab', async ({ authedPage: page }) => {
    await page.goto(ROUTES.menu);
    await waitForApiSettled(page);

    await expect(page.locator(SEL.menuTabs)).toBeVisible({ timeout: 15_000 });

    // Click Schedules tab
    const schedulesTab = page.locator('.os-tab:has-text("Schedules")');
    await schedulesTab.click();
    await waitForApiSettled(page);

    // Schedule management component should render
    const scheduleMgmt = page.locator('os-schedule-management');
    await expect(scheduleMgmt).toBeVisible({ timeout: 10_000 });
  });

  test('should show combo management tab', async ({ authedPage: page }) => {
    await page.goto(ROUTES.combos);
    await waitForApiSettled(page);

    // Combo management page should load
    const content = page.locator('.os-page-content, os-combo-management, h1, h2');
    await expect(content.first()).toBeVisible({ timeout: 15_000 });
  });
});
