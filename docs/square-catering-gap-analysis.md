# Square Catering Research — Feature Gap Analysis

## Context

OrderStack has a Phase 1 catering module (event CRUD, status workflow, calendar, capacity settings). The user researched Square's catering features and provided a detailed breakdown. This plan captures the gap between what OrderStack has today and what Square offers, to inform Phase 2+ development.

## What OrderStack Has Today (Phase 1)

- Event CRUD with status workflow: inquiry -> proposal_sent -> confirmed -> completed -> cancelled
- Calendar month view with event dot indicators
- Capacity settings (max events/day, max headcount/day, conflict alerts)
- Event cards with quick-action buttons (advance status, edit, cancel)
- Event form: title, type, date/time, headcount, location, contact info, notes
- Backend: 7 REST endpoints, Prisma models, Zod validation

## What Square Has That We Don't

### Tier 1 — High-Value Gaps (core catering workflow)

| Feature | Square | OrderStack |
|---------|--------|------------|
| Invoicing from events | Create invoices with line items from menu | No invoicing at all |
| Deposit requests | Request upfront deposits (e.g. 50%) | Not implemented |
| Milestone payments | Up to 12 milestone payment schedules | Not implemented |
| Proposals/estimates | Send digital proposals clients can approve | Status says "proposal_sent" but no actual document |
| Contracts/waivers | Attach to invoices for digital signatures | Not implemented |
| Deferred sales tracking | Revenue recognized on fulfillment, not payment | Not implemented |
| Multi-package estimates | Offer Silver/Gold/Platinum tiers in one estimate | Not implemented |

### Tier 2 — Operational Gaps

| Feature | Square | OrderStack |
|---------|--------|------------|
| Dedicated catering menu | Separate menu for trays/per-person pricing | Uses same menu as POS |
| KDS routing by fulfillment date | Catering orders route to KDS on event day, not order day | No KDS integration |
| Mobile on-site payments | Process final payments at the event venue | No mobile payment flow |
| Project/lead tracking dashboard | Central dashboard with job lifecycle view | Dashboard exists but no financial/lead tracking |

### Tier 3 — Already Comparable or Ahead

| Feature | Square | OrderStack |
|---------|--------|------------|
| Event lifecycle management | Basic project tracking | Full status workflow with calendar |
| Capacity/conflict detection | Not offered | Built-in with configurable limits |
| Calendar view | Not offered as standalone | Monthly calendar with event indicators |

## Recommended Phase 2 Priority Order

1. **Proposals** — Generate a proposal document from an event (menu items, per-person pricing, total). Client-facing link to approve/decline. This makes "proposal_sent" status meaningful.
2. **Invoicing** — Create an invoice from a confirmed event. Line items from menu. Track paid/unpaid/overdue.
3. **Deposits & milestone payments** — Request deposit on invoice creation. Split remaining balance into milestones with due dates.
4. **Catering menu** — Separate menu catalog for catering items (trays, per-person pricing, package deals).
5. **Multi-package estimates** — Offer 2-3 package tiers in one proposal.
6. **KDS integration** — Route catering prep tickets to KDS based on event date.
7. **Deferred sales tracking** — Report revenue on fulfillment date, not payment date.
8. **Contracts/waivers** — Attach documents to proposals for digital signature.

## Square Feature Deep Dives

### Milestone Payment Schedules (Square Invoices Plus — $20/mo)

Square lets caterers split an event's total into up to 12 milestone payments:

- **Deposit toggle** — First milestone can be marked as a deposit (percentage or flat amount)
- **Milestone configuration** — Each milestone has: title, amount (% or $), due date, optional description
- **Auto-reminders** — Square sends automatic payment reminders before each milestone's due date
- **Client experience** — Client receives a single invoice link; each milestone appears as a line with its due date and pay button
- **Tracking** — Dashboard shows paid/unpaid milestones per event, overall collection progress
- **Requires** Square Invoices Plus subscription ($20/mo add-on to Square for Restaurants)

**OrderStack implication:** Our invoicing system should support milestone schedules from day one. Charging extra for this (like Square does) is a potential monetization lever — could be a "Plus" plan feature.

### Invoice Branding Customization

Square offers three invoice layout styles with brand customization:

| Setting | Options |
|---------|---------|
| Logo | Upload custom logo, displayed on invoice header |
| Brand color | Hex color picker, applied to accent elements |
| Layout style | **Original** (classic), **Modern** (clean/minimal), **Classic** (traditional) |
| Custom message | Free-text area for catering-specific terms, notes, or thank-you message |
| Terms & conditions | Separate field appended to invoice footer |

**OrderStack implication:** Support at minimum: logo upload, brand color, and a custom message/terms field. Layout templates are a nice-to-have for Phase 3+.

### QuickBooks Online Integration (Square Connector)

Square integrates with QuickBooks Online for accounting sync:

- **Square Connector** — Official integration app in QuickBooks marketplace
- **Location selection** — Choose which Square locations sync to QuickBooks
- **Account mapping** — Map Square transaction types to QuickBooks chart of accounts (e.g., catering revenue -> "Catering Income" account)
- **Transaction review** — Imported transactions appear in QuickBooks "For Review" queue before posting
- **Sync frequency** — Daily automatic sync with manual sync option
- **Data synced** — Sales totals, refunds, fees, tips, taxes (not individual line items)

**OrderStack implication:** Not a Phase 2 priority, but worth designing the data model so catering revenue is tagged/categorized in a way that makes future accounting integrations straightforward (e.g., `revenue_category: 'catering'` on transactions).

### Fee Reconciliation in QuickBooks

Square's processing fees flow into QuickBooks as:

- **Fee mapping** — Square fees map to a QuickBooks expense account (e.g., "Payment Processing Fees")
- **Net deposits** — QuickBooks sees the net deposit amount (gross - fees) matching bank deposits
- **Transaction reconciliation** — Each Square payout maps to a bank deposit for easy reconciliation
- **Manual fallback** — If connector fails, Square provides downloadable CSV reports for manual QuickBooks entry

**OrderStack implication:** When we build invoicing + payments, store gross amount, fee amount, and net amount separately on every transaction. This makes accounting integration trivial later.

## Key Takeaways for OrderStack Architecture

1. **Store financials granularly** — Every payment record needs: gross, platform_fee, processing_fee, net. Don't calculate these on the fly.
2. **Tag revenue by source** — `revenue_category` field on transactions (catering, dine-in, online, retail) enables future accounting integrations.
3. **Milestone payments are table stakes** — Square charges $20/mo extra for this. We should include it in our base offering as a competitive advantage, or use it as a plan tier differentiator.
4. **Invoice branding is expected** — Caterers send client-facing documents. Logo + brand color + custom terms are minimum viable.
5. **Accounting integration can wait** — But the data model should be "accounting-ready" from the start.

## No Code Changes in This Plan

This is a research/analysis deliverable only. Implementation plans for each phase will be created separately when the user is ready to build.

## Sources

- [Square Catering Software](https://squareup.com/us/en/restaurants/caterers)
- [Catering with Square for Restaurants](https://squareup.com/help/us/en/article/6638-catering-with-square-for-restaurants)
- [Square Invoice Deposits](https://squareup.com/help/us/en/article/6581-request-deposits-with-square-invoices)
- [Square Capabilities](https://squareup.com/us/en/restaurants/capabilities)
- [Square Restaurant Pricing](https://squareup.com/us/en/point-of-sale/restaurants/pricing)
