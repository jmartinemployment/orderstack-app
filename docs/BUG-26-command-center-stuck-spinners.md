# BUG-26 — Command Center Loading Spinners Never Resolve

**Date:** 2026-03-08
**Severity:** Medium — dashboard appears broken, Alerts and Forecast tabs unusable
**Status:** Open
**Affected route:** `/app/command-center`

---

## Symptoms

1. Main page shows a loading spinner that never resolves
2. Clicking "Alerts" tab shows spinner indefinitely
3. Clicking "Forecast" tab shows spinner indefinitely

## Root Cause

The `loadAllData()` method fires 9 API calls via `Promise.all()`. All child
services catch errors internally and never throw, so `Promise.all()` always
resolves. However, one or more HTTP requests may be **hanging indefinitely**
without timing out — Angular HttpClient has no default timeout.

The most likely hanging requests are forecast endpoints that may not respond:
- `GET /analytics/forecast/revenue`
- `GET /analytics/forecast/demand`
- `GET /analytics/forecast/staffing`

Tab-specific loading: `setTab('forecast')` calls `loadForecastData()` which
sets `_isLoadingForecast = true`. If the HTTP request hangs, the flag never
resets to false.

## Also Observed

- `setTab()` does not await `loadForecastData()` — unhandled promise rejection
  if it throws
- Services swallow all exceptions, making failures invisible to the component

---

## Claude Code Prompt

```
Fix BUG-26 in the OrderStack Angular frontend.

PROBLEM: /app/command-center shows stuck loading spinners on the main view,
Alerts tab, and Forecast tab. HTTP requests hang indefinitely because Angular
HttpClient has no default timeout.

FILES:
  src/app/features/analytics/command-center/command-center.ts
  src/app/services/analytics.ts (forecast methods)

FIX:
1. In the command center component, wrap loadAllData() Promise.all with a
   timeout. If any call takes longer than 10 seconds, cancel and show content:

     const timeout = (ms: number) => new Promise((_, reject) =>
       setTimeout(() => reject(new Error('Timeout')), ms));
     await Promise.race([Promise.all([...calls]), timeout(10000)]);

2. In the forecast loading methods (loadRevenueForecast, loadDemandForecast,
   loadStaffingRecommendation), ensure _isLoadingForecast is set to false
   in a finally block even if the HTTP call hangs.

3. Add .pipe(timeout(10000)) to the HTTP observables in analytics.ts for
   forecast methods, or use AbortSignal.

4. Await loadForecastData() in setTab() or add .catch() to prevent
   unhandled promise rejections.

RULES:
- Full file rewrites only (no partial edits)
- Follow all CLAUDE.md directives
- Run ng build && npx tsc --noEmit after changes — must be zero errors
- Do not add any features not described above
```
