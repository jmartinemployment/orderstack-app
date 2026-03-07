# BUG-05: Settings General Tab -- 14 Inputs Missing Accessible Labels

## Summary

The General settings tab has 14 form inputs that lack proper `id`+`for` label
associations, `aria-label` attributes, or `placeholder` text. Screen readers
cannot identify these fields. The business hours time inputs are the main
offenders (7 days x 2 inputs = 14 inputs with no accessible name).

## Severity

Medium -- accessibility violation (WCAG 2.1 Level A, criterion 1.3.1)

## Steps to Reproduce

1. Log in as owner@taipa.com / owner123
2. Navigate to Settings > General tab
3. Inspect the Business Hours time inputs with a screen reader or DevTools

## Expected

Every input has a programmatic label (via `id`+`for`, `aria-label`, or
wrapping `<label>`).

## Actual

The 14 `<input type="time">` elements inside the Business Hours grid have no
`id`, no `aria-label`, and no associated `<label for>`. They only have
`[ngModel]` bindings.

## Root Cause

File: `src/app/features/settings/general-settings/general-settings.html`
Lines 125-135

The two time inputs per day row (open/close) are rendered in a `@for` loop
without `id` or `aria-label`:

```html
<input type="time" class="form-control form-control-sm"
  [ngModel]="hours?.open ?? '09:00'"
  (ngModelChange)="updateDayOpen(day, $event)" />
```

## Fix

Add `aria-label` to each time input using the day name and open/close context.
Example:

```html
<input type="time" class="form-control form-control-sm"
  [attr.aria-label]="dayLabels[day] + ' open time'"
  [ngModel]="hours?.open ?? '09:00'"
  (ngModelChange)="updateDayOpen(day, $event)" />
```

```html
<input type="time" class="form-control form-control-sm"
  [attr.aria-label]="dayLabels[day] + ' close time'"
  [ngModel]="hours?.close ?? '22:00'"
  (ngModelChange)="updateDayClose(day, $event)" />
```

## Files to Change

- `src/app/features/settings/general-settings/general-settings.html` (lines 125-135)

## Verification

Run the Playwright settings audit. The General tab should report 0 inputs
without label/placeholder.
