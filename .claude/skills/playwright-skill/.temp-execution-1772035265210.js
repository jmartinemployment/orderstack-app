const { chromium } = require('playwright');
const fs = require('fs');

const TARGET_URL = 'http://localhost:4200';
const OWNER_EMAIL = 'owner@taipa.com';
const OWNER_PASSWORD = 'owner123';
const SCREENSHOT_DIR = '/tmp/os-audit';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // Global tracking
  const globalApi404s = new Map();
  const globalApi400s = new Map();
  const globalApi5xx = new Map();
  const globalJsErrors = [];
  const allPageResults = [];

  // Per-page API error tracking
  let currentPageApi404s = [];
  let currentPageApi400s = [];
  let currentPageApi5xx = [];

  // Intercept ALL API responses
  page.on('response', async response => {
    const url = response.url();
    const status = response.status();
    const method = response.request().method();
    if (!url.includes('/api/')) return;
    const path = new URL(url).pathname;
    const key = `${method} ${path}`;

    if (status === 404) {
      currentPageApi404s.push(key);
      const existing = globalApi404s.get(key) || { method, path, count: 0 };
      existing.count++;
      globalApi404s.set(key, existing);
    } else if (status >= 400 && status < 500 && status !== 401 && status !== 404) {
      currentPageApi400s.push(`${key} [${status}]`);
      const existing = globalApi400s.get(key) || { method, path, count: 0, status };
      existing.count++;
      globalApi400s.set(key, existing);
    } else if (status >= 500) {
      currentPageApi5xx.push(`${key} [${status}]`);
      const existing = globalApi5xx.get(key) || { method, path, count: 0, status };
      existing.count++;
      globalApi5xx.set(key, existing);
    }
  });

  page.on('pageerror', error => {
    globalJsErrors.push({ message: error.message, url: page.url() });
  });

  // Filtered console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('favicon') && !text.includes('ngsw') && !text.includes('service-worker')) {
        consoleErrors.push({ text: text.substring(0, 200), url: page.url() });
      }
    }
  });

  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  // --- Audit function ---
  async function auditPage(name, path, options = {}) {
    const { wait = 3000, tabs = [], interactions = [], checkFor = [], seedDataChecks = [] } = options;

    // Reset per-page trackers
    currentPageApi404s = [];
    currentPageApi400s = [];
    currentPageApi5xx = [];

    const result = {
      name,
      path,
      status: 'PASS',
      loadTime: 0,
      issues: [],
      warnings: [],
      api404s: [],
      api400s: [],
      api5xx: [],
      tabs: [],
      seedData: {},
    };

    try {
      const start = Date.now();
      await page.goto(`${TARGET_URL}${path}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(wait);
      result.loadTime = Date.now() - start;

      // Capture per-page API errors
      result.api404s = [...currentPageApi404s];
      result.api400s = [...currentPageApi400s];
      result.api5xx = [...currentPageApi5xx];

      const finalUrl = page.url();
      if (!finalUrl.includes(path)) {
        result.status = 'REDIRECT';
        result.issues.push(`Redirected to: ${finalUrl}`);
        allPageResults.push(result);
        printResult(result);
        return;
      }

      // Screenshot
      const safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      await page.screenshot({ path: `${SCREENSHOT_DIR}/${safeName}.png`, fullPage: true });

      const bodyText = await page.locator('body').innerText();
      const bodyHtml = await page.locator('body').innerHTML();

      // Empty page check
      if (bodyText.trim().length < 20) {
        result.issues.push('EMPTY PAGE - almost no visible text content');
      }

      // Angular error check
      if (bodyHtml.includes('NG0') || bodyText.includes('RuntimeError')) {
        result.issues.push('Angular runtime error visible');
      }

      // Stuck loading spinners
      const spinners = await page.locator('.spinner-border, .loading-spinner').count();
      if (spinners > 0) {
        await page.waitForTimeout(2000);
        const stillSpinning = await page.locator('.spinner-border, .loading-spinner').count();
        if (stillSpinning > 0) {
          result.warnings.push(`Loading spinner stuck (${stillSpinning})`);
        }
      }

      // Broken images
      const brokenImages = await page.evaluate(() => {
        return [...document.querySelectorAll('img')].filter(img => !img.complete || img.naturalWidth === 0).map(img => img.src).slice(0, 5);
      });
      if (brokenImages.length > 0) {
        result.warnings.push(`Broken images: ${brokenImages.join(', ')}`);
      }

      // Inaccessible buttons
      const badButtons = await page.evaluate(() => {
        return [...document.querySelectorAll('button, a[role="button"]')].filter(btn => {
          const text = btn.textContent?.trim();
          return !text && !btn.getAttribute('aria-label') && !btn.getAttribute('title');
        }).length;
      });
      if (badButtons > 0) {
        result.warnings.push(`${badButtons} buttons without text or aria-label`);
      }

      // Unlabeled inputs
      const badInputs = await page.evaluate(() => {
        return [...document.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), select, textarea')].filter(el => {
          const id = el.id;
          const label = id ? document.querySelector(`label[for="${id}"]`) : null;
          return !label && !el.getAttribute('aria-label') && !el.getAttribute('placeholder');
        }).length;
      });
      if (badInputs > 0) {
        result.warnings.push(`${badInputs} form inputs without labels/aria-label/placeholder`);
      }

      // Required elements check
      for (const check of checkFor) {
        const count = await page.locator(check.selector).count();
        if (check.required && count === 0) {
          result.issues.push(`Missing: ${check.name}`);
        }
      }

      // Seed data checks - verify actual data presence
      for (const seed of seedDataChecks) {
        const count = await page.locator(seed.selector).count();
        result.seedData[seed.name] = count;
        if (count === 0 && seed.expectData) {
          result.warnings.push(`No seed data: ${seed.name} (${seed.selector})`);
        }
      }

      // Tab navigation
      for (const tab of tabs) {
        try {
          const tabEl = page.locator(tab.selector);
          if (await tabEl.count() > 0) {
            // Reset per-page trackers for tab
            currentPageApi404s = [];
            currentPageApi400s = [];

            await tabEl.first().click();
            await page.waitForTimeout(1500);

            const tabScreenshot = `${safeName}-tab-${tab.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
            await page.screenshot({ path: `${SCREENSHOT_DIR}/${tabScreenshot}.png`, fullPage: true });

            // Capture tab API errors
            if (currentPageApi404s.length > 0) {
              result.api404s.push(...currentPageApi404s.map(e => `[${tab.name}] ${e}`));
            }
            if (currentPageApi400s.length > 0) {
              result.api400s.push(...currentPageApi400s.map(e => `[${tab.name}] ${e}`));
            }

            result.tabs.push({ name: tab.name, status: 'ok' });
          } else {
            result.tabs.push({ name: tab.name, status: 'NOT FOUND' });
            result.issues.push(`Tab not found: ${tab.name}`);
          }
        } catch (e) {
          result.tabs.push({ name: tab.name, status: 'error', error: e.message.substring(0, 80) });
          result.issues.push(`Tab error: ${tab.name} - ${e.message.substring(0, 60)}`);
        }
      }

      // Interactions
      for (const action of interactions) {
        try {
          const el = page.locator(action.selector);
          if (await el.count() > 0) {
            if (action.type === 'click') {
              await el.first().click();
              await page.waitForTimeout(1000);
              if (action.expectModal) {
                const modal = await page.locator('.modal, [role="dialog"]').count();
                if (modal === 0) {
                  result.warnings.push(`${action.name}: modal did not appear`);
                } else {
                  // Close modal
                  const closeBtn = page.locator('.modal .btn-close, .modal button:has-text("Cancel"), .modal button:has-text("Close")');
                  if (await closeBtn.count() > 0) await closeBtn.first().click();
                  await page.waitForTimeout(500);
                }
              }
            }
          } else if (action.required) {
            result.issues.push(`Missing: ${action.name}`);
          }
        } catch (e) {
          result.warnings.push(`Interaction: ${action.name} - ${e.message.substring(0, 60)}`);
        }
      }

      // Determine final status
      if (result.issues.length > 0) {
        result.status = 'FAIL';
      } else if (result.api404s.length > 0 || result.api400s.length > 0 || result.api5xx.length > 0 || result.warnings.length > 0) {
        result.status = 'WARN';
      }

    } catch (e) {
      result.status = 'ERROR';
      result.issues.push(`FATAL: ${e.message.substring(0, 150)}`);
    }

    allPageResults.push(result);
    printResult(result);
  }

  function printResult(r) {
    const icon = r.status === 'PASS' ? 'PASS' : r.status === 'WARN' ? 'WARN' : r.status === 'REDIRECT' ? 'REDIR' : 'FAIL';
    console.log(`  [${icon}] ${r.name} (${r.path}) ${r.loadTime}ms`);
    for (const issue of r.issues) console.log(`    ISSUE: ${issue}`);
    for (const warn of r.warnings) console.log(`    WARN:  ${warn}`);
    for (const api of r.api404s) console.log(`    404:   ${api}`);
    for (const api of r.api400s) console.log(`    4xx:   ${api}`);
    for (const api of r.api5xx) console.log(`    5xx:   ${api}`);
  }

  try {
    // ===================== LOGIN =====================
    console.log('=== Phase 1: Login & Auth ===');
    await page.goto(`${TARGET_URL}/login`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/login-page.png`, fullPage: true });

    await page.locator('input[formcontrolname="email"]').fill(OWNER_EMAIL);
    await page.locator('input[formcontrolname="password"]').fill(OWNER_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(4000);

    if (page.url().includes('/select-restaurant')) {
      console.log('  At restaurant select page...');
      await page.screenshot({ path: `${SCREENSHOT_DIR}/restaurant-select.png`, fullPage: true });
      await page.waitForTimeout(2000);
      const items = await page.locator('.restaurant-item').count();
      if (items > 0) {
        await page.locator('.restaurant-item').first().click();
        await page.waitForTimeout(3000);
      }
    }

    const isReady = !page.url().includes('/login') && !page.url().includes('/select-restaurant');
    if (!isReady) {
      console.log('FATAL: Authentication failed. Stuck at:', page.url());
      await browser.close();
      return;
    }
    console.log('  Authenticated. Current URL:', page.url());

    // ===================== CORE PAGES =====================
    console.log('\n=== Phase 2: Core Pages ===');

    await auditPage('Home Dashboard', '/home', {
      wait: 4000,
      checkFor: [
        { name: 'Dashboard Content', selector: '.dashboard, [class*="dashboard"], .home', required: false },
      ],
      seedDataChecks: [
        { name: 'KPI Cards', selector: '.kpi-card, .stat-card, [class*="kpi"], [class*="metric"]', expectData: false },
        { name: 'Activity Feed', selector: '[class*="activity"], [class*="feed"], [class*="recent"]', expectData: false },
      ],
    });

    await auditPage('Pending Orders', '/orders', {
      wait: 3000,
      checkFor: [
        { name: 'Order Content', selector: '.order-card, [class*="order"], .empty-state, [class*="empty"]', required: false },
      ],
      seedDataChecks: [
        { name: 'Order Cards', selector: '.order-card, [class*="order-card"]', expectData: false },
      ],
    });

    await auditPage('Order History', '/order-history', {
      wait: 3000,
      seedDataChecks: [
        { name: 'Order Rows', selector: 'table tbody tr, .order-row, [class*="order-item"]', expectData: false },
      ],
    });

    await auditPage('POS Terminal', '/pos', {
      wait: 3000,
      checkFor: [
        { name: 'POS Layout', selector: '[class*="pos"], [class*="terminal"]', required: false },
      ],
      seedDataChecks: [
        { name: 'Menu Categories', selector: '[class*="category"], .category-btn', expectData: false },
        { name: 'Menu Items', selector: '[class*="menu-item"], .item-card', expectData: false },
      ],
    });

    await auditPage('Order Pad', '/order-pad', { wait: 3000 });

    await auditPage('KDS Display', '/kds', {
      wait: 3000,
      seedDataChecks: [
        { name: 'KDS Tickets', selector: '.kds-card, .order-card, [class*="ticket"]', expectData: false },
      ],
    });

    await auditPage('SOS Terminal', '/sos', { wait: 3000 });

    // ===================== FOH =====================
    console.log('\n=== Phase 3: Front of House ===');

    await auditPage('Floor Plan', '/floor-plan', {
      wait: 3000,
      checkFor: [
        { name: 'Floor Area', selector: '[class*="floor"], [class*="canvas"], [class*="layout"]', required: false },
      ],
      seedDataChecks: [
        { name: 'Tables', selector: '[class*="table-node"], [class*="table-item"], [class*="table"]', expectData: false },
      ],
    });

    await auditPage('Reservations', '/reservations', {
      wait: 3000,
      tabs: [
        { name: 'Today', selector: 'button:has-text("Today"), .nav-link:has-text("Today")' },
        { name: 'Upcoming', selector: 'button:has-text("Upcoming"), .nav-link:has-text("Upcoming")' },
        { name: 'Waitlist', selector: 'button:has-text("Waitlist"), .nav-link:has-text("Waitlist")' },
        { name: 'Timeline', selector: 'button:has-text("Timeline"), .nav-link:has-text("Timeline")' },
        { name: 'Events', selector: 'button:has-text("Events"), .nav-link:has-text("Events")' },
      ],
    });

    // ===================== MENU & INVENTORY =====================
    console.log('\n=== Phase 4: Menu & Inventory ===');

    await auditPage('Menu Management', '/menu', {
      wait: 3000,
      seedDataChecks: [
        { name: 'Categories', selector: '[class*="category"]', expectData: false },
        { name: 'Menu Items', selector: '[class*="item-card"], [class*="menu-item"]', expectData: false },
      ],
    });

    await auditPage('Combo Management', '/combos', { wait: 3000 });

    await auditPage('Inventory Dashboard', '/inventory', {
      wait: 3000,
      tabs: [
        { name: 'Overview', selector: 'button:has-text("Overview"), .nav-link:has-text("Overview")' },
        { name: 'Cycle Counts', selector: 'button:has-text("Cycle"), .nav-link:has-text("Cycle")' },
      ],
    });

    // ===================== ANALYTICS & REPORTS =====================
    console.log('\n=== Phase 5: Analytics & Reports ===');

    await auditPage('Sales Dashboard', '/sales', {
      wait: 3000,
      tabs: [
        { name: 'Overview', selector: 'button:has-text("Overview"), .nav-link:has-text("Overview")' },
        { name: 'Goals', selector: 'button:has-text("Goals"), .nav-link:has-text("Goals")' },
        { name: 'Team', selector: 'button:has-text("Team"), .nav-link:has-text("Team")' },
        { name: 'Funnel', selector: 'button:has-text("Funnel"), .nav-link:has-text("Funnel")' },
        { name: 'Alerts', selector: 'button:has-text("Alerts"), .nav-link:has-text("Alerts")' },
      ],
    });

    await auditPage('Menu Engineering', '/menu-engineering', {
      wait: 3000,
      tabs: [
        { name: 'Overview', selector: 'button:has-text("Overview"), .nav-link:has-text("Overview")' },
        { name: 'Profitability', selector: 'button:has-text("Profit"), .nav-link:has-text("Profit")' },
      ],
    });

    await auditPage('Command Center', '/command-center', {
      wait: 3000,
      tabs: [
        { name: 'Live', selector: 'button:has-text("Live"), .nav-link:has-text("Live")' },
        { name: 'Insights', selector: 'button:has-text("Insights"), .nav-link:has-text("Insights")' },
        { name: 'Forecast', selector: 'button:has-text("Forecast"), .nav-link:has-text("Forecast")' },
      ],
    });

    await auditPage('Close of Day', '/close-of-day', {
      wait: 3000,
      tabs: [
        { name: 'Summary', selector: 'button:has-text("Summary"), .nav-link:has-text("Summary")' },
        { name: 'Payments', selector: 'button:has-text("Payments"), .nav-link:has-text("Payments")' },
        { name: 'Team Sales', selector: 'button:has-text("Team"), .nav-link:has-text("Team")' },
        { name: 'Taxes & Fees', selector: 'button:has-text("Tax"), .nav-link:has-text("Tax")' },
        { name: 'Delivery', selector: 'button:has-text("Delivery"), .nav-link:has-text("Delivery")' },
      ],
    });

    await auditPage('Report Dashboard', '/reports', {
      wait: 3000,
      seedDataChecks: [
        { name: 'Report Cards', selector: '[class*="report-card"], .card', expectData: false },
      ],
    });

    await auditPage('Report Builder', '/report-builder', { wait: 3000 });

    // ===================== CRM & MARKETING =====================
    console.log('\n=== Phase 6: CRM & Marketing ===');

    await auditPage('Customer Dashboard', '/customers', {
      wait: 3000,
      tabs: [
        { name: 'Customers', selector: 'button:has-text("Customers"), .nav-link:has-text("Customers")' },
        { name: 'Insights', selector: 'button:has-text("Insights"), .nav-link:has-text("Insights")' },
        { name: 'Groups', selector: 'button:has-text("Groups"), .nav-link:has-text("Groups")' },
        { name: 'Inbox', selector: 'button:has-text("Inbox"), .nav-link:has-text("Inbox")' },
      ],
    });

    await auditPage('Marketing', '/marketing', {
      wait: 3000,
      tabs: [
        { name: 'Campaigns', selector: 'button:has-text("Campaigns"), .nav-link:has-text("Campaigns")' },
        { name: 'Automations', selector: 'button:has-text("Automations"), .nav-link:has-text("Automations")' },
      ],
    });

    // ===================== OPERATIONS =====================
    console.log('\n=== Phase 7: Operations ===');

    await auditPage('Food Cost', '/food-cost', {
      wait: 3000,
      tabs: [
        { name: 'Overview', selector: 'button:has-text("Overview"), .nav-link:has-text("Overview")' },
        { name: 'Vendors', selector: 'button:has-text("Vendors"), .nav-link:has-text("Vendors")' },
        { name: 'Recipes', selector: 'button:has-text("Recipes"), .nav-link:has-text("Recipes")' },
        { name: 'Purchase Orders', selector: 'button:has-text("Purchase"), .nav-link:has-text("Purchase")' },
      ],
    });

    await auditPage('Staff Scheduling', '/scheduling', {
      wait: 3000,
      tabs: [
        { name: 'Schedule', selector: 'button:has-text("Schedule"), .nav-link:has-text("Schedule")' },
        { name: 'Timecards', selector: 'button:has-text("Timecard"), .nav-link:has-text("Timecard")' },
        { name: 'Payroll', selector: 'button:has-text("Payroll"), .nav-link:has-text("Payroll")' },
        { name: 'Compliance', selector: 'button:has-text("Compliance"), .nav-link:has-text("Compliance")' },
      ],
    });

    await auditPage('Invoicing', '/invoicing', { wait: 3000 });
    await auditPage('Cash Drawer', '/cash-drawer', { wait: 3000 });
    await auditPage('Monitoring', '/monitoring', { wait: 3000 });

    // ===================== AI TOOLS =====================
    console.log('\n=== Phase 8: AI Tools ===');

    await auditPage('AI Chat', '/ai-chat', {
      wait: 3000,
      checkFor: [
        { name: 'Chat Input', selector: 'input, textarea', required: false },
      ],
    });

    await auditPage('Voice Order', '/voice-order', { wait: 3000 });
    await auditPage('Dynamic Pricing', '/dynamic-pricing', { wait: 3000 });
    await auditPage('Waste Tracker', '/waste-tracker', { wait: 3000 });
    await auditPage('Sentiment', '/sentiment', { wait: 3000 });

    // ===================== RETAIL =====================
    console.log('\n=== Phase 9: Retail ===');

    await auditPage('Retail Catalog', '/retail/catalog', { wait: 3000 });
    await auditPage('Retail Variations', '/retail/variations', { wait: 3000 });
    await auditPage('Retail Inventory', '/retail/inventory', { wait: 3000 });
    await auditPage('Retail POS', '/retail/pos', { wait: 3000 });
    await auditPage('Retail Returns', '/retail/returns', { wait: 3000 });
    await auditPage('Retail Vendors', '/retail/vendors', { wait: 3000 });
    await auditPage('Retail Purchase Orders', '/retail/purchase-orders', { wait: 3000 });
    await auditPage('Retail Reports', '/retail/reports', { wait: 3000 });
    await auditPage('Retail Fulfillment', '/retail/fulfillment', { wait: 3000 });
    await auditPage('Retail Ecommerce', '/retail/ecommerce', { wait: 3000 });

    // ===================== ADMIN & SETTINGS =====================
    console.log('\n=== Phase 10: Admin & Settings ===');

    await auditPage('Multi-Location', '/multi-location', {
      wait: 3000,
      tabs: [
        { name: 'Overview', selector: 'button:has-text("Overview"), .nav-link:has-text("Overview")' },
        { name: 'Staff', selector: 'button:has-text("Staff"), .nav-link:has-text("Staff")' },
        { name: 'Inventory', selector: 'button:has-text("Inventory"), .nav-link:has-text("Inventory")' },
        { name: 'Compliance', selector: 'button:has-text("Compliance"), .nav-link:has-text("Compliance")' },
      ],
    });

    await auditPage('Staff Portal', '/staff-portal', { wait: 3000 });

    // Settings with ALL tabs
    await auditPage('Settings', '/settings', {
      wait: 4000,
      tabs: [
        { name: 'General', selector: 'button:has-text("General"), .nav-link:has-text("General")' },
        { name: 'Hardware', selector: 'button:has-text("Hardware"), .nav-link:has-text("Hardware")' },
        { name: 'Payment', selector: 'button:has-text("Payment"), .nav-link:has-text("Payment")' },
        { name: 'Team', selector: 'button:has-text("Team"), .nav-link:has-text("Team")' },
        { name: 'Online', selector: 'button:has-text("Online"), .nav-link:has-text("Online")' },
        { name: 'Delivery', selector: 'button:has-text("Delivery"), .nav-link:has-text("Delivery")' },
        { name: 'Loyalty', selector: 'button:has-text("Loyalty"), .nav-link:has-text("Loyalty")' },
        { name: 'Gift Cards', selector: 'button:has-text("Gift"), .nav-link:has-text("Gift")' },
        { name: 'Kitchen & Orders', selector: 'button:has-text("Kitchen"), .nav-link:has-text("Kitchen")' },
        { name: 'AI', selector: 'button:has-text("AI"), .nav-link:has-text("AI")' },
        { name: 'Notifications', selector: 'button:has-text("Notification"), .nav-link:has-text("Notification")' },
        { name: 'Time Clock', selector: 'button:has-text("Time Clock"), .nav-link:has-text("Time Clock")' },
        { name: 'Account & Billing', selector: 'button:has-text("Account"), .nav-link:has-text("Account")' },
      ],
    });

    await auditPage('Hardware Guide', '/hardware-guide', { wait: 3000 });

    // ===================== KIOSK =====================
    console.log('\n=== Phase 11: Kiosk & Online Ordering ===');

    await auditPage('Kiosk', '/kiosk', { wait: 3000 });
    await auditPage('Online Ordering', '/online-ordering', { wait: 3000 });

    // ===================== ADDITIONAL MODULES =====================
    console.log('\n=== Phase 12: Additional Modules ===');

    await auditPage('Tip Management', '/tips', { wait: 3000 });
    await auditPage('Pricing', '/pricing', { wait: 3000 });

    // ===================== SPECIAL PAGES =====================
    console.log('\n=== Phase 13: Special Pages ===');

    await auditPage('POS Login', '/pos-login', { wait: 3000 });

    // ===================== FINAL REPORT =====================
    console.log('\n\n========================================================================');
    console.log('                    COMPREHENSIVE UI/UX AUDIT REPORT');
    console.log('========================================================================');

    const total = allPageResults.length;
    const pass = allPageResults.filter(p => p.status === 'PASS').length;
    const warn = allPageResults.filter(p => p.status === 'WARN').length;
    const fail = allPageResults.filter(p => p.status === 'FAIL').length;
    const error = allPageResults.filter(p => p.status === 'ERROR').length;
    const redirect = allPageResults.filter(p => p.status === 'REDIRECT').length;

    console.log(`\nPages tested:  ${total}`);
    console.log(`  PASS:     ${pass}`);
    console.log(`  WARN:     ${warn}`);
    console.log(`  FAIL:     ${fail}`);
    console.log(`  ERROR:    ${error}`);
    console.log(`  REDIRECT: ${redirect}`);

    // API 404 Summary
    if (globalApi404s.size > 0) {
      console.log(`\n--- API 404s (${globalApi404s.size} unique endpoints) ---`);
      for (const entry of [...globalApi404s.values()].sort((a, b) => a.path.localeCompare(b.path))) {
        console.log(`  ${entry.method} ${entry.path} (${entry.count}x)`);
      }
    } else {
      console.log('\n--- API 404s: NONE ---');
    }

    // API 4xx Summary
    if (globalApi400s.size > 0) {
      console.log(`\n--- API 4xx Errors (${globalApi400s.size} unique) ---`);
      for (const entry of [...globalApi400s.values()].sort((a, b) => a.path.localeCompare(b.path))) {
        console.log(`  ${entry.method} ${entry.path} [${entry.status}] (${entry.count}x)`);
      }
    }

    // API 5xx Summary
    if (globalApi5xx.size > 0) {
      console.log(`\n--- API 5xx Errors (${globalApi5xx.size} unique) ---`);
      for (const entry of [...globalApi5xx.values()].sort((a, b) => a.path.localeCompare(b.path))) {
        console.log(`  ${entry.method} ${entry.path} [${entry.status}] (${entry.count}x)`);
      }
    }

    // JS Errors
    if (globalJsErrors.length > 0) {
      const unique = [...new Set(globalJsErrors.map(e => e.message.substring(0, 120)))];
      console.log(`\n--- JavaScript Errors (${unique.length} unique) ---`);
      for (const err of unique) {
        console.log(`  ${err}`);
      }
    }

    // Per-page detail for FAIL/WARN
    const problematic = allPageResults.filter(p => p.status !== 'PASS');
    if (problematic.length > 0) {
      console.log(`\n--- Detailed Issues by Page ---`);
      for (const p of problematic) {
        console.log(`\n  [${p.status}] ${p.name} (${p.path})`);
        for (const issue of p.issues) console.log(`    ISSUE: ${issue}`);
        for (const w of p.warnings) console.log(`    WARN:  ${w}`);
        for (const a of p.api404s) console.log(`    404:   ${a}`);
        for (const a of p.api400s) console.log(`    4xx:   ${a}`);
        for (const a of p.api5xx) console.log(`    5xx:   ${a}`);
        const missingTabs = p.tabs.filter(t => t.status === 'NOT FOUND');
        if (missingTabs.length > 0) {
          console.log(`    TABS NOT FOUND: ${missingTabs.map(t => t.name).join(', ')}`);
        }
      }
    }

    // Tab Summary
    const allTabs = allPageResults.flatMap(p => p.tabs.map(t => ({ page: p.name, ...t })));
    const foundTabs = allTabs.filter(t => t.status === 'ok');
    const missingTabs = allTabs.filter(t => t.status === 'NOT FOUND');
    console.log(`\n--- Tab Summary ---`);
    console.log(`  Found: ${foundTabs.length}`);
    console.log(`  Missing: ${missingTabs.length}`);
    if (missingTabs.length > 0) {
      for (const t of missingTabs) {
        console.log(`    ${t.page} -> ${t.name}`);
      }
    }

    // Performance
    const slowPages = allPageResults.filter(p => p.loadTime > 5000).sort((a, b) => b.loadTime - a.loadTime);
    if (slowPages.length > 0) {
      console.log(`\n--- Slow Pages (>5s) ---`);
      for (const p of slowPages) console.log(`  ${p.name}: ${p.loadTime}ms`);
    }

    // Clean pages list
    console.log(`\n--- Clean Pages (${pass}) ---`);
    for (const p of allPageResults.filter(p => p.status === 'PASS')) {
      console.log(`  ${p.name} (${p.path}) ${p.loadTime}ms`);
    }

    console.log(`\nScreenshots: ${SCREENSHOT_DIR}/`);
    console.log('\n=== Audit Complete ===');

  } catch (error) {
    console.error('FATAL:', error.message);
  } finally {
    await browser.close();
  }
})();
