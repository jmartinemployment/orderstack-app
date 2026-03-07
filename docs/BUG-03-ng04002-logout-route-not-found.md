BUG-03: NG04002 Angular Router Cannot Find Logout Route

Reported: 2026-03-07
Project: OrderStack (orderstack-app frontend)
Severity: High — Angular throws NG04002 route not found for 'logout' three times on every page load. This means either a routerLink or router.navigate() call is pointing to a route named 'logout' that does not exist in the Angular router configuration, or a redirect after logout is navigating to a non-existent route. If the user attempts to log out and the navigation fails silently, they may remain on a protected page while their auth token is cleared, creating a broken or insecure state.

---

OBSERVED BEHAVIOR

The following error appears in the browser console three times immediately after the app initializes (timestamps 7:24:40 AM):

ERROR E: NG04002: 'logout'
  at ln.noMatchError
  at ln.match
  at ln.recognize

NG04002 means Angular's router received a navigation request for a path or named route called 'logout' and could not match it to any registered route. The error fires three times, suggesting three separate components or services attempt this navigation on startup.

EXPECTED BEHAVIOR

Either:
A) A /logout route exists in the Angular router configuration and handles the logout flow (clear token, redirect to /login), or
B) No component or service navigates to 'logout' — instead, logout calls the auth service directly, clears the token, then navigates to /login which is a known valid route.

Option B is the correct pattern for Angular. A /logout route is unnecessary — logout is an action, not a page. The fix should remove any navigation to 'logout' and replace it with the correct auth service call followed by router.navigate(['/login']) or router.navigate(['/app/administration']) as appropriate.

---

ROOT CAUSE INVESTIGATION

Search the entire frontend codebase for every occurrence of 'logout' used as a navigation target. The root cause will be one or more of the following:

1. A routerLink="/logout" or [routerLink]="['/logout']" in a component template — likely in the sidebar or main layout component.

2. A router.navigate(['/logout']) or router.navigate(['logout']) call in a component or service — likely in the auth service, a logout button handler, or a session expiry interceptor.

3. A named route 'logout' referenced via router.navigate({outlets: ...}) or similar advanced routing syntax.

Search command to run from the orderstack-app directory:
  grep -r "logout" src/ --include="*.ts" --include="*.html" -l

Then inspect each file found for navigation calls vs. method calls. A call to authService.logout() is correct. A navigation to the string 'logout' as a route is the bug.

Find all three instances (since the error fires three times) and fix each one.

---

THE FIX

For each location where 'logout' is used as a router navigation target:

1. Remove the routerLink or router.navigate call pointing to 'logout'.

2. Replace with a click handler or method that:
   a. Calls the auth service logout method to clear the JWT token and any stored session data.
   b. Calls router.navigate(['/login']) to redirect to the login page.

The fix must not add a /logout route to the router configuration. That would make the error go away while leaving a dead route in the app. Fix the navigation calls at their source.

After the fix, zero NG04002 errors must appear in the console on any page load.

---

UNIT TESTS (Vitest)

Locate the component(s) where the broken logout navigation lives (likely the main layout or sidebar). Write or update tests in their spec files.

Test 1 — logout button calls auth service logout method: render the component containing the logout action. Mock the AuthService with a spy on the logout() method. Mock the Router with a spy on navigate(). Trigger the logout action (click the button or call the handler directly). Assert that authService.logout() was called exactly once.

Test 2 — logout button navigates to /login after calling logout: using the same setup as Test 1, assert that router.navigate was called with ['/login'] after authService.logout().

Test 3 — logout button does not navigate to the string 'logout': assert that router.navigate was never called with a value containing the plain string 'logout' (not '/login', not ['logout'], nothing matching that pattern).

Test 4 — no NG04002 error on component init: render each component that was patched. Assert that no router navigation to 'logout' is triggered during ngOnInit or component construction.

---

PLAYWRIGHT END-TO-END TEST

Write a Playwright test to /tmp/playwright-test-logout-route-ng04002.js using the Playwright skill at orderstack-app/.claude/skills/playwright-skill.

Use the production URL https://www.getorderstack.com.

The test must do the following:

Step 1 — Register a console error listener with page.on('console') before any navigation. Collect all messages of type 'error' into an array throughout the entire test.

Step 2 — Log in as owner@taipa.com with password owner123.

Step 3 — Handle the restaurant selection screen if it appears.

Step 4 — Wait 5 seconds for all initialization to complete and all startup navigation attempts to fire.

Step 5 — Assert that ZERO console errors containing 'NG04002' are present. If any are found, print each one and fail the test.

Step 6 — Locate the logout button in the sidebar or navigation. Assert it is visible.

Step 7 — Click the logout button.

Step 8 — Wait for navigation to complete and assert the current URL contains '/login', confirming the logout redirect worked.

Step 9 — Assert that no NG04002 error fired during or after the logout click.

Step 10 — Take a screenshot to /tmp/logout-route-test-result.png.

Step 11 — Log PASS or FAIL for each assertion.

Run the test after writing it:
cd /Users/jam/development/orderstack-app/.claude/skills/playwright-skill
node run.js /tmp/playwright-test-logout-route-ng04002.js

---

DEFINITION OF DONE

1. All occurrences of 'logout' used as a router navigation target are found (expect at least 3 based on error count).
2. Each occurrence is replaced with authService.logout() followed by router.navigate(['/login']).
3. Zero NG04002 errors appear in the browser console on any page load.
4. All four unit tests pass.
5. Playwright test passes: no NG04002 on load, logout button redirects to /login.
6. Fix committed with message: fix(auth): replace invalid logout route navigation with auth service call and redirect to /login

Include the Post-Task Self-Audit checklist from the root CLAUDE.md in your completion response.
