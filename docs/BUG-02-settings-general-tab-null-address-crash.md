BUG-02: Settings General Tab Crashes with Null Address TypeError

Reported: 2026-03-07
Reopened: 2026-03-07
Retested: 2026-03-07
Status: CLOSED — all three root causes fixed, all tests passing

---

SUMMARY

Settings > General tab threw an unhandled TypeError: Cannot read properties of null (reading 'street') at loadFromProfile for any merchant with a null address (every new account). Three separate root causes contributed. All three have been fixed and verified.

---

ROOT CAUSE ANALYSIS (3 independent issues)

ROOT CAUSE 1 — Type definition mismatch

File: src/app/models/platform.model.ts

MerchantProfile.address was typed as BusinessAddress (non-nullable), but the production API returns address: null for newly created accounts. TypeScript could not catch unguarded access at compile time.

Fix applied: Changed type to BusinessAddress | null at line 532. This causes the compiler to flag every unguarded .address.X access.

ROOT CAUSE 2 — Component did not react to signal changes after initial load

File: src/app/features/settings/general-settings/general-settings.ts

loadFromProfile() was called once in ngOnInit(). In a zoneless app, merchantProfile() may be null at ngOnInit time because the API call is async. When the signal updated later, nothing re-triggered loadFromProfile(). The form stayed blank.

Fix applied: Replaced ngOnInit call with a constructor-based effect() (lines 76-81) that fires whenever merchantProfile() emits a non-null value. Handles first load and subsequent merchant switches.

ROOT CAUSE 3 — Unguarded address sub-property access in multiple methods

File: src/app/features/settings/general-settings/general-settings.ts

Both loadFromProfile() and save() accessed address sub-properties. The save() method also needed optional chaining on profile.address?.lat and profile.address?.lng.

Fix applied: All address access uses optional chaining (?.) with nullish coalescing (?? '') throughout loadFromProfile() (lines 179-185) and save() (lines 161-162).

---

VERIFICATION PERFORMED ON 2026-03-07

1. GREP — Zero unguarded .address. access

Command: grep pattern \.address\. across src/app/**/*.ts
Result: Zero matches. Every address sub-property access in the entire frontend uses optional chaining.

2. TYPE DEFINITION — BusinessAddress | null

File: src/app/models/platform.model.ts line 532
Confirmed: address: BusinessAddress | null

3. BUILD — Zero TypeScript errors

Command: ng build --configuration=production
Result: Build succeeds. Only SCSS budget warnings (unrelated).

4. EFFECT PATTERN — Constructor-based reactivity

File: src/app/features/settings/general-settings/general-settings.ts lines 76-81
Confirmed: effect() in constructor reads merchantProfile() signal. No ngOnInit.

5. UNIT TESTS — 5/5 pass via Vitest + TestBed

File: src/app/features/settings/general-settings/general-settings.spec.ts
Command: npx vitest run src/app/features/settings/general-settings/general-settings.spec.ts

Test 1: merchantProfile is null — no throw, form stays at initial empty values. PASS
Test 2: Profile emits with address: null — effect fires, businessName populates, address fields default to empty string. PASS
Test 3: Fully populated profile — all fields (street, street2, city, state, zip, phone, timezone) populate correctly. PASS
Test 4: Partially populated address (null/undefined sub-properties) — no throw, each defaults to empty string. PASS
Test 5: Signal changes from first profile to second — form updates to new values. PASS

All five tests use TestBed.configureTestingModule with a mock PlatformService that exposes a writable signal. They test the real GeneralSettings component class, not a replica function.

6. PLAYWRIGHT E2E — 4/4 pass against production

Script: /tmp/playwright-test-bug02-null-address.js
Target: https://www.getorderstack.com
Command: cd .claude/skills/playwright-skill && node run.js /tmp/playwright-test-bug02-null-address.js

Assertion 1: Zero "Cannot read properties of null" console errors. PASS
Assertion 2: os-general-settings component rendered in DOM. PASS
Assertion 3: Form inputs visible. PASS
Assertion 4: No .is-invalid or .alert-danger error states on form. PASS

Screenshot: /tmp/bug02-null-address-settings-result.png — shows General tab active, all fields populated, no errors.

Caveat: The null-address test account (bug01-verify-1772890297169@mailinator.com) is stuck in onboarding (/business-type) and cannot reach /app/settings. The E2E test fell back to owner@taipa.com which has a populated address. The null code path is fully covered by unit tests 1, 2, and 4 which exercise the real component with address: null and partial address through TestBed.

7. COMMIT

Already committed: fix(settings): guard null address in MerchantProfile type and react to signal changes in GeneralSettings
Commit: b4ffa9d

---

FILES CHANGED

src/app/models/platform.model.ts — address field typed as BusinessAddress | null
src/app/features/settings/general-settings/general-settings.ts — effect() replaces ngOnInit, optional chaining in loadFromProfile and save
src/app/features/settings/general-settings/general-settings.spec.ts — rewritten to use TestBed with 5 tests covering null, partial, full, and signal-switch scenarios

---

POST-TASK SELF-AUDIT

Did you run the grep before writing any code and fix ALL unguarded address accesses found?
YES — grep returned zero unguarded .address. access across entire src/app.

Did you change the TypeScript type and confirm the build passes with zero errors?
YES — address: BusinessAddress | null at platform.model.ts:532. ng build passes.

Did the component end up with a constructor effect() that fires when the signal changes?
YES — general-settings.ts lines 76-81. No ngOnInit.

Did the spec test the real Angular component through TestBed?
YES — 5 tests use TestBed.configureTestingModule, inject mock PlatformService, create real GeneralSettings fixture.

Did the Playwright test run against a null-address account?
PARTIAL — null-address account stuck in onboarding. Fell back to owner@taipa.com for E2E. Null path verified via unit tests.

---

WHAT WAS NOT DONE (prohibited by bug doc)

No catch blocks added to swallow TypeError.
No address initialized to empty object as workaround.
No TypeScript non-null assertion operator (!) used.
No pure function replica in spec — tests exercise real component.

---

KNOWN LIMITATION

The null-address test account (bug01-verify-1772890297169@mailinator.com, restaurant ID 5fd7d020-59a8-4e6d-a7b1-69076fc6ba42) is permanently stuck at /business-type because it was created before the onboarding flow was finalized. To create a new null-address E2E test account in the future, either:

1. Complete onboarding for this account so it can reach /app/settings, then null out its address in the database.
2. Create a new account via the signup flow and immediately null out its address in the database before it enters onboarding.

Either approach requires database access (Supabase dashboard or backend script).
