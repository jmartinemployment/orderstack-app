# BUG-17 — Dashboard Route NG04002: Cannot Match Route 'app/dashboard'

**Date:** 2026-03-08  
**Severity:** Critical — `/app/dashboard` crashes with router error, app redirects to blank page  
**Status:** Open  
**Affected route:** `/app/dashboard`

---

## Symptoms

Navigating to `/app/dashboard` throws:

```
ERROR RuntimeError: NG04002: Cannot match any routes. URL Segment: 'app/dashboard'
```

The app redirects to `/` which renders blank with the Angular error overlay border.

## Notes

- Claude Code reported BUG-16 (`menuItems` TS error in home-dashboard.ts) was "already resolved in FEATURE-03 commit" and deleted BUG-16 doc without applying a code fix
- The dev server is still showing the crash — either the fix was not applied, or a NEW compile error replaced the old one
- The NG04002 error suggests the route `app/dashboard` is not registered in `app.routes.ts`, OR the lazy-loaded module for dashboard failed to compile and Angular silently dropped the route

## Root Cause Candidates

1. `home-dashboard.ts` still has a compile error that prevents the lazy-loaded chunk from building, causing Angular to silently drop the route
2. The route `{ path: 'dashboard', ... }` was accidentally removed from `src/app/app.routes.ts`
3. The lazy-loaded component path is wrong after a file rename

## Fix Instructions

**CLAUDE.md directives apply: full file rewrite for any changed file, `ng build` + `npx tsc --noEmit` gates required.**

### Step 1 — Run build gate first
```bash
cd /Users/jam/development/orderstack-app
npx tsc --noEmit 2>&1 | head -30
```
This will reveal the actual current TypeScript error. Fix that error first.

### Step 2 — Verify route registration
Check `src/app/app.routes.ts` and confirm a route with `path: 'dashboard'` exists under the authenticated shell route.

### Step 3 — Verify home-dashboard component
Check `src/app/features/home/home-dashboard/home-dashboard.ts` for any remaining references to removed `MenuService` properties.

### Test Steps After Fix
1. `npx tsc --noEmit` — zero errors
2. `ng build` — zero errors  
3. Navigate to `/app/dashboard` — must render without crash
4. Red overlay border must be gone
5. Navigate to `/app/proposals`, `/app/invoices` — must render
