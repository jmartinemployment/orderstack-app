# FEATURE-04 — Catering Mode Administration Sidebar

> **Document version:** March 2026 (v3 — catering-only, ground-up rewrite)
> **Status:** Ready for implementation
> **Scope:** Catering mode sidebar ONLY. Quick Service covered in FEATURE-04b.
> **Prerequisites:** FEATURE-02, FEATURE-02d, FEATURE-03

---

## 1. What Caterers Actually Do

A catering business is a **sales and event production company**, not a restaurant. Their daily workflow:

```
Inquiry → Proposal/Estimate → Contract + Deposit → Event Prep → Delivery/Execution → Final Invoice → Paid
```

They never:
- Take walk-in orders at a counter
- Fire tickets to a kitchen display
- Manage a dining room floor plan
- Run a waitlist

They always:
- Juggle multiple upcoming jobs simultaneously
- Manage client communications and approvals
- Track milestone payments and deposits
- Coordinate delivery logistics to off-site venues
- Build BEOs (Banquet Event Orders) as their source of truth

The sidebar must reflect the caterer's job, not a restaurant operator's job.

---

## 2. Competitive Benchmarks

### Toast Catering & Events

Toast's catering module exposes **three dashboards** at the top level:

| Dashboard | Purpose |
|---|---|
| **Calendar** | All events in month/week/day view; see jobs, tasks, holidays |
| **Orders** | Pipeline: Leads → Confirmed Orders (with status filtering) |
| **Invoices** | Invoice lifecycle: send, deposit, milestones, balance, paid |

Additional sections:
- **Leads** — captured via embeddable website form; tracked through disqualified / active / converted states
- **BEOs** — Banquet Event Orders; generated from confirmed orders; printable prep lists and pack sheets
- **Discussions** — Email thread per event, integrated; no switching to external email
- **Reports** — Revenue, deferred sales (recognized on fulfillment date, not booking date), job performance

**What Toast does NOT include for caterers:**
- Kitchen Display System
- Floor Plan / Table Management
- Reservations / Waitlist
- Any real-time order queue / ticket system

### Square (Caterers)

Square positions catering under its **Invoices** product, not its restaurant POS:

| Section | Items |
|---|---|
| **Invoices & Payments** | Invoices, Estimates, Contracts, Projects |
| **Items** | Item Library (catering menu), Categories, Modifiers |
| **Customers** | Directory, Groups |
| **Reports** | Revenue, Payments, Deposits |
| **Settings** | Invoice branding, Payment terms, Notifications |

Key workflow: **Estimate → accepted by client → auto-converts to Invoice → deposit request → balance**.
Square Invoices supports up to 12 milestone payments per invoice and multi-package estimates (client picks Package A, B, or C).

**What Square does NOT include for caterers:**
- KDS / Kitchen Display
- Order queue / ticket management
- Loyalty / Gift Cards
- Floor Plan

### Summary: What Both Competitors Agree On

The catering sidebar is a **business management and client workflow tool**, organized around:
1. The event pipeline (leads → jobs)
2. The calendar (what's coming up)
3. Client billing (estimates, invoices, deposits, milestones)
4. Production (BEOs, prep lists, delivery)
5. Business reporting (revenue, deferred income)



### 4.1 Complete Sidebar Tree

```
SECTION: Pipeline (the job lifecycle)
├── 🏠  Dashboard        /app/administration      (catering KPIs: open jobs, revenue, upcoming events)
├── 📋  Jobs             /app/catering            (all events — pipeline board + list)
│   ├──  Leads           /app/catering?status=inquiry
│   ├──  Active Jobs     /app/catering?status=active
│   ├──  Completed       /app/catering?status=completed
│   └──  All Jobs        /app/catering?status=all
├── 📅  Calendar         /app/catering/calendar   (month/week/day — all events + tasks)
├── 📄  Proposals        /app/catering/proposals  (estimates awaiting client approval)

SECTION: Billing (dividerBefore: true)
├── 🧾  Invoices         /app/invoicing           (invoice lifecycle)
│   ├──  All Invoices    /app/invoicing
│   ├──  Outstanding     /app/invoicing?status=outstanding
│   └──  Milestones      /app/invoicing/milestones

SECTION: Operations (dividerBefore: true)
├── 👥  Clients          /app/customers           (client directory, job history, notes)
├── 🍽️  Menu             /app/menu                (catering-specific items and packages)
│   ├──  Items           /app/menu?type=catering
│   └──  Packages        /app/menu/packages
├── 🚚  Delivery         /app/catering/delivery   (off-site jobs by date, routing)

SECTION: Business (dividerBefore: true)
├── 📊  Reports          /app/reports
│   ├──  Revenue         /app/reports/revenue
│   ├──  Deferred        /app/reports/deferred    (recognized on event date, not booking date)
│   └──  Job Performance /app/reports/catering
├── 👷  Staff            /app/staff
│   ├──  Team            /app/staff
│   └──  Scheduling      /app/staff/scheduling
├── 📢  Marketing        /app/marketing

SECTION: Config (dividerBefore: true)
└── ⚙️  Settings         /app/settings
    ├──  Business Info   /app/settings/business
    ├──  Invoice Branding /app/settings/branding  (logo, colors, footer, terms)
    ├──  Payment Setup   /app/settings/payments
    └──  Notifications   /app/settings/notifications
```

### 4.2 Items Explicitly Excluded (and Why)

| Item | Why Not in Catering |
|---|---|
| KDS / Kitchen Display | Caterers prep in their commissary kitchen on a schedule — no live ticket firing |
| Floor Plan | Events are at off-site venues, not the caterer's dining room |
| Bookings / Reservations / Waitlist | Catering jobs are individually contracted, not walk-in bookings |
| Discounts | Handled via package pricing and line-item discounts on proposals |
| Gift Cards | Not a catering business model |
| Loyalty | Client relationships managed via CRM (Clients), not points programs |
| Inventory / Suppliers | Future scope; not in current catering feature set |
| Online Orders | Catering orders go through lead form → proposal, not a cart checkout |
| POS terminal link | No counter POS in catering mode |

### 4.3 Badge Counts

| Nav Item | Badge Condition | Signal Source |
|---|---|---|
| Jobs | `inquiry` + `proposal_sent` count (needs action) | `CateringService.pendingJobsCount` |
| Proposals | Sent proposals with no `contractSignedAt` | `CateringService.proposalsAwaitingApproval` |
| Invoices | Overdue + milestones due within 7 days | `InvoiceService.overdueCount` + `CateringService.milestonesComingDue` |

---

## 5. Implementation

### 5.1 `buildCateringNav()` — Complete Replacement

Replace the existing flat 9-item method in `MainLayoutComponent` with:

```typescript
private buildCateringNav(): NavItem[] {
  const pendingJobs   = this.cateringService.pendingJobsCount();
  const pendingProps  = this.cateringService.proposalsAwaitingApproval();
  const dueMilestones = this.cateringService.milestonesComingDue();

  return [

    // ── Pipeline ─────────────────────────────────────────────────────────
    {
      label: 'Dashboard',
      icon: 'bi-speedometer2',
      route: '/app/administration',
      exact: true,
    },
    {
      label: 'Jobs',
      icon: 'bi-briefcase',
      route: '/app/catering',
      badge: pendingJobs > 0 ? pendingJobs : undefined,
      children: [
        { label: 'Leads',       icon: 'bi-funnel',       route: '/app/catering', queryParams: { status: 'inquiry' } },
        { label: 'Active Jobs', icon: 'bi-play-circle',  route: '/app/catering', queryParams: { status: 'active' } },
        { label: 'Completed',   icon: 'bi-check-circle', route: '/app/catering', queryParams: { status: 'completed' } },
        { label: 'All Jobs',    icon: 'bi-list-ul',      route: '/app/catering', queryParams: { status: 'all' } },
      ],
    },
    {
      label: 'Calendar',
      icon: 'bi-calendar-event',
      route: '/app/catering/calendar',
    },
    {
      label: 'Proposals',
      icon: 'bi-file-earmark-text',
      route: '/app/catering/proposals',
      badge: pendingProps > 0 ? pendingProps : undefined,
    },

    // ── Billing ──────────────────────────────────────────────────────────
    {
      label: 'Invoices',
      icon: 'bi-receipt',
      route: '/app/invoicing',
      badge: dueMilestones > 0 ? dueMilestones : undefined,
      dividerBefore: true,
      children: [
        { label: 'All Invoices', icon: 'bi-collection',         route: '/app/invoicing' },
        { label: 'Outstanding',  icon: 'bi-exclamation-circle', route: '/app/invoicing', queryParams: { status: 'outstanding' } },
        { label: 'Milestones',   icon: 'bi-bar-chart-steps',    route: '/app/invoicing/milestones' },
      ],
    },

    // ── Operations ───────────────────────────────────────────────────────
    {
      label: 'Clients',
      icon: 'bi-person-lines-fill',
      route: '/app/customers',
      dividerBefore: true,
    },
    {
      label: 'Menu',
      icon: 'bi-book',
      route: '/app/menu',
      children: [
        { label: 'Items',    icon: 'bi-box',    route: '/app/menu', queryParams: { type: 'catering' } },
        { label: 'Packages', icon: 'bi-layers', route: '/app/menu/packages' },
      ],
    },
    {
      label: 'Delivery',
      icon: 'bi-truck',
      route: '/app/catering/delivery',
    },

    // ── Business ─────────────────────────────────────────────────────────
    {
      label: 'Reports',
      icon: 'bi-bar-chart-line',
      route: '/app/reports',
      dividerBefore: true,
      children: [
        { label: 'Revenue',         icon: 'bi-currency-dollar', route: '/app/reports/revenue' },
        { label: 'Deferred',        icon: 'bi-clock-history',   route: '/app/reports/deferred' },
        { label: 'Job Performance', icon: 'bi-bar-chart',       route: '/app/reports/catering' },
      ],
    },
    {
      label: 'Staff',
      icon: 'bi-person-badge',
      route: '/app/staff',
      children: [
        { label: 'Team',       icon: 'bi-people',        route: '/app/staff' },
        { label: 'Scheduling', icon: 'bi-calendar-week', route: '/app/staff/scheduling' },
      ],
    },
    {
      label: 'Marketing',
      icon: 'bi-megaphone',
      route: '/app/marketing',
    },

    // ── Config ───────────────────────────────────────────────────────────
    {
      label: 'Settings',
      icon: 'bi-gear',
      route: '/app/settings',
      dividerBefore: true,
      children: [
        { label: 'Business Info',    icon: 'bi-building',    route: '/app/settings/business' },
        { label: 'Invoice Branding', icon: 'bi-palette',     route: '/app/settings/branding' },
        { label: 'Payment Setup',    icon: 'bi-credit-card', route: '/app/settings/payments' },
        { label: 'Notifications',    icon: 'bi-bell',        route: '/app/settings/notifications' },
      ],
    },
  ];
}
```

### 5.2 `CateringService` — Badge Count Signals

Add to `catering.service.ts`:

```typescript
/** Leads and sent proposals that need operator action */
readonly pendingJobsCount = computed(() =>
  this.jobs().filter(j =>
    j.status === 'inquiry' || j.status === 'proposal_sent'
  ).length
);

/** Proposals sent to client but not yet approved (no contractSignedAt) */
readonly proposalsAwaitingApproval = computed(() =>
  this.jobs().filter(j =>
    j.status === 'proposal_sent' && !j.contractSignedAt
  ).length
);

/** Milestone payments due within 7 days and not yet paid */
readonly milestonesComingDue = computed(() => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + 7);
  return this.jobs()
    .flatMap(j => j.milestones ?? [])
    .filter(m => !m.paidAt && m.dueDate && new Date(m.dueDate) <= cutoff)
    .length;
});
```

### 5.3 New Routes Required

| Route | Component | Notes |
|---|---|---|
| `/app/catering/calendar` | `CateringCalendarComponent` | Extract from CateringDashboard calendar tab |
| `/app/catering/proposals` | `CateringProposalsComponent` | List `proposal_sent` jobs + proposal actions |
| `/app/catering/delivery` | `CateringDeliveryComponent` | Off-site jobs sorted by event date |
| `/app/invoicing/milestones` | Sub-view of `InvoicingComponent` | Flat list of all milestone payments across jobs |
| `/app/reports/deferred` | Sub-view of `ReportsComponent` | Revenue recognized on event fulfillment date |
| `/app/reports/catering` | Sub-view of `ReportsComponent` | Avg job value, close rate, revenue by event type |
| `/app/menu/packages` | Sub-view of `MenuComponent` | Catering package management (per-person, per-tray) |
| `/app/settings/branding` | Sub-view of `SettingsComponent` | Logo, brand color, invoice footer, payment terms |

---

## 6. Implementation Sequence (Claude Code Prompts)

| # | Scope | Files |
|---|---|---|
| 1 | **CateringService badge signals** | `catering.service.ts` |
| 2 | **`buildCateringNav()` replacement** | `main-layout.component.ts` |
| 3 | **Routes: catering sub-routes** | `app.routes.ts` |
| 4 | **Catering Calendar component stub** | `catering-calendar.component.ts/.html` |
| 5 | **Proposals component stub** | `catering-proposals.component.ts/.html` |
| 6 | **Delivery component stub** | `catering-delivery.component.ts/.html` |
| 7 | **Invoicing: Milestones sub-view** | `invoicing` component |
| 8 | **Reports: Deferred + Job Performance sub-views** | `reports` component |
| 9 | **Menu: Packages sub-view** | `menu` component |
| 10 | **Settings: Invoice Branding panel** | `settings` component |

---

## 7. Sources

- Toast Catering & Events: https://pos.toasttab.com/products/catering-and-events
- Toast Events Manager app (App Store): Features — calendar, leads, invoice sending, deposit review
- Square Invoices (catering workflow): https://squareup.com/us/en/invoices/features
- Square for Restaurants (catering note): https://squareup.com/us/en/restaurants
- FEATURE-02d: CateringJob model, milestones, status lifecycle
