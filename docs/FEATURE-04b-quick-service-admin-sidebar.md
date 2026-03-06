# FEATURE-04b — Quick Service Mode: Administration Sidebar Navigation

> **Document version:** March 2026
> **Status:** Ready for implementation
> **Related docs:**
> - FEATURE-04: Catering Mode sidebar (companion doc — same pattern, different mode)
> - FEATURE-03: Administration dashboard mode-aware KPIs, setup tasks, quick actions
> - FEATURE-02d: Catering Phase 2 (for branch logic context)

---

## 1. Executive Summary

### Problem

`quick_service` has no dedicated sidebar nav branch. It falls through to `buildDefaultNav()` alongside `full_service` and `bar`, producing a sidebar that is close but not right for QSR operators:

**What's missing that QSR needs:**
- KDS as a top-level sidebar item (currently absent; critical for counter service)
- Discounts (currently absent from all modes via default nav)
- Gift Cards (absent)
- Loyalty (absent — but high-value for QSR repeat-visit programs)
- Orders badge count with sub-filter children

**What's showing that QSR doesn't need:**
- Floor Plan (already excluded via `mode === 'full_service' || mode === 'bar'` gate — correct)
- Bookings / Reservations (same gate — correct)
- The default nav is close, but the missing items above are meaningful gaps

Additionally, there is no `isQuickServiceMode` computed signal in `PlatformService` — `quick_service` is only detectable via the catch-all `isRestaurantMode` (which also covers `full_service` and `bar`). A granular signal is required to branch cleanly.

### Solution

1. Add `isQuickServiceMode` (and companion signals `isFullServiceMode`, `isBarMode`) to `PlatformService`
2. Add `buildQuickServiceNav()` as a distinct private method in `MainLayoutComponent`
3. Update `navItems()` branch logic to check `isQuickServiceMode()` before falling through to `buildDefaultNav()`
4. Add QSR badge count to `sidebarAlerts()` for the KDS item

### Outcome

A QSR operator sees a sidebar built around their actual workflow loop: Order comes in → hits KDS → gets called → customer picks up. Orders and KDS are co-equal top-level items. Discounts, Gift Cards, and Loyalty are present and grouped with Menu. Floor Plan and Bookings are absent.

---

## 2. Competitive Reference

### 2.1 Square for Restaurants (QSR Mode)

**Source:** https://squareup.com/us/en/point-of-sale/restaurants

Square's sidebar for counter-service / quick-service restaurants:

| Section | Items |
|---|---|
| **Front of House** | Point of Sale, Orders (unified: dine-in, online, delivery, all statuses) |
| **Kitchen** | Kitchen Display System |
| **Menu** | Item Library, Categories, Modifiers, Discounts |
| **Guests** | Customers, Loyalty, Gift Cards |
| **Business** | Reports, Team, Payroll |
| **Settings** | Locations, Hardware, Payments, Notifications |

**Key QSR-specific insights from Square:**
- KDS is a **top-level sidebar item** in QSR mode (in full-service it's buried under Hardware settings)
- Loyalty is **higher in the nav** for QSR than full-service — because QSR loyalty programs (points per visit, punch cards) drive repeat frequency in ways that matter more to counter operators than sit-down operators
- Orders shows **all channels in one unified view** (online, in-person, delivery) rather than separate routes

**What Square removes for QSR vs. full-service:**
- Floor Plan (no table layout needed)
- Reservations / Waitlist
- Course firing / Coursing controls
- Server-specific check management (open checks, transfer checks)

---

### 2.2 Toast Quick Service

**Source:** https://pos.toasttab.com/products/quick-service

Toast's QSR sidebar priority order:

| Priority | Item | Rationale |
|---|---|---|
| 1 | Orders | Live order queue is the QSR heartbeat |
| 2 | KDS | Counter staff need live prep visibility at all times |
| 3 | POS | Counter terminal (take payment) |
| 4 | Online Ordering | Critical post-pandemic revenue channel |
| 5 | Menu | Frequent LTO (limited-time offer) and item updates |
| 6 | Loyalty | Drive repeat visit frequency |
| 7 | Reports | Hourly sales, item velocity are QSR-specific metrics |
| 8 | Team / Scheduling | High staff turnover = constant schedule changes |
| 9 | Settings | Hardware, payments |

**Toast key insight:** Orders and KDS are treated as co-equal top-level items because the QSR flow is: order in (Orders) → prep starts (KDS) → ready (order number called) → pickup. The sidebar reflects this loop.

---

## 3. Current State

### 3.1 `PlatformService` — Mode Detection Today

```typescript
// platform.ts — existing signals
readonly isRestaurantMode = computed(() => {
  const mode = this._currentDeviceMode();
  return mode === 'quick_service' || mode === 'full_service' || mode === 'bar';
});
readonly isRetailMode   = computed(() => this._currentDeviceMode() === 'retail');
readonly isCateringMode = computed(() => this._currentDeviceMode() === 'catering');
readonly isServiceMode  = computed(() => {
  const mode = this._currentDeviceMode();
  return mode === 'services' || mode === 'bookings';
});

// MISSING — needs to be added:
// isQuickServiceMode, isFullServiceMode, isBarMode
```

### 3.2 `MainLayoutComponent` — Branch Logic Today

```typescript
readonly navItems = computed<NavItem[]>(() => {
  const catering = this.platform.isCateringMode();
  // ...
  const items: NavItem[] = catering
    ? this.buildCateringNav()
    : this.buildDefaultNav(retail, service, restaurant, mode, flags, modules);
  // ...
});
```

`quick_service` always falls through to `buildDefaultNav()`. There is no QSR branch.

### 3.3 What `quick_service` Currently Gets (Default Nav Audit)

| Item | Route | QSR Needed? | Notes |
|---|---|---|---|
| Administration | /app/administration | ✅ | |
| Orders | /app/orders | ✅ Critical | No badge count, no sub-children |
| POS | /pos | ✅ | Uses full-service POS route, not /quick-service |
| Items | /app/menu | ✅ | No children (Modifiers, Combos) |
| Online | /app/online-ordering | ✅ | Only if module enabled |
| Customers | /app/customers | ✅ | |
| Reports | /app/reports | ✅ | No QSR-specific children (Hourly, Item Velocity) |
| Staff | /app/staff | ✅ | Has Scheduling child; missing Time Clock child |
| Inventory | /app/inventory | ✅ | Only if module enabled |
| Suppliers | /app/suppliers | ✅ | Only if inventory module enabled |
| Settings | /app/settings | ✅ | No specific children |
| **KDS** | /app/kds | ❌ **Missing** | **Critical for QSR — should be top 3** |
| **Discounts** | /app/discounts | ❌ **Missing** | **QSR promos, BOGO, happy hour** |
| **Gift Cards** | /app/gift-cards | ❌ **Missing** | |
| **Loyalty** | /app/loyalty | ❌ **Missing** | **High-value for repeat-visit QSR programs** |
| Floor Plan | /app/floor-plan | ✅ Already absent | Correctly excluded by existing gate |
| Bookings | /app/bookings | ✅ Already absent | Correctly excluded by existing gate |

---

## 4. Target State

### 4.1 `PlatformService` — New Granular Mode Signals

Add to `src/app/services/platform.ts`:

```typescript
/** True only when device mode is exactly 'quick_service' */
readonly isQuickServiceMode = computed(() => this._currentDeviceMode() === 'quick_service');

/** True only when device mode is exactly 'full_service' */
readonly isFullServiceMode = computed(() => this._currentDeviceMode() === 'full_service');

/** True only when device mode is exactly 'bar' */
readonly isBarMode = computed(() => this._currentDeviceMode() === 'bar');
```

**Note:** `isRestaurantMode` remains unchanged — it still covers all three. These are purely additive.

---

### 4.2 Complete Quick Service Sidebar Tree

```
SECTION: Operations (core daily workflow)
├── 🏠  Administration  /app/administration   (dashboard — QSR KPIs per FEATURE-03)
├── 📋  Orders          /app/orders           (PRIMARY — live order queue, all statuses)
│   ├──  Open           /app/orders?status=open
│   ├──  In Progress    /app/orders?status=in_progress
│   ├──  Ready          /app/orders?status=ready
│   └──  Order History  /app/orders/history
├── 🖥️  POS             /quick-service        (full-screen QSR counter terminal)
├── 📺  Kitchen (KDS)   /app/kds              (live prep display — co-equal with Orders)
├── 🌐  Online Orders   /app/online-ordering  (delivery + pickup channel; if module enabled)

SECTION: Menu & Promotions (dividerBefore: true)
├── 🍽️  Items           /app/menu
│   ├──  Categories    /app/menu/categories
│   ├──  Modifiers     /app/menu/modifiers
│   └──  Combos        /app/menu/combos
├── 🏷️  Discounts       /app/discounts        (promos, BOGO, happy hour)
├── 🎁  Gift Cards      /app/gift-cards

SECTION: Guests (dividerBefore: true)
├── 👥  Customers       /app/customers
├── ⭐  Loyalty         /app/loyalty          (if loyalty module enabled)

SECTION: Business (dividerBefore: true)
├── 📊  Reports         /app/reports
│   ├──  Sales Summary /app/reports/sales
│   ├──  Hourly Sales  /app/reports/hourly
│   ├──  Item Velocity /app/reports/items
│   └──  Labor Cost    /app/reports/labor
├── 👷  Staff           /app/staff
│   ├──  Team          /app/staff
│   ├──  Scheduling    /app/staff/scheduling
│   └──  Time Clock    /app/staff/time-clock
├── 📦  Inventory       /app/inventory        (if inventory module enabled)
├── 🚚  Suppliers       /app/suppliers        (if inventory module enabled)
├── 📢  Marketing       /app/marketing

SECTION: Config (dividerBefore: true)
└── ⚙️  Settings        /app/settings
    ├──  Hardware       /app/settings/hardware
    ├──  Payments       /app/settings/payments
    ├──  Tax & Fees     /app/settings/tax
    ├──  Notifications  /app/settings/notifications
    └──  Integrations   /app/settings/integrations
```

### 4.3 Items Explicitly EXCLUDED for Quick Service

| Item | Reason |
|---|---|
| Floor Plan | No table layout — QSR is counter service |
| Bookings / Reservations | QSR is first-come, first-served |
| Bar Tabs / Pre-Auth | Bar mode only |
| Open Checks | QSR closes at point of sale — no open check lifecycle |
| Coursing | No course management at a counter |

### 4.4 Badge Counts

| Nav Item | Badge Logic | Source |
|---|---|---|
| Orders | `activeOrderCount()` when > 0 | `OrderService.activeOrderCount` |
| Kitchen (KDS) | `pendingOrders().length` when > 0 | `OrderService.pendingOrders` |
| Online Orders | Unacknowledged online orders (future) | `OrderService` |

---

## 5. Implementation Plan

### 5.1 File Changes

| # | File | What Changes |
|---|---|---|
| 1 | `src/app/services/platform.ts` | Add `isQuickServiceMode`, `isFullServiceMode`, `isBarMode` computed signals |
| 2 | `src/app/layouts/main-layout.component.ts` | Add `buildQuickServiceNav()` private method; update `navItems()` branch logic; update `sidebarAlerts()` |
| 3 | `src/app/layouts/main-layout.component.html` | Verify template renders `dividerBefore`, `badge`, and `children` on `NavItem` (likely already handled by FEATURE-04 catering work) |

### 5.2 `navItems()` — Updated Branch Logic

```typescript
readonly navItems = computed<NavItem[]>(() => {
  const catering     = this.platform.isCateringMode();
  const quickService = this.platform.isQuickServiceMode();  // ← NEW
  const retail       = this.platform.isRetailMode();
  const service      = this.platform.isServiceMode();
  const restaurant   = this.platform.isRestaurantMode();
  const mode         = this.platform.currentDeviceMode();
  const flags        = this.platform.featureFlags();
  const modules      = this.platform.enabledModules();
  const alerts       = this.sidebarAlerts();

  let items: NavItem[];

  if (catering) {
    items = this.buildCateringNav();                                          // FEATURE-04
  } else if (quickService) {
    items = this.buildQuickServiceNav();                                      // ← NEW (this doc)
  } else {
    items = this.buildDefaultNav(retail, service, restaurant, mode, flags, modules);
  }

  for (const item of items) {
    item.alertSeverity = alerts[item.route] ?? null;
  }

  return items;
});
```

`full_service` and `bar` continue to use `buildDefaultNav()` — completely unchanged.

### 5.3 `buildQuickServiceNav()` — Full Implementation

Add as a private method in `MainLayoutComponent`. `OrderService` is already injected.

```typescript
private buildQuickServiceNav(): NavItem[] {
  const activeOrders  = this.orderService.activeOrderCount();
  const pendingOrders = this.orderService.pendingOrders().length;
  const modules       = this.platform.enabledModules();
  const flags         = this.platform.featureFlags();

  return [
    // ── Operations ──────────────────────────────────────────────────────
    {
      label: 'Administration',
      icon: 'bi-speedometer2',
      route: '/app/administration',
      exact: true,
    },
    {
      label: 'Orders',
      icon: 'bi-receipt',
      route: '/app/orders',
      badge: activeOrders > 0 ? activeOrders : undefined,
      children: [
        { label: 'Open',          icon: 'bi-clock',         route: '/app/orders', queryParams: { status: 'open' } },
        { label: 'In Progress',   icon: 'bi-play-circle',   route: '/app/orders', queryParams: { status: 'in_progress' } },
        { label: 'Ready',         icon: 'bi-check-circle',  route: '/app/orders', queryParams: { status: 'ready' } },
        { label: 'Order History', icon: 'bi-clock-history', route: '/app/orders/history' },
      ],
    },
    {
      label: 'POS',
      icon: 'bi-lightning-charge',
      route: '/quick-service',
    },
    ...(flags['enableKds']
      ? [{
          label: 'Kitchen (KDS)',
          icon: 'bi-display',
          route: '/app/kds',
          badge: pendingOrders > 0 ? pendingOrders : undefined,
        } as NavItem]
      : []),
    ...(hasModule(modules, 'online_ordering')
      ? [{ label: 'Online Orders', icon: 'bi-globe', route: '/app/online-ordering' } as NavItem]
      : []),

    // ── Menu & Promotions ────────────────────────────────────────────────
    {
      label: 'Items',
      icon: 'bi-book',
      route: '/app/menu',
      dividerBefore: true,
      children: [
        { label: 'Categories', icon: 'bi-tag',     route: '/app/menu/categories' },
        { label: 'Modifiers',  icon: 'bi-sliders', route: '/app/menu/modifiers' },
        { label: 'Combos',     icon: 'bi-layers',  route: '/app/menu/combos' },
      ],
    },
    {
      label: 'Discounts',
      icon: 'bi-percent',
      route: '/app/discounts',
    },
    {
      label: 'Gift Cards',
      icon: 'bi-gift',
      route: '/app/gift-cards',
    },

    // ── Guests ────────────────────────────────────────────────────────────
    {
      label: 'Customers',
      icon: 'bi-people',
      route: '/app/customers',
      dividerBefore: true,
    },
    ...(hasModule(modules, 'loyalty')
      ? [{ label: 'Loyalty', icon: 'bi-star', route: '/app/loyalty' } as NavItem]
      : []),

    // ── Business ─────────────────────────────────────────────────────────
    {
      label: 'Reports',
      icon: 'bi-bar-chart-line',
      route: '/app/reports',
      dividerBefore: true,
      children: [
        { label: 'Sales Summary', icon: 'bi-currency-dollar', route: '/app/reports/sales' },
        { label: 'Hourly Sales',  icon: 'bi-clock',           route: '/app/reports/hourly' },
        { label: 'Item Velocity', icon: 'bi-graph-up',        route: '/app/reports/items' },
        { label: 'Labor Cost',    icon: 'bi-person-badge',    route: '/app/reports/labor' },
      ],
    },
    {
      label: 'Staff',
      icon: 'bi-person-badge',
      route: '/app/staff',
      children: [
        { label: 'Team',       icon: 'bi-people',        route: '/app/staff' },
        { label: 'Scheduling', icon: 'bi-calendar-week', route: '/app/staff/scheduling' },
        { label: 'Time Clock', icon: 'bi-clock-history', route: '/app/staff/time-clock' },
      ],
    },
    ...(hasModule(modules, 'inventory')
      ? [
          { label: 'Inventory', icon: 'bi-box-seam', route: '/app/inventory' } as NavItem,
          { label: 'Suppliers', icon: 'bi-truck',    route: '/app/suppliers' } as NavItem,
        ]
      : []),
    {
      label: 'Marketing',
      icon: 'bi-megaphone',
      route: '/app/marketing',
    },

    // ── Config ────────────────────────────────────────────────────────────
    {
      label: 'Settings',
      icon: 'bi-gear',
      route: '/app/settings',
      dividerBefore: true,
      children: [
        { label: 'Hardware',      icon: 'bi-cpu',          route: '/app/settings/hardware' },
        { label: 'Payments',      icon: 'bi-credit-card',  route: '/app/settings/payments' },
        { label: 'Tax & Fees',    icon: 'bi-percent',      route: '/app/settings/tax' },
        { label: 'Notifications', icon: 'bi-bell',         route: '/app/settings/notifications' },
        { label: 'Integrations',  icon: 'bi-plug',         route: '/app/settings/integrations' },
      ],
    },
  ];
}
```

### 5.4 `sidebarAlerts()` — Add KDS Alert for QSR

In `MainLayoutComponent.sidebarAlerts()`, add alongside the existing Orders alert:

```typescript
// KDS — pending prep tickets drive alert severity
const kdsTickets = this.orderService.pendingOrders().length;
if (kdsTickets > 5) {
  alerts['/app/kds'] = 'critical';
} else if (kdsTickets > 0) {
  alerts['/app/kds'] = 'warning';
}
```

---

## 6. NavItem Interface — Confirm Fields Required

The `NavItem` type is defined in `src/app/shared/sidebar/sidebar.ts`. Confirm (or add) the following fields before implementing `buildQuickServiceNav()`:

```typescript
export interface NavItem {
  label: string;
  icon: string;                           // Bootstrap Icons class (e.g., 'bi-house')
  route: string;
  badge?: string | number;                // Red pill badge count — NEW if not present
  children?: NavItem[];                   // Collapsible sub-items
  exact?: boolean;                        // Exact route match for active state
  dividerBefore?: boolean;                // Horizontal rule before item — NEW if not present
  queryParams?: Record<string, string>;   // Query params for routerLink — NEW if not present
  alertSeverity?: AlertSeverity | null;   // Existing field — yellow/red dot
}
```

---

## 7. New Routes — Verification Required

Before implementing, verify which of these routes already exist in `app.routes.ts`. Items marked **[stub needed]** require a minimal placeholder component if absent.

| Route | Status | Notes |
|---|---|---|
| `/quick-service` | ✅ Exists | Full-screen QSR terminal — confirmed in `quick-service/Claude.md` |
| `/app/kds` | Verify | KDS feature exists — route may already be wired |
| `/app/orders/history` | Verify | May already exist as a tab/filter in Orders |
| `/app/discounts` | Verify | Discounts feature exists — confirm route |
| `/app/gift-cards` | Verify | **[stub needed]** if not present |
| `/app/loyalty` | Verify | Loyalty feature exists — confirm route |
| `/app/staff/time-clock` | Verify | Labor module exists — confirm route |
| `/app/reports/hourly` | **[stub needed]** | Hourly sales breakdown; stub with "coming soon" |
| `/app/reports/items` | **[stub needed]** | Item velocity; stub with "coming soon" |
| `/app/settings/hardware` | Verify | Settings sub-route |
| `/app/settings/tax` | Verify | Settings sub-route |
| `/app/menu/categories` | Verify | Menu sub-route |
| `/app/menu/modifiers` | Verify | Menu sub-route |
| `/app/menu/combos` | Verify | Combo feature exists — confirm route |

---

## 8. Mode Comparison Summary

To clarify boundaries between modes, here is how the quick_service nav differs from its siblings:

| Sidebar Item | quick_service | full_service | bar |
|---|---|---|---|
| Administration | ✅ | ✅ | ✅ |
| Orders (+ badge + children) | ✅ | ✅ | ✅ |
| POS → `/quick-service` | ✅ | → `/pos` | → `/pos` |
| Kitchen (KDS) — top-level | ✅ | Via flag only | Via flag only |
| Online Orders | ✅ (if module) | ✅ (if module) | ✅ (if module) |
| Items (+ children) | ✅ | ✅ | ✅ |
| Discounts | ✅ | ✅ | ✅ |
| Gift Cards | ✅ | ✅ | ✅ |
| Customers | ✅ | ✅ | ✅ |
| Loyalty | ✅ (if module) | ✅ (if module) | ✅ (if module) |
| Floor Plan | ❌ | ✅ (if flag) | ✅ (if flag) |
| Bookings | ❌ | ✅ (if module) | ✅ (if module) |
| Bar Tabs | ❌ | ❌ | ✅ |
| Reports (+ QSR children) | ✅ | ✅ | ✅ |
| Staff (+ Time Clock child) | ✅ | ✅ | ✅ |
| Inventory | ✅ (if module) | ✅ (if module) | ✅ (if module) |
| Marketing | ✅ | ✅ | ✅ |
| Settings (+ specific children) | ✅ | ✅ | ✅ |

---

## 9. Implementation Sequence (Claude Code Prompts)

| # | Prompt Scope | Files Touched |
|---|---|---|
| 1 | **PlatformService: granular mode signals** — Add `isQuickServiceMode`, `isFullServiceMode`, `isBarMode` | `platform.ts` |
| 2 | **NavItem model** — Confirm/add `badge`, `dividerBefore`, `queryParams` fields | `sidebar.ts` |
| 3 | **`buildQuickServiceNav()` method** — Full private method in `MainLayoutComponent`; inject nothing new (OrderService already injected) | `main-layout.component.ts` |
| 4 | **`navItems()` branch** — Add `isQuickServiceMode()` check between catering and buildDefaultNav | `main-layout.component.ts` |
| 5 | **`sidebarAlerts()` upgrade** — Add KDS pending tickets alert | `main-layout.component.ts` |
| 6 | **Route verification** — Audit `app.routes.ts`; create stubs for `/app/gift-cards`, `/app/reports/hourly`, `/app/reports/items` if absent | `app.routes.ts` + stub components |

---

## 10. What This Does NOT Change

- **`buildDefaultNav()`** — `full_service` and `bar` continue to use this unchanged
- **`buildCateringNav()`** — Catering nav is a separate branch entirely (see FEATURE-04)
- **`isRestaurantMode`** — Still covers `quick_service` + `full_service` + `bar`; the new signals are additive only
- **POS terminals** — `/quick-service` terminal is a full-screen route outside the main layout; this plan only affects the admin sidebar
- **Alert severity system** — `sidebarAlerts()` is extended, not replaced

---

## 11. Future Considerations

### Bar Mode — Follow-On Doc

Bar mode (`bar`) warrants its own dedicated plan following this same pattern. Key differences from both QSR and full-service:
- Pre-Auth Tabs / Bar Tabs as a top-level item (currently flag-gated in default nav, not prominent)
- Tip Management near the top
- Probably: fewer inventory/supplier links (bars stock differently than restaurants)

### Role-Based Nav Filtering

A future RBAC pass would filter `buildQuickServiceNav()` by staff role:
- **Cashier** — POS, Orders only
- **Kitchen Lead** — KDS, Orders only
- **Shift Manager** — Full nav as above
- **Owner** — Full nav + financial reports

The current implementation shows the full nav to all authenticated users, consistent with how every other mode works today.

---

## 12. Sources

- Square for Restaurants (QSR): https://squareup.com/us/en/point-of-sale/restaurants
- Toast Quick Service: https://pos.toasttab.com/products/quick-service
- OrderStack codebase (read March 2026): `main-layout.component.ts`, `platform.ts`, `quick-service/Claude.md`, `app.routes.ts`
- FEATURE-04: Catering sidebar (companion — same branch pattern applied to catering)
- FEATURE-03: Administration dashboard mode-aware content (QSR KPIs, setup tasks)
