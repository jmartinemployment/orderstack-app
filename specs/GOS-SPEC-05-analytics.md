# GOS-SPEC-05: Analytics — Square Parity Enhancements

## Context

Square's analytics dashboard provides real-time KPIs with WoW/YoY comparisons, customer analytics (new vs returning, visit frequency, LTV, satisfaction), online conversion funnel metrics, AI-powered neighborhood insights (weather, events, local trends), sales goal tracking, team performance analytics with commission tracking, and channel-specific analytics (in-store vs online vs delivery). OrderStack has strong AI-powered analytics — menu engineering quadrants, AI sales insights, command center with unified KPIs, anomaly detection via MonitoringService — but lacks several Square analytics features.

**Key gaps identified:**
- No **customer analytics dashboard** (visit frequency, LTV trends, new vs returning breakdown) — CRM has segments but no visual analytics
- No **conversion funnel metrics** for online ordering
- No **sales goal tracking** (daily/weekly targets with progress)
- No **channel analytics** — order sources tracked but no dedicated channel comparison view
- No **chart visualizations** — all analytics are table-based, no Chart.js/D3 graphs
- No **team performance analytics** with sales-per-employee trends
- No **peak hours heatmap** — peak hours listed as text, not visualized
- Weak **period-over-period comparison** — only basic Y/Y change percentages

**Existing assets:**
- `analytics/sales-dashboard/` — KPI cards, top sellers, peak hours, AI insights
- `analytics/menu-engineering-dashboard/` — quadrant analysis, sortable items, recommendations
- `analytics/command-center/` — 3-tab unified view (Overview, AI Insights, Alerts)
- `services/analytics.ts` — `AnalyticsService` with menu engineering, sales report, upsell
- `crm/customer-dashboard/` — customer segments (VIP/Regular/New/At-Risk/Dormant), detail panel
- `monitoring/monitoring-agent/` — anomaly detection with 8 rules, alert feed
- `models/analytics.model.ts` — `SalesReport`, `MenuEngineeringData`, `UpsellSuggestion`

---

## Mode Awareness (GOS-SPEC-01 Alignment)

Analytics infrastructure (Chart.js, date ranges, comparisons) is **universal across all verticals**. However, specific dashboard sections and metrics are gated by business vertical and feature flags.

### Analytics Feature Availability

| Feature | Applicable Verticals | Required Flag / Module | Notes |
|---|---|---|---|
| **Chart.js integration** | All | — | Universal infrastructure |
| **Revenue trend line chart** | All | — | Universal |
| **Peak hours bar chart** | All | — | Universal |
| **Peak hours 7×24 heatmap** | All | — | Universal — "hours" concept applies everywhere |
| **Top sellers bar chart** | All | — | Universal — "sellers" = items/products/services |
| **Payment method doughnut** | All | — | Universal |
| **Order type pie chart** | `food_and_drink` | — | Dine-in/takeout/delivery/curbside are restaurant concepts; retail shows in-store/online/marketplace; services shows in-person/virtual |
| **Menu engineering quadrant** | `food_and_drink` | `menu_management` module | Stars/Cash Cows/Puzzles/Dogs is a restaurant industry framework |
| **Customer analytics** | All | `crm` module | New vs returning, LTV, visit frequency — universal |
| **Channel analytics** | All with online/delivery | `online_ordering` or `delivery` module | Channel list adapts per vertical |
| **Conversion funnel** | All with online ordering | `online_ordering` module | Funnel steps adapt: restaurant (menu→cart→checkout→order) vs retail (browse→cart→checkout→order) vs services (view→book→confirm) |
| **Sales goal tracking** | All | — | Universal |
| **Team performance** | All | `staff_scheduling` module | Universal |
| **Anomaly detection** | All | — | Universal — alert rules adapt per vertical |
| **Predictive analytics** | All | — | Universal — forecast methods are vertical-agnostic |

### Sales Dashboard Adaptation by Vertical

**`food_and_drink`** (Full version):
- All 5 chart types (revenue line, peak hours bar, top sellers bar, payment doughnut, order type pie)
- AI insights powered by menu engineering data
- Peak hours heatmap with meal period labels (Breakfast, Lunch, Dinner, Late Night)

**`retail` / `grocery`**:
- 4 chart types (revenue line, peak hours bar, top sellers bar, payment doughnut) — order type pie becomes "Sales Channel pie" (in-store, online, marketplace)
- AI insights focus on inventory velocity, seasonal trends, margin optimization
- Peak hours heatmap without meal period labels

**`beauty_wellness` / `healthcare` / `sports_fitness`**:
- 4 chart types — order type pie becomes "Booking Source pie" (walk-in, online booking, phone, referral)
- AI insights focus on utilization rate, no-show rate, rebooking rate
- Peak hours heatmap labeled by appointment density

**`services` / `professional_services`**:
- 3 chart types (revenue line, peak hours bar, payment doughnut) — no "top sellers" (services are few, high-value)
- AI insights focus on project profitability, client retention
- Peak hours heatmap labeled by billable hours

### Menu Engineering — Restaurant Only

Menu engineering (Stars/Cash Cows/Puzzles/Dogs quadrant analysis) is exclusive to the `food_and_drink` vertical. For other verticals:
- **Retail**: Replace with **Product Performance Matrix** (fast movers vs slow movers × high margin vs low margin) — same quadrant logic, different labels
- **Services**: Replace with **Service Utilization Dashboard** (booked hours vs capacity, by service type)
- The underlying `AnalyticsService.loadMenuEngineering()` endpoint works for all verticals (it's really "item performance analysis"), but the UI labels and recommendations adapt.

### Command Center Adaptation

The Command Center's 3 tabs (Overview, AI Insights, Alerts) are universal. Content adapts:
- **Overview KPIs**: Revenue, orders, AOV are universal. "Covers" is restaurant-only → becomes "Transactions" for retail, "Appointments" for services.
- **AI Insights**: Insight text references domain concepts per vertical (e.g., "table turn time" for FSR, "basket size" for retail, "utilization rate" for services)
- **Alerts**: Anomaly rules are universal, but thresholds and labels adapt (e.g., "kitchen backup" alert only for `food_and_drink` with `enableKds`)

### Customer Analytics — Universal with Vertical Labels

Customer analytics (new vs returning, visit frequency, LTV, retention) is universal. Label adaptations:
- `food_and_drink`: "Visits", "Diners"
- `retail`: "Visits", "Shoppers"
- `services`: "Appointments", "Clients"

---

## Phase 1 — Enhanced Dashboard Visualizations (Steps 1-5)

### Step 1: Add Chart.js Integration

Install `chart.js` + `@types/chart.js` packages.

Create shared chart wrapper utilities in `shared/utils/chart-helpers.ts`:
```ts
export function createBarChart(canvas: HTMLCanvasElement, labels: string[], datasets: ChartDataset[]): Chart;
export function createLineChart(canvas: HTMLCanvasElement, labels: string[], datasets: ChartDataset[]): Chart;
export function createDoughnutChart(canvas: HTMLCanvasElement, labels: string[], data: number[]): Chart;
export function createHeatmap(canvas: HTMLCanvasElement, data: HeatmapData): Chart;
export function destroyChart(chart: Chart | null): void;
export const CHART_COLORS: Record<string, string>;  // Uses project CSS custom properties
```

Dark theme defaults matching OrderStack palette (`--midnight-black`, `--deep-lake`, `--medium-slate-blue`, `--cerulean-periwinkle`).

### Step 2: Enhance Sales Dashboard with Charts

**File: `analytics/sales-dashboard/`**

Replace table-based displays with visual charts:
- **Revenue trend line chart** — daily revenue for selected period with comparison line overlay
- **Peak hours bar chart** — 24-hour bars colored by intensity (green → amber → red)
- **Top sellers horizontal bar chart** — top 10 items by revenue
- **Payment method doughnut chart** — card vs cash vs gift card vs online
- **Order type pie chart** — dine-in vs takeout vs delivery vs online vs kiosk

Keep existing KPI cards and AI insights — add charts below them.

### Step 3: Customer Analytics Dashboard

**New sub-section in CRM or standalone analytics tab:**

Add customer analytics computeds to `CustomerService`:
- `newVsReturning(dateRange)` — GET `/analytics/customers/new-vs-returning`
- `visitFrequency(dateRange)` — GET `/analytics/customers/visit-frequency`
- `ltvDistribution()` — GET `/analytics/customers/ltv-distribution`
- `satisfactionTrend(dateRange)` — GET `/analytics/customers/satisfaction`

**UI components:**
- **New vs Returning pie chart** — percentage of new customers vs returning per period
- **Visit frequency histogram** — distribution of visit counts (1x, 2-3x, 4-5x, 6+)
- **LTV distribution bar chart** — customer count by spend tier ($0-50, $50-100, $100-250, $250+)
- **Customer growth line chart** — new customers added per week/month
- **Retention rate trend** — % of customers returning within 30/60/90 days

### Step 4: Channel Analytics

**New: add to Sales Dashboard or Command Center as a tab/section:**

- **Channel revenue doughnut** — POS, Online, Kiosk, QR Tableside, Delivery breakdown
- **Channel trend lines** — revenue per channel over time (overlay comparison)
- **Channel KPI cards** — per-channel: order count, revenue, AOV, growth %
- **Channel conversion** (online only): visits → cart adds → checkouts → completed orders (funnel)

Data source: `OrderService` already stores `orderSource` on every order — aggregate by source.

### Step 5: Peak Hours Heatmap

**Enhance Sales Dashboard or Command Center:**

7×24 grid heatmap (days of week × hours of day):
- Color intensity based on revenue or order count
- Tooltip showing exact values on hover
- Toggle between revenue view and order count view
- Highlight current hour with border
- Filter by channel or order type

---

## Phase 2 — Goals, Team Performance, Comparisons (Steps 6-10)

### Step 6: Sales Goal Tracking

**Add to `models/analytics.model.ts`:**
```ts
export interface SalesGoal {
  id: string;
  restaurantId: string;
  type: 'daily' | 'weekly' | 'monthly';
  targetRevenue: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}
```

**Add to `AnalyticsService`:**
- `loadGoals()` — GET `/analytics/goals`
- `createGoal(data)` — POST `/analytics/goals`
- `updateGoal(id, data)` — PATCH `/analytics/goals/:id`
- `getGoalProgress(goalId)` — GET `/analytics/goals/:id/progress`

**UI in Sales Dashboard:**
- Goal progress bar (current revenue / target) with percentage
- Daily pace indicator: "On track" / "Behind by $X" / "Ahead by $X"
- Goal streak: consecutive days/weeks meeting target

### Step 7: Team Performance Analytics

**Add to `services/analytics.ts` or new `services/team-analytics.ts`:**
- `getTeamSalesReport(dateRange)` — GET `/analytics/team/sales`
- `getTeamTipsReport(dateRange)` — GET `/analytics/team/tips`

**UI (new tab in Staff Scheduling or Sales Dashboard):**
- **Leaderboard** — ranked table of employees by revenue, order count, avg ticket, tips
- **Sales-per-employee bar chart** — horizontal bars, sortable
- **Trend line per employee** — select employee to see their daily/weekly sales trend
- **Comparison table** — side-by-side employee metrics for selected period

### Step 8: Period-Over-Period Comparison Enhancement

**Enhance `SalesReport` model:**
```ts
export interface ComparisonData {
  currentValue: number;
  previousValue: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'flat';
}
```

**Enhance all analytics dashboards:**
- Global date range picker with comparison toggle
- Comparison options: previous period, same period last week, same period last year, custom
- Every KPI card shows current value + comparison arrow + % change
- Charts show dual-line overlay (current vs comparison period, dashed line for comparison)
- Color coding: green for improvement, red for decline

### Step 9: Online Ordering Conversion Funnel

**Add to Online Ordering or Analytics:**
- Funnel visualization: Page Views → Menu Views → Add to Cart → Checkout Started → Order Placed
- Conversion rate at each step
- Drop-off identification (which step loses most customers)
- Trend over time

Data source: Track events in `OnlineOrderPortal` via new `AnalyticsService.trackEvent(type, data)` method, stored server-side.

### Step 10: Anomaly-Powered Sales Alerts

**Enhance `MonitoringService` with sales-specific rules:**
- Revenue anomaly: daily revenue ±30% from rolling 7-day average
- AOV anomaly: average order value ±25% from baseline
- Order volume spike/drop: hourly orders ±50% from same hour last week
- New customer surge: 3x normal new customer rate
- Channel shift: any channel's share changes by >10% in a day

Push alerts to Command Center and optionally to email/SMS.

---

## Phase 3 — Advanced Analytics (Steps 11-13)

### Step 11: Menu Performance Deep Dive

**Enhance Menu Engineering Dashboard:**
- **Item profitability trend line** — select item, see margin trend over 30/60/90 days
- **Price elasticity indicator** — items where price changes correlate with sales changes
- **Cannibalization detection** — when new items reduce sales of existing items
- **Seasonal pattern chart** — day-of-week and month-of-year sales patterns per item

### Step 12: Predictive Analytics

**Add to Command Center:**
- **Revenue forecast** — next 7/14/30 day revenue prediction based on historical patterns
- **Demand forecast per item** — predicted quantity needed for prep planning
- **Staffing recommendation** — suggested labor hours based on predicted volume
- Uses simple moving average + day-of-week weighting (no ML dependency)

### Step 13: Build Verification

- `ng build` both library and elements — zero errors
- Verify Chart.js renders in Sales Dashboard (bar, line, doughnut, heatmap)
- Verify customer analytics shows new vs returning, LTV distribution
- Verify channel breakdown renders with real order source data
- Verify sales goal progress bar updates correctly
- Verify period-over-period comparison shows dual-line overlays

---

## Files Summary

### New Files
| File | Purpose |
|------|---------|
| `shared/utils/chart-helpers.ts` | Chart.js wrapper utilities with dark theme |
| (Optional) `services/team-analytics.ts` | Team performance analytics |

### Modified Files
| File | Changes |
|------|---------|
| `models/analytics.model.ts` | Add SalesGoal, ComparisonData, ChannelBreakdown, ConversionFunnel |
| `services/analytics.ts` | Add goal CRUD, customer analytics, channel breakdown, conversion tracking |
| `services/monitoring.ts` | Add sales-specific anomaly rules |
| `analytics/sales-dashboard/` | Charts (revenue, peak hours, top sellers, payment, order type), goals, comparisons |
| `analytics/menu-engineering-dashboard/` | Item profitability trends, seasonality, cannibalization |
| `analytics/command-center/` | Predictive analytics, real-time ticker, channel breakdown |
| `crm/customer-dashboard/` | Customer analytics charts (new vs returning, LTV, retention) |
| `online-ordering/online-order-portal/` | Event tracking for conversion funnel |
| `package.json` | Add `chart.js` dependency |

---

## Verification

1. `ng build` both library and elements — zero errors
2. Chart.js renders correctly in dark theme
3. Sales Dashboard shows revenue trend, peak hours bar, payment doughnut
4. Customer analytics shows new vs returning, visit frequency, LTV distribution
5. Channel breakdown renders with order source data
6. Sales goal progress bar works correctly
7. Period-over-period comparison shows change arrows and dual-line charts
8. Peak hours heatmap renders 7×24 grid
