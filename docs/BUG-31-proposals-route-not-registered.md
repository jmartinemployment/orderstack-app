# BUG-31 — /app/proposals Route Not Registered (NG04002)

**Date:** 2026-03-08
**Severity:** High — Proposals page completely inaccessible; crashes to blank
**Status:** Open
**Affected route:** `/app/proposals`

---

## Symptoms

Navigating to `/app/proposals` results in a blank page with red overlay.
Console error: `NG04002: Cannot match any routes. URL Segment: 'app/proposals'`

The sidebar shows a "Proposals" nav item with a badge count (1), confirming
the route is expected to exist — but it is not registered in `app.routes.ts`.

---

## Claude Code Prompt

```
Fix BUG-31 in the OrderStack Angular frontend.

PROBLEM: Navigating to /app/proposals crashes with Angular router error:
"NG04002: Cannot match any routes. URL Segment: 'app/proposals'"
The route is not registered. The sidebar shows a Proposals nav link with
badge count, so the route must exist.

FILES TO CHECK:
  src/app/app.routes.ts — add the missing route
  src/app/features/catering/ — look for a proposals list component

FIX:
1. Open src/app/app.routes.ts and find the /app children routes block.
   Add a route for 'proposals':
     {
       path: 'proposals',
       loadComponent: () => import('./features/catering/catering-proposals/catering-proposals.component')
         .then(m => m.CateringProposalsComponent)
     }

2. If CateringProposalsComponent does not exist, create a minimal one at:
     src/app/features/catering/catering-proposals/
       catering-proposals.component.ts
       catering-proposals.component.html
       catering-proposals.component.scss

   The component should:
   - Display page title "Proposals"
   - Load and list all proposals for the merchant from the API
     (GET /api/catering/proposals or similar)
   - Show: proposal number, client name, job title, amount, status, date sent
   - Link each row to the related job detail page
   - Show empty state when no proposals exist

3. Register the component as standalone: true, ChangeDetectionStrategy.OnPush,
   with selector os-catering-proposals.

RULES:
- Full file rewrites only (no partial edits)
- Follow all CLAUDE.md directives
- os- selector prefix, standalone: true, ChangeDetectionStrategy.OnPush
- @if/@for control flow syntax only (no *ngIf/*ngFor)
- Run ng build && npx tsc --noEmit after changes — must be zero errors
- Do not add any features not described above

TEST: Navigate to /app/proposals — must load without error. Page title
"Proposals" must be visible.
```
