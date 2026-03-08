# BUG-33 — Multi Location API 404s on Restaurant Groups

**Date:** 2026-03-08
**Severity:** Low — backend endpoints missing, frontend handles gracefully
**Status:** Open (backend)
**Affected route:** `/app/multi-location`

---

## Symptoms

Multi Location page triggers:
  - `404 GET /api/restaurant-groups/{userId}/location-groups`
  - Additional restaurant-groups endpoints returning 404

## Root Cause

The multi-location restaurant groups endpoints are not implemented in the
backend. The frontend handles 404 gracefully.

## Note

This is a **backend** issue. Frontend already handles these 404s gracefully.

---

## Claude Code Prompt

```
Fix BUG-33 in the OrderStack backend.

PROBLEM: Multi-location API endpoints return 404:
  - GET /api/restaurant-groups/:userId/location-groups

This endpoint needs to be implemented in the Express backend at:
  /Users/jam/development/Get-Order-Stack-Restaurant-Backend/

Add a stub endpoint that returns an empty array [] until the full
multi-location module is implemented.

FILES:
  src/routes/ (add restaurant-groups routes)

RULES:
- Follow all CLAUDE.md directives
- Return proper JSON responses with empty data
- Do not add frontend changes
```
