BUG-02: Settings General Tab Crashes with Null Address TypeError

Reported: 2026-03-07
Reopened: 2026-03-07
Status: OPEN — previous fix was incomplete; multiple root causes identified

Retest evidence from live browser session 2026-03-07:
- The component source in general-settings.ts was edited to add optional chaining
- A new Vercel deployment was confirmed (chunk-GW7UID4Q.js replaced chunk-QJ72FRRW.js)
- Despite the deployment, console still shows: TypeError: Cannot read properties of null (reading 'street') at n.loadFromProfile
- The previous Playwright test used owner@taipa.com which has a populated address and never exercised the null code path
- The previous spec file tests a pure function replica of loadFromProfile, not the actual Angular component class — those tests pass but prove nothing about the real component
- A fresh null-address test account was created in production: bug01-verify-1772890297169@mailinator.com / restaurant ID 5fd7d020-59a8-4e6d-a7b1-69076fc6ba42

Project: OrderStack (orderstack-app frontend)
Severity: Critical — Settings > General tab throws unhandled TypeError on ngOnInit, crashing the component and leaving all business profile fields blank for any merchant with a null address (every new account).

---

FULL ROOT CAUSE ANALYSIS — READ THIS COMPLETELY BEFORE TOUCHING ANY CODE

After reading the actual source files, three separate problems exist. All three must be fixed. Do not fix one and declare done.

ROOT CAUSE 1 — Type definition mismatch enables the crash at compile time

File: src/app/models/platform.model.ts

The MerchantProfile interface declares address as type BusinessAddress (non-nullable). But the production API returns address: null for newly created restaurant accounts. TypeScript does not catch this because HTTP response types are not runtime-checked. This type lie is what allows the unguarded access to compile without error in the first place.

Fix: Change the address field in MerchantProfile to BusinessAddress or null (written as BusinessAddress | null in TypeScript). This will cause TypeScript to flag every location that accesses address sub-properties without a null check, making the remaining bugs visible to the compiler.

ROOT CAUSE 2 — Component does not react to signal changes after initial load

File: src/app/features/settings/general-settings/general-settings.ts

The loadFromProfile() method is called exactly once, in ngOnInit(). At ngOnInit time, platformService.merchantProfile() may be null because the API call in PlatformService.loadMerchantProfile() is async and has not completed yet. When loadFromProfile() sees a null profile it returns early and never populates the form. When the signal updates 300-500ms later as the API response arrives, nothing triggers loadFromProfile() again. The form stays blank for any account loaded cold (no localStorage cache).

This component is zoneless and uses OnPush change detection. Signals drive reactivity. To react to signal changes, the component must use effect(). Add an effect() in the constructor (not ngOnInit) that calls loadFromProfile() whenever merchantProfile() emits a non-null value. Remove the ngOnInit loadFromProfile() call entirely — the effect handles first load and all subsequent updates.

The effect pattern for this component:

constructor() {
  effect(() => {
    const profile = this.platformService.merchantProfile();
    if (profile) {
      this.loadFromProfile();
    }
  });
}

Remove ngOnInit entirely, or keep it empty. Do not call loadFromProfile() in both places.

ROOT CAUSE 3 — Address sub-property access after optional chaining was already added

The current source already has profile.address?.street ?? '' with optional chaining. If the error still fires in the deployed chunk, one of the following is true:

a. The error is coming from a different method in the same component that was not updated. Check whether save() or any other method in general-settings.ts reads profile.address directly without optional chaining.

b. The MerchantProfile stored in localStorage (loaded by loadFallbackProfile() in platform.ts) was cached before the fix and contains address as an empty object with undefined sub-properties, not null. The optional chaining ?. guards against null and undefined, so profile.address?.street where address is {} would return undefined, not throw. This case actually should NOT throw. Investigate if this is happening.

c. The error is coming from a completely different component that also has a loadFromProfile()-like method but was not updated. Search the entire src/ directory for .address.street without the optional chaining operator.

Run this search before writing any code:
grep -r "\.address\." src/app --include="*.ts" | grep -v "address?."

Any result that accesses an address sub-property without the ?. operator is a potential crash site. Fix all of them.

---

CONCRETE STEPS — DO THESE IN ORDER

Step 1: Run the grep above. Find every unguarded .address. access in the entire frontend. List them. Fix them all.

Step 2: Change MerchantProfile.address in platform.model.ts to BusinessAddress | null. Let TypeScript compiler errors guide you to any remaining unguarded access you missed in the grep.

Step 3: Run npm run build. Address every TypeScript error related to the address field. Do not use the non-null assertion operator ! as a fix — that defeats the purpose. Use optional chaining and nullish coalescing throughout.

Step 4: Replace the ngOnInit loadFromProfile() call in general-settings.ts with a constructor-based effect() as described in Root Cause 2 above. Import effect from @angular/core.

Step 5: Rewrite the spec file at src/app/features/settings/general-settings/general-settings.spec.ts. The current spec tests a pure function replica that has nothing to do with the actual Angular component. The spec must test the real GeneralSettings class using Angular's TestBed. The tests must:

Test 1: When PlatformService.merchantProfile() returns null, no error is thrown and the form fields remain at their initial empty values.

Test 2: When PlatformService.merchantProfile() emits a profile with address: null after a delay (simulating async load), the effect fires and form fields populate without throwing. Street, city, state, zip must all be empty string. businessName must populate correctly.

Test 3: When PlatformService.merchantProfile() emits a fully populated profile, all address fields, businessName, phone, and timezone populate correctly.

Test 4: When PlatformService.merchantProfile() emits a profile where address has some sub-properties as null or undefined, no fields throw and each defaults to empty string.

Test 5: When the signal changes from a first profile to a second profile (simulating a merchant account switch), the form updates to reflect the new profile values.

All five tests must use TestBed.configureTestingModule and inject a mock PlatformService. They must test the actual component lifecycle, not a standalone function.

---

FILE PATHS

Component: src/app/features/settings/general-settings/general-settings.ts
Component spec: src/app/features/settings/general-settings/general-settings.spec.ts
Component template: src/app/features/settings/general-settings/general-settings.html
Platform model: src/app/models/platform.model.ts
Platform service: src/app/services/platform.ts

---

PLAYWRIGHT END-TO-END TEST

Write the Playwright test to /tmp/playwright-test-bug02-null-address.js using the Playwright skill at orderstack-app/.claude/skills/playwright-skill.

Use the production URL https://www.getorderstack.com.

IMPORTANT: This test must use a null-address account, not owner@taipa.com. Owner@taipa.com has a populated address and will not exercise the bug. Use the account created specifically to verify this fix:

Email: bug01-verify-1772890297169@mailinator.com
Password: test1234

This account was created on 2026-03-07 and has address: null confirmed in the production database.

The test must do the following:

Step 1: Register a page.on('console') listener BEFORE any navigation to capture all console messages. Store all messages of type 'error' in an array.

Step 2: Navigate to https://www.getorderstack.com/login.

Step 3: Fill email field with bug01-verify-1772890297169@mailinator.com and password field with test1234. Click the login button.

Step 4: Wait for navigation to complete. If the page lands on /business-type or /setup, the account has not completed onboarding and cannot access /app/settings. In that case fail the test with message: test account is in onboarding state, cannot reach settings. If the page lands on /app/administration or any /app/ route, proceed.

Step 5: Wait 3 seconds for the initial load to settle.

Step 6: Navigate directly to https://www.getorderstack.com/app/settings.

Step 7: Wait 5 seconds for the settings component to initialize and all API calls to complete.

Step 8: Check the collected console error messages. Assert that ZERO messages contain the text 'Cannot read properties of null'. If any such message exists, fail the test and print the full message text.

Step 9: Assert that the General tab is active. The General tab should be the default active tab on the settings page.

Step 10: Locate the Restaurant name input field. Assert it is visible and present in the DOM.

Step 11: Locate the Street address input field. Assert it is visible and present in the DOM.

Step 12: Assert that neither the Restaurant name field nor the Street field has an error state or displays an error message.

Step 13: Take a full-page screenshot to /tmp/bug02-null-address-settings-result.png.

Step 14: Log PASS or FAIL clearly for each assertion.

Run the Playwright test after writing it:
cd /Users/jam/development/orderstack-app/.claude/skills/playwright-skill
node run.js /tmp/playwright-test-bug02-null-address.js

If the test account (bug01-verify-1772890297169@mailinator.com) ends up in onboarding state during the test, note this in the output but do not treat it as test failure for the bug itself. In that case, attempt the test using the taipa account as a secondary check, with the understanding that taipa has a populated address and only confirms the non-null path.

---

WHAT SPECIFICALLY MUST NOT HAPPEN IN THIS FIX

Do not add a catch block anywhere to swallow the TypeError.
Do not initialize address to an empty object as a workaround in the service or elsewhere.
Do not use the TypeScript non-null assertion operator (!) to suppress type errors on address sub-property access.
Do not test against owner@taipa.com as the sole verification — that account has address populated and proves nothing about the null path.
Do not declare the bug fixed until the Playwright test passes with zero null-property console errors.
Do not leave the spec testing a pure function replica. The spec must test the real component.

---

DEFINITION OF DONE

1. grep -r "\.address\." src/app --include="*.ts" shows no unguarded address sub-property access anywhere in the frontend.

2. MerchantProfile.address in platform.model.ts is typed as BusinessAddress | null.

3. npm run build completes with zero TypeScript errors.

4. GeneralSettings component uses effect() to reactively call loadFromProfile() when merchantProfile() changes, rather than calling it once in ngOnInit.

5. All five unit tests in general-settings.spec.ts pass using TestBed with the real component class.

6. Playwright test passes with zero console errors matching 'Cannot read properties of null'.

7. Fix committed with message: fix(settings): guard null address in MerchantProfile type and react to signal changes in GeneralSettings

---

POST-TASK SELF-AUDIT (required by root CLAUDE.md)

Before marking this done, answer each question:

Did you run the grep before writing any code and fix ALL unguarded address accesses found, not just the one you expected?

Did you change the TypeScript type and confirm the build passes with zero errors, using optional chaining rather than non-null assertions as the fix?

Did the component end up with a constructor effect() that fires when the signal changes, rather than a one-time ngOnInit call?

Did the spec test the real Angular component through TestBed, not a replica function?

Did the Playwright test run against a null-address account (or did you verify why it could not) and did it confirm zero null-property errors in the console?

If the answer to any of these is no, the task is not done.
