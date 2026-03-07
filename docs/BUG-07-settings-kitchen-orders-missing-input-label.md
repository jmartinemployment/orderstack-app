# BUG-07: Settings Kitchen & Orders Tab -- 1 Input Missing Label

## Summary

The Kitchen & Orders settings tab has one select element (Course Pacing Mode
dropdown) that lacks a proper `id`+`for` label association, `aria-label`, or
`placeholder`.

## Severity

Low -- accessibility violation (WCAG 2.1 Level A, criterion 1.3.1)

## Steps to Reproduce

1. Log in as owner@taipa.com / owner123
2. Navigate to Settings > Kitchen & Orders tab
3. Inspect the Course Pacing Mode `<select>` element

## Expected

The select has a programmatic label.

## Actual

The Course Pacing Mode `<select>` at line 55 has no `id` and its preceding
`<div class="panel-title">` is not a `<label>`. Screen readers cannot
identify the purpose of this dropdown.

## Root Cause

File: `src/app/features/settings/kitchen-orders/kitchen-orders.html`
Lines 55-62

```html
<select class="form-select"
  [ngModel]="coursePacingMode()"
  (ngModelChange)="onCoursePacingModeChange($event)"
  [disabled]="!isManagerOrAbove()">
```

No `id` or `aria-label`.

## Fix

Add `id` and a proper `<label>`:

```html
<label for="coursePacingMode" class="form-label">Course Pacing Mode</label>
<select class="form-select"
  id="coursePacingMode"
  [ngModel]="coursePacingMode()"
  (ngModelChange)="onCoursePacingModeChange($event)"
  [disabled]="!isManagerOrAbove()">
```

Or replace the `<div class="panel-title">` with a `<label>` that has
`for="coursePacingMode"`.

## Files to Change

- `src/app/features/settings/kitchen-orders/kitchen-orders.html` (line 55)

## Verification

Run the Playwright settings audit. Kitchen & Orders tab should report 0
inputs without label/placeholder.
