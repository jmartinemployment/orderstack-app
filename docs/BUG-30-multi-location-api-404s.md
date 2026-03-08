# BUG-30 — Multi-Location Dashboard: 3 API 404s

**Date:** 2026-03-08
**Severity:** Low — frontend handles 404 gracefully, but features show empty
**Status:** Open
**Affected route:** `/app/multi-location`

---

## Symptoms

The Multi-Location Dashboard triggers three API calls that return 404.
The frontend handles the errors gracefully but the dashboard shows empty
data for location groups, menu sync history, and cross-location reports.

## Missing Endpoints

1. `GET /api/restaurant-groups/:groupId/location-groups` — 404
2. `GET /api/restaurant-groups/:groupId/sync-menu/history` — 404
3. `GET /api/restaurant-groups/:groupId/cross-location-report` — 404

## Root Cause

Backend endpoints not yet implemented for multi-location features.

---

## Claude Code Prompt

```
Fix BUG-30 in the OrderStack backend.

PROBLEM: Three multi-location API endpoints return 404:
1. GET /api/restaurant-groups/:groupId/location-groups
2. GET /api/restaurant-groups/:groupId/sync-menu/history
3. GET /api/restaurant-groups/:groupId/cross-location-report

IMPLEMENT: Add these endpoints to the backend. Each should return empty
data with 200 status if no data exists (empty array or empty object),
rather than returning 404.

Backend location: /Users/jam/development/Get-Order-Stack-Restaurant-Backend
```
