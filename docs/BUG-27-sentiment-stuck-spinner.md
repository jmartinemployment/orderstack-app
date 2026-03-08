# BUG-27 — Sentiment Dashboard Stuck Loading Spinner

**Date:** 2026-03-08
**Severity:** Medium — page never finishes loading, user sees infinite spinner
**Status:** Open
**Affected route:** `/app/sentiment`

---

## Symptoms

The Sentiment Dashboard page shows a loading spinner that never resolves.
The page content never appears.

## Root Cause

The Sentiment component likely depends on an API endpoint (sentiment
analysis data) that either returns an error or takes too long, and the
loading state is never set to false on failure.

---

## Claude Code Prompt

```
Fix BUG-27 in the OrderStack Angular frontend.

PROBLEM: The Sentiment Dashboard at /app/sentiment shows a loading spinner
that never resolves. The spinner stays visible indefinitely.

INVESTIGATE:
1. Find the Sentiment component:
   src/app/features/sentiment/

2. Identify which service call sets the loading state and what API
   endpoint it calls.

3. Check if the service method handles errors — if the API returns
   404 or 500, the loading signal must be set to false.

4. Add error handling so the page shows an empty state or error
   message instead of spinning forever.

RULES:
- Full file rewrites only (no partial edits)
- Follow all CLAUDE.md directives
- standalone: true, ChangeDetectionStrategy.OnPush
- Run ng build && npx tsc --noEmit after changes — must be zero errors
- Do not add any features not described above
```
