# GOS-SPEC-21: Retail POS Checkout

**Status:** NOT STARTED
**Vertical:** Retail
**Square Reference:** Square for Retail — POS & Checkout, Returns Processing, Exchange Processing, Split Tender, Gift Receipts, Open Tickets

---

## Overview

Retail checkout is barcode-centric — optimized for scanning hundreds of SKUs quickly. The UI prioritizes a search bar and barcode input field over visual tile grids. Key retail-specific flows: returns, exchanges, layaway, weight-based items, gift receipts, and price overrides with manager approval.

---

## Phase 1 — Barcode-Centric Checkout (Steps 1-5)

### Step 1: Retail Checkout Models

**Files to modify:**
- `src/app/models/retail.model.ts` — add:
  - `RetailTransaction` (id, restaurantId, locationId, type: 'sale' | 'return' | 'exchange', items: RetailTransactionItem[], subtotal, taxTotal, discountTotal, total, paymentMethods: RetailPayment[], employeeId, employeeName, customerId?, receiptNumber, isGiftReceipt, createdAt)
  - `RetailTransactionItem` (id, itemId, variationId, name, variationName, sku, barcode, quantity, unitPrice, originalPrice?, discountAmount, taxAmount, lineTotal, isReturn, returnReason?, weight?: number, weightUnit?: string)
  - `RetailPayment` (method: 'cash' | 'card' | 'gift_card' | 'store_credit' | 'layaway_deposit', amount, reference?)
  - `RetailCartItem` (itemId, variationId, item: RetailItem, variation: RetailItemVariation | null, quantity, unitPrice, priceOverride: number | null, priceOverrideReason: string | null, priceOverrideApprovedBy: string | null, weight: number | null, discount: {type: 'percent' | 'fixed', value: number} | null)
  - `QuickKey` (id, itemId, variationId, label, position, color)

### Step 2: Retail Checkout Service

**Files to create:**
- `src/app/services/retail-checkout.ts` — `RetailCheckoutService` with:
  - **Cart:** `addItemByBarcode(barcode)`, `addItemBySku(sku)`, `addItemManually(itemId, variationId?)`, `removeItem(index)`, `updateQuantity(index, qty)`, `setWeight(index, weight)`, `applyItemDiscount(index, type, value)`, `overridePrice(index, newPrice, reason, approvedBy)`, `clearCart()`
  - **Payment:** `processPayment(payments: RetailPayment[])`, `calculateChange(tendered)`, `splitTender(payments)`, `processRefund(transactionId, items, refundMethod)`
  - **Lookups:** `searchItems(query)`, `lookupBarcode(barcode)`, `lookupTransaction(receiptNumber)`
  - **Quick Keys:** `loadQuickKeys()`, `saveQuickKey()`, `deleteQuickKey()`
  - Signals: `_cart`, `_isProcessing`, `_quickKeys`, `_lastTransaction`
  - Computeds: `cartItems`, `cartSubtotal`, `cartTax`, `cartDiscount`, `cartTotal`, `cartItemCount`

### Step 3: Retail POS Component

**Files to create:**
- `src/app/features/retail/retail-pos/retail-pos.ts`
- `src/app/features/retail/retail-pos/retail-pos.html`
- `src/app/features/retail/retail-pos/retail-pos.scss`

**UI layout (two-panel, Square-inspired):**
- **Left panel (item entry):**
  - Barcode scan input field (auto-focus, always listening — any keystrokes go here)
  - Search bar for manual item lookup (name, SKU, category browse)
  - Quick keys grid (configurable favorites, colored buttons)
  - Search results: compact item list with variation selector dropdown
  - "Custom Amount" button for miscellaneous sales
- **Right panel (cart + payment):**
  - Cart item list: name, variation, SKU, quantity +/- buttons, unit price, line total
  - Weight-based items: weight input field with unit display, auto-calculated price
  - Price override: tap price → enter new price → reason dropdown → manager PIN approval
  - Discount row per item (% or $)
  - Subtotal, tax, discount, total display
  - Payment buttons: Cash, Card, Gift Card, Store Credit, Split
  - Cash payment: tendered amount → change calculated
  - "Gift Receipt" toggle
  - "Hold Ticket" / "Open Tickets" for save-and-resume
  - Customer lookup: phone/email search, attach to transaction for CRM/loyalty

### Step 4: Weight-Based Item Flow

When a weight-based item is scanned: prompt for weight input (lb/kg/oz/g). Price auto-calculated from unit price * weight. Display shows "$4.99/lb × 1.35 lb = $6.74".

### Step 5: Quick Keys & Favorites

Configurable grid of frequently scanned items. Drag-to-arrange. Color-coded. Tap to add to cart without scanning.

---

## Phase 2 — Payment & Receipts (Steps 6-10)

### Step 6: Split Tender

Split payment across multiple methods. "Card + Cash" flow: charge partial amount on card → remaining as cash with change calculation. "Card + Gift Card": apply gift card balance first → remaining on card.

### Step 7: Gift Card as Payment

Scan/enter gift card number → check balance → apply to transaction. If balance insufficient, remaining amount auto-prompts for secondary payment method.

### Step 8: Store Credit

Issue store credit (to gift card, no load fees). Redeem store credit as payment. Track outstanding store credit balance per customer.

### Step 9: Layaway

Open ticket as layaway: customer pays deposit (configurable minimum %), ticket saved with "layaway" status. Customer returns later, makes additional payments. When fully paid, release items. Layaway aging report.

### Step 10: Receipt Customization

Receipt template: store logo, store name/address/phone, item list with SKUs, return policy text, promotional message, barcode of receipt number for easy returns lookup. Gift receipt: same but no prices.

---

## Phase 3 — Returns & Exchanges (Steps 11-15)

### Step 11: Return Lookup

Find original transaction by: receipt number scan/entry, card swipe (last 4), customer lookup, date range search. Display original transaction items for selection.

### Step 12: Return Processing

Select items to return (full or partial). Each item: select return reason (defective, wrong size, changed mind, damaged, other). Refund to original payment method or store credit. Inventory auto-restocked for returned items.

### Step 13: Exchange Flow

Return item → credit applied to transaction → customer selects replacement item → system calculates difference. If new item costs more: collect additional payment. If less: refund difference or issue store credit. Even exchange: zero balance.

### Step 14: Return Policy Enforcement

Configurable return window (e.g., 30 days). System warns when return is outside window (manager override available). Item exceptions (final sale, clearance = no returns). Receipt required toggle.

### Step 15: Build Verification

- `ng build --configuration=production` — zero errors
- Routes: `/retail/pos`, `/retail/returns`
