# BUG-17 — Catering Dashboard Banner Shows "In NaN days"

**Date:** 2026-03-08
**Severity:** Medium — unprofessional display; next-job countdown is broken
**Status:** Open
**Affected route:** `/app/catering`

---

## Symptoms

The "next upcoming job" banner at the top of the Catering dashboard displays:
  **"In NaN days · 1 guests"**
instead of the correct countdown like "In 38 days · 1 guests".

This happens after creating a new job. On initial page load before any job
exists the banner is hidden (correct). After creating a job it appears but
the day count is NaN.

## Root Cause

The component calculates days between today and the job's `fulfillmentDate`
using something like:
  `Math.floor((new Date(job.fulfillmentDate) - new Date()) / 86400000)`
But `job.fulfillmentDate` is null, undefined, or an unexpected format returned
from the API, so the subtraction produces NaN.

Also related to BUG-15: the date may be stored/returned in a format that
`new Date()` cannot parse.

---

## Claude Code Prompt

```
Fix BUG-17 in the OrderStack Angular frontend.

PROBLEM: The catering dashboard banner shows "In NaN days" instead of the
correct number of days until the next job. Route: /app/catering.

Find the component that renders the top "next job" banner on the catering
dashboard. Likely:
  src/app/features/catering/catering-dashboard/catering-dashboard.component.ts
  src/app/features/catering/catering-dashboard/catering-dashboard.component.html

FIX:
1. Find the days-until calculation. It will look something like:
     Math.floor((new Date(job.fulfillmentDate) - Date.now()) / 86400000)
   or use a computed signal.

2. Guard against null/undefined/invalid dates:
     function daysUntil(dateStr: string | null | undefined): number | null {
       if (!dateStr) return null;
       const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
       const target = new Date(y, m - 1, d);
       const diff = target.getTime() - new Date().setHours(0,0,0,0);
       return Math.ceil(diff / 86400000);
     }

3. In the template, only show the banner when daysUntil returns a non-null
   non-NaN value. Show "In X days" when X > 0, "Today" when X === 0,
   "X days ago" when X < 0.

4. Also fix the "1 guests" grammar — it should read "1 guest" (singular)
   and "N guests" (plural):
     {{ job.headcount }} {{ job.headcount === 1 ? 'guest' : 'guests' }}

RULES:
- Full file rewrites only (no partial edits)
- Follow all CLAUDE.md directives
- standalone: true, ChangeDetectionStrategy.OnPush
- Run ng build && npx tsc --noEmit after changes — must be zero errors
- Do not add any features not described above
```
