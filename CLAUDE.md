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

## Onboarding Wizard

The setup wizard flow is defined entirely in `src/app/features/onboarding/setup-wizard/setup-wizard.ts`. That file is the source of truth for:
- Step count and ordering (currently 9 steps food & drink, 7 steps other verticals)
- Business type → mode auto-detection mapping
- Hardware product recommendations, prices, and buy links
- Delivery provider configuration
- Plan tier and processor rate data

Do not duplicate wizard details in this file — read the source.

*Last Updated: February 25, 2026*
