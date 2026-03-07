# BUG-09: Settings Suppliers Tab -- 2 Inputs Missing Labels

## Summary

The Suppliers settings tab has 2 `<select>` elements (Sysco Mode and GFS Mode
dropdowns) that lack `id`+`for` label associations, `aria-label`, or
`placeholder`. Screen readers cannot identify these dropdowns.

## Severity

Low -- accessibility violation (WCAG 2.1 Level A, criterion 1.3.1)

## Steps to Reproduce

1. Log in as owner@taipa.com / owner123
2. Navigate to Settings > Suppliers tab
3. Inspect the Mode `<select>` elements in the Sysco and GFS credential cards

## Expected

Every select has a programmatic label.

## Actual

Both Mode select elements have `<label class="form-label">Mode</label>` above
them, but the labels have no `for` attribute and the selects have no `id` or
`aria-label`. The text inputs (Client ID, Client Secret, Customer ID) all have
`[placeholder]` attributes and pass the check. Only the 2 selects fail.

## Root Cause

File: `src/app/features/settings/supplier-settings/supplier-settings.html`

Line 78 -- Sysco Mode select:
```html
<label class="form-label">Mode</label>
<select class="form-select form-select-sm" [value]="syscoMode()" (change)="onSyscoModeChange($event)">
  <option value="test">Test / Sandbox</option>
  <option value="production">Production</option>
</select>
```

Line 172 -- GFS Mode select:
```html
<label class="form-label">Mode</label>
<select class="form-select form-select-sm" [value]="gfsMode()" (change)="onGfsModeChange($event)">
  <option value="test">Test / Sandbox</option>
  <option value="production">Production</option>
</select>
```

No `id` on either select, no `for` on either label, no `aria-label`.

## Fix

Add `id` and `for` attributes:

```html
<label for="syscoMode" class="form-label">Mode</label>
<select class="form-select form-select-sm"
  id="syscoMode"
  [value]="syscoMode()" (change)="onSyscoModeChange($event)">
  <option value="test">Test / Sandbox</option>
  <option value="production">Production</option>
</select>
```

```html
<label for="gfsMode" class="form-label">Mode</label>
<select class="form-select form-select-sm"
  id="gfsMode"
  [value]="gfsMode()" (change)="onGfsModeChange($event)">
  <option value="test">Test / Sandbox</option>
  <option value="production">Production</option>
</select>
```

## Files to Change

- `src/app/features/settings/supplier-settings/supplier-settings.html` (lines 77-81, 171-175)

## Verification

Run the Playwright settings audit. Suppliers tab should report 0 inputs
without label/placeholder.
