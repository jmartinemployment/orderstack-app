# OrderStack — Standalone Angular SaaS Application

## Editing Rules

- Do NOT make incremental edits. When changing a file's structure, rewrite the entire file in one pass.
- DO NOT ADD OR REMOVE features or patterns not explicitly requested.
- Ask before making architectural and/or ANY decisions you do not fully understand (multi-step vs single page, which payment provider, etc).

## Project Overview

This is the **canonical OrderStack** restaurant management SaaS application — a standalone Angular 21 app. This is the active, correct project for all OrderStack development.

**Testing:** Vitest (`npm test`) — 184 tests across 6 test files covering retail ecommerce models, services, and components.

**Stack:** Angular 21, Bootstrap SCSS 5.3.8, Socket.io-client, Zoneless change detection
**Design Language:** Square-inspired (squareup.com) — clean, modern, professional UI
**Data Persistence:** Supabase direct from frontend for CRUD; Express backend for server-side logic only (auth, webhooks, integrations)

## Design Principle — MANDATORY

**Default to Square.** For every UI decision, user flow, and interaction pattern — research how Square handles it first. Do not invent, do not guess, do not overcomplicate. Square Restaurant POS is the benchmark. When a design question comes up (e.g., "how should floor plan setup work?", "what does the mode selection look like?"), the first action is to look up Square's approach, then build to match or improve on it. This is not optional.

## Routing Rules

- **No automatic redirects for unauthenticated users.** The root path (`/`) shows nothing for now — it will be populated later. The auth guard returns `false` — it does NOT redirect to `/login` or `/signup`. Users must navigate to `/login` themselves. Do not add wildcard redirects or auth guard redirects.

## Architecture

Single Angular 21 application with:
- **Standalone components** — no NgModules, no Angular Elements
- **Lazy-loaded routes** — each feature loads on demand via `loadComponent()`
- **Signal-based state** — all services use Angular signals
- **Zoneless** — `provideZonelessChangeDetection()` in `app.config.ts`
- **Path aliases** — `@models/*`, `@services/*`, `@shared/*`, `@environments/*`
- **Prefix** — all component selectors use `os-` prefix

## Project Structure

```
orderstack-app/
├── src/
│   ├── app/
│   │   ├── features/           # Feature components (lazy-loaded)
│   │   │   ├── ai-chat/
│   │   │   ├── analytics/      # command-center, menu-engineering, sales
│   │   │   ├── auth/           # login, restaurant-select, pos-login
│   │   │   ├── crm/
│   │   │   ├── food-cost/
│   │   │   ├── home/           # home-dashboard
│   │   │   ├── inventory/
│   │   │   ├── invoicing/
│   │   │   ├── kds/            # kds-display, order-card, status-badge
│   │   │   ├── kiosk/
│   │   │   ├── labor/
│   │   │   ├── marketing/
│   │   │   ├── menu-mgmt/      # category, item, combo, modifier management
│   │   │   ├── monitoring/
│   │   │   ├── multi-location/
│   │   │   ├── onboarding/     # setup-wizard
│   │   │   ├── online-ordering/
│   │   │   ├── orders/         # pending-orders, order-history, receipt-printer
│   │   │   ├── pos/            # server-pos-terminal, order-pad, cash-drawer, modals
│   │   │   ├── pricing/
│   │   │   ├── reports/        # close-of-day, report-builder, report-dashboard
│   │   │   ├── reservations/
│   │   │   ├── retail/         # catalog, retail-pos, inventory, ecommerce, fulfillment
│   │   │   ├── sentiment/
│   │   │   ├── settings/       # control-panel + child settings components
│   │   │   ├── sos/            # sos-terminal + child components
│   │   │   ├── staff/          # staff-portal
│   │   │   ├── table-mgmt/
│   │   │   ├── tip-mgmt/
│   │   │   ├── voice-ordering/
│   │   │   └── waste/
│   │   ├── guards/             # auth.guard.ts, onboarding.guard.ts
│   │   ├── interceptors/       # auth.interceptor.ts
│   │   ├── layouts/            # main-layout (sidebar), auth-layout (centered card)
│   │   ├── models/             # TypeScript model files
│   │   ├── services/           # Angular services + providers/
│   │   └── shared/             # loading-spinner, error-display, connection-status, utils
│   ├── environments/           # environment.ts, environment.prod.ts
│   └── styles.scss             # Square-inspired global styles
├── angular.json
├── tsconfig.json               # Path aliases configured
└── package.json
```

## Build & Deploy

```bash
# Development
ng serve

# Production build
ng build --configuration=production

# Output: dist/orderstack-app/browser/
```

**Commit conventions:** Never include `Co-Authored-By`, `Claude`, or `Anthropic` in commit messages. Use conventional commits (`feat:`, `fix:`, `refactor:`, etc.) with scope when relevant.

## API Configuration

- API URL: `https://get-order-stack-restaurant-backend.onrender.com/api`
- Socket URL: `https://get-order-stack-restaurant-backend.onrender.com`
- Development Restaurant ID: `f2cfe8dd-48f3-4596-ab1e-22a28b23ad38`
- Backend source: `/Users/jam/development/Get-Order-Stack-Restaurant-Backend`

## Login Credentials

| Email | Password | Role |
|-------|----------|------|
| `admin@orderstack.com` | `admin123` | super_admin |
| `owner@taipa.com` | `owner123` | owner |
| `manager@taipa.com` | `manager123` | manager |
| `staff@taipa.com` | `staff123` | staff |

## Payment Processing — Revenue Model

OrderStack earns revenue two ways:
1. **Platform fee** — percentage of every transaction (currently 2.6% + 10¢ free tier, varies by plan tier — see `config/platform-fees.ts`)
2. **Monthly subscription** — NOT YET IMPLEMENTED

### Stripe Connect (Destination Charges)

**How it works:** OrderStack is the Stripe platform. Merchants connect via Stripe Express (OAuth redirect — no manual API keys). When a customer pays, the charge hits OrderStack's Stripe account first, then auto-transfers to the merchant's connected account. The `application_fee_amount` stays in OrderStack's balance.

**Money flow:**
```
Customer → PaymentIntent on OrderStack platform account
  → transfer_data[destination] = merchant's connected account (they get paid)
  → application_fee_amount = OrderStack's fee (stays in platform balance)
  → Stripe processing fee deducted from OrderStack's portion
```

**Backend env vars required:**

| Variable | In render.yaml | Has value | Purpose |
|----------|---------------|-----------|---------|
| `STRIPE_SECRET_KEY` | Yes | **NO** | Platform API key — identifies OrderStack as fee collector |
| `STRIPE_WEBHOOK_SECRET` | Yes | **NO** | Verifies webhook event signatures |

**Stripe Dashboard setup required (not code):**
- Complete platform profile in Stripe Dashboard
- Customize Express account onboarding branding (name, color, icon)
- Platform country must be supported (US is supported)

**Code status:** Structurally correct. `stripe.service.ts` creates PaymentIntents with `application_fee_amount` + `transfer_data.destination`. `payment-connect.routes.ts` creates Express accounts and account links. Will work once `STRIPE_SECRET_KEY` is set.

**Docs:** https://docs.stripe.com/connect/destination-charges

### PayPal Commerce Platform (Partner Referrals)

**How it works:** OrderStack is a PayPal Partner. Merchants connect via PayPal Partner Referrals (OAuth redirect). When a customer pays via PayPal, the order includes `payee.merchant_id` (merchant gets paid) and `payment_instruction.platform_fees` (OrderStack gets paid).

**Backend env vars required:**

| Variable | In render.yaml | Has value | Purpose |
|----------|---------------|-----------|---------|
| `PAYPAL_CLIENT_ID` | **NO** | **NO** | OAuth2 authentication |
| `PAYPAL_CLIENT_SECRET` | **NO** | **NO** | OAuth2 authentication |
| `PAYPAL_PARTNER_ID` | **NO** | **NO** | Merchant integration status checks |
| `PAYPAL_MODE` | **NO** | **NO** | `sandbox` or `live` toggle |
| `PAYPAL_BN_CODE` | **Missing from code** | **NO** | Revenue attribution header (`PayPal-Partner-Attribution-Id`) |
| `PAYPAL_WEBHOOK_ID` | **NO** | **NO** | Webhook signature verification |

**PayPal account setup required (not code):**
- Apply to become a PayPal Commerce Platform partner (requires PayPal approval)
- Get BN Code (Attribution ID) from PayPal business settings
- Subscribe to `MERCHANT.ONBOARDING.COMPLETED` webhook in PayPal Dashboard

**Code has 3 bugs that will prevent fee collection:**

1. **Missing `PARTNER_FEE` feature in onboarding** — `payment-connect.routes.ts` line 203 requests `features: ['PAYMENT', 'REFUND']`. Per PayPal docs, `PARTNER_FEE` must be included for `platform_fees` to work on orders. Fix: change to `features: ['PAYMENT', 'REFUND', 'PARTNER_FEE']`.

2. **Missing `PayPal-Auth-Assertion` header** — `paypal.service.ts` line 130-135 creates orders on behalf of sellers but does not include the required `PayPal-Auth-Assertion` JWT header. This header encodes the platform's `client_id` + seller's `payer_id` and is required for all API calls made on behalf of a seller. Without it, `platform_fees` will fail.

3. **Missing `PayPal-Partner-Attribution-Id` header** — Same API calls lack the `PayPal-Partner-Attribution-Id` (BN Code) header. Without it, PayPal cannot attribute revenue to OrderStack.

**Docs:**
- Onboarding: https://developer.paypal.com/docs/multiparty/seller-onboarding/build-onboarding/
- Payments: https://developer.paypal.com/docs/multiparty/checkout/immediate-capture/
- Auth Assertion: https://developer.paypal.com/api/rest/requests/

### Backend files

- `payment-connect.routes.ts` — Stripe Connect + PayPal Partner Referrals onboarding (6 endpoints)
- `stripe.service.ts` — PaymentIntent creation with `application_fee_amount` + `transfer_data`
- `paypal.service.ts` — PayPal order creation with `payee` + `platform_fees`
- `config/platform-fees.ts` — fee calculation per plan tier (free: 2.6%+10¢, plus: 2.5%+10¢, premium: 2.4%+10¢)

### NOT YET IMPLEMENTED

- **Monthly subscription billing** — No code charges merchants monthly fees. Zero implementation exists. Stripe supports this via Connect + Billing with `customer_account` parameter.
- **Stripe publishable key (frontend)** — No Stripe Elements / checkout form exists. The POS and online ordering UIs don't process real payments yet. Will need `STRIPE_PUBLISHABLE_KEY` env var on frontend.
- **PayPal JS SDK (frontend)** — No PayPal checkout button integration exists.
- **Stripe `account.updated` webhook** — No endpoint listens for merchant onboarding completion events. Currently uses polling.

### Testing Note

The plan step in the setup wizard has a "Skip (testing only)" button that bypasses payment connection. This MUST be removed before production launch. Search for `TODO: Remove skip` in `setup-wizard.html` and `setup-wizard.ts`.

## Delivery Services — Third-Party Integrations

OrderStack has two distinct delivery integration types. Both store per-restaurant credentials (encrypted with AES-256-GCM in the database).

### DaaS (Delivery as a Service) — OrderStack dispatches drivers

OrderStack requests a driver from DoorDash Drive or Uber Direct to deliver a restaurant's order. The restaurant doesn't need their own DoorDash/Uber merchant account — they enter API credentials in Settings > Delivery.

**DoorDash Drive:**

| Credential | Our field name | DoorDash name | Purpose |
|------------|---------------|---------------|---------|
| `apiKey` | `doordashApiKeyEncrypted` | `developer_id` + `key_id` | JWT issuer + key ID |
| `signingSecret` | `doordashSigningSecretEncrypted` | `signing_secret` | Signs JWT tokens (HS256) |

How merchants get credentials: Create account at [DoorDash Developer Portal](https://developer.doordash.com), go to Credentials tab, click (+) to create access key. Sandbox is free; production requires DoorDash approval.

**Code has 1 bug:** `delivery.service.ts` line 63 sends `Bearer ${credentials.apiKey}` as a static token. DoorDash Drive requires a **JWT** signed with `signing_secret`, containing `developer_id` as `iss` claim and `key_id` as `kid` header, with `aud: "doordash"`. The current auth will fail on every API call. Fix: generate JWT per [DoorDash docs](https://developer.doordash.com/en-US/docs/drive/tutorials/get_started/).

**Uber Direct:**

| Credential | Our field name | Uber name | Purpose |
|------------|---------------|-----------|---------|
| `clientId` | `uberClientIdEncrypted` | `client_id` | OAuth2 app ID |
| `clientSecret` | `uberClientSecretEncrypted` | `client_secret` | OAuth2 app secret |
| `customerId` | `uberCustomerIdEncrypted` | `customer_id` | Uber Direct account ID |
| `webhookSigningKey` | `uberWebhookSigningKeyEncrypted` | webhook signing key | Verifies inbound webhooks |

How merchants get credentials: Create account at [Uber Direct Dashboard](https://direct.uber.com), go to Developer tab. Sandbox and production keys available.

Auth: OAuth2 client credentials grant (POST to `/oauth/v2/token` with `client_id` + `client_secret`) → access token.

**Backend env vars (platform-level):**

| Variable | In render.yaml | Purpose |
|----------|---------------|---------|
| `DELIVERY_CREDENTIALS_ENCRYPTION_KEY` | Yes | Encrypts/decrypts merchant DaaS credentials in DB |
| `DELIVERY_FREE_WRAPPING_KEY` | No | Alternative encryption key (fallback) |
| `DELIVERY_MANAGED_KMS_WRAPPING_KEY` | No | For "most secure" mode (optional) |

**Backend files:**
- `delivery.service.ts` — Quote, dispatch, cancel, status for DoorDash Drive + Uber Direct
- `delivery-credentials.service.ts` — Encrypted credential CRUD with security profiles + audit events
- `delivery.routes.ts` — REST endpoints for quotes, dispatch, credential management
- `services/provider-profile.service.ts` — Security profile management (free vs managed KMS)

### Marketplace — Third-party platforms send orders TO OrderStack

DoorDash Marketplace, Uber Eats, and Grubhub send orders to OrderStack via webhooks. The restaurant maintains their own account on each platform and configures OrderStack as their POS integration.

**Per-restaurant config (stored in DB):**

| Field | Purpose |
|-------|---------|
| `externalStoreId` | Restaurant's store ID on the third-party platform |
| `webhookSigningSecret` | Verifies inbound webhook signatures from the platform |
| `enabled` | Toggle integration on/off |

**Grubhub specifics:** Uses MAC-based authorization with `client_id`, `secret_key`, `issue_date`, and `partner_key`. Requires a partnership agreement with Grubhub — not self-service. Contact Grubhub directly.

**Backend files:**
- `marketplace.service.ts` — Inbound order creation, menu mapping, status sync jobs
- `marketplace.routes.ts` — Webhook endpoints for each provider, menu mappings CRUD

### NOT YET VERIFIED

- **DoorDash Drive API calls will fail** — JWT auth not implemented (see bug above)
- **Uber Direct API calls** — Not verified against live sandbox. Auth flow looks structurally correct but untested.
- **Grubhub marketplace webhooks** — No test data or sandbox available without partnership agreement
- **DoorDash/Uber Eats marketplace webhooks** — Endpoint signatures exist but untested with real webhook payloads

### Onboarding Wizard Delivery Step

The setup wizard (food_and_drink businesses only) collects delivery provider preferences at Step 6. This is informational only — it records which providers the merchant uses. Actual credential entry happens later in Settings > Delivery after onboarding.

## Onboarding Wizard

The setup wizard flow is defined entirely in `src/app/features/onboarding/setup-wizard/setup-wizard.ts`. That file is the source of truth for:
- Step count and ordering (currently 9 steps food & drink, 7 steps other verticals)
- Business type → mode auto-detection mapping
- Hardware product recommendations, prices, and buy links
- Delivery provider configuration
- Plan tier and processor rate data

Do not duplicate wizard details in this file — read the source.

## Playwright UI/UX Audit

Comprehensive browser-based testing using the Playwright skill at `.claude/skills/playwright-skill/`.

### How to Run

```bash
# 1. Ensure dev server is running
ng serve

# 2. Execute the full audit (49 pages, all tabs, per-page API error tracking)
cd .claude/skills/playwright-skill
node run.js /tmp/playwright-test-full-audit.js
```

**Test script:** `/tmp/playwright-test-full-audit.js`
**Screenshots:** `/tmp/os-audit/`

### What the Audit Tests

The audit logs in as `owner@taipa.com`, handles restaurant selection, then navigates every authenticated route checking:

| Check | What it catches |
|-------|----------------|
| Page load | Routes that redirect, error, or blank-render |
| **Per-page API 404s** | Frontend calling backend endpoints that don't exist — **reported per page, not just globally** |
| API 4xx/5xx | Non-auth client errors and server errors |
| Stuck spinners | Loading states that never resolve after 5s |
| Angular errors | `NG0` runtime errors visible in DOM |
| Accessibility | Buttons without text/aria-label, inputs without labels/placeholder |
| Broken images | `<img>` elements that failed to load |
| Tab navigation | Clicks every tab, captures API errors triggered per tab |
| Full-page screenshots | Every page and every tab saved to `/tmp/os-audit/` |

**Key improvement over previous audit:** API 404s are now tracked **per page and per tab**, so WARN/FAIL status reflects actual backend gaps — not just UI rendering.

### Latest Audit Results (February 25, 2026 — Session 3)

**49 pages tested: 13 PASS, 26 WARN, 4 FAIL, 0 ERROR, 6 REDIRECT**

#### Clean Pages (13 PASS)

Home Dashboard, Pending Orders, Menu Management, Combo Management, Menu Engineering, Invoicing, Cash Drawer, Monitoring, Voice Order, Waste Tracker, Sentiment, Retail Vendors, Multi-Location

#### FAIL Pages (4)

| Page | Issue | Root Cause |
|------|-------|------------|
| Command Center | Tab "Live" not found | Tab label/selector mismatch |
| Food Cost | Tab "Overview" not found | Tab label/selector mismatch |
| Staff Scheduling | Tab "Timecards" not found | Tab label/selector mismatch |
| Settings | Tabs "General", "Team", "Notifications" not found | Tab label/selector mismatch |

#### REDIRECT Pages (6)

| Page | Redirects to | Likely Cause |
|------|-------------|--------------|
| Report Builder (`/report-builder`) | `/home` | Guard or feature flag |
| Staff Portal (`/staff-portal`) | `/home` | Requires staff role |
| Kiosk (`/kiosk`) | `/home` | Requires kiosk mode |
| Online Ordering (`/online-ordering`) | `/home` | Guard or not implemented |
| Tip Management (`/tips`) | `/home` | Guard or not implemented |
| Pricing (`/pricing`) | `/home` | Guard or not implemented |

#### WARN Pages — API 404s by Category

**Device Registration (11 pages):** Every page that loads `PlatformService` hits `GET /devices/{uuid}` — returns 404 because the device UUID in localStorage doesn't exist in backend. Harmless but noisy. Affects: Order History, POS, Order Pad, KDS, SOS, Floor Plan, Reservations, Close of Day, Reports, AI Chat, Dynamic Pricing, Hardware Guide.

**Reservations (6 unique 404s):**
- `GET /reservations/recurring` — recurring reservations not implemented
- `GET /waitlist/virtual-config` — virtual waitlist config not implemented
- `GET /waitlist/sms-config` — SMS config not implemented
- `GET /waitlist/analytics` — waitlist analytics not implemented
- `GET /calendar/connection` — calendar integration not implemented
- `GET /events` — events not implemented

**Analytics & Reports (8 unique 404s):**
- `GET /analytics/team/sales` — team sales analytics
- `GET /analytics/conversion-funnel` — conversion funnel
- `GET /analytics/forecast/revenue` — revenue forecast
- `GET /analytics/forecast/demand` — demand forecast
- `GET /analytics/forecast/staffing` — staffing forecast
- `GET /reports/team-member-sales` — team member sales report
- `GET /reports/tax-service-charges` — tax report
- `GET /reports/schedules` + `GET /reports/saved` — saved/scheduled reports

**CRM & Marketing (5 unique 404s):**
- `GET /customers/feedback` — customer feedback
- `GET /customers/smart-groups` — smart groups
- `GET /customers/messages/threads` — messaging threads
- `GET /customers/messages/templates` — message templates
- `GET /marketing/automations` — marketing automations

**Labor (4 unique 404s):**
- `GET /labor/payroll` — payroll periods
- `GET /labor/commissions/rules` — commission rules
- `GET /labor/compliance/alerts` — compliance alerts
- `GET /labor/compliance/summary` — compliance summary

**Retail (12 unique 404s):**
- `GET /retail/items` (4x across pages) — retail items
- `GET /retail/option-sets` (2x) — option sets
- `GET /retail/categories` — retail categories
- `GET /retail/inventory/stock` — retail stock
- `GET /retail/inventory/alerts` — stock alerts
- `GET /retail/layaways` + `GET /retail/quick-keys` + `GET /retail/receipt-template` — POS config
- `GET /retail/return-policy` — return policy
- `GET /retail/reports/sales` — retail sales report
- `GET /retail/ecommerce/orders` (2x) — ecommerce orders (note: wrong path, missing `/restaurant/{id}` prefix)

**Other (5 unique 404s):**
- `GET /order-templates` — POS order templates
- `GET /inventory/unit-conversions` — unit conversions
- `GET /inventory/cycle-counts` — cycle counts
- `GET /referrals/config` — referral program config
- `GET /break-types` — time clock break types
- `GET /team-members` — team members (POS login page)
- `GET /delivery/analytics` — delivery analytics

#### Accessibility Warnings

| Page | Issue |
|------|-------|
| Order Pad | 1 button without text/aria-label |
| SOS Terminal | 1 button without text/aria-label |
| Inventory Dashboard | 1 form input without label |
| Close of Day | 1 form input without label |
| Food Cost | 1 form input without label |
| Retail Catalog | 2 buttons without aria-label + 1 input without label |
| Retail Variations | 1 button without aria-label |
| Customer Dashboard | Loading spinner stuck on Insights tab |

#### 404-Tolerant Services (Already Fixed)

All frontend services now handle 404 gracefully — they set empty data (`[]` or `null`) instead of showing error messages. Services fixed in this session:

- `labor.ts` — 7 methods (timecardEdits, ptoRequests, laborForecast, complianceAlerts, complianceSummary, payrollPeriods, commissionRules)
- `marketing.ts` — loadAutomations
- `staff-management.ts` — loadPermissionSets, loadTeamMembers
- `inventory.ts` — updateStock (404 + 400)
- `retail-catalog.ts` — loadItems, loadOptionSets, loadCategories
- `retail-inventory.ts` — loadStock, loadStockAlerts
- `retail-checkout.ts` — loadQuickKeys, loadLayaways
- `report.ts` — getRetailSalesReport

### Settings Tabs Status

| Tab | Found | Notes |
|-----|-------|-------|
| Hardware | Yes | Empty — no devices registered |
| Payment | Yes | Working |
| Online (Pricing) | Yes | Working |
| Delivery | Yes | Working |
| Loyalty | Yes | 404 on `/referrals/config` |
| Gift Cards | Yes | Working |
| Kitchen & Orders | Yes | Working |
| AI | Yes | Working |
| Time Clock | Yes | 404 on `/break-types` |
| Account & Billing | Yes | Working |
| General | **Not found** | Tab label mismatch in test selector |
| Team | **Not found** | Tab label mismatch in test selector |
| Notifications | **Not found** | Tab label mismatch in test selector |

Note: "Not found" for General, Team, Notifications likely means the tab button text doesn't match `has-text("General")` etc. — these tabs exist in code but may use different labels.

### Writing New Playwright Tests

All scripts go in `/tmp/playwright-test-*.js`. Pattern:

```javascript
const { chromium } = require('playwright');

const TARGET_URL = 'http://localhost:4200';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // Login
  await page.goto(`${TARGET_URL}/login`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.locator('input[formcontrolname="email"]').fill('owner@taipa.com');
  await page.locator('input[formcontrolname="password"]').fill('owner123');
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(4000);

  // Handle restaurant selection if redirected
  if (page.url().includes('/select-restaurant')) {
    await page.waitForTimeout(2000);
    const items = await page.locator('.restaurant-item').count();
    if (items > 0) {
      await page.locator('.restaurant-item').first().click();
      await page.waitForTimeout(3000);
    }
  }

  // Your test logic here
  await page.goto(`${TARGET_URL}/floor-plan`);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/test-screenshot.png', fullPage: true });

  await browser.close();
})();
```

Execute: `cd .claude/skills/playwright-skill && node run.js /tmp/playwright-test-example.js`

### Session Notes

**February 25, 2026 (Session 3):**
- Full comprehensive audit: 49 pages, 54 unique API 404s, 13 clean pages
- Enhanced test now tracks API errors per-page and per-tab (fixes prior issue where 404s were invisible)
- All frontend services now 404-tolerant (18+ methods across 7 service files)
- Settings tabs Kitchen & Orders, Time Clock, Account & Billing confirmed working
- 6 routes redirect to /home (kiosk, online-ordering, tips, pricing, staff-portal, report-builder)
- Retail ecommerce orders path bug: uses `/api/retail/ecommerce/orders` instead of `/api/restaurant/{id}/retail/ecommerce/orders`
- Next: fix tab selector mismatches (Command Center Live, Food Cost Overview, Scheduling Timecards, Settings General/Team/Notifications), fix retail ecommerce orders path, implement backend endpoints

*Last Updated: February 25, 2026 (Session 3)*
