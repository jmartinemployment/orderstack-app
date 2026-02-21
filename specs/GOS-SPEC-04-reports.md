# GOS-SPEC-04: Reports — Square Parity Enhancements

## Context

Square's reporting system offers a **custom report builder** (drag-drop report blocks), **scheduled email delivery** (daily sales summary + custom report scheduling), **period-over-period comparisons** (WoW, YoY), **shift-level reporting**, **section sales** (by floor plan area), and **multi-format export** (CSV, XLSX, PDF, print, email link). OrderStack has strong reporting foundations — a 5-tab Close-of-Day report, Cash Drawer reconciliation, labor reports in Staff Scheduling, and CSV export in order views — but lacks customizable/composable reports and automated delivery.

**Key gaps identified:**
- No **custom report builder** — all reports are predefined dashboards
- No **scheduled/automated report delivery** via email
- No **PDF export** — CSV only
- No **shift-level reports** — close-of-day is date-based, not shift-based
- No **section sales** — no grouping by floor plan area
- No **hourly sales breakdown** in close-of-day (Z-report detail)
- No **period-over-period comparison** beyond basic Y/Y change percentages
- No **discount-specific report** — discounts tracked per order but not aggregated
- No **refund trend report** — refunds processed but not analyzed

**Existing assets:**
- `reports/close-of-day/` — 5 tabs: summary, payments, tips, voids, items
- `pos/cash-drawer/` — opening float, cash in/out, reconciliation
- `labor/staff-scheduling/` — labor report tab with KPIs, labor vs revenue, recommendations
- `orders/pending-orders/` + `orders/order-history/` — CSV export via `exportToCsv` utility
- `analytics/sales-dashboard/` — KPI cards, top sellers, peak hours, AI insights
- `analytics/command-center/` — unified KPI + alerts view

---

## Mode Awareness (GOS-SPEC-01 Alignment)

This spec's reporting infrastructure is **universal across all verticals** — every business needs reports. However, specific report blocks and data dimensions are gated by business vertical and device POS mode.

### Report Block Availability by Vertical

| Report Block | `food_and_drink` | `retail` / `grocery` | `beauty_wellness` / `services` | Notes |
|---|---|---|---|---|
| `sales_summary` | Yes | Yes | Yes | Universal |
| `payment_methods` | Yes | Yes | Yes | Universal |
| `item_sales` | Yes | Yes | Yes | Universal — "item" means menu items, products, or services depending on vertical |
| `category_sales` | Yes | Yes | Yes | Universal |
| `modifier_sales` | Yes | — | — | `food_and_drink` only — modifiers are a restaurant concept |
| `team_member_sales` | Yes | Yes | Yes | Universal |
| `discounts` | Yes | Yes | Yes | Universal |
| `voids_comps` | Yes | — | — | `food_and_drink` only — comp is a restaurant concept; retail uses "returns" |
| `taxes_fees` | Yes | Yes | Yes | Universal |
| `tips` | Yes | — | Yes (partial) | Requires `enableTipping` flag — restaurant and beauty/wellness |
| `hourly_breakdown` | Yes | Yes | Yes | Universal |
| `section_sales` | Yes | — | — | Requires `enableFloorPlan` — Full Service restaurants only |
| `channel_breakdown` | Yes | Yes | — | Requires `online_ordering` or `delivery` module |
| `refunds` | Yes | Yes | Yes | Universal — retail adds "returns/exchanges" detail |

**Implementation rule:** `ReportService.getAvailableBlocks()` checks `PlatformService.featureFlags` and `enabledModules` to return only applicable block types for the current vertical/mode.

### Report Dimensions by Mode

| Dimension | Applicable Modes | Notes |
|---|---|---|
| **Shift filter** | All restaurant modes, retail | Universal concept (shift = time-bounded work period) |
| **Section filter** | Full Service only | Requires `enableFloorPlan` — maps tables → floor plan sections |
| **Channel filter** | All modes with online/delivery/kiosk | Channel list adapts per vertical |
| **Device mode filter** | All | New filter dimension — break down sales by which POS mode generated them |
| **Table/seat filter** | Full Service, Bar | Requires `enableTableManagement` |

### Close-of-Day Adaptation

- **Full Service**: All 8 tabs (Summary, Payments, Tips, Voids, Items, Hourly, Sections, Channels), shift filter, section filter
- **Quick Service**: 6 tabs (Summary, Payments, Tips, Items, Hourly, Channels) — no Sections (no floor plan), no Voids tab (comps are FSR-specific)
- **Bar**: 7 tabs (Summary, Payments, Tips, Voids, Items, Hourly, Channels) — no Sections (no floor plan)
- **Retail**: 5 tabs (Summary, Payments, Items, Hourly, Returns) — no Tips, no Voids, "Returns" replaces "Refunds" with exchange detail
- **Services / Bookings**: 5 tabs (Summary, Payments, Items, Hourly, Tips) — Tips only if `enableTipping`, no Voids/Sections/Channels

### Custom Report Builder — Mode-Aware Block Palette

The report builder's available block palette (14 types) filters down based on vertical:
- `food_and_drink` sees all 14 blocks
- `retail` sees ~10 blocks (no modifier_sales, voids_comps, tips, section_sales)
- `services` sees ~8 blocks (no modifier_sales, voids_comps, section_sales, channel_breakdown, returns)

### Scheduled Reports & PDF Export

Universal across all verticals — no mode gating. The report content adapts based on which blocks are included, and block availability is already gated per the rules above.

---

## Phase 1 — Report Infrastructure + Enhanced Close-of-Day (Steps 1-5)

### Step 1: Create `models/report.model.ts`

```ts
export type ReportBlockType =
  | 'sales_summary'
  | 'payment_methods'
  | 'item_sales'
  | 'category_sales'
  | 'modifier_sales'
  | 'team_member_sales'
  | 'discounts'
  | 'voids_comps'
  | 'taxes_fees'
  | 'tips'
  | 'hourly_breakdown'
  | 'section_sales'
  | 'channel_breakdown'
  | 'refunds';

export interface ReportBlock {
  type: ReportBlockType;
  label: string;
  displayOrder: number;
  columns?: string[];          // Subset of available columns for this block
}

export interface SavedReport {
  id: string;
  restaurantId: string;
  name: string;
  blocks: ReportBlock[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavedReportFormData {
  name: string;
  blocks: ReportBlock[];
}

export type ReportScheduleFrequency = 'daily' | 'weekly' | 'monthly';

export interface ReportSchedule {
  id: string;
  restaurantId: string;
  savedReportId: string;
  frequency: ReportScheduleFrequency;
  dayOfWeek: number | null;     // 0-6 for weekly
  dayOfMonth: number | null;    // 1-28 for monthly
  timeOfDay: string;            // 'HH:mm'
  recipientEmails: string[];
  isActive: boolean;
  lastSentAt: string | null;
  createdAt: string;
}

export interface ReportScheduleFormData {
  savedReportId: string;
  frequency: ReportScheduleFrequency;
  dayOfWeek?: number;
  dayOfMonth?: number;
  timeOfDay: string;
  recipientEmails: string[];
}

export type ReportExportFormat = 'csv' | 'xlsx' | 'pdf';

export type ComparisonPeriod = 'previous_period' | 'same_period_last_year' | 'custom';

export interface ReportDateRange {
  startDate: string;
  endDate: string;
  comparisonPeriod?: ComparisonPeriod;
  comparisonStartDate?: string;
  comparisonEndDate?: string;
}

export interface HourlySalesRow {
  hour: number;           // 0-23
  orderCount: number;
  revenue: number;
  avgTicket: number;
  covers: number;
}

export interface SectionSalesRow {
  sectionName: string;     // From floor plan
  orderCount: number;
  revenue: number;
  avgTicket: number;
  covers: number;
  avgTurnTimeMinutes: number;
}

export interface ChannelBreakdownRow {
  channel: string;         // 'pos', 'online', 'kiosk', 'delivery', 'qr_tableside'
  orderCount: number;
  revenue: number;
  percentage: number;
}

export interface DiscountReportRow {
  discountName: string;
  discountType: string;
  timesApplied: number;
  totalAmount: number;
  avgDiscount: number;
  topItems: string[];
}

export interface RefundReportRow {
  date: string;
  orderNumber: string;
  amount: number;
  reason: string;
  processedBy: string;
  paymentMethod: string;
}
```

### Step 2: Create `services/report.ts` — ReportService

New service for custom reports and scheduled delivery:
- `loadSavedReports()` — GET `/reports/saved`
- `createSavedReport(data)` — POST `/reports/saved`
- `updateSavedReport(id, data)` — PATCH `/reports/saved/:id`
- `deleteSavedReport(id)` — DELETE `/reports/saved/:id`
- `runReport(reportId, dateRange)` — POST `/reports/run` (returns report data for all blocks)
- `exportReport(reportId, dateRange, format)` — POST `/reports/export` (returns file blob)
- `loadSchedules()` — GET `/reports/schedules`
- `createSchedule(data)` — POST `/reports/schedules`
- `updateSchedule(id, data)` — PATCH `/reports/schedules/:id`
- `deleteSchedule(id)` — DELETE `/reports/schedules/:id`
- `getHourlySales(dateRange)` — GET `/reports/hourly-sales`
- `getSectionSales(dateRange)` — GET `/reports/section-sales`
- `getChannelBreakdown(dateRange)` — GET `/reports/channel-breakdown`
- `getDiscountReport(dateRange)` — GET `/reports/discounts`
- `getRefundReport(dateRange)` — GET `/reports/refunds`
- Signals: `_savedReports`, `_schedules`

### Step 3: Enhance Close-of-Day with Hourly Breakdown + Shift Filtering

**File: `reports/close-of-day/`**

Add 6th tab: **"Hourly"**
- Bar chart showing revenue by hour (0-23h)
- Table: hour, order count, revenue, avg ticket, covers
- Peak hour highlight (highest revenue hour)
- Comparison to previous day/week same day

Add **shift filter** to all tabs:
- Dropdown at top: "All Day" / "Shift 1 (6am-2pm)" / "Shift 2 (2pm-10pm)" / "Shift 3 (10pm-6am)" / custom
- Filters all data by time window
- Shift definitions configurable in settings

Add **section sales** to existing summary tab:
- Revenue by floor plan section (bar, patio, main dining, etc.)
- Requires `TableService` integration to map tables → sections

### Step 4: Channel Breakdown Report

**Add to Close-of-Day or as standalone report block:**
- Revenue by order channel: POS, Online Ordering, Kiosk, QR Tableside, Delivery (DoorDash/Uber/self)
- Order count, revenue, average ticket per channel
- Percentage of total revenue per channel
- Trend indicator vs previous period

### Step 5: Discount & Refund Reports

**Add to Close-of-Day as new tabs or standalone:**

**Discounts tab:**
- Discount name, type (%, $, comp), times applied, total amount, avg discount
- Top discounted items
- Discount as % of gross sales

**Refunds tab:**
- Refund list: date, order #, amount, reason, processed by, payment method
- Total refund amount, refund rate (% of orders), avg refund amount
- Refund trend (increasing/decreasing vs prior period)

---

## Phase 2 — Custom Report Builder + Export (Steps 6-10)

### Step 6: Custom Report Builder Component

**New: `reports/report-builder/` (4 files)**

UI for composing custom reports from available blocks:
- Left panel: available report blocks (14 types) as draggable cards
- Center: current report composition (ordered list of selected blocks)
- Drag to reorder blocks
- Per-block column picker (show/hide columns)
- Report name input at top
- "Save Report" and "Run Now" buttons
- Date range picker with comparison period selector

### Step 7: Saved Reports Dashboard

**New: `reports/report-dashboard/` (4 files)**

Landing page for all reports:
- List of saved custom reports with last-run date, creator, block count
- "New Report" button → opens report builder
- "Run" button per report → generates report with date range picker
- "Schedule" button per report → opens schedule modal
- "Export" button per report → format picker (CSV, XLSX, PDF)
- Built-in reports section: Close-of-Day, Labor, Sales Summary (links to existing components)
- Register as `get-order-stack-report-dashboard` custom element

### Step 8: Report Scheduling UI

**Within Report Dashboard:**
- Schedule modal: frequency (daily/weekly/monthly), time, day selection, email recipients
- Active schedules list with next-run indicator
- Toggle on/off per schedule
- Email preview showing report format

### Step 9: PDF Export

**Add to `services/report.ts`:**
- `exportReport(id, dateRange, 'pdf')` → backend generates PDF via Puppeteer/wkhtmltopdf
- Frontend receives blob → triggers download
- PDF includes: report title, date range, all blocks rendered as tables with branding header

### Step 10: Period-Over-Period Comparison

**Enhance all report data responses with comparison columns:**
- Each numeric column gains a `_change` and `_changePercent` companion
- UI shows green/red arrows with percentage change
- Comparison options: vs previous period, vs same period last year, vs custom date range
- Applied globally via `ReportDateRange.comparisonPeriod`

---

## Phase 3 — Advanced Reporting (Steps 11-14)

### Step 11: Team Member Sales Report

**Extend report blocks:**
- Sales by team member: name, orders, revenue, avg ticket, tips, hours worked
- Sortable by any column
- Date range + location filter
- Commission calculation (if configured)

### Step 12: Tax & Service Charge Report

**Extend report blocks:**
- Tax collected by rate (state, local, combined)
- Service charges collected
- Fee breakdown (payment processing fees)
- Net revenue after taxes and fees

### Step 13: Real-Time KPI Ticker

**Enhance Command Center / Sales Dashboard:**
- WebSocket-driven live KPI cards that update on every order
- Today's revenue, order count, AOV — updating in real time
- Comparison to yesterday same time / last week same day same time
- Visual pulse animation on update

### Step 14: Build Verification

- `ng build` both library and elements — zero errors
- Verify report builder can compose and save custom reports
- Verify scheduled reports appear in schedule list
- Verify PDF export downloads valid PDF
- Verify hourly breakdown renders in Close-of-Day
- Verify period-over-period comparison shows change arrows

---

## Files Summary

### New Files
| File | Purpose |
|------|---------|
| `models/report.model.ts` | All report types, blocks, schedules, date ranges |
| `services/report.ts` | ReportService — custom reports, scheduling, export |
| `reports/report-builder/` (4 files) | Custom report builder UI |
| `reports/report-dashboard/` (4 files) | Saved reports landing page |

### Modified Files
| File | Changes |
|------|---------|
| `reports/close-of-day/` | Hourly tab, shift filter, section sales, channel breakdown |
| `analytics/sales-dashboard/` | Period-over-period comparison, real-time updates |
| `analytics/command-center/` | Real-time KPI ticker |
| `models/index.ts` | Add report.model export |
| `public-api.ts` | Add ReportService, ReportBuilder, ReportDashboard exports |
| `elements/src/main.ts` | Register `get-order-stack-report-dashboard` |

---

## Verification

1. `ng build` both library and elements — zero errors
2. Custom report builder composes reports from 14 block types
3. Reports can be saved, loaded, run with date range
4. PDF export generates downloadable file
5. Hourly breakdown shows 24-hour revenue distribution
6. Scheduled reports appear in schedule list with frequency/recipients
7. Period-over-period comparison shows change arrows on all numeric columns
