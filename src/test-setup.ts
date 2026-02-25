import '@angular/compiler';
import { getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';

const TESTBED_INIT = Symbol.for('angular-testbed-init');

if (!(globalThis as Record<symbol, boolean>)[TESTBED_INIT]) {
  (globalThis as Record<symbol, boolean>)[TESTBED_INIT] = true;
  getTestBed().initTestEnvironment(
    BrowserTestingModule,
    platformBrowserTesting(),
  );
}
