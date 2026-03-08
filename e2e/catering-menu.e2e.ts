/**
 * E2E tests: Menu Management (/app/menu)
 * Covers: categories, items (including BUG-13 select dismiss), modifiers
 */
import { test, expect } from '@playwright/test';
import { loginAsCateringOwner } from './fixtures/catering-helpers';

test.describe('Menu Management', { tag: '@menu' }, () => {

  test.beforeEach(async ({ page }) => {
    await loginAsCateringOwner(page, '/app/menu?type=catering');
    await page.waitForTimeout(1000);
  });

  // ─── Page Load ────────────────────────────────────────────────────────────

  test('MENU-01: menu management page loads without TS error overlay', async ({ page }) => {
    const body = await page.locator('body').textContent();
    expect(body).not.toContain('TS2339');
    expect(body).not.toContain('does not exist on type');
  });

  test('MENU-02: Categories, Items, Modifiers tabs are visible', async ({ page }) => {
    await expect(page.locator('[role="tab"], .os-tab').filter({ hasText: 'Categories' })).toBeVisible();
    await expect(page.locator('[role="tab"], .os-tab').filter({ hasText: 'Items' })).toBeVisible();
    await expect(page.locator('[role="tab"], .os-tab').filter({ hasText: 'Modifiers' })).toBeVisible();
  });

  // ─── Categories Tab ───────────────────────────────────────────────────────

  test('MENU-03: Categories tab renders category list or empty state', async ({ page }) => {
    await page.locator('[role="tab"], .os-tab').filter({ hasText: 'Categories' }).click();
    await page.waitForTimeout(500);
    // Either has categories or empty state — no crash
    const hasContent = await page.locator('os-category-management, [class*="category"]').count();
    expect(hasContent).toBeGreaterThan(0);
  });

  // ─── Items Tab ────────────────────────────────────────────────────────────

  test('MENU-04: Items tab renders', async ({ page }) => {
    await page.locator('[role="tab"], .os-tab').filter({ hasText: 'Items' }).click();
    await page.waitForTimeout(500);
    await expect(page.locator('os-item-management, [class*="item-management"]')).toBeVisible();
  });

  test('MENU-05: Add Item modal opens and stays open when clicking Category select', async ({ page }) => {
    await page.locator('[role="tab"], .os-tab').filter({ hasText: 'Items' }).click();
    await page.waitForTimeout(500);
    await page.locator('button:has-text("Add Item"), button:has-text("+ Item")').first().click();
    await page.waitForTimeout(500);

    // Modal must be open
    const modal = page.locator('.modal, [class*="modal"], [class*="drawer"]').first();
    await expect(modal).toBeVisible();

    // Click the Category <select> — BUG-13: modal should NOT close
    const categorySelect = page.locator('select').first();
    await categorySelect.click();
    await page.waitForTimeout(300);

    // Modal must STILL be open — this is the BUG-13 regression test
    await expect(modal).toBeVisible();
  });

  test('MENU-06: Add Item form has Name, Price, Category fields', async ({ page }) => {
    await page.locator('[role="tab"], .os-tab').filter({ hasText: 'Items' }).click();
    await page.waitForTimeout(500);
    await page.locator('button:has-text("Add Item"), button:has-text("+ Item")').first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('input[placeholder*="name"], input[formcontrolname="name"]').first()).toBeVisible();
    await expect(page.locator('input[type="number"], input[formcontrolname="price"]').first()).toBeVisible();
    await expect(page.locator('select').first()).toBeVisible();
  });

  test('MENU-07: Add Item modal closes with Cancel button', async ({ page }) => {
    await page.locator('[role="tab"], .os-tab').filter({ hasText: 'Items' }).click();
    await page.waitForTimeout(500);
    await page.locator('button:has-text("Add Item"), button:has-text("+ Item")').first().click();
    await page.waitForTimeout(500);
    await page.locator('button:has-text("Cancel")').click();
    await page.waitForTimeout(300);
    const modal = page.locator('.modal, [class*="modal"]').first();
    await expect(modal).not.toBeVisible();
  });

  // ─── Modifiers Tab ────────────────────────────────────────────────────────

  test('MENU-08: Modifiers tab renders', async ({ page }) => {
    await page.locator('[role="tab"], .os-tab').filter({ hasText: 'Modifiers' }).click();
    await page.waitForTimeout(500);
    await expect(page.locator('os-modifier-management, [class*="modifier"]')).toBeVisible();
  });

  test('MENU-09: Create Modifier Group form opens and submits', async ({ page }) => {
    await page.locator('[role="tab"], .os-tab').filter({ hasText: 'Modifiers' }).click();
    await page.waitForTimeout(500);
    await page.locator('button:has-text("Create"), button:has-text("Add Modifier")').first().click();
    await page.waitForTimeout(500);
    const nameInput = page.locator('input').first();
    await nameInput.fill('E2E Modifier Group');
    await page.locator('button:has-text("Save"), button:has-text("Create")').last().click();
    await page.waitForTimeout(2000);
    await expect(page.locator('text=E2E Modifier Group')).toBeVisible({ timeout: 5000 });
  });

  test('MENU-10: modifier group expand chevron reveals options panel', async ({ page }) => {
    await page.locator('[role="tab"], .os-tab').filter({ hasText: 'Modifiers' }).click();
    await page.waitForTimeout(500);
    // Click the first chevron/expand button
    const chevron = page.locator('button[class*="chevron"], button[class*="expand"], [class*="chevron"]').first();
    if (await chevron.count() > 0) {
      await chevron.click();
      await page.waitForTimeout(500);
      // Options panel should now be visible
      await expect(page.locator('[class*="options"], [class*="expand"]').nth(1)).toBeVisible();
    }
  });

});
