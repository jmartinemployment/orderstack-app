# OrderStack Catering Mode — Phase 2 Master Plan

> **Document version:** March 2026  
> **Status:** Ready for implementation  
> **Companion docs:** FEATURE-02-catering-phase-1.md, FEATURE-02a/b/c (foundation, wiring, UI)

---

## 1. Executive Summary

### What Exists Today (Phase 1)

Phase 1 delivered catering as a **business type** with basic event management:

- `CateringEvent` Prisma model with status workflow
- 7 REST endpoints (CRUD + status transitions + capacity check)
- Calendar month view with event cards
- Capacity settings per merchant
- Status flow: `inquiry → proposal_sent → confirmed → completed → cancelled`

### What Phase 2 Delivers

Phase 2 elevates catering to a **first-class DevicePosMode** (peer of `quick_service`, `full_service`, `bar`) with a full invoicing and project management workflow competitive with Square for Caterers.

**Key deliverables:**

1. `catering` added as a `DevicePosMode` value
2. Setup wizard Step 2 refactored from 100+ item search list to 4-card mode grid
3. `CateringJob` model replacing `CateringEvent` with invoice, milestone, package, and contract fields
4. Client-facing proposal generation with package comparison
5. Milestone payment schedules (up to 12 installments)
6. Multi-package estimates (Standard / Premium / Custom tiers)
7. Deferred sales tracking (revenue recognized on fulfillment date, not payment date)
8. Dedicated catering menu with per-person and per-tray pricing
9. KDS routing by fulfillment date (prep day filter)
10. Contract/waiver PDF attachment with client acknowledgment
11. Per-job invoice branding overrides
12. Pipeline dashboard with metrics and next-event banner

---

## 2. Competitive Analysis: Square vs. OrderStack

### Tier 1 — Core Workflow Gaps (High Value)

| Feature | Square | OrderStack Phase 1 | Phase 2 Target |
|---|---|---|---|
| Invoicing from events | ✅ Full | ❌ | ✅ |
| Deposit requests | ✅ | ❌ | ✅ |
| Milestone payments (up to 12) | ✅ | ❌ | ✅ |
| Proposals / Estimates | ✅ Multi-package | ❌ | ✅ |
| Contracts / Waivers | ✅ PDF attachment | ❌ | ✅ |
| Deferred sales tracking | ✅ Vol. 2 2025 | ❌ | ✅ |
| Multi-package estimates | ✅ | ❌ | ✅ |

### Tier 2 — Operational Gaps

| Feature | Square | Phase 2 Target |
|---|---|---|
| Dedicated catering menu | ✅ | ✅ |
| KDS routing by event date | ✅ | ✅ |
| Mobile on-site payments | ✅ | ✅ (existing Invoice model) |
| Project / lead tracking dashboard | ✅ | ✅ |

### Tier 3 — OrderStack Leads

| Feature | OrderStack | Square |
|---|---|---|
| Full status lifecycle with calendar | ✅ Phase 1 | Partial |
| Capacity / conflict detection | ✅ Phase 1 | ❌ |
| Calendar month view | ✅ Phase 1 | List only |

---

## 3. Mode System Changes

### `platform.model.ts`

Add `'catering'` to the `DevicePosMode` union type:

```typescript
export type DevicePosMode = 'quick_service' | 'full_service' | 'bar' | 'catering' | 'standard';
```

Update `DEVICE_POS_MODE_CATALOG`:

```typescript
{
  value: 'catering',
  label: 'Catering',
  description: 'Events, proposals, milestone payments',
  icon: 'bi-truck',
  defaultVertical: 'food_and_drink'
}
```

### `device.model.ts` — `defaultModeSettingsForPosMode()`

Add catering case:

```typescript
case 'catering':
  return {
    skipPaymentScreen: true,       // payment via milestone invoices
    showTipPrompt: false,
    requireTableSelection: false,
    autoPrintKitchenTicket: false,  // prep is advance-scheduled
    autoPrintReceipt: false,        // invoices replace receipts
    autoSendToKds: false            // KDS routing by fulfillmentDate filter
  };
```

---

## 4. Data Model: `CateringJob`

### Status Lifecycle

```
inquiry → proposal_sent → contract_signed → deposit_received → in_progress → final_payment → completed
                                                                                            ↘ cancelled (any state)
```

### `CateringJobStatus` Enum

```typescript
export type CateringJobStatus =
  | 'inquiry'
  | 'proposal_sent'
  | 'contract_signed'
  | 'deposit_received'
  | 'in_progress'
  | 'final_payment'
  | 'completed'
  | 'cancelled';
```

### `CateringJob` Interface

```typescript
export interface CateringJob {
  id: string;
  merchantId: string;
  title: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  companyName?: string;
  eventType: string;
  headcount: number;
  bookingDate: string;         // when inquiry was created
  fulfillmentDate: string;     // event date — used for revenue recognition
  status: CateringJobStatus;
  notes?: string;

  // Package & pricing
  packages: CateringPackage[];
  selectedPackageId?: string;
  totalCents: number;
  paidCents: number;

  // Milestones
  milestones: CateringMilestonePayment[];

  // Documents
  estimateId?: string;         // link to proposal
  invoiceId?: string;          // link to primary Invoice record
  contractUrl?: string;        // PDF attachment URL
  contractSignedAt?: string;   // ISO timestamp of client acknowledgment

  // Invoice branding overrides
  brandingLogoUrl?: string;
  brandingColor?: string;      // hex
  invoiceNotes?: string;       // cancellation policy, delivery instructions, etc.

  createdAt: string;
  updatedAt: string;
}
```

### `CateringMilestonePayment`

```typescript
export interface CateringMilestonePayment {
  id: string;
  jobId: string;
  label: string;               // e.g. "Deposit", "Final Payment"
  percent: number;             // 0–100
  amountCents: number;
  dueDate?: string;            // ISO date
  paidAt?: string;             // ISO timestamp
  invoiceId?: string;          // per-milestone Invoice record
  reminderSentAt?: string;     // ISO timestamp
}
```

### `CateringPackage`

```typescript
export interface CateringPackage {
  id: string;
  name: string;
  tier: 'standard' | 'premium' | 'custom';
  pricePerPerson: number;
  minimumHeadcount: number;
  description?: string;
  menuItemIds: string[];
}
```

### `CateringDeferredRevenueEntry`

```typescript
export interface CateringDeferredRevenueEntry {
  jobId: string;
  title: string;
  fulfillmentDate: string;
  totalCents: number;
  paidCents: number;
  recognizedCents: number;     // = totalCents when fulfillmentDate ≤ today; 0 when future
  deferredCents: number;       // = totalCents - recognizedCents
}
```

### `defaultCateringMilestones()` Factory

```typescript
export function defaultCateringMilestones(): CateringMilestonePayment[] {
  return [
    { id: uuid(), jobId: '', label: 'Deposit', percent: 50, amountCents: 0, dueDate: '' },
    { id: uuid(), jobId: '', label: 'Final Payment', percent: 50, amountCents: 0, dueDate: '' }
  ];
}
```

---

## 5. Setup Wizard Redesign

### Problem

Current Step 2 presents a searchable list of 100+ business types (restaurants, cafes, bakeries, food trucks, etc.) with cuisine signals and revenue estimation. This is:

- Overwhelming for new users
- Redundant (most signals are unused)
- Not scalable to new modes like catering

### Solution: 4-Card Mode Grid (2×2)

Replace the entire Step 2 template with a `d-grid` of 4 large clickable cards:

| Card | Icon | Headline | Subtext |
|---|---|---|---|
| Quick Service | `bi-lightning-charge` | Quick Service | Counter, takeout, food truck |
| Full Service | `bi-shop` | Full Service | Sit-down, table management |
| Bar & Brewery | `bi-cup-straw` | Bar & Brewery | Tabs, drinks, nightlife |
| Catering | `bi-truck` | Catering | Events, proposals, milestone payments |

### `setup-wizard.ts` Changes

**Remove entirely:**
- `BUSINESS_CATEGORIES` constant
- `BUSINESS_TYPE_MODE_MAP` constant
- `BUSINESS_TYPE_SEARCH_ALIASES` constant
- `filteredBusinessTypes()` method
- `selectBusinessType()` method
- `getVerticalLabel()` method
- All cuisine/revenue signal methods

**Add:**
```typescript
const MODE_CARDS = [
  { mode: 'quick_service', label: 'Quick Service', subtext: 'Counter, takeout, food truck', icon: 'bi-lightning-charge' },
  { mode: 'full_service',  label: 'Full Service',  subtext: 'Sit-down, table management',  icon: 'bi-shop' },
  { mode: 'bar',           label: 'Bar & Brewery', subtext: 'Tabs, drinks, nightlife',     icon: 'bi-cup-straw' },
  { mode: 'catering',      label: 'Catering',      subtext: 'Events, proposals, milestone payments', icon: 'bi-truck' }
];

private _selectedPosMode = signal<DevicePosMode | null>(null);

selectMode(mode: DevicePosMode): void {
  this._selectedPosMode.set(mode);
}
```

**Update:**
```typescript
autoDetectedMode = computed(() => this._selectedPosMode() ?? 'standard');
canProceed = computed(() => {
  if (this.currentStep() === 2) return this._selectedPosMode() !== null;
  // ... other steps
});
```

### `setup-wizard.html` Step 2 Template

```html
<div class="d-grid gap-3" style="grid-template-columns: repeat(2, 1fr)">
  @for (card of MODE_CARDS; track card.mode) {
    <button
      class="card h-100 cursor-pointer position-relative p-3 text-start border-2"
      [class.border-primary]="_selectedPosMode() === card.mode"
      (click)="selectMode(card.mode)"
      type="button">
      @if (_selectedPosMode() === card.mode) {
        <i class="bi bi-check-circle-fill text-primary position-absolute top-0 end-0 m-2"></i>
      }
      <i class="bi {{ card.icon }} fs-2 text-primary mb-2 d-block"></i>
      <div class="fw-bold">{{ card.label }}</div>
      <div class="text-muted small">{{ card.subtext }}</div>
    </button>
  }
</div>
```

---

## 6. Phase 2 Features

### 6.1 Proposals

Generates a client-facing proposal document when status advances to `proposal_sent`.

**What the proposal shows:**
- Business name, logo, event details
- Headcount, fulfillment date, event type
- All `CateringPackage` options in a side-by-side comparison table
- Per-person pricing and total per package
- "Approve This Package" button per package
- "Request Changes" button

**Implementation:**
- New route: `GET /catering/jobs/:id/proposal` — token-based, no login required
- Client approval: `POST /catering/jobs/:id/proposal/approve` — sets `contractSignedAt`, advances status to `contract_signed`
- "Send Proposal" button opens email pre-filled with proposal link
- If `contractUrl` is set, proposal includes "Review & Acknowledge Contract" checkbox before approval button is active
- Proposal URL stored as `CateringJob.estimateId`

---

### 6.2 Invoicing from Jobs

Creates an `Invoice` record from a confirmed `CateringJob`.

**Trigger:** "Create Invoice" button visible when status is `contract_signed` or `deposit_received`

**Invoice creation:**
- `POST /catering/jobs/:id/invoice` → creates Invoice, sets `CateringJob.invoiceId`
- Line items populated from `selectedPackage` (`menuItemIds` × `headcount`)
- Invoice inherits: `clientName`, `clientEmail`, `companyName`, `invoiceNotes`, branding fields
- Invoice starts as `draft` — operator reviews before sending
- Uses existing `Invoice` model — no schema changes needed for the Invoice table itself

---

### 6.3 Milestone Payment Schedules

Splits a job's total into up to 12 installments.

**Default schedule:** 50% deposit + 50% final (from `defaultCateringMilestones()`)

**Milestone editor UI:**
- Add / edit / remove milestones
- Set due date per milestone
- Toggle email reminder

**Each milestone generates its own Invoice record** (`CateringMilestonePayment.invoiceId`)

**Mark paid:** sets `paidAt`, recalculates `CateringJob.paidCents`

**Reminder cron job (daily 9am):**
- Find milestones where `dueDate ≤ today + 3 days` AND `reminderSentAt` is null AND job status is not `cancelled/completed`
- Send reminder email to client
- Set `reminderSentAt`

---

### 6.4 Dedicated Catering Menu

Separate menu catalog with `type: 'catering' | 'standard'`.

**Catering-specific pricing models:**
```typescript
export type CateringPricingModel = 'per_person' | 'per_tray' | 'flat';
```

**Per-person items:** `unitPrice × headcount` auto-calculated on invoice line item

**Menu management:** Filter by type — catering menu only shown in catering context

**Setup wizard:** Catering mode skips cuisine/template seeding step

---

### 6.5 Multi-Package Estimates

Offer 2–3 service tiers in one proposal (Standard / Premium / Custom).

**Package builder:**
- `name`, `tier`, `pricePerPerson`, `minimumHeadcount`, `description`, `menuItemIds[]`
- Editable in job detail view

**Proposal renders all packages** in comparison table; client selects one

**Client selection:**
- Sets `CateringJob.selectedPackageId`
- Advances status to `contract_signed`

**Invoice creation uses `selectedPackageId`** for line items and `totalCents` calculation

---

### 6.6 KDS Routing by Fulfillment Date

Catering orders created weeks in advance only appear on KDS on prep day.

**KDS filter setting:** `showCateringOnFulfillmentDate` (default: `true`)

**When active:** Catering tickets only visible when `fulfillmentDate ≤ today + prepLeadDays`

**`prepLeadDays`:** Per-merchant setting (default: `1` — show prep day before event)

**KDS UI:** Catering tickets have:
- Distinct color band (e.g., teal/purple)
- Event name header
- Headcount badge

**Backend:** `GET /kds/tickets` updated with `fulfillmentDate` filter logic for catering orders

---

### 6.7 Deferred Sales Tracking

Revenue recognized on `fulfillmentDate` (event date), not payment collection date.

**New report section: Deferred Revenue**

Columns: Job Title | Event Date | Total Value | Collected | Recognized | Deferred

| Field | Logic |
|---|---|
| `recognizedCents` | = `totalCents` when `fulfillmentDate ≤ today`; = `0` when `fulfillmentDate > today` |
| `deferredCents` | = `totalCents - recognizedCents` |

**Sales reports:** Exclude catering jobs with `fulfillmentDate > today` from recognized revenue totals

**Backend endpoint:** `GET /reports/catering/deferred` → `CateringDeferredRevenueEntry[]`

---

### 6.8 Contract and Waiver Attachment

Operator uploads a PDF contract/waiver to the job.

**Field:** `CateringJob.contractUrl` (storage URL)

**Flow:**
1. Operator clicks "Upload Contract" in job detail → file upload to storage
2. `contractUrl` is set on the job
3. Proposal view includes "Review & Acknowledge Contract" section (link + checkbox)
4. Client checks the box → `contractSignedAt` timestamp is set
5. Status cannot advance from `proposal_sent` to `contract_signed` without `contractSignedAt`

**Note:** No digital signature capture — the acknowledgment timestamp serves as legal record.

---

### 6.9 Invoice Branding (Per-Job Overrides)

Per-job branding overrides (fall back to restaurant-level settings if null):

| Field | Purpose |
|---|---|
| `brandingLogoUrl` | Full logo (min 1280×648px) in invoice header |
| `brandingColor` | Hex color for invoice header background |
| `invoiceNotes` | Default footer message: cancellation policy, delivery instructions, payment terms |

**Configured in:** Job detail view → "Invoice Branding" collapsible section

---

### 6.10 Pipeline & Lead Tracking Dashboard

**Metrics row (4 cards):**
- Total Pipeline (sum of non-cancelled job totals)
- Outstanding Balance (totalCents − paidCents across active jobs)
- Events This Month (count of jobs with fulfillmentDate in current month)
- Avg Job Value

**Job list columns:**
Job Title | Client | Event Date | Headcount | Status | Total | Paid | Balance | Actions

**Status badge colors:**

| Status | Color |
|---|---|
| inquiry | gray |
| proposal_sent | blue |
| contract_signed | purple |
| deposit_received | orange |
| in_progress | yellow |
| final_payment | red |
| completed | green |
| cancelled | dark gray |

**Filter bar:** by status, date range, event type

**Sort:** by event date (default), total value, created date

**Quick actions per row:** Advance Status | View Job | Create Invoice | Send Reminder

**Next Event Banner:** Displayed at top when a confirmed job is approaching — shows job title, client name, event date, days until event, outstanding balance. Disappears after `fulfillmentDate` passes.

---

## 7. Backend Changes

### Prisma Schema

```prisma
model CateringJob {
  id                String   @id @default(uuid())
  merchantId        String
  title             String
  clientName        String
  clientEmail       String?
  clientPhone       String?
  companyName       String?
  eventType         String
  headcount         Int
  bookingDate       DateTime
  fulfillmentDate   DateTime
  status            CateringJobStatus @default(inquiry)
  notes             String?
  packages          Json     @default("[]")
  selectedPackageId String?
  milestones        Json     @default("[]")
  totalCents        Int      @default(0)
  paidCents         Int      @default(0)
  estimateId        String?
  invoiceId         String?
  contractUrl       String?
  contractSignedAt  DateTime?
  brandingLogoUrl   String?
  brandingColor     String?
  invoiceNotes      String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  merchant          Merchant @relation(fields: [merchantId], references: [id])
}

enum CateringJobStatus {
  inquiry
  proposal_sent
  contract_signed
  deposit_received
  in_progress
  final_payment
  completed
  cancelled
}
```

### New REST Endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/catering/jobs/:id/invoice` | Create Invoice from CateringJob |
| `GET` | `/catering/jobs/:id/proposal` | Render client-facing proposal HTML (token-based) |
| `POST` | `/catering/jobs/:id/proposal/approve` | Client approves, sets contractSignedAt |
| `POST` | `/catering/jobs/:id/milestones` | Create/replace milestone schedule |
| `PATCH` | `/catering/jobs/:id/milestones/:milestoneId/pay` | Mark milestone paid |
| `POST` | `/catering/jobs/:id/contract` | Upload contract PDF |
| `GET` | `/reports/catering/deferred` | Return CateringDeferredRevenueEntry[] |
| `GET` | `/kds/tickets` (updated) | Add fulfillmentDate filter for catering tickets |

### Cron Jobs

**Milestone reminders** (daily 9am):

```typescript
// Find milestones due within 3 days, not yet reminded, job not cancelled/completed
const dueSoon = await prisma.cateringJob.findMany({
  where: {
    status: { notIn: ['cancelled', 'completed'] },
    milestones: { path: ['$[*].dueDate'], lte: threeDaysFromNow },
  }
});
// Send email per milestone, set reminderSentAt
```

**Status auto-advance** (optional, daily 8am):

```typescript
// When fulfillmentDate is today and status is deposit_received → advance to in_progress
```

---

## 8. Complete File Change List

### Frontend — Models

| File | Changes |
|---|---|
| `src/app/models/platform.model.ts` | Add `'catering'` to `DevicePosMode`; update `BUSINESS_VERTICAL_CATALOG` and `DEVICE_POS_MODE_CATALOG` |
| `src/app/models/catering.model.ts` | Replace entire file with `CateringJob`, `CateringJobStatus`, `CateringPackage`, `CateringMilestonePayment`, `CateringDeferredRevenueEntry`, `defaultCateringMilestones()` |
| `src/app/models/device.model.ts` | Add `catering` case to `defaultModeSettingsForPosMode()` |
| `src/app/models/index.ts` | Verify exports include new catering types |

### Frontend — Setup Wizard

| File | Changes |
|---|---|
| `src/app/features/onboarding/setup-wizard/setup-wizard.ts` | Remove business category system; add `MODE_CARDS` + `_selectedPosMode` signal |
| `src/app/features/onboarding/setup-wizard/setup-wizard.html` | Replace step 2 with 2×2 card grid |
| `src/app/features/onboarding/setup-wizard/setup-wizard.scss` | Add `.mode-card`, `cursor-pointer`, hover state, selected border styles |

### Frontend — Catering Features (New Files)

| File | Purpose |
|---|---|
| `src/app/features/catering/catering-dashboard/` | Pipeline dashboard component |
| `src/app/features/catering/catering-job-detail/` | Expanded detail: milestones, packages, contract upload, invoice creation |
| `src/app/features/catering/catering-proposal/` | Client-facing proposal view (token-based, no auth) |
| `src/app/features/catering/catering-invoice-branding/` | Branding override section within job detail |
| `src/app/services/catering.service.ts` | Update API calls; add invoice creation, proposal, milestone, contract methods |

### Backend

| File | Changes |
|---|---|
| `src/prisma/schema.prisma` | Extend/replace `CateringJob` model; update status enum |
| `src/routes/catering.routes.ts` | Add invoice creation, proposal, contract upload, milestone pay endpoints |
| `src/routes/reports.routes.ts` | Add `GET /reports/catering/deferred` |
| `src/routes/kds.routes.ts` | Add `fulfillmentDate` filter for catering mode tickets |
| `src/services/catering.service.ts` | Invoice creation, proposal generation, milestone logic, deferred revenue calculation |
| `src/cron/milestone-reminders.ts` | New cron job for milestone due date reminders |
| `src/migrations/` | New Prisma migration for CateringJob schema changes |

---

## 9. Implementation Sequence (14 Claude Code Prompts)

| # | Prompt Scope | Files Touched |
|---|---|---|
| 1 | **Mode + Model** — Add `catering` DevicePosMode; replace `catering.model.ts`; add device.model.ts catering case | `platform.model.ts`, `catering.model.ts`, `device.model.ts` |
| 2 | **Setup Wizard** — Replace Step 2 with 4-card grid; remove entire business category system | `setup-wizard.ts/.html/.scss` |
| 3 | **Backend Schema** — Prisma migration: rename CateringEvent to CateringJob; add new columns; update status enum | `schema.prisma`, migration file |
| 4 | **Backend Routes** — Add new catering endpoints: invoice creation, proposal render/approve, milestone CRUD, contract upload | `catering.routes.ts`, `catering.service.ts` |
| 5 | **Proposals** — Client-facing proposal view; approval flow; `contractSignedAt`; status advance | `catering-proposal` component |
| 6 | **Invoicing** — Create Invoice from confirmed job; inherit line items from selected package | `catering-job-detail`, backend service |
| 7 | **Milestones** — Milestone editor UI; per-milestone invoice links; mark paid; `paidCents` recalc | `catering-job-detail`, backend route |
| 8 | **Cron Reminders** — Milestone due date email reminders; `reminderSentAt` tracking | `milestone-reminders.ts`, cron setup |
| 9 | **Catering Menu** — New menu type; per-person and tray pricing; link to packages | `menu.model.ts`, menu routes |
| 10 | **Dashboard** — Pipeline view; metrics row; status filter; next event banner | `catering-dashboard` component |
| 11 | **Deferred Revenue** — Reports endpoint; separate booked vs. recognized revenue in reports module | `reports.routes.ts`, reports component |
| 12 | **KDS Routing** — `fulfillmentDate` filter; catering ticket visual treatment on KDS display | `kds.routes.ts`, KDS component |
| 13 | **Contracts** — PDF upload; client acknowledgment on proposal view; `contractSignedAt` gating | `catering-job-detail`, storage service |
| 14 | **Invoice Branding** — Per-job logo/color/notes overrides; invoice renderer checks `CateringJob` fields first | `catering-invoice-branding`, invoice renderer |

---

## 10. Research Sources

- squareup.com/us/en/restaurants/caterers — Square Catering Software product page
- squareup.com/us/en/restaurants/capabilities — Square for Restaurants capabilities overview
- squareup.com/help/us/en/article/6638-catering-with-square-for-restaurants — Square catering help
- squareup.com/us/en/releases/food-and-beverage — Square Vol. 1 & 2, 2025 release notes (deferred sales tracking)
- community.squareup.com — Square Vol. 2 2025 restaurant features announcement
- GetOrderStack codebase — `catering.model.ts`, `device.model.ts`, `platform.model.ts`, `invoice.model.ts`, `setup-wizard.ts/.html` (read March 2026)
