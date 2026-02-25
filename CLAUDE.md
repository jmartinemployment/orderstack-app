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

## Playwright Dashboard Testing

Comprehensive browser-based testing using the Playwright skill at `.claude/skills/playwright-skill/`.

### How to Run

```bash
# 1. Ensure dev server is running
ng serve

# 2. Execute the dashboard audit
cd .claude/skills/playwright-skill
node run.js /tmp/playwright-test-dashboard-audit.js
```

**Test script:** `/tmp/playwright-test-dashboard-audit.js`
**Screenshots:** `/tmp/os-dashboard-audit/`
**JSON report:** `/tmp/os-dashboard-audit/report.json`

### What the Audit Tests

The audit logs in as `owner@taipa.com`, creates seed data if needed, then navigates every authenticated route checking for:

| Check | What it catches |
|-------|----------------|
| Page load | Routes that redirect, error, or blank-render |
| API 404s/5xx | Frontend calling backend endpoints that don't exist |
| Stuck spinners | Loading states that never resolve |
| Error displays | `os-error-display` or `.alert-danger` visible on page |
| Accessibility | Buttons without text/aria-label, inputs without labels |
| Content state | Whether page shows data, empty state, or nothing |
| Settings tabs | Each control panel tab loads correctly |
| Interactive | Floor plan placement, scheduling tabs, menu CRUD buttons |

### Seed Data Strategy

The test creates seed data **via UI actions** (not direct API/DB) if the page is empty:

| Data | How created | Condition |
|------|-------------|-----------|
| Menu category | Click "+ Add Category", fill name, save | If 0 categories exist |
| Table | Click "+ Add Table", fill number + capacity | If 0 tables exist |
| Inventory item | Click "Add Item", fill name | If 0 inventory items |
| Customer | Click "Add Customer", fill name + email | If < 2 rows exist |
| Reservation | Open form, verify it works, cancel | Always (form test only) |

Existing data in the dev restaurant (`f2cfe8dd-...`) is NOT deleted or modified.

### Latest Audit Results (February 25, 2026)

**37 pages tested — 25 passed, 12 issues**

#### Passing Pages (25)

Home Dashboard, Pending Orders, Order History, POS Terminal, KDS Display, Floor Plan, Reservations, Menu Management, Combo Management, Command Center, Sales Dashboard, Menu Engineering, Reports, Staff Scheduling, Invoicing, Cash Drawer, AI Chat, Dynamic Pricing, Waste Tracker, Sentiment Dashboard, Settings (Hardware, AI Settings, Delivery), Retail POS, Retail Inventory

#### Issues Found (12)

| Page | Issue | Root Cause |
|------|-------|------------|
| Inventory Dashboard | 1 input without label/placeholder | Accessibility gap |
| Close of Day | 1 input without label/placeholder | Accessibility gap |
| Customers | Loading spinner stuck | Backend endpoint slow or timeout |
| Marketing | "Failed to load automations" | `/marketing/automations` returns 404 |
| Food Cost | 1 input without label/placeholder | Accessibility gap |
| Settings - Kitchen Orders | Tab not found | Tab key mismatch or not registered |
| Settings - Payments | 5 buttons without text/aria-label | Icon-only buttons need aria-label |
| Settings - Tip Management | 2 inputs without labels | Accessibility gap |
| Settings - Staff Mgmt | "Failed to load permission sets" | `/permission-sets` returns 404 |
| Settings - Account | Tab not found | Tab not registered in control panel |
| Retail Catalog | 2 buttons without aria-label + 1 input | Accessibility gaps |
| Retail Reports | "Failed to load retail sales report" | `/retail/reports/sales` returns 404 |

#### Verified Fixes

| Fix | Status |
|-----|--------|
| Floor plan drag/place (table-node class binding) | Working — 12 tables with colored status |
| AI Insights tab removed from Staff Scheduling | Confirmed removed |
| AI buttons removed from Menu Items | Confirmed removed |
| AI Order Approval defaults to disabled | Confirmed |

#### API 404s (Backend Endpoints Not Implemented)

These endpoints are called by the frontend but return 404 from the backend. Each needs to be implemented or the frontend needs 404-tolerant handling:

```
GET /devices/{id}              (13 device IDs)
GET /labor/commissions/rules
GET /labor/compliance/alerts
GET /labor/compliance/summary
GET /labor/payroll
GET /labor/pto/requests
GET /marketing/automations
GET /menu/schedules
GET /order-templates
GET /permission-sets
GET /referrals/config
GET /reports/saved             (already 404-tolerant)
GET /reports/schedules         (already 404-tolerant)
GET /retail/categories
GET /retail/inventory/alerts
GET /retail/inventory/stock
GET /retail/items
GET /retail/layaways
GET /retail/option-sets
GET /retail/quick-keys
GET /retail/receipt-template
GET /retail/reports/sales
GET /team-members
GET /timecard-edits
```

### Settings Tabs Status

| Tab | Status | Notes |
|-----|--------|-------|
| hardware | Empty | No devices registered |
| ai-settings | OK | API key + feature toggles render |
| kitchen-orders | NOT FOUND | Tab not registered in allTabs |
| online-pricing | OK | |
| catering-calendar | OK | |
| payments | OK | 5 icon buttons need aria-label |
| tip-management | OK | 2 inputs need labels |
| loyalty | OK | |
| delivery | OK | |
| gift-cards | OK | |
| staff | Empty | `/permission-sets` 404 |
| time-clock-config | NOT FOUND | Tab not registered in allTabs |
| account-billing | NOT FOUND | Tab not registered in allTabs |

### Writing New Playwright Tests

All scripts go in `/tmp/playwright-test-*.js`. Pattern:

```javascript
const { chromium } = require('playwright');

const TARGET_URL = 'http://localhost:4200';
const CREDENTIALS = { email: 'owner@taipa.com', password: 'owner123' };

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // Login
  await page.goto(`${TARGET_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    const overlay = document.querySelector('vite-error-overlay');
    if (overlay) overlay.remove();
  }).catch(() => {});
  await page.locator('input[type="email"]').first().fill(CREDENTIALS.email);
  await page.locator('input[type="password"]').first().fill(CREDENTIALS.password);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL('**/home', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(3000);

  // Handle restaurant selection if redirected
  if (page.url().includes('select-restaurant')) {
    await page.locator('.restaurant-card').first().click().catch(() => {});
    await page.waitForTimeout(3000);
  }

  // Your test logic here
  await page.goto(`${TARGET_URL}/floor-plan`);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/test-screenshot.png', fullPage: true });

  await browser.close();
})();
```

Execute: `cd .claude/skills/playwright-skill && node run.js /tmp/playwright-test-example.js`

*Last Updated: February 25, 2026*
