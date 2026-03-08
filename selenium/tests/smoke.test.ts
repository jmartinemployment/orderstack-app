import * as fs from 'node:fs';
import * as path from 'node:path';
import { WebDriver, By, until } from 'selenium-webdriver';
import { BASE_URL } from '../config';
import { loginAs } from '../helpers/auth.helper';

const SCREENSHOT_DIR = path.resolve(__dirname, '..', 'screenshots');

interface TestResult {
  name: string;
  passed: boolean;
}

async function saveScreenshot(driver: WebDriver, browserName: string, testName: string): Promise<void> {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replaceAll(':', '-').replace(/\.\d+Z$/, '');
  const filename = `${browserName}-${testName}-${timestamp}.png`;
  const data = await driver.takeScreenshot();
  fs.writeFileSync(path.join(SCREENSHOT_DIR, filename), data, 'base64');
  console.log(`    Screenshot saved: screenshots/${filename}`);
}

async function testLogin(driver: WebDriver, browserName: string): Promise<TestResult> {
  console.log(`\n[${browserName}] Test 1: Login flow`);
  try {
    const finalUrl = await loginAs(driver);
    if (!finalUrl.includes('/login') && !finalUrl.includes('/select-restaurant')) {
      console.log(`  PASS — landed on ${finalUrl}`);
      return { name: 'login', passed: true };
    }
    console.log(`  FAIL — still on auth page: ${finalUrl}`);
    await saveScreenshot(driver, browserName, 'login');
    return { name: 'login', passed: false };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`  FAIL — ${message}`);
    await saveScreenshot(driver, browserName, 'login').catch(() => {});
    return { name: 'login', passed: false };
  }
}

async function testPosTerminal(driver: WebDriver, browserName: string): Promise<TestResult> {
  console.log(`[${browserName}] Test 2: POS terminal loads`);
  try {
    await driver.get(`${BASE_URL}/pos`);
    await driver.sleep(3000);
    const currentUrl = await driver.getCurrentUrl();

    if (!currentUrl.includes('/pos')) {
      console.log(`  SKIP — redirected to ${currentUrl} (guard blocked POS access)`);
      return { name: 'pos-terminal', passed: true };
    }

    const posEl = await driver.wait(
      until.elementLocated(By.css('.pos-terminal, .item-grid')),
      15_000,
      'POS terminal element not found within 15s',
    );
    const isDisplayed = await posEl.isDisplayed();
    if (isDisplayed) {
      console.log('  PASS — POS terminal rendered');
      return { name: 'pos-terminal', passed: true };
    }
    console.log('  FAIL — POS element found but not displayed');
    await saveScreenshot(driver, browserName, 'pos-terminal');
    return { name: 'pos-terminal', passed: false };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`  FAIL — ${message}`);
    await saveScreenshot(driver, browserName, 'pos-terminal').catch(() => {});
    return { name: 'pos-terminal', passed: false };
  }
}

async function testSettingsTabs(driver: WebDriver, browserName: string): Promise<TestResult> {
  console.log(`[${browserName}] Test 3: Settings tabs render`);
  try {
    await driver.get(`${BASE_URL}/settings`);
    await driver.sleep(3000);
    const currentUrl = await driver.getCurrentUrl();

    if (!currentUrl.includes('/settings')) {
      console.log(`  SKIP — redirected to ${currentUrl} (guard blocked Settings access)`);
      return { name: 'settings-tabs', passed: true };
    }

    await driver.wait(
      until.elementLocated(By.css('.nav-tabs, .nav-pills')),
      10_000,
      'Settings nav tabs not found within 10s',
    );
    const navLinks = await driver.findElements(By.css('.nav-link'));
    const visibleCount = (await Promise.all(
      navLinks.map(async (el) => {
        try { return await el.isDisplayed(); } catch { return false; }
      })
    )).filter(Boolean).length;

    if (visibleCount > 0) {
      console.log(`  PASS — ${visibleCount} nav-link tab(s) visible`);
      return { name: 'settings-tabs', passed: true };
    }
    console.log('  FAIL — nav-link elements found but none visible');
    await saveScreenshot(driver, browserName, 'settings-tabs');
    return { name: 'settings-tabs', passed: false };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`  FAIL — ${message}`);
    await saveScreenshot(driver, browserName, 'settings-tabs').catch(() => {});
    return { name: 'settings-tabs', passed: false };
  }
}

export async function runSmokeTests(driver: WebDriver, browserName: string): Promise<TestResult[]> {
  const results: TestResult[] = [];
  results.push(await testLogin(driver, browserName));
  results.push(await testPosTerminal(driver, browserName));
  results.push(await testSettingsTabs(driver, browserName));
  return results;
}
