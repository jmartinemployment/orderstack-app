# BUG-12 — Menu Categories: UI Does Not Refresh After Create, Update, or Delete

**Date:** 2026-03-07  
**Severity:** High — all category CRUD operations silently succeed on the backend but the list never updates  
**Status:** Fixed ✅ Verified  
**Affected route:** `/app/menu` (Categories tab), `/app/menu?type=catering`

---

## Symptoms

1. **Edit category** — "Update Category" modal submits (PATCH 200), modal closes, but the category name in the list stays unchanged.
2. **Add category** — "Create Category" modal submits (POST 201), modal closes, but the new category never appears in the list.
3. **Hide (toggle active)** — PATCH 200 fires, but the row shows no visual change (no dimming, no "Show" toggle).
4. **Delete** — not fully tested but shares the same code path; would exhibit the same stale-list problem.

All four actions succeed on the backend. The list is simply never refreshed.

---

## Root Cause

**File:** `src/app/services/menu.ts`

`createCategory()`, `updateCategory()`, and `deleteCategory()` all set `_isLoading.set(true)` at their start, then call `await this.loadMenu()` at the end to refresh the signal.

`loadMenu()` has an early-exit guard:

```typescript
async loadMenuForRestaurant(merchantId: string | null): Promise<void> {
  // ...
  if (this._isLoading()) {
    return;          // ← hits this because the caller already set isLoading = true
  }
  this._isLoading.set(true);
  // ... actual fetch never runs
}
```

Because the CRUD methods set `_isLoading = true` before calling `loadMenu()`, the reload short-circuits every time and returns without fetching. The `_categories` signal is never updated, so the view stays stale.

---

## Fix

**File:** `src/app/services/menu.ts` — full file rewrite per CLAUDE.md.

**Strategy:** Extract a private `_fetchMenu()` method that performs the actual HTTP fetch without consulting the `_isLoading` guard. `loadMenu()` continues to use the guard (prevents duplicate concurrent loads from the component layer). The CRUD methods call `_fetchMenu()` directly after their own operation completes, bypassing the guard.

```typescript
// Private — no guard, called by CRUD methods after mutation
private async _fetchMenu(): Promise<void> {
  const merchantId = this.merchantId;
  if (!merchantId) return;
  try {
    const response = await firstValueFrom(
      this.http.get<MenuCategory[]>(
        `${this.apiUrl}/merchant/${merchantId}/menu/grouped?lang=${this._currentLanguage()}`
      )
    );
    this._categories.set(this.normalizeMenuData(response || []));
    this._crudSupported.set(true);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load menu';
    this._error.set(message);
  }
}

// Public — guarded, used by components on initial load
async loadMenu(): Promise<void> {
  return this.loadMenuForRestaurant(this.merchantId);
}

async loadMenuForRestaurant(merchantId: string | null): Promise<void> {
  if (!merchantId) { this._error.set('No restaurant selected'); return; }
  if (this._isLoading()) return;          // guard stays here only
  this._isLoading.set(true);
  this._error.set(null);
  try {
    const response = await firstValueFrom(
      this.http.get<MenuCategory[]>(
        `${this.apiUrl}/merchant/${merchantId}/menu/grouped?lang=${this._currentLanguage()}`
      )
    );
    this._categories.set(this.normalizeMenuData(response || []));
    this._crudSupported.set(true);
  } catch (err: unknown) {
    this._error.set(err instanceof Error ? err.message : 'Failed to load menu');
  } finally {
    this._isLoading.set(false);
  }
}

async createCategory(data: Partial<MenuCategory>): Promise<MenuCategory | null> {
  if (!this.merchantId) return null;
  this._isLoading.set(true);
  this._error.set(null);
  try {
    const category = await firstValueFrom(
      this.http.post<MenuCategory>(...)
    );
    await this._fetchMenu();   // ← was loadMenu() — now bypasses guard
    return category;
  } catch { ... }
  finally { this._isLoading.set(false); }
}
// Same change for updateCategory, deleteCategory
```

---

## Also Fixed In Same Pass

- **Hide button visual state** — the category row template was not binding a CSS class to `category.isActive`. Added `[class.hidden-category]="!category.isActive"` with a visual dimming style, and the Hide button label now toggles to "Show" when `isActive === false`.

---

## Verification

After fix:
1. Edit "Appetizers" → rename to "Appetizers Test" → click Update → list immediately shows "Appetizers Test". ✅
2. Add Category "Test Category" → list immediately shows new row. ✅
3. Hide "Appetizers Test" → row dims, button changes to "Show". ✅
4. Click "Show" → row returns to normal. ✅
5. Delete → confirmation dialog → row removed from list. ✅

---

## Files Changed

- `src/app/services/menu.ts` — full rewrite
- `src/app/features/menu-mgmt/category-management/category-management.html` — full rewrite (Hide/Show toggle visual)
