# BUG-32 — Staff Directory & Scheduling API 404s

**Date:** 2026-03-08
**Severity:** Low — backend endpoints missing, frontend handles gracefully
**Status:** Open (backend)
**Affected routes:** `/app/staff`, `/app/staff/scheduling`

---

## Symptoms

- Staff Directory triggers `404 GET /api/merchant/{id}/timecards`
- Staff Scheduling "Edits" tab triggers:
  - `404 GET /api/merchant/{id}/timecard-edits`
  - `404 GET /api/merchant/{id}/labor/...` (multiple labor endpoints)

## Root Cause

These backend endpoints are not implemented. The frontend services handle
404 gracefully (return empty arrays), so no UI crash occurs, but the data
is missing.

## Note

This is a **backend** issue. The frontend already handles these 404s
gracefully per the Session 3 404-tolerance fixes. The backend needs these
endpoints implemented in the Express API.

---

## Claude Code Prompt

```
Fix BUG-32 in the OrderStack backend.

PROBLEM: Staff-related API endpoints return 404:
  - GET /api/merchant/:id/timecards
  - GET /api/merchant/:id/timecard-edits
  - GET /api/merchant/:id/labor/* (payroll, commissions, compliance)

These endpoints need to be implemented in the Express backend at:
  /Users/jam/development/Get-Order-Stack-Restaurant-Backend/

Add stub endpoints that return empty arrays [] until the full labor
module is implemented. This prevents unnecessary 404 noise in the
browser console.

FILES:
  src/routes/merchant.routes.ts (or wherever merchant routes are defined)

RULES:
- Follow all CLAUDE.md directives
- Return proper JSON responses with empty data
- Do not add frontend changes
```
