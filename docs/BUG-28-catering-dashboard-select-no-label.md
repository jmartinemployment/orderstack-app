# BUG-28 — Catering Dashboard Status Filter Select Missing Label

**Date:** 2026-03-08
**Severity:** Low — accessibility gap
**Status:** Open
**Affected route:** `/app/catering`

---

## Symptoms

The status filter `<select>` on the catering dashboard has no associated
`<label>`, `aria-label`, or `id`+`for` pairing. Screen readers cannot
identify the purpose of this dropdown.

## Root Cause

In `catering-dashboard.component.html` the select element has no label:
```html
<select class="form-select" style="width: auto;"
  [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event)">
```

---

## Claude Code Prompt

```
Fix BUG-28 in the OrderStack Angular frontend.

PROBLEM: /app/catering status filter <select> has no label for accessibility.

FILE: src/app/features/catering/catering-dashboard/catering-dashboard.component.html

FIX: Add aria-label to the status filter select:

  <select class="form-select" style="width: auto;"
    aria-label="Filter by status"
    [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event)">

RULES:
- Follow all CLAUDE.md directives
- Run ng build after changes — must be zero errors
```
