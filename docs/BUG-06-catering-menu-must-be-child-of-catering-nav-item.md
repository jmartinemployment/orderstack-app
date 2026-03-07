BUG-06: Catering Sidebar Lost Full Nav Structure — Restore Per FEATURE-04 Spec

Reported: 2026-03-07
Status: OPEN

The catering mode sidebar was built during the FEATURE-02 implementation sprint but the full nav tree defined in FEATURE-04 was never applied. The current buildCateringNav() returns a flat 9-item list. The approved design (FEATURE-04 / docs/FEATURE-04-catering-admin-sidebar.md) specifies a rich sectioned tree with parent items, children, badges, and dividers.

Most critically: there is no Catering parent item at all. Catering Menu appears as a standalone top-level item. Jobs & Calendar, Invoices, Prep Lists, and Reports are all incorrectly top-level. This is not the approved structure.

---

CURRENT (WRONG) SIDEBAR — buildCateringNav() today:

  Administration
  Jobs & Calendar         route: /app/catering
  Invoices                route: /app/invoicing
  Prep Lists              route: /app/catering/prep-list
  Catering Menu           route: /app/menu           <-- standalone, wrong
  Clients                 route: /app/customers
  Reports                 route: /app/catering/reports
  Staff
    Scheduling
  Marketing
  Settings

---

CORRECT SIDEBAR — per FEATURE-04 spec (docs/FEATURE-04-catering-admin-sidebar.md section 4.1 and 5.1):

  PIPELINE SECTION
  Dashboard               route: /app/administration
  Jobs                    route: /app/catering         (badge: pendingJobsCount)
    Leads                 route: /app/catering?status=inquiry
    Active Jobs           route: /app/catering?status=active
    Completed             route: /app/catering?status=completed
    All Jobs              route: /app/catering?status=all
  Calendar                route: /app/catering/calendar
  Proposals               route: /app/catering/proposals  (badge: proposalsAwaitingApproval)

  BILLING SECTION (dividerBefore)
  Invoices                route: /app/invoicing         (badge: dueMilestones)
    All Invoices          route: /app/invoicing
    Outstanding           route: /app/invoicing?status=outstanding
    Milestones            route: /app/invoicing/milestones

  OPERATIONS SECTION (dividerBefore)
  Clients                 route: /app/customers
  Menu                    route: /app/menu
    Items                 route: /app/menu?type=catering
    Packages              route: /app/menu/packages
  Delivery                route: /app/catering/delivery

  BUSINESS SECTION (dividerBefore)
  Reports                 route: /app/reports
    Revenue               route: /app/reports/revenue
    Deferred              route: /app/reports/deferred
    Job Performance       route: /app/reports/catering
  Staff                   route: /app/staff
    Team                  route: /app/staff
    Scheduling            route: /app/staff/scheduling
  Marketing               route: /app/marketing

  CONFIG SECTION (dividerBefore)
  Settings                route: /app/settings
    Business Info         route: /app/settings/business
    Invoice Branding      route: /app/settings/branding
    Payment Setup         route: /app/settings/payments
    Notifications         route: /app/settings/notifications

---

ROOT CAUSE

File: src/app/layouts/main-layout.component.ts
Method: buildCateringNav()

The method was written as a temporary skeleton during early catering development and was never updated to match the FEATURE-04 spec. The full replacement implementation is already written in FEATURE-04 section 5.1 — this task is primarily an implementation of that spec, not new design work.

---

WHAT FEATURES ARE ALREADY BUILT vs WHAT NEEDS STUBS

Before writing routes or components, read src/app/app.routes.ts and src/app/features/catering/ to determine what already exists.

Routes and components that already exist (from FEATURE-02 and the catering sprint):
- /app/catering — CateringDashboard
- /app/invoicing — InvoicingComponent
- /app/catering/prep-list — CateringPrepList
- /app/customers — CustomersComponent
- /app/menu — MenuComponent
- /app/staff — StaffComponent
- /app/staff/scheduling — SchedulingComponent
- /app/marketing — MarketingComponent
- /app/settings — SettingsComponent

Routes that may need to be added as stubs (check app.routes.ts first):
- /app/catering/calendar
- /app/catering/proposals
- /app/catering/delivery
- /app/invoicing/milestones
- /app/reports/revenue
- /app/reports/deferred
- /app/reports/catering
- /app/menu/packages
- /app/settings/business
- /app/settings/branding
- /app/settings/payments
- /app/settings/notifications

For any route that does not yet exist: create a minimal stub component that renders a heading with the section name and a "Coming soon" message. Do not build out full feature UI. The goal is that clicking these nav items navigates without a 404 or NG0900 error.

---

CATERINGSERVICE BADGE SIGNALS

Read src/app/services/catering.service.ts. Check whether these computed signals already exist:

- pendingJobsCount — filters jobs where status is inquiry or proposal_sent
- proposalsAwaitingApproval — filters jobs where status is proposal_sent and contractSignedAt is null
- milestonesComingDue — counts milestone payments due within 7 days across all jobs

If any are missing, add them per the FEATURE-04 section 5.2 spec. Do not rename or remove any existing signals.

---

NAVIITEM TYPE CHECK

Before writing the new buildCateringNav(), read the NavItem type definition (likely in src/app/shared/sidebar/sidebar.ts or src/app/models/). Confirm it supports:
- children: NavItem[]
- dividerBefore: boolean
- badge: number | undefined
- queryParams: Record<string, string> | undefined

If any of these fields are missing from the NavItem interface, add them. Then confirm the Sidebar component template actually renders dividers, children, and badges correctly. If the Sidebar template does not render dividers or queryParams, implement that rendering as part of this task.

---

CONCRETE STEPS IN ORDER

Step 1: Read docs/FEATURE-04-catering-admin-sidebar.md section 5.1 in full. This is the authoritative spec.

Step 2: Read src/app/shared/sidebar/sidebar.ts — NavItem interface and Sidebar template. Confirm all required fields exist.

Step 3: Read src/app/app.routes.ts — identify which catering sub-routes already exist and which need stubs.

Step 4: Add missing badge signals to CateringService if needed.

Step 5: Add missing NavItem interface fields if needed.

Step 6: Add missing stub routes and components for any nav items that would 404.

Step 7: Replace buildCateringNav() entirely with the implementation from FEATURE-04 section 5.1.

Step 8: Run npm run build. Zero TypeScript errors required.

Step 9: Verify sidebar renders correctly for a catering account.

---

FILE PATHS

Nav builder:    src/app/layouts/main-layout.component.ts
Nav spec:       src/app/layouts/main-layout.component.spec.ts
Sidebar:        src/app/shared/sidebar/sidebar.ts (and .html)
Routes:         src/app/app.routes.ts
Catering svc:   src/app/services/catering.service.ts
Catering comps: src/app/features/catering/
FEATURE spec:   docs/FEATURE-04-catering-admin-sidebar.md

---

UNIT TESTS

Write or update tests in src/app/layouts/main-layout.component.spec.ts using TestBed with a mock PlatformService that returns isCateringMode() = true and a mock CateringService.

Test 1: buildCateringNav() contains no top-level NavItem with label Catering Menu. Menu must only appear as a child.

Test 2: buildCateringNav() has a top-level Jobs item with a children array containing Leads, Active Jobs, Completed, All Jobs.

Test 3: buildCateringNav() has a top-level Invoices item with a children array containing All Invoices, Outstanding, Milestones.

Test 4: buildCateringNav() has a top-level Menu item with a children array containing Items and Packages.

Test 5: buildCateringNav() has a top-level Reports item with a children array containing Revenue, Deferred, Job Performance.

Test 6: buildCateringNav() has a top-level Staff item with children Team and Scheduling.

Test 7: buildCateringNav() has a top-level Settings item with children Business Info, Invoice Branding, Payment Setup, Notifications.

Test 8: buildCateringNav() contains dividerBefore: true on Invoices, Clients, Reports, and Settings items.

Test 9: When pendingJobsCount() returns 3, the Jobs nav item has badge: 3.

Test 10: buildDefaultNav() is completely unaffected — no catering nav items appear in non-catering mode.

---

PLAYWRIGHT END-TO-END TEST

Write to /tmp/playwright-test-bug06-catering-sidebar.js using the Playwright skill at orderstack-app/.claude/skills/playwright-skill.

A catering test account is required. If none is available at runtime, log SKIP clearly and exit.

If a catering account is available:

Step 1: Log in, select the catering restaurant.
Step 2: Confirm the sidebar shows Dashboard, Jobs, Calendar, Proposals, Invoices, Clients, Menu, Delivery, Reports, Staff, Marketing, Settings at the top level.
Step 3: Confirm no item labeled Catering Menu exists at the top level.
Step 4: Click Jobs to expand it. Assert children Leads, Active Jobs, Completed, All Jobs are visible.
Step 5: Click Menu to expand it. Assert children Items and Packages are visible.
Step 6: Click Menu > Items and assert navigation to /app/menu.
Step 7: Take a screenshot to /tmp/bug06-catering-sidebar-restored.png.
Step 8: Log PASS or FAIL for each assertion.

Run:
cd /Users/jam/development/orderstack-app/.claude/skills/playwright-skill
node run.js /tmp/playwright-test-bug06-catering-sidebar.js

---

WHAT MUST NOT HAPPEN

Do not leave Catering Menu as a top-level item.
Do not keep the flat 9-item skeleton — it must be fully replaced.
Do not build out full feature UI for stub routes — a heading and "Coming soon" is sufficient.
Do not touch buildDefaultNav() — non-catering mode is unaffected.
Do not use the ! non-null assertion operator.

---

DEFINITION OF DONE

1. buildCateringNav() matches the FEATURE-04 section 5.1 spec — correct sections, children, dividers, badges.
2. No top-level Catering Menu item exists anywhere in the catering nav.
3. All stub routes navigate without 404 or console errors.
4. All 10 unit tests pass.
5. npm run build is clean with zero TypeScript errors.
6. Catering sidebar renders the full tree correctly in a logged-in catering session.
7. Committed: fix(nav): restore full catering sidebar nav per FEATURE-04 spec

---

POST-TASK SELF-AUDIT (required by CLAUDE.md)

Did you read FEATURE-04 section 5.1 in full before writing any code?
Did you check the NavItem interface for all required fields before building the nav tree?
Did you check app.routes.ts before creating any stub components?
Is Catering Menu gone from the top level?
Do all 10 unit tests pass?
Is buildDefaultNav() completely unchanged?
If any answer is no, the task is not done.
