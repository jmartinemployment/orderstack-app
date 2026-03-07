# Catering

## Purpose
Complete catering event management module. Manages the full lifecycle
from inquiry through event completion with financial tracking, proposals,
BEOs, prep lists, and client-facing portals.

## API Base
GET/POST /api/merchant/:id/catering/events
PATCH/DELETE /api/merchant/:id/catering/events/:eventId
PATCH /api/merchant/:id/catering/events/:eventId/milestones/:milestoneId/pay
POST /api/merchant/:id/catering/events/:eventId/clone
POST /api/merchant/:id/catering/events/:eventId/proposal
POST /api/merchant/:id/catering/events/:eventId/contract
GET /api/merchant/:id/catering/events/:eventId/activity
GET /api/merchant/:id/catering/clients
GET /api/merchant/:id/catering/prep-list?date=YYYY-MM-DD
GET /api/merchant/:id/reports/catering/deferred
GET /api/merchant/:id/reports/catering/performance
GET/PUT /api/merchant/:id/catering/capacity

### Public (no auth)
GET /api/catering/proposal/:token
POST /api/catering/proposal/:token/approve
GET /api/catering/portal/:token
POST /api/catering/lead/:merchantSlug

## Routes
- /app/catering — CateringDashboard (5 tabs + KPIs + search + bulk actions)
- /app/catering/job/:id — CateringJobDetail (central hub)
- /app/catering/job/:id/beo — CateringBeo (print-optimized)
- /app/catering/reports — CateringReports (deferred revenue + performance)
- /app/catering/prep-list — CateringPrepList (daily aggregate)
- /catering/proposal/:token — CateringProposal (public, no auth)
- /catering/portal/:token — CateringGuestPortal (public, no auth)
- /catering/inquiry/:merchantSlug — CateringLeadForm (public, no auth)

## Components
- CateringDashboard (os-catering-dashboard) — KPI cards, next event banner, status filter, search, bulk actions, empty state onboarding
- CateringEventCard (os-catering-event-card) — financial summary, payment progress bar, company name
- CateringEventForm (os-catering-event-form) — create/edit slide-out panel with company name
- CateringCalendar (os-catering-calendar) — mini job chips with status colors, click-to-navigate
- CateringJobDetail (os-catering-job-detail) — 7 sections: overview, packages, milestones, dietary, delivery, tastings, activity
- CateringProposal (os-catering-proposal) — public proposal page with package comparison
- CateringBeo (os-catering-beo) — print-optimized Banquet Event Order
- CateringReports (os-catering-reports) — deferred revenue table + performance KPIs
- CateringPrepList (os-catering-prep-list) — daily aggregate prep list with date picker
- CateringLeadForm (os-catering-lead-form) — public inquiry form by merchant slug
- CateringGuestPortal (os-catering-guest-portal) — unified client portal

## Service
CateringService — HttpClient-based, signal state, pipeline metrics

### Key methods
- loadJobs, getJob, createJob, updateJob, deleteJob
- markMilestonePaid, cloneJob, generateProposal, uploadContract
- loadActivity, loadClients, loadPrepList
- loadDeferredRevenue, loadPerformanceReport, bulkUpdateStatus
- getProposal, approveProposal, getPortal, submitLead (public, no auth)

### Sidebar signals
- pendingJobsCount — jobs with status 'inquiry'
- proposalsAwaitingApproval — jobs with status 'proposal_sent'
- milestonesComingDue — milestones due within 7 days and unpaid

## Model
CateringJob — full financial model with packages, milestones, invoicing, dietary, tastings, delivery
DietaryRequirements — structured allergen/dietary counts
CateringTasting — scheduled tastings with notes and outcomes
DeliveryDetails — driver, times, equipment checklist, route notes
CateringActivity — audit trail entries
CateringClientHistory — per-client job count, revenue, repeat rate
CateringPerformanceReport — KPIs and breakdowns
CateringPrepList — daily aggregate with per-job breakdown
Backward compat aliases: CateringEvent = CateringJob

## Fee calculation
subtotalCents (package price * headcount)
+ serviceChargeCents (subtotalCents * serviceChargePercent / 100)
+ taxCents (subtotalCents * taxPercent / 100)
+ gratuityCents (subtotalCents * gratuityPercent / 100)
= totalCents

## Sidebar visibility
Catering mode gets a completely different sidebar nav (buildCateringNav):
Administration, Jobs & Calendar (badge: pending count), Invoices (badge: milestones due),
Prep Lists, Catering Menu, Clients, Reports, Staff/Scheduling, Marketing, Settings

## Status flow
inquiry -> proposal_sent -> contract_signed -> deposit_received -> in_progress -> final_payment -> completed
(cancelled from any state except completed)

## Remaining work
- #14: Invoice branding defaults — needs columns on Restaurant Prisma model
- #23: Transactional email — needs Resend email service (backend)
- #24: Payment reminder cron — needs daily cron job (depends on #23)

## Session Notes

**March 6, 2026 (Session 1):**
- Implemented all 32 items from FEATURE-05 plan (28 fully done, 4 partial/not done)
- Backend: Prisma schema with all financial/JSON fields, 22 endpoints, activity auto-logging
- Frontend: 10 new components, 40 files changed, 5856 insertions
- Backend commit: 8d46fc2, Frontend commit: 79464bb
- Both pushed to origin/main

**March 7, 2026 (Session 2):**
- Implemented #13: Catering menu pricing
- Backend: Added `cateringPricing` Json column to MenuItem Prisma model, pushed to Supabase
- Backend: POST/PATCH menu item handlers accept and persist cateringPricing, all transform functions include it
- Frontend: CateringPricingTier interface on MenuItem, cateringItems computed signal on MenuService
- Frontend: Collapsible catering pricing tier editor in item-management form (visible only in catering mode)
- Frontend: Package builder in catering-job-detail now has menu item picker with tier selection
- Frontend: Package cards show selected menu items with pricing
- Frontend: CateringPackage model extended with menuItems snapshot (name + pricingTier)
- Tests: 10 new Vitest tests (4 cateringItems filter, 6 item-management pricing tiers) — all pass
- Backend commit: 389ccb1, Frontend commit: 13b9443
- Both pushed to origin/main
