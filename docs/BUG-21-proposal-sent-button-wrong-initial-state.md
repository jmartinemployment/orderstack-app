# BUG-21 — "Proposal Sent" Button Active on New Job Before Proposal is Sent

**Date:** 2026-03-08
**Severity:** Medium — misleading UI; button state doesn't match actual status
**Status:** Open
**Affected route:** `/app/catering/job/:id`

---

## Symptoms

1. Create a brand new job (status: Inquiry)
2. Navigate to Job Detail page
3. The top-right button area shows **"Proposal Sent"** as a filled/active button
   BEFORE any proposal has been sent
4. The correct initial state for a new Inquiry job should show only
   "Send Proposal" as the primary action, with "Proposal Sent" hidden or disabled

## Root Cause

The button state is likely driven by job status rather than a dedicated
`proposalSentAt` timestamp field. A new job with status "Inquiry" is
incorrectly being mapped to a "Proposal Sent" visual state, OR the button
rendering condition is inverted.

---

## Claude Code Prompt

```
Fix BUG-21 in the OrderStack Angular frontend.

PROBLEM: On /app/catering/job/:id, a brand new job with status "Inquiry" shows
"Proposal Sent" as an active button in the header before any proposal has been
sent. The button state must reflect whether a proposal has actually been sent.

Find the job detail component header button logic:
  src/app/features/catering/catering-job-detail/ (look for the main component)

FIX:
1. The "Proposal Sent" indicator button should only appear/be active when
   job.proposalSentAt is non-null OR job.status is 'proposal_sent' or higher.

2. For a job with status 'inquiry' and no proposalSentAt, the header should
   show ONLY "Send Proposal" as the primary CTA. "Proposal Sent" should be
   hidden or shown as a disabled/greyed badge.

3. Correct button state progression:
     Inquiry, no proposal → show "Send Proposal" button (primary blue)
     After proposal sent  → show "Proposal Sent" badge (grey/inactive) + "Resend Proposal"
     After contract signed → show "Contract Signed" badge

4. Do not show "Contract Signed" button immediately after sending a proposal —
   that button/state should only appear after the contract step is completed.

RULES:
- Full file rewrites only (no partial edits)
- Follow all CLAUDE.md directives
- standalone: true, ChangeDetectionStrategy.OnPush
- Run ng build && npx tsc --noEmit after changes — must be zero errors
- Do not add any features not described above
```
