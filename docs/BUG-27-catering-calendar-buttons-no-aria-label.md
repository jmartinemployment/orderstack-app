# BUG-27 — Catering Calendar Prev/Next Buttons Missing aria-label

**Date:** 2026-03-08
**Severity:** Low — accessibility gap, icon-only buttons
**Status:** Open
**Affected route:** `/app/catering/calendar`

---

## Symptoms

The calendar prev/next month buttons contain only `<i class="bi bi-chevron-left">`
and `<i class="bi bi-chevron-right">` icons with no text or aria-label. Screen
readers cannot identify these buttons.

## Root Cause

The buttons in `catering-calendar.component.html` have no `aria-label` attribute:
```html
<button type="button" class="btn btn-sm btn-outline-secondary" (click)="prevMonth()">
  <i class="bi bi-chevron-left"></i>
</button>
```

---

## Claude Code Prompt

```
Fix BUG-27 in the OrderStack Angular frontend.

PROBLEM: /app/catering/calendar has 2 icon-only buttons (prev/next month)
without aria-label attributes. Screen readers cannot identify them.

FILE: src/app/features/catering/catering-calendar/catering-calendar.component.html

FIX: Add aria-label to both navigation buttons:

  <button type="button" class="btn btn-sm btn-outline-secondary"
    aria-label="Previous month" (click)="prevMonth()">
    <i class="bi bi-chevron-left"></i>
  </button>

  <button type="button" class="btn btn-sm btn-outline-secondary"
    aria-label="Next month" (click)="nextMonth()">
    <i class="bi bi-chevron-right"></i>
  </button>

RULES:
- Follow all CLAUDE.md directives
- Run ng build after changes — must be zero errors
```
