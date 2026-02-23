# GAP-R01: Scan to Pay (QR Code Table Payment)

**Status:** Phase 1 COMPLETE
**Priority:** 1 (highest value restaurant gap)
**Square Reference:** Guests scan QR code at table to view check, add tip, and pay from phone — no app download.

---

## Overview

Guests scan a unique QR code (printed on receipt or displayed on table tent) to view their check on their phone, select tip amount, and pay — all without downloading an app or interacting with a server. The POS receives a real-time notification when payment completes and auto-closes the check when fully paid.

---

## Phase 1 — Core Scan-to-Pay Flow (Steps 1-5)

### Step 1: Check Payment Token Model

Add payment token and QR code fields to the existing `Check` model.

**Files to modify:**
- `src/app/models/order.model.ts` — add `paymentToken: string | null`, `qrCodeUrl: string | null`, `scanToPayEnabled: boolean` to `Check`. Add `ScanToPayStatus` type (`'pending' | 'viewing' | 'paying' | 'completed' | 'expired'`). Add `ScanToPaySession` interface (token, checkId, orderId, status, viewedAt, tipAmount, tipPercent, paymentMethod, paidAt, expiresAt).

### Step 2: Service Methods

Add QR code generation and guest check retrieval to `OrderService`.

**Files to modify:**
- `src/app/services/order.ts` — add `generateCheckQr(orderId: string, checkId: string): Promise<{token: string, qrCodeUrl: string}>`, `getCheckByToken(token: string): Promise<ScanToPaySession & {check: Check, order: Order}>`, `submitScanToPayment(token: string, payload: {tipAmount: number, paymentMethodNonce: string}): Promise<void>`. Socket listener for `scan-to-pay:completed` event that updates check payment status in real time.

### Step 3: Guest Payment Page (Public Component)

Create the guest-facing payment page at `/pay/:checkToken`.

**Files to create:**
- `src/app/features/online-ordering/scan-to-pay/scan-to-pay.ts`
- `src/app/features/online-ordering/scan-to-pay/scan-to-pay.html`
- `src/app/features/online-ordering/scan-to-pay/scan-to-pay.scss`

**Behavior:**
- Route: `/pay/:checkToken` (no auth guard)
- On load: call `getCheckByToken(token)` to fetch check details
- Display: restaurant name/logo, itemized check (items, modifiers, subtotal, tax), tip selector (15%/18%/20%/25%/Custom), total with tip, payment button
- Tip selector: preset percentage buttons + custom amount input. Default to 20%.
- Payment: integrate Stripe Payment Element (or Square Web Payments SDK) for card input
- After payment: success screen with "Thank you" message, receipt number
- Error states: expired token, already paid, check not found, payment failed
- Mobile-optimized: full-width layout, large tap targets, no pinch-zoom needed

### Step 4: QR Code Button in POS

Add "QR Pay" action to the check actions in ServerPosTerminal.

**Files to modify:**
- `src/app/features/pos/server-pos-terminal/server-pos-terminal.ts` — add `generateQrCode(checkId: string)` method. `_qrCodeUrl` signal for displaying generated QR. `_showQrModal` signal.
- `src/app/features/pos/server-pos-terminal/server-pos-terminal.html` — add "QR Pay" button in check actions row. QR code modal with large QR image, "Print" button, instruction text ("Guest scans to view and pay their check").
- `src/app/features/pos/server-pos-terminal/server-pos-terminal.scss` — QR modal styles, QR code display.

### Step 5: Real-Time Payment Notification

When guest completes payment via scan-to-pay, POS receives Socket.io event and updates UI.

**Files to modify:**
- `src/app/services/order.ts` — Socket listener `scan-to-pay:completed` updates check's `paymentStatus` to `'PAID'`, shows toast notification to server ("Table 5 - Check paid via QR ($47.50 + $9.50 tip)")
- `src/app/features/pos/server-pos-terminal/server-pos-terminal.ts` — visual indicator on check card when payment received (green "Paid via QR" badge)
- `src/app/features/kds/order-card/order-card.ts` — optional: show payment status on KDS card

---

## Phase 2 — Enhanced Features (Steps 6-9)

### Step 6: Split Pay via QR

Allow multiple guests to scan the same QR and split the check.

- Guest sees option: "Pay Full Check" or "Pay My Items"
- "Pay My Items": guest selects which items are theirs, pays only those
- Remaining balance updates in real time for next scanner
- POS shows partial payment progress bar on check

### Step 7: Receipt & Tip Confirmation

- Email receipt option (guest enters email after payment)
- Tip confirmation screen before final submission
- Itemized digital receipt with restaurant branding

### Step 8: QR Code on Printed Receipts

- Auto-include QR code on printed check receipts
- QR code includes payment token URL
- Works with existing receipt printer integration

### Step 9: Settings & Configuration

- Enable/disable scan-to-pay per restaurant in settings
- Configure default tip percentages
- Configure token expiration time (default 2 hours)
- Configure auto-close behavior (auto-close check when fully paid vs require server confirmation)

**Files to modify:**
- `src/app/models/settings.model.ts` — `ScanToPaySettings`
- `src/app/services/restaurant-settings.ts` — CRUD for scan-to-pay settings
- `src/app/features/settings/payment-settings/` — scan-to-pay configuration section

---

## Phase 3 — Build Verification (Step 10)

### Step 10: Build & Integration Test

- `ng build --configuration=production` — zero errors
- Verify public route `/pay/:checkToken` loads without auth
- Verify QR code generation from POS
- Verify Socket.io payment notification flow
