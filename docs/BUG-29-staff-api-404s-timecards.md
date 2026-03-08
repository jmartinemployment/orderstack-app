# BUG-29 — Staff Pages: API 404s for Timecards and PTO Requests

**Date:** 2026-03-08
**Severity:** Low — frontend handles 404 gracefully, but endpoints missing
**Status:** Open
**Affected routes:**
  - `/app/staff` — GET /api/merchant/:id/timecards returns 404
  - `/app/staff/scheduling` — GET /api/merchant/:id/timecard-edits returns 404
  - `/app/staff/scheduling` — GET /api/merchant/:id/labor/pto/requests returns 404

---

## Symptoms

The Staff Directory and Staff Scheduling pages trigger API calls to backend
endpoints that don't exist yet. The frontend handles the 404s gracefully
(no errors shown to user), but the features dependent on this data
(timecards, timecard edits, PTO requests) show empty states.

## Root Cause

Backend endpoints not yet implemented:
- `GET /api/merchant/:id/timecards`
- `GET /api/merchant/:id/timecard-edits`
- `GET /api/merchant/:id/labor/pto/requests`

---

## Claude Code Prompt

```
Fix BUG-29 in the OrderStack backend.

PROBLEM: Three staff-related API endpoints return 404:
1. GET /api/merchant/:id/timecards
2. GET /api/merchant/:id/timecard-edits
3. GET /api/merchant/:id/labor/pto/requests

These are called by the frontend Staff Directory and Staff Scheduling pages.

IMPLEMENT: Add these endpoints to the backend labor routes. Each should
return an empty array [] with 200 status if no data exists, rather than
returning 404.

If the Prisma schema doesn't have tables for these, create stub endpoints
that return empty arrays with a TODO comment noting the full implementation
is pending.

Backend location: /Users/jam/development/Get-Order-Stack-Restaurant-Backend
```
