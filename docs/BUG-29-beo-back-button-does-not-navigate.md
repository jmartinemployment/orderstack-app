# BUG-29 — BEO "Back" Button Does Not Navigate Back to Job Detail

**Date:** 2026-03-08
**Severity:** Low — UX dead-end; user must use browser back button
**Status:** Open
**Affected route:** `/app/catering/job/:id/beo`

---

## Symptoms

On the BEO page (`/app/catering/job/:id/beo`), there is a `← Back` button in
the top-left. Clicking it does nothing — the page does not navigate back to the
job detail page. The user is stuck on the BEO view and must use the browser's
native back button.

---

## Claude Code Prompt

```
Fix BUG-29 in the OrderStack Angular frontend.

PROBLEM: On /app/catering/job/:id/beo, the "← Back" button does not navigate
back to the job detail page. Clicking it has no effect.

Find the BEO component:
  src/app/features/catering/catering-beo/catering-beo.component.ts
  src/app/features/catering/catering-beo/catering-beo.component.html

FIX:
1. Find the Back button in the template. It likely has a (click) handler that
   is either missing, bound to a non-existent method, or calls location.back()
   which fails in some navigation contexts.

2. Replace with a router navigation to the parent job detail route:
   In the component TS:
     constructor(private router: Router, private route: ActivatedRoute) {}

     goBack(): void {
       const jobId = this.route.snapshot.paramMap.get('id');
       this.router.navigate(['/app/catering/job', jobId]);
     }

   In the template:
     <button (click)="goBack()">← Back</button>

3. Alternatively use a routerLink:
     <a [routerLink]="['/app/catering/job', jobId()]">← Back</a>

RULES:
- Full file rewrites only (no partial edits)
- Follow all CLAUDE.md directives
- standalone: true, ChangeDetectionStrategy.OnPush
- Run ng build && npx tsc --noEmit after changes — must be zero errors
- Do not add any features not described above

TEST: Navigate to BEO page, click ← Back, confirm landing on
/app/catering/job/:id with the Overview tab active.
```
