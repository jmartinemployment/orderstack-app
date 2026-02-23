# GAP-R10: Customer-Facing Display (Second Screen)

**Status:** Phase 1 COMPLETE
**Priority:** 9
**Square Reference:** Second screen shows customers their order building in real-time, marketing slides during idle, tip prompt. Configurable layout. Customer can input their own contact info for loyalty.

---

## Overview

A second screen (browser window on a separate monitor) faces the customer. During checkout: shows items as they're scanned/added, running total, tax, discounts, loyalty status. During idle: marketing slideshow (promotions, daily specials). After total: tip selection screen. Configuration in Device Hub.

---

## Phase 1 — Customer Display Component (Steps 1-5)

### Step 1: Models

**Files to modify:**
- `src/app/models/device.model.ts` — add `CustomerDisplayConfig` (enabled: boolean, idleMode: 'slideshow' | 'logo' | 'off', slideshowImages: string[], slideshowIntervalSeconds: number, showTipPrompt: boolean, tipPresets: number[], showLoyaltyEnrollment: boolean, brandingMessage: string).

### Step 2: Customer Display Component

**Files to create:**
- `src/app/features/pos/customer-display/customer-display.ts` — standalone component. Three modes: (1) Idle (slideshow/logo), (2) Active (live order items with prices, subtotal, tax, discounts, total), (3) Tip (tip selection buttons + custom amount). Communicates with POS via BroadcastChannel API (cross-window messaging). Signals: `_displayMode`, `_currentItems`, `_subtotal`, `_tax`, `_total`, `_tipPresets`.
- `src/app/features/pos/customer-display/customer-display.html` — full-screen layout. Idle: centered logo or slideshow. Active: item list (name, quantity, price), running total panel. Tip: large tip percentage buttons + custom input. Restaurant branding throughout.
- `src/app/features/pos/customer-display/customer-display.scss` — full-screen styles, large fonts for readability, slideshow transitions, tip button grid.

### Step 3: POS Integration

**Files to modify:**
- `src/app/features/pos/server-pos-terminal/server-pos-terminal.ts` — "Open Customer Display" button that opens new browser window at `/customer-display`. BroadcastChannel sends: item added, item removed, subtotal updated, payment started (switch to tip mode), payment complete (switch to idle).

### Step 4: Route & Configuration

**Files to modify:**
- `src/app/app.routes.ts` — add `/customer-display` route (no auth, no layout).
- `src/app/features/settings/device-hub/` — customer display configuration section: enable toggle, idle mode selector, slideshow image uploads, tip presets, branding message.

### Step 5: Build Verification

- `ng build --configuration=production` — zero errors
