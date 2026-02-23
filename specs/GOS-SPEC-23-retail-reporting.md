# GOS-SPEC-23: Retail Reporting & Analytics

**Status:** NOT STARTED
**Vertical:** Retail
**Square Reference:** Square for Retail — COGS, Projected Profit, Sell-Through, Vendor Sales, Aging Inventory, Inventory by Category, Employee Sales, Commission Reports

---

## Overview

Retail reporting focuses on product profitability, inventory efficiency, and sales performance. Key reports that don't exist in the restaurant vertical: COGS tracking, sell-through rates, projected profit from current inventory, vendor performance, aging inventory identification, and commission tracking. These reports drive purchasing decisions, pricing strategies, and dead stock management.

---

## Phase 1 — Sales Reports (Steps 1-5)

### Step 1: Retail Report Models

**Files to modify:**
- `src/app/models/report.model.ts` — add:
  - `RetailSalesReport` (dateRange, totalRevenue, totalCogs, grossProfit, grossMarginPercent, totalUnits, totalTransactions, averageTransactionValue, salesByItem: RetailItemSalesRow[], salesByCategory: RetailCategorySalesRow[], salesByEmployee: RetailEmployeeSalesRow[], salesByPaymentMethod: {method, amount, count}[])
  - `RetailItemSalesRow` (itemId, itemName, variationName, sku, unitsSold, revenue, cogs, profit, marginPercent, averageSellingPrice, discountAmount)
  - `RetailCategorySalesRow` (categoryId, categoryName, unitsSold, revenue, cogs, profit, marginPercent)
  - `RetailEmployeeSalesRow` (employeeId, employeeName, transactionCount, revenue, averageTransaction, commission, itemsSold)
  - `RetailDiscountReport` (discountName, timesUsed, totalDiscountAmount, revenueImpact, averageDiscountPercent)
  - `RetailTaxReport` (taxRateName, taxRate, taxableAmount, taxCollected)

### Step 2: Report Service Extension

**Files to modify:**
- `src/app/services/report.ts` — add retail-specific methods: `getRetailSalesReport(dateRange, locationId?)`, `getRetailItemSales(dateRange, categoryId?, vendorId?)`, `getRetailCategorySales(dateRange)`, `getRetailEmployeeSales(dateRange)`, `getRetailDiscountReport(dateRange)`, `getRetailTaxReport(dateRange)`.

### Step 3: Retail Reports Dashboard

**Files to create:**
- `src/app/features/retail/reports/retail-reports.ts`
- `src/app/features/retail/reports/retail-reports.html`
- `src/app/features/retail/reports/retail-reports.scss`

**UI — 6 tabs:** Overview, Items, Inventory, Vendor, Employee, Tax

**Overview tab:**
- KPI cards: total revenue, gross profit, gross margin %, units sold, average transaction, transactions
- Period selector: today, yesterday, this week, this month, custom range
- Comparison toggle: vs previous period, vs same period last year
- Sales trend chart (revenue + profit lines over time)

### Step 4: Item Sales Report

Sortable table: item name, variation, SKU, units sold, revenue, COGS, profit, margin %. Filter by category, vendor, date range. Export to CSV. Click item for detailed view: daily sales chart, price history, stock level overlay.

### Step 5: Gross Margin Report

Revenue - COGS per item/category/vendor. Margin % with color coding (green >40%, amber 20-40%, red <20%). Drill-down from category to items.

---

## Phase 2 — Inventory Reports (Steps 6-10)

### Step 6: COGS Report

Track COGS across: sales, restocks, recounts, losses, damages, theft. Show revenue, COGS, profit, profit margin per item. COGS trend over time. Breakdown by adjustment type.

### Step 7: Sell-Through Report

Daily snapshot: units sold vs units received per item. Sell-through percentage. Benchmarks: 80%+ green (excellent), 40-80% amber (acceptable), below 40% red (concerning). Quick actions per item: apply discount, create marketing campaign, reprice, update alert.

### Step 8: Aging Inventory Report

Items ranked by days since last sale. Categories: 0-30 days (fresh), 31-60 days (aging), 61-90 days (stale), 90+ days (dead stock). Stock value per aging category. Recommended actions per item.

### Step 9: Projected Profit Report

Current stock on hand × average margin per item. Total potential profit of current inventory. Slice by item, category, vendor, location. Helps answer "If I sold everything I have, how much profit would I make?"

### Step 10: Vendor Sales Report

Sales by vendor: revenue, units, top items per vendor. Compare vendor performance side-by-side. Net sales and profit contribution per vendor over configurable date range.

---

## Phase 3 — Predictive & Comparison (Steps 11-14)

### Step 11: Sales Forecast

Predict next 7/14/30 days sales by item using historical data. Confidence intervals. Flag items where predicted demand exceeds current stock.

### Step 12: Demand Planning

Seasonal trend detection: identify items that sell better at certain times of year. Reorder timing recommendations based on lead time + predicted demand. Stock-out date predictions.

### Step 13: Year-Over-Year Comparison

Full YoY comparison: revenue, units, transactions, margin, average ticket. By item, category, location. Visualization: dual-axis chart showing both years overlaid.

### Step 14: Build Verification

- `ng build --configuration=production` — zero errors
- Route: `/retail/reports`
