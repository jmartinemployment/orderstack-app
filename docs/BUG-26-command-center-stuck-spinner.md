# BUG-26 — Command Center Stuck Loading Spinner

**Date:** 2026-03-08
**Severity:** Medium — page never finishes loading, user sees infinite spinner
**Status:** Open
**Affected route:** `/app/command-center`

---

## Symptoms

The Command Center page shows a loading spinner that never resolves. The page
content never appears.

## Root Cause

The Command Center component likely depends on an API endpoint (analytics or
real-time KPIs) that either returns an error or takes too long, and the
loading state is never set to false on failure.

---

## Claude Code Prompt

```
Fix BUG-26 in the OrderStack Angular frontend.

PROBLEM: The Command Center page at /app/command-center shows a loading
spinner that never resolves. The spinner stays visible indefinitely.

INVESTIGATE:
1. Find the Command Center component:
   src/app/features/analytics/command-center/

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
