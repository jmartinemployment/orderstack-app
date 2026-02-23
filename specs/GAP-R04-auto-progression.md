# GAP-R04: Auto-Progression POS (Streamlined Quick Service Flow)

**Status:** NOT STARTED
**Priority:** 6
**Square Reference:** In Quick Service mode, tapping an item auto-advances to payment. No "Add to Cart" step. Configurable per device mode.

---

## Overview

Quick Service environments prioritize speed. Auto-progression means: tap item → skip order review → jump to payment. Single-item express checkout. Staff can still break out of auto-flow by tapping "Add More" to add additional items. Controlled by `autoProgressToPayment` flag on DeviceModeSettings.

---

## Phase 1 — Auto-Progression Flow (Steps 1-4)

### Step 1: Model Update

**Files to modify:**
- `src/app/models/device.model.ts` — add `autoProgressToPayment: boolean` to `DeviceModeSettings`. Default `false`. Add to `defaultModeSettings()` and `defaultModeSettingsForPosMode()` — set `true` for `quick_service` mode by default.

### Step 2: OrderPad Auto-Progress Logic

**Files to modify:**
- `src/app/features/pos/order-pad/order-pad.ts` — inject `DeviceService`. `autoProgressEnabled` computed from current device mode settings. When `autoProgressEnabled` and item tapped with no required modifiers: auto-create order with single item → show payment screen. If item has required modifiers: show modifier prompt first → then auto-progress to payment. "Add More Items" button visible during payment screen to break out and return to item grid.
- `src/app/features/pos/order-pad/order-pad.html` — conditional auto-progress behavior. "Add More Items" escape hatch button on payment view.

### Step 3: Device Hub Toggle

**Files to modify:**
- `src/app/features/settings/device-hub/device-hub.html` — "Auto-progress to payment" toggle in mode editor checkout section. Description: "After tapping an item, skip to payment immediately. Best for counter service."
- `src/app/features/settings/device-hub/device-hub.ts` — bind toggle to mode settings form.

### Step 4: Build Verification

- `ng build --configuration=production` — zero errors
- Verify toggle appears in Quick Service mode editor
- Verify auto-progress flow in OrderPad
