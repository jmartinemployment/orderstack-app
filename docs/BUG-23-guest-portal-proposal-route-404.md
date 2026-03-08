# BUG-23 — Guest Portal Proposal Route Returns 404 / Error Page

**Date:** 2026-03-08
**Severity:** High — clients cannot view proposals; the proposal link is broken
**Status:** Open
**Affected route:** `/catering/proposal/:id`

---

## Symptoms

After sending a proposal, clicking the proposal URL:
  `http://localhost:4200/catering/proposal/[uuid]`
results in a browser error page (404 / route not found). The Angular router
has no route registered for `/catering/proposal/:id`.

## Root Cause

The guest-facing proposal view route is either:
1. Not registered in `app.routes.ts`, OR
2. Registered under a different path than `/catering/proposal/:id`, OR
3. The component exists but is not lazy-loaded correctly

---

## Claude Code Prompt

```
Fix BUG-23 in the OrderStack Angular frontend.

PROBLEM: The guest portal proposal URL /catering/proposal/:id returns a 404
error page. Clients who receive a proposal link cannot view it.

FILES TO CHECK:
  src/app/app.routes.ts — verify the route exists
  src/app/features/catering/ — look for a proposal-view or guest-portal component

FIX:
1. Open src/app/app.routes.ts and verify there is a route for:
     { path: 'catering/proposal/:id', component: CateringProposalViewComponent }
   (or loadComponent lazy variant). If missing, add it.

2. If a CateringProposalViewComponent does not exist, create a minimal one at:
     src/app/features/catering/catering-proposal-view/
       catering-proposal-view.component.ts
       catering-proposal-view.component.html
       catering-proposal-view.component.scss

   The component should:
   - Read the proposal ID from ActivatedRoute params
   - Call the backend GET /api/catering/proposal/:id (public endpoint, no auth)
   - Display: job title, event date/time, client name, headcount, location,
     packages/items list, financial summary (subtotal, fees, total)
   - Show a professional read-only layout suitable for client viewing
   - Include an "Accept Proposal" button that calls the accept endpoint

3. The route must be OUTSIDE the authenticated layout shell (no auth guard)
   so clients can view without logging in.

4. Register the route at the top level in app.routes.ts, not nested under /app/.

RULES:
- Full file rewrites only (no partial edits)  
- Follow all CLAUDE.md directives
- os- selector prefix, standalone: true, ChangeDetectionStrategy.OnPush
- @if/@for control flow syntax only (no *ngIf/*ngFor)
- Run ng build && npx tsc --noEmit after changes — must be zero errors
- Do not add any features not described above

TEST: Navigate to /catering/proposal/[any-uuid] — must render a page,
not a 404 error.
```
