# BUG-15 — Catering Job Fulfillment Date Saves One Day Early (Off-by-One)

**Date:** 2026-03-08  
**Severity:** High — incorrect date stored and displayed for every catering job  
**Status:** Open  
**Affected route:** `/app/catering` (New Job form) → `/app/catering/job/:id` (Overview tab)

---

## Symptoms

1. User enters **April 15, 2026** in the Fulfillment Date field in the New Catering Job form
2. Job is created successfully
3. Job Detail page displays **"Event Apr 14, 2026"** — one day before the entered date
4. The job card on the dashboard also shows the wrong date

## Root Cause

Classic UTC timezone off-by-one. The date input (`<input type="date">`) returns a string like `"2026-04-15"`. When this is passed to `new Date("2026-04-15")`, JavaScript parses it as **UTC midnight**, which in US Eastern time (UTC-4 to UTC-5) renders as the previous calendar day (April 14 at 8:00 PM ET).

## Fix Instructions

**CLAUDE.md directives apply: full file rewrite for any changed file, `ng build` + `npx tsc --noEmit` gates required.**

### Files to investigate

- The catering job create/edit form component that reads the date input value and constructs the payload
- The job detail component that renders the event date
- Any shared date utility functions

### Change required

When reading a `YYYY-MM-DD` string from a date input, parse it using local time, not UTC:

```typescript
// WRONG — parses as UTC, displays as day-before in local timezones west of UTC
const date = new Date(dateString); 

// CORRECT — parse as local midnight
const [year, month, day] = dateString.split('-').map(Number);
const date = new Date(year, month - 1, day); // month is 0-indexed
```

Alternatively, when formatting dates for display, force local date parts:

```typescript
// Use date-fns parseISO + formatISO, or Angular DatePipe with 'UTC' timezone if storing as UTC
// The simplest fix: append T00:00:00 to force local parsing
const date = new Date(dateString + 'T00:00:00');
```

Apply the fix consistently everywhere dates are constructed from form inputs and wherever event dates are displayed.

### Test Steps After Fix

1. Create a new job with Fulfillment Date = **April 15, 2026**
2. Verify job detail shows **"Event Apr 15, 2026"**
3. Repeat with dates near month/year boundaries (e.g., Dec 31, Jan 1)
