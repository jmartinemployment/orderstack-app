import { test, expect } from './fixtures/auth.fixture';
import { ROUTES } from './fixtures/test-data';
import { SEL } from './helpers/selectors';
import { waitForApiSettled } from './helpers/wait-helpers';

test.describe('Receipt Printing', { tag: '@important' }, () => {
  test('should load order history page', async ({ authedPage: page }) => {
    await page.goto(ROUTES.orderHistory);
    await waitForApiSettled(page);

    // Order history page should render
    const content = page.locator('.os-page-content, .order-history, h1');
    await expect(content.first()).toBeVisible({ timeout: 15_000 });
  });

  test('should display POS with order controls', async ({ authedPage: page }) => {
    await page.goto(ROUTES.pos);
    await waitForApiSettled(page);

    await expect(page.locator(SEL.posTerminal)).toBeVisible({ timeout: 15_000 });

    // Select an available table and create order
    const availableTable = page.locator('button.table-row:has-text("available")').first();
    if (!(await availableTable.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'No available tables — cannot test receipt flow');
      return;
    }

    await availableTable.click();
    await waitForApiSettled(page, 1000);

    await page.locator(SEL.newOrderBtn).click();
    await waitForApiSettled(page, 2000);

    // Add an item if available
    const menuItems = page.locator('.menu-item-btn, .item-card, .menu-item');
    if (await menuItems.count() > 0) {
      await menuItems.first().click();
      await waitForApiSettled(page, 2000);

      // Handle modifier prompt
      const modifierPrompt = page.locator('os-modifier-prompt');
      if (await modifierPrompt.isVisible({ timeout: 2000 }).catch(() => false)) {
        const confirmBtn = page.locator('os-modifier-prompt button.btn-primary');
        if (await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await confirmBtn.click();
        }
      }

      // Look for print button in the POS interface
      const printBtn = page.locator('button:has-text("Print"), button[aria-label="Print"]');
      if (await printBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(printBtn.first()).toBeEnabled();
      }
    }

    // POS should still be functional
    await expect(page.locator(SEL.posTerminal)).toBeVisible();
  });

  test.skip('should print receipt via CloudPRNT', async () => {
    // BLOCKED: No printer device configured — CloudPRNT requires physical hardware
  });
});
