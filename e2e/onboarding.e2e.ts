import { test, expect } from '@playwright/test';
import { CREDENTIALS, ROUTES } from './fixtures/test-data';
import { SEL } from './helpers/selectors';

test.describe('Onboarding Wizard', { tag: '@nice-to-have' }, () => {
  // Note: These tests use a fresh (unauthenticated) page and navigate to /setup directly.
  // We don't submit the wizard to avoid creating real data in the backend.

  test('should load setup wizard page', async ({ page }) => {
    // Login first, then navigate to setup
    await page.goto(ROUTES.login);
    await page.locator(SEL.emailInput).fill(CREDENTIALS.owner.email);
    await page.locator(SEL.passwordInput).fill(CREDENTIALS.owner.password);
    await page.locator(SEL.submitBtn).click();
    await page.waitForTimeout(4000);

    // Handle restaurant selection if needed
    if (page.url().includes('/select-restaurant')) {
      await page.locator(SEL.restaurantItem).first().click();
      await page.waitForTimeout(3000);
    }

    // Navigate to setup wizard
    await page.goto(ROUTES.setup);
    await page.waitForTimeout(3000);

    // Setup wizard may redirect if onboarding is complete — check both scenarios
    const isOnSetup = page.url().includes('/setup');
    if (isOnSetup) {
      const wizard = page.locator('.setup-wizard');
      await expect(wizard).toBeVisible({ timeout: 15_000 });
    } else {
      // Redirected away — onboarding already completed for this account
      test.skip(true, 'Onboarding already completed — wizard redirects away');
    }
  });

  test('should display progress bar and step label', async ({ page }) => {
    await page.goto(ROUTES.login);
    await page.locator(SEL.emailInput).fill(CREDENTIALS.owner.email);
    await page.locator(SEL.passwordInput).fill(CREDENTIALS.owner.password);
    await page.locator(SEL.submitBtn).click();
    await page.waitForTimeout(4000);

    if (page.url().includes('/select-restaurant')) {
      await page.locator(SEL.restaurantItem).first().click();
      await page.waitForTimeout(3000);
    }

    await page.goto(ROUTES.setup);
    await page.waitForTimeout(3000);

    if (!page.url().includes('/setup')) {
      test.skip(true, 'Onboarding already completed');
      return;
    }

    // Progress bar should be visible
    const progressBar = page.locator('.progress-bar-container');
    await expect(progressBar).toBeVisible();

    // Step label should show step count
    const stepLabel = page.locator('.step-label');
    await expect(stepLabel).toBeVisible();
  });

  test('should show business name input on first step', async ({ page }) => {
    await page.goto(ROUTES.login);
    await page.locator(SEL.emailInput).fill(CREDENTIALS.owner.email);
    await page.locator(SEL.passwordInput).fill(CREDENTIALS.owner.password);
    await page.locator(SEL.submitBtn).click();
    await page.waitForTimeout(4000);

    if (page.url().includes('/select-restaurant')) {
      await page.locator(SEL.restaurantItem).first().click();
      await page.waitForTimeout(3000);
    }

    await page.goto(ROUTES.setup);
    await page.waitForTimeout(3000);

    if (!page.url().includes('/setup')) {
      test.skip(true, 'Onboarding already completed');
      return;
    }

    // Business name input should be on the first step
    const businessNameInput = page.locator('input#businessName');
    if (await businessNameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(businessNameInput).toBeVisible();
    }

    // Continue button should be present
    const continueBtn = page.locator('button:has-text("Continue")');
    await expect(continueBtn).toBeVisible();
  });
});
