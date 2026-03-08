# BUG-14 — Red/Pink Border Appears Around Entire App on All Pages

**Date:** 2026-03-08  
**Severity:** Medium — visual defect visible on every page, unprofessional appearance  
**Status:** Open  
**Affected routes:** All routes (`/app/catering`, `/app/catering/job/:id`, `/app/menu`, etc.)

---

## Symptoms

A red/salmon/pink border (approximately 4–8px) appears around the entire viewport on every page of the application. It is visible on the outer edge of the main content area and persists across all routes and page navigations.

## Likely Root Cause

A global CSS rule is applying `border` or `outline` styling to a top-level element — likely `body`, `html`, the app shell component host element (`os-app`, `app-root`), or the main layout wrapper. This may be a debug/development leftover (e.g., `* { border: 1px solid red }` or a component's `:host { border: ... }` that was never removed).

## Fix Instructions

**CLAUDE.md directives apply: full file rewrite for any changed file, `ng build` + `npx tsc --noEmit` gates required.**

### Files to investigate and fix

1. `src/styles.scss` — check for any `border`, `outline`, or `box-shadow` on `html`, `body`, `*`, or `.app-*` selectors
2. `src/app/app.component.scss` — check `:host` selector for border/outline
3. `src/app/layout/` — check the main shell/layout component SCSS for any border on the outermost wrapper div
4. Any component with a full-viewport wrapper that could render behind all content

### Change required

Find and remove the CSS rule causing the red border. Do not leave commented-out debug styles.

### Also verify

After fix, screenshot all main routes to confirm border is gone:
- `/app/dashboard`
- `/app/catering`
- `/app/catering/job/:id`
- `/app/menu`
