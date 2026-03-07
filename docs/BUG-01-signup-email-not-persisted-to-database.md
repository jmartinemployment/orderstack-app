BUG-01: Signup Email Not Persisted to Database

Reported: 2026-03-07
Resolved: 2026-03-07
Status: CLOSED — Verified fixed in production
Project: OrderStack (orderstack-app + Get-Order-Stack-Restaurant-Backend)
Severity: Critical — new merchant accounts are created without an email address stored in the database, making password reset, email notifications, and account lookup by email impossible.

---

OBSERVED BEHAVIOR

When a new user completes the signup flow on getorderstack.com, the POST to /api/auth/signup returns 201 and the POST to /api/onboarding/create returns 201, but the email address entered on the signup form is not saved to the merchant or user record in the Supabase database. Querying Supabase after signup confirms the email field is null or missing on the newly created record.

EXPECTED BEHAVIOR

The email address submitted on the signup form must be written to the database as part of the signup or onboarding create flow so that every merchant record in Supabase has a non-null email value immediately after account creation.

---

ROOT CAUSE INVESTIGATION

Do not patch a symptom. Trace the full data path from the Angular signup form submission through to the Prisma write and find exactly where the email value is dropped. The root cause will be one of the following — identify which:

1. The Angular signup form collects the email but the service method does not include it in the signup request body sent to /api/auth/signup.

2. The signup request body includes the email but the backend /api/auth/signup handler does not read it from the request and does not pass it to the Prisma create call.

3. The Prisma create call in the auth service receives the email but the Prisma schema does not have an email field on the relevant model, so it is silently ignored.

4. The email is written at signup but the onboarding create flow overwrites the merchant record without the email field included, nulling it out.

Inspect each of these four points before writing a single line of fix code. Document which one (or which combination) is the actual root cause in your response before making any changes.

---

FILES TO INSPECT FIRST

Frontend (orderstack-app):
- src/app/auth or equivalent — the signup component and its form group, specifically which fields are included in the value passed to the auth service
- src/app/services/auth.service.ts or equivalent — the signUp() or register() method, specifically what properties are included in the HTTP POST body
- Any onboarding service that calls /api/onboarding/create — confirm what properties are sent in that payload

Backend (Get-Order-Stack-Restaurant-Backend):
- src/routes/auth.ts or equivalent — the POST /api/auth/signup route handler, specifically what it destructures from req.body and what it passes to the service layer
- src/services/auth.service.ts or equivalent — the create user method, specifically the Prisma create call and which fields are included
- prisma/schema.prisma — the User and/or Merchant model, confirm email is defined as a field and is not marked as optional in a way that silently drops it
- src/routes/onboarding.ts or equivalent — the POST /api/onboarding/create handler, confirm it does not overwrite the user/merchant record in a way that clears the email

---

THE FIX

Once root cause is confirmed, fix it at the source. Requirements for the fix:

The email value from the signup form must flow unbroken from the Angular form control through the HTTP request body, through the backend route handler, through the service layer, and into the Prisma create or upsert call.

The fix must not use any workaround such as defaulting to an empty string, inserting a placeholder email, or storing the email only in a separate lookup table while leaving the main record without it. The email must be on the primary user or merchant record.

After the fix, a newly created account queried directly in Supabase must show a non-null, correct email value on the record. Verify this as part of the fix — do not mark the bug resolved based on a 201 response alone.

If the Prisma schema is missing the email field, add it, generate the migration, and apply it. Do not skip the migration step.

If a new migration is required, name it clearly: add_email_to_merchant or similar.

---

UNIT TESTS (Vitest)

After the fix is in place, write or update unit tests in both the frontend and backend to cover this data path.

Backend unit tests — write these in the existing test directory for the auth service or create one if it does not exist:

Test 1 — signup handler maps email from request body to service call: mock the auth service, POST to /api/auth/signup with a body containing email, first name, last name, and password, and assert that the service's create method was called with the email value included.

Test 2 — auth service includes email in Prisma create: mock Prisma's user.create or merchant.create method, call the service's create method with an email, and assert that Prisma's create was called with the email property set to the provided value and not undefined or null.

Test 3 — auth service does not silently drop email when other fields are missing: call the service's create method with only an email and password (no first name), and assert that the Prisma call still receives the email field rather than throwing or omitting it.

Frontend unit tests — write these in the auth service spec file:

Test 4 — signUp() includes email in the HTTP POST body: use HttpClientTestingModule, call signUp() with an email and password, and assert that the outgoing HTTP request body contains the email property.

Test 5 — signup form group includes an email control with required and email validators: instantiate the signup component, get the email control from the form group, and assert it is invalid when empty and when given a non-email string, and valid when given a properly formatted email.

All unit tests must pass with no skipped assertions. Do not use any test that simply checks the shape of the request without asserting the specific email value.

---

PLAYWRIGHT END-TO-END TEST

Write a Playwright test script to /tmp/playwright-test-signup-email-persisted.js using the Playwright skill at orderstack-app/.claude/skills/playwright-skill.

The test must use the production URL https://www.getorderstack.com, not localhost, because the bug was observed in production.

The test must do the following:

Step 1 — Generate a unique test email address using a timestamp so the account does not already exist. Use the pattern bugtest-TIMESTAMP@mailinator.com.

Step 2 — Navigate to the login page, fill in the first name as Bug, last name as Test, email as the generated address, and password as BugTest2025!, check the terms checkbox, and click Create Account.

Step 3 — Wait for the network response from /api/auth/signup and assert that the response status is 201.

Step 4 — Wait for the network response from /api/onboarding/create and assert that the response status is 201.

Step 5 — After both 201 responses are received, call the backend directly using a fetch or axios call within the test to GET /api/merchant/me or the appropriate endpoint that returns the current merchant profile, passing the auth token received from the signup response. Assert that the returned merchant object has an email property that matches the email address used to create the account.

Step 6 — If step 5 is not possible because there is no GET /me endpoint, then assert in the Playwright request interception of the signup response body that the returned user or merchant object contains the email field. Do not let the test pass by only checking HTTP status codes.

Step 7 — Log PASS or FAIL for each assertion with the specific values compared.

Step 8 — Take a screenshot to /tmp/signup-email-test-result.png showing the final state.

The test must not use any fixed waitForTimeout longer than 2000ms. Use waitForResponse with URL pattern matching instead.

Run the test after writing it using:
cd /Users/jam/development/orderstack-app/.claude/skills/playwright-skill
node run.js /tmp/playwright-test-signup-email-persisted.js

If the test fails, diagnose why and fix the underlying code. Do not modify the test to make it pass by weakening the assertions.

---

DEFINITION OF DONE

This bug is not resolved until all of the following are true:

1. Root cause is identified and documented.
2. The fix is applied at the root cause, not at a symptom.
3. A new Supabase record created after the fix has a non-null email value — verified by querying Supabase directly or via the merchant profile GET endpoint, not inferred from a 201 status.
4. All five unit tests pass.
5. The Playwright test passes against production with email assertion confirmed, not just HTTP status assertion.
6. If a Prisma migration was required, it has been applied to the Supabase instance mpnruwauxsqbrxvlksnf.
7. The fix has been committed with message: fix(auth): persist email address to database on signup

Include the Post-Task Self-Audit checklist from the root CLAUDE.md in your completion response.
