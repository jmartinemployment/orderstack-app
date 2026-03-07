# Plan: Embed Staff Floor Plan in Terminals + Rename Table → Area

## Context

After POS PIN login, staff land on a terminal (POS, bar, etc.) but have no visibility into the floor plan. The floor plan is an admin tool with full CRUD. Staff need a read-only view embedded in their terminal showing where they're working and letting them change area status (dirty, occupied, available, reserved).

Additionally, "Table" is restaurant-specific. Renaming to "Area" makes the concept work across verticals (restaurant tables, retail departments, etc.).

## Changes

### 1. Add `mode` input to FloorPlan component

**File:** `src/app/features/table-mgmt/floor-plan/floor-plan.ts`

Add signal input: `readonly mode = input<'admin' | 'staff'>('admin');`

In `onDragStart()`, return early if `mode() === 'staff'`.

### 3. Hide admin controls in staff mode

**File:** `src/app/features/table-mgmt/floor-plan/floor-plan.html`

Wrap in `@if (mode() === 'admin')`:
- "Add Area" button, "QR Codes" button (header)
- Edit/Delete buttons on list rows
- Detail panel: "Edit Area", "QR Code", "Remove from Plan" buttons
- "New Order" / "Open in POS" buttons
- Add/Edit modal, QR modal
- Unplaced areas panel

Keep visible in both modes:
- Floor plan canvas (read-only, no drag)
- KPI strip, section filter, legend
- Status dropdown on areas
- "Bus Area" action (status change)

### 4. Add "Floor Plan" tab to all terminals (except Kiosk)

Each terminal gets a `'floor-plan'` tab. When active, renders `<os-floor-plan mode="staff" />` in the left pane instead of the item grid.

| Terminal | TS + HTML files |
|----------|----------------|
| POS | `pos/server-pos-terminal/` |
| Bar | `bar/bar-terminal/` |
| Register | `register/register-terminal/` |
| Quick Service | `quick-service/quick-service-terminal/` |

For each: import `FloorPlan`, add `{ key: 'floor-plan', label: 'Floor Plan' }` to `topTabs`, add `@if (activeTopTab() === 'floor-plan') { <os-floor-plan mode="staff" /> }` in the left pane.

**Not included:** Kiosk (customer-facing, no floor plan needed).

### 5. Update POS login routing

**File:** `src/app/features/auth/pos-login/pos-login.ts`

Update `routeForJob()` — all jobs route to their terminal (floor plan is inside):
- `bartender/barback` → `/bar`
- `server/waiter/waitress/host/cashier` → `/pos`

### 6. Restore `/floor-plan` as admin-only (sidebar) route

**File:** `src/app/app.routes.ts`

Move `/floor-plan` back inside `MainLayoutComponent` children. Remove the top-level route.

## Files Modified

| File | Change |
|------|--------|
| `floor-plan.ts` | Add `mode` input, guard drag |
| `floor-plan.html` | Hide admin UI in staff mode |
| `server-pos-terminal.ts` + `.html` | Add Floor Plan tab |
| `bar-terminal.ts` + `.html` | Add Floor Plan tab |
| `register-terminal.ts` + `.html` | Add Floor Plan tab |
| `quick-service-terminal.ts` + `.html` | Add Floor Plan tab |
| `pos-login.ts` | Update job routing to terminals |
| `app.routes.ts` | Move floor-plan back to admin layout |

## Verification

1. `ng build` passes
2. Login as Diego (bartender) → lands on `/bar` → "Floor Plan" tab shows read-only floor plan with status controls only
3. Admin dashboard → Floor Plan page retains full CRUD
4. Staff can change area status from any terminal's Floor Plan tab
