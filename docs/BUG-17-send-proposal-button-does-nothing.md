# BUG-17 — Job Detail: "Send Proposal" Button Does Nothing (No Request, No Feedback)

**Date:** 2026-03-07  
**Severity:** Critical — proposals cannot be sent to clients  
**Status:** Open  
**Affected route:** `/app/catering/job/:id` (header action bar)

---

## Symptoms

1. Navigate to any catering job detail page
2. Click **Send Proposal** in the header action bar
3. Nothing happens — no modal opens, no toast appears, no network request is sent
4. Page remains on Overview tab unchanged

## Observed Behavior

- The "Send Proposal" button renders but appears visually faded/disabled
- Clicking it navigates back to the Overview tab (if on another tab) but takes no further action
- No POST/PUT to `/api/.../proposals` or similar endpoint is triggered

## Root Cause (Likely)

One of:
1. The `(click)` handler calls a method that is guarded by a condition (e.g., `if (!this.job()?.packages?.length)`) and the job has no packages — causing silent no-op
2. The button has `[disabled]="true"` or a binding that evaluates to disabled
3. The handler method exists but is empty or has an early return

## Fix Instructions

**CLAUDE.md directives apply: full file rewrite, `ng build` + `npx tsc --noEmit` gates required.**

### Files to fix
- `src/app/features/catering/catering-job-detail/catering-job-detail.component.ts`
- `src/app/features/catering/catering-job-detail/catering-job-detail.component.html`

### Changes required

1. In the HTML, check the Send Proposal button binding — remove or fix any `[disabled]` condition that blocks a job with $0 total or no packages
2. In the TS `sendProposal()` method:
   - If guarded by package count, show a user-facing message: `"Add at least one package before sending a proposal"` via the error/toast system
   - Otherwise, open a confirmation modal asking for client email and confirm
   - POST to the backend proposal endpoint and show a success toast on completion
3. Add a visible "disabled" reason tooltip if the button legitimately requires packages first

## Test Steps After Fix

1. Navigate to `/app/catering/job/:id`
2. Click **Send Proposal**
3. If job has no packages: confirm a clear user message explains why (not a silent no-op)
4. After adding a package: click **Send Proposal** → confirm email modal or confirmation dialog opens
5. Confirm POST fires to the proposals endpoint
6. Confirm "Proposal Sent" status badge updates in header
