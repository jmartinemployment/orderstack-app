# BUG-24 — Activity Log Shows Duplicate "Proposal generated and ready to send" Entries

**Date:** 2026-03-08
**Severity:** Low — cosmetic; duplicate activity log entries clutter the timeline
**Status:** Open
**Affected route:** `/app/catering/job/:id` → Activity tab

---

## Symptoms

The Activity Timeline shows two identical entries back-to-back:
  - "Proposal generated and ready to send" — Mar 8, 2026, 9:52:37 AM · operator
  - "Proposal generated and ready to send" — Mar 8, 2026, 9:52:27 AM · operator

Two entries were created 10 seconds apart for a single "Send Proposal" action.
One entry should have been created, not two.

## Root Cause

The "Send Proposal" action likely triggers two side effects — one when the
proposal record is created and one when the job status is updated — and both
write the same activity log entry. Either the event handler is firing twice
or two separate code paths both log the same message.

---

## Claude Code Prompt

```
Fix BUG-24 in the OrderStack Angular frontend and/or backend.

PROBLEM: Clicking "Send Proposal" on a catering job creates two duplicate
activity log entries: "Proposal generated and ready to send" appearing seconds
apart. Only one entry should be created per proposal send action.

INVESTIGATE:
1. Find where the "Proposal generated and ready to send" activity entry is
   written. Check:
     - The catering job detail component (frontend side effects on send)
     - The backend API handler for POST /api/catering/jobs/:id/proposal
       (likely in the Render backend — check if it writes the log twice)

2. If the frontend is calling the activity log API twice (once on optimistic
   update and once on response), remove the duplicate call — only write the
   activity log from the backend response.

3. If the backend handler is writing the log entry in two places (e.g., once
   in the proposal creation step and once in the job status update step),
   consolidate into a single log write per send action.

FIX: Ensure exactly one activity log entry is written per "Send Proposal"
action. The entry should record the timestamp the proposal was actually sent,
not a pre-send "ready to send" event.

Consider renaming the activity message to "Proposal sent to client" which is
more accurate than "Proposal generated and ready to send".

RULES:
- Full file rewrites only (no partial edits) for any Angular files changed
- Follow all CLAUDE.md directives
- standalone: true, ChangeDetectionStrategy.OnPush
- Run ng build && npx tsc --noEmit after any frontend changes — must be zero errors
- Do not add any features not described above
```
