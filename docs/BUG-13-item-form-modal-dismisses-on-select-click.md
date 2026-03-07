# BUG-13 — Item Form Modal Dismisses When Clicking Category Select Dropdown

**Date:** 2026-03-07
**Severity:** High — item create/edit form is unusable; selecting a Category closes the modal
**Status:** Open
**Affected route:** `/app/menu?type=catering` → Items tab → Add Item / Edit Item

---

## Symptoms

1. Click **+ Add Item** → modal opens
2. Click the **Category \*** `<select>` dropdown → modal immediately closes, no item created
3. Same issue on **Reporting Category** `<select>`
4. No POST fired — form data lost

---

## Root Cause

In `src/app/features/menu-mgmt/item-management/item-management.html`:

```html
<div class="modal-overlay" (click)="closeForm()">
  <div class="modal-content card" (click)="$event.stopPropagation()">
```

`stopPropagation()` on the inner card does NOT reliably block events from native `<select>` OS dropdowns. The click propagates to `.modal-overlay` and fires `closeForm()`.

---

## Fix Instructions

**CLAUDE.md: full file rewrite required. Run `ng build` + `npx tsc --noEmit` after.**

### File: `src/app/features/menu-mgmt/item-management/item-management.html`

Replace the overlay click pattern:

**Before:**
```html
<div class="modal-overlay" (click)="closeForm()">
  <div class="modal-content card" (click)="$event.stopPropagation()">
```

**After:**
```html
<div class="modal-overlay" (click)="onOverlayClick($event)">
  <div class="modal-content card">
```

### File: `src/app/features/menu-mgmt/item-management/item-management.ts`

Add method:
```typescript
onOverlayClick(event: MouseEvent): void {
  if (event.target === event.currentTarget) {
    this.closeForm();
  }
}
```

Apply the same fix to the **delete confirmation** and **CSV import** modal overlays in the same HTML file.

Also audit `modifier-management.html` and `category-management.html` for the same pattern.

---

## Test Steps After Fix

1. `/app/menu?type=catering` → Items tab → **+ Add Item**
2. Click **Category** dropdown → select "Appetizers" → modal stays open ✓
3. Click **Reporting Category** dropdown → modal stays open ✓
4. Fill Name = "Test Item", Price = 10 → **Create Item**
5. Item appears in list immediately ✓
6. Edit item → same dropdown test → PATCH fires, name updates live ✓
