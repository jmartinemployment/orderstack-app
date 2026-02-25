import { test, expect } from '@playwright/test';
import { CREDENTIALS, ROUTES } from './fixtures/test-data';
import { SEL } from './helpers/selectors';
import { test as authedTest } from './fixtures/auth.fixture';

test.describe('Authentication', { tag: '@critical' }, () => {
  test('should display sign-in form on /login', async ({ page }) => {
    await page.goto(ROUTES.login);
    await expect(page.locator(SEL.loginHeading)).toBeVisible();
    await expect(page.locator(SEL.emailInput)).toBeVisible();
    await expect(page.locator(SEL.passwordInput)).toBeVisible();
    await expect(page.locator(SEL.submitBtn)).toBeVisible();
    await expect(page.locator(SEL.switchToSignUp)).toBeVisible();
  });

  test('should display sign-up form on /signup', async ({ page }) => {
    await page.goto(ROUTES.signup);
    await expect(page.locator(SEL.signupHeading)).toBeVisible();
    await expect(page.locator(SEL.firstNameInput)).toBeVisible();
    await expect(page.locator(SEL.lastNameInput)).toBeVisible();
    await expect(page.locator(SEL.emailInput)).toBeVisible();
    await expect(page.locator(SEL.passwordInput)).toBeVisible();
    await expect(page.locator(SEL.termsCheckbox)).toBeVisible();
  });

  test('should show validation errors on empty login submit', async ({ page }) => {
    await page.goto(ROUTES.login);
    // Touch the fields and submit
    await page.locator(SEL.emailInput).click();
    await page.locator(SEL.passwordInput).click();
    await page.locator(SEL.submitBtn).click();
    // Validation errors should appear
    await expect(page.locator('.invalid-feedback.d-block').first()).toBeVisible();
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto(ROUTES.login);
    await page.locator(SEL.emailInput).fill('wrong@example.com');
    await page.locator(SEL.passwordInput).fill('wrongpassword');
    await page.locator(SEL.submitBtn).click();
    // Wait for error to appear
    await expect(page.locator(SEL.loginError)).toBeVisible({ timeout: 10_000 });
  });

  test('should login as owner and reach home', async ({ page }) => {
    await page.goto(ROUTES.login);
    await page.locator(SEL.emailInput).fill(CREDENTIALS.owner.email);
    await page.locator(SEL.passwordInput).fill(CREDENTIALS.owner.password);
    await page.locator(SEL.submitBtn).click();

    // Wait for navigation
    await page.waitForTimeout(4000);

    // Handle restaurant selection if needed
    if (page.url().includes('/select-restaurant')) {
      const item = page.locator(SEL.restaurantItem).first();
      await item.waitFor({ state: 'visible', timeout: 10_000 });
      await item.click();
      await page.waitForTimeout(3000);
    }

    // Should reach an authenticated route
    await expect(page).toHaveURL(/\/(home|pos|orders|menu)/);
  });

  test('should redirect unauthenticated user to signup', async ({ browser }) => {
    // Use a completely fresh browser context (no cookies, no localStorage)
    const context = await browser.newContext();
    const freshPage = await context.newPage();

    await freshPage.goto(ROUTES.home);
    await freshPage.waitForTimeout(5000);

    // Should redirect to signup or login
    expect(freshPage.url()).toMatch(/\/(signup|login)/);

    await context.close();
  });

  test('should persist session across page reload', async ({ page }) => {
    // Login first
    await page.goto(ROUTES.login);
    await page.locator(SEL.emailInput).fill(CREDENTIALS.owner.email);
    await page.locator(SEL.passwordInput).fill(CREDENTIALS.owner.password);
    await page.locator(SEL.submitBtn).click();
    await page.waitForTimeout(4000);

    if (page.url().includes('/select-restaurant')) {
      await page.locator(SEL.restaurantItem).first().click();
      await page.waitForTimeout(3000);
    }

    await page.waitForURL(/\/(home|pos|orders|menu)/, { timeout: 15_000 });

    // Reload the page
    await page.reload();
    await page.waitForTimeout(3000);

    // Should still be on authenticated route (not redirected to signup)
    expect(page.url()).not.toMatch(/\/(signup|login)/);
  });

  test('should switch between sign-in and sign-up forms', async ({ page }) => {
    await page.goto(ROUTES.login);
    await expect(page.locator(SEL.loginHeading)).toBeVisible();

    // Switch to signup
    await page.locator(SEL.switchToSignUp).click();
    await expect(page.locator(SEL.signupHeading)).toBeVisible();

    // Switch back to signin
    await page.locator(SEL.switchToSignIn).click();
    await expect(page.locator(SEL.loginHeading)).toBeVisible();
  });
});
