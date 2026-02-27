const { chromium } = require('playwright');
const fs = require('fs');

const TARGET_URL = 'http://localhost:4200';
const SCREENSHOT_DIR = '/tmp/os-audit';
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // Track API calls
  page.on('response', async resp => {
    const url = resp.url();
    if (url.includes('/api/') && resp.request().method() === 'POST' && url.includes('/orders')) {
      console.log(`\n=== ORDER CREATED ===`);
      console.log(`Status: ${resp.status()}`);
      try {
        const body = await resp.json();
        console.log(`Order ID: ${body.id}`);
        console.log(`Order Number: ${body.orderNumber}`);
        console.log(`Order Type: ${body.orderType}`);
        console.log(`Order Source: ${body.orderSource}`);
        console.log(`Table ID: ${body.tableId || 'none'}`);
        console.log(`Table Number: ${body.tableNumber || 'none'}`);
      } catch {}
    }
  });

  // Login as admin
  console.log('=== Logging in ===');
  await page.goto(`${TARGET_URL}/login`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.locator('input[formcontrolname="email"]').fill('admin@orderstack.com');
  await page.locator('input[formcontrolname="password"]').fill('admin123');
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(4000);

  if (page.url().includes('/select-restaurant')) {
    await page.waitForTimeout(2000);
    await page.locator('.restaurant-item').first().click();
    await page.waitForTimeout(3000);
  }
  console.log('Logged in, URL:', page.url());

  // Use authenticated kiosk route
  await page.goto(`${TARGET_URL}/kiosk`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  console.log('\n=== KIOSK PAGE ===');
  console.log('URL:', page.url());

  // Check if redirected away
  if (!page.url().includes('/kiosk')) {
    console.log('REDIRECTED AWAY from /kiosk — trying public route');
    await page.goto(`${TARGET_URL}/kiosk/taipa-kendall`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    console.log('URL after public route:', page.url());
  }

  await page.screenshot({ path: `${SCREENSHOT_DIR}/kiosk-initial.png`, fullPage: true });

  // Count grid items
  const itemCount = await page.locator('.item-tile:not(.item-tile-empty)').count();
  console.log(`Grid items: ${itemCount}`);

  if (itemCount < 2) {
    console.log('Not enough grid items. Checking page state...');
    const pageText = await page.evaluate(() => document.body.innerText.substring(0, 500));
    console.log('Page text:', pageText);
    await browser.close();
    return;
  }

  // Add 2 items to cart
  console.log('\n--- Adding items to cart ---');
  await page.locator('.item-tile:not(.item-tile-empty)').nth(0).click();
  await page.waitForTimeout(300);
  await page.locator('.item-tile:not(.item-tile-empty)').nth(1).click();
  await page.waitForTimeout(300);

  const cartCount = await page.locator('.sale-line-item').count();
  console.log(`Cart items: ${cartCount}`);

  const chargeBtn = page.locator('.charge-btn');
  const chargeText = await chargeBtn.textContent();
  console.log(`Charge button: "${chargeText?.trim()}"`);

  await page.screenshot({ path: `${SCREENSHOT_DIR}/kiosk-with-cart.png`, fullPage: true });

  // Click Charge
  console.log('\n--- Clicking Charge ---');
  await chargeBtn.click();
  await page.waitForTimeout(1000);

  const overlayVisible = await page.locator('.checkout-overlay').count();
  console.log(`Checkout overlay visible: ${overlayVisible > 0 ? 'YES' : 'NO'}`);

  if (overlayVisible > 0) {
    const dineInBtn = page.locator('.dining-option-card', { hasText: 'Dine In' });
    const takeoutBtn = page.locator('.dining-option-card', { hasText: 'Takeout' });
    console.log(`Dine In option: ${await dineInBtn.count() > 0 ? 'YES' : 'NO'}`);
    console.log(`Takeout option: ${await takeoutBtn.count() > 0 ? 'YES' : 'NO'}`);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/kiosk-dining-options.png`, fullPage: true });

    // === TEST 1: Takeout flow ===
    console.log('\n=== TEST 1: Takeout flow ===');
    await takeoutBtn.click();
    await page.waitForTimeout(4000);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/kiosk-after-takeout.png`, fullPage: true });

    const step1 = await page.evaluate(() => {
      const overlay = document.querySelector('.checkout-overlay');
      if (!overlay) return 'no-overlay';
      const title = overlay.querySelector('.checkout-title')?.textContent?.trim() ?? '';
      if (title.includes('Payment')) return 'payment';
      if (title.includes('wrong')) return 'failed';
      if (title.includes('placed')) return 'success';
      if (overlay.querySelector('.spinner-border')) return 'creating-order';
      return `unknown: "${title}"`;
    });
    console.log(`After takeout -> step: ${step1}`);

    if (step1 === 'payment') {
      const terminal = await page.locator('os-payment-terminal').count();
      console.log(`Payment terminal rendered: ${terminal > 0 ? 'YES' : 'NO'}`);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/kiosk-payment.png`, fullPage: true });
      console.log('Payment terminal is showing — order was created successfully!');

      // Cancel to test dine-in path
      const cancelBtn = page.locator('.checkout-cancel-btn');
      if (await cancelBtn.count() > 0) {
        await cancelBtn.click();
        await page.waitForTimeout(500);
      }
    } else if (step1 === 'failed') {
      const error = await page.locator('.checkout-subtitle').textContent();
      console.log(`Error: ${error?.trim()}`);

      // Cancel to test dine-in path
      const cancelBtn = page.locator('.checkout-cancel-btn', { hasText: 'Go back' });
      if (await cancelBtn.count() > 0) {
        await cancelBtn.click();
        await page.waitForTimeout(500);
      }
    }

    // === TEST 2: Dine In flow ===
    console.log('\n=== TEST 2: Dine In flow ===');
    // Re-add items if cart was cleared
    const currentCart = await page.locator('.sale-line-item').count();
    if (currentCart === 0) {
      await page.locator('.item-tile:not(.item-tile-empty)').nth(0).click();
      await page.waitForTimeout(300);
      await page.locator('.item-tile:not(.item-tile-empty)').nth(1).click();
      await page.waitForTimeout(300);
    }

    await chargeBtn.click();
    await page.waitForTimeout(1000);

    const dineInBtn2 = page.locator('.dining-option-card', { hasText: 'Dine In' });
    if (await dineInBtn2.count() > 0) {
      await dineInBtn2.click();
      await page.waitForTimeout(3000);

      await page.screenshot({ path: `${SCREENSHOT_DIR}/kiosk-dine-in.png`, fullPage: true });

      const step2 = await page.evaluate(() => {
        const overlay = document.querySelector('.checkout-overlay');
        if (!overlay) return 'no-overlay';
        const title = overlay.querySelector('.checkout-title')?.textContent?.trim() ?? '';
        if (overlay.querySelector('.table-grid')) return 'table-select';
        if (overlay.querySelector('.no-tables-msg')) return 'no-tables-skip';
        if (overlay.querySelector('.checkout-skip-btn')) return 'has-skip';
        if (title.includes('Payment')) return 'payment';
        if (title.includes('wrong')) return 'failed';
        if (overlay.querySelector('.spinner-border')) return 'creating-order';
        return `unknown: "${title}"`;
      });
      console.log(`After dine in -> step: ${step2}`);

      if (step2 === 'table-select') {
        const tableCards = await page.locator('.table-card').count();
        console.log(`Available tables: ${tableCards}`);

        if (tableCards > 0) {
          const tableNum = await page.locator('.table-card').first().locator('.table-number').textContent();
          console.log(`Selecting table: ${tableNum?.trim()}`);
          await page.locator('.table-card').first().click();
          await page.waitForTimeout(4000);
          await page.screenshot({ path: `${SCREENSHOT_DIR}/kiosk-after-table.png`, fullPage: true });

          const step3 = await page.evaluate(() => {
            const overlay = document.querySelector('.checkout-overlay');
            if (!overlay) return 'no-overlay';
            const title = overlay.querySelector('.checkout-title')?.textContent?.trim() ?? '';
            if (title.includes('Payment')) return 'payment';
            if (title.includes('wrong')) return 'failed';
            if (title.includes('placed')) return 'success';
            return `unknown: "${title}"`;
          });
          console.log(`After table select -> step: ${step3}`);
        }
      } else if (step2 === 'payment' || step2 === 'no-tables-skip') {
        console.log('No tables configured — went straight to payment/order creation');
      }
    }
  }

  console.log('\n========== DONE ==========');
  console.log('Screenshots saved to /tmp/os-audit/');
  await browser.close();
})();
