# BUG-28 — Accessibility: Unlabeled Buttons and Inputs Across Multiple Pages

**Date:** 2026-03-08
**Severity:** Low — accessibility violation, affects screen reader users
**Status:** Open
**Affected routes:**
  - `/app/catering` — 1 input without label/placeholder
  - `/app/catering/calendar` — 2 buttons without text/aria-label
  - `/app/retail/variations` — 1 button without text/aria-label

---

## Symptoms

Several pages have interactive elements (buttons and inputs) that lack
accessible labels. Screen readers cannot announce these elements to users.

### Catering Dashboard (`/app/catering`)
- 1 form input (likely a search or filter field) has no `aria-label`,
  `placeholder`, or associated `<label>` element.

### Catering Calendar (`/app/catering/calendar`)
- 2 buttons (likely navigation arrows for month/week) have no text content,
  `aria-label`, or `title` attribute.

### Retail Variations (`/app/retail/variations`)
- 1 button (likely an icon-only action button) has no text content,
  `aria-label`, or `title` attribute.

## Root Cause

Icon-only buttons and filter inputs were added without accessible labels.

---

## Claude Code Prompt

```
Fix BUG-28 in the OrderStack Angular frontend.

PROBLEM: Several pages have buttons and inputs that lack accessible labels.
This violates WCAG 2.1 and makes the app unusable for screen reader users.

FIX each file:

1. Catering Dashboard (src/app/features/catering/catering-dashboard/):
   Find the input without a label/placeholder and add either:
   - placeholder="Search jobs..." (if it's a search field)
   - aria-label="Filter description" (if it's a filter)

2. Catering Calendar (src/app/features/catering/catering-calendar/):
   Find the 2 icon-only buttons (likely prev/next navigation arrows)
   and add aria-label attributes:
   - aria-label="Previous month" / aria-label="Next month"
   - Or appropriate labels for whatever the buttons do

3. Retail Variations (src/app/features/retail/variations/):
   Find the icon-only button and add an aria-label describing its action.

RULES:
- Full file rewrites only (no partial edits)
- Follow all CLAUDE.md directives
- standalone: true, ChangeDetectionStrategy.OnPush
- Run ng build && npx tsc --noEmit after changes — must be zero errors
- Do not add any features not described above
```
