PLAN: Login Security Audit Fixes
Reported: 2026-03-07
Audit source: Login Security Audit Results — 27 pass, 8 fail across 35 checks
Status: OPEN — pending implementation

This plan covers all 8 failures from the security audit in priority order. Each item includes exact
root cause traced to source, the specific files and lines that must change, implementation steps,
unit tests, and Playwright verification.

Do not start implementing until you have read this entire plan. Do not make partial fixes.
Each item must be fully implemented, tested, and committed before moving to the next.

---

FAILURE 1 — HIGH — BRUTE FORCE
Rate limiter on login is broken due to reverse proxy trust misconfiguration

SEVERITY: HIGH. An attacker can spray passwords indefinitely.

ROOT CAUSE TRACED TO SOURCE

File: Get-Order-Stack-Restaurant-Backend/src/app/app.ts
The app uses express with no trust proxy setting. On Render.com, all requests pass through
a reverse proxy. Without app.set('trust proxy', 1), req.ip always resolves to 127.0.0.1
(the proxy's internal IP) — never the actual client IP.

File: Get-Order-Stack-Restaurant-Backend/src/app/auth.routes.ts lines 8-20
The authRateLimiter uses keyGenerator: (req) => req.ip ?? 'unknown'. Because req.ip is
always 127.0.0.1, all users share the same rate limit counter. The 15-minute / 10-attempt
window is shared across ALL login attempts from ALL users globally. One legitimate user
consuming 9 attempts would lock out every other user, or — more likely — the counter resets
between test requests because Render.com spins down the free tier. The rate limiter is
functionally inoperative in production.

The audit found 8 rapid failed attempts with no throttle. The limit is 10, so 8 attempts
did not technically cross the threshold. But even if it had, the 127.0.0.1 key means
one attacker's attempts count against all users equally.

WHAT MUST BE FIXED

Fix 1A — Trust proxy in app.ts
Add app.set('trust proxy', 1) immediately after const app = express() in app.ts.
This tells Express to trust the X-Forwarded-For header from Render's proxy, making
req.ip return the actual client IP. This is required for all rate limiters, not just auth.

Fix 1B — Rate limiter key strategy in auth.routes.ts
Change the authRateLimiter keyGenerator to combine IP + email:
  keyGenerator: (req) => {
    const ip = req.ip ?? 'unknown';
    const email = (req.body?.email ?? '').toLowerCase().trim();
    return email ? `${ip}:${email}` : ip;
  }
This prevents distributed attacks where an attacker uses multiple IPs to spray
one account, while also preventing one account attack from affecting others.

Fix 1C — Rate limit values (keep existing, verify)
The existing windowMs of 15 minutes and limit of 10 are reasonable. Keep as-is.
The pinRateLimiter (5 attempts per 15 minutes for PIN auth) is correct — keep as-is.
The signup endpoint uses the same authRateLimiter — keep as-is.

Fix 1D — Verify the fix works
After adding trust proxy, test that req.ip returns the real IP by adding a
console.log('[RateLimit] Request from IP:', req.ip) temporarily in the limiter's
keyGenerator during development. Remove before committing.

IMPLEMENTATION STEPS

Step 1: Read the full current app.ts to confirm app = express() location.
Step 2: Add app.set('trust proxy', 1) on the line immediately after const app = express().
Step 3: Update authRateLimiter keyGenerator in auth.routes.ts to combine IP + email.
Step 4: Rewrite app.ts in full per CLAUDE.md (do not make incremental edits).
Step 5: Rewrite auth.routes.ts in full per CLAUDE.md.
Step 6: Run the backend test suite.

UNIT TESTS — auth.routes.integration.test.ts

Test 1: POST /auth/login with correct credentials returns 200 and a token.
Test 2: POST /auth/login with 10 failed attempts from the same IP + email combination
  returns 429 on the 11th attempt with the error message from the limiter.
Test 3: POST /auth/login with 10 failed attempts from the same IP but different emails
  does not rate-limit the first email (keys are separate per email).
Test 4: POST /auth/login with X-Forwarded-For header set to a specific IP uses that IP
  as part of the rate limit key (confirms trust proxy is active).

PLAYWRIGHT VERIFICATION

In the Playwright test, send 11 rapid POST requests to /auth/login with the same
wrong credentials from the same IP. Confirm the 11th response is 429. Confirm the
error message contains 'Too many authentication attempts'.

COMMIT MESSAGE: fix(auth): enable trust proxy and per-IP-email rate limiting on login

---

FAILURE 2 — HIGH — HEADERS
No Content-Security-Policy header

FAILURE 3 — HIGH — HEADERS
No X-Frame-Options or CSP frame-ancestors

FAILURE 5 — MEDIUM — HEADERS
No X-Content-Type-Options: nosniff

These three failures share the same root cause and the same fix. They are implemented together.

ROOT CAUSE TRACED TO SOURCE

File: Get-Order-Stack-Restaurant-Backend/src/app/app.ts
The app has no security header middleware of any kind. The only middleware applied globally
is cors() and express.json(). There is no Helmet, no manual header injection, nothing.
Express by default sends X-Powered-By: Express which discloses the framework version.

WHAT MUST BE FIXED

Install and configure the Helmet npm package in the backend. Helmet sets all of the
following security headers in a single middleware call:

  Content-Security-Policy
  X-Frame-Options (via frame-ancestors in CSP)
  X-Content-Type-Options: nosniff
  Referrer-Policy
  X-DNS-Prefetch-Control
  X-Download-Options
  X-Permitted-Cross-Domain-Policies
  Cross-Origin-Embedder-Policy
  Cross-Origin-Opener-Policy
  Cross-Origin-Resource-Policy

CONTENT-SECURITY-POLICY CONFIGURATION FOR THIS APP

The frontend is an Angular SPA at https://www.getorderstack.com. The backend is an API at
https://get-order-stack-restaurant-backend.onrender.com. The backend serves no HTML — it
is a pure JSON API. Its CSP must allow:
  - default-src: 'none' (no resources served from the API itself)
  - frame-ancestors: 'none' (API cannot be framed — replaces X-Frame-Options: DENY)
  - The backend does NOT need script-src, img-src, or connect-src since it serves no pages

The frontend (Angular SPA) is served by Vercel/CDN, not by this Express app. Frontend CSP
is a separate concern addressed below.

BACKEND CSP (applied to the Express app):
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })

Setting crossOriginEmbedderPolicy: false is required because COEP breaks cross-origin
requests from the Angular frontend. Do not enable it.

FRONTEND CSP (applied via vercel.json or index.html meta tag)

The frontend is Angular. It must be able to:
  - Load scripts and styles from its own origin ('self')
  - Connect to the backend API (https://get-order-stack-restaurant-backend.onrender.com)
  - Connect to Supabase (https://*.supabase.co)
  - Load Bootstrap Icons fonts from CDN if used
  - Use inline styles (Angular uses them for component styles)

Recommended frontend CSP via vercel.json headers config:

  Content-Security-Policy:
    default-src 'self';
    script-src 'self' 'unsafe-inline';
    style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
    font-src 'self' https://cdn.jsdelivr.net;
    connect-src 'self' https://get-order-stack-restaurant-backend.onrender.com https://*.supabase.co wss://get-order-stack-restaurant-backend.onrender.com;
    img-src 'self' data: https:;
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';

Note: 'unsafe-inline' for script-src is required for Angular's runtime (it uses inline
event handlers for zoneless change detection). This is a known Angular constraint.
Without a nonce-based approach (complex to implement), 'unsafe-inline' is necessary.

X-Frame-Options is set by Helmet automatically to SAMEORIGIN by default. Override to DENY
for the API since the backend serves no embeddable content.

IMPLEMENTATION STEPS

Step 1: Run npm install helmet in Get-Order-Stack-Restaurant-Backend.
Step 2: Add import helmet from 'helmet' at the top of app.ts.
Step 3: Add app.use(helmet({ ... })) with the configuration above immediately after
  app.set('trust proxy', 1) and before the cors() middleware.
Step 4: Rewrite app.ts in full per CLAUDE.md.
Step 5: Read vercel.json in orderstack-app. Add a headers section for the frontend CSP
  and X-Frame-Options. If vercel.json already has a headers section, extend it — do not
  replace existing rules.
Step 6: Run the backend test suite to verify Helmet does not break any existing endpoints.
Step 7: Verify CSP headers with: curl -I https://get-order-stack-restaurant-backend.onrender.com/health

UNIT TESTS — app.routes.integration.test.ts

Test 1: GET /health response includes Content-Security-Policy header.
Test 2: GET /health response includes X-Frame-Options header with value DENY.
Test 3: GET /health response includes X-Content-Type-Options header with value nosniff.
Test 4: GET /health response does NOT include X-Powered-By header (Helmet removes it).

PLAYWRIGHT VERIFICATION

Navigate to https://www.getorderstack.com/login. Open DevTools Network tab. Select the
page document request. Confirm response headers include Content-Security-Policy,
X-Frame-Options: DENY, and X-Content-Type-Options: nosniff. Screenshot the headers panel.

COMMIT MESSAGE: fix(security): add Helmet security headers to backend API

---

FAILURE 4 — MEDIUM — INFO_LEAK
Create Account leaks "Email already registered" — user enumeration

SEVERITY: MEDIUM. An attacker can determine which email addresses have accounts.

ROOT CAUSE TRACED TO SOURCE

File: Get-Order-Stack-Restaurant-Backend/src/app/auth.routes.ts — POST /signup handler
Lines where createUser is called: if createUser returns { success: false, error: 'Email already registered' }
the route sends res.status(400).json({ error: createResult.error }) which exposes the
exact reason.

File: Get-Order-Stack-Restaurant-Backend/src/services/auth.service.ts — createUser method
Line: return { success: false, error: 'Email already registered' }
This specific message propagates all the way to the HTTP response.

The login endpoint (POST /auth/login) correctly returns 'Invalid email or password' for
both existing and non-existing users — no enumeration. Only signup leaks it.

WHAT MUST BE FIXED

Fix 4A — Return a generic response from the signup endpoint
When the signup endpoint receives an error from createUser, regardless of the error reason,
respond with HTTP 200 and a generic message rather than a 400 with the specific reason.
The message should be something like:
  "If this email is not already registered, an account has been created."

This is the same pattern used by security-conscious SaaS applications (GitHub, Stripe,
Heroku). The user is not told whether the email was taken — they must attempt to log in.

IMPORTANT: Do NOT return HTTP 400 for duplicate email in the signup response. Return HTTP
200 with the generic message. This prevents both timing attacks (different HTTP codes take
different paths) and information leakage.

Fix 4B — Add a timing-constant delay
Because bcrypt password hashing takes ~100ms on success but the duplicate-email path
returns immediately, a timing attack can still enumerate emails. Add a fixed 200ms delay
to the error path in the signup handler so both paths take roughly the same time.

  if (!createResult.success) {
    await new Promise(resolve => setTimeout(resolve, 200));
    res.status(200).json({ message: 'If this email is not already registered, your account has been created.' });
    return;
  }

Fix 4C — Update the Angular frontend to handle the new response
File: orderstack-app/src/app/features/auth/login/login.ts — onCreateAccount()
Currently: if (success) { this.router.navigate(['/business-type']); }
The frontend checks the boolean return from authService.signup(). AuthService.signup()
currently returns true when the HTTP response is received without error. After Fix 4A,
signup always returns 200 — so the frontend will always navigate to /business-type even
for duplicate emails. This means the user is sent to onboarding where they will fail to
create a restaurant because the login step will then fail.

The correct fix: after signup, immediately attempt a silent login with the same credentials.
If login succeeds, the email was new and the account was created. If login fails, the email
was already taken and the user should see "An account with this email already exists. Sign in instead."

Pseudocode for authService.signup() fix:
  1. POST /auth/signup with the form data
  2. If the HTTP response is a 200 with a generic message (no token returned), immediately
     POST /auth/login with the same email and password
  3. If login succeeds, proceed as normal (token stored, navigate to /business-type)
  4. If login fails (wrong password for existing account), set a specific error:
     "An account with this email already exists. Try signing in."
  5. If login succeeds (correct password for new account), proceed to /business-type

The backend signup endpoint already returns a token in the success case:
  res.status(201).json({ token: loginResult.token, user: loginResult.user, restaurants: [] })
After Fix 4A, the failure case also returns 200 with no token. The frontend can detect
which case it is by checking whether token is present in the response.

So the simpler approach: check for token presence in the signup response:
  If response.token exists: genuine new account, store token, navigate to /business-type
  If response.token is absent: email was taken, set error: "An account with this email already exists."

Change the signup endpoint to return status 200 (not 201) in the duplicate-email case
with the generic message and no token. Keep status 201 for actual account creation.
The frontend checks: if (!response.token) — email taken.

IMPLEMENTATION STEPS

Step 1: In auth.routes.ts POST /signup handler, replace the createResult.error response
  with the timing-safe 200 generic message.
Step 2: Keep the existing success path (status 201, token, user, restaurants) unchanged.
Step 3: Rewrite auth.routes.ts in full per CLAUDE.md.
Step 4: In auth.ts AuthService.signup(), update to detect the no-token response and
  set a user-friendly error message.
Step 5: In login.ts, no change required — the error signal in AuthService will be displayed
  by the existing os-error-display component.
Step 6: Run the backend test suite. Run npm test in orderstack-app.

UNIT TESTS — auth.routes.integration.test.ts

Test 1: POST /signup with a brand-new email returns 201 with a token.
Test 2: POST /signup with an already-registered email returns 200 (NOT 400 or 422) with
  no token and a generic message body.
Test 3: The response body for duplicate-email signup does NOT contain the word 'registered'
  or 'exists' or any string that confirms the email is taken.
Test 4: POST /signup with a duplicate email and POST /signup with a non-existent invalid
  scenario take approximately the same wall-clock time (within 150ms of each other),
  confirming the timing-safe delay is in effect.

UNIT TESTS — login.spec.ts

Test 5: When authService.signup() returns false (simulated duplicate email), onCreateAccount()
  does NOT navigate to /business-type.
Test 6: When authService.signup() returns false, the error signal is set with a message
  containing 'already exists' or 'sign in'.

PLAYWRIGHT VERIFICATION

Attempt to create an account with owner@taipa.com (existing account). Confirm the UI does
not show "Email already registered". Confirm it shows the generic already-exists message.
Screenshot the result.

COMMIT MESSAGE: fix(auth): prevent email enumeration on duplicate signup

---

FAILURE 6 — MEDIUM — VALIDATION
Create Account button is clickable when terms checkbox is unchecked

SEVERITY: MEDIUM. Users can submit the form without agreeing to terms.

ROOT CAUSE TRACED TO SOURCE

File: orderstack-app/src/app/features/auth/login/login.html
The button has: [disabled]="isLoading() || !agreedToTerms()"
This correctly sets the HTML disabled attribute via Angular's property binding.

File: orderstack-app/src/app/features/auth/login/login.scss
The root cause is CSS pointer-events not being disabled on the button when the HTML
disabled attribute is applied. Bootstrap 5.3 applies opacity: 0.65 to disabled buttons
but does not always apply pointer-events: none reliably across all browser/OS combinations.
Additionally, if there is any overlapping element (a label, wrapper div, or the terms
checkbox area) with a higher z-index that intercepts clicks before they reach the button,
the button could appear to receive clicks even in its disabled state.

Secondary root cause: the Angular [disabled] binding on a button with type="button" sets
the DOM disabled property correctly but does not prevent (click) event handlers from
firing in all Angular versions. The onCreateAccount() method is called via (click) not via
form submission — so even if the button DOM property is disabled, Angular may still call
the handler if the element receives a synthetic click event.

The existing onCreateAccount() method already has a guard:
  if (!this._agreedToTerms()) { this._showTermsError.set(true); return; }
So the worst case is the user sees the validation error — the signup call is never made.
But the button should visually and functionally not be clickable when terms are unchecked.

WHAT MUST BE FIXED

Fix 6A — CSS: ensure pointer-events: none when button is disabled
In login.scss, add an explicit pointer-events: none rule for the disabled state:
  .btn-create:disabled,
  .btn-create[disabled] {
    pointer-events: none;
    cursor: not-allowed;
  }

Fix 6B — Add a cursor: not-allowed to reinforce disabled state visually
Bootstrap's default for disabled buttons is cursor: not-allowed on some configs but not
all. Explicitly set it alongside pointer-events: none.

Fix 6C — Do NOT remove the existing guard in onCreateAccount()
The guard checking agreedToTerms() before calling signup must remain as a defense-in-depth
fallback. Do not remove it.

IMPLEMENTATION STEPS

Step 1: Read login.scss in full.
Step 2: Add the .btn-create:disabled and .btn-create[disabled] CSS rules.
Step 3: Rewrite login.scss in full per CLAUDE.md.
Step 4: Verify the existing unit test: 'disables Create Account when terms not agreed'
  still passes (it checks btn.disabled which is the HTML property — should still work).

UNIT TESTS — login.spec.ts

Test 1: When terms are not agreed, the Create Account button has the CSS class that
  produces pointer-events: none. (Test the computed style or the element's disabled
  property directly.)
Test 2: When terms ARE agreed, the button does not have pointer-events: none.
Test 3: Clicking the Create Account button when disabled does NOT call authService.signup()
  even if a synthetic click event fires. (The guard in onCreateAccount() handles this.)

PLAYWRIGHT VERIFICATION

Navigate to /login. Without agreeing to terms, attempt to click Create Account.
Assert no network request to /auth/signup is made. Assert the terms error message appears.
Screenshot the result.

COMMIT MESSAGE: fix(auth): enforce pointer-events none on disabled Create Account button

---

FAILURE 7 — LOW — UX_BUG
Password visibility toggle button obscured by input field on desktop

SEVERITY: LOW but visible to every desktop user.

ROOT CAUSE TRACED TO SOURCE

File: orderstack-app/src/app/features/auth/login/login.html
The password input and toggle button are in an .input-group wrapper:
  <div class="input-group">
    <input type="password" ... />
    <button type="button" class="btn-toggle-pw" ...>
  </div>

File: orderstack-app/src/app/features/auth/login/login.scss
The <input> element does not have an explicit z-index and the .btn-toggle-pw does not have
an explicit z-index. In Bootstrap 5.3's .input-group, the focused input gets z-index: 5
which causes it to render above the adjacent button. The input's clickable hit area
extends over the button area on desktop viewport widths, intercepting pointer events
before they reach the eye icon button.

This is the same pointer-events stacking issue seen in other BUG reports this session.

WHAT MUST BE FIXED

Fix 7A — Set z-index on the toggle button higher than the focused input
In login.scss, for .btn-toggle-pw:
  .btn-toggle-pw {
    position: relative;
    z-index: 10;
  }
This ensures the button always renders above the input in the stacking context.

Fix 7B — Verify the same fix is needed in the forgot password modal
The forgot password modal in login.html also has an identical .input-group / .btn-toggle-pw
pattern for the new-password field. Apply the same z-index fix there. Both buttons share
the same .btn-toggle-pw class so the single CSS rule fixes both.

Fix 7C — Do NOT change the HTML structure
The fix is CSS-only. Do not restructure the input-group layout.

IMPLEMENTATION STEPS

Step 1: Read login.scss in full.
Step 2: Add position: relative; z-index: 10 to .btn-toggle-pw.
Step 3: Rewrite login.scss in full per CLAUDE.md.
Step 4: Take a screenshot of the login page on desktop to confirm the eye icon is
  clickable.

UNIT TESTS — login.spec.ts

Test 1: Calling togglePasswordVisibility() changes showPassword() from false to true.
  (This already exists in the spec — verify it still passes after the CSS fix.)
Test 2: The .btn-toggle-pw element exists in the DOM and is not obscured by the input.
  (Angular TestBed cannot test CSS z-index directly, so this is verified via Playwright.)

PLAYWRIGHT VERIFICATION

Navigate to /login. Fill in the password field with any value. Click the eye icon button.
Assert password field type changes from 'password' to 'text'. Screenshot to confirm
the eye icon is visually accessible. Test on desktop viewport (1440x900).

COMMIT MESSAGE: fix(auth): set z-index on password visibility toggle to prevent input overlap

---

FAILURE 8 — LOW — UX
Pressing Enter in the password field does not submit the form

SEVERITY: LOW but a significant UX regression — standard browser behavior users expect.

ROOT CAUSE TRACED TO SOURCE

File: orderstack-app/src/app/features/auth/login/login.html
Both action buttons use type="button":
  <button type="button" class="btn btn-primary btn-create" ...>Create Account</button>
  <button type="button" class="btn btn-secondary btn-signin" ...>Sign In</button>

The <form> element wrapping them has no [formGroup] submission handler and no submit
button. When the user presses Enter in any input field, the browser looks for a
type="submit" button to trigger — finding none (both are type="button"), the Enter key
does nothing.

WHAT MUST BE FIXED

Fix 8A — Add (keydown.enter) to the password field for Sign In
The sign-in flow uses only email + password. When focus is in the password field, pressing
Enter should call onSignIn(). Add to the password input element:
  (keydown.enter)="onSignIn()"

Fix 8B — Add (keydown.enter) to the email field for Sign In
If the user is signing in and presses Enter from the email field, it should also trigger
onSignIn(). Add to the email input element:
  (keydown.enter)="onSignIn()"
Note: this means pressing Enter on email calls onSignIn() even during Create Account flow.
This is acceptable because onSignIn() validates email + password only and will fail gracefully
if password is empty or invalid. The existing validation guards in onSignIn() handle this.

Fix 8C — Do NOT change button types to type="submit"
Changing to type="submit" would cause both buttons to compete to handle form submission
and would complicate the two-action pattern (Create Account vs Sign In on the same form).
The keydown.enter approach is correct for this dual-action form pattern.

Fix 8D — Forgot password modal already has keydown.enter on the new-password input
The modal input already has: (keydown.enter)="submitForgotPassword()"
No change needed there.

IMPLEMENTATION STEPS

Step 1: Read login.html in full.
Step 2: Add (keydown.enter)="onSignIn()" to the email input element.
Step 3: Add (keydown.enter)="onSignIn()" to the password input element.
Step 4: Rewrite login.html in full per CLAUDE.md.
Step 5: Run npm test to confirm existing unit tests still pass.

UNIT TESTS — login.spec.ts

Test 1: Dispatching a keydown Enter event on the password input field triggers onSignIn().
  Use fixture.nativeElement.querySelector('#password').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
  and assert authService.login was called (with valid email/password in the form).
Test 2: Dispatching a keydown Enter event on the email input field also triggers onSignIn().
Test 3: Pressing Enter with invalid email+password does not call authService.login (the
  validation guard in onSignIn() prevents it — same as clicking the button while invalid).

PLAYWRIGHT VERIFICATION

Navigate to /login. Fill in email (owner@taipa.com) and password (owner123). Press Enter
from the password field. Assert navigation to /app/administration (or /select-restaurant)
occurs. Screenshot the result. Verify no console errors appear.

COMMIT MESSAGE: fix(auth): add Enter key submission to email and password fields

---

SESSION NOTE — JWT IN LOCALSTORAGE

The audit notes JWT is stored in localStorage (auth_token, auth_merchants, auth_user).
This is standard for SPAs and is not a defect requiring a fix in this plan. However the
audit correctly notes it makes the missing CSP header more critical: any XSS vulnerability
gives full token access. Fixing the CSP header (Failures 2, 3, 5 above) directly mitigates
this risk. Moving to httpOnly cookies would require major backend changes (CSRF protection,
SameSite cookie config, endpoint changes for the Angular HTTP client). That is a separate
architectural decision outside the scope of this audit. Do not change JWT storage in
this plan.

---

IMPLEMENTATION ORDER

Implement in this exact order to minimize regressions:

1. Failures 2, 3, 5 together: Helmet security headers (backend only, no frontend changes)
2. Failure 1: Rate limiter trust proxy fix (backend only)
3. Failure 4: Email enumeration prevention (backend + auth.ts service change)
4. Failure 8: Enter key UX fix (frontend HTML only, lowest risk)
5. Failure 7: Password toggle z-index (frontend CSS only, lowest risk)
6. Failure 6: Create Account disabled button CSS (frontend CSS only, lowest risk)

Failures 8, 7, and 6 are all frontend-only CSS/template fixes and can be committed
together in one pass: fix(auth): enter key submission, password toggle z-index, disabled button pointer-events

---

FILE SUMMARY — FILES THAT MUST BE CHANGED

Backend:
  Get-Order-Stack-Restaurant-Backend/src/app/app.ts
    Add trust proxy and helmet middleware

  Get-Order-Stack-Restaurant-Backend/src/app/auth.routes.ts
    Update authRateLimiter keyGenerator; update signup duplicate-email response

  Get-Order-Stack-Restaurant-Backend/package.json
    Add helmet dependency

Frontend:
  orderstack-app/src/app/features/auth/login/login.html
    Add keydown.enter bindings to email and password inputs

  orderstack-app/src/app/features/auth/login/login.scss
    Add btn-toggle-pw z-index fix; add btn-create:disabled pointer-events fix

  orderstack-app/src/app/services/auth.ts
    Update signup() to handle no-token response as duplicate email

  orderstack-app/vercel.json (or angular.json headers config)
    Add Content-Security-Policy headers for frontend

---

FILES THAT MUST NOT BE CHANGED

  main-layout.component.ts — not in scope
  any settings components — not in scope
  any route files other than auth.routes.ts — not in scope
  prisma schema — not in scope
  any database migrations — not in scope

---

DEFINITION OF DONE FOR THIS ENTIRE PLAN

1. Backend API returns Content-Security-Policy, X-Frame-Options: DENY, and
   X-Content-Type-Options: nosniff on all responses.
2. Eleven rapid failed login attempts from the same IP+email combination result in
   a 429 response on the 11th attempt.
3. Signing up with an existing email returns HTTP 200 with a generic message and no token.
   The Angular frontend shows 'already exists' error without confirming the email is taken.
4. Create Account button with unchecked terms shows pointer-events: none — clicking it
   does not fire the signup request.
5. Password visibility toggle is clickable on desktop at 1440px viewport width.
6. Pressing Enter in the email or password field during Sign In triggers the login flow.
7. All existing unit tests continue to pass in both orderstack-app (npm test) and
   Get-Order-Stack-Restaurant-Backend test suite.
8. npm run build in orderstack-app is clean with zero TypeScript errors.
9. Backend builds clean: npm run build in Get-Order-Stack-Restaurant-Backend.
10. Six commits — one per group as described above.

---

POST-TASK SELF-AUDIT (required by CLAUDE.md)

Did you set app.set('trust proxy', 1) before applying Helmet?
Did you update authRateLimiter keyGenerator to combine IP + email?
Did you install helmet as a production dependency (not devDependency)?
Does the CSP allow the backend API and Supabase in the frontend connect-src?
Does the signup endpoint return 200 (not 400) for duplicate emails?
Does the signup response for duplicate emails contain no string that confirms the email exists?
Is JWT localStorage storage unchanged?
Did Enter key in password field trigger login in the Playwright test?
Did the password toggle icon become clickable on desktop at 1440x900 in the Playwright test?
Are all existing unit tests still passing?
If any answer is no, the task is not done.
