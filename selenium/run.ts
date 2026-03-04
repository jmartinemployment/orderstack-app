import { getDriver, BrowserName } from './config';
import { runSmokeTests } from './tests/smoke.test';

function parseBrowserArg(): BrowserName {
  const args = process.argv.slice(2);
  const idx = args.indexOf('--browser');
  if (idx !== -1 && args[idx + 1]) {
    const value = args[idx + 1] as BrowserName;
    if (['chrome', 'firefox', 'safari'].includes(value)) {
      return value;
    }
    console.error(`Unknown browser "${value}". Use chrome, firefox, or safari.`);
    process.exit(1);
  }
  return 'chrome';
}

async function main(): Promise<void> {
  const browserName = parseBrowserArg();
  console.log(`\n========================================`);
  console.log(`  Selenium Smoke Tests — ${browserName}`);
  console.log(`========================================`);

  const driver = await getDriver(browserName);

  try {
    const results = await runSmokeTests(driver, browserName);

    console.log(`\n========================================`);
    console.log(`  Results (${browserName})`);
    console.log(`========================================`);

    let failures = 0;
    for (const r of results) {
      const status = r.passed ? 'PASS' : 'FAIL';
      console.log(`  ${status}  ${r.name}`);
      if (!r.passed) failures++;
    }

    console.log(`\n  ${results.length - failures}/${results.length} passed\n`);

    if (failures > 0) {
      process.exitCode = 1;
    }
  } finally {
    await driver.quit();
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
