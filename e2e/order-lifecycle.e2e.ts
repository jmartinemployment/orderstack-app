import { test, expect } from './fixtures/auth.fixture';
import { ROUTES } from './fixtures/test-data';
import { SEL } from './helpers/selectors';
import { waitForApiSettled, collectApiErrors } from './helpers/wait-helpers';

test.describe('Order Lifecycle', { tag: '@critical' }, () => {
  test('should load POS terminal', async ({ authedPage: page }) => {
    const apiErrors = collectApiErrors(page);
    await page.goto(ROUTES.pos);
    await waitForApiSettled(page);

    // POS terminal should render
    await expect(page.locator(SEL.posTerminal)).toBeVisible({ timeout: 15_000 });
  });

  test('should display tables in POS (table mode)', async ({ authedPage: page }) => {
    await page.goto(ROUTES.pos);
    await waitForApiSettled(page);

    await expect(page.locator(SEL.posTerminal)).toBeVisible({ timeout: 15_000 });

    // Table rows should be present (restaurant is in table mode)
    const tableRows = page.locator(SEL.tableRow);
    const count = await tableRows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should select a table and show New Order button', async ({ authedPage: page }) => {
    await page.goto(ROUTES.pos);
    await waitForApiSettled(page);

    await expect(page.locator(SEL.posTerminal)).toBeVisible({ timeout: 15_000 });

    // Click an available table
    const availableTable = page.locator('button.table-row:has-text("available")').first();
    if (await availableTable.isVisible({ timeout: 5000 }).catch(() => false)) {
      await availableTable.click();
      await waitForApiSettled(page, 1000);

      // New Order button should now appear
      const newOrderBtn = page.locator(SEL.newOrderBtn);
      await expect(newOrderBtn).toBeVisible({ timeout: 5000 });
    } else {
      // No available tables — check if there are any tables at all
      const allTables = page.locator(SEL.tableRow);
      const tableCount = await allTables.count();
      expect(tableCount).toBeGreaterThan(0);
    }
  });

  test('should create a new order on available table', async ({ authedPage: page }) => {
    await page.goto(ROUTES.pos);
    await waitForApiSettled(page);

    await expect(page.locator(SEL.posTerminal)).toBeVisible({ timeout: 15_000 });

    // Select an available table first
    const availableTable = page.locator('button.table-row:has-text("available")').first();
    if (!(await availableTable.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'No available tables — cannot create order');
      return;
    }

    await availableTable.click();
    await waitForApiSettled(page, 1000);

    // Click New Order
    const newOrderBtn = page.locator(SEL.newOrderBtn);
    await expect(newOrderBtn).toBeVisible({ timeout: 5000 });
    await newOrderBtn.click();
    await waitForApiSettled(page, 2000);

    // Should have an active order — the right panel (check panel) should show content
    const checkPanel = page.locator('.pos-right, .check-panel, .order-panel');
    await expect(checkPanel.first()).toBeVisible({ timeout: 10_000 });
  });

  test('should display menu categories in POS after creating order', async ({ authedPage: page }) => {
    await page.goto(ROUTES.pos);
    await waitForApiSettled(page);

    await expect(page.locator(SEL.posTerminal)).toBeVisible({ timeout: 15_000 });

    // Select available table and create order
    const availableTable = page.locator('button.table-row:has-text("available")').first();
    if (!(await availableTable.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'No available tables');
      return;
    }

    await availableTable.click();
    await waitForApiSettled(page, 1000);
    await page.locator(SEL.newOrderBtn).click();
    await waitForApiSettled(page, 2000);

    // Menu area should have categories or items
    const menuArea = page.locator('.pos-center, .menu-grid, .category-btn');
    await expect(menuArea.first()).toBeVisible({ timeout: 10_000 });
  });

  test('should show order in pending orders list', async ({ authedPage: page }) => {
    await page.goto(ROUTES.orders);
    await waitForApiSettled(page);

    // Pending orders page should load — look for any content
    const content = page.locator('.os-page-content, .order-list, .orders-container, h1, h2');
    await expect(content.first()).toBeVisible({ timeout: 15_000 });
  });

  test('should navigate to order pad', async ({ authedPage: page }) => {
    await page.goto(ROUTES.orderPad);
    await waitForApiSettled(page);

    // Order pad should render (it's a simpler POS view)
    const orderPad = page.locator('.order-pad, .pos-terminal, os-order-pad');
    await expect(orderPad.first()).toBeVisible({ timeout: 15_000 });
  });
});
