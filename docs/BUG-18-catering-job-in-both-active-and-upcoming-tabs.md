# BUG-18 — Catering Dashboard: Job Appears in Both "Active" and "Upcoming" Tabs

**Date:** 2026-03-08
**Severity:** Medium — duplicate job display confuses the pipeline view
**Status:** Open
**Affected route:** `/app/catering` (Active tab and Upcoming tab)

---

## Symptoms

A job with status "Inquiry" and a future event date (Apr 15, 2026) appears in
BOTH the "Active" tab and the "Upcoming" tab simultaneously. It should appear
in only one.

## Expected Behavior

Tab filter logic should be mutually exclusive:
- **Active** — jobs in active workflow statuses regardless of date
  (Inquiry, Confirmed, In Progress, etc.) OR all non-completed jobs
- **Upcoming** — jobs whose event date is in the future
  (subset of Active, OR a separate future-date filter)

The current implementation puts the same job in both. Either the tab
definitions overlap or the filter predicate is wrong.

---

## Claude Code Prompt

```
Fix BUG-18 in the OrderStack Angular frontend.

PROBLEM: On /app/catering, a job with status "Inquiry" and a future date
appears in both the "Active" tab and the "Upcoming" tab. Tabs should be
mutually exclusive.

Find the catering dashboard component:
  src/app/features/catering/catering-dashboard/catering-dashboard.component.ts

FIX — define clear, non-overlapping filter logic for each tab:

  Active:   jobs where status is NOT 'completed' AND NOT 'cancelled'
            AND event date is NOT in the future (i.e., today or past)
            OR: jobs currently "in progress" regardless of date

  Upcoming: jobs where status is NOT 'completed' AND NOT 'cancelled'
            AND event date IS in the future (fulfillmentDate > today)

  Past:     jobs where status is 'completed' OR event date is in the past

  If the product intent is that "Active" means all open jobs (past + future),
  then "Upcoming" should simply be a date-filtered sub-view of the pipeline
  and the tabs should be labelled accordingly. In that case make "Upcoming"
  show future-dated open jobs, and "Active" show all open jobs (no date filter).
  Either way — a single job must NOT appear in both tabs.

Implement as computed signals, one per tab:
  activejobs = computed(() => this.jobs().filter(j => ...));
  upcomingJobs = computed(() => this.jobs().filter(j => ...));
  pastJobs = computed(() => this.jobs().filter(j => ...));

RULES:
- Full file rewrites only (no partial edits)
- Follow all CLAUDE.md directives
- standalone: true, ChangeDetectionStrategy.OnPush
- Run ng build && npx tsc --noEmit after changes — must be zero errors
- Do not add any features not described above
```
