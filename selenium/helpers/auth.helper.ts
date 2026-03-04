import { WebDriver, By, until } from 'selenium-webdriver';
import { BASE_URL } from '../config';

export async function loginAs(
  driver: WebDriver,
  email = 'owner@taipa.com',
  password = 'owner123',
): Promise<string> {
  await driver.get(`${BASE_URL}/login`);

  // Wait for the email input to be visible
  const emailInput = await driver.wait(
    until.elementLocated(By.css('input[formcontrolname="email"]')),
    10_000,
    'Email input not found on login page',
  );
  await driver.wait(until.elementIsVisible(emailInput), 5_000);

  await emailInput.clear();
  await emailInput.sendKeys(email);

  const passwordInput = await driver.findElement(By.css('input[formcontrolname="password"]'));
  await passwordInput.clear();
  await passwordInput.sendKeys(password);

  const submitBtn = await driver.findElement(By.css('button[type="submit"]'));
  await submitBtn.click();

  // Wait for URL to no longer contain /login (up to 15s)
  await driver.wait(async () => {
    const url = await driver.getCurrentUrl();
    return !url.includes('/login');
  }, 15_000, 'Login did not redirect away from /login within 15s');

  // Handle restaurant selection if redirected there
  const currentUrl = await driver.getCurrentUrl();
  if (currentUrl.includes('/select-restaurant')) {
    // Wait for restaurant items to render (Angular async rendering)
    await driver.sleep(2000);

    const restaurantItem = await driver.wait(
      until.elementLocated(By.css('button.restaurant-item')),
      10_000,
      'No restaurant-item button found on select-restaurant page',
    );
    await driver.wait(until.elementIsVisible(restaurantItem), 5_000);

    // Use JavaScript click to ensure Angular event binding fires
    await driver.executeScript('arguments[0].click()', restaurantItem);

    // After selection, app may route to /app/administration, /home, /onboarding, etc.
    await driver.wait(async () => {
      const url = await driver.getCurrentUrl();
      return !url.includes('/select-restaurant');
    }, 15_000, 'Did not navigate away from /select-restaurant after selection');
  }

  return driver.getCurrentUrl();
}
