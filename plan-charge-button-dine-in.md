# Plan: Charge Button & Dine In — Square-Style Implementation

## Context

The user asked for research on how Square implements the Charge button and Dine In option, then a detailed plan to align OrderStack's implementation. This plan documents Square's approach and compares it to OrderStack's current implementation across the 4 terminal routes (POS, Bar, Kiosk, Register). KDS is excluded — it's a read-only kitchen display with no sidebar, charge button, or dining options.

---

## Square's Charge Button & Dine In — How It Works

### Charge Button

- **Position:** Bottom of the right-side order ticket panel (the "current sale" sidebar)
- **Label:** Dynamic — shows `Charge $X.XX` with the order total when items exist, just `Charge` when empty
- **State:** Disabled when the cart is empty
- **Action:** Tapping `Charge` opens the checkout flow (payment method selection)
- **Visual:** Large, prominent, full-width button at the bottom of the sidebar — the primary call to action

### Dining Options (Dine In / For Here / To Go)

- **Default options:** Square auto-creates 4 defaults: **For Here**, **To Go**, **Delivery**, **Pickup**
- **Position:** The dining option is set **before or during** order building, not after pressing Charge. It appears as a swipeable selector near the top of the current ticket (right panel), above the line items
- **Per-order default:** The first dining option in the merchant's configured list auto-applies to every new ticket. Staff swipe to change it
- **Per-item override:** Individual items can have a different dining option (tap the item → Modify → dining option)
- **Visibility:** The selected dining option shows on kitchen tickets, KDS, receipts, and reports
- **Configuration:** Merchants can create up to 10 custom dining options in Square Dashboard (Items & Services → Settings → Dining Options), reorder via drag-and-drop
- **Square for Restaurants specifically:** Open ticket → tap **Actions** → select **Dining Option** (alternative to the swipe method)

### Key Square Pattern

Square separates **dining option selection** (happens inline on the ticket, before charge) from **payment** (happens after pressing Charge). The dining option is part of the order metadata, not part of the checkout flow.

---

## OrderStack Current Implementation

### What Exists Today

| Feature | POS | Bar | Kiosk | Register | KDS |
|---------|-----|-----|-------|----------|-----|
| **Bottom button** | "Send to Kitchen" | "Charge $X.XX" | "Charge $X.XX" | "Charge $X.XX" | N/A |
| **Dining option** | Modal after button click | Modal after button click | Modal after button click | Modal after button click | N/A |
| **Payment** | None (kitchen only) | After dining option | After dining option | After dining option | N/A |

### Current Flow (Bar/Kiosk/Register)

```
Press "Charge $X.XX" → Dining Option modal (Dine In / Takeout)
  → If Dine In: Table Selection → Payment
  → If Takeout: Customer Info (optional) → Payment → Loyalty Prompt → Success
```

### Current Flow (POS)

```
Press "Send to Kitchen" → Dining Option modal (Dine In / Takeout)
  → If Dine In: Table Selection → Sending → Success
  → If Takeout: Sending → Success (no payment, no customer info)
```

### Differences from Square

| Aspect | Square | OrderStack Now |
|--------|--------|----------------|
| **Dining option timing** | Set on the ticket before pressing Charge (inline, swipeable) | Selected in a modal after pressing Charge/Send |
| **Dining option position** | Top of ticket panel, above line items | Modal overlay (separate from ticket) |
| **Default dining option** | Auto-applied per merchant settings | None — must select every time |
| **Options available** | Up to 10 custom (For Here, To Go, Delivery, Pickup default) | Only 2: Dine In, Takeout |
| **Per-item dining option** | Supported | Not supported |
| **Charge button behavior** | Goes directly to payment (dining option already set) | Opens dining option selection first |

---

## Recommended Changes

### Change 1: Move dining option to the ticket panel (inline selector)

Move the dining option selection from the post-charge modal into the right sidebar, positioned between the customer row and the line items. This matches Square's pattern — the dining option is set as part of building the order, not as part of checkout.

**UI:** A segmented toggle (pill buttons) showing `Dine In | Takeout` with the active option highlighted. Default to "Dine In" for restaurant terminals.

**Where it goes in the sidebar (all 4 terminals):**
```
┌─────────────────────────────┐
│ Current Sale         [...]  │  ← header
├─────────────────────────────┤
│ 👤 Add customer        >   │  ← customer row
├─────────────────────────────┤
│ [■ Dine In] [ Takeout ]    │  ← NEW: dining option toggle
├─────────────────────────────┤
│ 1x  Burger          $12.00 │  ← line items
│ 1x  Fries            $5.00 │
│                             │
├─────────────────────────────┤
│ Tax                   $1.19 │
│ ─────────────────────────── │
│ Add discount                │
├─────────────────────────────┤
│ [  Charge $18.19          ] │  ← charge button (or Send to Kitchen for POS)
└─────────────────────────────┘
```

### Change 2: Simplify the Charge/Send flow

Since the dining option is already set on the ticket:

**Bar/Kiosk/Register — Charge flow:**
```
Press "Charge $X.XX"
  → If Dine In + no table selected: Table Selection step → Payment
  → If Dine In + table already set: Payment directly
  → If Takeout: Customer Info (optional) → Payment → Loyalty → Success
```

**POS — Send to Kitchen flow:**
```
Press "Send to Kitchen"
  → If Dine In + no table selected: Table Selection step → Sending → Success
  → If Dine In + table already set: Sending directly → Success
  → If Takeout: Sending → Success
```

The dining option step is **removed from the modal** — it's already been handled inline.

### Change 3: Table selection in sidebar (optional — for Dine In)

When "Dine In" is selected, optionally show a table indicator below the toggle. Tapping it opens the table picker. This is a nice-to-have, not required for this phase.

---

## Implementation Steps

### Step 1: Add dining option toggle to all 4 terminal sidebars

**Files to modify (HTML):**
- `src/app/features/pos/server-pos-terminal/server-pos-terminal.html`
- `src/app/features/bar/bar-terminal/bar-terminal.html`
- `src/app/features/kiosk/kiosk-terminal/kiosk-terminal.html`
- `src/app/features/register/register-terminal/register-terminal.html`

Add between customer row and `sale-items`:
```html
<div class="dining-toggle">
  <button type="button"
    class="dining-toggle-btn"
    [class.active]="selectedDiningOption() === 'dine_in'"
    (click)="setDiningOption('dine_in')">
    <i class="bi bi-cup-hot-fill"></i> Dine In
  </button>
  <button type="button"
    class="dining-toggle-btn"
    [class.active]="selectedDiningOption() === 'takeout'"
    (click)="setDiningOption('takeout')">
    <i class="bi bi-bag-fill"></i> Takeout
  </button>
</div>
```

### Step 2: Add dining option signal to all 4 terminal TS files

**Files to modify (TS):**
- `src/app/features/pos/server-pos-terminal/server-pos-terminal.ts`
- `src/app/features/bar/bar-terminal/bar-terminal.ts`
- `src/app/features/kiosk/kiosk-terminal/kiosk-terminal.ts`
- `src/app/features/register/register-terminal/register-terminal.ts`

Add:
```typescript
private readonly _selectedDiningOption = signal<'dine_in' | 'takeout'>('dine_in');
readonly selectedDiningOption = this._selectedDiningOption.asReadonly();

setDiningOption(option: 'dine_in' | 'takeout'): void {
  this._selectedDiningOption.set(option);
}
```

### Step 3: Remove dining option step from checkout/send modals

**POS terminal:** Remove the `sendStep() === 'dining-option'` block. When `sendToKitchen()` is called:
- Read `_selectedDiningOption()` directly
- If `dine_in` → go to `table-select` step (or skip if table already set)
- If `takeout` → go directly to `sending` step

**Bar/Kiosk/Register terminals:** Remove the `checkoutStep() === 'dining-option'` block. When `charge()` is called:
- Read `_selectedDiningOption()` directly
- If `dine_in` → go to `table-select` step
- If `takeout` → go to `customer-info` step

### Step 4: Style the dining toggle

**Files to modify (SCSS):**
- `src/app/features/pos/server-pos-terminal/server-pos-terminal.scss`
- `src/app/features/bar/bar-terminal/bar-terminal.scss`
- `src/app/features/kiosk/kiosk-terminal/kiosk-terminal.scss`
- `src/app/features/register/register-terminal/register-terminal.scss`

```scss
.dining-toggle {
  display: flex;
  gap: 0;
  padding: 8px 16px;
  background: #f9f9f9;
  border-bottom: 1px solid #f0f0f0;
}

.dining-toggle-btn {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  background: white;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;

  &:first-child { border-radius: 8px 0 0 8px; }
  &:last-child { border-radius: 0 8px 8px 0; border-left: none; }

  &.active {
    background: #1a1a1a;
    color: white;
    border-color: #1a1a1a;
  }
}
```

### Step 5: Reset dining option on new order

In each terminal's reset/finish method (`finishAndNewOrder()`, `cancelSend()`, etc.), reset:
```typescript
this._selectedDiningOption.set('dine_in'); // default back to dine-in
```

---

## Files Summary

| # | File | Change |
|---|------|--------|
| 1 | `src/app/features/pos/server-pos-terminal/server-pos-terminal.ts` | Add dining option signal + method, update `sendToKitchen()` to skip dining step |
| 2 | `src/app/features/pos/server-pos-terminal/server-pos-terminal.html` | Add dining toggle, remove dining-option modal step |
| 3 | `src/app/features/pos/server-pos-terminal/server-pos-terminal.scss` | Add `.dining-toggle` styles |
| 4 | `src/app/features/bar/bar-terminal/bar-terminal.ts` | Add dining option signal + method, update `charge()` to skip dining step |
| 5 | `src/app/features/bar/bar-terminal/bar-terminal.html` | Add dining toggle, remove dining-option modal step |
| 6 | `src/app/features/bar/bar-terminal/bar-terminal.scss` | Add `.dining-toggle` styles |
| 7 | `src/app/features/kiosk/kiosk-terminal/kiosk-terminal.ts` | Same as bar |
| 8 | `src/app/features/kiosk/kiosk-terminal/kiosk-terminal.html` | Same as bar |
| 9 | `src/app/features/kiosk/kiosk-terminal/kiosk-terminal.scss` | Same as bar |
| 10 | `src/app/features/register/register-terminal/register-terminal.ts` | Same as bar |
| 11 | `src/app/features/register/register-terminal/register-terminal.html` | Same as bar |
| 12 | `src/app/features/register/register-terminal/register-terminal.scss` | Same as bar |

## Verification

1. `ng serve` — confirm no build errors
2. Navigate to `/pos` — verify dining toggle appears between customer row and line items, default "Dine In" active
3. Toggle to "Takeout" — verify it switches visually
4. Press "Send to Kitchen" with Dine In selected — verify it skips dining option modal, goes to table select
5. Press "Send to Kitchen" with Takeout selected — verify it sends directly (no dining option modal)
6. Navigate to `/bar` — same toggle verification
7. Press "Charge" with Dine In — verify it goes to table select (not dining option modal)
8. Press "Charge" with Takeout — verify it goes to customer info (not dining option modal)
9. Repeat on `/kiosk` and `/register`
10. Complete a full order on each terminal — verify `orderType` in the created order matches the toggle selection

## Sources

- [Create and manage dining options | Square](https://squareup.com/help/us/en/article/5573-use-dining-options-with-the-square-app)
- [Create orders | Square](https://squareup.com/help/us/en/article/6679-orders-in-square-pos-setup-guide)
- [Customize checkout settings for Square for Restaurants](https://squareup.com/help/us/en/article/7723-reintroducing-settings-with-square-for-restaurants)
- [Square Restaurant POS](https://squareup.com/us/en/point-of-sale/restaurants)
