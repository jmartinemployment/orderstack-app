# BUG-15 — Catering Job Fulfillment Date Saves One Day Early (Off-by-One)

**Date:** 2026-03-08
**Severity:** High — every catering job displays the wrong event date
**Status:** Open
**Affected route:** `/app/catering` (New Job form) → `/app/catering/job/:id` (Overview tab)

---

## Symptoms

1. User enters **April 15, 2026** in the Fulfillment Date field
2. Job is created successfully
3. Job Detail page header shows **"Event Apr 14, 2026"** — one day early

## Root Cause

`new Date("2026-04-15")` parses as UTC midnight. In US Eastern (UTC-4/5) that
renders as April 14 at 8 PM local time — one day before the entered date.

---

## Claude Code Prompt

```
Fix BUG-15 in the OrderStack Angular frontend.

PROBLEM: The catering job fulfillment date displays one day earlier than the
date the user entered. Example: user enters April 15, 2026 — job detail shows
"Event Apr 14, 2026". Root cause is UTC parsing: new Date("2026-04-15") is
midnight UTC which is the previous calendar day in US timezones.

FIX:
1. Find every place in the catering job create/edit form that reads the date
   input value and constructs a Date or passes a date string to the API payload.
   Likely files:
     src/app/features/catering/catering-dashboard/catering-dashboard.component.ts
     src/app/features/catering/catering-job-detail/ (any form component)

2. Replace all instances of:
     new Date(dateString)
   with local-time parsing:
     const [y, m, d] = dateString.split('-').map(Number);
     const date = new Date(y, m - 1, d);
   OR simply append the local time designator:
     new Date(dateString + 'T00:00:00')

3. Find every place that DISPLAYS the event date (job detail header, job cards,
   "Event Apr XX" text). If using Angular DatePipe, ensure the timezone is not
   forcing UTC output. Change any date display that uses UTC to use local time.
   Typical fix in template: {{ job.fulfillmentDate | date:'mediumDate' }}
   (DatePipe defaults to local time — remove any explicit 'UTC' timezone param).

4. Verify the API payload sends the date correctly — if the backend expects
   ISO UTC, send noon UTC instead of midnight to avoid day-boundary issues:
     new Date(y, m - 1, d, 12, 0, 0).toISOString()

RULES:
- Full file rewrites only (no partial edits)
- Follow all CLAUDE.md directives
- standalone: true, ChangeDetectionStrategy.OnPush
- Run ng build && npx tsc --noEmit after changes — must be zero errors
- Do not add any features not described above

TEST: Create a job with date April 15, 2026. Confirm detail page shows
"Event Apr 15, 2026" not "Event Apr 14, 2026".
```
