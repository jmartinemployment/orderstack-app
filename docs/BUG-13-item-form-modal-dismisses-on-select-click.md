# BUG-13 — Item Form Modal Dismisses When Clicking Category Select Dropdown

**Date:** 2026-03-08
**Severity:** High — item create/edit form is unusable; clicking the Category dropdown closes the modal
**Status:** Open
**Affected route:** `/app/menu?type=catering` (Items tab → Add Item or Edit Item)

---

## Symptoms

1. Click **+ Add Item** → "New Item" modal opens
2. Click the **Category** `<select>` dropdown → modal immediately closes
3. No POST or PATCH is sent — item is never saved
4. Same behavior on **Reporting Category** `<select>`

## Root Cause

In `item-management.html` the modal overlay uses `(click)="closeForm()"` with a child `(click)="$event.stopPropagation()"`. Native `<select>` elements open an OS-level widget; the resulting events bypass Angular's stopPropagation and reach the overlay handler.

---

## Claude Code Prompt

```
Fix BUG-13 in the OrderStack Angular frontend.

PROBLEM: In src/app/features/menu-mgmt/item-management/item-management.html,
the "New Item" / "Edit Item" modal closes immediately when the user clicks any
native <select> element (Category, Reporting Category). The modal overlay uses
(click)="closeForm()" and the inner card uses (click)="$event.stopPropagation()"
but native <select> click events escape stopPropagation and trigger closeForm().

FIX: Replace the stopPropagation approach with a target-equality guard.

1. In item-management.html, change the modal overlay from:
     <div class="modal-overlay" (click)="closeForm()">
       <div class="modal-content card" (click)="$event.stopPropagation()">
   to:
     <div class="modal-overlay" (click)="onOverlayClick($event)">
       <div class="modal-content card">

2. In item-management.ts add this method:
     onOverlayClick(event: MouseEvent): void {
       if (event.target === event.currentTarget) {
         this.closeForm();
       }
     }

3. Apply the same fix to the delete confirmation modal and CSV import modal
   overlays in item-management.html if they use the same stopPropagation pattern.

4. Audit modifier-management.html and category-management.html for the same
   pattern and apply the same fix wherever found.

RULES:
- Full file rewrites only (no partial edits)
- Follow all CLAUDE.md directives
- Selectors must use os- prefix
- standalone: true, ChangeDetectionStrategy.OnPush
- Run ng build && npx tsc --noEmit after changes — must be zero errors
- Do not add any features not described above
```
