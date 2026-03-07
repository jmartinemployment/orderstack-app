BUG-02: Settings General Tab Crashes with Null Address TypeError

Reported: 2026-03-07
Project: OrderStack (orderstack-app frontend)
Severity: Critical — the Settings > General tab throws an unhandled TypeError on ngOnInit every time it loads, crashing the component and leaving all Business Information and Address fields blank. The merchant cannot view or edit their business profile.

---

OBSERVED BEHAVIOR

Navigating to Settings > General tab produces the following error in the browser console, repeated 5 times:

TypeError: Cannot read properties of null (reading 'street')
  at n.loadFromProfile (chunk-QJ72FRRW.js)
  at n.ngOnInit (chunk-QJ72FRRW.js)

The GET /api/merchant/{id} call returns 200, meaning the backend is responding, but the merchant record returned has a null address object. The loadFromProfile() method in the General settings component calls directly into profile.address.street (and presumably .city, .state, .zip) without first checking whether address is null. This causes the crash. All form fields render empty as a result — restaurant name, phone, timezone, street address, city, state, and ZIP all show placeholder text only.

EXPECTED BEHAVIOR

If the merchant record has a null address (which is valid for a newly created account that has not yet filled in their address), loadFromProfile() must handle that gracefully by leaving the address fields blank rather than throwing. No TypeError should ever appear in the console. The rest of the form (restaurant name, phone, timezone) should still populate correctly from whatever non-null fields exist on the profile.

---

ROOT CAUSE

The crash is in the General settings component's loadFromProfile() method. It accesses profile.address.street without a null guard on profile.address. For new merchant accounts created via the onboarding flow, the address object is not initialized — it is null or undefined in the database record.

Do not add a catch block to swallow the error. Do not default address to an empty object at the call site as a workaround. Fix loadFromProfile() to guard against a null address object using optional chaining before accessing any address sub-properties (street, city, state, zip).

---

FILE TO FIX

The component is in the settings feature directory. Search for loadFromProfile in:
  src/app/features/settings/

The specific line reads something like:
  this.street = profile.address.street
  this.city = profile.address.city
  (and so on for each address field)

Each of these must be guarded:
  this.street = profile.address?.street ?? ''
  this.city = profile.address?.city ?? ''
  this.state = profile.address?.state ?? ''
  this.zip = profile.address?.zip ?? ''

Apply the same optional chaining pattern to every property access on profile.address throughout the entire loadFromProfile() method. Do not leave any unguarded accesses.

Also check whether the same pattern exists in any save or submit method that reads back from the form and constructs the address object — if it reconstructs profile.address before checking whether address exists on the saved profile, guard that too.

After the fix, the error must not appear in the console for any merchant account, whether or not they have a saved address.

---

UNIT TESTS (Vitest)

Write or update tests in the General settings component spec file. If no spec file exists, create one at the same path as the component.

Test 1 — loadFromProfile does not throw when address is null: create a mock merchant profile object where address is null. Call loadFromProfile() with this object. Assert that no error is thrown and that the street, city, state, and zip form controls have empty string values.

Test 2 — loadFromProfile does not throw when address is undefined: same as Test 1 but with address set to undefined instead of null.

Test 3 — loadFromProfile populates address fields when address is present: create a mock profile where address has values for street, city, state, and zip. Call loadFromProfile(). Assert that the form controls are populated with the corresponding values.

Test 4 — loadFromProfile populates non-address fields even when address is null: create a mock profile with a valid businessName, phone, and timezone but a null address. Call loadFromProfile(). Assert that businessName, phone, and timezone form controls are populated correctly, confirming the crash does not prevent other fields from loading.

Test 5 — loadFromProfile handles partially populated address: create a mock profile where address exists but only has street set and all other address fields are null or undefined. Assert that street populates and all other address fields default to empty string without throwing.

All tests must pass. Do not use any test that catches the TypeError as acceptable behavior — the error must not be thrown at all.

---

PLAYWRIGHT END-TO-END TEST

Write a Playwright test to /tmp/playwright-test-settings-general-null-address.js using the Playwright skill at orderstack-app/.claude/skills/playwright-skill.

Use the production URL https://www.getorderstack.com.

The test must do the following:

Step 1 — Log in as owner@taipa.com with password owner123.

Step 2 — Handle the restaurant selection screen if it appears by clicking the first restaurant item.

Step 3 — Navigate to /app/settings.

Step 4 — Wait 3 seconds for the settings component to initialize and all API calls to complete.

Step 5 — Collect all browser console errors using page.on('console') registered before navigation. Filter for messages of type 'error'. Assert that ZERO console errors containing the text 'Cannot read properties of null' are present. If any such error exists, fail the test and print the full error message.

Step 6 — Assert that the General tab is the active tab (has an active/selected class or aria-selected=true).

Step 7 — Assert that the Restaurant name input field is visible and accessible (not crashed/missing from DOM).

Step 8 — Assert that the Street address input field is visible and accessible.

Step 9 — Take a full-page screenshot to /tmp/settings-general-null-address-result.png.

Step 10 — Log PASS or FAIL for each assertion with specific details.

The test must fail clearly if the TypeError appears in the console. Do not write a test that passes simply because the page renders — it must explicitly assert the absence of the null address error.

Run the test after writing it:
cd /Users/jam/development/orderstack-app/.claude/skills/playwright-skill
node run.js /tmp/playwright-test-settings-general-null-address.js

---

DEFINITION OF DONE

1. Root cause confirmed as unguarded profile.address property access in loadFromProfile().
2. Optional chaining applied to every address sub-property access in loadFromProfile().
3. No TypeError: Cannot read properties of null appears in the browser console when navigating to Settings > General for any merchant account with a null address.
4. All five unit tests pass.
5. Playwright test passes with zero null-address console errors confirmed.
6. Fix committed with message: fix(settings): guard null address in loadFromProfile to prevent TypeError on General tab

Include the Post-Task Self-Audit checklist from the root CLAUDE.md in your completion response.
