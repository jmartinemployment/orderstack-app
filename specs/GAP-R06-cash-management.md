# GAP-R06: Cash Management (Cash Drawer Reconciliation)

**Status:** NOT STARTED
**Priority:** 3
**Square Reference:** Starting cash amount, expected vs actual cash count at end of shift, cash in/out events (paid outs, drops to safe), discrepancy tracking, per-employee cash tracking.

---

## Overview

Full cash drawer lifecycle: open drawer with starting float → track all cash events during shift (sales, paid outs, tip payouts, drops to safe, petty cash) → end-of-shift count with denomination breakdown → reconciliation showing expected vs actual with discrepancy. Per-employee cash responsibility tracking.

---

## Phase 1 — Cash Session Lifecycle (Steps 1-5)

### Step 1: Cash Models

**Files to create:**
- `src/app/models/cash.model.ts` — `CashSession` (id, restaurantId, deviceId, openedBy, closedBy, openedAt, closedAt, startingFloat, expectedCash, actualCash, variance, status: 'open' | 'closed', events: CashEvent[], denomination?: CashCount). `CashEvent` (id, sessionId, type: CashEventType, amount, reason, employeeId, employeeName, createdAt, note). `CashEventType` ('sale' | 'refund' | 'paid_out' | 'tip_payout' | 'drop_to_safe' | 'petty_cash' | 'other_in' | 'other_out'). `CashCount` (pennies, nickels, dimes, quarters, ones, fives, tens, twenties, fifties, hundreds, total). `CashReconciliation` (sessionId, expectedCash, actualCash, variance, isOver, isShort, closedBy, closedAt).

### Step 2: Cash Service

**Files to create:**
- `src/app/services/cash.ts` — `CashService` with: `openSession(startingFloat)`, `closeSession(actualCount: CashCount)`, `addEvent(type, amount, reason, note?)`, `loadCurrentSession()`, `loadSessionHistory(dateRange)`, `getReconciliationReport(dateRange)`. Signals: `_currentSession`, `_sessionHistory`, `_isLoading`. Computeds: `isSessionOpen`, `currentExpectedCash`, `todaysEvents`, `totalPaidOut`, `totalDropped`.

### Step 3: Expand CashDrawer Component

**Files to modify:**
- `src/app/features/pos/cash-drawer/cash-drawer.ts` — inject `CashService`. Open drawer flow: starting float amount input → confirm. During session: event log list, quick-add buttons (Paid Out, Tip Payout, Drop to Safe, Petty Cash), each opens amount + reason modal. Close drawer flow: denomination count grid → calculate total → show variance → confirm close.
- `src/app/features/pos/cash-drawer/cash-drawer.html` — three views: (1) Open drawer form (starting float), (2) Active session dashboard (expected cash KPI, event list with type icons, quick-add event buttons), (3) Close drawer form (denomination grid with quantity inputs and auto-calculated totals, variance display with over/short coloring).
- `src/app/features/pos/cash-drawer/cash-drawer.scss` — denomination grid, event list, variance display styles.

### Step 4: Close-of-Day Cash Section

**Files to modify:**
- `src/app/features/reports/close-of-day/close-of-day.ts` — add cash reconciliation section. Load day's cash sessions. Display per-session summary (starting float, events breakdown, expected, actual, variance).
- `src/app/features/reports/close-of-day/close-of-day.html` — "Cash Drawers" section with per-session cards showing reconciliation summary.

### Step 5: Build Verification

- `ng build --configuration=production` — zero errors

---

## Phase 2 — Employee Tracking & Reports (Steps 6-9)

### Step 6: Per-Employee Cash Tracking

Track which employee handled each cash event. Employee-level cash responsibility report.

### Step 7: Cash Discrepancy Alerts

Alert when variance exceeds configurable threshold ($5 default). Flag employees with repeated discrepancies.

### Step 8: Cash Event Reporting

Detailed report: cash events by type, by employee, by date range. Trends over time.

### Step 9: Build Verification

- `ng build --configuration=production` — zero errors
