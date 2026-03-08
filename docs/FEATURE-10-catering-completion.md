# FEATURE-10: Catering Completion — Remaining Work

## Status: PENDING

## Authority

This document is self-contained. It supersedes FEATURE-02d, FEATURE-05, FEATURE-05b,
FEATURE-06, FEATURE-07, and MASTER-IMPLEMENTATION-PLAN.md. All unimplemented items
from those sources have been incorporated here with full specs.

---

## CLAUDE.md Compliance — Applies to Every Step

1. Read every file before rewriting it. Full file rewrites only — no incremental patches.
2. Square first. Every UI decision cites how Square handles it. No inventing.
3. Path aliases everywhere (`@models/*`, `@services/*`, `@shared/*`). No relative cross-feature imports.
4. `ng build` gate after every frontend step. `npx tsc --noEmit` gate after every backend step.
5. No unsolicited features. Implement only what the master plan specifies.
6. Ask before deciding on anything the master plan does not cover.
7. `os-` prefix on all component selectors.
8. Standalone components, `inject()`, `ChangeDetectionStrategy.OnPush`, signals — no exceptions.

---

## Verified Done — Do Not Rebuild

| Item | Evidence |
|---|---|
| `TableStatus` includes `'closing'` | `src/app/models/table.model.ts` |
| Floor plan purple closing state, legend entry, "View Order" detail panel | `floor-plan.ts`, `floor-plan.html`, `floor-plan.scss` |
| POS "Present Check" button, `checkPresented` signal, `isTableClosing` computed | `checkout.ts` (moved to service in FEATURE-01, this session) |
| Kiosk blocking screen for closing tables | `kiosk-terminal.ts`, `kiosk-terminal.html` |
| `buildCateringNav()` in `MainLayoutComponent` | `main-layout.component.ts` |
| `buildQuickServiceNav()` in `MainLayoutComponent` | `main-layout.component.ts` |
| `DevicePosMode: 'catering'` + full `CATERING_MODE` flags | `platform.model.ts` |
| `CateringJob` model with all Phase 2 fields | `catering.model.ts` |
| `CateringService` (all methods + computed signals) | `catering.service.ts` |
| Backend catering routes (22 endpoints) | `catering.routes.ts` |
| All 9 catering components: Dashboard, JobDetail, BEO, Reports, PrepList, Calendar, Proposal (public), GuestPortal (public), LeadForm (public) | `src/app/features/catering/` |
| `NotificationService` + POS toast | `src/app/services/notification.ts` (created this session) |

---

## Needs Verification Before Claiming Done

These items are believed to exist but were not confirmed against the current codebase
during this session. Check with `grep` before implementing:

| Item | Check |
|---|---|
| `isQuickServiceMode`, `isFullServiceMode`, `isBarMode` signals in `PlatformService` | grep for `isQuickServiceMode` in `platform.ts` |
| Setup wizard Step 2 — 4-card mode grid replaces old business type search | grep for `MODE_CARDS` in `setup-wizard.ts` |

If either is missing, implement per Master Plan Step 5 and Step 6 respectively before
proceeding to Step 8.

---

## Remaining Work — Execution Order

Implement steps in this exact order. Each step has a build gate that must pass
before the next step begins.

---

### Backend Group (Steps 1–4, 17a)

These five backend steps can be blocked together since they all touch the same
Express + Prisma + Render stack. Step 1 must precede Step 14.

---

**Step 1 — `menuType` + `cateringPricingModel` on MenuItem**

Files:
- `prisma/schema.prisma` — add `menuType String @default("standard")` and `cateringPricingModel String?` to `MenuItem`
- Run: `npx prisma migrate dev --name add_menu_item_catering_type`
- Menu routes file — add `?menuType=catering` query param filter; Zod validation on create/update
- `src/app/models/menu.model.ts` (frontend) — add `menuType?` and `cateringPricingModel?` to `MenuItem` interface
- Menu item form component (frontend) — show "Pricing Model" select when `menuType === 'catering'`

Build gate: `npx tsc --noEmit` in backend repo + `ng build` in frontend repo.

---

**Step 2 — Restaurant branding fields**

Files:
- `prisma/schema.prisma` — add `defaultBrandingLogoUrl String?`, `defaultBrandingColor String?`, `defaultInvoiceNotes String?` to `Restaurant` model
- Run: `npx prisma migrate dev --name add_restaurant_branding_defaults`
- Merchant GET and PATCH endpoints — expose and accept these three fields

Build gate: `npx tsc --noEmit`.

---

**Step 3 — Resend email service**

**Pre-flight:** Resend requires DNS verification for `noreply@getorderstack.com`. Add
`RESEND_API_KEY` to `render.yaml` as a secret variable reference before deploying.

Files:
- Create `src/services/email.service.ts` (backend) — three functions: `sendProposal`, `sendInvoice`, `sendMilestoneReminder`
- `src/app/catering.routes.ts` (backend) — full rewrite; call `sendProposal()` on the proposal endpoint, wrapped in try-catch

Build gate: `npx tsc --noEmit`.

---

**Step 4 — Milestone reminder cron**

Depends on: Step 3.

Files:
- Create `src/jobs/milestone-reminders.ts` (backend) — `startMilestoneReminderCron()` running daily at 09:00, sends reminders for milestones due within 3 days, marks `reminderSentAt`
- `src/main.ts` (backend) — read first, full rewrite; call `startMilestoneReminderCron()` on startup

Build gate: `npx tsc --noEmit`.

---

**Step 17a — Table `closing` Zod validation + check void revert**

Files:
- Table routes (backend) — full rewrite; add `'closing'` to the Zod status enum on the PATCH endpoint
- `check.routes.ts` (backend) — read first, full rewrite; after successful void, if order has `tableId`, PATCH table status from `closing` → `occupied`

Build gate: `npx tsc --noEmit`.

---

### Frontend Group (Steps 5–16)

Steps 5 and 6 must be verified/completed before Step 8. Steps 9–14 can run in order
after Step 8. Step 15 is independent. Step 16 must be last.

---

**Step 5 — Granular mode signals in `PlatformService`** *(if not already present)*

File: `src/app/services/platform.ts` — read first, full rewrite.
Add: `isQuickServiceMode`, `isFullServiceMode`, `isBarMode` computed signals.

Build gate: `ng build`.

---

**Step 6 — Setup wizard Step 2 — 4-card mode grid** *(if not already present)*

Files: `setup-wizard.ts`, `setup-wizard.html`, `setup-wizard.scss` — read all three first.
Replace business type search/scroll list with 2×2 `MODE_CARDS` grid (Quick Service, Full Service,
Bar & Brewery, Catering). Remove wizard-only helpers no longer needed. All other steps unchanged.

Build gate: `ng build`.

---

**Step 8 — Home dashboard catering mode content**

Depends on: Step 5.

This step wires the Administration home dashboard (`os-home-dashboard`) to render
catering-specific content when the device is in catering mode. Non-catering modes
(quick_service, full_service, bar, retail, services) are handled separately in FEATURE-03.

Sub-step 8a: `src/app/services/catering.service.ts` — read first, full rewrite only if
`totalPipeline`, `outstandingBalance`, and `eventsThisMonth` computed signals are absent.
Verify first with `grep`. If they exist, skip this sub-step.

Sub-step 8b: `src/app/features/home/home-dashboard/home-dashboard.ts` — read first, full rewrite.

Changes specific to catering mode:
- Remove local `type DevicePosMode = ...` redeclaration (line ~36); import `DevicePosMode`
  from `'@models/platform.model'`
- Inject `TableService`
- Add `readonly pageTitle = computed(...)` — catering mode returns `'Catering Admin'`;
  all non-catering modes return their existing labels (see FEATURE-03 for those values;
  do not guess — read FEATURE-03 before implementing)
- Add `readonly performanceSectionTitle = computed(...)` — catering returns
  `'Pipeline Overview'`; all others return `'Today's Performance'` for now (FEATURE-03
  will refine retail and services later)
- Add `readonly atAGlance = computed<AtAGlanceChip[]>(...)` — catering returns:
  ```
  [
    { label: 'Pending Inquiries',    value: cateringService.pendingJobsCount(),           icon: 'bi-inbox',  route: '/app/catering' },
    { label: 'Awaiting Approval',    value: cateringService.proposalsAwaitingApproval(),  icon: 'bi-send',   route: '/app/catering' },
    { label: 'Milestones Due',       value: cateringService.milestonesComingDue(),        icon: 'bi-alarm',  route: '/app/catering' },
  ]
  ```
  Non-catering modes return `[]` for now (FEATURE-03 fills them in later).
- Existing `kpiConfig()` catering branch (Pipeline Value / Outstanding / Jobs This Month)
  is already correct — do not change it.
- Existing `setupTasks` catering builder is already correct — do not change it.

New interface at top of file:
```typescript
interface AtAGlanceChip {
  label: string;
  value: number | string;
  icon: string;
  route?: string;
}
```

Sub-step 8c: `src/app/features/home/home-dashboard/home-dashboard.html` — read first, full rewrite.

Changes:
- Replace `<h1 class="home-title">Administration</h1>` with `<h1 class="home-title">{{ pageTitle() }}</h1>`
- Replace `<h3>Today's Performance</h3>` with `<h3>{{ performanceSectionTitle() }}</h3>`
- Add At-a-Glance strip between setup guide card and performance section
  (only renders when `atAGlance().length > 0`):

```html
@if (atAGlance().length > 0) {
  <div class="glance-strip">
    @for (chip of atAGlance(); track chip.label) {
      @if (chip.route) {
        <button type="button" class="glance-chip" (click)="navigateTo(chip.route)">
          <i class="bi {{ chip.icon }} glance-chip-icon"></i>
          <span class="glance-chip-value">{{ chip.value }}</span>
          <span class="glance-chip-label">{{ chip.label }}</span>
        </button>
      } @else {
        <div class="glance-chip">
          <i class="bi {{ chip.icon }} glance-chip-icon"></i>
          <span class="glance-chip-value">{{ chip.value }}</span>
          <span class="glance-chip-label">{{ chip.label }}</span>
        </div>
      }
    }
  </div>
}
```

Sub-step 8d: `src/app/features/home/home-dashboard/home-dashboard.scss` — edit only.
Add `.glance-strip` and `.glance-chip` styles:
- `.glance-strip` — `display: flex; gap: 0.75rem; margin-bottom: 1.25rem;`
- `.glance-chip` — `flex: 1; min-width: 0; border: 1px solid var(--bs-border-color); border-radius: 10px; padding: 0.75rem 1rem; display: flex; flex-direction: column;`
- `button.glance-chip:hover` — `background: var(--bs-light);`
- `.glance-chip-icon` — `font-size: 1.1rem; color: var(--bs-secondary); margin-bottom: 0.25rem;`
- `.glance-chip-value` — `font-size: 1.5rem; font-weight: 700; line-height: 1;`
- `.glance-chip-label` — `font-size: 0.72rem; color: var(--bs-secondary); margin-top: 0.2rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`

Build gate: `ng build`.

---

**Step 9 — `CateringProposalsComponent` — full implementation**

Current state: inline "Coming soon." stub in `catering-proposals.component.ts`. No `.html`, `.scss`, `.spec`.

Files to create/rewrite (4 total):
- `catering-proposals.component.ts` — selector `os-catering-proposals`; `proposals = computed(() => jobs filtered to proposal_sent, sorted by fulfillmentDate)`
- `catering-proposals.component.html` — page header + "New Job" button; empty state; card list (client, event title, date, headcount, total, days since sent, "View Job" + "Resend" actions)
- `catering-proposals.component.scss`
- `catering-proposals.component.spec.ts` — 5 unit tests:
  1. Renders empty state when service returns no `proposal_sent` jobs
  2. Renders correct card count when service has `proposal_sent` jobs
  3. `proposals` computed filters to `proposal_sent` status only
  4. "View Job" navigates to the correct `/app/catering/job/:id` route
  5. "Resend" calls `cateringService.generateProposal` with the correct job id

Build gate: `ng build`.

---

**Step 10 — `CateringDeliveryComponent` — full implementation**

Current state: inline "Coming soon." stub. No `.html`, `.scss`, `.spec`.

Files to create/rewrite (4 total):
- `catering-delivery.component.ts` — selector `os-catering-delivery`; `_dateFilter = signal('week')`; `deliveryJobs` computed (off-site, not cancelled, filtered by date, sorted ascending)
- `catering-delivery.component.html` — header; Today/Week/Month filter toggle; empty state; card per job with delivery details section (inline edit for driver, load time, departure, arrival, equipment checklist)
- `catering-delivery.component.scss`
- `catering-delivery.component.spec.ts` — 5 unit tests:
  1. Renders empty state when no off-site jobs exist
  2. Renders correct card count for the active date filter
  3. `deliveryJobs` computed excludes jobs where `locationType === 'on_site'`
  4. `deliveryJobs` computed excludes cancelled jobs
  5. `cateringService.updateJob` called with correct `deliveryDetails` payload on save

Build gate: `ng build`.

---

**Step 11 — `CateringMilestonesComponent` — new component**

Current state: route `/app/invoicing/milestones` → `CateringStubComponent`.

Files to create (4 total):
- `catering-milestones/catering-milestones.component.ts` — selector `os-catering-milestones`; flattens all milestones from active jobs into `FlatMilestone[]`; `_filter` signal; overdue sort
- `catering-milestones/catering-milestones.component.html` — header; 4-KPI strip (Outstanding, Due This Week, Overdue, Collected This Month); filter pills; milestone table with "Mark Paid" action
- `catering-milestones/catering-milestones.component.scss`
- `catering-milestones/catering-milestones.component.spec.ts` — 5 unit tests:
  1. Renders without error when no jobs exist
  2. KPI strip shows the correct total outstanding amount
  3. `overdue` filter pill returns only past-due unpaid milestones
  4. `cateringService.markMilestonePaid` called with correct `jobId` and `milestoneId`
  5. "Mark Paid" button is disabled when `paidAt` is already set

Build gate: `ng build`.

---

**Step 12 — `CateringRevenueReportComponent` — new component**

Current state: route `/app/reports/revenue` → `CateringStubComponent`.

Files to create (4 total):
- `catering-revenue-report/catering-revenue-report.component.ts` — selector `os-catering-revenue-report`; `_report` signal; calls `loadPerformanceReport()` on init
- `catering-revenue-report/catering-revenue-report.component.html` — KPI cards (Total Jobs, Completed, Cancelled, Close Rate, Total Revenue, Avg Job Value, Outstanding); pure-CSS bar charts for event type + monthly breakdown
- `catering-revenue-report/catering-revenue-report.component.scss`
- `catering-revenue-report/catering-revenue-report.component.spec.ts` — 4 unit tests:
  1. Renders loading state initially before report resolves
  2. Renders all KPI cards when report data is present
  3. Renders empty state when report returns no data
  4. `cateringService.loadPerformanceReport` called in `ngOnInit`

Build gate: `ng build`.

---

**Step 13 — `CateringDeferredReportComponent` — new component**

Current state: route `/app/reports/deferred` → `CateringStubComponent`.

Files to create (4 total):
- `catering-deferred-report/catering-deferred-report.component.ts` — selector `os-catering-deferred-report`; `_entries` signal; calls `loadDeferredRevenue()` on init
- `catering-deferred-report/catering-deferred-report.component.html` — summary strip (Total Booked, Collected, Recognized, Still Deferred); table with amber highlight on Deferred column; footer totals row
- `catering-deferred-report/catering-deferred-report.component.scss`
- `catering-deferred-report/catering-deferred-report.component.spec.ts` — 5 unit tests:
  1. Renders loading state initially before entries resolve
  2. Renders table rows equal to `_entries()` length
  3. Deferred column cell has amber highlight class when value > 0
  4. Summary strip totals match the sum of `_entries()` values
  5. `cateringService.loadDeferredRevenue` called in `ngOnInit`

Build gate: `ng build`.

---

**Step 14 — `CateringPackagesComponent` + backend package templates**

Depends on: Backend Step 1 (menuType must exist for item picker filter).

Backend files:
- `prisma/schema.prisma` — add `CateringPackageTemplate` model (id, merchantId, name, tier, pricingModel, pricePerUnitCents, minimumHeadcount, description, menuItemIds Json, isActive, timestamps)
- Run: `npx prisma migrate dev --name add_catering_package_templates`
- `src/app/catering.routes.ts` — full rewrite; add 4 endpoints: LIST, CREATE, PATCH, DELETE (soft)

Frontend files:
- `src/app/models/catering.model.ts` — read first, full rewrite; add `CateringPackageTemplate` interface
- `src/app/services/catering.service.ts` — read first, full rewrite; add `_packageTemplates` signal + CRUD methods
- Create `catering-packages/catering-packages.component.ts` — selector `os-catering-packages`; 2-column card grid; slide-in form panel with item picker (filtered to `menuType === 'catering'`)
- Create `catering-packages/catering-packages.component.html`
- Create `catering-packages/catering-packages.component.scss`
- Create `catering-packages/catering-packages.component.spec.ts` — 6 unit tests:
  1. Renders empty state when no package templates exist
  2. Renders correct card count when templates are loaded
  3. "Edit" button opens the form panel pre-populated with the template's values
  4. `cateringService.createPackageTemplate` called on save when creating new
  5. `cateringService.updatePackageTemplate` called on save when editing existing
  6. `cateringService.deletePackageTemplate` called after delete confirmation

**Money convention:** `pricePerUnitCents` is an integer (cents). Form input is in dollars; multiply by 100 before API call.

Build gate: `npx tsc --noEmit` (backend) + `ng build` (frontend).

---

**Step 15 — `CateringStubComponent` — upgrade to roadmap cards**

Four `settings/*` routes remain pointed at `CateringStubComponent` and still render bare "Coming soon." text.
`app.routes.ts` is NOT changed here.

Files to rewrite:
- `src/app/features/catering/catering-stub/catering-stub.component.ts` — reads `data.title` from route snapshot
- `src/app/features/catering/catering-stub/catering-stub.component.html` — Bootstrap card with icon, title, descriptive body, "Coming Soon" disabled badge
- `src/app/features/catering/catering-stub/catering-stub.component.scss` — create if absent

| `data.title` | Icon | Body |
|---|---|---|
| Business Info | `bi-building` | "Set your legal business name, tax ID, and catering license details. Coming in a future update." |
| Invoice Branding | `bi-palette` | "Upload your logo, set your brand color, and customize your invoice footer. Applies to all proposals, invoices, and BEOs." |
| Payment Setup | `bi-credit-card` | "Connect a payment processor to accept client deposits and milestone payments online. Requires Stripe Connect." |
| Notifications | `bi-bell` | "Configure email reminders for upcoming milestone payments and proposal expirations. Requires Resend email integration." |

Build gate: `ng build`.

---

**Step 16 — `app.routes.ts` full rewrite** *(this step is last)*

Read `app.routes.ts` in full before rewriting. Only these four lazy-load targets change:

| Route | Old target | New target |
|---|---|---|
| `invoicing/milestones` | `CateringStubComponent` | `CateringMilestonesComponent` |
| `reports/revenue` | `CateringStubComponent` | `CateringRevenueReportComponent` |
| `reports/deferred` | `CateringStubComponent` | `CateringDeferredReportComponent` |
| `menu/packages` | `CateringStubComponent` | `CateringPackagesComponent` |

The four `settings/*` stub routes remain pointed at `CateringStubComponent` (now upgraded). Everything else unchanged.

Build gate: `ng build` — zero errors.

---

## Completion Checklist

After all steps are complete, every item below must be true:

- [ ] `ng build --configuration=production` — zero errors
- [ ] `npm test` — all tests pass
- [ ] Backend `npx tsc --noEmit` — zero errors
- [ ] Backend Prisma migrations applied to production DB
- [ ] `RESEND_API_KEY` added to `render.yaml` secret variable references
- [ ] DNS verification for `noreply@getorderstack.com` added to deployment checklist
- [ ] Home dashboard catering mode: page title "Catering Admin", section heading "Pipeline Overview"
- [ ] Home dashboard catering mode: at-a-glance strip shows Pending Inquiries / Awaiting Approval / Milestones Due
- [ ] Home dashboard catering mode: Pipeline Value / Outstanding / Jobs This Month KPIs
- [ ] Home dashboard bar mode: Open Tabs KPI (already implemented — verify not broken)
- [ ] Setup wizard Step 2: 4 mode cards, no search list
- [ ] `/app/catering/proposals` renders proposal cards (not "Coming soon.")
- [ ] `/app/catering/delivery` renders delivery board (not "Coming soon.")
- [ ] `/app/invoicing/milestones` renders milestone table (not "Coming soon.")
- [ ] `/app/reports/revenue` renders revenue report (not "Coming soon.")
- [ ] `/app/reports/deferred` renders deferred revenue table (not "Coming soon.")
- [ ] `/app/menu/packages` renders package template library (not "Coming soon.")
- [ ] `/app/settings/business`, `/branding`, `/payments`, `/notifications` render roadmap cards (not bare text)
- [ ] Menu item form shows pricing model selector when `menuType === 'catering'`
- [ ] Backend: `?menuType=catering` filter works on menu items endpoint
- [ ] Backend: `GET /api/merchant/:id/catering/packages` returns templates
- [ ] Backend: table PATCH accepts `closing` status
- [ ] Backend: check void reverts `closing` table to `occupied`
- [ ] Non-catering dashboard modes (FEATURE-03) implemented separately after this feature ships
