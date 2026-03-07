# BUG-14 — Catering Packages: Create Fails with 404

**Date:** 2026-03-07  
**Severity:** High — packages cannot be created at all  
**Status:** Open  
**Affected route:** `/app/menu/packages`

---

## Symptoms

1. Navigate to `/app/menu/packages` → click **New Package**
2. Fill in Name = "Test Package", leave defaults
3. Click **Create**
4. Error toast: "Failed to save package. Please try again."
5. Network: `POST /api/merchant/:id/catering/packages` → **404**

## Root Cause

The backend route `POST /api/merchant/:merchantId/catering/packages` does not exist or is not registered. The frontend is calling the correct endpoint pattern but the backend is returning 404.

## Fix Instructions

**CLAUDE.md directives apply. Check both frontend and backend.**

### Backend — check first
In `Get-Order-Stack-Restaurant-Backend`, verify that the catering packages router exists and is mounted:

1. Find the packages route file (likely `src/routes/catering/packages.ts` or similar)
2. Confirm it handles `POST /` for creating a package
3. Confirm the router is mounted in the main catering router or merchant router at the `/catering/packages` path
4. If the route file is missing, create it following existing catering route patterns

### Frontend — verify after backend fix
In `src/app/features/menu-mgmt/catering-packages/` (or similar path), confirm the service call uses:
```
POST /api/merchant/:merchantId/catering/packages
```

### Test Steps After Fix
1. Navigate to `/app/menu/packages`
2. Click **New Package**
3. Enter Name = "Gold Package", Price = 45, Min Headcount = 20
4. Click **Create** → must succeed with no error
5. Package appears in list without page reload
6. Click Edit → update name → confirm list updates live
7. Click Delete → confirm package removed from list
