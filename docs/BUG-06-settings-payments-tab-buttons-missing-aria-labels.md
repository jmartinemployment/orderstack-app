# BUG-06: Settings Payments Tab -- 5 Buttons Missing aria-label

## Summary

The Payments settings tab has 5 icon-only buttons in the Scan to Pay section
that lack text content and aria-label attributes. Screen readers announce these
as unlabeled buttons.

## Severity

Medium -- accessibility violation (WCAG 2.1 Level A, criterion 4.1.2)

## Steps to Reproduce

1. Log in as owner@taipa.com / owner123
2. Navigate to Settings > Payments tab
3. Scroll to Scan to Pay section (enable the toggle if not already on)
4. Inspect the tip percentage chip remove buttons and the add tip button

## Expected

Every button has visible text or an `aria-label` attribute.

## Actual

5 buttons are icon-only with no accessible name:
- Each tip percentage chip has a remove button with only `<i class="bi bi-x">`
  (one per default tip: 15%, 18%, 20%, 25% = 4 buttons)
- The "add tip percentage" button has only `<i class="bi bi-plus">` (1 button)

## Root Cause

File: `src/app/features/settings/payment-settings/payment-settings.html`

Lines 241-243 -- chip remove buttons:
```html
<button type="button" class="stp-chip-remove" (click)="removeTipPercentage(i)">
  <i class="bi bi-x"></i>
</button>
```

Lines 257-259 -- add button:
```html
<button type="button" class="btn btn-sm btn-outline-primary" (click)="addTipPercentage()">
  <i class="bi bi-plus"></i>
</button>
```

## Fix

Add `aria-label` to each button:

```html
<button type="button" class="stp-chip-remove"
  [attr.aria-label]="'Remove ' + pct + '% tip option'"
  (click)="removeTipPercentage(i)">
  <i class="bi bi-x"></i>
</button>
```

```html
<button type="button" class="btn btn-sm btn-outline-primary"
  aria-label="Add tip percentage"
  (click)="addTipPercentage()">
  <i class="bi bi-plus"></i>
</button>
```

## Files to Change

- `src/app/features/settings/payment-settings/payment-settings.html` (lines 241, 257)

## Verification

Run the Playwright settings audit. The Payments tab should report 0 buttons
without text/aria-label.
