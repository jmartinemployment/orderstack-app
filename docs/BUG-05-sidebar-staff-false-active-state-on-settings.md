BUG-05: Sidebar Shows Staff as Active When on Settings Page

Reported: 2026-03-07
Status: OPEN

Observed in live browser session 2026-03-07 at https://www.getorderstack.com/app/settings (Control Panel). The sidebar simultaneously shows two nav items with active/highlighted backgrounds: Staff (orange/salmon background) and Settings (blue text, blue icon, blue background). Only Settings should be highlighted. Staff has no sub-route active.

Reproduction steps:
1. Log in as owner@taipa.com / owner123
2. Select Taipa restaurant (3855 SW 137th Ave)
3. Click Staff in the sidebar — Staff highlights correctly
4. Click Settings in the sidebar or navigate to /app/settings
5. Observe: Settings is correctly highlighted in blue, but Staff retains an orange/salmon background — two items appear active simultaneously

Expected: When Settings is the active route, only Settings shows an active/highlighted state. Staff background returns to default.

Actual: Staff retains an orange/salmon highlight background while Settings also shows blue active state.

---

ROOT CAUSE ANALYSIS — READ BEFORE TOUCHING CODE

This is almost certainly a router-link active class not being cleared on the Staff nav item when navigating to /app/settings. The main-layout sidebar uses Angular router directives (routerLinkActive or a custom isActive() signal) to apply active styles. Two likely causes:

CAUSE A — routerLinkActive with exact: false on Staff:
If the Staff nav item uses routerLinkActive without routerLinkActiveOptions: { exact: true }, Angular will mark Staff as active for any route that begins with /app/staff, including child routes. But /app/settings does not match /app/staff at all, so this should not apply unless the route config is wrong.

CAUSE B — Custom isActive() signal or CSS class not reacting to route changes:
The sidebar may use a custom signal or computed value to determine which nav item gets an active CSS class. If Staff has a persistent expanded/open state stored in component state (e.g. a boolean isStaffOpen signal that does not reset on navigation), the orange background may be an expanded-parent style rather than an active-route style. When Staff was previously visited and its sub-menu (Scheduling) was expanded, an isExpanded or isOpen state may have been set and never cleared when navigation moved to Settings.

CAUSE C — CSS bleed from a previous active route:
A CSS class (e.g. active, is-active, router-link-active) was added to the Staff element during a previous navigation and was not removed when Settings became active. Check whether the Staff nav item has a lingering CSS class that should have been removed.

Investigation steps before writing code:

Step 1: Inspect the Staff nav item DOM element in the browser and read its full class list. Determine what CSS class produces the orange/salmon background. Compare the class list of Staff vs Settings.

Step 2: Read the sidebar/nav component source file. Find where the active CSS class or routerLinkActive directive is applied to nav items. Determine whether isActive is based on routerLinkActive, a custom signal, or a manual class binding.

Step 3: Check whether Staff has an isExpanded or isOpen state that persists after navigating away from /app/staff routes. If so, determine whether the orange background is tied to expanded state or active-route state. These should be two separate concerns.

Step 4: Check the route configuration to confirm /app/settings does not share a parent route with /app/staff in a way that would legitimately trigger Staff as active.

---

FILE PATHS

Sidebar/nav component: src/app/layouts/main-layout.component.ts (and .html)
Sidebar/nav spec: src/app/layouts/main-layout.component.spec.ts
Route config: src/app/app.routes.ts (or wherever app routing is defined)

---

CONCRETE FIX STEPS

Step 1: Identify the CSS class producing the orange Staff background. Determine whether it is an active-route class or an expanded/open class.

Step 2: If it is active-route class bleed — fix the routerLinkActive binding so it only applies when the Staff route or a Staff child route is genuinely active. Use routerLinkActiveOptions: { exact: false } only for parent routes whose children should keep the parent highlighted. /app/settings is not a child of /app/staff.

Step 3: If it is an expanded/open state styling — separate the expanded-parent CSS from the active-route CSS. Expanded state should have its own CSS class that does not use the same background color as the active route indicator.

Step 4: Confirm the fix does not break the Staff item's legitimate active state: when on /app/staff or /app/staff/scheduling, Staff should still show its active highlight.

---

UNIT TESTS

Write or update the spec at src/app/layouts/main-layout.component.spec.ts. Use TestBed with RouterTestingModule. Required tests:

Test 1: When the route is /app/settings, the Staff nav item does not have the active CSS class. The Settings nav item does have the active CSS class.

Test 2: When the route is /app/staff, the Staff nav item has the active CSS class. The Settings nav item does not.

Test 3: When the route is /app/staff/scheduling (child), the Staff nav item still has the active CSS class (parent highlight persists for child routes).

Test 4: When navigating from /app/staff to /app/settings, the Staff active class is removed and the Settings active class is applied.

Test 5: If Staff has an isExpanded state, expanding Staff while on /app/settings does not change the active class of Settings.

---

PLAYWRIGHT END-TO-END TEST

Write the Playwright test to /tmp/playwright-test-bug05-sidebar-active-state.js using the Playwright skill at orderstack-app/.claude/skills/playwright-skill.

Use the production URL https://www.getorderstack.com.
Login as owner@taipa.com / owner123, select Taipa 3855 SW 137th Ave.

Step 1: Navigate to /app/staff. Assert Staff nav item has active styling. Assert Settings nav item does not.
Step 2: Navigate to /app/settings. Assert Settings nav item has active styling. Assert Staff nav item does NOT have any active/highlighted background class.
Step 3: Take a screenshot to /tmp/bug05-sidebar-settings-active.png showing both nav items.
Step 4: Navigate back to /app/staff. Assert Staff is active again, Settings is not.
Step 5: Log PASS or FAIL for each assertion.

Run the test:
cd /Users/jam/development/orderstack-app/.claude/skills/playwright-skill
node run.js /tmp/playwright-test-bug05-sidebar-active-state.js

---

WHAT MUST NOT HAPPEN

Do not hide the orange background by overriding CSS without fixing the root cause class assignment. Do not change the active style of Settings or Staff to make them look the same. Do not hard-code route checks in the template — use Angular router state properly.

---

DEFINITION OF DONE

1. On /app/settings, only the Settings nav item shows an active highlight. Staff background is default/neutral.
2. On /app/staff or any /app/staff/* child route, Staff shows its active highlight correctly.
3. All five unit tests pass.
4. Playwright test passes: Staff not highlighted on /app/settings, Settings highlighted correctly.
5. Build clean with zero TypeScript errors.
6. Committed: fix(nav): clear Staff active state when navigating to Settings

---

POST-TASK SELF-AUDIT (required by CLAUDE.md)

Did you inspect the DOM class list of the Staff element to identify the exact CSS class causing the orange background before writing any code?
Did you determine whether the highlight is from a routerLinkActive binding, a custom signal, or an expanded-state style?
Did you verify the fix does not break Staff's legitimate active state on /app/staff routes?
Did all five unit tests pass using TestBed?
Did the Playwright test confirm zero active highlighting on Staff when on /app/settings?
If any answer is no, the task is not done.
