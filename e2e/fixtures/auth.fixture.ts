import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { CREDENTIALS } from './test-data';
import { SEL } from '../helpers/selectors';

type AuthFixtures = {
  authedPage: Page;
};

/**
 * Extended test fixture that provides a pre-authenticated page.
 * Logs in as owner, handles restaurant selection, and lands on /home.
 */
export const test = base.extend<AuthFixtures>({
  authedPage: async ({ page }, use) => {
    // Navigate to login
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    // Fill credentials
    await page.locator(SEL.emailInput).fill(CREDENTIALS.owner.email);
    await page.locator(SEL.passwordInput).fill(CREDENTIALS.owner.password);
    await page.locator(SEL.submitBtn).click();

    // Wait for navigation after login
    await page.waitForTimeout(4000);

    // Handle restaurant selection if redirected
    if (page.url().includes('/select-restaurant')) {
      const restaurantItem = page.locator(SEL.restaurantItem).first();
      await restaurantItem.waitFor({ state: 'visible', timeout: 10_000 });
      await restaurantItem.click();
      await page.waitForTimeout(3000);
    }

    // Should be on home or an authenticated route
    await page.waitForURL(/\/(home|pos|orders|menu)/, { timeout: 15_000 });

    await use(page);
  },
});

export { expect };
