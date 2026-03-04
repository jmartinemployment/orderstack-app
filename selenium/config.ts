import { Builder, WebDriver } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';
import firefox from 'selenium-webdriver/firefox';
import safari from 'selenium-webdriver/safari';

export type BrowserName = 'chrome' | 'firefox' | 'safari';

export const BASE_URL = process.env['SELENIUM_BASE_URL'] ?? 'http://localhost:4200';

export async function getDriver(browser: BrowserName): Promise<WebDriver> {
  let driver: WebDriver;

  switch (browser) {
    case 'chrome': {
      const options = new chrome.Options();
      options.addArguments('--headless=new', '--no-sandbox', '--disable-gpu', '--window-size=1440,900');
      driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
      break;
    }
    case 'firefox': {
      const options = new firefox.Options();
      options.addArguments('--width=1440', '--height=900');
      driver = await new Builder().forBrowser('firefox').setFirefoxOptions(options).build();
      break;
    }
    case 'safari': {
      const options = new safari.Options();
      driver = await new Builder().forBrowser('safari').setSafariOptions(options).build();
      break;
    }
    default:
      throw new Error(`Unsupported browser: ${browser}`);
  }

  await driver.manage().setTimeouts({
    implicit: 10_000,
    pageLoad: 30_000,
  });

  return driver;
}
