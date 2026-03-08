# BUG-30 — BEO Displays Time in 24-Hour Format Instead of 12-Hour AM/PM

**Date:** 2026-03-08
**Severity:** Low — cosmetic; times show as "18:00" / "22:00" instead of "6:00 PM" / "10:00 PM"
**Status:** Open
**Affected route:** `/app/catering/job/:id/beo`

---

## Symptoms

The BEO document displays:
- Start Time: **18:00**
- End Time: **22:00**

The rest of the app (job detail Overview tab) shows times in 12-hour format:
"6:00 PM – 10:00 PM". The BEO is a client-facing printed document and must
use the same human-readable 12-hour format.

---

## Claude Code Prompt

```
Fix BUG-30 in the OrderStack Angular frontend.

PROBLEM: The BEO document at /app/catering/job/:id/beo displays event start
and end times in 24-hour format (e.g., "18:00", "22:00") instead of 12-hour
AM/PM format (e.g., "6:00 PM", "10:00 PM").

Find the BEO component template:
  src/app/features/catering/catering-beo/catering-beo.component.html
  src/app/features/catering/catering-beo/catering-beo.component.ts

FIX:
1. Find where startTime and endTime are displayed in the BEO template.
   They are likely rendered as raw strings (e.g., job.startTime which is
   stored as "18:00").

2. Convert to 12-hour format. Add a helper method to the component:

     formatTime(time: string | null | undefined): string {
       if (!time) return '--';
       const [hourStr, minuteStr] = time.split(':');
       const hour = parseInt(hourStr, 10);
       const minute = minuteStr || '00';
       const period = hour >= 12 ? 'PM' : 'AM';
       const hour12 = hour % 12 || 12;
       return `${hour12}:${minute} ${period}`;
     }

3. Use this method in the template:
     {{ formatTime(job()?.startTime) }}
     {{ formatTime(job()?.endTime) }}

   Or use Angular's built-in DatePipe with a time format if the value is
   a full ISO datetime string:
     {{ job()?.startTime | date:'h:mm a' }}

RULES:
- Full file rewrites only (no partial edits)
- Follow all CLAUDE.md directives
- standalone: true, ChangeDetectionStrategy.OnPush
- Run ng build && npx tsc --noEmit after changes — must be zero errors
- Do not add any features not described above

TEST: BEO page must show "6:00 PM" not "18:00", "10:00 PM" not "22:00".
```
