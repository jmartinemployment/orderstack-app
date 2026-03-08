# BUG-16 — TypeScript Compile Error: 'menuItems' Does Not Exist on MenuService

**Date:** 2026-03-08
**Severity:** Critical — TS compile error crashes Dashboard, Proposals, Invoices
  and causes Angular error overlay (red border) on all pages
**Status:** Open
**Affected file:** `src/app/features/home/home-dashboard/home-dashboard.ts:101`

---

## Symptoms

Angular dev overlay on every page:
```
TS2339: Property 'menuItems' does not exist on type 'MenuService'.
src/app/features/home/home-dashboard/home-dashboard.ts:101:56
```
Navigating to /app/dashboard, /app/proposals, /app/invoices renders blank page.
Red/pink border visible on all pages is the Angular error overlay from this error.

## Root Cause

The BUG-12 fix rewrote `src/app/services/menu.ts`. The public signal that
`home-dashboard.ts` references (`menuItems`) was renamed or removed in that
rewrite. `home-dashboard.ts` was not updated to match the new API.

---

## Claude Code Prompt

```
Fix BUG-16 in the OrderStack Angular frontend. This is CRITICAL — fix first.

PROBLEM: src/app/features/home/home-dashboard/home-dashboard.ts references
this.menuService.menuItems at line ~101 but that property no longer exists on
MenuService after a recent rewrite. This causes a TS2339 compile error that
crashes the entire app with a red error overlay on every page.

FIX:
1. Open src/app/services/menu.ts and identify the correct public signal or
   method name that exposes the list of menu items. It will be a Signal or
   computed value — look for something like:
     readonly items = ...
     readonly menuItems = ...  (if it exists under a different shape)
     categories(), items(), allItems() etc.

2. Open src/app/features/home/home-dashboard/home-dashboard.ts and find the
   reference to menuService.menuItems (around line 101). Update it to use the
   correct property name found in step 1.

3. If the home dashboard uses menuItems in the template (.html file), update
   the template binding to match as well.

4. Do NOT change the MenuService public API — only fix home-dashboard.ts
   (and its .html) to use whatever MenuService already exposes.

RULES:
- Full file rewrites only (no partial edits)
- Follow all CLAUDE.md directives  
- standalone: true, ChangeDetectionStrategy.OnPush
- Run ng build && npx tsc --noEmit after fix — must produce ZERO errors
- This single fix must eliminate the red error overlay from all pages
- Do not add any features not described above

VERIFY: After fix, navigate to /app/dashboard — page must load without error
overlay. Navigate to /app/proposals and /app/invoices — must not be blank.
```
