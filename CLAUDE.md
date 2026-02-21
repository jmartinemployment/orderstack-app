# OrderStack — Standalone Angular SaaS Application

## Project Overview

This is the **OrderStack** restaurant management SaaS application — a standalone Angular 21 app deployed as a static site on Render. It replaces the previous Angular Elements + WordPress architecture.

**Deployment:** Static site on Render (git push → auto-deploy)
**Stack:** Angular 21, Bootstrap SCSS 5.3.8, Socket.io-client, Zoneless change detection
**Design Language:** Square-inspired (squareup.com) — clean, modern, professional UI

## Architecture

Single Angular 21 application with:
- **Standalone components** — no NgModules, no Angular Elements
- **Lazy-loaded routes** — each feature loads on demand via `loadComponent()`
- **Signal-based state** — all services use Angular signals
- **Zoneless** — `provideZonelessChangeDetection()` in `app.config.ts`
- **Path aliases** — `@models/*`, `@services/*`, `@shared/*`, `@environments/*`
- **Prefix** — all component selectors use `os-` prefix

### What Was Eliminated (vs old workspace)

| Removed | Replacement |
|---------|-------------|
| `@angular/elements` | Direct component routing |
| `createCustomElement()` + `customElements.define()` | Lazy-loaded routes |
| `CUSTOM_ELEMENTS_SCHEMA` | Full template type-checking |
| `:host { display: block }` workaround | Standard Angular rendering |
| `public-api.ts` barrel exports | Path aliases (`@models/*`, `@services/*`) |
| `outputHashing: "none"` | Content hashing for cache busting |
| WordPress PHP templates (29 files) | Render static site |
| `wp_enqueue_script_module()` | Standard Angular build |
| FTP deployment | Git push → Render auto-deploy |
| Hash routing (`withHashLocation()`) | Standard path routing |
| Multi-project workspace (library + elements) | Single app project |

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
│   │   │   ├── reports/        # close-of-day
│   │   │   ├── reservations/
│   │   │   ├── sentiment/
│   │   │   ├── settings/       # control-panel + 14 child settings components
│   │   │   ├── sos/            # sos-terminal + child components
│   │   │   ├── staff/          # staff-portal
│   │   │   ├── table-mgmt/
│   │   │   ├── tip-mgmt/
│   │   │   ├── voice-ordering/
│   │   │   └── waste/
│   │   ├── guards/             # auth.guard.ts, onboarding.guard.ts
│   │   ├── layouts/            # main-layout (sidebar), auth-layout (centered card)
│   │   ├── models/             # 35 TypeScript model files
│   │   ├── services/           # 33 Angular services + providers/
│   │   └── shared/             # loading-spinner, error-display, connection-status, utils
│   ├── environments/           # environment.ts, environment.prod.ts
│   └── styles.scss             # Square-inspired global styles
├── angular.json
├── tsconfig.json               # Path aliases configured
└── package.json
```

## Routes

### Public Routes (no auth)

| Path | Component | Notes |
|------|-----------|-------|
| `/login` | Login | Email/password auth |
| `/setup` | SetupWizard | Onboarding wizard |
| `/order/:restaurantSlug` | OnlineOrderPortal | Customer-facing ordering |
| `/kiosk/:restaurantSlug` | KioskTerminal | Self-service kiosk |
| `/staff` | StaffPortal | PIN-authenticated staff portal |

### Authenticated Routes (sidebar layout)

| Path | Component | Domain |
|------|-----------|--------|
| `/orders` | PendingOrders | Orders |
| `/order-history` | OrderHistory | Orders |
| `/order-pad` | OrderPad | Orders |
| `/pos` | ServerPosTerminal | POS |
| `/kds` | KdsDisplay | Kitchen |
| `/sos` | SosTerminal | Self-Order |
| `/floor-plan` | FloorPlan | Front of House |
| `/reservations` | ReservationManager | Front of House |
| `/menu` | MenuManagement | Menu |
| `/combos` | ComboManagement | Menu |
| `/inventory` | InventoryDashboard | Inventory |
| `/command-center` | CommandCenter | Analytics |
| `/sales` | SalesDashboard | Analytics |
| `/menu-engineering` | MenuEngineeringDashboard | Analytics |
| `/close-of-day` | CloseOfDay | Reports |
| `/customers` | CustomerDashboard | CRM |
| `/marketing` | CampaignBuilder | Marketing |
| `/food-cost` | FoodCostDashboard | Operations |
| `/scheduling` | StaffScheduling | Operations |
| `/invoicing` | InvoiceManager | Operations |
| `/cash-drawer` | CashDrawer | Operations |
| `/monitoring` | MonitoringAgent | Operations |
| `/ai-chat` | ChatAssistant | AI Tools |
| `/voice-order` | VoiceOrder | AI Tools |
| `/dynamic-pricing` | DynamicPricing | AI Tools |
| `/waste-tracker` | WasteTracker | AI Tools |
| `/sentiment` | SentimentDashboard | AI Tools |
| `/multi-location` | MultiLocationDashboard | Admin |
| `/settings` | ControlPanel | Admin (10 tabs) |

## Build & Deploy

```bash
# Development
ng serve

# Production build
ng build --configuration=production

# Output: dist/orderstack-app/browser/
```

### Render Static Site Configuration

- **Build command:** `ng build --configuration=production`
- **Publish directory:** `dist/orderstack-app/browser`
- **Rewrite rule:** `/* → /index.html` (SPA fallback)
- **Environment:** `NODE_VERSION=20`

## API Configuration

- API URL: `https://get-order-stack-restaurant-backend.onrender.com/api`
- Socket URL: `https://get-order-stack-restaurant-backend.onrender.com`
- Development Restaurant ID: `f2cfe8dd-48f3-4596-ab1e-22a28b23ad38`

## Login Credentials

| Email | Password | Role |
|-------|----------|------|
| `admin@orderstack.com` | `admin123` | super_admin |
| `owner@taipa.com` | `owner123` | owner |
| `manager@taipa.com` | `manager123` | manager |
| `staff@taipa.com` | `staff123` | staff |

## Related Projects

| Project | Location | Purpose |
|---------|----------|---------|
| OrderStack Backend | `/Users/jam/development/Get-Order-Stack-Restaurant-Backend` | Express API backend |
| Old Frontend (reference) | `/Users/jam/development/Get-Order-Stack-Restaurant-Frontend-Workspace` | Legacy Angular Elements workspace |

### Session Notes

**[February 21, 2026] (Session 1):**
- Created standalone Angular 21 app at `/Users/jam/development/orderstack-app/`
- Migrated all 35 models, 33 services, 5 providers, 2 environments from old workspace
- Migrated all 68 feature components across 30 feature domains
- Applied mechanical transformations: selector prefix `os-`, import path aliases, removed `:host { display: block }`, removed `CUSTOM_ELEMENTS_SCHEMA`
- Created app shell: main-layout (sidebar navigation), auth-layout (centered card), auth guard, routes
- Created Square-inspired global styles (CSS variables, cards, tables, tabs, badges, modals, forms)
- Created MenuManagement wrapper component (combines category + item + modifier management)
- Build: zero errors, 98 KB initial bundle + 65 lazy chunks, 2.7 MB total
- Next: deploy to Render, create WordPress redirect, test end-to-end

*Last Updated: February 21, 2026 (Session 1)*
