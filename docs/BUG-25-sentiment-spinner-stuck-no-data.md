# BUG-25 — Sentiment Dashboard Spinner Stuck When No Data

**Date:** 2026-03-08
**Severity:** Medium — page appears broken/infinite loading to users
**Status:** Open
**Affected route:** `/app/sentiment`

---

## Symptoms

Loading spinner shows indefinitely with "Analyzing order instructions..."
message. The page never shows content or an empty state.

## Root Cause

The template condition conflates "loading" with "no data":

```html
@if (isLoading() && summary().totalAnalyzed === 0) {
  <!-- spinner -->
}
```

When loading completes but no orders have `specialInstructions`, the entries
array is empty, `totalAnalyzed === 0`, and `isLoading()` has been set to false.
But the condition `isLoading() && totalAnalyzed === 0` evaluates differently
than expected — the actual bug is the condition should be `isLoading()` alone
for the spinner, with a separate `@else if` for the empty state when
`totalAnalyzed === 0`.

The spinner stays because the template renders the spinner block when it
should show the empty state.

---

## Claude Code Prompt

```
Fix BUG-25 in the OrderStack Angular frontend.

PROBLEM: /app/sentiment shows a loading spinner forever when there are no
orders with special instructions. The template condition conflates "still
loading" with "loaded but empty".

FILE: src/app/features/sentiment/sentiment-dashboard/sentiment-dashboard.html

FIX: Separate the loading state from the empty state:

  WRONG:
    @if (isLoading() && summary().totalAnalyzed === 0) {
      <!-- spinner -->
    } @else {
      <!-- content that includes its own empty state -->
    }

  RIGHT:
    @if (isLoading()) {
      <!-- spinner -->
    } @else if (summary().totalAnalyzed === 0) {
      <!-- empty state: "No orders with special instructions to analyze" -->
    } @else {
      <!-- content -->
    }

RULES:
- Full file rewrites only (no partial edits)
- Follow all CLAUDE.md directives
- Run ng build && npx tsc --noEmit after changes — must be zero errors
- Do not add any features not described above
```
