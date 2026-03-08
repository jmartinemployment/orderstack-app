# BUG-19 — Catering Calendar Skips April When Navigating Forward from March

**Date:** 2026-03-08
**Severity:** Medium — calendar navigation is broken; month is skipped
**Status:** Open
**Affected route:** `/app/catering` → Calendar tab

---

## Symptoms

1. Navigate to /app/catering → Calendar tab → shows March 2026 (correct)
2. Click the `>` (next month) button
3. Calendar jumps to **May 2026** — April 2026 is skipped entirely

## Root Cause

The month increment logic likely does:
  `this.currentMonth.set(this.currentMonth() + 2)`  ← off by one
or mutates a Date object incorrectly:
  `date.setMonth(date.getMonth() + 1)` on a Date already pointing to month 3
  (April) which then rolls to May due to day-of-month overflow (e.g., March 31
  + 1 month = May 1 because April has no day 31).

The classic JS date mutation bug: `new Date(2026, 2, 31)` setMonth(3) = May 1.

## Also Observed

Jobs do not appear on the calendar on their event date. The Apr 15 job is
invisible even after navigating to April (when April is reachable).

---

## Claude Code Prompt

```
Fix BUG-19 in the OrderStack Angular frontend.

PROBLEM: On /app/catering → Calendar tab, clicking the next-month (>) button
jumps from March 2026 to May 2026, skipping April entirely.

Find the calendar component:
  src/app/features/catering/catering-dashboard/catering-dashboard.component.ts
  (or a dedicated calendar sub-component if it exists)

FIX the month navigation:

  WRONG pattern (causes skip):
    const d = new Date(this.currentDate());
    d.setMonth(d.getMonth() + 1);  // breaks on month-end dates
    this.currentDate.set(d);

  CORRECT pattern (always safe):
    nextMonth(): void {
      const d = this.currentDate();
      // Always use the 1st of the month to avoid day-overflow
      this.currentDate.set(new Date(d.getFullYear(), d.getMonth() + 1, 1));
    }
    prevMonth(): void {
      const d = this.currentDate();
      this.currentDate.set(new Date(d.getFullYear(), d.getMonth() - 1, 1));
    }

ALSO FIX: Jobs are not appearing on their event date in the calendar grid.
For each calendar day cell, check if any job's fulfillmentDate matches that
day. Use local date comparison (not UTC):
  function sameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
  }
Parse the job fulfillmentDate without UTC offset:
  const [y, m, d] = job.fulfillmentDate.split('T')[0].split('-').map(Number);
  const jobDate = new Date(y, m - 1, d);

RULES:
- Full file rewrites only (no partial edits)
- Follow all CLAUDE.md directives
- standalone: true, ChangeDetectionStrategy.OnPush
- Run ng build && npx tsc --noEmit after changes — must be zero errors
- Do not add any features not described above

TEST:
1. Navigate to Calendar tab — shows March 2026
2. Click > once — must show April 2026 (not May)
3. Click > again — must show May 2026
4. Click < — must return to April
5. The Apr 15 job must appear on April 15 in the grid
```
