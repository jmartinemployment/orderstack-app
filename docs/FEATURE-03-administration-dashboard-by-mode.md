# Administration Dashboard — Mode-Aware Content Filtering

> **Document version:** March 6, 2026
> **Status:** Ready for implementation
> **Prerequisite:** Catering mode already wired as a `DevicePosMode` (Phase 2 prompt 1 complete)

---

## 1. Problem

The Administration dashboard (`/app/administration`) renders nearly identical content for every business type. The only branching today is in Quick Actions (retail and service get their own set; everything else falls through to the default restaurant actions). Setup Guide tasks, KPI cards, and the subtitle have zero mode awareness.

This means:
- A **caterer** sees "Take payment" (POS), "Set owner PIN", and "Configure your display" (KDS/kiosk) — none apply
- A **quick service** counter sees "Configure your display" framed generically instead of emphasizing KDS — their most critical operational tool
- A **full service** restaurant doesn't see "Set up floor plan" or "Configure bookings" in their setup checklist
- A **bar** doesn't see "Set up tabs" or "Configure pre-authorization" in onboarding
- **KPI labels** say "Orders" and "Avg. Ticket" for every mode, even catering where the concepts are "Jobs" and "Pipeline Value"

**Affected component:** `src/app/features/home/home-dashboard/home-dashboard.ts` (+ `.html`)

**Current mode detection available:** `PlatformService` exposes `isCateringMode()`, `isRetailMode()`, `isServiceMode()`, `isRestaurantMode()`, and `currentDeviceMode()` — all computed signals, ready to consume.

---

## 2. Competitive Reference

### Square

Square tailors the dashboard per business type. Caterers see Invoices, Estimates, Items, Customers, Reports, Settings — no POS, no floor plan, no KDS. Quick service sees a streamlined POS-first experience. Full service surfaces floor plan and open checks prominently. The setup onboarding adjusts per type: caterers get "upload your menu, create your first estimate, link your bank"; restaurants get "add menu items, set up your POS, configure KDS."

Source: https://squareup.com/us/en/restaurants/caterers

### Toast

Toast Catering & Events provides three dashboards: Calendar, Orders/Leads, and Invoices. The restaurant POS dashboard is completely separate with different KPIs (covers, table turns, ticket times). Toast's quick service mode emphasizes speed metrics (avg ticket time, orders per hour). Full service emphasizes table utilization and server performance.

Source: https://pos.toasttab.com/products/catering-and-events

### Common Pattern

Both platforms tailor every dashboard surface to the business mode — setup tasks, quick actions, KPIs, and terminology all change based on what the business actually does day-to-day.

---

## 3. Current State — What Exists

### 3.1 Mode Feature Flags (platform.model.ts)

| Feature | Quick Service | Full Service | Bar | Catering |
|---|---|---|---|---|
| KDS | Yes | Yes | Yes | No |
| Floor Plan | No | Yes | No | No |
| Table Management | No | Yes | No | No |
| Open Checks | No | Yes | Yes | No |
| Pre-Auth Tabs | No | Yes | Yes | No |
| Conversational Modifiers | Yes | No | Yes | No |
| Bookings/Waitlist | No | Yes | No | No |
| Project Tracking | No | No | No | Yes |
| Tipping | Yes | Yes | Yes | No |

### 3.2 Setup Guide Tasks (lines 80-171 in home-dashboard.ts)

All modes see identical tasks:

| ID | Label | Category | QS | FS | Bar | Catering | Retail | Service |
|---|---|---|---|---|---|---|---|---|
| `items` | Create your first menu items | essential | Y | Y | Y | Y (reword) | Y (reword) | Y (reword) |
| `taxes` | Set up taxes | essential | Y | Y | Y | Y | Y | Y |
| `team` | Add team members | essential | Y | Y | Y | Y | Y | Y |
| `hours` | Set your business hours | essential | Y | Y | Y | No | Y | Marginal |
| `display` | Configure your display (KDS, kiosk) | advanced | Y | Y | Y | No | No | No |
| `discounts` | Create discounts | advanced | Y | Y | Y | No | Y | No |
| `hardware` | Set up hardware | advanced | Y | Y | Y | Marginal | Y | Marginal |
| `pin` | Set owner PIN (POS access) | advanced | Y | Y | Y | No | Y | No |

### 3.3 Quick Actions (lines 190-218 in home-dashboard.ts)

| Mode | Current Actions |
|---|---|
| Retail | Scan item, View orders, Add product, View reports |
| Service | New invoice, Bookings, Add service, View reports |
| Default (QS, FS, Bar, Catering) | Take payment, View orders, Add item, View reports |

Quick service, full service, bar, and catering all fall through to the same default.

### 3.4 KPI Cards (lines 116-143 in home-dashboard.html)

All modes show: Net Sales, Orders, Avg. Ticket — no mode awareness.

### 3.5 Setup Guide Subtitle (line 45 in home-dashboard.html)

Hardcoded: "Complete these steps to start taking payments."

---

## 4. Target State — Per-Mode Dashboard Content

### 4.1 Quick Service

**Subtitle:** "Complete these steps to start taking orders."

**Setup Tasks — Essential:**

| ID | Label | Description | Icon | Route |
|---|---|---|---|---|
| `items` | Create your first menu items | Add items, categories, and modifiers | `bi-book` | `/app/menu` |
| `taxes` | Set up taxes | Configure tax rates for your location | `bi-percent` | `/app/settings` |
| `team` | Add team members | Invite staff and set permissions | `bi-people` | `/app/settings` |
| `hours` | Set your business hours | Configure your regular operating hours | `bi-clock` | `/app/settings` |

**Setup Tasks — Advanced:**

| ID | Label | Description | Icon | Route |
|---|---|---|---|---|
| `kds` | Set up kitchen display | Route orders to prep stations in real time | `bi-display` | `/app/settings` |
| `online` | Turn on online ordering | Accept orders from your website | `bi-globe` | `/app/online-ordering` |
| `hardware` | Set up hardware | Tablets, card readers, printers, and more | `bi-cpu` | `/hardware-guide` |
| `pin` | Set owner PIN | Security PIN for POS access and clock-in | `bi-shield-lock` | `/app/settings` |

**Quick Actions:**

| Label | Icon | Route | Color |
|---|---|---|---|
| Take order | `bi-lightning` | `/pos` | `blue` |
| View orders | `bi-receipt` | `/app/orders` | `green` |
| Add item | `bi-plus-circle` | `/app/menu` | `purple` |
| View reports | `bi-graph-up` | `/app/reports` | `amber` |

**KPI Cards:** Net Sales, Orders, Avg. Ticket (same as current default — these labels fit quick service)

---

### 4.2 Full Service

**Subtitle:** "Complete these steps to start serving guests."

**Setup Tasks — Essential:**

| ID | Label | Description | Icon | Route |
|---|---|---|---|---|
| `items` | Create your first menu items | Add items, categories, and modifiers | `bi-book` | `/app/menu` |
| `taxes` | Set up taxes | Configure tax rates for your location | `bi-percent` | `/app/settings` |
| `floor` | Set up your floor plan | Design your dining room layout with tables | `bi-columns-gap` | `/app/floor-plan` |
| `team` | Add team members | Invite servers, hosts, and kitchen staff | `bi-people` | `/app/settings` |
| `hours` | Set your business hours | Configure your regular operating hours | `bi-clock` | `/app/settings` |

**Setup Tasks — Advanced:**

| ID | Label | Description | Icon | Route |
|---|---|---|---|---|
| `kds` | Set up kitchen display | Route orders to prep and expo stations | `bi-display` | `/app/settings` |
| `bookings` | Turn on reservations | Let guests book tables online | `bi-calendar-event` | `/app/bookings` |
| `online` | Turn on online ordering | Accept takeout orders from your website | `bi-globe` | `/app/online-ordering` |
| `hardware` | Set up hardware | Tablets, card readers, printers, and more | `bi-cpu` | `/hardware-guide` |
| `pin` | Set owner PIN | Security PIN for POS access and clock-in | `bi-shield-lock` | `/app/settings` |

**Quick Actions:**

| Label | Icon | Route | Color |
|---|---|---|---|
| Open POS | `bi-tv` | `/pos` | `blue` |
| View orders | `bi-receipt` | `/app/orders` | `green` |
| Floor plan | `bi-columns-gap` | `/app/floor-plan` | `purple` |
| View reports | `bi-graph-up` | `/app/reports` | `amber` |

**KPI Cards:** Net Sales, Orders, Avg. Ticket (same labels — fit full service)

---

### 4.3 Bar

**Subtitle:** "Complete these steps to start serving drinks."

**Setup Tasks — Essential:**

| ID | Label | Description | Icon | Route |
|---|---|---|---|---|
| `items` | Build your drink menu | Add cocktails, beers, wines, and food items | `bi-cup-straw` | `/app/menu` |
| `taxes` | Set up taxes | Configure tax rates for your location | `bi-percent` | `/app/settings` |
| `team` | Add team members | Invite bartenders and staff | `bi-people` | `/app/settings` |
| `hours` | Set your business hours | Configure your regular operating hours | `bi-clock` | `/app/settings` |

**Setup Tasks — Advanced:**

| ID | Label | Description | Icon | Route |
|---|---|---|---|---|
| `kds` | Set up kitchen display | Route food orders to your kitchen | `bi-display` | `/app/settings` |
| `tabs` | Configure tab pre-auth | Hold a card on file to open tabs automatically | `bi-credit-card` | `/app/settings` |
| `hardware` | Set up hardware | Tablets, card readers, printers, and more | `bi-cpu` | `/hardware-guide` |
| `pin` | Set owner PIN | Security PIN for POS access and clock-in | `bi-shield-lock` | `/app/settings` |

**Quick Actions:**

| Label | Icon | Route | Color |
|---|---|---|---|
| Open tabs | `bi-cup-straw` | `/pos` | `blue` |
| View orders | `bi-receipt` | `/app/orders` | `green` |
| Add item | `bi-plus-circle` | `/app/menu` | `purple` |
| View reports | `bi-graph-up` | `/app/reports` | `amber` |

**KPI Cards:** Net Sales, Open Tabs (count of open checks from OrderService), Avg. Ticket

**KPI change:** Replace "Orders" with "Open Tabs" — the metric a bar operator checks constantly. Data source: `OrderService.activeOrderCount()` (already injected in main-layout for sidebar alerts).

---

### 4.4 Catering

**Subtitle:** "Complete these steps to start booking events."

**Setup Tasks — Essential:**

| ID | Label | Description | Icon | Route |
|---|---|---|---|---|
| `menu` | Build your catering menu | Add items with per-person or per-tray pricing | `bi-book` | `/app/menu` |
| `taxes` | Set up taxes | Configure tax rates for your location | `bi-percent` | `/app/settings` |
| `estimate` | Create your first estimate | Send a proposal to land your first job | `bi-file-earmark-text` | `/app/catering` |
| `team` | Add team members | Invite staff and set permissions | `bi-people` | `/app/settings` |

**Setup Tasks — Advanced:**

| ID | Label | Description | Icon | Route |
|---|---|---|---|---|
| `invoicing` | Set up invoicing | Configure deposit schedules and payment reminders | `bi-receipt` | `/app/invoicing` |
| `branding` | Customize invoice branding | Add your logo and brand colors to proposals | `bi-palette` | `/app/settings` |
| `hardware` | Set up hardware | Tablets for on-site event management | `bi-cpu` | `/hardware-guide` |

**Removed for catering:**
- `hours` — caterers work per-event, not fixed hours
- `display` — no KDS, customer display, or kiosk
- `discounts` — caterers use package tiers, not POS discounts
- `pin` — no POS terminal to secure

**Quick Actions:**

| Label | Icon | Route | Color |
|---|---|---|---|
| New job | `bi-plus-circle` | `/app/catering` | `blue` |
| Create invoice | `bi-file-earmark-text` | `/app/invoicing` | `green` |
| View calendar | `bi-calendar-event` | `/app/catering` | `purple` |
| View reports | `bi-graph-up` | `/app/reports` | `amber` |

**KPI Cards:**

| Label | Value Source | Why |
|---|---|---|
| Pipeline Value | Sum of `totalCents` for active (non-cancelled, non-completed) jobs | Caterers think in total booked revenue |
| Outstanding | Sum of `totalCents - paidCents` for active jobs | How much is still owed across all jobs |
| Jobs This Month | Count of jobs with `fulfillmentDate` in current month | Upcoming workload at a glance |

No day-over-day comparison arrows — pipeline metrics change over weeks, not hours.

**Data source:** `CateringService.pipelineStats()` computed signal (new).

---

### 4.5 Retail (already partially done)

Quick Actions already branch for retail. Add mode-aware setup tasks:

**Subtitle:** "Complete these steps to start selling."

**Setup Tasks — Essential:**

| ID | Label | Description | Icon | Route |
|---|---|---|---|---|
| `items` | Add your first products | Add products, variations, and pricing | `bi-grid-3x3-gap` | `/app/retail/catalog` |
| `taxes` | Set up taxes | Configure tax rates for your location | `bi-percent` | `/app/settings` |
| `team` | Add team members | Invite staff and set permissions | `bi-people` | `/app/settings` |
| `hours` | Set your business hours | Configure your regular store hours | `bi-clock` | `/app/settings` |

**Setup Tasks — Advanced:**

| ID | Label | Description | Icon | Route |
|---|---|---|---|---|
| `barcode` | Set up barcode scanning | Speed up checkout with product barcodes | `bi-upc-scan` | `/app/settings` |
| `ecommerce` | Turn on online store | Start selling products online | `bi-globe` | `/app/retail/ecommerce` |
| `inventory` | Configure inventory alerts | Get notified when stock runs low | `bi-box-seam` | `/app/retail/inventory` |
| `hardware` | Set up hardware | Tablets, scanners, printers, and more | `bi-cpu` | `/hardware-guide` |
| `pin` | Set owner PIN | Security PIN for POS access and clock-in | `bi-shield-lock` | `/app/settings` |

**Quick Actions:** Already implemented (Scan item, View orders, Add product, View reports)

**KPI Cards:** Net Sales, Orders, Avg. Ticket (fit retail as-is)

---

### 4.6 Service (already partially done)

Quick Actions already branch for service. Add mode-aware setup tasks:

**Subtitle:** "Complete these steps to start booking clients."

**Setup Tasks — Essential:**

| ID | Label | Description | Icon | Route |
|---|---|---|---|---|
| `items` | Create your first services | Set up your service offerings and pricing | `bi-clipboard-check` | `/app/menu` |
| `taxes` | Set up taxes | Configure tax rates for your location | `bi-percent` | `/app/settings` |
| `team` | Add team members | Invite staff and set permissions | `bi-people` | `/app/settings` |

**Setup Tasks — Advanced:**

| ID | Label | Description | Icon | Route |
|---|---|---|---|---|
| `invoicing` | Set up invoicing | Configure invoice templates and reminders | `bi-file-earmark-text` | `/app/invoicing` |
| `bookings` | Turn on online booking | Let clients schedule appointments | `bi-calendar-check` | `/app/bookings` |
| `hardware` | Set up hardware | Tablets and card readers | `bi-cpu` | `/hardware-guide` |

**Removed for service:** `hours` (appointment-based), `display` (no KDS), `discounts` (service pricing), `pin` (no POS)

**Quick Actions:** Already implemented (New invoice, Bookings, Add service, View reports)

**KPI Cards:** Net Sales, Appointments (count from BookingService if available, else Orders), Avg. Invoice

---

## 5. Implementation Plan

### 5.1 File Changes

| # | File | What Changes |
|---|---|---|
| 1 | `home-dashboard.ts` | Inject `CateringService` and `OrderService`; add `currentMode` signal; refactor `setupTasks()` into per-mode builder methods; refactor `quickActions()` with catering, QS, FS, bar branches; add `kpiConfig()` computed for mode-aware labels and values |
| 2 | `home-dashboard.html` | Use `kpiConfig()` for KPI labels/values instead of hardcoded cards; use `setupSubtitle()` computed for the subtitle text |
| 3 | `catering.service.ts` | Add `pipelineStats()` computed signal |

### 5.2 Architecture — Builder Pattern

Rather than a growing chain of `if/else` blocks, use a mode-keyed builder map:

```typescript
private readonly currentMode = computed(() => this.platform.currentDeviceMode());

private readonly setupTaskBuilders: Record<string, () => SetupTask[]> = {
  catering: () => this.buildCateringTasks(),
  quick_service: () => this.buildQuickServiceTasks(),
  full_service: () => this.buildFullServiceTasks(),
  bar: () => this.buildBarTasks(),
  retail: () => this.buildRetailTasks(),
  services: () => this.buildServiceTasks(),
};

readonly setupTasks = computed<SetupTask[]>(() => {
  const mode = this.currentMode();
  const builder = this.setupTaskBuilders[mode];
  return builder ? builder() : this.buildDefaultTasks();
});
```

Same pattern for `quickActions()` and `kpiConfig()`.

Each builder method is a simple array return — no branching logic inside. The `done` state comes from the existing `_completedTasks` signal and `_menuHasCategories` signal, passed as needed.

### 5.3 Step-by-Step

**Step 1 — CateringService: add pipelineStats() signal**

```typescript
readonly pipelineStats = computed(() => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const activeJobs = this.jobs().filter(j => j.status !== 'cancelled' && j.status !== 'completed');

  const pipelineValueCents = activeJobs.reduce((sum, j) => sum + j.totalCents, 0);
  const outstandingCents = activeJobs.reduce((sum, j) => sum + (j.totalCents - j.paidCents), 0);
  const jobsThisMonth = this.jobs().filter(j => {
    const d = new Date(j.fulfillmentDate);
    return d >= monthStart && d <= monthEnd && j.status !== 'cancelled';
  }).length;

  return { pipelineValueCents, outstandingCents, jobsThisMonth };
});
```

**Step 2 — HomeDashboard: inject services, add mode signal**

```typescript
private readonly cateringService = inject(CateringService);
private readonly orderService = inject(OrderService);
readonly currentMode = computed(() => this.platform.currentDeviceMode());
readonly isCateringMode = this.platform.isCateringMode;
readonly pipelineStats = computed(() => this.cateringService.pipelineStats());
```

**Step 3 — HomeDashboard: add setupSubtitle() computed**

```typescript
readonly setupSubtitle = computed(() => {
  const subtitles: Record<string, string> = {
    quick_service: 'Complete these steps to start taking orders.',
    full_service: 'Complete these steps to start serving guests.',
    bar: 'Complete these steps to start serving drinks.',
    catering: 'Complete these steps to start booking events.',
    retail: 'Complete these steps to start selling.',
    services: 'Complete these steps to start booking clients.',
  };
  return subtitles[this.currentMode()] ?? 'Complete these steps to start taking payments.';
});
```

**Step 4 — HomeDashboard: refactor setupTasks() into per-mode builders**

Replace the single `setupTasks` computed with the builder map pattern from 5.2. Each builder returns the tasks from section 4.x, using `this._completedTasks()` and `this._menuHasCategories()` for done-state.

**Step 5 — HomeDashboard: refactor quickActions() with all mode branches**

Add `catering`, `quick_service`, `full_service`, and `bar` cases before the existing `retail` and `service` checks. Each returns the 4 actions from section 4.x.

**Step 6 — HomeDashboard: add kpiConfig() computed**

```typescript
interface KpiCard {
  label: string;
  value: number;
  format: 'currency' | 'number';
  changePercent?: number;
}

readonly kpiConfig = computed<KpiCard[]>(() => {
  if (this.isCateringMode()) {
    const stats = this.pipelineStats();
    return [
      { label: 'Pipeline Value', value: stats.pipelineValueCents / 100, format: 'currency' },
      { label: 'Outstanding', value: stats.outstandingCents / 100, format: 'currency' },
      { label: 'Jobs This Month', value: stats.jobsThisMonth, format: 'number' },
    ];
  }

  const mode = this.currentMode();
  const sales = this._todayNetSales();
  const orders = this._todayOrderCount();
  const avgTicket = this.todayAvgTicket();

  if (mode === 'bar') {
    return [
      { label: 'Net Sales', value: sales, format: 'currency', changePercent: this.salesChangePercent() },
      { label: 'Open Tabs', value: this.orderService.activeOrderCount(), format: 'number' },
      { label: 'Avg. Ticket', value: avgTicket, format: 'currency' },
    ];
  }

  // Default: QS, FS, retail, service, standard
  return [
    { label: 'Net Sales', value: sales, format: 'currency', changePercent: this.salesChangePercent() },
    { label: 'Orders', value: orders, format: 'number', changePercent: this.ordersChangePercent() },
    { label: 'Avg. Ticket', value: avgTicket, format: 'currency' },
  ];
});
```

**Step 7 — Template: use computed signals**

Replace hardcoded subtitle with `{{ setupSubtitle() }}`.

Replace hardcoded KPI cards with a `@for` loop over `kpiConfig()`:

```html
<div class="kpi-grid">
  @for (kpi of kpiConfig(); track kpi.label) {
    <div class="kpi-card">
      <span class="kpi-label">{{ kpi.label }}</span>
      <span class="kpi-value">
        @if (kpi.format === 'currency') {
          {{ formatCurrency(kpi.value) }}
        } @else {
          {{ kpi.value }}
        }
      </span>
      @if (kpi.changePercent !== undefined && kpi.changePercent !== 0) {
        <span class="kpi-change" [class.positive]="kpi.changePercent >= 0" [class.negative]="kpi.changePercent < 0">
          <i class="bi" [class.bi-arrow-up-short]="kpi.changePercent >= 0" [class.bi-arrow-down-short]="kpi.changePercent < 0"></i>
          {{ formatPercent(kpi.changePercent) }} vs yesterday
        </span>
      }
    </div>
  }
</div>
```

---

## 6. What This Does NOT Change

- **Sidebar navigation** — already handled by `buildCateringNav()` / `buildDefaultNav()` in `main-layout.component.ts`
- **Performance section header** — "Today's Performance" stays (neutral across modes)
- **PWA install banner** — universal
- **Setup task localStorage persistence** — key stays `os-setup-tasks`; mode-specific task IDs (e.g., `kds`, `floor`, `tabs`, `estimate`) won't collide across modes
- **Analytics API calls** — `loadTodayStats()` still fires for all modes; catering KPIs come from `CateringService` instead

---

## 7. Summary Matrix

| Dashboard Element | Quick Service | Full Service | Bar | Catering | Retail | Service |
|---|---|---|---|---|---|---|
| Subtitle | "taking orders" | "serving guests" | "serving drinks" | "booking events" | "selling" | "booking clients" |
| Essential tasks | 4 | 5 (+floor plan) | 4 | 4 | 4 | 3 |
| Advanced tasks | 4 (+KDS, online) | 5 (+KDS, bookings, online) | 4 (+KDS, tabs) | 3 (+invoicing, branding) | 5 (+barcode, ecom, inventory) | 3 (+invoicing, bookings) |
| QA: Primary | Take order | Open POS | Open tabs | New job | Scan item | New invoice |
| QA: Secondary | View orders | View orders | View orders | Create invoice | View orders | Bookings |
| QA: Tertiary | Add item | Floor plan | Add item | View calendar | Add product | Add service |
| QA: Reports | View reports | View reports | View reports | View reports | View reports | View reports |
| KPI 1 | Net Sales | Net Sales | Net Sales | Pipeline Value | Net Sales | Net Sales |
| KPI 2 | Orders | Orders | Open Tabs | Outstanding | Orders | Orders |
| KPI 3 | Avg. Ticket | Avg. Ticket | Avg. Ticket | Jobs This Month | Avg. Ticket | Avg. Ticket |
