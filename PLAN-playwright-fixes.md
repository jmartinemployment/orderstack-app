# Fix Plan: Playwright Audit Failures

## Code Fixes (3 items)

### Fix 1: Retail Ecommerce Wrong URL Path

**File:** `src/app/services/retail-ecommerce.ts`
**Problem:** Order endpoints use `/retail/ecommerce/orders` without `/restaurant/{id}` prefix.
**Fix:** Change all order endpoint URLs from:
```
`${this.apiUrl}/retail/ecommerce/orders`
```
to:
```
`${this.apiUrl}/restaurant/${this.restaurantId}/retail/ecommerce/orders`
```

**Methods to fix (4):**
- `loadOrders()` (~line 161)
- `getOrder()` (~line 176)
- `updateFulfillmentStatus()` (~line 187)
- `addTrackingNumber()` (~line 198)

Also add early return guard `if (!this.restaurantId) return;` to `loadOrders()` and null returns for the others, matching the pattern used in every other service.

### Fix 2: Customer Dashboard Stuck Spinner

**File:** `src/app/services/crm.ts` (or wherever customer feedback/insights are loaded)
**Problem:** Loading spinner never clears when `/customers/feedback` returns 404.
**Fix:** Add 404-tolerant handling (same pattern as all other services fixed earlier).

Find the method that loads customer feedback/insights data and add:
```typescript
} catch (err: unknown) {
  if (err instanceof HttpErrorResponse && err.status === 404) {
    this._feedback.set([]);  // or whatever the signal is
  } else {
    this._error.set(...);
  }
}
```

### Fix 3: Retail Ecommerce 404 Tolerance

**File:** `src/app/services/retail-ecommerce.ts`
**Problem:** `loadOrders()` and other methods don't handle 404 gracefully.
**Fix:** Add `HttpErrorResponse` import and 404-tolerant catch blocks to:
- `loadOrders()`
- `loadListings()`
- `loadShippingMethods()`
- `loadStoreConfig()`
- Any other GET methods

## Test Script Fix (1 item)

### Fix 4: Update Playwright Test Selectors

**File:** `/tmp/playwright-test-full-audit.js`
**Changes:**

1. **Command Center tabs:** Change `Live` → `Overview` (already there), remove `Live`, add `Alerts`
2. **Food Cost tabs:** Change `Overview` → `Invoices`, and use `.tab-btn` selector instead of `button:has-text()` / `.nav-link:has-text()`
3. **Staff Scheduling tabs:** Change `Timecards` → `Time Clock`, add `Labor Report`, `Edits`
4. **Settings tabs:** Remove `General`, `Team`, `Notifications`. Add `Staff`, keep the rest.
5. **Redirect pages:** Mark `/kiosk`, `/online-ordering`, `/tips`, `/pricing`, `/staff-portal`, `/report-builder` as expected redirects (SKIP, not FAIL).

## Execution Order

1. Fix 1 — retail-ecommerce.ts URL paths
2. Fix 2 — CRM feedback 404 tolerance
3. Fix 3 — retail-ecommerce.ts 404 tolerance
4. Verify build passes (`ng build`)
5. Fix 4 — Update test script selectors
6. Re-run Playwright audit
7. Document updated results in CLAUDE.md
