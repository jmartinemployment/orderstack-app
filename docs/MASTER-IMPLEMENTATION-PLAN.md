# OrderStack — Master Implementation Plan
> **Date:** March 7, 2026  
> **Supersedes:** All individual FEATURE docs as execution guides  
> **Authority:** CLAUDE.md is absolute. Every step in this plan complies with it.

---

## CLAUDE.md Compliance — Active on Every Step

1. **Full file rewrites only.** When a file's structure changes, the entire file is rewritten in one pass. No targeted patches, no `str_replace`, no line replacements.
2. **Square first.** Every UI decision cites how Square handles it before specifying the implementation. No inventing, no guessing.
3. **Path aliases everywhere.** All imports use `@models/*`, `@services/*`, `@shared/*`, `@environments/*`. No relative imports across feature boundaries.
4. **`ng build` gate after every step.** Run `ng build` in the frontend repo and confirm zero errors before proceeding. Backend steps gate on `npx tsc --noEmit` in the backend repo.
5. **No unsolicited features.** Implement only what is specified here.
6. **Ask before deciding.** Any architectural question not covered here requires stopping and asking before proceeding.
7. **`os-` prefix.** All component selectors use `os-` prefix.
8. **Standalone components.** No NgModules. All lazy-loaded via `loadComponent()`.
9. **Signal-based state.** All new service state uses Angular signals. No `BehaviorSubject`.
10. **OnPush everywhere.** `ChangeDetectionStrategy.OnPush` on every component.

---

## Already Done — Do Not Rebuild

Verified against codebase March 7, 2026.

| Item | Evidence |
|---|---|
| `DevicePosMode: 'catering'` + full `CATERING_MODE` flags | `platform.model.ts` |
| `DEVICE_POS_MODE_CATALOG` catering entry | `platform.model.ts` |
| `CateringJob` model (all Phase 2 fields) | `catering.model.ts` |
| `CateringService` (all methods + computed signals) | `catering.service.ts` |
| Backend catering routes (22 endpoints) | `catering.routes.ts` |
| `buildCateringNav()` in `MainLayoutComponent` | `main-layout.component.ts` |
| Public catering routes: proposal, portal, inquiry | `app.routes.ts` |
| Authenticated catering routes: dashboard, job/:id, beo, reports, prep-list, calendar, proposals, delivery | `app.routes.ts` |
| All 9 catering components: Dashboard, JobDetail, Beo, Reports, PrepList, Calendar, Proposal (public), GuestPortal (public), LeadForm (public) | `src/app/features/catering/` |

---

## Implementation Steps — Dependency Order

---

### ~~Step 1 — Backend: Add `menuType` and `cateringPricingModel` to MenuItem~~

**Square research:** Square Catering tags menu items with a pricing type (Per Portion, Per Tray, Flat Fee) when the item belongs to a catering menu category. This tagging is what separates catering items from POS items in the item picker. Source: https://squareup.com/us/en/catering

**Why first:** Every catering package builder, proposal, and BEO depends on being able to filter menu items to `menuType === 'catering'`. Nothing downstream works without this field existing.

**Backend — `prisma/schema.prisma`:** Full file rewrite. Add to `MenuItem` model:
```
menuType             String   @default("standard") @map("menu_type")
cateringPricingModel String?  @map("catering_pricing_model")
```
Valid values: `menuType` = `"standard" | "catering"`. `cateringPricingModel` = `"per_person" | "per_tray" | "flat" | null`.

Note: `MenuItem` already has a `cateringPricing Json` column. This step adds a separate `menuType` discriminator field and a `cateringPricingModel` string. Both new columns exist alongside the existing `cateringPricing` JSON.

**Backend — Prisma migration:**
```
npx prisma migrate dev --name add_menu_item_catering_type
```

**Backend — menu routes file (read first):** Full file rewrite. Add:
- Query param support: `?menuType=catering` on the item list endpoint — filter by `menuType` when the param is present.
- Zod validation on item create/update: `menuType` must be `"standard"` or `"catering"`. `cateringPricingModel` must be `"per_person" | "per_tray" | "flat"` or null. Reject any other string with a 400.

**Frontend — `src/app/models/menu.model.ts`:** Read file first. Full file rewrite. Add to `MenuItem` interface:
```typescript
menuType?: 'standard' | 'catering';
cateringPricingModel?: 'per_person' | 'per_tray' | 'flat' | null;
```

**Frontend — Menu item form component (read first):** Full file rewrite of the form component. When `menuType === 'catering'`, show a "Pricing Model" select field (Per Person / Per Tray / Flat Fee). This field is hidden when `menuType === 'standard'`.

**Backend build gate: `npx tsc --noEmit` in the backend repo — must pass before Step 2.**
**Frontend build gate: `ng build` — must pass before Step 2.**

---

### ~~Step 2 — Backend: Add Branding Defaults to Restaurant Model~~

**Why now:** Step 15 (settings stub upgrades) and the email templates in Step 3 both need to know these fields exist on the backend. Done early so all downstream components can reference the real data shape.

**Backend — `prisma/schema.prisma`:** Full file rewrite. Add to `Restaurant` model:
```
defaultBrandingLogoUrl String?  @map("default_branding_logo_url")
defaultBrandingColor   String?  @map("default_branding_color")
defaultInvoiceNotes    String?  @map("default_invoice_notes")
```

**Backend — Prisma migration:**
```
npx prisma migrate dev --name add_restaurant_branding_defaults
```

**Backend — restaurant/merchant routes (read first):** Full file rewrite of the merchant GET and PATCH endpoints to expose these three fields in the response and accept them on PATCH.

**Backend build gate: `npx tsc --noEmit` — must pass before Step 3.**

---

### ~~Step 3 — Backend: Resend Email Service~~

**Square research:** Square Catering sends proposal emails with the client's name in the subject, a direct proposal link, and the business's brand color as the email header background. Invoice emails show event title, outstanding amount, and a "Pay Now" button. Source: https://squareup.com/us/en/catering

**Pre-flight DNS note:** Resend requires a verified sender domain. The `from` address used in all emails must be `noreply@getorderstack.com`. This requires adding the Resend DNS TXT and DKIM records to the `getorderstack.com` domain before any email can be sent in production. Add this to the environment setup checklist. The code will compile and deploy without this, but emails will fail at send time until DNS is verified.

**Backend — create `src/services/email.service.ts`** (new file, not a rewrite):

Three exported functions (not a class):
- `sendProposal(job, proposalUrl, merchantName, brandingColor)` — subject: `"[merchantName] has sent you a proposal"`. Body shows event name, date, headcount, and a prominent CTA button linking to `proposalUrl`.
- `sendInvoice(job, invoiceUrl, merchantName, brandingColor)` — subject: `"Invoice from [merchantName]"`. Body shows event name, amount due, due date, CTA button.
- `sendMilestoneReminder(job, milestone, merchantName)` — subject: `"Payment reminder: [milestone.label] for [job.title]"`. Body shows amount, due date, event date.

All three POST to `https://api.resend.com/emails` using:
```typescript
{
  from: 'noreply@getorderstack.com',
  to: [job.clientEmail],
  subject: ...,
  html: ...,
}
```
with `Authorization: Bearer ${process.env.RESEND_API_KEY}`.

HTML templates are inline string interpolation. Use `brandingColor` for the header band background; fall back to `#2563eb` if null. No external template engine.

**Backend — `src/app/catering.routes.ts`:** Full file rewrite. Call `sendProposal()` on the `POST /merchant/:id/catering/events/:jobId/proposal` endpoint after the token is created. Wrap the email call in try-catch — failure to send email must not fail the API response. Log the error and return success to the caller.

**Environment variable:** `RESEND_API_KEY` — add to `render.yaml` as a secret variable reference. Do not commit the value.

**Backend build gate: `npx tsc --noEmit` — must pass before Step 4.**

---

### ~~Step 4 — Backend: Milestone Reminder Cron~~

**Depends on:** Step 3 (email service must exist).

**Backend — create `src/jobs/milestone-reminders.ts`** (new file, placed in existing `/src/jobs/` directory alongside `marketplace-status-sync.ts` and `print-job-cleanup.ts`):

```typescript
import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { sendMilestoneReminder } from '../services/email.service';

const prisma = new PrismaClient();

export function startMilestoneReminderCron(): void {
  cron.schedule('0 9 * * *', async () => { /* handler */ });
}
```

Handler logic:
- Query: find all `CateringEvent` records where status is not `'cancelled'` and not `'completed'`, and `clientEmail` is not null.
- For each job, parse `milestones` JSON array.
- For each milestone where `dueDate <= today + 3 days` AND `paidAt` is null AND `reminderSentAt` is null:
  - Call `sendMilestoneReminder(job, milestone, merchantName)`.
  - Write `reminderSentAt = new Date().toISOString()` into that milestone object within the JSON array.
  - Save the updated `milestones` JSON back to the database via `prisma.cateringEvent.update`.

Fetch `merchantName` by joining to `Restaurant.name` on `restaurantId`.

**Backend — server entry point (read `src/main.ts` first):** Full file rewrite. Import `startMilestoneReminderCron` and call it on startup alongside the existing cron/job registrations.

**Backend build gate: `npx tsc --noEmit` — must pass before Step 5.**

---

### ~~Step 5 — Frontend: Add Granular Mode Signals to `PlatformService`~~

**Why now:** Steps 7 and 8 both consume these signals. They must exist before either layout or dashboard work begins.

**Read `src/app/services/platform.ts` before rewriting.**

**File to fully rewrite:** `src/app/services/platform.ts`

Add three computed signals. These are purely additive — do not remove or alter any existing signal:
```typescript
readonly isQuickServiceMode = computed(() => this._currentDeviceMode() === 'quick_service');
readonly isFullServiceMode  = computed(() => this._currentDeviceMode() === 'full_service');
readonly isBarMode          = computed(() => this._currentDeviceMode() === 'bar');
```

`isRestaurantMode` remains unchanged — it still covers all three restaurant modes.

**`ng build` gate — must pass before Step 6.**

---

### ~~Step 6 — Frontend: Setup Wizard Step 2 — Four-Card Mode Grid~~

**Square research:** Square's onboarding "What type of business do you run?" presents large icon cards — one per business type. Selecting a card sets the business type immediately. No search box, no scrollable list. The card approach reduces decision time and eliminates the mismatch between a 100-item list and what operators actually call their business. Source: https://squareup.com/us/en/start

**Scope note (intentional):** FEATURE-02d §5 explicitly specifies a 2×2 grid with four cards: Quick Service, Full Service, Bar & Brewery, and Catering. This intentionally narrows the setup wizard to food and beverage operators, which is the current target market. Retail, services, and bookings operators who need to onboard will continue to use the existing `/business-type` route (`business-type-select` component), which is unaffected by this step. Do not modify `business-type-select`.

**Read `src/app/features/onboarding/setup-wizard/setup-wizard.ts` and `setup-wizard.html` in full before writing anything.**

**Files to fully rewrite:**
- `src/app/features/onboarding/setup-wizard/setup-wizard.ts`
- `src/app/features/onboarding/setup-wizard/setup-wizard.html`
- `src/app/features/onboarding/setup-wizard/setup-wizard.scss`

**What changes in Step 2 only:**

Replace the business category search input and scrollable category list with a 2×2 card grid. Add to the component:

```typescript
const MODE_CARDS = [
  { mode: 'quick_service' as DevicePosMode, label: 'Quick Service', subtext: 'Counter, takeout, food truck', icon: 'bi-lightning-charge' },
  { mode: 'full_service'  as DevicePosMode, label: 'Full Service',  subtext: 'Sit-down, table management',  icon: 'bi-shop' },
  { mode: 'bar'           as DevicePosMode, label: 'Bar & Brewery', subtext: 'Tabs, drinks, nightlife',     icon: 'bi-cup-straw' },
  { mode: 'catering'      as DevicePosMode, label: 'Catering',      subtext: 'Events, proposals, milestone payments', icon: 'bi-truck' },
];

private readonly _selectedPosMode = signal<DevicePosMode | null>(null);

selectMode(mode: DevicePosMode): void {
  this._selectedPosMode.set(mode);
  // advance to step 3
}
```

Step 2 template renders `MODE_CARDS` in a `d-grid` 2×2 layout as described in FEATURE-02d §5.

**Remove from the wizard component logic** (not from `platform.model.ts` or any model file): `BUSINESS_TYPE_MODE_MAP`, `BUSINESS_TYPE_SEARCH_ALIASES`, `filteredBusinessTypes()`, `selectBusinessType()`, `getVerticalLabel()`, and any cuisine/revenue-range signal methods used only by the old Step 2 flow. The `BUSINESS_CATEGORIES` constant remains in `platform.model.ts`.

All other wizard steps remain completely unchanged.

**`ng build` gate — must pass before Step 7.**

---

### ~~Step 7 — Frontend: Quick Service Sidebar (`buildQuickServiceNav()`)~~

**Square research:** Square QSR sidebar treats Orders and KDS as co-equal top-level items because the QSR workflow loop is: order arrives (Orders) → prep starts (KDS) → ready → pickup. KDS is not buried in settings. Loyalty appears higher in the QSR sidebar than in full-service because repeat-visit frequency matters more to counter operators. Source: https://squareup.com/us/en/point-of-sale/restaurants

**Depends on:** Step 5 (granular mode signals).

**File to fully rewrite:** `src/app/layouts/main-layout.component.ts`

**Four changes in one rewrite:**

**1. Add `isQuickServiceMode` local reference:**
```typescript
private readonly isQuickServiceMode = this.platform.isQuickServiceMode;
```

**2. Update `navItems()` branch logic:**
```typescript
const items: NavItem[] = catering
  ? this.buildCateringNav()
  : this.isQuickServiceMode()
    ? this.buildQuickServiceNav()
    : this.buildDefaultNav(retail, service, restaurant, mode, flags, modules);
```

`full_service` and `bar` continue using `buildDefaultNav()` — no change to those paths.

**3. Add `buildQuickServiceNav()` private method.** The complete sidebar tree is:

```
Operations
  Administration        /app/administration       (exact match)
  Orders                /app/orders               badge: activeOrderCount()
    children:
      Open              /app/orders               queryParams: {status:'open'}
      In Progress       /app/orders               queryParams: {status:'in_progress'}
      Ready             /app/orders               queryParams: {status:'ready'}
      Order History     /app/orders/history
  POS                   /quick-service
  Kitchen (KDS)         /app/kds                  badge: pendingOrders().length  [only if flags.enableKds]
  Online Orders         /app/online-ordering                                      [only if 'online_ordering' module]

Menu & Promotions       (dividerBefore: true)
  Items                 /app/menu
    children:
      Categories        /app/menu/categories
      Modifiers         /app/menu/modifiers
      Combos            /app/menu/combos
  Discounts             /app/discounts
  Gift Cards            /app/gift-cards

Guests                  (dividerBefore: true)
  Customers             /app/customers
  Loyalty               /app/loyalty              [only if 'loyalty' module]

Business                (dividerBefore: true)
  Reports               /app/reports
    children:
      Sales Summary     /app/reports/sales
      Hourly Sales      /app/reports/hourly
      Item Velocity     /app/reports/items
      Labor Cost        /app/reports/labor
  Staff                 /app/staff
    children:
      Team              /app/staff
      Scheduling        /app/staff/scheduling
      Time Clock        /app/staff/time-clock
  Inventory             /app/inventory            [only if 'inventory' module]
  Suppliers             /app/suppliers            [only if 'inventory' module]
  Marketing             /app/marketing

Config                  (dividerBefore: true)
  Settings              /app/settings
    children:
      Hardware          /app/settings/hardware
      Payments          /app/settings/payments
      Tax & Fees        /app/settings/tax
      Notifications     /app/settings/notifications
      Integrations      /app/settings/integrations
```

**4. Add KDS alert to `sidebarAlerts()`:**
```typescript
const kdsTickets = this.orderService.pendingOrders().length;
if (kdsTickets > 5)      alerts['/app/kds'] = 'critical';
else if (kdsTickets > 0) alerts['/app/kds'] = 'warning';
```

**`ng build` gate — must pass before Step 8.**

---

### ~~Step 8 — Frontend: Home Dashboard Mode-Aware Content~~

**Square research:** Square Catering dashboard replaces sales KPIs with pipeline metrics — Pipeline Value, Outstanding, Events This Month. Quick service shows Net Sales / Orders / Avg Ticket with an emphasis on speed. The setup checklist items change per mode — a caterer sees "Create your first estimate" not "Set up KDS." Source: https://squareup.com/us/en/restaurants/caterers

**Depends on:** Step 5 (mode signals).

**Reference note:** This step implements the mode-specific content specified in FEATURE-03 (setup tasks §4.1–4.6, subtitles §5.3, and quick actions §4.x tables). Do not archive or delete `FEATURE-03` until this step is completed and verified. The mode subtitles and task lists must be sourced from that document during implementation. Once Step 8 is complete and the content is live in the component, FEATURE-03 may be archived.

**Sub-step 8a — `src/app/services/catering.service.ts`:** Read file first. Full file rewrite. Add:
```typescript
readonly pipelineStats = computed(() => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const active = this._jobs().filter(j => j.status !== 'cancelled' && j.status !== 'completed');
  return {
    pipelineValueCents: active.reduce((s, j) => s + j.totalCents, 0),
    outstandingCents:   active.reduce((s, j) => s + (j.totalCents - j.paidCents), 0),
    jobsThisMonth:      this._jobs().filter(j => {
      const d = new Date(j.fulfillmentDate);
      return d >= monthStart && d <= monthEnd && j.status !== 'cancelled';
    }).length,
  };
});
```

**Sub-step 8b — `src/app/features/home/home-dashboard/home-dashboard.ts`:** Read file first. Full file rewrite. Implement:

- Inject `CateringService` and `OrderService`
- `readonly currentMode = computed(() => this.platform.currentDeviceMode())`
- `readonly isCateringMode = this.platform.isCateringMode`
- `readonly setupSubtitle = computed(...)` — per-mode subtitles as specified in FEATURE-03 §5.3
- Builder map pattern for `setupTasks`:
  ```typescript
  private readonly taskBuilders: Record<string, () => SetupTask[]> = {
    catering:      () => this.buildCateringTasks(),
    quick_service: () => this.buildQuickServiceTasks(),
    full_service:  () => this.buildFullServiceTasks(),
    bar:           () => this.buildBarTasks(),
    retail:        () => this.buildRetailTasks(),
    services:      () => this.buildServiceTasks(),
  };
  readonly setupTasks = computed(() =>
    (this.taskBuilders[this.currentMode()] ?? (() => this.buildDefaultTasks()))()
  );
  ```
  Each builder returns the exact task list for that mode as specified in FEATURE-03 §4.1–4.6.
- `quickActions()` computed — catering, QS, FS, bar, retail, service cases as specified in FEATURE-03 quick actions tables.
- `kpiConfig()` computed returning `KpiCard[]`:
  - Catering: Pipeline Value, Outstanding, Jobs This Month (from `cateringService.pipelineStats()`)
  - Bar: Net Sales, Open Tabs (`orderService.activeOrderCount()`), Avg Ticket
  - All other modes: Net Sales, Orders, Avg Ticket

**Sub-step 8c — `src/app/features/home/home-dashboard/home-dashboard.html`:** Full file rewrite.
- Replace hardcoded subtitle with `{{ setupSubtitle() }}`
- Replace hardcoded KPI cards with `@for (kpi of kpiConfig(); track kpi.label)` loop
- Each KPI card renders `kpi.label`, formats value by `kpi.format` (`'currency' | 'number'`), and optionally renders a change-percent indicator

**`ng build` gate — must pass before Step 9.**

---

### ~~Step 9 — Frontend: `CateringProposalsComponent` — Full Implementation~~

**Square research:** Square's "Estimates" list (their equivalent of proposals) shows client name, estimate number, date sent, amount, and status badge (Pending / Accepted / Declined). Actions per row: Send Reminder, View. Source: https://squareup.com/us/en/invoices

**Current state:** Inline "Coming soon." stub in `catering-proposals.component.ts`. No `.html`, `.scss`, or `.spec` files exist.

**Files to create/rewrite** (all four are full writes — three are new):
- `src/app/features/catering/catering-proposals/catering-proposals.component.ts` — full rewrite
- `src/app/features/catering/catering-proposals/catering-proposals.component.html` — new
- `src/app/features/catering/catering-proposals/catering-proposals.component.scss` — new
- `src/app/features/catering/catering-proposals/catering-proposals.component.spec.ts` — new

**Component spec:**
- Selector: `os-catering-proposals`
- Standalone, OnPush, inject `CateringService`, `Router`
- `readonly proposals = computed(() => this.cateringService.jobs().filter(j => j.status === 'proposal_sent').sort((a, b) => a.fulfillmentDate.localeCompare(b.fulfillmentDate)))`

**UI:**
- Page header: "Proposals" + "New Job" button (navigates to `/app/catering`)
- Empty state when `proposals().length === 0`: calendar icon, "No proposals awaiting approval", "All sent proposals have been actioned."
- Card list per proposal:
  - Client name + company (if present)
  - Event title + event type badge
  - Event date (formatted) + headcount
  - Total value (`totalCents / 100` as currency)
  - Days since sent (calculate from `bookingDate`)
  - Two actions: "View Job" (Router.navigate to `/app/catering/job/:id`), "Resend" (calls `cateringService.generateProposal(job.id)`, copies returned URL to clipboard, shows success toast)

**Unit tests** (in spec file):
1. Renders empty state when service returns no `proposal_sent` jobs
2. Renders correct card count when service has `proposal_sent` jobs
3. `proposals` computed filters to `proposal_sent` only
4. "View Job" navigates to the correct route
5. "Resend" calls `generateProposal` with the correct job id

**`ng build` gate — must pass before Step 10.**

---

### ~~Step 10 — Frontend: `CateringDeliveryComponent` — Full Implementation~~

**Square research:** Square does not have a delivery dispatch board. Toast Catering & Events shows a "Delivery" tab with off-site events grouped by date, showing event name, address, driver, and arrival time. That is the direct competitive reference. Source: https://pos.toasttab.com/products/catering-and-events

**Current state:** Inline "Coming soon." stub. No `.html`, `.scss`, or `.spec` files.

**Files to create/rewrite:**
- `src/app/features/catering/catering-delivery/catering-delivery.component.ts` — full rewrite
- `src/app/features/catering/catering-delivery/catering-delivery.component.html` — new
- `src/app/features/catering/catering-delivery/catering-delivery.component.scss` — new
- `src/app/features/catering/catering-delivery/catering-delivery.component.spec.ts` — new

**Component spec:**
- Selector: `os-catering-delivery`
- Standalone, OnPush, inject `CateringService`, `Router`
- `readonly _dateFilter = signal<'today' | 'week' | 'month'>('week')`
- `readonly deliveryJobs = computed(...)` — filters to `locationType === 'off_site'`, status not `'cancelled'`, filtered by `_dateFilter`, sorted by `fulfillmentDate` ascending

**UI:**
- Page header: "Delivery Schedule"
- Date filter toggle: Today / This Week / This Month (Bootstrap button group, binds to `_dateFilter`)
- Empty state: truck icon, "No off-site deliveries scheduled for this period"
- Card per job:
  - Event title + client name
  - Date + time range (`startTime` → `endTime`)
  - Location address
  - Headcount badge
  - Delivery details section:
    - If `deliveryDetails` is null: "Set delivery details" button opens an inline edit form
    - If set: shows Driver, Load Time, Departure, Arrival, Setup Time, Breakdown Time, Route Notes, Equipment Checklist (tag list)
    - Edit button on the details section opens the same inline form
    - Save calls `cateringService.updateJob(job.id, { deliveryDetails })`
  - "View Job" link → `/app/catering/job/:id`

**Unit tests:**
1. Renders empty state when no off-site jobs
2. Renders correct count for current filter
3. `deliveryJobs` computed excludes `locationType === 'on_site'` jobs
4. `deliveryJobs` computed excludes cancelled jobs
5. `updateJob` called with correct `deliveryDetails` on save

**`ng build` gate — must pass before Step 11.**

---

### ~~Step 11 — Frontend: `CateringMilestonesComponent` — New Component~~

**Square research:** Square Invoices "Payment Schedule" view lists all milestone payments across jobs with status badges (Paid, Due, Overdue) and a "Mark as Paid" action. Outstanding amount is shown as a summary KPI at the top. Source: https://squareup.com/us/en/invoices

**Current state:** Route `/app/invoicing/milestones` (confirmed in `app.routes.ts`) points to `CateringStubComponent`. No milestones component exists.

**Files to create:**
- `src/app/features/catering/catering-milestones/catering-milestones.component.ts` — new
- `src/app/features/catering/catering-milestones/catering-milestones.component.html` — new
- `src/app/features/catering/catering-milestones/catering-milestones.component.scss` — new
- `src/app/features/catering/catering-milestones/catering-milestones.component.spec.ts` — new

**Component spec:**
- Selector: `os-catering-milestones`
- Standalone, OnPush, inject `CateringService`, `Router`
- `readonly _filter = signal<'all' | 'due_soon' | 'overdue' | 'unpaid' | 'paid'>('all')`
- `interface FlatMilestone extends CateringMilestonePayment { jobId: string; jobTitle: string; clientName: string; }`
- `readonly flatMilestones = computed((): FlatMilestone[] => ...)` — flattens all milestones from non-cancelled, non-completed jobs; applies `_filter`; sorts overdue first, then by `dueDate` ascending

**UI:**
- Page header: "Milestone Payments"
- KPI strip (4 values):
  - Total Outstanding (sum of unpaid milestone amounts across all active jobs)
  - Due This Week (milestones due within 7 days, unpaid)
  - Overdue (past due date, unpaid)
  - Collected This Month (sum of milestones with `paidAt` in current month)
- Filter pills: All | Due Soon | Overdue | Unpaid | Paid
- Table: Job Title (linked) | Client | Milestone Label | Amount | Due Date | Status Badge | Action
- Status badge logic: Paid (green + `paidAt` date shown) | Due Soon (orange, ≤7 days) | Overdue (red, past due) | Pending (grey)
- "Mark Paid" button calls `cateringService.markMilestonePaid(jobId, milestoneId)`. Button is disabled and shows checkmark if `paidAt` is set.

**Unit tests:**
1. Renders without error when no jobs
2. KPI strip shows correct outstanding total
3. Filter pill `overdue` returns only past-due unpaid milestones
4. `markMilestonePaid` called with correct `jobId` and `milestoneId`
5. "Mark Paid" button is disabled when `paidAt` is set

**`ng build` gate — must pass before Step 12.**

---

### ~~Step 12 — Frontend: `CateringRevenueReportComponent` — New Component~~

**Square research:** Square's Business Reports page leads with a revenue summary card (Total Sales, Transactions, Avg Sale) then shows breakdowns by category and time period as horizontal bar charts. Charts use proportional bar widths — no chart library required. Source: https://squareup.com/us/en/reporting

**Current state:** Route `/app/reports/revenue` (confirmed in `app.routes.ts`) points to `CateringStubComponent`.

**Files to create:**
- `src/app/features/catering/catering-revenue-report/catering-revenue-report.component.ts` — new
- `src/app/features/catering/catering-revenue-report/catering-revenue-report.component.html` — new
- `src/app/features/catering/catering-revenue-report/catering-revenue-report.component.scss` — new
- `src/app/features/catering/catering-revenue-report/catering-revenue-report.component.spec.ts` — new

**Component spec:**
- Selector: `os-catering-revenue-report`
- Standalone, OnPush, inject `CateringService`
- `readonly _report = signal<CateringPerformanceReport | null>(null)`
- `readonly _loading = signal(false)`
- `readonly _error = signal<string | null>(null)`
- `ngOnInit`: calls `cateringService.loadPerformanceReport()`, sets `_report`

**UI:**
- Page header: "Revenue Reports"
- Loading spinner (Bootstrap) while `_loading()`
- Error alert (dismissible) if `_error()`
- KPI cards row: Total Jobs | Completed Jobs | Cancelled Jobs | Close Rate (%) | Total Revenue | Avg Job Value | Outstanding Balance
- Revenue by Event Type — horizontal bar chart using pure CSS/Bootstrap:
  - Each row: event type label, proportional `div` bar, dollar amount
  - Bar width = `(value / maxValue) * 100%`
- Revenue by Month (last 6 months) — same pure CSS bar chart pattern
- "View Full Report" link → `/app/catering/reports`

**Unit tests:**
1. Renders loading state initially
2. Renders KPI cards when report data is present
3. Renders empty state when report returns no data
4. `loadPerformanceReport` called in `ngOnInit`

**`ng build` gate — must pass before Step 13.**

---

### ~~Step 13 — Frontend: `CateringDeferredReportComponent` — New Component~~

**Square research:** Square's "Deferred Revenue" report (available on Plus/Premium plans) shows future-dated invoices broken into Earned and Unearned columns. The unearned column is highlighted in amber to draw attention to money not yet recognizable. Source: https://squareup.com/us/en/reporting

**Current state:** Route `/app/reports/deferred` (confirmed in `app.routes.ts`) points to `CateringStubComponent`.

**Files to create:**
- `src/app/features/catering/catering-deferred-report/catering-deferred-report.component.ts` — new
- `src/app/features/catering/catering-deferred-report/catering-deferred-report.component.html` — new
- `src/app/features/catering/catering-deferred-report/catering-deferred-report.component.scss` — new
- `src/app/features/catering/catering-deferred-report/catering-deferred-report.component.spec.ts` — new

**Component spec:**
- Selector: `os-catering-deferred-report`
- Standalone, OnPush, inject `CateringService`
- `readonly _entries = signal<CateringDeferredRevenueEntry[]>([])`
- `readonly _loading = signal(false)`
- `ngOnInit`: calls `cateringService.loadDeferredRevenue()`, sets `_entries`

**UI:**
- Page header: "Deferred Revenue"
- Loading spinner while `_loading()`
- Summary strip: Total Booked | Total Collected | Recognized | Still Deferred
- Table: Job Title (linked to `/app/catering/job/:id`) | Event Date | Total Value | Paid | Recognized | Deferred
  - Deferred column cells highlighted amber when value > 0
- Footer row with column totals
- Empty state: "No deferred revenue entries" when `_entries().length === 0`

**Unit tests:**
1. Renders loading state initially
2. Renders table rows equal to `_entries()` length
3. Deferred cell has amber class when value > 0
4. Summary strip totals are correct
5. `loadDeferredRevenue` called in `ngOnInit`

**`ng build` gate — must pass before Step 14.**

---

### ~~Step 14 — Full Stack: `CateringPackagesComponent` + Backend Package Template Endpoints~~

**Square research:** Square Item Library allows creating "Catering Packages" as a named item group with a per-person price. The package acts as a template that can be applied to multiple orders/estimates. Source: https://squareup.com/us/en/catering

**Depends on:** Step 1 (menu item `menuType` field must exist for the item picker filter).

**Money convention note:** The existing `CateringEvent` model uses integer cents (`totalCents Int`, `paidCents Int`, `subtotalCents Int`). The new `CateringPackageTemplate` model must follow the same convention — `pricePerUnitCents Int`, not `Float`.

**Backend — `prisma/schema.prisma`:** Full file rewrite. Add new model:
```prisma
model CateringPackageTemplate {
  id               String   @id @default(uuid())
  merchantId       String   @map("merchant_id")
  name             String
  tier             String
  pricingModel     String   @map("pricing_model")
  pricePerUnitCents Int     @map("price_per_unit_cents")
  minimumHeadcount  Int     @default(1) @map("minimum_headcount")
  description      String?
  menuItemIds      Json     @default("[]") @map("menu_item_ids")
  isActive         Boolean  @default(true) @map("is_active")
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")

  @@index([merchantId])
  @@map("catering_package_templates")
}
```

Note on `menuItemIds`: Stored as a JSON array of MenuItem IDs. If a menu item is deleted, the package template will silently hold a dead reference. The item picker in the UI will simply not find a match for the dead ID and skip it. This is acceptable for the current scale. No cleanup mechanism is required in this step.

**Backend — Prisma migration:**
```
npx prisma migrate dev --name add_catering_package_templates
```

**Backend — `src/app/catering.routes.ts`:** Full file rewrite. Add four new endpoints:
- `GET /merchant/:id/catering/packages` — list all active templates (`isActive: true`) for this merchant
- `POST /merchant/:id/catering/packages` — create a new template. Zod validation: `tier` must be `"standard" | "premium" | "custom"`. `pricingModel` must be `"per_person" | "per_tray" | "flat"`. `pricePerUnitCents` must be a non-negative integer.
- `PATCH /merchant/:id/catering/packages/:templateId` — update a template. Same validation as POST.
- `DELETE /merchant/:id/catering/packages/:templateId` — soft-delete (`isActive: false`). Does not hard-delete.

**Backend build gate: `npx tsc --noEmit` — must pass.**

**Frontend — `src/app/models/catering.model.ts`:** Read file first. Full file rewrite. Add:
```typescript
export interface CateringPackageTemplate {
  id: string;
  merchantId: string;
  name: string;
  tier: 'standard' | 'premium' | 'custom';
  pricingModel: 'per_person' | 'per_tray' | 'flat';
  pricePerUnitCents: number;
  minimumHeadcount: number;
  description?: string;
  menuItemIds: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

**Frontend — `src/app/services/catering.service.ts`:** Read file first. Full file rewrite. Add:
- `readonly _packageTemplates = signal<CateringPackageTemplate[]>([])`
- `loadPackageTemplates()`, `createPackageTemplate(dto)`, `updatePackageTemplate(id, dto)`, `deletePackageTemplate(id)`

**Frontend — files to create:**
- `src/app/features/catering/catering-packages/catering-packages.component.ts` — new
- `src/app/features/catering/catering-packages/catering-packages.component.html` — new
- `src/app/features/catering/catering-packages/catering-packages.component.scss` — new
- `src/app/features/catering/catering-packages/catering-packages.component.spec.ts` — new

**Component spec:**
- Selector: `os-catering-packages`
- Standalone, OnPush, inject `CateringService`, `MenuService`
- `ngOnInit`: calls `cateringService.loadPackageTemplates()`

**UI:**
- Page header: "Catering Packages" + "New Package" button
- Explanation callout: "Package templates are applied when creating or editing a job. Editing a template does not change existing jobs."
- 2-column card grid (1 column mobile):
  - Per template: name, tier badge (Standard / Premium / Custom), pricing model label (Per Person / Per Tray / Flat), price per unit (display as `pricePerUnitCents / 100` formatted as currency), min headcount, menu item count
  - "View Items" expands inline to show item names (look up names from `menuService.allItems()`)
  - "Edit" opens slide-in form panel
  - "Delete" with confirmation dialog — calls `deletePackageTemplate(id)`
- New/Edit slide-in form:
  - Name (text input)
  - Tier (select: standard / premium / custom)
  - Pricing Model (select: per_person / per_tray / flat)
  - Price Per Unit (number input in dollars; multiply by 100 before sending to API)
  - Minimum Headcount (number)
  - Description (textarea)
  - Menu item picker: checkbox list from `menuService.allItems().filter(i => i.menuType === 'catering')`, filterable by name
- Save calls `createPackageTemplate()` or `updatePackageTemplate()`

**Unit tests:**
1. Renders empty state when no templates
2. Renders correct card count
3. "Edit" opens form with pre-populated values
4. `createPackageTemplate` called on save when creating new
5. `updatePackageTemplate` called on save when editing existing
6. `deletePackageTemplate` called on confirm

**`ng build` gate — must pass before Step 15.**

---

### ~~Step 15 — Frontend: `CateringStubComponent` — Upgrade to Roadmap Cards~~

**Why:** The four settings routes still pointing to `CateringStubComponent` display bare "Coming soon." text. These routes are accessible from the catering sidebar nav. Blank text is unprofessional.

**Confirmed stub routes (verified in `app.routes.ts`):**
- `settings/business` → `CateringStubComponent` (data: `{ title: 'Business Info' }`)
- `settings/branding` → `CateringStubComponent` (data: `{ title: 'Invoice Branding' }`)
- `settings/payments` → `CateringStubComponent` (data: `{ title: 'Payment Setup' }`)
- `settings/notifications` → `CateringStubComponent` (data: `{ title: 'Notifications' }`)

These four routes remain pointed at `CateringStubComponent` after this step — `app.routes.ts` is NOT changed here. Only the component itself is upgraded.

**Files to fully rewrite:**
- `src/app/features/catering/catering-stub/catering-stub.component.ts`
- `src/app/features/catering/catering-stub/catering-stub.component.html` — create if absent
- `src/app/features/catering/catering-stub/catering-stub.component.scss` — create if absent

The component reads `data.title` from `ActivatedRoute.snapshot.data['title']`. It renders a consistent "Coming Soon" card for each page:

| `data.title` | Icon | Card body |
|---|---|---|
| Business Info | `bi-building` | "Set your legal business name, tax ID, and catering license details. Coming in a future update." |
| Invoice Branding | `bi-palette` | "Upload your logo, set your brand color, and customize your invoice footer. Applies to all proposals, invoices, and BEOs." |
| Payment Setup | `bi-credit-card` | "Connect a payment processor to accept client deposits and milestone payments online. Requires Stripe Connect." |
| Notifications | `bi-bell` | "Configure email reminders for upcoming milestone payments and proposal expirations. Requires Resend email integration." |

Layout: Bootstrap card, icon in the card header, title from `data.title`, body text, a disabled "Coming Soon" badge.

**`ng build` gate — must pass before Step 16.**

---

### ~~Step 16 — Frontend: `app.routes.ts` Full Rewrite~~

**This is the only step that touches `app.routes.ts`.** All route changes from Steps 11–14 are batched into this single rewrite.

**Read the current `app.routes.ts` before rewriting.**

**Changes from current file — swap these four stub routes to real components:**

| Current | New `loadComponent` target |
|---|---|
| `invoicing/milestones` → `CateringStubComponent` | → `CateringMilestonesComponent` from `./features/catering/catering-milestones/catering-milestones.component` |
| `reports/revenue` → `CateringStubComponent` | → `CateringRevenueReportComponent` from `./features/catering/catering-revenue-report/catering-revenue-report.component` |
| `reports/deferred` → `CateringStubComponent` | → `CateringDeferredReportComponent` from `./features/catering/catering-deferred-report/catering-deferred-report.component` |
| `menu/packages` → `CateringStubComponent` | → `CateringPackagesComponent` from `./features/catering/catering-packages/catering-packages.component` |

**The four `settings/*` stubs remain pointing to `CateringStubComponent`** — they now render the upgraded roadmap card UI from Step 15. No change to those entries.

Everything else in `app.routes.ts` remains exactly as it currently is.

**`ng build` gate — must pass before Step 17a.**

---

### ~~Step 17a — Backend: Table `closing` Status~~

**Square research:** Square POS shows a "Check Presented" indicator on table cards after a check is printed. The table does not change color in Square's implementation — they use a receipt icon overlay. Toast uses a purple "Closing" state that removes table selectability on the floor plan. The Toast pattern is more operationally clear and is the reference for this implementation. Source: https://pos.toasttab.com/products/floor-management

**No "existing check print event" to hook.** The check routes (`check.routes.ts`) do not emit a print event. CloudPRNT polling is not a hookable trigger. The "Closing" state is manually triggered by the operator pressing "Present Check" — that button directly calls the table status PATCH. There is no auto-trigger on print.

**Backend — `prisma/schema.prisma`:** Read the file first. The `RestaurantTable.status` field is stored as a plain `String @default("available")` — no enum constraint. Full file rewrite. No model-level change is needed beyond verifying this. The `closing` value is accepted by the existing field type. The only schema change is documentation: add a comment noting the valid values include `closing`.

**Backend — table routes (read first):** Full file rewrite of the table status PATCH endpoint. Extend the Zod validation to explicitly permit `closing` as a valid status value alongside the existing ones (`available | reserved | occupied | dirty | maintenance`).

**Check void/cancel revert:** In the existing check void flow within `check.routes.ts`, after a successful void: if the order has a `tableId`, PATCH that table's status from `closing` back to `occupied`. Read `check.routes.ts` in full before rewriting. Full file rewrite adding this revert logic to the void endpoint only.

**Backend build gate: `npx tsc --noEmit` — must pass before Step 17b.**

---

### ~~Step 17b — Frontend: Table Model + Floor Plan~~

**Depends on:** Step 17a.

**Frontend — `src/app/models/table.model.ts` (read first):** Full file rewrite. Add `'closing'` to the `TableStatus` union type. Add `closing` to the table status color map: `closing: '#7c3aed'` (purple).

**Frontend — `src/app/features/table-mgmt/floor-plan/floor-plan.ts` (read first):** Full file rewrite. Changes:
- Table card renders purple background when `table.status === 'closing'`
- `closing` tables are NOT tappable for state changes from the floor plan state-change context menu
- `closing` tables ARE still tappable to navigate to the order detail view (read-only inspect)
- The floor plan state-change menu does not include `'closing'` as a selectable option for any table
- Floor plan legend: add a purple "Closing" swatch entry

**`ng build` gate — must pass before Step 17c.**

---

### ~~Step 17c — Frontend: POS/Register/Bar "Present Check" Button~~

**Depends on:** Step 17b.

**What the button does:** When tapped, it PATCHes the associated table status to `closing` via the existing `TableService.updateStatus()` call (or equivalent). No print event, no automatic trigger. This is a deliberate manual operator action.

**Read each of the following before rewriting. Only rewrite files that contain a check actions area (print, payment, etc.) on POS, Register, and Bar terminals:**
- The server POS terminal component (`server-pos-terminal`)
- The register terminal component (`register-terminal`)
- The bar terminal component (`bar-terminal`)

For each applicable component, full file rewrite. Add:
- A "Present Check" button. Visible only when: (a) the order has items, and (b) the order is associated with a table (`tableId` is set).
- Button appearance: Bootstrap `btn` with purple color class, `bi-receipt-cutoff` icon, label "Present Check".
- On tap: calls `tableService.updateTableStatus(tableId, 'closing')`. On success: button becomes "Check Presented" with a checkmark icon, disabled state.
- The disabled state persists for the session. It does not re-enable unless the page reloads and the table status is no longer `closing`.
- This button is absent from `kiosk-terminal`. Do not modify the kiosk component in this step.

**`ng build` gate — must pass before Step 17d.**

---

### ~~Step 17d — Frontend: Kiosk Handling for `closing` Tables~~

**Depends on:** Step 17b.

**Read `src/app/features/kiosk/kiosk-terminal/kiosk-terminal.ts` before rewriting.**

**Full file rewrite.** When a patron scans a QR code at a table and that table's status is `closing`:
- Do not show the regular ordering interface
- Show a full-screen message: "This table's check has been presented. Please see your server."
- A "Go Back" button returns to the kiosk welcome screen

All other kiosk behavior remains unchanged.

**`ng build` gate — must pass. Run full test suite: `npm test` and confirm all existing tests still pass.**

---

## Completion Checklist

After all steps are complete, every item below must be true:

- [ ] `ng build --configuration=production` passes with zero errors
- [ ] `npm test` passes — all existing tests pass, zero failures
- [ ] Backend `npx tsc --noEmit` passes with zero errors
- [ ] Switch to catering mode → sidebar shows catering nav with badge counts
- [ ] Switch to quick_service mode → sidebar shows KDS as top-level item, `buildQuickServiceNav()` tree renders
- [ ] Home dashboard catering mode: shows Pipeline Value / Outstanding / Jobs This Month KPIs
- [ ] Home dashboard bar mode: shows Open Tabs KPI
- [ ] Home dashboard all modes: setup tasks match FEATURE-03 spec per mode
- [ ] Setup wizard Step 2: shows 4 mode cards, no search list
- [ ] `/app/catering/proposals` renders proposal cards (not "Coming soon.")
- [ ] `/app/catering/delivery` renders delivery board (not "Coming soon.")
- [ ] `/app/invoicing/milestones` renders milestone table (not "Coming soon.")
- [ ] `/app/reports/revenue` renders revenue report (not "Coming soon.")
- [ ] `/app/reports/deferred` renders deferred revenue table (not "Coming soon.")
- [ ] `/app/menu/packages` renders package template library (not "Coming soon.")
- [ ] `/app/settings/business`, `/branding`, `/payments`, `/notifications` render roadmap cards (not bare text)
- [ ] Menu item form shows pricing model selector when `menuType === 'catering'` is selected
- [ ] Backend: `GET /api/merchant/:id/menu/items?menuType=catering` returns only catering items
- [ ] Backend: `GET /api/merchant/:id/catering/packages` returns package templates
- [ ] Catering package form: price entered in dollars, stored as cents in DB
- [ ] Floor plan shows purple table card for `closing` status
- [ ] Floor plan state-change menu does not list `closing` as a selectable option
- [ ] "Present Check" button visible on POS/Register/Bar when order has items + table
- [ ] "Present Check" button absent from Kiosk terminal
- [ ] "Present Check" tap updates table status to `closing`
- [ ] Kiosk shows "check presented" message when scanning a `closing` table
- [ ] Check void on a `closing` table reverts the table to `occupied`
- [ ] Resend DNS verification added to deployment checklist (noreply@getorderstack.com)
- [ ] `RESEND_API_KEY` added to `render.yaml` secret variable references
- [ ] FEATURE-03 is not archived until Step 8 content is verified live in the component
