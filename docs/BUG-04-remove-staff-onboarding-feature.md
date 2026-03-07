BUG-04: Remove Staff Onboarding Feature Entirely

Reported: 2026-03-07
Project: OrderStack (orderstack-app frontend + Get-Order-Stack-Restaurant-Backend)
Severity: High — the Settings > Staff > Team Members tab displays an Onboarding column,
an Onboarding status badge on each team member row, and a "Needs Onboarding" section
below the team list. Staff onboarding is not a feature of OrderStack. No team member
ever requires onboarding through this system. This entire concept must be removed from
the codebase — frontend UI, backend data model, API responses, and database schema.

---

OBSERVED BEHAVIOR

Settings > Staff > Team Members shows:

  Columns: NAME | JOBS | PERMISSION SET | ONBOARDING | STATUS | ACTIONS
  Row: Jeff Martin | No jobs | None | Not Started (orange badge) | active

Below the team member list a "Needs Onboarding [1]" section appears with a card
showing Jeff Martin with a "Not Started" badge and his email.

EXPECTED BEHAVIOR

The Team Members list must have no Onboarding column, no onboarding status badge on
any row, and no "Needs Onboarding" section. The correct columns are:
NAME | JOBS | PERMISSION SET | STATUS | ACTIONS

No onboarding-related concept should appear anywhere in the staff management UI.

---

THIS IS A REMOVAL, NOT A FIX

Do not add logic to hide the onboarding column for certain users. Do not add a filter
to exclude records from the "Needs Onboarding" section. Do not add a feature flag.
Remove the entire staff onboarding feature from every layer of the stack.

This is not a configuration problem. Staff onboarding is not a valid feature for
OrderStack. Treat this as dead code that must be fully deleted.

---

SCOPE OF REMOVAL

Search the entire codebase for every reference to onboarding as it relates to staff
or team members. The search must be exhaustive before any deletion begins.

Frontend (orderstack-app) — search src/ for:
  - Any component, template, or service that references staff onboarding,
    team member onboarding status, "Needs Onboarding", or onboarding badges
  - Any TypeScript interface or model on TeamMember that includes an onboarding
    field, onboardingStatus, onboardingComplete, or similar
  - Any signal, computed, or filter that segments team members by onboarding state
  - Any route that leads to a staff onboarding flow or wizard

Backend (Get-Order-Stack-Restaurant-Backend) — search src/ for:
  - Any route handler, service method, or Prisma query that reads or writes an
    onboarding status field on a team member or staff record
  - Any API response shape that includes onboardingStatus, onboarding, or similar
    fields on team member objects
  - Any middleware or guard that checks staff onboarding state

Database (Prisma schema + Supabase):
  - Any field on the TeamMember model named onboardingStatus, onboarding,
    onboardingComplete, or similar
  - If such a field exists, create a Prisma migration to drop it

---

THE REMOVAL STEPS

Step 1 — Audit first: Run the searches above and list every file that contains
onboarding logic related to staff or team members. Present the full list before
making any changes.

Step 2 — Frontend removal:
  - Remove the Onboarding column header from the team members table template
  - Remove the onboarding status badge from each team member row
  - Remove the "Needs Onboarding" section and its enclosing container entirely
  - Remove any onboardingStatus or equivalent field from the TeamMember TypeScript
    interface and model
  - Remove any service method that fetches, sets, or computes onboarding status
    for team members
  - Remove any route, lazy-loaded component, or wizard that constitutes a staff
    onboarding flow
  - Remove all imports that become unused as a result

Step 3 — Backend removal:
  - Remove the onboardingStatus field (or equivalent) from any team member
    response DTO or serializer
  - Remove any route or service method that updates or queries onboarding status
    on team members
  - If onboarding status is computed from a join or subquery, remove that logic
  - Remove all imports and types that become unused as a result

Step 4 — Schema removal:
  - If the Prisma TeamMember model contains an onboarding field, remove it
  - Generate and apply a migration: prisma migrate dev --name remove_staff_onboarding
  - Apply to production Supabase instance mpnruwauxsqbrxvlksnf

Step 5 — Verify no regressions: After all deletions, confirm the team members list
still renders correctly with NAME, JOBS, PERMISSION SET, STATUS, and ACTIONS columns
and that no onboarding-related text, badge, section, or column appears anywhere in the
settings > staff UI.

Do not leave any commented-out onboarding code. Delete it.
Do not leave any dead imports referencing removed types.
Do not leave any TODO comments saying "onboarding removed".
Clean deletion only.

---

UNIT TESTS (Vitest)

Backend unit tests:

Test 1 — GET team-members response does not include onboarding field: call the
team members GET endpoint and assert that the response objects do not have an
onboardingStatus, onboarding, onboardingComplete, or any onboarding-related property.

Test 2 — TeamMember model does not have an onboarding field: inspect the Prisma
schema programmatically or use a type-level test to assert that no onboarding field
exists on the TeamMember model.

Frontend unit tests:

Test 3 — Team members table does not render an Onboarding column: render the staff
settings component. Assert that no table header or column with the text "Onboarding",
"onboarding", or "Needs Onboarding" exists in the rendered output.

Test 4 — Team members table does not render an onboarding badge on any row: render
the component with a mock team member array. Assert that no element with an onboarding
status badge, "Not Started", "In Progress", or "Complete" onboarding text exists in
the rendered rows.

Test 5 — No "Needs Onboarding" section renders: render the component with a mock
team member array containing multiple members. Assert that no element with the text
"Needs Onboarding" exists anywhere in the rendered output.

All five tests must pass. These tests serve as regression guards — if onboarding UI
is ever accidentally re-introduced, these tests must catch it.

---

PLAYWRIGHT END-TO-END TEST

Write a Playwright test to /tmp/playwright-test-no-staff-onboarding.js using the
Playwright skill at orderstack-app/.claude/skills/playwright-skill.

Use the production URL https://www.getorderstack.com.

The test must do the following:

Step 1 — Log in as owner@taipa.com with password owner123.

Step 2 — Handle restaurant selection if it appears.

Step 3 — Navigate to /app/settings.

Step 4 — Click the Staff tab in the Control Panel tab row.

Step 5 — Wait 3 seconds for the team members list to fully load.

Step 6 — Assert that NO table column header with the text "Onboarding" exists.
If found, fail the test and print what was found.

Step 7 — Assert that NO element anywhere on the page contains the text
"Needs Onboarding". If found, fail the test and print the element content.

Step 8 — Assert that NO element anywhere on the page contains the text
"Not Started" in an onboarding context (an orange or warning-colored badge
adjacent to a team member row). If found, fail the test.

Step 9 — Assert that the table DOES contain the expected columns: NAME, JOBS,
PERMISSION SET, STATUS, ACTIONS.

Step 10 — Take a full-page screenshot to /tmp/staff-no-onboarding-result.png.

Step 11 — Log PASS or FAIL for each assertion with specific values.

Run the test after writing it:
cd /Users/jam/development/orderstack-app/.claude/skills/playwright-skill
node run.js /tmp/playwright-test-no-staff-onboarding.js

---

DEFINITION OF DONE

1. All references to staff onboarding found and listed before any deletion begins.
2. Onboarding column removed from team members table template.
3. Onboarding status badge removed from every team member row.
4. "Needs Onboarding" section removed entirely.
5. TeamMember TypeScript interface has no onboarding field.
6. Backend API responses for team members have no onboarding field.
7. Prisma schema has no onboarding field on TeamMember — migration applied to
   Supabase instance mpnruwauxsqbrxvlksnf.
8. All five unit tests pass.
9. Playwright test passes: no Onboarding column, no Needs Onboarding section,
   correct columns present.
10. Fix committed with message: feat(staff): remove staff onboarding feature entirely

Include the Post-Task Self-Audit checklist from the root CLAUDE.md in your
completion response.
