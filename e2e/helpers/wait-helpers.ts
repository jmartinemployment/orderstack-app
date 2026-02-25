import { type Page } from '@playwright/test';

/** Wait until all loading spinners disappear from the page. */
export async function waitForSpinnersGone(page: Page, timeout = 10_000): Promise<void> {
  try {
    await page.waitForFunction(
      () => document.querySelectorAll('.spinner-border, os-loading-spinner').length === 0,
      { timeout },
    );
  } catch {
    // Spinners may not appear at all — that's fine
  }
}

/** Brief wait for API calls to settle after navigation. */
export async function waitForApiSettled(page: Page, ms = 3000): Promise<void> {
  await page.waitForTimeout(ms);
}

/** Collect API errors (404s and 5xx) during a test for diagnostic reporting. */
export function collectApiErrors(page: Page): Array<{ method: string; path: string; status: number }> {
  const errors: Array<{ method: string; path: string; status: number }> = [];
  page.on('response', (resp) => {
    const url = resp.url();
    if (url.includes('/api/') && (resp.status() === 404 || resp.status() >= 500)) {
      errors.push({
        method: resp.request().method(),
        path: new URL(url).pathname,
        status: resp.status(),
      });
    }
  });
  return errors;
}
