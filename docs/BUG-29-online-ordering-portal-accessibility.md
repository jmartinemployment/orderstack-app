# BUG-29 — Online Ordering Portal Accessibility: Icon-Only Buttons

**Date:** 2026-03-08
**Severity:** Medium — 136+ interactive elements without accessible names
**Status:** Open
**Affected route:** `/online-ordering`

---

## Symptoms

Playwright reports 136 buttons without text or aria-label on the online
ordering portal page. The buttons are rendered in a loop for each menu item.

## Root Cause

Three types of controls lack accessible names:

1. **share-btn** (1 per menu item) — icon-only share button:
   ```html
   <button type="button" class="share-btn" (click)="shareItem(item)">
     <i class="bi bi-share"></i>
   </button>
   ```

2. **qty-btn** (2 per menu item in menu + 2 per item in cart) — quantity +/- buttons
   with only "-" and "+" single-character text:
   ```html
   <button type="button" class="qty-btn" (click)="decrementItem(item.id)">-</button>
   <button type="button" class="qty-btn" (click)="incrementItem(item.id)">+</button>
   ```

3. **step-dot** (4 total) — clickable divs styled as navigation dots:
   ```html
   <div class="step-dot" [class.active]="step() === 'menu'" (click)="setStep('menu')"></div>
   ```
   These should be `<button>` elements with aria-labels.

With ~45 menu items, that is 3 buttons x 45 items = 135 buttons + 4 step dots.

---

## Claude Code Prompt

```
Fix BUG-29 in the OrderStack Angular frontend.

PROBLEM: /online-ordering has 136+ interactive elements without accessible
names. Icon-only share buttons, quantity +/- buttons, and step-dot divs
all lack aria-label attributes.

FILE: src/app/features/online-ordering/online-order-portal/online-order-portal.html

FIX:
1. Add aria-label to share buttons:
     <button type="button" class="share-btn" aria-label="Share item"
       (click)="shareItem(item)">

2. Add aria-label to quantity buttons:
     <button type="button" class="qty-btn" aria-label="Decrease quantity"
       (click)="decrementItem(item.id)">-</button>
     <button type="button" class="qty-btn" aria-label="Increase quantity"
       (click)="incrementItem(item.id)">+</button>

3. Convert step-dot divs to buttons with aria-labels:
     <button type="button" class="step-dot" aria-label="Go to menu"
       [class.active]="step() === 'menu'" (click)="setStep('menu')"></button>

   Do this for all 4 step-dot elements (location, menu, cart, info).

RULES:
- Full file rewrites only (no partial edits)
- Follow all CLAUDE.md directives
- Run ng build after changes — must be zero errors
- Do not add any features not described above
```
