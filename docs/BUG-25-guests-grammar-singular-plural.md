# BUG-25 — "1 guests" Grammar Error (Missing Singular/Plural Logic)

**Date:** 2026-03-08
**Severity:** Low — cosmetic grammar error visible in multiple locations
**Status:** Open
**Affected routes:**
  - `/app/catering` — next-job banner: "In NaN days · 1 guests"
  - `/app/catering/job/:id` — Overview tab Event Details: "1 guests"

---

## Symptoms

Headcount of 1 displays as "1 guests" instead of "1 guest" in at least two
places in the UI. The plural form is always used regardless of the actual
headcount value.

## Root Cause

No singular/plural guard on the headcount display. Template likely renders:
  `{{ job.headcount }} guests`
without checking if headcount === 1.

---

## Claude Code Prompt

```
Fix BUG-25 in the OrderStack Angular frontend.

PROBLEM: Headcount of 1 displays as "1 guests" in at least two places:
  1. The catering dashboard next-job banner (In NaN days · 1 guests)
  2. The job detail Overview tab Event Details row

FIX: Add singular/plural logic wherever headcount is displayed. Search the
entire codebase for all occurrences of the word "guests" in template (.html)
files and apply the fix to each:

  WRONG:   {{ job.headcount }} guests
  CORRECT: {{ job.headcount }} {{ job.headcount === 1 ? 'guest' : 'guests' }}

Files likely affected (search all .html files for "guests"):
  src/app/features/catering/catering-dashboard/catering-dashboard.component.html
  src/app/features/catering/catering-job-detail/*.html

Search command to find all instances:
  grep -r "guests" src/ --include="*.html" -l

Apply the fix to every file found.

RULES:
- Full file rewrites only (no partial edits)
- Follow all CLAUDE.md directives
- standalone: true, ChangeDetectionStrategy.OnPush
- Run ng build && npx tsc --noEmit after changes — must be zero errors
- Do not add any features not described above
```
