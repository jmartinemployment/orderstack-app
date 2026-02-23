# GOS-SPEC-22: Retail Inventory Management

**Status:** NOT STARTED
**Vertical:** Retail
**Square Reference:** Square for Retail — Inventory Management, Purchase Orders, Vendor Management, FIFO Valuation, Stock Forecasts, Cycle Counts, Barcode Scanning for Counts

---

## Overview

Retail inventory is the backbone of the business. Per-location, per-variation stock quantities with real-time tracking. Low stock alerts with reorder points. Full purchase order workflow with vendors. FIFO inventory valuation for accurate COGS. Physical inventory counts (full and cycle) with multi-device and barcode scanning support. Stock transfers between locations.

---

## Phase 1 — Stock Tracking (Steps 1-5)

### Step 1: Retail Inventory Models

**Files to create:**
- `src/app/models/retail-inventory.model.ts` —
  - `RetailStockRecord` (id, itemId, variationId, locationId, quantityOnHand, quantityReserved, quantityAvailable, reorderPoint, lowStockThreshold, lastCountedAt, averageCostPerUnit, totalStockValue)
  - `StockAdjustment` (id, itemId, variationId, locationId, type: StockAdjustmentType, quantity, previousQuantity, newQuantity, reason, note, employeeId, employeeName, createdAt, costPerUnit?)
  - `StockAdjustmentType` ('received' | 'recount' | 'damage' | 'theft' | 'loss' | 'return' | 'transfer_in' | 'transfer_out' | 'sale' | 'correction')
  - `StockTransfer` (id, fromLocationId, toLocationId, status: 'pending' | 'in_transit' | 'received' | 'cancelled', items: StockTransferItem[], createdBy, createdAt, receivedBy?, receivedAt?, note)
  - `StockTransferItem` (itemId, variationId, quantity, receivedQuantity?)
  - `StockAlert` (id, itemId, variationId, locationId, alertType: 'low_stock' | 'out_of_stock' | 'reorder_point', currentQuantity, threshold, createdAt, acknowledgedAt?)

### Step 2: Retail Inventory Service

**Files to create:**
- `src/app/services/retail-inventory.ts` — `RetailInventoryService` with:
  - **Stock:** `loadStock(locationId?)`, `getStockForItem(itemId)`, `adjustStock(itemId, variationId, locationId, type, quantity, reason, note?)`, `loadAdjustmentHistory(itemId?, dateRange?)`, `loadStockAlerts()`
  - **Transfers:** `createTransfer(fromLocationId, toLocationId, items)`, `receiveTransfer(transferId, receivedItems)`, `cancelTransfer(transferId)`, `loadTransfers(locationId?, status?)`
  - **Counts:** `startFullCount(locationId)`, `startCycleCount(locationId, categoryId?)`, `submitCountEntry(countId, itemId, variationId, actualQuantity)`, `completeCount(countId)`, `loadCountHistory()`
  - Signals: `_stock`, `_alerts`, `_transfers`, `_activeCounts`, `_isLoading`
  - Computeds: `lowStockItems`, `outOfStockItems`, `totalStockValue`, `pendingTransfers`, `unresolvedAlerts`

### Step 3: Inventory Dashboard Component

**Files to create:**
- `src/app/features/retail/inventory/retail-inventory.ts`
- `src/app/features/retail/inventory/retail-inventory.html`
- `src/app/features/retail/inventory/retail-inventory.scss`

**UI — 5 tabs:** Overview, Adjustments, Transfers, Counts, Alerts

**Overview tab:**
- KPI cards: total SKUs tracked, total stock value, low stock count, out of stock count
- Stock table: item name, variation, SKU, on hand, reserved, available, reorder point, status badge (OK/Low/Out)
- Search + filter by category, vendor, stock status
- Quick adjust: tap item → adjustment modal (type, quantity, reason, note)

### Step 4: Stock Adjustment UI

Adjustment modal: type dropdown (received, recount, damage, theft, loss, correction), quantity (+/-), reason text, optional note. Adjustment history tab: filterable log with type icons, quantities, timestamps, employee names.

### Step 5: Stock Transfer UI

Transfer creation: select from/to locations → add items with quantities → submit. Receiving: review incoming transfer → confirm quantities received (partial receiving supported) → auto-adjust stock. Transfer history with status badges.

---

## Phase 2 — Purchase Orders & Vendors (Steps 6-10)

### Step 6: Vendor Management

**Files to create:**
- `src/app/features/retail/vendor-management/retail-vendor-management.ts` (+ html, scss)

Vendor directory: name, contact info (email, phone, address), lead time (days), payment terms (Net 30, COD, etc.), minimum order amount, notes, associated item count. Vendor CRUD. Vendor deactivation (soft delete). Vendor import via CSV. Vendor performance metrics (total purchases, on-time delivery rate).

### Step 7: Purchase Order Creation

**Files to create:**
- `src/app/features/retail/purchase-orders/retail-purchase-orders.ts` (+ html, scss)

PO form: select vendor → auto-populate vendor's items → set quantities and unit costs → delivery location → expected date → optional note. "Create Items Inline" — add new items directly within PO creation. PO status flow: Draft → Active (submitted) → Partially Received → Received → Archived. Cancel option at Draft/Active stages. Email PO to vendor. Export PO as PDF/CSV. Max 500 items per PO.

### Step 8: PO Receiving

Receiving workflow: open active PO → for each line item, enter quantity received. "Receive All" bulk button. Partial receiving: received quantities tracked, remaining stays on order. Mark items as damaged/lost during receiving (doesn't affect COGS). Additional costs (shipping, handling) added during receiving, reflected in COGS report. Print barcode labels on receive option.

### Step 9: Auto-Reorder Suggestions

System generates suggested POs based on: items below reorder point, sales velocity (units sold per week), vendor lead time, current stock. "Create PO from Suggestions" button. AI-powered demand forecasting to predict when items will run out.

### Step 10: PO Reporting

PO summary report: total POs by status, total cost, average fulfillment time, vendor performance ranking. Individual vendor report: POs, line items, costs, delivery performance.

---

## Phase 3 — Advanced Inventory (Steps 11-15)

### Step 11: FIFO Inventory Valuation

Track cost layers: each stock receipt (PO, adjustment) creates a cost layer with quantity and unit cost. Sales consume oldest layers first (FIFO). Stock value = sum of remaining layer quantities × layer costs. COGS calculated from consumed layers.

### Step 12: Full & Cycle Counts

Full count: count all stock at a location. Multi-device support (assign sections to employees, merge results). Uncounted items set to zero. Requires manager approval. Cycle count: count subset by category. No approval required. Barcode scanning for counts (scan item → enter quantity). Count history with variance summary.

### Step 13: Barcode Label Printing

Generate barcode labels: item name, variation name, price, barcode image. Label size options (standard shelf label, small price tag, large sign). Batch print from inventory screen or PO receiving. Compatible with Dymo/Zebra label printers (browser print API).

### Step 14: Inventory Reports

- **Aging inventory:** items not sold in 30/60/90 days with value and recommended action (discount, clearance, remove)
- **Sell-through rate:** units sold / units received per period, benchmark indicators (80%+ excellent, 40-80% acceptable, below 40% concerning)
- **Projected profit:** current stock × margin per item/category
- **Shrinkage:** expected stock (starting + received - sold) vs actual stock over time
- **Inventory turnover:** COGS / average inventory value

### Step 15: Build Verification

- `ng build --configuration=production` — zero errors
- Routes: `/retail/inventory`, `/retail/purchase-orders`, `/retail/vendors`
