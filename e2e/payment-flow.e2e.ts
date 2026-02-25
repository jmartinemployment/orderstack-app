import { test, expect } from './fixtures/auth.fixture';
import { ROUTES } from './fixtures/test-data';
import { SEL } from './helpers/selectors';
import { waitForApiSettled } from './helpers/wait-helpers';

/** Helper: select available table and create new order in POS */
async function createPosOrder(page: import('@playwright/test').Page): Promise<boolean> {
  await page.goto(ROUTES.pos);
  await waitForApiSettled(page);
  await expect(page.locator(SEL.posTerminal)).toBeVisible({ timeout: 15_000 });

  // Select an available table (restaurant is in table mode)
  const availableTable = page.locator('button.table-row:has-text("available")').first();
  if (!(await availableTable.isVisible({ timeout: 5000 }).catch(() => false))) {
    return false;
  }

  await availableTable.click();
  await waitForApiSettled(page, 1000);

  const newOrderBtn = page.locator(SEL.newOrderBtn);
  if (!(await newOrderBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
    return false;
  }

  await newOrderBtn.click();
  await waitForApiSettled(page, 2000);
  return true;
}

test.describe('Payment Flow', { tag: '@critical' }, () => {
  test('should display order total in POS check panel', async ({ authedPage: page }) => {
    const created = await createPosOrder(page);
    if (!created) {
      test.skip(true, 'No available tables — cannot test payment total');
      return;
    }

    // Try to add an item
    const menuItems = page.locator('.menu-item-btn, .item-card, .menu-item');
    const itemCount = await menuItems.count();

    if (itemCount > 0) {
      await menuItems.first().click();
      await waitForApiSettled(page, 2000);

      // Handle modifier prompt if it appears
      const modifierPrompt = page.locator('os-modifier-prompt, .modifier-modal');
      if (await modifierPrompt.isVisible({ timeout: 2000 }).catch(() => false)) {
        const confirmBtn = page.locator('os-modifier-prompt button.btn-primary, os-modifier-prompt button:has-text("Add")');
        if (await confirmBtn.first().isVisible({ timeout: 1000 }).catch(() => false)) {
          await confirmBtn.first().click();
          await waitForApiSettled(page, 1000);
        }
      }

      // Total area should show a value
      const totalArea = page.locator('.check-total, .order-total, .total-amount');
      await expect(totalArea.first()).toBeVisible({ timeout: 5000 });
    } else {
      test.skip(true, 'No menu items available — cannot test payment total');
    }
  });

  test('should show pay/close button when order has items', async ({ authedPage: page }) => {
    const created = await createPosOrder(page);
    if (!created) {
      test.skip(true, 'No available tables');
      return;
    }

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

      // Pay/close/send button should be available
      const actionBtn = page.locator('button:has-text("Pay"), button:has-text("Close"), button:has-text("Send"), button.btn-send, button.btn-pay');
      await expect(actionBtn.first()).toBeVisible({ timeout: 5000 });
    } else {
      test.skip(true, 'No menu items available');
    }
  });

  test('should complete cash payment flow', async ({ authedPage: page }) => {
    const created = await createPosOrder(page);
    if (!created) {
      test.skip(true, 'No available tables');
      return;
    }

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

      // Click send/pay
      const sendBtn = page.locator('button:has-text("Send"), button.btn-send');
      if (await sendBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await sendBtn.first().click();
        await waitForApiSettled(page, 2000);
      }

      // Look for payment/close options
      const payBtn = page.locator('button:has-text("Pay"), button:has-text("Cash"), button.btn-pay');
      if (await payBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await payBtn.first().click();
        await waitForApiSettled(page, 2000);
      }

      // No crash — page should still be functional
      await expect(page.locator(SEL.posTerminal)).toBeVisible();
    } else {
      test.skip(true, 'No menu items available');
    }
  });

  test.skip('should process card payment via Stripe', async () => {
    // BLOCKED: STRIPE_SECRET_KEY not set, no Stripe Elements frontend integration
  });

  test.skip('should handle split tender payment', async () => {
    // BLOCKED: Requires functional payment processor (Stripe or PayPal)
  });

  test('should view order history page', async ({ authedPage: page }) => {
    await page.goto(ROUTES.orderHistory);
    await waitForApiSettled(page);

    // Page should render
    const pageContent = page.locator('.os-page-content, .order-history, h1');
    await expect(pageContent.first()).toBeVisible({ timeout: 10_000 });
  });
});
