# Plan: Wire Mode-Aware Behavior into POS Components — COMPLETE

> **Status:** Both segments implemented and verified. February 22, 2026.

## Context

The device mode system is fully built — `DeviceModeSettings` defines per-mode defaults, `PlatformService.featureFlags()` exposes 22 boolean flags per mode, and `MainLayoutComponent` already uses them to filter sidebar nav items. But the POS components (`ServerPosTerminal`, `OrderPad`) ignore mode entirely. Every feature renders regardless of mode. A Quick Service device shows table lists, seat selectors, and course firing — none of which apply. A Bar device shows table assignment and transfer — also wrong.

`KioskTerminal` does not need mode wiring — it's a customer-facing flow with no POS concepts.

## What Does NOT Change

- `KioskTerminal` — pure customer flow, no mode gating needed
- `DeviceModeSettings` (checkout, receipt, security, display) — device-level preferences (auto-print, tip presets, font size) affect behavior at the service/checkout layer, not template visibility. Wiring those is a separate task.
- No new components, no new models, no new services

---

## Segment 1: PlatformService + ServerPosTerminal

### Step 1 — Add convenience computeds to PlatformService

**File:** `src/app/services/platform.ts`

PlatformService already exposes 7 convenience computeds that read from `featureFlags()`:

```
canUseOpenChecks, canUseFloorPlan, canUseKds, canUseCoursing,
canUseTipping, canUseExpoStation, canUseAppointments
```

The ServerPosTerminal template needs 5 more flags that exist in `ModeFeatureFlags` but don't have convenience computeds yet:

| New Computed | Reads From | What It Controls |
|---|---|---|
| `canUseSeatAssignment` | `enableSeatAssignment` | Seat bar below the item grid — the row of buttons (S1–S8) that assigns menu items to specific guest seats. Full Service uses this for split-by-seat checkout. Quick Service and Bar don't — items aren't tracked per seat. |
| `canUseSplitting` | `enableCheckSplitting` | "Split" button in the action bar — opens a modal to divide a check equally or by seat. Only Full Service and Bar support this (Bar for splitting group tabs). Quick Service has single-pay-and-go flow. |
| `canUseTransfer` | `enableCheckTransfer` | "Move" button in the action bar — opens a modal to transfer a check from one table to another (e.g., party moves from bar to dining room). Only Full Service supports this since it requires table assignment. Bar and Quick Service have no tables. |
| `canUsePreAuthTabs` | `enablePreAuthTabs` | "Tab" / "Close Tab" button in the action bar — lets a server open a named tab with optional credit card pre-authorization hold. Full Service and Bar use tabs. Quick Service doesn't — customers pay immediately. |
| `canUseOrderNumbers` | `enableOrderNumberTracking` | Order number display (#42, #43...) — Quick Service uses sequential order numbers for counter pickup ("Order 42!"). Full Service uses table numbers instead. This flag controls whether the order number badge is visible. |

These are one-line computeds following the exact same pattern as the existing 7.

### Step 2 — Inject PlatformService into ServerPosTerminal

**File:** `src/app/features/pos/server-pos-terminal/server-pos-terminal.ts`

Add `PlatformService` import and inject it alongside the existing 7 services. Then expose the feature flag signals as readonly component fields so the template can bind to them:

```
canUseFloorPlan, canUseOpenChecks, canUseSeatAssignment,
canUseKds, canUseSplitting, canUseTransfer, canUsePreAuthTabs
```

These are direct references to the PlatformService computeds — no new logic, just making them available in the template.

### Step 3 — Gate ServerPosTerminal template sections

**File:** `src/app/features/pos/server-pos-terminal/server-pos-terminal.html`

Eight `@if` gates wrapping existing HTML blocks. Here's what each one does and why:

---

**Gate 1: Left panel table list** — `@if (canUseFloorPlan())`

Wraps the entire left `<aside>` containing the table list (lines 3–65 in current HTML). This is the panel showing table numbers, order counts, elapsed time, and the "New Order" button.

- **Full Service:** Visible. Servers select a table, then take orders against it.
- **Bar:** Hidden. Bar orders are opened as tabs by customer name, not by table. The "Open Tabs" section (Gate 2) replaces this.
- **Quick Service:** Hidden. Orders are anonymous counter transactions — no table assignment.

When hidden, a replacement empty state renders instead: a "New Order" button with "Tap New Order to begin" text, so the user can still create orders without selecting a table.

**Behavior change to `createNewOrder()`:** Currently this method requires `selectedTable()` and returns early if null. When `canUseFloorPlan()` is false, we need to allow tableless order creation — pass `tableId: null` and `tableNumber: null` to `orderService.createOrder()`.

---

**Gate 2: Open Tabs section** — `@if (canUseOpenChecks())`

Wraps the "Open Tabs" subsection within the left panel (lines 38–57). This shows named tabs (e.g., "John B.", "Bar Tab 3") with their running totals and pre-auth indicators.

- **Full Service:** Visible. Servers can open tabs for guests who want to order over time.
- **Bar:** Visible. Tabs are the primary workflow — customers open a tab, order drinks over the evening, close out at the end.
- **Quick Service:** Hidden. No tab concept — customer orders, pays, leaves.

This gate sits inside Gate 1's "visible" branch, so if tables are hidden but tabs are enabled (Bar mode), we need the tabs section to render in the replacement panel.

---

**Gate 3: Seat bar** — `@if (canUseSeatAssignment())`

Wraps the seat selector strip below the item grid (lines 121–139). This is the row: `— | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8` that assigns each tapped menu item to a guest seat number.

- **Full Service:** Visible. Seat assignment enables "split by seat" at checkout — seat 1's items go on one check, seat 2's on another.
- **Bar:** Hidden. Bar customers are individuals at a bar top, not seated parties. Items go on a tab, not a seat.
- **Quick Service:** Hidden. Single transaction, no seats.

When hidden, `currentSeat()` stays `undefined` and items are added without seat tags.

---

**Gate 4: Add Check (+) button** — `@if (canUseOpenChecks())`

Wraps only the "+" button in the check tabs row (line 163). The existing check tabs still render (you need to see the active check), but the ability to add additional checks to the same order is gated.

- **Full Service:** Visible. A table of 4 might want separate checks.
- **Bar:** Visible. Multiple checks per tab group.
- **Quick Service:** Hidden. One order = one check = one payment.

---

**Gate 5: Send button** — `@if (canUseKds())`

Wraps the "Send" button (fire icon) in the action bar (lines 284–286). This sends the order to the Kitchen Display System for preparation.

- **Full Service:** Visible. Kitchen needs to see the order.
- **Bar:** Visible. Bar has KDS for drink prep.
- **Quick Service:** Visible (KDS is enabled for quick service in the mode presets). This gate only hides it for non-restaurant modes like Retail or Services.

Note: All three restaurant modes have `enableKds: true` in their presets, so this gate won't hide Send for any restaurant mode. It's here for correctness if a custom mode disables KDS.

---

**Gate 6: Split button** — `@if (canUseSplitting())`

Wraps the "Split" button (scissors icon) in the action bar (lines 287–289).

- **Full Service:** Visible. Split check equally or by seat.
- **Bar:** Visible. Split a group tab.
- **Quick Service:** Hidden. Single transaction.

---

**Gate 7: Move button** — `@if (canUseTransfer())`

Wraps the "Move" button (arrow icon) in the action bar (lines 290–292). Transfer a check to a different table.

- **Full Service:** Visible. Party moves tables.
- **Bar:** Hidden. No tables to transfer between.
- **Quick Service:** Hidden. No tables.

---

**Gate 8: Tab button** — `@if (canUsePreAuthTabs())`

Wraps the Tab / Close Tab toggle in the action bar (lines 298–306). Open a named tab with optional credit card pre-authorization.

- **Full Service:** Visible. Open tabs for long dining experiences.
- **Bar:** Visible. Primary workflow.
- **Quick Service:** Hidden. Pay now, no tabs.

---

**Empty state text change:**

The "no order selected" state (lines 316–328) currently says "Select a table to begin" when no table is selected. When `canUseFloorPlan()` is false, this should say "Tap New Order to begin" since there are no tables to select.

### Step 4 — Build verification

`ng build --configuration=production` — must produce zero errors.

### Mode behavior summary after Segment 1

| Feature | Full Service | Bar | Quick Service |
|---|---|---|---|
| Table list (left panel) | Visible | Hidden | Hidden |
| Open Tabs section | Visible | Visible | Hidden |
| Seat bar (S1–S8) | Visible | Hidden | Hidden |
| Add Check (+) | Visible | Visible | Hidden |
| Send to Kitchen | Visible | Visible | Visible |
| Split | Visible | Visible | Hidden |
| Move/Transfer | Visible | Hidden | Hidden |
| Tab / Close Tab | Visible | Visible | Hidden |
| Empty state text | "Select a table" | "Tap New Order" | "Tap New Order" |

---
---
# END OF SEGMENT 1 — TEST HERE BEFORE CONTINUING
---
---

## Segment 2: OrderPad

**Goal:** Gate OrderPad features by mode.

### Files to Modify

**`src/app/features/pos/order-pad/order-pad.ts`**
- Inject `PlatformService`
- Expose feature flag signals as component fields

**`src/app/features/pos/order-pad/order-pad.html`**
- **Table selector:** Wrap in `@if (canUseFloorPlan())`. Quick Service doesn't assign tables.
- **Seat selector:** Wrap in `@if (canUseSeatAssignment())`.
- **Order number:** Show when `canUseOrderNumbers()` is true (Quick Service feature).

### Steps

1. Inject `PlatformService` into `OrderPad`, expose flags
2. Rewrite `order-pad.html` with `@if` gates (3 gates)
3. `ng build --configuration=production` — zero errors

### Verification

1. Build passes with zero errors
2. Quick Service mode → Order Pad → no table selector, no seat selector, order number visible
3. Full Service mode → Order Pad → table pills visible, seat selector visible, no order number
