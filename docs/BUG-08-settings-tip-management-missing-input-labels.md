# BUG-08: Settings Tip Management Tab -- 2 Inputs Missing Labels

## Summary

The Tip Management settings tab has 2 date inputs (Start and End in the
Reports tab) that lack `id`+`for` label associations, `aria-label`, or
`placeholder`. Screen readers cannot identify these fields.

## Severity

Low -- accessibility violation (WCAG 2.1 Level A, criterion 1.3.1)

## Steps to Reproduce

1. Log in as owner@taipa.com / owner123
2. Navigate to Settings > Tip Management tab
3. The Reports sub-tab is active by default
4. Inspect the Start and End `<input type="date">` elements

## Expected

Every input has a programmatic label.

## Actual

The 2 date inputs in the Date Range section have `<label class="form-label">`
elements above them, but the labels have no `for` attribute and the inputs
have no `id` or `aria-label`. Screen readers cannot associate the label text
with the input.

## Root Cause

File: `src/app/features/tip-mgmt/tip-management/tip-management.html`
Lines 25-32

```html
<div>
  <label class="form-label">Start</label>
  <input type="date" class="form-control form-control-sm"
    [value]="startDateStr()" (change)="onStartDateChange($event)">
</div>
<div>
  <label class="form-label">End</label>
  <input type="date" class="form-control form-control-sm"
    [value]="endDateStr()" (change)="onEndDateChange($event)">
</div>
```

No `id` on either input, no `for` on either label, no `aria-label`.

## Fix

Add `id` and `for` attributes to associate labels with inputs:

```html
<div>
  <label for="tipReportStartDate" class="form-label">Start</label>
  <input type="date" class="form-control form-control-sm"
    id="tipReportStartDate"
    [value]="startDateStr()" (change)="onStartDateChange($event)">
</div>
<div>
  <label for="tipReportEndDate" class="form-label">End</label>
  <input type="date" class="form-control form-control-sm"
    id="tipReportEndDate"
    [value]="endDateStr()" (change)="onEndDateChange($event)">
</div>
```

## Files to Change

- `src/app/features/tip-mgmt/tip-management/tip-management.html` (lines 25-32)

## Verification

Run the Playwright settings audit. Tip Management tab should report 0
inputs without label/placeholder.
