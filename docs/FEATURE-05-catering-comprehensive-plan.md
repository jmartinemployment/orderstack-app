# FEATURE-05 — Complete Catering Implementation Plan

> **Date:** March 6, 2026
> **Status:** Draft for review
> **Starting point:** `docs/square-catering-gap-analysis.md`

---

## The Problem

The frontend has a rich `CateringJob` model with packages, milestones, invoicing, contracts, and branding fields. The backend Prisma schema has none of these — it stores only basic event info (title, date, headcount, contact, notes). The field names don't even match between frontend and backend (`eventDate` vs `fulfillmentDate`, `contactName` vs `clientName`). Everything beyond basic CRUD is a fiction — the model pretends features exist that have zero backend support.

The gap analysis against Square, Toast, Caterease, HoneyBook, and Total Party Planner identified what caterers actually need:

1. **Proposals** that clients can view and approve (not just a status label)
2. **Invoicing** with line items from a catering menu
3. **Deposits and milestone payments** (Square charges $20/mo extra for this)
4. **Contracts** with client acknowledgment
5. **BEO (Banquet Event Order)** for kitchen/staff coordination (Toast's core feature)
6. **Prep lists** aggregating all menu items across jobs for a given day
7. **Catering-specific menu** with per-person and per-tray pricing
8. **Invoice branding** (logo, color, terms)
9. **Pipeline dashboard** with financial KPIs, search, and bulk actions
10. **Deferred revenue tracking** (recognize revenue on event date, not payment date)
11. **Lead capture** (web form for client inquiries)
12. **Activity timeline** on each job (audit trail of every status change, email, payment)
13. **Repeat/clone jobs** for recurring corporate clients
14. **Calendar improvements** — job cards with status colors, click-to-create, .ics export
15. **Empty states** — onboarding guidance for new caterers with zero jobs
16. **Transactional email** — actually send proposals, invoices, and payment reminders
17. **Client history** — per-client job count, total revenue, repeat rate
18. **Search and bulk actions** across the job list
19. **PDF export** for invoices (browser print-to-PDF at minimum)
20. **Payment reminder cron** — daily job that finds milestones due within 3 days and sends reminders
21. **Dietary restrictions / allergen tracking** — structured per-event dietary counts, surfaced on BEOs and prep lists
22. **Service charges, gratuity, and tax** on invoices — auto-calculated line items, not baked into totalCents
23. **Guest portal** — single client-facing page showing event details, BEO, payment status, and contract in one place
24. **Tasting session scheduling** — track menu tastings before the event with date, notes, and outcomes
25. **Delivery logistics for off-site events** — driver assignment, pickup time, delivery checklist, route notes

OrderStack already leads on: calendar view, capacity/conflict detection, full status lifecycle. These don't need work.

---

## What Exists Today

### Database (Prisma — source of truth)

```prisma
model CateringEvent {
  id              String    @id @default(uuid())
  restaurantId    String
  title           String
  eventType       String
  status          String    @default("inquiry")
  eventDate       DateTime
  startTime       String
  endTime         String
  headcount       Int
  locationType    String    @default("on_site")
  locationAddress String?
  contactName     String
  contactPhone    String
  contactEmail    String
  notes           String?
  createdAt       DateTime
  updatedAt       DateTime
}

model CateringCapacitySettings {
  id                    String
  restaurantId          String    @unique
  maxEventsPerDay       Int       @default(3)
  maxHeadcountPerDay    Int       @default(200)
  conflictAlertsEnabled Boolean   @default(true)
  updatedAt             DateTime
}
```

No financial fields. No packages. No milestones. No invoicing.

### Backend (7 endpoints — working)

- `GET/POST/GET/:id/PATCH/:id/DELETE/:id` on `/merchant/:merchantId/catering/events`
- `GET/PUT` on `/merchant/:merchantId/catering/capacity`

Field names use `eventDate`, `contactName`, `contactPhone`, `contactEmail`.

### Frontend model (`catering.model.ts`)

`CateringJob` interface with financial fields that have zero backend support: `packages`, `milestones`, `totalCents`, `paidCents`, `estimateId`, `invoiceId`, `contractUrl`, `contractSignedAt`, `brandingLogoUrl`, `brandingColor`, `invoiceNotes`.

### Frontend components (4 — working for basic CRUD)

- `CateringDashboardComponent` — 5 tabs (Active, Upcoming, Past, Calendar, Capacity)
- `CateringEventCardComponent` — status badge, quick actions
- `CateringEventFormComponent` — create/edit slide-out panel
- `CateringCalendarComponent` — month view

### Open bugs

- **BUG-35** — API calls fire with `/merchant/undefined/`. `selectedMerchantId()` is undefined when `effect()` fires. All catering API calls fail.
- **Field name mismatch** — Frontend sends `fulfillmentDate`/`clientName`, backend expects `eventDate`/`contactName`. Creates/updates may silently drop fields.

---

## Implementation Plan

Everything below is in dependency order. Each item lists exactly what files change and what the change does. No stubs — every change connects end-to-end.

### 1. Fix BUG-35 (merchantId undefined)

**Problem:** `CateringService` constructor has an `effect()` that calls `loadJobs()` and `loadCapacitySettings()` when `selectedMerchantId` changes. But the signal is `undefined` on first run and the effect never re-fires because auth resolves after component init.

**Fix:** Guard the effect properly — the `if (mid)` guard is already there, but the effect may not re-run when the signal updates later. Verify `selectedMerchantId` is a true Angular signal (not a plain getter). If it's a getter wrapping a signal, the effect won't track it.

**Files:**
- `src/app/services/catering.service.ts` — verify effect reactivity, potentially switch to `toObservable()` + `filter(Boolean)` pattern
- `src/app/services/auth.ts` — verify `selectedMerchantId` is a signal, not a getter

### 2. Fix field name mismatch between frontend and backend

**Problem:** Frontend model uses `fulfillmentDate`, `clientName`, `clientPhone`, `clientEmail`, `bookingDate`, `locationType`. Backend Prisma uses `eventDate`, `contactName`, `contactPhone`, `contactEmail`. The frontend form sends fields the backend ignores.

**Decision needed:** Rename in the backend schema (Prisma migration) to match the frontend names, or rename the frontend to match the backend? I recommend renaming the backend to match the frontend because the frontend names are better (`clientName` is clearer than `contactName`, `fulfillmentDate` is more specific than `eventDate`).

**Files:**
- `prisma/schema.prisma` — rename columns with `@map()` to preserve DB column names
- `src/app/catering.routes.ts` — update Zod schemas and Prisma field references
- Prisma migration

### 3. Add financial columns to CateringEvent schema

**What:** Add every field from the frontend `CateringJob` model to the Prisma schema. All new columns are nullable or have defaults so existing rows survive the migration.

**New columns on CateringEvent:**

| Column | Type | Default | Purpose |
|---|---|---|---|
| `bookingDate` | DateTime | `now()` | When inquiry was created |
| `companyName` | String? | null | Client's company |
| `totalCents` | Int | 0 | Job total in cents |
| `paidCents` | Int | 0 | Amount collected |
| `packages` | Json | `[]` | Array of CateringPackage objects |
| `selectedPackageId` | String? | null | Which package client chose |
| `milestones` | Json | `[]` | Array of CateringMilestonePayment objects |
| `estimateId` | String? | null | Proposal token |
| `invoiceId` | String? | null | Primary invoice record |
| `contractUrl` | String? | null | Uploaded contract PDF URL |
| `contractSignedAt` | DateTime? | null | When client acknowledged |
| `brandingLogoUrl` | String? | null | Per-job logo override |
| `brandingColor` | String? | null | Per-job color override |
| `invoiceNotes` | String? | null | Cancellation policy, terms |

**New table: CateringProposalToken**

| Column | Type | Purpose |
|---|---|---|
| `id` | String (uuid) | Primary key |
| `jobId` | String (FK) | Links to CateringEvent |
| `token` | String (unique) | URL-safe token for public access |
| `expiresAt` | DateTime | Token expiration (30 days default) |
| `viewedAt` | DateTime? | First client view timestamp |
| `approvedAt` | DateTime? | When client approved a package |

**Files:**
- `prisma/schema.prisma` — add columns and new model
- Prisma migration
- `src/app/catering.routes.ts` — update Zod schemas to accept new fields

### 4. Update backend routes to handle all CateringJob fields

**What:** Update the create and update Zod schemas and Prisma operations to read/write all the new fields. The existing 7 endpoints stay the same — they just handle more data now.

**Files:**
- `src/app/catering.routes.ts` — expand `createEventSchema` and `updateEventSchema`

### 5. Pipeline dashboard with financial KPIs

**What:** The dashboard already has computed signals for `totalPipeline`, `outstandingBalance`, `eventsThisMonth`, `avgJobValue`, `nextUpcomingJob`. Wire these into the template as KPI cards above the job list. Add a status filter bar and sort controls.

**Layout (Square-inspired):**

```
+----------------------------------------------------------+
| [Next Event Banner — "Johnson Wedding in 3 days, $2,400  |
|  outstanding"]                                           |
+----------------------------------------------------------+
| Pipeline Value   | Outstanding    | This Month  | Avg Job |
| $45,200          | $12,800        | 4 events    | $5,650  |
+----------------------------------------------------------+
| Filter: [All v] [Date Range] [Event Type v]  Sort: [Date v] |
+----------------------------------------------------------+
| [Event Card]                                              |
| [Event Card]                                              |
| ...                                                       |
+----------------------------------------------------------+
```

**Files:**
- `src/app/features/catering/catering-dashboard/catering-dashboard.component.html` — add KPI row, filter bar, next-event banner
- `src/app/features/catering/catering-dashboard/catering-dashboard.component.scss` — KPI card styles
- `src/app/features/catering/catering-dashboard/catering-dashboard.component.ts` — add filter/sort signals
- `src/app/features/catering/catering-event-card/catering-event-card.component.html` — add financial summary (total, paid, balance) to card

### 6. Job detail view

**What:** New component that shows everything about a single catering job. This is the central hub — from here the operator manages packages, milestones, contracts, invoices, and branding.

**Layout:**

```
+----------------------------------------------------------+
| <- Back to Jobs         [Edit] [Send Proposal] [BEO]     |
+----------------------------------------------------------+
| Johnson Wedding Reception                                 |
| Status: [Proposal Sent]  Created: Mar 1  Event: Mar 15   |
+----------------------------------------------------------+
| EVENT DETAILS        | FINANCIAL SUMMARY                  |
| Type: Wedding        | Total: $6,500                      |
| Headcount: 100       | Paid: $3,250 (50%)                 |
| Time: 6pm - 10pm     | Balance: $3,250                    |
| Location: Off-site   | ======================== 50%       |
| 123 Main St          |                                    |
+----------------------------------------------------------+
| CLIENT               | PACKAGES (editable)                |
| Sarah Johnson        | [Standard] $45/person = $4,500     |
| sarah@email.com      | [Premium]  $65/person = $6,500  <- |
| (555) 123-4567       | [Custom]   $85/person = $8,500     |
| Acme Corp            | [+ Add Package]                    |
+----------------------------------------------------------+
| MILESTONES                                                |
| [x] Deposit      50%  $3,250  Due Mar 5   Paid Mar 4     |
| [ ] Final Payment 50%  $3,250  Due Mar 14                 |
| [+ Add Milestone]                                         |
+----------------------------------------------------------+
| CONTRACT                                                  |
| [Upload Contract PDF]  or  [contract.pdf - Signed Mar 3]  |
+----------------------------------------------------------+
| INVOICE BRANDING (optional overrides)                     |
| Logo: [Upload]  Color: [#picker]  Notes: [textarea]      |
+----------------------------------------------------------+
| NOTES                                                     |
| Vegetarian options needed for 20 guests...                |
+----------------------------------------------------------+
```

**Files:**
- `src/app/features/catering/catering-job-detail/catering-job-detail.component.ts` — new component
- `src/app/features/catering/catering-job-detail/catering-job-detail.component.html` — template
- `src/app/features/catering/catering-job-detail/catering-job-detail.component.scss` — styles
- `src/app/app.routes.ts` — add route `catering/job/:id`

### 7. Package builder (inside job detail)

**What:** Add/edit/remove packages on a job. Each package has: name, tier (standard/premium/custom), pricing model (per-person/per-tray/flat), price per unit, minimum headcount, description. Selecting a package calculates `totalCents` = price x headcount (for per-person) or flat price.

**Files:**
- `src/app/features/catering/catering-job-detail/catering-job-detail.component.ts` — package CRUD methods
- `src/app/features/catering/catering-job-detail/catering-job-detail.component.html` — package cards with edit forms
- `src/app/services/catering.service.ts` — `updateJob()` already handles partial updates including `packages`

### 8. Milestone editor (inside job detail)

**What:** Add/edit/remove milestones. Each has: label, percentage, due date. Amount auto-calculated from percentage x totalCents. Default: 50% deposit + 50% final. Max 12 milestones. "Mark Paid" button sets `paidAt` and recalculates `paidCents`.

**Backend:** New endpoint `PATCH /merchant/:id/catering/events/:eventId/milestones/:milestoneId/pay` — sets `paidAt`, recalculates `paidCents` on the job.

**Files:**
- `src/app/features/catering/catering-job-detail/catering-job-detail.component.ts` — milestone CRUD, mark-paid
- `src/app/features/catering/catering-job-detail/catering-job-detail.component.html` — milestone list with edit/pay
- `src/app/services/catering.service.ts` — `markMilestonePaid()` method
- Backend: `src/app/catering.routes.ts` — milestone pay endpoint

### 9. Proposals (client-facing public page)

**What:** "Send Proposal" button on job detail generates a unique token URL. The public page shows business name/logo, event details, all packages in a side-by-side comparison, and a "Select This Package" button per package. Client selects a package — sets `selectedPackageId`, calculates `totalCents`, advances status.

**Backend endpoints:**
- `POST /merchant/:id/catering/events/:eventId/proposal` — generates token, stores in CateringProposalToken table, returns URL
- `GET /catering/proposal/:token` — public, no auth. Returns job data + packages for rendering
- `POST /catering/proposal/:token/approve` — public. Body: `{ packageId }`. Sets `selectedPackageId`, `totalCents`, advances status to `contract_signed`

**Frontend:**
- New `CateringProposalComponent` at public route `/catering/proposal/:token`
- Package comparison cards (see wireframe in job detail section above — the 3-column Standard/Premium/Custom layout)
- If `contractUrl` is set, show "I acknowledge the contract" checkbox that must be checked before selecting a package

**Email delivery:** "Send Proposal" opens `mailto:` with pre-filled subject and body containing the proposal URL. No email service yet.

**Files:**
- `src/app/features/catering/catering-proposal/catering-proposal.component.ts` — new public component
- `src/app/features/catering/catering-proposal/catering-proposal.component.html`
- `src/app/features/catering/catering-proposal/catering-proposal.component.scss`
- `src/app/app.routes.ts` — public route (outside auth layout)
- `src/app/services/catering.service.ts` — `generateProposal()` method
- Backend: `src/app/catering.routes.ts` — 3 new endpoints

### 10. Invoicing from jobs

**What:** "Create Invoice" button on job detail (visible when status >= `contract_signed`). Creates line items from selected package's menu items x headcount. Each milestone can also generate its own mini-invoice with a client-facing payment link.

**Backend endpoints:**
- `POST /merchant/:id/catering/events/:eventId/invoice` — creates Invoice record, sets `CateringJob.invoiceId`, returns invoice
- `GET /catering/invoice/:token` — public client-facing invoice view (same token pattern as proposals)

**Files:**
- `src/app/features/catering/catering-invoice/catering-invoice.component.ts` — new public component
- `src/app/features/catering/catering-invoice/catering-invoice.component.html`
- `src/app/features/catering/catering-invoice/catering-invoice.component.scss`
- `src/app/app.routes.ts` — public route
- `src/app/services/catering.service.ts` — `createInvoice()` method
- Backend: `src/app/catering.routes.ts` — 2 new endpoints

Note: Actual payment collection (Stripe/PayPal) depends on payment processing being live. For now, invoices show amount due and the operator manually marks milestones as paid.

### 11. Contract upload and acknowledgment

**What:** File upload button in job detail stores PDF to Supabase Storage, sets `contractUrl`. On the proposal page, if `contractUrl` is set, client must check "I acknowledge and agree to the terms" before selecting a package. Checking it sets `contractSignedAt`.

**Files:**
- `src/app/features/catering/catering-job-detail/catering-job-detail.component.ts` — upload handler
- `src/app/features/catering/catering-proposal/catering-proposal.component.html` — contract acknowledgment checkbox
- Backend: `src/app/catering.routes.ts` — `POST /merchant/:id/catering/events/:eventId/contract` (file upload)
- Supabase Storage bucket: `catering-contracts`

### 12. BEO (Banquet Event Order) generation

**What:** "Generate BEO" button on confirmed jobs. Renders a structured HTML document optimized for printing (browser print to PDF). Contains: event details, selected package with menu items and quantities, dietary notes, timeline, location/delivery info, financial summary.

**This is what Toast charges for.** It's the document the kitchen and event staff work from. Every caterer needs this.

**Files:**
- `src/app/features/catering/catering-beo/catering-beo.component.ts` — new print-optimized component
- `src/app/features/catering/catering-beo/catering-beo.component.html` — BEO layout
- `src/app/features/catering/catering-beo/catering-beo.component.scss` — print styles (`@media print`)
- `src/app/app.routes.ts` — route `catering/job/:id/beo`

### 13. Catering menu (dedicated pricing)

**What:** Add `menuType: 'standard' | 'catering'` and `cateringPricingModel: 'per_person' | 'per_tray' | 'flat'` to menu items. Catering mode filters to catering items only. The package builder (item 7) picks from catering menu items. Invoice line items auto-calculate quantity based on pricing model and headcount.

**Files:**
- Backend: `prisma/schema.prisma` — add `menuType` and `cateringPricingModel` to MenuItem model
- Backend: menu routes — filter by `menuType` query param
- Frontend: `src/app/models/menu.model.ts` (or wherever MenuItem is defined) — add fields
- Frontend: menu management component — pricing model selector when `menuType === 'catering'`

### 14. Invoice branding

**What:** Settings > Invoice Branding: logo upload, brand color hex picker, default invoice footer text. These are merchant-level defaults. Per-job overrides in job detail view (the `brandingLogoUrl`, `brandingColor`, `invoiceNotes` fields). Proposals, invoices, and BEOs all render with branding — job-level overrides take precedence over merchant defaults.

**Files:**
- Frontend: settings component — new "Invoice Branding" tab
- Frontend: proposal, invoice, and BEO components — apply branding
- Backend: merchant model — add `defaultBrandingLogoUrl`, `defaultBrandingColor`, `defaultInvoiceNotes`
- Backend: `prisma/schema.prisma` — add columns to Restaurant model

### 15. Deferred revenue report

**What:** New report showing all jobs with future fulfillment dates. Revenue is "recognized" when `fulfillmentDate <= today`, "deferred" when `fulfillmentDate > today`. Table columns: Job, Event Date, Total, Collected, Recognized, Deferred.

**Backend endpoint:** `GET /merchant/:id/reports/catering/deferred` — returns `CateringDeferredRevenueEntry[]`

**Files:**
- Frontend: `src/app/features/catering/catering-reports/catering-reports.component.ts` — new component
- Frontend: template with deferred revenue table + job performance metrics
- Backend: `src/app/catering.routes.ts` — report endpoint
- `src/app/app.routes.ts` — route `catering/reports`

### 16. Lead capture form (public)

**What:** Public page where potential clients submit an inquiry. Fields: name, email, phone, company, event type, estimated date, headcount, message. Creates a CateringEvent with `inquiry` status. Merchant identified by URL slug.

**Backend endpoint:** `POST /catering/lead/:merchantSlug` — public, no auth, rate-limited

**Files:**
- Frontend: `src/app/features/catering/catering-lead-form/catering-lead-form.component.ts` — new public component
- Frontend: template with inquiry form
- Backend: `src/app/catering.routes.ts` — lead submission endpoint
- Backend: `prisma/schema.prisma` — add `slug` to Restaurant if not present
- `src/app/app.routes.ts` — public route

### 17. Sidebar nav upgrade (FEATURE-04)

**What:** Implement the `buildCateringNav()` upgrade from FEATURE-04: section dividers, badge counts (pending jobs, proposals awaiting approval, milestones coming due), children sub-items, all catering sub-routes.

**Files:**
- `src/app/layouts/main-layout.component.ts` — upgrade `buildCateringNav()`
- `src/app/layouts/main-layout.component.html` — render `dividerBefore`, `badge`, `children`
- `src/app/services/catering.service.ts` — add `pendingJobsCount`, `proposalsAwaitingApproval`, `milestonesComingDue` computed signals
- `src/app/services/platform.ts` — add `isQuickServiceMode`, `isFullServiceMode`, `isBarMode` signals

### 18. Prep list (daily aggregate across all jobs)

**What:** A BEO is per-job. A prep list is per-day across all jobs. A caterer prepping for 3 events on Saturday needs one combined document showing total quantities of every menu item across all events that day.

**Example:** Job A needs 50 chicken, Job B needs 30 chicken, Job C needs 80 chicken. Prep list for Saturday shows: Chicken — 160 servings (50 + 30 + 80), broken down by job.

**Layout:**
```
PREP LIST — Saturday, March 15, 2026
3 events | 280 total guests
──────────────────────────────────────────
Item              | Total | Job A (50) | Job B (30) | Job C (80)
Grilled Chicken   | 160   | 50         | 30         | 80
Caesar Salad      | 130   | 50         | 0          | 80
Pasta Primavera   | 80    | 0          | 30         | 50
Dinner Rolls      | 280   | 50         | 30         | 80 (x2)
```

**Files:**
- `src/app/features/catering/catering-prep-list/catering-prep-list.component.ts` — new print-optimized component
- `src/app/features/catering/catering-prep-list/catering-prep-list.component.html`
- `src/app/features/catering/catering-prep-list/catering-prep-list.component.scss` — print styles
- `src/app/app.routes.ts` — route `catering/prep-list` with date query param
- Backend: `GET /merchant/:id/catering/prep-list?date=YYYY-MM-DD` — aggregates menu items across jobs for that date

### 19. Activity timeline (audit trail per job)

**What:** Every job gets a chronological log of everything that happened: created, proposal sent, proposal viewed by client, package selected, contract signed, deposit received, milestone paid, status changes, edits. Displayed in job detail view as a vertical timeline.

**Data model:** New `CateringActivity` table:
- `id` (uuid), `jobId` (FK), `action` (string — e.g. "proposal_sent", "milestone_paid", "status_changed"), `description` (string — human-readable), `metadata` (Json — old/new values, milestone label, etc.), `actorType` ("operator" | "client" | "system"), `createdAt`

**Auto-logged by the backend** — every endpoint that modifies a job writes an activity entry. No manual logging from the frontend.

**Files:**
- Backend: `prisma/schema.prisma` — new `CateringActivity` model
- Backend: `src/app/catering.routes.ts` — write activity on every mutating endpoint, add `GET /merchant/:id/catering/events/:eventId/activity`
- Frontend: `src/app/features/catering/catering-job-detail/catering-job-detail.component.ts` — fetch and display timeline
- Frontend: template — vertical timeline UI in job detail

### 20. Repeat / clone job

**What:** "Clone Job" button on any job creates a new job with the same packages, milestones (reset to unpaid), branding, and notes — but with a new title, client, date, and `inquiry` status. For corporate clients who book the same event weekly/monthly.

**No recurring schedule system.** Just a clone button. The operator sets the new date manually. This covers 90% of the repeat-event use case without the complexity of recurrence rules.

**Files:**
- `src/app/features/catering/catering-job-detail/catering-job-detail.component.ts` — clone method
- `src/app/services/catering.service.ts` — `cloneJob(id)` that calls `createJob()` with copied data
- Backend: `POST /merchant/:id/catering/events/:eventId/clone` — server-side clone with reset fields

### 21. Calendar improvements

**What:** Upgrade the existing month calendar from dot indicators to mini job cards showing title, status color, and headcount. Click an empty date to create a new job with that date pre-filled. Click a job card to navigate to job detail. Add .ics export button per job ("Add to Calendar").

**Files:**
- `src/app/features/catering/catering-calendar/catering-calendar.component.ts` — job cards instead of dots, click handlers
- `src/app/features/catering/catering-calendar/catering-calendar.component.html` — card layout per day cell
- `src/app/features/catering/catering-calendar/catering-calendar.component.scss` — status color bands on cards
- `src/app/features/catering/catering-job-detail/catering-job-detail.component.ts` — .ics download method (generate iCalendar string, trigger download)

### 22. Dashboard empty state

**What:** When a caterer has zero jobs, the dashboard shows an onboarding guide instead of a blank page:

```
+----------------------------------------------------------+
| Welcome to OrderStack Catering                           |
|                                                          |
| Get started in 3 steps:                                  |
|                                                          |
| 1. [Create your first job] — Add an inquiry or upcoming  |
|    event                                                 |
|                                                          |
| 2. [Set up your catering menu] — Add items with          |
|    per-person or per-tray pricing                        |
|                                                          |
| 3. [Configure invoice branding] — Upload your logo and   |
|    set your brand color                                  |
|                                                          |
| Each step links directly to the right page.              |
+----------------------------------------------------------+
```

**Files:**
- `src/app/features/catering/catering-dashboard/catering-dashboard.component.html` — `@if (jobs().length === 0)` block with onboarding cards
- `src/app/features/catering/catering-dashboard/catering-dashboard.component.scss` — empty state styles

### 23. Transactional email

**What:** Actually send emails instead of opening `mailto:` links. Three email types:
1. **Proposal sent** — "You have a new proposal from [Business]. View and select your package: [link]"
2. **Invoice sent** — "You have a new invoice from [Business]. View details: [link]"
3. **Payment reminder** — "Payment of $X for [Job Title] is due on [Date]. Pay now: [link]"

**Provider:** Resend (simple API, free tier covers low volume, no SMTP config needed). Single `POST` to `https://api.resend.com/emails` with API key.

**Backend env var:** `RESEND_API_KEY`

**Files:**
- Backend: `src/services/email.service.ts` — new service with `sendProposal()`, `sendInvoice()`, `sendReminder()` methods
- Backend: `src/app/catering.routes.ts` — call email service when generating proposals and invoices
- Backend: email HTML templates (inline — no template engine, just string interpolation with branding)

### 24. Payment reminder cron

**What:** Daily job (9am) that finds all milestones where `dueDate <= today + 3 days` AND `paidAt` is null AND `reminderSentAt` is null AND job status is not cancelled/completed. Sends reminder email to client. Sets `reminderSentAt` on the milestone.

**Files:**
- Backend: `src/cron/milestone-reminders.ts` — cron job logic
- Backend: `src/server.ts` or cron scheduler — register the daily job (node-cron or similar)
- Backend: `src/services/email.service.ts` — `sendReminder()` method (from #23)

### 25. Client history view

**What:** On the existing Customers page, when in catering mode, show catering-specific data per client: total jobs, total revenue, last event date, repeat rate. Click a client to see all their jobs.

**Backend endpoint:** `GET /merchant/:id/catering/clients` — aggregates jobs by `clientEmail`, returns per-client stats

**Files:**
- Backend: `src/app/catering.routes.ts` — client aggregation endpoint
- Frontend: modify customers component to show catering stats when `isCateringMode()`
- Frontend: "View Jobs" link per client that navigates to dashboard filtered by client name

### 26. Search and bulk actions

**What:** Search bar on the dashboard that filters jobs by client name, title, event type, or status. Bulk actions: select multiple jobs via checkboxes, then "Mark Completed", "Cancel Selected", or "Export Selected" (CSV download).

**Files:**
- `src/app/features/catering/catering-dashboard/catering-dashboard.component.ts` — search signal, selection tracking, bulk action methods
- `src/app/features/catering/catering-dashboard/catering-dashboard.component.html` — search input, checkboxes on cards, bulk action toolbar
- `src/app/services/catering.service.ts` — `bulkUpdateStatus()` method

### 27. PDF export for invoices

**What:** "Download PDF" button on invoice and BEO views. Uses the browser's `window.print()` with `@media print` CSS to generate a clean PDF. The print stylesheet hides navigation, buttons, and non-document content. This is the same approach used for BEOs (#12) — consistent print treatment across all catering documents.

**Files:**
- `src/app/features/catering/catering-invoice/catering-invoice.component.scss` — `@media print` rules
- `src/app/features/catering/catering-invoice/catering-invoice.component.html` — "Download PDF" button that calls `window.print()`
- Same pattern already in BEO component — shared print utility if needed

### 28. Dietary restrictions / allergen tracking

**What:** Structured dietary data per job — not buried in a notes field. The event form gets a dietary section where the operator enters counts: vegetarian (12), vegan (5), gluten-free (8), nut allergy (3), kosher (2), halal (1), other (free text). Stored as a JSON object on the job.

**Why this matters:** A caterer with 100 guests needs to communicate exact dietary counts to the kitchen. Caterease tracks this per-guest. Tripleseat includes it in BEOs. Every competitor with BEO support surfaces dietary info prominently.

**Where it appears:**
- Event form — dietary section with count fields
- Job detail view — dietary summary card
- BEO — "DIETARY REQUIREMENTS" section with counts
- Prep list — adjusted quantities per dietary variant

**Data model:** New JSON field on CateringEvent:
```typescript
dietaryRequirements?: {
  vegetarian: number;
  vegan: number;
  glutenFree: number;
  nutAllergy: number;
  dairyFree: number;
  kosher: number;
  halal: number;
  other: string;  // free text for unlisted restrictions
}
```

**Files:**
- Backend: `prisma/schema.prisma` — add `dietaryRequirements Json?` to CateringEvent
- Backend: `src/app/catering.routes.ts` — accept in create/update schemas
- Frontend: `src/app/models/catering.model.ts` — add `DietaryRequirements` interface
- Frontend: `src/app/features/catering/catering-event-form/catering-event-form.component.html` — dietary section
- Frontend: job detail, BEO, and prep list components — render dietary data

### 29. Service charges, gratuity, and tax on invoices

**What:** Catering invoices need more than just `totalCents`. Industry standard is: subtotal + service charge (18-23%) + tax + optional gratuity. These must be separate line items — not baked into the total — because they have different tax treatments and the client expects to see them broken out.

**Data model:** New fields on CateringEvent (or calculated at invoice time):
```typescript
serviceChargePercent?: number;   // e.g. 20 (meaning 20%)
serviceChargeCents?: number;     // auto-calculated: subtotal * percent / 100
taxPercent?: number;             // e.g. 7.5
taxCents?: number;               // auto-calculated
gratuityPercent?: number;        // optional, e.g. 18
gratuityCents?: number;          // auto-calculated
subtotalCents: number;           // package price * headcount (before fees)
totalCents: number;              // subtotal + service charge + tax + gratuity
```

**Merchant-level defaults:** In Settings, the caterer sets their default service charge % and tax rate. Per-job overrides are allowed. Gratuity is optional and defaults to 0.

**Where it appears:**
- Job detail — financial summary shows all line items
- Proposal — total breakdown visible to client
- Invoice — full itemization: subtotal, service charge, tax, gratuity, total
- Milestone amounts recalculate proportionally when fees change

**Files:**
- Backend: `prisma/schema.prisma` — add fee columns to CateringEvent, add default fee columns to Restaurant
- Backend: `src/app/catering.routes.ts` — accept fee fields, auto-calculate derived amounts
- Frontend: `src/app/models/catering.model.ts` — add fee fields
- Frontend: job detail, proposal, and invoice components — render fee breakdown
- Frontend: settings component — default service charge % and tax rate fields

### 30. Guest portal (unified client view)

**What:** A single client-facing page (token-based, no login) that shows everything about their event in one place. Instead of separate proposal and invoice links, the client gets one portal URL that shows:

- Event details (date, time, location, headcount)
- Selected package (or package options if still choosing)
- Contract status (view + acknowledge)
- Payment status (milestones with paid/unpaid, "Pay Now" buttons)
- BEO (what's being served)
- Dietary requirements confirmed
- Activity timeline (when things happened)

**This replaces separate proposal and invoice URLs** as the primary client touchpoint. Proposals and invoices still have their own routes for direct linking, but the portal is the hub.

**Competitive reference:** Tripleseat's Guest Portal — real-time updates visible to the client without logging in.

**Files:**
- `src/app/features/catering/catering-guest-portal/catering-guest-portal.component.ts` — new public component
- `src/app/features/catering/catering-guest-portal/catering-guest-portal.component.html` — unified view
- `src/app/features/catering/catering-guest-portal/catering-guest-portal.component.scss`
- `src/app/app.routes.ts` — public route `/catering/portal/:token`
- Backend: `GET /catering/portal/:token` — returns complete job data (event, packages, milestones, contract, activity, dietary)
- Reuses the same `CateringProposalToken` table — portal token is the proposal token

### 31. Tasting session scheduling

**What:** Many caterers do a menu tasting with the client before the event — the client tries the proposed dishes and provides feedback. This needs to be trackable on the job.

**Data model:** New JSON field on CateringEvent:
```typescript
tastings?: CateringTasting[];

interface CateringTasting {
  id: string;
  scheduledDate: string;
  completedAt?: string;
  attendees: string;       // e.g. "Sarah + husband"
  notes?: string;          // feedback, changes requested
  menuChangesRequested?: string;  // specific changes to package
}
```

**Where it appears:**
- Job detail — "Tastings" section with date, status, notes
- Activity timeline — auto-logged when tasting is scheduled or completed
- Calendar — tasting dates show as a distinct event type

**Files:**
- Backend: `prisma/schema.prisma` — add `tastings Json?` to CateringEvent
- Backend: `src/app/catering.routes.ts` — accept in create/update
- Frontend: `src/app/models/catering.model.ts` — add `CateringTasting` interface
- Frontend: job detail component — tasting section with add/edit/complete

### 32. Delivery logistics for off-site events

**What:** Off-site catering needs delivery coordination: who's driving, what time to load, what time to arrive, what equipment to bring, route notes. Currently the job only has `locationType` and `locationAddress`.

**Data model:** New JSON field on CateringEvent:
```typescript
deliveryDetails?: {
  driverName?: string;
  driverPhone?: string;
  loadTime?: string;         // e.g. "14:00"
  departureTime?: string;    // e.g. "14:30"
  arrivalTime?: string;      // e.g. "15:30"
  vehicleDescription?: string;
  equipmentChecklist?: string[];  // e.g. ["chafing dishes (6)", "linens", "serving utensils"]
  routeNotes?: string;       // e.g. "use service entrance, loading dock on west side"
  setupTime?: string;        // e.g. "16:00"
  breakdownTime?: string;    // e.g. "22:00"
}
```

**Where it appears:**
- Job detail — "Delivery" section (only shown when `locationType === 'off_site'`)
- BEO — delivery timeline and equipment checklist included
- Prep list — load times surfaced so kitchen knows when food must be ready

**Files:**
- Backend: `prisma/schema.prisma` — add `deliveryDetails Json?` to CateringEvent
- Backend: `src/app/catering.routes.ts` — accept in create/update
- Frontend: `src/app/models/catering.model.ts` — add `DeliveryDetails` interface
- Frontend: job detail component — delivery section (conditionally rendered)
- Frontend: BEO component — delivery timeline section

---

## What This Plan Does NOT Build

| Feature | Why Not |
|---|---|
| Payment processing (Stripe/PayPal) | `STRIPE_SECRET_KEY` not configured. Invoices show amount due; operator marks paid manually. |
| Staff scheduling per event | Caterease-level specialization, not core workflow |
| Food cost / recipe costing | Separate product domain |
| Guest management / seating charts | Venue-specific, not core catering |
| Digital signatures (DocuSign) | Acknowledgment checkbox is sufficient |
| Accounting integration (QuickBooks) | Requires partner API — future feature |
| AI automation | Future |
| Recurring event schedules | Clone button (#20) covers 90% of the use case without recurrence rules |
| Route optimization | Requires mapping API (Google Maps). Route notes field is sufficient for now. |
| Per-guest dietary tracking | Per-event dietary counts are sufficient. Per-guest tracking is Caterease-level venue management. |

---

## Competitive Position After Implementation

| Feature | Square | Toast | Caterease | HoneyBook | Tripleseat | OrderStack |
|---|---|---|---|---|---|---|
| Proposals with multi-package | Yes | No | Yes | Yes | Yes | Yes |
| Milestone payments | Yes ($20/mo extra) | No | Yes | Yes | No | Yes (included) |
| BEO generation | No | Yes | Yes | No | Yes | Yes |
| Prep lists | No | Yes | Yes | No | No | Yes |
| Calendar with capacity | No | No | No | No | No | Yes (unique) |
| Invoice branding | Yes | Yes | Yes | Yes | Yes | Yes |
| Lead capture form | No | Yes | Yes | Yes | Yes | Yes |
| Deferred revenue | Yes | No | No | No | No | Yes |
| Contracts | Yes | Yes | Yes | Yes | Yes | Yes |
| Catering menu pricing | Yes | Yes | Yes | No | Yes | Yes |
| Activity timeline | No | No | No | Yes | Yes | Yes |
| Clone/repeat jobs | No | Yes | Yes | No | No | Yes |
| Client history | No | No | Yes | Yes | No | Yes |
| Payment reminders | Yes | Yes | Yes | Yes | No | Yes |
| Search + bulk actions | Yes | Yes | Yes | No | Yes | Yes |
| PDF invoices | Yes | Yes | Yes | Yes | Yes | Yes |
| Transactional email | Yes | Yes | Yes | Yes | Yes | Yes |
| Empty state onboarding | Yes | Yes | No | Yes | No | Yes |
| Dietary / allergen tracking | No | No | Yes | No | Yes | Yes |
| Service charges + tax | Yes | Yes | Yes | No | Yes | Yes |
| Guest portal | No | No | No | No | Yes | Yes |
| Tasting scheduling | No | No | No | No | Yes | Yes |
| Delivery logistics | No | No | No | No | No | Yes (unique) |

OrderStack matches or exceeds all six competitors. Unique advantages: calendar with capacity/conflict detection (no one else has this), milestone payments included free (Square charges $20/mo), BEO generation that Square doesn't offer, delivery logistics that no competitor tracks, and guest portal matching Tripleseat's premium feature.

---

## Summary: 32 Items, Dependency Order

| # | What | Backend | Frontend | Blocked By |
|---|---|---|---|---|
| 1 | ~~Fix BUG-35 (merchantId undefined)~~ DONE | - | catering.service.ts, auth.ts | Nothing |
| 2 | Fix field name mismatch | Prisma migration, routes | - | Nothing |
| 3 | Add financial columns to schema | Prisma migration | - | #2 |
| 4 | Update routes for all fields | catering.routes.ts | - | #3 |
| 5 | Pipeline dashboard + KPIs | - | Dashboard component | #1, #4 |
| 6 | Job detail view | - | New component + route | #4 |
| 7 | Package builder | - | In job detail | #6 |
| 8 | Milestone editor | New endpoint | In job detail | #6, #7 |
| 9 | Proposals (public page) | 3 new endpoints | New component + route | #7 |
| 10 | Invoicing from jobs | 2 new endpoints | New component + route | #8, #9 |
| 11 | Contract upload | 1 new endpoint | In job detail + proposal | #9 |
| 12 | BEO generation | - | New component + route | #7, #28 |
| 13 | Catering menu pricing | Prisma + routes | Menu component | #4 |
| 14 | Invoice branding | Prisma + routes | Settings + all docs | #10 |
| 15 | Deferred revenue report | 1 new endpoint | New component | #4 |
| 16 | Lead capture form | 1 new endpoint | New public component | #4 |
| 17 | Sidebar nav (FEATURE-04) | - | main-layout | #6 |
| 18 | Prep list (daily aggregate) | 1 new endpoint | New component + route | #7, #13, #28 |
| 19 | Activity timeline | Prisma + auto-logging | In job detail | #6 |
| 20 | Clone/repeat job | 1 new endpoint | In job detail | #6 |
| 21 | Calendar improvements | - | Calendar component | #5, #6 |
| 22 | Dashboard empty state | - | Dashboard component | #5 |
| 23 | Transactional email (Resend) | Email service | - | #9, #10 |
| 24 | Payment reminder cron | Cron job | - | #8, #23 |
| 25 | Client history view | 1 new endpoint | Customers component | #4 |
| 26 | Search + bulk actions | - | Dashboard component | #5 |
| 27 | PDF export for invoices | - | Invoice + BEO components | #10, #12 |
| 28 | Dietary / allergen tracking | Prisma + routes | Event form + job detail + BEO | #4 |
| 29 | Service charges, gratuity, tax | Prisma + routes | Job detail + invoice + proposal | #10 |
| 30 | Guest portal | 1 new endpoint | New public component | #9, #10, #11, #19 |
| 31 | Tasting session scheduling | Prisma + routes | Job detail + calendar | #6 |
| 32 | Delivery logistics | Prisma + routes | Job detail + BEO | #6, #12 |
