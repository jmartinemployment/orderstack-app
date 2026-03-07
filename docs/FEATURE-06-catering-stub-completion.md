# FEATURE-06: Complete Catering Stub Pages

## Status: PENDING

## Summary
10 catering pages are currently stubs showing "Coming soon." All must be replaced with
real, functional components. This plan is split into two groups: Group A (implementable
now with existing service methods and backend), Group B (require backend work first).

---

## Group A — Implement Now (6 pages)

All Group A components use existing `CateringService` methods. No backend changes needed.

---

### A-1: Proposals Page
**Route:** `/app/catering/proposals`
**File:** `src/app/features/catering/catering-proposals/catering-proposals.component.ts`
**Current state:** Inline "Coming soon" stub

**What to build:**
A list of all jobs with `status === 'proposal_sent'`, showing pending client approval.

**UI spec:**
- Page header: "Proposals" + "New Job" button (navigates to `/app/catering` → opens new event form)
- Empty state: "No proposals awaiting approval" with icon
- Table/card list showing each proposal_sent job:
  - Client name + company name (if any)
  - Event title + event type badge
  - Event date (`fulfillmentDate`)
  - Headcount
  - Total (`totalCents` formatted as currency)
  - Days since sent (from `bookingDate`)
  - Action buttons: "View Job" → `/app/catering/job/:id`, "Resend Proposal" (calls `cateringService.generateProposal(job.id)` then copies URL to clipboard with toast)
- Sort by fulfillmentDate ascending (soonest first)

**Data source:**
```typescript
readonly proposals = computed(() =>
  this.cateringService.jobs().filter(j => j.status === 'proposal_sent')
    .sort((a, b) => a.fulfillmentDate.localeCompare(b.fulfillmentDate))
);
```

**Component structure:** Standalone, OnPush, inject `CateringService` and `Router`.
Add `.html` and `.scss` files (follow catering-reports pattern).

---

### A-2: Delivery Page
**Route:** `/app/catering/delivery`
**File:** `src/app/features/catering/catering-delivery/catering-delivery.component.ts`
**Current state:** Inline "Coming soon" stub

**What to build:**
A list of upcoming off-site jobs with delivery logistics. Lets operators manage
driver assignments, load times, and equipment checklists without opening each job.

**UI spec:**
- Page header: "Delivery Schedule"
- Date filter: Today / This Week / This Month (default: This Week)
- Empty state: "No off-site deliveries scheduled" 
- Card per job (locationType === 'off_site' and status not cancelled):
  - Event title + client name
  - Date + time range (startTime → endTime)
  - Location address
  - Headcount badge
  - Delivery details inline editor (if deliveryDetails is null, show "Set delivery details" button):
    - Driver name + phone
    - Load time, departure time, arrival time
    - Vehicle description
    - Setup time + breakdown time
    - Route notes textarea
    - Equipment checklist (comma-separated tags, addable)
  - Save button calls `cateringService.updateJob(job.id, { deliveryDetails })`
  - "View Job" link → `/app/catering/job/:id`

**Data source:**
```typescript
readonly deliveryJobs = computed(() =>
  this.cateringService.jobs()
    .filter(j => j.locationType === 'off_site' && j.status !== 'cancelled')
    .sort((a, b) => a.fulfillmentDate.localeCompare(b.fulfillmentDate))
);
```

**Component structure:** Standalone, OnPush, inject `CateringService` and `Router`.
Add `.html` and `.scss` files.

---

### A-3: Milestone Payments Page
**Route:** `/app/invoicing/milestones`
**File:** Create new component `src/app/features/catering/catering-milestones/catering-milestones.component.ts`

**Route update required in `app.routes.ts`:**
```typescript
// REPLACE:
{ path: 'invoicing/milestones', loadComponent: () => import('./features/catering/catering-stub/catering-stub.component').then(m => m.CateringStubComponent), data: { title: 'Milestone Payments' } },
// WITH:
{ path: 'invoicing/milestones', loadComponent: () => import('./features/catering/catering-milestones/catering-milestones.component').then(m => m.CateringMilestonesComponent) },
```

**What to build:**
A cross-job view of all payment milestones, sortable and filterable by status.
This is the primary payment tracking screen for catering operators.

**UI spec:**
- Page header: "Milestone Payments"
- Filter pills: All | Due Soon (≤7 days) | Overdue | Unpaid | Paid
- Summary KPI strip:
  - Total outstanding (sum of unpaid milestones across all active jobs)
  - Due this week
  - Overdue (past due date and unpaid)
  - Collected this month
- Table with columns:
  - Job title (link to `/app/catering/job/:id`)
  - Client name
  - Milestone label (Deposit / Final Payment / custom)
  - Amount (`amountCents` as currency)
  - Due date
  - Status badge: Paid (green, shows paidAt date) | Due Soon (orange) | Overdue (red) | Pending (grey)
  - Action: "Mark Paid" button (calls `cateringService.markMilestonePaid(jobId, milestoneId)`, disabled if already paid)
- Sort: overdue first, then by due date ascending

**Data source — flatten milestones from all active jobs:**
```typescript
interface FlatMilestone extends CateringMilestonePayment {
  jobId: string;
  jobTitle: string;
  clientName: string;
}

readonly flatMilestones = computed((): FlatMilestone[] => {
  const today = new Date().toISOString().split('T')[0];
  return this.cateringService.jobs()
    .filter(j => j.status !== 'cancelled' && j.status !== 'completed')
    .flatMap(j => j.milestones.map(m => ({
      ...m,
      jobId: j.id,
      jobTitle: j.title,
      clientName: j.clientName,
    })))
    .sort((a, b) => {
      if (!a.paidAt && a.dueDate && a.dueDate < today) return -1;
      if (!b.paidAt && b.dueDate && b.dueDate < today) return 1;
      return (a.dueDate ?? '').localeCompare(b.dueDate ?? '');
    });
});
```

**Component structure:** Standalone, OnPush, inject `CateringService` and `Router`.

---

### A-4: Revenue Reports Page
**Route:** `/app/reports/revenue`
**File:** Create new component `src/app/features/catering/catering-revenue-report/catering-revenue-report.component.ts`

**Route update required in `app.routes.ts`:**
```typescript
// REPLACE:
{ path: 'reports/revenue', loadComponent: () => import('./features/catering/catering-stub/catering-stub.component').then(m => m.CateringStubComponent), data: { title: 'Revenue Reports' } },
// WITH:
{ path: 'reports/revenue', loadComponent: () => import('./features/catering/catering-revenue-report/catering-revenue-report.component').then(m => m.CateringRevenueReportComponent) },
```

**What to build:**
Performance-focused revenue report for catering operations. Calls `loadPerformanceReport()`.

**UI spec:**
- Page header: "Revenue Reports"
- Loading spinner while fetching
- Empty/error state if API fails
- KPI cards row:
  - Total Jobs | Completed Jobs | Cancelled Jobs | Close Rate (%)
  - Total Revenue | Avg Job Value | Outstanding Balance (from `cateringService.outstandingBalance()`)
- Revenue by Event Type — horizontal bar chart (pure CSS/Bootstrap bars, no chart library):
  - Each row: event type label, bar, dollar amount
- Revenue by Month — last 6 months bar chart (pure CSS)
  - Month label, bar proportional to max, dollar amount
- "View Full Report" link → `/app/catering/reports`

**Data source:** `cateringService.loadPerformanceReport()` in `ngOnInit`.

---

### A-5: Deferred Revenue Page
**Route:** `/app/reports/deferred`
**File:** Create new component `src/app/features/catering/catering-deferred-report/catering-deferred-report.component.ts`

**Route update required in `app.routes.ts`:**
```typescript
// REPLACE:
{ path: 'reports/deferred', loadComponent: () => import('./features/catering/catering-stub/catering-stub.component').then(m => m.CateringStubComponent), data: { title: 'Deferred Revenue' } },
// WITH:
{ path: 'reports/deferred', loadComponent: () => import('./features/catering/catering-deferred-report/catering-deferred-report.component').then(m => m.CateringDeferredReportComponent) },
```

**What to build:**
Deferred revenue breakdown — money collected for events not yet fulfilled.
Calls `loadDeferredRevenue()`.

**UI spec:**
- Page header: "Deferred Revenue"
- Loading spinner while fetching
- Summary strip:
  - Total Booked | Total Collected | Recognized | Still Deferred
- Table with columns:
  - Job title (link to `/app/catering/job/:id`)
  - Event date (`fulfillmentDate`)
  - Total value
  - Paid (collected)
  - Recognized (fulfilled portion)
  - Deferred (still owed/unearned) — highlight in orange if > 0
- Footer row with totals
- Empty state: "No deferred revenue entries"

**Data source:** `cateringService.loadDeferredRevenue()` in `ngOnInit`.

---

### A-6: Catering Packages Page (Menu → Packages)
**Route:** `/app/menu/packages`
**File:** Create new component `src/app/features/catering/catering-packages/catering-packages.component.ts`

**Route update required in `app.routes.ts`:**
```typescript
// REPLACE:
{ path: 'menu/packages', loadComponent: () => import('./features/catering/catering-stub/catering-stub.component').then(m => m.CateringStubComponent), data: { title: 'Catering Packages' } },
// WITH:
{ path: 'menu/packages', loadComponent: () => import('./features/catering/catering-packages/catering-packages.component').then(m => m.CateringPackagesComponent) },
```

**What to build:**
A package template library. Packages are embedded on each job in `CateringJob.packages[]`.
This page provides a library of reusable package templates that operators can copy onto new jobs.

**Note:** Packages do NOT have their own API endpoint — they live on the job. This page should
display all unique packages across all jobs as templates, plus allow creating new template packages
that can be applied to any job.

**UI spec:**
- Page header: "Catering Packages" + "New Package" button
- Explanation callout: "Packages are assigned to individual jobs. Templates here can be applied when creating or editing a job."
- Package cards grid (2 cols desktop, 1 col mobile):
  - Per unique package name across all jobs (deduplicated by name)
  - Shows: name, tier badge (Standard / Premium / Custom), pricing model, price per unit, minimum headcount
  - Shows menu items count (e.g. "8 menu items")
  - "View Items" button → expands to show item list inline
  - "Edit" button → opens slide-in form
  - "Delete" button (with confirmation — but note: package templates are not stored separately, 
    so "delete" just removes from the in-memory template list with a toast explaining 
    "This removes the template. Existing job packages are unaffected.")
- New/Edit form (slide-in panel):
  - Name (text input)
  - Tier (select: standard / premium / custom)
  - Pricing model (select: per_person / per_tray / flat)
  - Price per unit (number input, in dollars)
  - Minimum headcount (number input)
  - Description (textarea)
  - Menu items picker (checkbox list from `menuService.menuItems()`, filterable by name, 
    shows catering pricing tier if set)
- Save stores template in `signal<CateringPackage[]>` (in-memory template library)
  Note: Persisting a package library to the backend (e.g. `/api/merchant/:id/catering/packages`)
  is a future backend enhancement. For now, derive templates from existing jobs.

**Data source:**
```typescript
// Derive unique package templates from all jobs
readonly packageTemplates = computed((): CateringPackage[] => {
  const seen = new Map<string, CateringPackage>();
  for (const job of this.cateringService.jobs()) {
    for (const pkg of job.packages) {
      if (!seen.has(pkg.name)) seen.set(pkg.name, pkg);
    }
  }
  return [...seen.values()];
});
```

Inject `CateringService` and `MenuService`.

---

## Group B — Requires Backend Work (4 settings stubs)

These stub routes in `app.routes.ts` require new backend schema columns and/or
external service integrations. Do NOT implement as real UI yet — leave as enhanced
stubs with a roadmap card instead of just "Coming soon."

### B-1: Business Info (`/app/settings/business`)
**Depends on:** New columns on `Restaurant` Prisma model (legalName, taxId, businessType, etc.)
**Action:** Replace "Coming soon." text with a card: "Business Info settings are coming soon.
This will allow you to set your legal business name, tax ID, and catering license details."

### B-2: Invoice Branding (`/app/settings/branding`)
**Depends on:** CLAUDE.md item #14 — `brandingLogoUrl`, `brandingColor`, `invoiceFooter`
columns on `Restaurant` Prisma model
**Action:** Replace "Coming soon." text with a card explaining what this will contain.

### B-3: Payment Setup (`/app/settings/payments`)
**Depends on:** Payment processor integration (Stripe Connect or similar)
**Action:** Replace "Coming soon." text with a card.

### B-4: Notifications (`/app/settings/notifications`)
**Depends on:** CLAUDE.md item #23 — Resend email service
**Action:** Replace "Coming soon." text with a card.

---

## Implementation Order

1. A-3 (Milestones) — highest operator value, payments are time-sensitive
2. A-1 (Proposals) — second highest urgency, client-facing follow-up
3. A-2 (Delivery) — operational necessity for off-site jobs
4. A-4 (Revenue Reports) — management visibility
5. A-5 (Deferred Revenue) — accounting visibility
6. A-6 (Packages) — menu/pricing management
7. B-1 through B-4 — enhanced stubs (low effort, removes "Coming soon." text)

---

## Shared Patterns for All Group A Components

```typescript
// Standard component scaffold
@Component({
  selector: 'os-catering-[name]',
  standalone: true,
  imports: [DatePipe, CurrencyPipe, RouterLink, /* others as needed */],
  templateUrl: './catering-[name].component.html',
  styleUrl: './catering-[name].component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Catering[Name]Component implements OnInit { ... }
```

- Use `os-page-header` / `os-page-content` CSS classes for consistent layout
- Use Bootstrap 5.3 classes for layout, cards, tables, badges
- Use `bi-*` Bootstrap Icons
- Loading state: `signal<boolean>(false)` → show Bootstrap spinner
- Error state: `signal<string | null>(null)` → show dismissible alert
- All money values stored as cents, display with `| currency` pipe or custom `formatCents()`
- No `ngOnChanges`, no `@Input` props — all data from injected services

---

## Unit Tests Required (per component)

Each new component needs Vitest unit tests:
1. Renders without error when service returns empty array
2. Renders correct count when service has data
3. Filter/computed signal returns correct subset
4. markMilestonePaid (A-3) called with correct args on button click
5. generateProposal (A-1) called and URL copied on "Resend"
6. updateJob called with deliveryDetails on save (A-2)

## E2E Tests Required

Playwright tests (add to existing catering E2E file):
1. Navigate to each stub route → assert no "Coming soon" text
2. Navigate to /app/invoicing/milestones → assert milestone table renders
3. Navigate to /app/catering/proposals → assert proposal list renders
4. Navigate to /app/catering/delivery → assert delivery cards render
