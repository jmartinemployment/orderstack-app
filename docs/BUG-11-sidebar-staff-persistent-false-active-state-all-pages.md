BUG-11: Staff Nav Item Shows Persistent False-Active Background on Every Page

Reported: 2026-03-07
Status: OPEN
Severity: MEDIUM — visible on every authenticated page for every user
Related: BUG-05-sidebar-staff-false-active-state-on-settings.md (originally observed only on /app/settings — now confirmed global)

---

OBSERVED BEHAVIOR

The Staff nav item in the main sidebar displays a persistent orange/salmon background highlight
on every page in the application — not only on /app/settings but on all routes including
/app/administration, /app/orders, /app/menu, and every other page tested.

Confirmed on the following pages this session:
  /app/settings     — Staff orange background + Settings blue active (original BUG-05 observation)
  /app/orders       — Staff orange background + Orders blue active
  /app/administration — Staff orange background + Administration blue active

In every case: the correct page nav item shows blue active styling AND Staff simultaneously
shows an orange background. Staff is never the active route on any of these pages.

---

EXPECTED BEHAVIOR

The Staff nav item background is neutral/default on all pages where the active route is not
/app/staff or a child of /app/staff. The orange/salmon background must only appear when the
user is actively on /app/staff or /app/staff/scheduling.

---

ROOT CAUSE ANALYSIS — READ BEFORE TOUCHING CODE

This is NOT a settings-specific issue. The bug is present from the moment the user logs in
and persists across all navigation. This strongly points to one of two causes:

CAUSE A — Expanded/open state stored at component init time
The sidebar component may set an isExpanded or isOpen signal for Staff during ngOnInit or
a constructor effect, based on some default or persisted state. If Staff defaults to expanded
(to show the Scheduling child), the CSS for the expanded parent state uses the same
orange/salmon background as the active-route state. These two states — expanded and active —
must be visually distinct. The expanded-parent background should not match the active-route
background.

CAUSE B — routerLinkActive misconfiguration applying to a non-route element
If the Staff nav item uses routerLinkActive on the parent element (not the route link itself),
and the directive is configured with { exact: false } on a partial path that inadvertently
matches a broad prefix, the active class could be applied globally. Unlikely given the
symptom, but must be ruled out by inspecting the DOM class list.

CAUSE C — CSS class set once and never cleared
A class (e.g. active, is-active, expanded, router-link-active) was applied to the Staff
element at login or at first render and is never removed because the removal logic depends
on navigation events that fire before the sidebar component subscribes. Given the symptom
appears on every page from first load, a one-time initialization bug is the most likely
root cause.

---

INVESTIGATION STEPS — DO NOT SKIP

Step 1: Open browser DevTools on any authenticated page (e.g. /app/orders). Inspect the
Staff nav item element. Read its full className list and all inline styles. Identify the
exact CSS class or property producing the orange/salmon background.

Step 2: Read src/app/shared/sidebar/sidebar.ts and sidebar.html in full. Find where the
active/expanded CSS class is applied to the Staff nav item. Determine whether it uses:
  a) Angular routerLinkActive directive
  b) A custom isActive(route) method or computed signal
  c) A manually managed isExpanded/isOpen signal
  d) A combination of the above

Step 3: Determine when the orange class is first set. Is it set at component creation
(constructor, ngOnInit, effect()) or only after a navigation event?

Step 4: If isExpanded is the cause — separate the expanded-parent CSS from the
active-route CSS so they use visually distinct backgrounds. The expanded parent should
show a subtle background (e.g. slightly tinted) but NOT the same orange as the active route.

Step 5: If routerLinkActive is the cause — audit every routerLink and routerLinkActive
directive on nav items. Ensure Staff's routerLinkActive only activates when the current
URL begins with /app/staff.

Step 6: If a one-time class application is the cause — find where the class is set and
add the corresponding navigation event listener to clear it when the route changes away
from /app/staff.

---

FILE PATHS

Sidebar component:     src/app/shared/sidebar/sidebar.ts
Sidebar template:      src/app/shared/sidebar/sidebar.html
Sidebar styles:        src/app/shared/sidebar/sidebar.scss (if exists)
Main layout:           src/app/layouts/main-layout.component.ts
Main layout template:  src/app/layouts/main-layout.component.html
Main layout spec:      src/app/layouts/main-layout.component.spec.ts

---

CONCRETE FIX STEPS

Step 1: Read all sidebar files listed above before writing any code.

Step 2: Identify the exact CSS class causing the orange Staff background (from DevTools).

Step 3: Fix the root cause — do not hide the symptom with CSS overrides. Do not set
background: none on Staff to mask the issue.

Step 4: After the fix, verify that:
  a) On /app/orders — Staff has no orange background
  b) On /app/administration — Staff has no orange background
  c) On /app/staff — Staff DOES have its correct active background
  d) On /app/staff/scheduling — Staff parent STILL shows its active/expanded background
  e) After navigating away from /app/staff to /app/orders, Staff background clears immediately

Step 5: Run npm run build. Zero TypeScript errors required.

---

UNIT TESTS

Write or update tests in src/app/layouts/main-layout.component.spec.ts using TestBed with
RouterTestingModule.

Test 1: On route /app/orders, the Staff nav item does NOT have the active CSS class. The
Orders nav item DOES have the active CSS class.

Test 2: On route /app/administration, the Staff nav item does NOT have the active CSS class.
The Administration nav item DOES.

Test 3: On route /app/staff, the Staff nav item DOES have the active CSS class.

Test 4: On route /app/staff/scheduling, the Staff nav item still has its active/expanded
styling (parent highlight preserved for child routes).

Test 5: Navigating from /app/staff to /app/orders removes the active class from Staff and
applies it to Orders.

Test 6: At component initialization (before any navigation event), the Staff nav item does
NOT have the active CSS class if the initial route is /app/administration.

---

PLAYWRIGHT END-TO-END TEST

Write to /tmp/playwright-test-bug11-staff-global-active.js using the Playwright skill at
orderstack-app/.claude/skills/playwright-skill.

Login as owner@taipa.com / owner123. Select Taipa 3855 SW 137th Ave.

Step 1: Navigate to /app/administration. Assert Staff nav item does NOT have the orange
active background class. Screenshot to /tmp/bug11-admin-page.png.
Step 2: Navigate to /app/orders. Assert Staff nav item does NOT have the orange active
background class. Screenshot to /tmp/bug11-orders-page.png.
Step 3: Navigate to /app/menu. Assert Staff nav item does NOT have the orange active
background class.
Step 4: Navigate to /app/staff. Assert Staff nav item DOES have its correct active class.
Step 5: Navigate back to /app/orders. Assert Staff active class has been cleared.
Step 6: Log PASS or FAIL for each assertion.

Run:
cd /Users/jam/development/orderstack-app/.claude/skills/playwright-skill
node run.js /tmp/playwright-test-bug11-staff-global-active.js

---

WHAT MUST NOT HAPPEN

Do not override Staff CSS to background: none or background: transparent as a blanket fix.
Do not remove the Staff active state for /app/staff routes.
Do not add any route-specific CSS exceptions by URL string matching in the template.
Do not change the visual design of the active state for other nav items.

---

DEFINITION OF DONE

1. Staff nav item shows neutral background on every page except /app/staff and
   /app/staff/scheduling.
2. On /app/staff and /app/staff/scheduling, Staff shows the correct active/expanded
   highlight.
3. Navigating from /app/staff to any other route immediately clears the Staff highlight.
4. All 6 unit tests pass.
5. Playwright confirms zero false-active Staff background on /app/administration,
   /app/orders, and /app/menu.
6. npm run build clean with zero TypeScript errors.
7. Committed: fix(nav): remove persistent false-active background from Staff nav item

---

POST-TASK SELF-AUDIT (required by CLAUDE.md)

Did you inspect the actual DOM class list of the Staff element in DevTools before writing code?
Did you identify whether the orange background comes from an expanded state, routerLinkActive,
or a manually-set class?
Is the fix a root-cause fix and not a CSS mask?
Does Staff still show correct active styling on /app/staff and /app/staff/scheduling?
Does navigating away from /app/staff immediately clear the background?
Do all 6 unit tests pass?
If any answer is no, the task is not done.
