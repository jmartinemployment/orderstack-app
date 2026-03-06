# Catering System — Cross-Document Gap Analysis & Comprehensive Plan

> **Date:** March 2026
> **Source documents analyzed:**
> - `FEATURE-02d-catering-phase2-master-plan.md` — data model, backend schema, mode system
> - `FEATURE-04-catering-admin-sidebar.md` — sidebar nav, routes, badge counts
> - `FEATURE-05-catering-comprehensive-plan.md` — 27-item implementation plan
> - `session-notes-2026-03-05.md` — open bugs, what's actually deployed
> - Live codebase: `catering.model.ts`, `menu.model.ts`, `catering-event-form.component.ts`, `invoice-manager.ts`

---

## Part 1 — What Each Document Got Right (And Only It)

### FEATURE-02d Unique Contributions
- KDS routing by `fulfillmentDate` with `prepLeadDays` per-merchant setting (caterers use their commissary kitchen; prep tickets should surface on prep day, not booking day)
- Setup wizard redesign: 4-card mode grid replacing 100+ business type search list
- `DevicePosMode: 'catering'` addition to platform model
- `defaultModeSettingsForPosMode('catering')` — skips tip prompt, payment screen, auto-print
- Status auto-advance cron: when `fulfillmentDate === today` and status is `deposit_received` → advance to `in_progress`
- BUG-35 root cause analysis (merchantId undefined timing issue)

### FEATURE-04 Unique Contributions
- Complete `buildCateringNav()` TypeScript implementation with badge count signals
- `Delivery` sidebar section at `/app/catering/delivery` — off-site job management
- Calendar as standalone route `/app/catering/calendar` extracted from dashboard tab
- Proposals list at `/app/catering/proposals` (operator-facing list of all sent proposals)
- `InvoiceService.overdueCount` and `CateringService.milestonesComingDue` signal names
- Settings sub-routes: Business Info, Invoice Branding, Payment Setup, Notifications
- Invoice Milestones sub-view at `/app/invoicing/milestones`

### FEATURE-05 Unique Contributions
- BEO (Banquet Event Order) generation — Toast's core differentiator, printable kitchen/staff document
- Prep list: daily aggregate of all menu items across multiple jobs on a given date
- Activity timeline / audit trail per job (`CateringActivity` table)
- Clone/repeat job (server-side clone endpoint)
- Dashboard empty state onboarding guide (3-step get-started)
- Transactional email via Resend
- Lead capture form (public, merchant slug-based)
- Client history view in Customers — job count, total revenue, repeat rate
- Search and bulk actions on dashboard
- PDF export via `@media print` CSS
- Payment reminder cron with `reminderSentAt` tracking on milestones

---

## Part 2 — Conflicts Between Documents

### Conflict 1: Package Library Location
| Document | Says |
|---|---|
| FEATURE-04 | Packages live at `/app/menu/packages` — under Menu in sidebar |
| FEATURE-05 | Packages live at `/app/catering/packages` — under Catering in sidebar |

**Resolution:** Packages belong under **Menu** at `/app/menu/packages`. Packages are composed of menu items — they are a menu concept. The Menu sidebar section has two children: Items (`/app/menu?type=catering`) and Packages (`/app/menu/packages`). This matches FEATURE-04.

---

### Conflict 2: Calendar — Tab vs. Standalone Route
| Document | Says |
|---|---|
| FEATURE-04 | Extract Calendar to standalone route `/app/catering/calendar` |
| FEATURE-05 | Upgrade the existing calendar tab inside the dashboard component |

**Resolution:** FEATURE-04 is correct. Calendar becomes a standalone route. The dashboard loses its Calendar tab and retains: Active Jobs, Upcoming, Past, Capacity. This enables deep-linking, cleaner navigation, and the sidebar item `Calendar → /app/catering/calendar`.

---

### Conflict 3: Proposals — Operator List vs. Public Client Page
| Document | Says |
|---|---|
| FEATURE-04 | `/app/catering/proposals` — operator-facing list of sent proposals awaiting approval |
| FEATURE-05 | `/catering/proposal/:token` — public client-facing proposal page |

**Resolution:** Both exist. These are two different things:
- `/app/catering/proposals` — authenticated operator view. Lists all jobs with `status === 'proposal_sent'` and no `contractSignedAt`. Shows which proposals are outstanding, allows re-sending, shows when client last viewed.
- `/catering/proposal/:token` — public, no auth. The actual document the client sees and approves. Token-based from `CateringProposalToken` table.

---

### Conflict 4: Invoice Branding Location
| Document | Says |
|---|---|
| FEATURE-02d | Branding configured in job detail view (per-job overrides) |
| FEATURE-04 | Branding configured at `/app/settings/branding` (merchant defaults) |

**Resolution:** Both. Not a conflict — it's a two-tier system that both docs partially describe:
- `/app/settings/branding` — merchant-level defaults: logo, brand color, invoice footer, payment terms
- Job detail view — per-job overrides that take precedence over merchant defaults
This is already modeled in `CateringJob`: `brandingLogoUrl`, `brandingColor`, `invoiceNotes` are nullable, intended to fall back to merchant settings.

---

### Conflict 5: `pricePerPerson` vs. `pricingModel + pricePerUnit`
| Document | Says |
|---|---|
| FEATURE-02d | `CateringPackage.pricePerPerson: number` (single field, per_person only) |
| Actual `catering.model.ts` | `pricingModel: CateringPricingModel` + `pricePerUnit: number` (supports per_person, per_tray, flat) |

**Resolution:** The actual model is correct and more capable. FEATURE-02d is stale on this point. The `CateringPricingModel` type (`per_person | per_tray | flat`) is already defined in `catering.model.ts` and must be carried through to the Prisma schema and all backend endpoints. Do not regress to `pricePerPerson` only.

---

### Conflict 6: `restaurantId` vs. `merchantId`
| Document | Says |
|---|---|
| FEATURE-02d Prisma schema | `merchantId String` |
| Actual `catering.model.ts` | `restaurantId: string` |
| Actual `catering-event-form.component.ts` | Saves `restaurantId: ''` (hardcoded empty string) |

**Resolution:** The backend `catering.routes.ts` uses the merchant context from the URL param (`/merchant/:merchantId/catering/events`). The frontend model's `restaurantId` field is never populated (always `''`) and is effectively ignored — the backend injects `merchantId` from the authenticated session. This is currently a silent data model inconsistency but not a functional bug because the backend uses its own context. However, the frontend model should use `merchantId` to match the backend and all other models in the system.

---

## Part 3 — Gaps Missing From ALL Documents

These items appear in none of the planning documents but are required for the system to function.

### Critical Gap 1: `menuType` Field on MenuItem
**Status:** Does not exist in `menu.model.ts` or the backend Prisma schema.

Every document assumes caterers pick items from a catering-tagged subset of the menu. The mechanism for this tagging (`menuType: 'catering' | 'standard'`) does not exist. Until this field is added to the `MenuItem` model and the Prisma schema, the package builder cannot filter to catering items, and `menuItemIds: string[]` in `CateringPackage` is referencing items with no way to distinguish catering items from POS items.

**What needs to be added:**
- `menuType: 'catering' | 'standard'` to `MenuItem` interface in `menu.model.ts`
- `cateringPricingModel: CateringPricingModel | null` to `MenuItem` interface
- Corresponding columns to the `MenuItem` Prisma model
- Menu management UI: show pricing model selector when creating/editing an item with `menuType === 'catering'`
- Menu management filter: `/app/menu?type=catering` filters to catering items only

---

### Critical Gap 2: `locationType`, `locationAddress`, `startTime`, `endTime` Missing From Prisma Schema
**Status:** Present in `CateringJob` interface and captured in the event form — but NOT in the FEATURE-02d Prisma schema definition.

The event form collects these fields. The frontend model has them. But FEATURE-02d's schema spec omits them entirely, meaning any Prisma migration based on FEATURE-02d will drop these fields silently.

**What needs to be added to the Prisma schema:**
```prisma
startTime       String?
endTime         String?
locationType    String    @default("on_site")
locationAddress String?
```

---

### Critical Gap 3: `companyName` Not in Event Form
**Status:** `companyName` is in `CateringJob` interface and referenced by proposal and invoice rendering — but the `catering-event-form.component.ts` never collects it. It's always `undefined`.

The event form needs a Company / Organization field alongside Client Name. This is critical for corporate events (the most common catering type).

---

### Critical Gap 4: Package Template Library (Reusable Across Jobs)
**Status:** All documents assume a package builder exists. None describe the data model for a package template library separate from job packages.

Currently `CateringPackage` exists only as an embedded array in `CateringJob.packages: CateringPackage[]`. Every job that uses "Wedding Standard — $65/person" stores its own copy. You cannot create that package once and reuse it.

**What's needed:**
- New Prisma model: `CateringPackageTemplate` (id, merchantId, name, tier, pricingModel, pricePerUnit, minimumHeadcount, description, menuItemIds Json, isActive, createdAt, updatedAt)
- New backend endpoints: CRUD for `/merchant/:id/catering/packages`
- Package library UI at `/app/menu/packages`
- When adding a package to a job: select from template library → job stores a copy (so editing the template doesn't mutate existing jobs)

---

### Critical Gap 5: Invoice → CateringJob Connection Not Described
**Status:** `InvoiceManager` exists as a fully functional standalone component. `CateringJob` has `invoiceId?: string`. But no document describes how these two systems connect.

**Unanswered questions that need resolution:**
- Does "Create Invoice" on a catering job create a new record in the existing `Invoice` model (shared with `InvoiceManager`)?
- Or does catering have its own separate invoice records?
- When the operator views `/app/invoicing`, do catering invoices appear there?
- When the operator views a job at `/app/catering/job/:id`, does the linked invoice render inline or link out to `/app/invoicing`?

**Resolution:** Catering invoices ARE standard invoices. Creating an invoice from a job calls `invoiceService.createInvoice()` with line items pre-populated from the selected package × headcount. `CateringJob.invoiceId` links to the `Invoice.id`. The invoice then appears in `/app/invoicing` filtered alongside all other invoices. Catering-origin invoices should be tagged (`source: 'catering'`, `sourceJobId: string`) so the operator can filter by source. This tag does not currently exist on the `Invoice` model.

---

### Critical Gap 6: Delivery Feature Is Undefined
**Status:** FEATURE-04 lists Delivery in the sidebar at `/app/catering/delivery`. FEATURE-05 omits it entirely. No document describes what the delivery feature actually does.

**What delivery should be:**
Off-site event management. A view that shows all jobs with `locationType === 'off_site'`, grouped by date. For each job shows: event name, client, address, headcount, arrival time (from `startTime`), assigned staff, notes. Enables the caterer to plan which events are going to which locations on which days. Not routing software (no map integration). Not driver assignment. Just a date-sorted list of off-site commitments with their delivery details — the equivalent of a dispatch board.

---

### Gap 7: BUG-35 Is a Prerequisite — Not an Implementation Item
The session notes confirm `GET /api/merchant/undefined/catering/events` fires in production. This is not an enhancement — it means the catering dashboard loads no data at all. BUG-35 must be resolved before any catering feature is functional regardless of order.

---

### Gap 8: Field Name `restaurantId` vs. `merchantId` in Event Form Save
The `catering-event-form.component.ts` explicitly sends `restaurantId: ''` in its save payload. The backend ignores this field and uses the authenticated merchant context. But the frontend model, the event cards, the dashboard, and any component that accesses `job.restaurantId` is reading an empty string. This should be `merchantId` throughout, populated by `authService.selectedMerchantId()`.

---

## Part 4 — Complete Unified Implementation List

All 27 items from FEATURE-05, augmented and corrected with everything above. In strict dependency order.

---

### Prerequisites (Nothing Else Works Without These)

**P1 — Fix BUG-35: `merchantId` undefined on catering API calls**
- `catering.service.ts` — replace `effect()` constructor pattern with `toObservable(selectedMerchantId).pipe(filter(Boolean), take(1))` or equivalent reactive guard
- Verify `AuthService.selectedMerchantId` is a proper Angular signal, not a getter

**P2 — Fix field name: `restaurantId` → `merchantId` throughout catering**
- `catering.model.ts` — rename `restaurantId` to `merchantId`
- `catering-event-form.component.ts` — send `merchantId: authService.selectedMerchantId()` in save payload
- All catering components that reference `job.restaurantId`

**P3 — Fix field name mismatch: frontend vs. backend Prisma**
- Frontend sends: `fulfillmentDate`, `clientName`, `clientPhone`, `clientEmail`
- Backend Prisma has: `eventDate`, `contactName`, `contactPhone`, `contactEmail`
- Prisma migration to rename columns (use `@map()` to preserve DB column names or migrate data)
- Update Zod schemas in `catering.routes.ts`

---

### Foundation (Data Model & Schema)

**1 — Add catering mode to platform system**
- `platform.model.ts` — add `'catering'` to `DevicePosMode`
- `device.model.ts` — add `defaultModeSettingsForPosMode('catering')` case
- `DEVICE_POS_MODE_CATALOG` — add catering card definition

**2 — Setup wizard redesign**
- Replace 100+ business type search with 4-card mode grid (Quick Service / Full Service / Bar & Brewery / Catering)
- Remove `BUSINESS_CATEGORIES`, `BUSINESS_TYPE_MODE_MAP`, all cuisine/revenue signal methods
- Add `MODE_CARDS` constant and `_selectedPosMode` signal

**3 — Backend schema: add missing fields to CateringJob Prisma model**
All fields currently in the frontend model but absent from the DB:
```prisma
startTime           String?
endTime             String?
locationType        String    @default("on_site")
locationAddress     String?
companyName         String?
packages            Json      @default("[]")
selectedPackageId   String?
milestones          Json      @default("[]")
totalCents          Int       @default(0)
paidCents           Int       @default(0)
estimateId          String?
invoiceId           String?
contractUrl         String?
contractSignedAt    DateTime?
brandingLogoUrl     String?
brandingColor       String?
invoiceNotes        String?
```

**4 — Backend schema: new tables**
```prisma
model CateringPackageTemplate {
  id              String   @id @default(uuid())
  merchantId      String
  name            String
  tier            String   // standard | premium | custom
  pricingModel    String   // per_person | per_tray | flat
  pricePerUnit    Float
  minimumHeadcount Int     @default(1)
  description     String?
  menuItemIds     Json     @default("[]")
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model CateringProposalToken {
  id          String    @id @default(uuid())
  jobId       String
  token       String    @unique
  expiresAt   DateTime
  viewedAt    DateTime?
  approvedAt  DateTime?
  job         CateringJob @relation(...)
}

model CateringActivity {
  id          String   @id @default(uuid())
  jobId       String
  action      String
  description String
  metadata    Json?
  actorType   String   // operator | client | system
  createdAt   DateTime @default(now())
}
```

**5 — Add `menuType` and `cateringPricingModel` to MenuItem**
- `menu.model.ts` — add `menuType?: 'standard' | 'catering'` and `cateringPricingModel?: CateringPricingModel | null`
- Backend Prisma `MenuItem` model — add columns
- Menu management UI — pricing model selector when `menuType === 'catering'`
- Menu management filter — `/app/menu?type=catering` shows catering items only

**6 — Add `source` tag to Invoice model**
- `invoice.model.ts` — add `source?: 'manual' | 'catering'` and `sourceJobId?: string`
- Backend Prisma `Invoice` model — add columns
- `InvoiceManager` — filter option to show catering-origin invoices

**7 — Update all backend routes to handle new fields**
- `catering.routes.ts` — expand Zod schemas for all new `CateringJob` fields

---

### Catering Menu

**8 — Package template library at `/app/menu/packages`**
- New `CateringPackageLibrary` component
- CRUD: name, tier, pricing model, price per unit, min headcount, description
- Item picker: filtered to `menuType === 'catering'` items from the shared menu
- Backend CRUD endpoints: `GET/POST/PATCH/DELETE /merchant/:id/catering/packages`

---

### Core Job Management

**9 — Pipeline dashboard upgrades**
- KPI row: Total Pipeline, Outstanding Balance, Events This Month, Avg Job Value
- Next Event Banner (upcoming confirmed job)
- Status filter bar, sort controls (date, value, created)
- `pendingJobsCount`, `proposalsAwaitingApproval`, `milestonesComingDue` computed signals on `CateringService`

**10 — Event form: add missing fields**
- Add `companyName` field
- Add `locationType` toggle (On-Site / Off-Site) with conditional `locationAddress` field
- Populate `merchantId` from `authService.selectedMerchantId()`

**11 — Job detail view (`/app/catering/job/:id`)**
Single-job hub. Sections:
- Header: title, status badge, edit, Send Proposal, Generate BEO
- Event details + financial summary side-by-side
- Client info panel
- Packages panel — add from template library, shows selected package highlighted
- Milestones panel — editor with add/remove, mark paid
- Contract section — upload PDF, shows signed timestamp
- Invoice branding overrides — logo, color, notes
- Notes field
- Activity timeline (chronological audit trail)

**12 — Milestone editor (inside job detail)**
- Add/edit/remove up to 12 milestones
- Percent + due date per milestone
- `amountCents` auto-calculated from percent × totalCents
- "Mark Paid" → sets `paidAt`, recalculates `CateringJob.paidCents`
- Backend: `PATCH /merchant/:id/catering/events/:jobId/milestones/:milestoneId/pay`

**13 — Clone/repeat job**
- "Clone Job" button on job detail
- Creates new job: same packages, milestones (reset to unpaid), branding, notes
- New title, client, date, status = `inquiry`
- Backend: `POST /merchant/:id/catering/events/:jobId/clone`

---

### Client-Facing Documents

**14 — Proposals: generation and public page**
- "Send Proposal" on job detail → generates `CateringProposalToken`
- Backend:
  - `POST /merchant/:id/catering/events/:jobId/proposal` → token, URL
  - `GET /catering/proposal/:token` → public, returns job + packages
  - `POST /catering/proposal/:token/approve` → body `{ packageId }`, sets `selectedPackageId`, `totalCents`, `contractSignedAt` (if no separate contract), advances status
- Public component: `/catering/proposal/:token` (outside auth layout)
- Shows all packages in comparison layout (Standard / Premium / Custom columns)
- If `contractUrl` set: "I acknowledge the attached terms" checkbox required before selecting
- Email: pre-filled `mailto:` link for now; replaced by Resend in item 24

**15 — Proposals operator list (`/app/catering/proposals`)**
- Lists all jobs where `status === 'proposal_sent'` and `contractSignedAt` is null
- Per row: job title, client, sent date, last viewed timestamp (from `CateringProposalToken.viewedAt`), expiry, action buttons (Re-send, Cancel)

**16 — Invoicing from jobs**
- "Create Invoice" on job detail (visible when status >= `contract_signed`)
- Calls `invoiceService.createInvoice()` with:
  - Line items from `selectedPackage.menuItemIds × headcount`
  - Branding from job overrides → merchant defaults
  - `source: 'catering'`, `sourceJobId: job.id`
- Sets `CateringJob.invoiceId`
- Backend: `POST /merchant/:id/catering/events/:jobId/invoice`

**17 — Contract upload and acknowledgment**
- File upload in job detail → Supabase Storage → sets `contractUrl`
- Proposal page: contract checkbox required before approval if `contractUrl` is set
- `contractSignedAt` set on approval

**18 — BEO (Banquet Event Order) generation**
- "Generate BEO" button on confirmed jobs
- Print-optimized HTML component at `/app/catering/job/:id/beo`
- Contents: event details, selected package with menu items and quantities, dietary notes, timeline, delivery/location info, staff notes, financial summary
- `@media print` stylesheet hides all nav/buttons
- "Download PDF" = `window.print()`

**19 — PDF export for invoices**
- "Download PDF" on invoice and BEO views
- Same `window.print()` + `@media print` CSS pattern

---

### Delivery

**20 — Delivery board (`/app/catering/delivery`)**
- Shows all jobs with `locationType === 'off_site'` grouped by date
- Per job: event name, client name, address, headcount, arrival time, notes
- Date picker to jump to any date
- Not driver assignment, not mapping — a dispatch board for off-site commitments

---

### Business & Reporting

**21 — Deferred revenue report (`/app/reports/deferred`)**
- Table: Job Title | Event Date | Total | Collected | Recognized | Deferred
- Recognized = `totalCents` when `fulfillmentDate ≤ today`, else 0
- Backend: `GET /merchant/:id/reports/catering/deferred`

**22 — Job performance report (`/app/reports/catering`)**
- Avg job value, close rate (inquiries → completed), revenue by event type, top clients

**23 — Client history in Customers**
- When in catering mode: per-client job count, total revenue, last event date
- "View Jobs" link per client (filters dashboard by `clientEmail`)
- Backend: `GET /merchant/:id/catering/clients` (aggregate by clientEmail)

**24 — KDS routing by fulfillment date**
- `prepLeadDays` per-merchant setting (default 1 day)
- `GET /kds/tickets` updated: catering tickets only visible when `fulfillmentDate ≤ today + prepLeadDays`
- Catering tickets get distinct visual treatment on KDS (color band, event name, headcount badge)

---

### Automation

**25 — Transactional email via Resend**
- Backend `src/services/email.service.ts` with `sendProposal()`, `sendInvoice()`, `sendReminder()`
- Env var: `RESEND_API_KEY`
- Replaces `mailto:` links for proposal and invoice sending
- HTML templates with branding (logo, color from merchant settings)

**26 — Payment reminder cron (daily 9am)**
- Find milestones: `dueDate ≤ today + 3 days`, `paidAt` null, `reminderSentAt` null, job not cancelled/completed
- Send reminder email via Resend
- Set `reminderSentAt` on milestone

**27 — Status auto-advance cron (daily 8am)**
- When `fulfillmentDate === today` and status is `deposit_received` → advance to `in_progress`
- Log to `CateringActivity`

---

### Sidebar & Navigation

**28 — Calendar as standalone route**
- Extract `CateringCalendarComponent` from dashboard tab to `/app/catering/calendar`
- Dashboard retains: Active Jobs, Upcoming, Past, Capacity tabs (no Calendar tab)
- Calendar view: job cards instead of dots, status color bands, click-to-create, .ics export
- Backend feeds existing calendar data; no new endpoint needed

**29 — `buildCateringNav()` replacement**
- Full implementation per FEATURE-04 Section 5.1
- Sections: Pipeline, Billing, Operations, Business, Config
- Badge counts: pendingJobs (inquiry + proposal_sent), proposalsAwaitingApproval, milestonesComingDue
- Children for Jobs, Invoices, Menu, Reports, Staff, Settings
- Invoice Milestones at `/app/invoicing/milestones`
- Deferred at `/app/reports/deferred`
- Job Performance at `/app/reports/catering`

---

### Quality of Life

**30 — Lead capture form (public)**
- `/catering/lead/:merchantSlug` — public inquiry form
- Creates `CateringJob` with `status: 'inquiry'`
- Backend: `POST /catering/lead/:merchantSlug` (public, rate-limited)
- Merchant identified by slug (add `slug` to Restaurant/Merchant model if not present)

**31 — Activity timeline per job**
- Auto-logged by backend on every mutating endpoint
- Frontend: vertical timeline in job detail
- Shows: created, proposal sent, proposal viewed, package selected, contract signed, deposit received, milestone paid, status changes, edits

**32 — Dashboard empty state**
- When `jobs().length === 0`: 3-step onboarding guide
  1. Create your first job
  2. Set up your catering menu (link to `/app/menu?type=catering`)
  3. Configure invoice branding (link to `/app/settings/branding`)

**33 — Search and bulk actions**
- Search bar filtering by client name, title, event type, status
- Checkboxes per job card
- Bulk: Mark Completed, Cancel Selected, Export CSV

**34 — Prep list (`/app/catering/prep-list?date=YYYY-MM-DD`)**
- Aggregates all menu items across all jobs on a given date
- Columns: Item | Total Qty | Per-job breakdown
- Print-optimized with `@media print`
- Backend: `GET /merchant/:id/catering/prep-list?date=YYYY-MM-DD`

---

## Part 5 — Invoice Branding Settings

**35 — Merchant-level invoice branding defaults (`/app/settings/branding`)**
- Logo upload (stored in Supabase Storage)
- Brand color hex picker
- Default invoice footer text (payment terms, cancellation policy)
- Backend: add `defaultBrandingLogoUrl`, `defaultBrandingColor`, `defaultInvoiceNotes` to Restaurant/Merchant Prisma model
- All client-facing documents (proposal, invoice, BEO) check job-level overrides first, fall back to merchant defaults

---

## Part 6 — Dependency Order (All 35 Items)

```
P1 → Fix BUG-35 (merchantId undefined)
P2 → Fix restaurantId → merchantId in frontend model + form
P3 → Fix field name mismatch (fulfillmentDate/clientName vs eventDate/contactName in Prisma)

1 → Catering DevicePosMode (platform + device models)
2 → Setup wizard 4-card redesign

3 → Backend schema: missing CateringJob fields          [depends: P3]
4 → Backend schema: new tables (PackageTemplate, ProposalToken, Activity)
5 → MenuItem: menuType + cateringPricingModel fields    [depends: 3]
6 → Invoice: source + sourceJobId fields
7 → Backend routes: Zod schemas for all new fields      [depends: 3, 4]

8 → Package template library UI + endpoints             [depends: 5, 7]

9 → Pipeline dashboard KPIs + signals                   [depends: P1, 7]
10 → Event form: companyName, locationType, merchantId  [depends: P2]
11 → Job detail view                                    [depends: 7]
12 → Milestone editor                                   [depends: 11]
13 → Clone job                                          [depends: 11]

14 → Proposals: generation + public page               [depends: 8, 11]
15 → Proposals: operator list                          [depends: 14]
16 → Invoicing from jobs                               [depends: 6, 8, 11, 12]
17 → Contract upload + acknowledgment                  [depends: 14]
18 → BEO generation                                    [depends: 8, 11]
19 → PDF export (invoice + BEO)                        [depends: 16, 18]

20 → Delivery board                                    [depends: 10]

21 → Deferred revenue report                           [depends: 7]
22 → Job performance report                            [depends: 7]
23 → Client history in Customers                       [depends: 7]
24 → KDS routing by fulfillment date                   [depends: 7]

25 → Transactional email (Resend)                      [depends: 14, 16]
26 → Payment reminder cron                             [depends: 12, 25]
27 → Status auto-advance cron                          [depends: 7]

28 → Calendar standalone route                         [depends: 9]
29 → buildCateringNav() replacement                    [depends: 9, 11, 14, 28]

30 → Lead capture form (public)                        [depends: 7]
31 → Activity timeline                                 [depends: 4, 11]
32 → Dashboard empty state                             [depends: 9]
33 → Search + bulk actions                             [depends: 9]
34 → Prep list                                         [depends: 8, 24]
35 → Invoice branding settings                         [depends: 16]
```

---

## Part 7 — What Is Deliberately Excluded

| Feature | Why |
|---|---|
| KDS / Kitchen Display in catering sidebar | Caterers prep in advance on schedule, not real-time tickets. KDS routing by `fulfillmentDate` (item 24) is separate — it filters tickets that exist elsewhere; it's not a sidebar section. |
| Floor plan / table management | Events at off-site venues |
| Reservations / waitlist | Jobs are individually contracted, not walk-ins |
| Digital signatures (DocuSign/HelloSign) | Contract acknowledgment checkbox + timestamp is sufficient |
| Accounting integration (QuickBooks/Xero) | Future; data model is accounting-ready from day one (gross/fee/net on transactions, `source: 'catering'` tag on invoices) |
| Recurring event schedules | Clone job (item 13) covers 90% of the use case without recurrence rule complexity |
| Inventory / food cost / recipe costing | Separate product domain |
| Guest management / seating charts | Venue-specific |
| Staff assignment per event | Caterease-level specialization, not core workflow |
| Online cart / checkout ordering | Catering is lead form → proposal, not cart checkout |
| Loyalty / gift cards | Not a catering business model |

---

## Part 8 — Competitive Position After All 35 Items

| Feature | Square | Toast | Caterease | HoneyBook | OrderStack |
|---|---|---|---|---|---|
| Proposals with multi-package tiers | ✅ | ❌ | ✅ | ✅ | ✅ |
| Milestone payments | ✅ (+$20/mo) | ❌ | ✅ | ✅ | ✅ (included) |
| BEO generation | ❌ | ✅ | ✅ | ❌ | ✅ |
| Daily prep list | ❌ | ✅ | ✅ | ❌ | ✅ |
| Calendar with capacity/conflict detection | ❌ | ❌ | ❌ | ❌ | ✅ (unique) |
| Invoice branding | ✅ | ✅ | ✅ | ✅ | ✅ |
| Lead capture form | ❌ | ✅ | ✅ | ✅ | ✅ |
| Deferred revenue tracking | ✅ | ❌ | ❌ | ❌ | ✅ |
| Contract acknowledgment | ✅ | ✅ | ✅ | ✅ | ✅ |
| Catering menu pricing (per-person, per-tray) | ✅ | ✅ | ✅ | ❌ | ✅ |
| Activity timeline per job | ❌ | ❌ | ❌ | ✅ | ✅ |
| Clone/repeat jobs | ❌ | ✅ | ✅ | ❌ | ✅ |
| Client history + revenue | ❌ | ❌ | ✅ | ✅ | ✅ |
| Payment reminders | ✅ | ✅ | ✅ | ✅ | ✅ |
| Search + bulk actions | ✅ | ✅ | ✅ | ❌ | ✅ |
| PDF invoices + BEO | ✅ | ✅ | ✅ | ✅ | ✅ |
| Transactional email | ✅ | ✅ | ✅ | ✅ | ✅ |
| Delivery board | ❌ | ✅ | ✅ | ❌ | ✅ |
| KDS routing by event date | ❌ | ✅ | ✅ | ❌ | ✅ |
| Empty state onboarding | ✅ | ✅ | ❌ | ✅ | ✅ |
| Reusable package template library | ❌ | ❌ | ✅ | ❌ | ✅ (unique among POS systems) |

**Unique advantages:**
- Calendar with capacity/conflict detection — no competitor has this
- Milestone payments included free — Square charges $20/month extra
- Reusable package template library — no POS competitor offers this; Caterease (dedicated catering software) does
- BEO + prep list + deferred revenue in a POS system — only Toast comes close
