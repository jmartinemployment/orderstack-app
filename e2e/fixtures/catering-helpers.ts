import { Page } from '@playwright/test';

export const CATERING_CREDENTIALS = {
  email: 'owner@taipa.com',
  password: 'owner123',
};

export const CATERING_ROUTES = {
  catering: '/app/catering',
  proposals: '/app/proposals',
  invoices: '/app/invoices',
  milestones: '/app/invoices/milestones',
  calendar: '/app/calendar',
  clients: '/app/clients',
  dashboard: '/app/dashboard',
  menu: '/app/menu',
} as const;

/** Login and land on a catering route. */
export async function loginAsCateringOwner(page: Page, route = '/app/catering') {
  await page.goto('/login');
  await page.locator('input[formcontrolname="email"]').fill(CATERING_CREDENTIALS.email);
  await page.locator('input[formcontrolname="password"]').fill(CATERING_CREDENTIALS.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(3000);
  // Handle restaurant selection if shown
  if (page.url().includes('/select-restaurant')) {
    await page.locator('button.restaurant-item').first().click();
    await page.waitForTimeout(2000);
  }
  await page.goto(route);
  await page.waitForTimeout(2000);
}

/** Create a test catering job and return its URL. */
export async function createTestJob(page: Page, title = 'E2E Test Job'): Promise<string> {
  await page.goto('/app/catering');
  await page.waitForTimeout(1000);
  await page.locator('button:has-text("New Job")').click();
  await page.waitForTimeout(500);
  await page.locator('input[placeholder*="Johnson"]').fill(title);
  await page.locator('input[type="date"]').fill('2026-06-15');
  await page.locator('input[type="time"]').first().fill('18:00');
  await page.locator('input[type="time"]').last().fill('22:00');
  // Client name
  const clientInput = page.locator('input').filter({ hasText: '' }).nth(3);
  await clientInput.fill('E2E Client');
  await page.locator('button:has-text("Create Job")').click();
  await page.waitForTimeout(2000);
  return page.url();
}
