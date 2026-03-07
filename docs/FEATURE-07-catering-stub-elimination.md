# FEATURE-07: Catering Stub Elimination — Complete Implementation

## Status: PENDING IMPLEMENTATION

## Source
Derived from FEATURE-06-catering-stub-completion.md. Elevates every spec to a complete,
production-quality implementation plan with exact file paths, component scaffolds,
routing surgery, test coverage, and ordering.

---

## Scope

10 stub pages → 0 stubs. All 10 routes currently show "Coming soon." text.

| Route | Current stub | Target |
|---|---|---|
| `/app/catering/proposals` | Inline component stub | Full proposals list with Resend action |
| `/app/catering/delivery` | Inline component stub | Full delivery schedule with inline editor |
| `/app/invoicing/milestones` | `CateringStubComponent` | Cross-job milestone tracker + KPIs |
| `/app/reports/revenue` | `CateringStubComponent` | Revenue KPI cards + CSS bar charts |
| `/app/reports/deferred` | `CateringStubComponent` | Deferred revenue table with totals |
| `/app/menu/packages` | `CateringStubComponent` | Package template library + slide-in form |
| `/app/settings/business` | `CateringStubComponent` | Enhanced roadmap stub card |
| `/app/settings/branding` | `CateringStubComponent` | Enhanced roadmap stub card |
| `/app/settings/payments` | `CateringStubComponent` | Enhanced roadmap stub card |
| `/app/settings/notifications` | `CateringStubComponent` | Enhanced roadmap stub card |

---

## Group A — Full Implementations (6 components)

All Group A components use existing `CateringService` methods. No backend changes needed.

---

### A-1: Catering Proposals

**Route already wired:** `catering/proposals` → `CateringProposalsComponent`
**Current file:** `src/app/features/catering/catering-proposals/catering-proposals.component.ts` (inline stub)
**No `app.routes.ts` change needed** — route already points to the correct component class.

#### Files to create/rewrite:
- `catering-proposals.component.ts` — full rewrite
- `catering-proposals.component.html` — NEW file
- `catering-proposals.component.scss` — NEW file
- `catering-proposals.component.spec.ts` — NEW file

#### Component design:

```typescript
@Component({
  selector: 'os-catering-proposals',
  standalone: true,
  imports: [DatePipe, CurrencyPipe, RouterLink, FormsModule],
  templateUrl: './catering-proposals.component.html',
  styleUrl: './catering-proposals.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CateringProposalsComponent implements OnInit {
  private readonly cateringService = inject(CateringService);
  private readonly router = inject(Router);

  readonly isLoading = signal(false);
  readonly copiedJobId = signal<string | null>(null);  // drives "Copied!" toast replacement

  readonly proposals = computed(() =>
    this.cateringService.jobs()
      .filter(j => j.status === 'proposal_sent')
      .sort((a, b) => a.fulfillmentDate.localeCompare(b.fulfillmentDate))
  );

  async ngOnInit(): Promise<void> {
    this.isLoading.set(true);
    await this.cateringService.loadJobs();
    this.isLoading.set(false);
  }

  formatCents(cents: number): string { ... }  // same pattern as catering-reports

  daysSince(dateStr: string): number {
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  }

  async resendProposal(job: CateringJob): Promise<void> {
    const result = await this.cateringService.generateProposal(job.id);
    if (result) {
      const url = `${window.location.origin}/catering/proposal/${result.token}`;
      await navigator.clipboard.writeText(url);
      this.copiedJobId.set(job.id);
      setTimeout(() => this.copiedJobId.set(null), 2500);
    }
  }
}
```

#### Template spec:
- Page header div: `<h2>Proposals</h2>` + `<a routerLink="/app/catering" class="btn btn-primary btn-sm">New Job</a>`
- Bootstrap spinner while `isLoading()`
- Empty state (`proposals().length === 0` and not loading): `bi-file-earmark-text` icon, "No proposals awaiting approval"
- `@for` table row per proposal:
  - Client name (fw-semibold) + company name (text-muted small) if present
  - Event title + event type badge (`badge bg-secondary text-capitalize`)
  - Event date (DatePipe 'mediumDate')
  - Headcount (`bi-people` icon + number)
  - Total (CurrencyPipe)
  - "Sent X days ago" (daysSince from bookingDate)
  - "View Job" RouterLink button (btn-outline-primary btn-sm)
  - "Resend & Copy Link" button: disabled + spinner while that job is loading; shows "Copied!" with `bi-check2` icon for 2.5s after copy (driven by `copiedJobId() === job.id`)
- Table columns: Client | Event | Date | Guests | Total | Sent | Actions
- Sort: already sorted by fulfillmentDate ascending

#### SCSS: follows `.catering-reports` pattern — `padding: 1.5rem`, kpi-card, table th uppercase small

---

### A-2: Catering Delivery

**Route already wired:** `catering/delivery` → `CateringDeliveryComponent`
**Current file:** `src/app/features/catering/catering-delivery/catering-delivery.component.ts` (inline stub)
**No `app.routes.ts` change needed.**

#### Files to create/rewrite:
- `catering-delivery.component.ts` — full rewrite
- `catering-delivery.component.html` — NEW file
- `catering-delivery.component.scss` — NEW file
- `catering-delivery.component.spec.ts` — NEW file

#### Component design:

```typescript
type DateFilter = 'today' | 'week' | 'month';

@Component({
  selector: 'os-catering-delivery',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink],
  templateUrl: './catering-delivery.component.html',
  styleUrl: './catering-delivery.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CateringDeliveryComponent implements OnInit {
  private readonly cateringService = inject(CateringService);
  private readonly router = inject(Router);

  readonly isLoading = signal(false);
  readonly dateFilter = signal<DateFilter>('week');
  // Per-job inline delivery detail editors (jobId → mutable DeliveryDetails copy)
  readonly editingDelivery = signal<Record<string, DeliveryDetails>>({});
  readonly savingJobId = signal<string | null>(null);
  readonly expandedJobId = signal<string | null>(null);

  readonly deliveryJobs = computed(() => {
    const jobs = this.cateringService.jobs()
      .filter(j => j.locationType === 'off_site' && j.status !== 'cancelled');
    const today = new Date();
    const filter = this.dateFilter();
    return jobs.filter(j => {
      const d = new Date(j.fulfillmentDate);
      if (filter === 'today') return d.toDateString() === today.toDateString();
      if (filter === 'week') {
        const weekOut = new Date(today); weekOut.setDate(weekOut.getDate() + 7);
        return d >= today && d <= weekOut;
      }
      // month
      const monthOut = new Date(today); monthOut.setDate(monthOut.getDate() + 30);
      return d >= today && d <= monthOut;
    }).sort((a, b) => a.fulfillmentDate.localeCompare(b.fulfillmentDate));
  });

  async ngOnInit(): Promise<void> {
    this.isLoading.set(true);
    await this.cateringService.loadJobs();
    this.isLoading.set(false);
  }

  toggleExpand(jobId: string): void {
    this.expandedJobId.update(id => id === jobId ? null : jobId);
  }

  // Initialize editing copy for a job if not already present
  initEditor(job: CateringJob): void {
    const existing = this.editingDelivery()[job.id];
    if (!existing) {
      const d = job.deliveryDetails ?? {};
      this.editingDelivery.update(map => ({ ...map, [job.id]: { ...d } }));
    }
  }

  updateField(jobId: string, field: keyof DeliveryDetails, value: string): void {
    this.editingDelivery.update(map => ({
      ...map,
      [jobId]: { ...(map[jobId] ?? {}), [field]: value },
    }));
  }

  async saveDelivery(job: CateringJob): Promise<void> {
    const details = this.editingDelivery()[job.id];
    if (!details) return;
    this.savingJobId.set(job.id);
    // Convert equipmentChecklist string back to array
    const deliveryDetails: DeliveryDetails = {
      ...details,
      equipmentChecklist: typeof details.equipmentChecklist === 'string'
        ? (details.equipmentChecklist as string).split('\n').map(s => s.trim()).filter(Boolean)
        : details.equipmentChecklist,
    };
    await this.cateringService.updateJob(job.id, { deliveryDetails });
    this.savingJobId.set(null);
  }
}
```

#### Template spec:
- Page header: "Delivery Schedule"
- Date filter pill group: `Today | This Week | This Month` — Bootstrap `btn-group` or nav pills, updates `dateFilter` signal
- Empty state: `bi-truck` icon, "No off-site deliveries scheduled for this period"
- Card per job (`@for deliveryJobs`):
  - Card header row: event title (fw-semibold) + client name + fulfillment date + headcount badge + "View Job" RouterLink
  - Delivery address: `bi-geo-alt` + `job.locationAddress ?? 'No address set'`
  - Time: `job.startTime → job.endTime` or "Time TBD"
  - If `deliveryDetails` is null and not expanded: grey "Set Delivery Details" button → calls `initEditor(job)` + `expandedJobId.set(job.id)`
  - If expanded (`expandedJobId() === job.id`):
    - Collapse chevron button in header
    - 2-column grid form:
      - Driver Name, Driver Phone
      - Load Time, Departure Time, Arrival Time
      - Vehicle Description (text)
      - Setup Time, Breakdown Time
      - Route Notes (textarea, full width)
      - Equipment Checklist (textarea, one per line, full width)
    - Save button (`btn-primary`) → `saveDelivery(job)`, shows spinner if `savingJobId() === job.id`
    - Already-set details show in the form pre-filled (via `editingDelivery()[job.id]`)
  - If `deliveryDetails` is set and not expanded: summary chips (driver name, departure time, address)
    + "Edit" button → calls `initEditor(job)` + expand

#### SCSS: card padding, `.delivery-grid` 2-col responsive, `.detail-chip`

---

### A-3: Catering Milestones

**Route:** `invoicing/milestones` currently → `CateringStubComponent`
**`app.routes.ts` change required** — replace stub with new component.

#### Files to create:
- `src/app/features/catering/catering-milestones/catering-milestones.component.ts` — NEW
- `src/app/features/catering/catering-milestones/catering-milestones.component.html` — NEW
- `src/app/features/catering/catering-milestones/catering-milestones.component.scss` — NEW
- `src/app/features/catering/catering-milestones/catering-milestones.component.spec.ts` — NEW

#### Route change in `app.routes.ts`:
```typescript
// BEFORE:
{ path: 'invoicing/milestones', loadComponent: () => import('./features/catering/catering-stub/catering-stub.component').then(m => m.CateringStubComponent), data: { title: 'Milestone Payments' } },
// AFTER:
{ path: 'invoicing/milestones', loadComponent: () => import('./features/catering/catering-milestones/catering-milestones.component').then(m => m.CateringMilestonesComponent) },
```

#### Interface (internal to component):
```typescript
interface FlatMilestone extends CateringMilestonePayment {
  jobId: string;
  jobTitle: string;
  clientName: string;
}

type MilestoneFilter = 'all' | 'due_soon' | 'overdue' | 'unpaid' | 'paid';
```

#### Component design:
```typescript
@Component({
  selector: 'os-catering-milestones',
  standalone: true,
  imports: [DatePipe, CurrencyPipe, RouterLink],
  templateUrl: './catering-milestones.component.html',
  styleUrl: './catering-milestones.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CateringMilestonesComponent implements OnInit {
  private readonly cateringService = inject(CateringService);
  private readonly router = inject(Router);

  readonly isLoading = signal(false);
  readonly activeFilter = signal<MilestoneFilter>('all');
  readonly markingPaidId = signal<string | null>(null);  // milestoneId being saved

  private readonly today = new Date().toISOString().split('T')[0];
  private readonly weekOut = new Date(Date.now() + 7 * 86_400_000).toISOString().split('T')[0];

  // All non-cancelled/completed jobs' milestones, flattened
  private readonly allFlatMilestones = computed((): FlatMilestone[] =>
    this.cateringService.jobs()
      .filter(j => j.status !== 'cancelled' && j.status !== 'completed')
      .flatMap(j => (j.milestones ?? []).map(m => ({
        ...m,
        jobId: j.id,
        jobTitle: j.title,
        clientName: j.clientName,
      })))
      .sort((a, b) => {
        // overdue first, then by dueDate
        const aOverdue = !a.paidAt && a.dueDate && a.dueDate < this.today;
        const bOverdue = !b.paidAt && b.dueDate && b.dueDate < this.today;
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;
        return (a.dueDate ?? '').localeCompare(b.dueDate ?? '');
      })
  );

  readonly filteredMilestones = computed((): FlatMilestone[] => {
    const f = this.activeFilter();
    const all = this.allFlatMilestones();
    if (f === 'all') return all;
    if (f === 'paid') return all.filter(m => !!m.paidAt);
    if (f === 'unpaid') return all.filter(m => !m.paidAt);
    if (f === 'overdue') return all.filter(m => !m.paidAt && m.dueDate && m.dueDate < this.today);
    if (f === 'due_soon') return all.filter(m => !m.paidAt && m.dueDate && m.dueDate >= this.today && m.dueDate <= this.weekOut);
    return all;
  });

  // KPI computed values
  readonly totalOutstanding = computed(() =>
    this.allFlatMilestones().filter(m => !m.paidAt).reduce((s, m) => s + m.amountCents, 0)
  );
  readonly dueThisWeek = computed(() =>
    this.allFlatMilestones().filter(m => !m.paidAt && m.dueDate && m.dueDate >= this.today && m.dueDate <= this.weekOut).length
  );
  readonly overdueCount = computed(() =>
    this.allFlatMilestones().filter(m => !m.paidAt && m.dueDate && m.dueDate < this.today).length
  );
  readonly collectedThisMonth = computed(() => {
    const monthStart = new Date(); monthStart.setDate(1);
    const ms = monthStart.toISOString().split('T')[0];
    return this.allFlatMilestones()
      .filter(m => m.paidAt && m.paidAt >= ms)
      .reduce((s, m) => s + m.amountCents, 0);
  });

  async ngOnInit(): Promise<void> {
    this.isLoading.set(true);
    await this.cateringService.loadJobs();
    this.isLoading.set(false);
  }

  setFilter(f: MilestoneFilter): void { this.activeFilter.set(f); }

  milestoneStatus(m: FlatMilestone): 'paid' | 'overdue' | 'due_soon' | 'pending' {
    if (m.paidAt) return 'paid';
    if (m.dueDate && m.dueDate < this.today) return 'overdue';
    if (m.dueDate && m.dueDate <= this.weekOut) return 'due_soon';
    return 'pending';
  }

  statusBadgeClass(status: ReturnType<this['milestoneStatus']>): string {
    return { paid: 'bg-success', overdue: 'bg-danger', due_soon: 'bg-warning text-dark', pending: 'bg-secondary' }[status];
  }

  async markPaid(m: FlatMilestone): Promise<void> {
    if (m.paidAt) return;
    this.markingPaidId.set(m.id);
    await this.cateringService.markMilestonePaid(m.jobId, m.id);
    this.markingPaidId.set(null);
  }

  formatCents(cents: number): string { ... }
}
```

#### Template spec:
- Page header: "Milestone Payments"
- Bootstrap spinner while `isLoading()`
- KPI strip (4 cards): Outstanding ($) | Due This Week (count) | Overdue (count, red if > 0) | Collected This Month ($)
- Filter pills: `All | Due Soon | Overdue | Unpaid | Paid` — Bootstrap nav pills or btn-group
- Empty state for `filteredMilestones().length === 0`: "No milestones match this filter"
- Responsive table:
  - Columns: Job | Client | Milestone | Amount | Due Date | Status | Action
  - Job cell: RouterLink to `/app/catering/job/:jobId`
  - Status: badge with `statusBadgeClass()` — Paid shows paidAt date in small text below badge
  - Action: "Mark Paid" btn-success btn-sm, disabled if `m.paidAt` or `markingPaidId() === m.id`, spinner when marking

#### SCSS: same kpi-grid pattern as catering-reports, overdue row highlight via `.overdue-row { background: rgba(var(--bs-danger-rgb), 0.05); }`

---

### A-4: Catering Revenue Report

**Route:** `reports/revenue` currently → `CateringStubComponent`
**`app.routes.ts` change required.**

#### Files to create:
- `src/app/features/catering/catering-revenue-report/catering-revenue-report.component.ts` — NEW
- `src/app/features/catering/catering-revenue-report/catering-revenue-report.component.html` — NEW
- `src/app/features/catering/catering-revenue-report/catering-revenue-report.component.scss` — NEW
- `src/app/features/catering/catering-revenue-report/catering-revenue-report.component.spec.ts` — NEW

#### Route change in `app.routes.ts`:
```typescript
// BEFORE:
{ path: 'reports/revenue', loadComponent: () => import('./features/catering/catering-stub/catering-stub.component').then(m => m.CateringStubComponent), data: { title: 'Revenue Reports' } },
// AFTER:
{ path: 'reports/revenue', loadComponent: () => import('./features/catering/catering-revenue-report/catering-revenue-report.component').then(m => m.CateringRevenueReportComponent) },
```

#### Component design:
```typescript
@Component({
  selector: 'os-catering-revenue-report',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './catering-revenue-report.component.html',
  styleUrl: './catering-revenue-report.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CateringRevenueReportComponent implements OnInit {
  private readonly cateringService = inject(CateringService);

  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly performance = signal<CateringPerformanceReport | null>(null);

  readonly outstandingBalance = this.cateringService.outstandingBalance;

  readonly revenueByTypeEntries = computed(() =>
    Object.entries(this.performance()?.revenueByEventType ?? {})
      .sort((a, b) => b[1] - a[1])
  );

  readonly revenueByMonthEntries = computed(() =>
    Object.entries(this.performance()?.revenueByMonth ?? {})
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)  // last 6 months
  );

  readonly maxTypeRevenue = computed(() =>
    Math.max(1, ...this.revenueByTypeEntries().map(e => e[1]))
  );

  readonly maxMonthRevenue = computed(() =>
    Math.max(1, ...this.revenueByMonthEntries().map(e => e[1]))
  );

  async ngOnInit(): Promise<void> {
    this.isLoading.set(true);
    try {
      const perf = await this.cateringService.loadPerformanceReport();
      this.performance.set(perf);
    } catch {
      this.error.set('Unable to load revenue report.');
    } finally {
      this.isLoading.set(false);
    }
  }

  barWidthPct(value: number, max: number): string {
    return `${Math.round((value / max) * 100)}%`;
  }

  formatCents(cents: number): string { ... }
}
```

#### Template spec:
- Page header: "Revenue Reports" + `<a routerLink="/app/catering/reports" class="btn btn-outline-secondary btn-sm">Full Report</a>`
- Spinner while loading; error alert if error
- Empty state if `!performance()` and not loading
- KPI cards row (6 cards): Total Jobs | Completed | Cancelled | Close Rate | Total Revenue | Avg Job Value
- Plus Outstanding Balance card sourced from `cateringService.outstandingBalance()` (signal, not async)
- "Revenue by Event Type" section: pure CSS horizontal bars
  ```html
  @for (entry of revenueByTypeEntries(); track entry[0]) {
    <div class="bar-row">
      <span class="bar-label text-capitalize">{{ entry[0] }}</span>
      <div class="bar-track">
        <div class="bar-fill" [style.width]="barWidthPct(entry[1], maxTypeRevenue())"></div>
      </div>
      <span class="bar-value">{{ formatCents(entry[1]) }}</span>
    </div>
  }
  ```
- "Revenue by Month" section: same pattern with month labels

#### SCSS: `.bar-row` flex, `.bar-track` flex-1 height 12px bg tertiary border-radius, `.bar-fill` bg-primary border-radius transition

---

### A-5: Catering Deferred Revenue Report

**Route:** `reports/deferred` currently → `CateringStubComponent`
**`app.routes.ts` change required.**

#### Files to create:
- `src/app/features/catering/catering-deferred-report/catering-deferred-report.component.ts` — NEW
- `src/app/features/catering/catering-deferred-report/catering-deferred-report.component.html` — NEW
- `src/app/features/catering/catering-deferred-report/catering-deferred-report.component.scss` — NEW
- `src/app/features/catering/catering-deferred-report/catering-deferred-report.component.spec.ts` — NEW

#### Route change in `app.routes.ts`:
```typescript
// BEFORE:
{ path: 'reports/deferred', loadComponent: () => import('./features/catering/catering-stub/catering-stub.component').then(m => m.CateringStubComponent), data: { title: 'Deferred Revenue' } },
// AFTER:
{ path: 'reports/deferred', loadComponent: () => import('./features/catering/catering-deferred-report/catering-deferred-report.component').then(m => m.CateringDeferredReportComponent) },
```

#### Component design:
```typescript
@Component({
  selector: 'os-catering-deferred-report',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './catering-deferred-report.component.html',
  styleUrl: './catering-deferred-report.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CateringDeferredReportComponent implements OnInit {
  private readonly cateringService = inject(CateringService);

  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly entries = signal<CateringDeferredRevenueEntry[]>([]);

  // Summary totals
  readonly totalBooked = computed(() => this.entries().reduce((s, e) => s + e.totalCents, 0));
  readonly totalPaid = computed(() => this.entries().reduce((s, e) => s + e.paidCents, 0));
  readonly totalRecognized = computed(() => this.entries().reduce((s, e) => s + e.recognizedCents, 0));
  readonly totalDeferred = computed(() => this.entries().reduce((s, e) => s + e.deferredCents, 0));

  async ngOnInit(): Promise<void> {
    this.isLoading.set(true);
    try {
      const data = await this.cateringService.loadDeferredRevenue();
      this.entries.set(data ?? []);
    } catch {
      this.error.set('Unable to load deferred revenue data.');
    } finally {
      this.isLoading.set(false);
    }
  }

  formatCents(cents: number): string { ... }
}
```

#### Template spec:
- Page header: "Deferred Revenue"
- Spinner / error alert
- Summary strip (4 stat cards): Total Booked | Collected | Recognized | Deferred (orange if > 0)
- Empty state if `entries().length === 0`
- Table: Job | Event Date | Total | Collected | Recognized | Deferred
  - Job cell: RouterLink to `/app/catering/job/:jobId`
  - Deferred cell: `fw-semibold text-warning` if `entry.deferredCents > 0`
- Table `<tfoot>` row with column totals (bold)

#### SCSS: same pattern, `.deferred-positive { color: var(--bs-warning-text-emphasis); font-weight: 600; }`

---

### A-6: Catering Packages

**Route:** `menu/packages` currently → `CateringStubComponent`
**`app.routes.ts` change required.**

#### Files to create:
- `src/app/features/catering/catering-packages/catering-packages.component.ts` — NEW
- `src/app/features/catering/catering-packages/catering-packages.component.html` — NEW
- `src/app/features/catering/catering-packages/catering-packages.component.scss` — NEW
- `src/app/features/catering/catering-packages/catering-packages.component.spec.ts` — NEW

#### Route change in `app.routes.ts`:
```typescript
// BEFORE:
{ path: 'menu/packages', loadComponent: () => import('./features/catering/catering-stub/catering-stub.component').then(m => m.CateringStubComponent), data: { title: 'Catering Packages' } },
// AFTER:
{ path: 'menu/packages', loadComponent: () => import('./features/catering/catering-packages/catering-packages.component').then(m => m.CateringPackagesComponent) },
```

#### Component design:
```typescript
@Component({
  selector: 'os-catering-packages',
  standalone: true,
  imports: [FormsModule, CurrencyPipe],
  templateUrl: './catering-packages.component.html',
  styleUrl: './catering-packages.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CateringPackagesComponent implements OnInit {
  private readonly cateringService = inject(CateringService);
  private readonly menuService = inject(MenuService);

  readonly isLoading = signal(false);
  readonly showForm = signal(false);
  readonly expandedPackageId = signal<string | null>(null);
  readonly editingPackage = signal<CateringPackage | null>(null);
  readonly deleteConfirmId = signal<string | null>(null);
  readonly deletedMessage = signal(false);

  // In-memory template library, seeded from jobs
  private readonly _templates = signal<CateringPackage[]>([]);

  readonly templates = this._templates.asReadonly();

  // Derived from all jobs (deduplicated by name) — seeds initial templates
  readonly jobPackageTemplates = computed((): CateringPackage[] => {
    const seen = new Map<string, CateringPackage>();
    for (const job of this.cateringService.jobs()) {
      for (const pkg of (job.packages ?? [])) {
        if (!seen.has(pkg.name)) seen.set(pkg.name, pkg);
      }
    }
    return [...seen.values()];
  });

  // Merged: job-derived + manually added templates (manual ones override job-derived by name)
  readonly mergedTemplates = computed((): CateringPackage[] => {
    const manualMap = new Map(this._templates().map(t => [t.name, t]));
    const merged = new Map<string, CateringPackage>();
    for (const t of this.jobPackageTemplates()) {
      merged.set(t.name, t);
    }
    for (const t of this._templates()) {
      merged.set(t.name, t);  // manual overrides job-derived
    }
    return [...merged.values()];
  });

  readonly cateringMenuItems = computed(() => this.menuService.cateringItems());
  readonly menuItemFilter = signal('');
  readonly filteredMenuItems = computed(() => {
    const f = this.menuItemFilter().toLowerCase();
    return this.cateringMenuItems().filter(i => !f || i.name.toLowerCase().includes(f));
  });

  // Form fields (bound via [(ngModel)])
  formName = '';
  formTier: 'standard' | 'premium' | 'custom' = 'standard';
  formPricingModel: 'per_person' | 'per_tray' | 'flat' = 'per_person';
  formPricePerUnit = 0;
  formMinHeadcount = 0;
  formDescription = '';
  formSelectedItemIds: string[] = [];

  async ngOnInit(): Promise<void> {
    this.isLoading.set(true);
    await Promise.all([
      this.cateringService.loadJobs(),
      this.menuService.loadMenu(),
    ]);
    this.isLoading.set(false);
  }

  toggleExpand(pkgId: string): void {
    this.expandedPackageId.update(id => id === pkgId ? null : pkgId);
  }

  openNewForm(): void {
    this.editingPackage.set(null);
    this.formName = '';
    this.formTier = 'standard';
    this.formPricingModel = 'per_person';
    this.formPricePerUnit = 0;
    this.formMinHeadcount = 0;
    this.formDescription = '';
    this.formSelectedItemIds = [];
    this.menuItemFilter.set('');
    this.showForm.set(true);
  }

  openEditForm(pkg: CateringPackage): void {
    this.editingPackage.set(pkg);
    this.formName = pkg.name;
    this.formTier = pkg.tier;
    this.formPricingModel = pkg.pricingModel;
    this.formPricePerUnit = pkg.pricePerUnit;
    this.formMinHeadcount = pkg.minimumHeadcount;
    this.formDescription = pkg.description ?? '';
    this.formSelectedItemIds = [...(pkg.menuItemIds ?? [])];
    this.menuItemFilter.set('');
    this.showForm.set(true);
  }

  toggleItemSelection(itemId: string): void {
    const ids = this.formSelectedItemIds;
    const idx = ids.indexOf(itemId);
    if (idx >= 0) {
      this.formSelectedItemIds = ids.filter(id => id !== itemId);
    } else {
      this.formSelectedItemIds = [...ids, itemId];
    }
  }

  saveTemplate(): void {
    if (!this.formName.trim()) return;
    const existing = this.editingPackage();
    const pkg: CateringPackage = {
      id: existing?.id ?? crypto.randomUUID(),
      name: this.formName.trim(),
      tier: this.formTier,
      pricingModel: this.formPricingModel,
      pricePerUnit: this.formPricePerUnit,
      minimumHeadcount: this.formMinHeadcount,
      description: this.formDescription || undefined,
      menuItemIds: [...this.formSelectedItemIds],
      menuItems: this.formSelectedItemIds.map(id => {
        const item = this.cateringMenuItems().find(i => i.id === id);
        return { id, name: item?.name ?? 'Unknown' };
      }),
    };
    if (existing) {
      this._templates.update(list => list.map(t => t.id === existing.id ? pkg : t));
    } else {
      this._templates.update(list => [...list, pkg]);
    }
    this.showForm.set(false);
  }

  confirmDelete(pkgId: string): void { this.deleteConfirmId.set(pkgId); }

  cancelDelete(): void { this.deleteConfirmId.set(null); }

  deleteTemplate(pkgId: string): void {
    this._templates.update(list => list.filter(t => t.id !== pkgId));
    this.deleteConfirmId.set(null);
    this.deletedMessage.set(true);
    setTimeout(() => this.deletedMessage.set(false), 3000);
  }

  formatCents(cents: number): string { ... }

  tierBadgeClass(tier: string): string {
    return { standard: 'bg-secondary', premium: 'bg-warning text-dark', custom: 'bg-info text-dark' }[tier] ?? 'bg-secondary';
  }
}
```

#### Template spec:
- Page header: "Catering Packages" + "New Package" btn-primary
- Info callout (Bootstrap `alert alert-info`): "Package templates are derived from jobs and can be used as starting points when creating new events. Changes here do not affect existing job packages."
- Success toast: "Template removed. Existing job packages are not affected." (shown for 3s when `deletedMessage()`)
- Spinner while loading
- Empty state if `mergedTemplates().length === 0`
- Package card grid (Bootstrap `row g-3`, `col-md-6`):
  - Card with: name (h6 fw-semibold) + tier badge + pricing model label + `$X per person/tray/flat`
  - Min headcount if set
  - "X menu items" badge
  - Button row: "View Items" toggle, "Edit", "Delete"
  - Expanded items section (`@if expandedPackageId() === pkg.id`): list of item names with catering tier info if set
  - Delete confirmation inline: "Remove this template? Existing job packages are unaffected. [Confirm] [Cancel]"
- Slide-in form panel (right side, `position: fixed`, or Bootstrap offcanvas-style):
  - Title: "New Package" or "Edit Package"
  - Fields: Name*, Tier (select), Pricing Model (select), Price Per Unit ($), Min Headcount, Description
  - "Menu Items" section: filter input + scrollable checklist with checkboxes
  - Save / Cancel buttons
  - * = required, validation on Save

#### SCSS: `.package-grid`, `.form-panel` slide-in overlay (right side, 480px wide, full-height, position fixed, z-index 1050), `.form-overlay` semi-transparent backdrop

---

## Group B — Enhanced Stubs (4 routes)

**Strategy:** Rewrite `CateringStubComponent` to render a proper roadmap card instead of bare "Coming soon." text. All 4 Group B routes already point to `CateringStubComponent` with `data: { title }`. No route changes needed.

#### File to rewrite:
- `src/app/features/catering/catering-stub/catering-stub.component.ts` — full rewrite

#### Enhanced stub design:
```typescript
@Component({
  selector: 'os-catering-stub',
  standalone: true,
  imports: [ActivatedRoute],  // already injected
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container-fluid py-4">
      <div class="d-flex align-items-center gap-3 mb-4">
        <div class="stub-icon-wrap">
          <i [class]="'bi ' + icon + ' fs-3 text-primary'"></i>
        </div>
        <div>
          <h2 class="mb-0">{{ title }}</h2>
          <p class="text-muted mb-0 small">{{ subtitle }}</p>
        </div>
      </div>

      <div class="card border-0 bg-body-secondary">
        <div class="card-body py-5 text-center">
          <div class="roadmap-badge mb-3">
            <span class="badge bg-warning text-dark">
              <i class="bi bi-calendar3 me-1"></i>Coming Soon
            </span>
          </div>
          <h5 class="mb-2">{{ comingSoonTitle }}</h5>
          <p class="text-muted mb-4" style="max-width: 480px; margin: 0 auto;">{{ description }}</p>
          <div class="d-flex flex-wrap justify-content-center gap-2">
            @for (dep of dependencies; track dep) {
              <span class="badge bg-light text-dark border">
                <i class="bi bi-gear me-1"></i>{{ dep }}
              </span>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .stub-icon-wrap { width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;
      background: var(--bs-primary-bg-subtle); border-radius: 12px; flex-shrink: 0; }
  `]
})
export class CateringStubComponent {
  private readonly route = inject(ActivatedRoute);
  readonly title = this.route.snapshot.data['title'] ?? 'Coming Soon';

  readonly config: Record<string, { icon: string; subtitle: string; comingSoonTitle: string; description: string; dependencies: string[] }> = {
    'Business Info': {
      icon: 'bi-building',
      subtitle: 'Legal and tax information for your catering business',
      comingSoonTitle: 'Business Info Settings',
      description: 'Set your legal business name, EIN/Tax ID, catering license number, and business type. This information is used on client invoices and proposals.',
      dependencies: ['Restaurant Prisma schema update', 'Legal name / tax fields'],
    },
    'Invoice Branding': {
      icon: 'bi-palette',
      subtitle: 'Customize the look of your client-facing invoices and proposals',
      comingSoonTitle: 'Invoice Branding',
      description: 'Upload your logo, choose brand colors, and set a custom footer for all client proposals and invoices.',
      dependencies: ['brandingLogoUrl column', 'brandingColor column', 'invoiceFooter column', 'File upload service'],
    },
    'Payment Setup': {
      icon: 'bi-credit-card',
      subtitle: 'Configure how clients pay deposits and balances',
      comingSoonTitle: 'Payment Setup',
      description: 'Connect a payment processor so clients can pay deposits and milestone payments online directly from their proposal or invoice link.',
      dependencies: ['Stripe Connect integration', 'PayPal Commerce Platform'],
    },
    'Notifications': {
      icon: 'bi-bell',
      subtitle: 'Email and SMS notifications for catering events',
      comingSoonTitle: 'Notification Settings',
      description: 'Configure automatic emails for proposal delivery, deposit reminders, milestone due dates, and event confirmations.',
      dependencies: ['Resend email service (CLAUDE.md #23)', 'Payment reminder cron (#24)'],
    },
  };

  get icon() { return this.config[this.title]?.icon ?? 'bi-tools'; }
  get subtitle() { return this.config[this.title]?.subtitle ?? ''; }
  get comingSoonTitle() { return this.config[this.title]?.comingSoonTitle ?? this.title; }
  get description() { return this.config[this.title]?.description ?? 'This feature is under development.'; }
  get dependencies() { return this.config[this.title]?.dependencies ?? []; }
}
```

---

## `app.routes.ts` — Required Route Edits

Exactly 4 changes (Group A-3 through A-6). Group B routes are unchanged (they still point to `CateringStubComponent`; the component itself is upgraded).

```typescript
// CHANGE 1: menu/packages
// OLD:
{ path: 'menu/packages', loadComponent: () => import('./features/catering/catering-stub/catering-stub.component').then(m => m.CateringStubComponent), data: { title: 'Catering Packages' } },
// NEW:
{ path: 'menu/packages', loadComponent: () => import('./features/catering/catering-packages/catering-packages.component').then(m => m.CateringPackagesComponent) },

// CHANGE 2: reports/revenue
// OLD:
{ path: 'reports/revenue', loadComponent: () => import('./features/catering/catering-stub/catering-stub.component').then(m => m.CateringStubComponent), data: { title: 'Revenue Reports' } },
// NEW:
{ path: 'reports/revenue', loadComponent: () => import('./features/catering/catering-revenue-report/catering-revenue-report.component').then(m => m.CateringRevenueReportComponent) },

// CHANGE 3: reports/deferred
// OLD:
{ path: 'reports/deferred', loadComponent: () => import('./features/catering/catering-stub/catering-stub.component').then(m => m.CateringStubComponent), data: { title: 'Deferred Revenue' } },
// NEW:
{ path: 'reports/deferred', loadComponent: () => import('./features/catering/catering-deferred-report/catering-deferred-report.component').then(m => m.CateringDeferredReportComponent) },

// CHANGE 4: invoicing/milestones
// OLD:
{ path: 'invoicing/milestones', loadComponent: () => import('./features/catering/catering-stub/catering-stub.component').then(m => m.CateringStubComponent), data: { title: 'Milestone Payments' } },
// NEW:
{ path: 'invoicing/milestones', loadComponent: () => import('./features/catering/catering-milestones/catering-milestones.component').then(m => m.CateringMilestonesComponent) },
```

---

## Shared Implementation Patterns

All Group A components must follow these patterns exactly (from CLAUDE.md and existing catering code):

```typescript
// Selector prefix
selector: 'os-catering-[name]',

// Standard inject pattern
private readonly cateringService = inject(CateringService);

// formatCents helper (same as catering-reports)
formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Loading/error signals
readonly isLoading = signal(false);
readonly error = signal<string | null>(null);

// ngOnInit pattern
async ngOnInit(): Promise<void> {
  this.isLoading.set(true);
  try {
    await this.cateringService.loadJobs();  // or relevant load methods
  } catch (err) {
    this.error.set('Failed to load data.');
  } finally {
    this.isLoading.set(false);
  }
}

// SCSS host
:host { display: block; }
// Outer wrapper
.catering-[name] { padding: 1.5rem; }
```

Always use:
- Bootstrap 5.3 classes for layout (no custom grid systems)
- `bi-*` Bootstrap Icons
- `@if` / `@for` Angular control flow (not `*ngIf` / `*ngFor`)
- `ChangeDetectionStrategy.OnPush`
- `standalone: true`
- No `@Input` props — all data from injected services

---

## Unit Test Coverage Required

Each new/rewritten component needs a `.spec.ts` file with Vitest tests.

### A-1: catering-proposals.component.spec.ts
1. Renders "No proposals" empty state when `jobs()` is empty
2. Renders proposal row when `jobs()` has one `proposal_sent` job
3. Does not render jobs with status other than `proposal_sent`
4. `daysSince()` returns correct integer
5. `resendProposal()` calls `generateProposal()` with correct jobId
6. `copiedJobId` is set and then cleared after 2500ms after successful resend

### A-2: catering-delivery.component.spec.ts
1. Renders empty state when no off-site jobs exist
2. Renders cards for off-site jobs only (filters out `locationType !== 'off_site'`)
3. Filters out cancelled jobs
4. Date filter "today" correctly filters to today's jobs
5. `saveDelivery()` calls `updateJob()` with correct deliveryDetails shape
6. `toggleExpand()` toggles `expandedJobId` correctly

### A-3: catering-milestones.component.spec.ts
1. Renders empty state when no active jobs exist
2. `allFlatMilestones` flattens milestones across multiple jobs
3. Excludes milestones from cancelled and completed jobs
4. `milestoneStatus()` returns 'paid' when `paidAt` is set
5. `milestoneStatus()` returns 'overdue' when unpaid and past due
6. `milestoneStatus()` returns 'due_soon' when within 7 days
7. `totalOutstanding` sums only unpaid milestones
8. `markPaid()` calls `markMilestonePaid()` with correct jobId and milestoneId
9. Filter 'paid' returns only paid milestones
10. Filter 'overdue' returns only overdue milestones

### A-4: catering-revenue-report.component.spec.ts
1. Shows spinner while `isLoading()` is true
2. Shows error alert when `error()` is set
3. Shows empty state when `performance()` is null
4. Renders KPI cards when `performance()` is loaded
5. `revenueByTypeEntries()` sorts by value descending
6. `revenueByMonthEntries()` returns max 6 entries
7. `barWidthPct()` returns correct percentage string

### A-5: catering-deferred-report.component.spec.ts
1. Shows spinner while loading
2. Shows error alert when error
3. Shows empty state when `entries()` is empty
4. Renders table rows for each entry
5. `totalDeferred` sums `deferredCents` across all entries
6. `totalPaid` sums `paidCents` across all entries

### A-6: catering-packages.component.spec.ts
1. Renders empty state when no job packages exist
2. `jobPackageTemplates` deduplicates packages by name
3. `saveTemplate()` adds new template to `_templates`
4. `saveTemplate()` updates existing template when editing
5. `deleteTemplate()` removes template from list
6. `deletedMessage` is set to true then false after delete
7. `toggleItemSelection()` adds/removes item IDs correctly
8. `filteredMenuItems` filters by `menuItemFilter` signal

---

## Playwright E2E Tests

Create file: `/tmp/playwright-test-catering-stubs.js`

```javascript
// Tests:
// 1. Navigate to each of 10 routes, assert "Coming soon" text is GONE
// 2. /app/invoicing/milestones → milestone table or empty state renders
// 3. /app/catering/proposals → proposal table or empty state renders  
// 4. /app/catering/delivery → delivery schedule or empty state renders
// 5. /app/reports/revenue → KPI cards or empty state renders
// 6. /app/reports/deferred → deferred table or empty state renders
// 7. /app/menu/packages → package grid or empty state renders
// 8. /app/settings/business → roadmap card renders (NOT "Coming soon." bare text)
// 9. /app/settings/branding → roadmap card renders
// 10. /app/settings/payments → roadmap card renders
// 11. /app/settings/notifications → roadmap card renders
// 12. Delivery date filter: click "Today" tab, verify filter label changes
```

---

## Implementation Order

Claude Code must implement in this exact order to avoid import errors:

| Step | Action | Risk |
|---|---|---|
| 1 | Rewrite `CateringStubComponent` (Group B) | Zero risk — same routes, same imports |
| 2 | Create `catering-milestones` dir + 3 files + spec | New component, no deps |
| 3 | Update `app.routes.ts` — milestones route | Low risk — single line change |
| 4 | Create `catering-revenue-report` dir + 3 files + spec | New component |
| 5 | Update `app.routes.ts` — revenue route | Low risk |
| 6 | Create `catering-deferred-report` dir + 3 files + spec | New component |
| 7 | Update `app.routes.ts` — deferred route | Low risk |
| 8 | Create `catering-packages` dir + 3 files + spec | New component, needs MenuService |
| 9 | Update `app.routes.ts` — packages route | Low risk |
| 10 | Full rewrite `catering-proposals.component.ts` + add .html + .scss + spec | Existing component → expand |
| 11 | Full rewrite `catering-delivery.component.ts` + add .html + .scss + spec | Existing component → expand |
| 12 | Write Playwright test script | Last — tests full coverage |
| 13 | Run `npm test` — verify all new specs pass | Validation |
| 14 | Run Playwright tests — verify no "Coming soon." remains | Validation |

---

## File Summary

### New directories to create:
- `src/app/features/catering/catering-milestones/`
- `src/app/features/catering/catering-revenue-report/`
- `src/app/features/catering/catering-deferred-report/`
- `src/app/features/catering/catering-packages/`

### Files to create (new):
1. `catering-milestones.component.ts`
2. `catering-milestones.component.html`
3. `catering-milestones.component.scss`
4. `catering-milestones.component.spec.ts`
5. `catering-revenue-report.component.ts`
6. `catering-revenue-report.component.html`
7. `catering-revenue-report.component.scss`
8. `catering-revenue-report.component.spec.ts`
9. `catering-deferred-report.component.ts`
10. `catering-deferred-report.component.html`
11. `catering-deferred-report.component.scss`
12. `catering-deferred-report.component.spec.ts`
13. `catering-packages.component.ts`
14. `catering-packages.component.html`
15. `catering-packages.component.scss`
16. `catering-packages.component.spec.ts`
17. `catering-proposals.component.html` (new file, component existed as inline)
18. `catering-proposals.component.scss` (new file)
19. `catering-proposals.component.spec.ts` (new file)
20. `catering-delivery.component.html` (new file)
21. `catering-delivery.component.scss` (new file)
22. `catering-delivery.component.spec.ts` (new file)
23. `/tmp/playwright-test-catering-stubs.js`

### Files to fully rewrite:
24. `catering-proposals.component.ts` (inline → external template)
25. `catering-delivery.component.ts` (inline → external template)
26. `catering-stub.component.ts` (bare text → roadmap card)

### Files to edit:
27. `src/app/app.routes.ts` — 4 targeted line replacements

**Total: 27 file operations across 23 new files, 3 rewrites, 1 edit.**

---

## Correctness Checklist

Before each component is considered complete, verify:

- [ ] `selector` uses `os-` prefix
- [ ] `standalone: true` declared
- [ ] `ChangeDetectionStrategy.OnPush` declared
- [ ] `templateUrl` and `styleUrl` (not inline templates or styles) — except `CateringStubComponent` which intentionally stays inline
- [ ] All money values formatted via `formatCents()`, not raw `/ 100`
- [ ] `@if` / `@for` used (not `*ngIf` / `*ngFor`)
- [ ] Loading state shows Bootstrap spinner
- [ ] Error state shows dismissible Bootstrap alert
- [ ] Empty state has icon + descriptive text
- [ ] `loadJobs()` called in `ngOnInit()` before reading service signals
- [ ] No `@Input()` props on any component — all state from injected services
- [ ] Route import path in `app.routes.ts` matches actual file path exactly
- [ ] Spec file imports from Vitest (`describe`, `it`, `expect`, `beforeEach` from 'vitest')
- [ ] Spec tests all cover empty and populated states
- [ ] Playwright test asserts absence of "Coming soon" text on all 10 routes
