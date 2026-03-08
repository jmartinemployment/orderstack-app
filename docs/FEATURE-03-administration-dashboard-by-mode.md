# FEATURE-03 — Mode-Aware Administration Dashboard (Non-Catering Modes)

**Date:** 2026-03-07
**Status:** Plan — awaiting approval
**Affected route:** `/app/home` (HomeDashboard, `os-home-dashboard`)
**Depends on:** FEATURE-10 Step 8 must ship first (Step 8 adds the `pageTitle`,
`performanceSectionTitle`, `atAGlance`, and `.glance-strip` scaffolding that this
feature fills in for the remaining modes).

---

## Context

FEATURE-10 Step 8 implements mode-aware content for **catering mode only** and leaves
placeholders for the remaining five modes:

- `pageTitle` returns mode-specific text (catering done; others return `'Dashboard'` by default)
- `performanceSectionTitle` returns `'Today's Performance'` for all non-catering modes
- `atAGlance` returns `[]` for all non-catering modes

This feature fills in those placeholders for **quick_service, full_service, bar, retail,
and services** modes. Catering is already complete after FEATURE-10 Step 8 and is not
touched here.

---

## Already Implemented After FEATURE-10 Step 8

| Item | Status after Step 8 |
|------|-------------------|
| Mode-aware setup task lists (all 6 modes) | Done |
| Mode-aware quick actions (all 6 modes) | Done |
| Mode-aware KPI data (catering pipeline, bar open tabs, others POS) | Done |
| Mode-aware setup guide subtitle (all 6 modes) | Done |
| `pageTitle` computed signal (scaffolding in place) | Partial — catering done |
| `performanceSectionTitle` computed signal | Partial — catering done |
| `atAGlance` computed + `.glance-strip` HTML + SCSS | Partial — catering done |

---

## What This Feature Adds

### 1. Mode-Specific Page Title (non-catering modes)

| Mode | Page Title |
|------|-----------|
| quick_service | Dashboard |
| full_service | Dashboard |
| bar | Bar Manager |
| retail | Store Manager |
| services | Services Manager |

### 2. Mode-Specific Performance Section Heading (non-catering modes)

| Mode | Section Heading |
|------|----------------|
| quick_service | Today's Performance |
| full_service | Today's Performance |
| bar | Today's Performance |
| retail | Store Performance |
| services | Business Overview |

### 3. At-a-Glance Live Status Strip (non-catering modes)

Three compact stat chips per mode. All data comes from existing service signals —
no new backend endpoints required.

| Mode | Chip 1 | Chip 2 | Chip 3 |
|------|--------|--------|--------|
| quick_service | Active Orders (`orderService.activeOrderCount()`) | Avg. Ticket (`todayAvgTicket()`) | Menu Items (`menuService.menuItems().length`) |
| full_service | Active Orders | Tables Occupied (`tableService.tables()` filtered to `occupied`\|`closing`) | Tables Available (filtered to `available`) |
| bar | Open Tabs (`orderService.activeOrderCount()`) | Active Orders | Avg. Ticket |
| retail | Active Orders | Avg. Ticket | Menu Items |
| services | Active Orders | Avg. Ticket | Menu Items |

All chips link to a relevant route when clicked.

| Mode | Chip 1 route | Chip 2 route | Chip 3 route |
|------|-------------|-------------|-------------|
| quick_service | `/app/orders` | — | `/app/menu` |
| full_service | `/app/orders` | `/app/floor-plan` | `/app/floor-plan` |
| bar | `/app/orders` | `/app/orders` | — |
| retail | `/app/orders` | — | `/app/retail/catalog` |
| services | `/app/orders` | — | `/app/menu` |

---

## Implementation Plan

### Step 1 — Update `home-dashboard.ts`

Read first, full rewrite. FEATURE-10 Step 8 already rewrote this file — read the
post-Step-8 version before making changes.

Changes (extending what Step 8 added):
- Fill in the non-catering branches of `pageTitle` computed map
- Fill in the non-catering branches of `performanceSectionTitle` computed map
- Fill in the non-catering branches of `atAGlance` computed map

`TableService` is already injected by Step 8. `MenuService` is already injected.
No additional service injections needed.

Non-catering `atAGlance` examples:

```typescript
full_service: () => [
  { label: 'Active Orders',     value: this.orderService.activeOrderCount(),
    icon: 'bi-receipt',         route: '/app/orders' },
  { label: 'Tables Occupied',
    value: this.tableService.tables().filter(t => t.status === 'occupied' || t.status === 'closing').length,
    icon: 'bi-columns-gap',     route: '/app/floor-plan' },
  { label: 'Tables Available',
    value: this.tableService.tables().filter(t => t.status === 'available').length,
    icon: 'bi-check-circle',    route: '/app/floor-plan' },
],

bar: () => [
  { label: 'Open Tabs',         value: this.orderService.activeOrderCount(),
    icon: 'bi-cup-straw',       route: '/app/orders' },
  { label: 'Active Orders',     value: this.orderService.activeOrderCount(),
    icon: 'bi-receipt',         route: '/app/orders' },
  { label: 'Avg. Ticket',       value: this.formatCurrency(this.todayAvgTicket()),
    icon: 'bi-cash-stack' },
],

quick_service: () => [
  { label: 'Active Orders',     value: this.orderService.activeOrderCount(),
    icon: 'bi-receipt',         route: '/app/orders' },
  { label: 'Avg. Ticket',       value: this.formatCurrency(this.todayAvgTicket()),
    icon: 'bi-cash-stack' },
  { label: 'Menu Items',        value: this.menuService.menuItems().length,
    icon: 'bi-book',            route: '/app/menu' },
],
```

Build gate: `ng build`.

### Step 2 — Update `home-dashboard.html`

Read first. The `.glance-strip` block added by FEATURE-10 Step 8 already renders when
`atAGlance().length > 0`. No HTML changes needed — the template already handles all modes
generically. Confirm the `@if (atAGlance().length > 0)` guard is present. If the guard is
missing, add it.

Build gate: `ng build`.

### Step 3 — Update `home-dashboard.scss`

Read first. The `.glance-strip` and `.glance-chip` styles were added by FEATURE-10 Step 8.
No SCSS changes needed unless the styles are absent — in that case, add them per the
spec in FEATURE-10 Step 8d.

---

## Files Changed

| File | Change |
|------|--------|
| `src/app/features/home/home-dashboard/home-dashboard.ts` | Edit — fill non-catering branches |
| `src/app/features/home/home-dashboard/home-dashboard.html` | Verify only — no change expected |
| `src/app/features/home/home-dashboard/home-dashboard.scss` | Verify only — no change expected |

---

## Test Steps After Implementation

1. Log in as `owner@taipa.com`
2. Ensure device is in **Full Service** mode (default)
3. Navigate to `/app/home` — verify title "Dashboard", chips: Active Orders | Tables Occupied | Tables Available
4. Click Tables Occupied chip — navigates to `/app/floor-plan`
5. Switch device mode to **Bar** (Settings > Hardware > Device Mode)
6. Navigate to `/app/home` — verify title "Bar Manager", chips: Open Tabs | Active Orders | Avg. Ticket
7. Switch to **Quick Service** — verify title "Dashboard", chips: Active Orders | Avg. Ticket | Menu Items
8. Switch to **Retail** — verify title "Store Manager", performance heading "Store Performance"
9. Switch to **Services** — verify title "Services Manager", performance heading "Business Overview"
10. Switch back to **Catering** — verify Step 8 content unchanged: title "Catering Admin", heading "Pipeline Overview", chips: Pending Inquiries | Awaiting Approval | Milestones Due
11. Verify no regression on existing setup tasks, quick actions, or KPI cards in any mode

---

## Out of Scope

- Catering mode (FEATURE-10 Step 8)
- Services mode bookings chip (bookings route not yet implemented)
- Retail low-stock chip (retail inventory signal not wired)
- New backend endpoints
