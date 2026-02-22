# OrderStack — Standalone Angular SaaS Application

## Editing Rules

- Do NOT make incremental edits. When changing a file's structure, rewrite the entire file in one pass.
- Do NOT add features or patterns not explicitly requested.
- Ask before making architectural decisions (multi-step vs single page, which payment provider, etc).

## Project Overview

This is the **OrderStack** restaurant management SaaS application — a standalone Angular 21 app. It replaces the previous Angular Elements + WordPress architecture.

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

### What Was Eliminated (vs old workspace)

| Removed | Replacement |
|---------|-------------|
| `@angular/elements` | Direct component routing |
| `createCustomElement()` + `customElements.define()` | Lazy-loaded routes |
| `CUSTOM_ELEMENTS_SCHEMA` | Full template type-checking |
| `:host { display: block }` workaround | Standard Angular rendering |
| `public-api.ts` barrel exports | Path aliases (`@models/*`, `@services/*`) |
| `outputHashing: "none"` | Content hashing for cache busting |
| WordPress PHP templates (29 files) | Standalone Angular app |
| `wp_enqueue_script_module()` | Standard Angular build |
| FTP deployment | Standard deployment |
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

**[February 21, 2026] (Session 2):**
- **Login flow fixed:** Rewrote login.scss from dark WordPress theme to Square-inspired light theme; replaced `output()` with `Router.navigate(['/setup'])`; added `withFetch()` to `provideHttpClient()`
- **Onboarding routing fixed:** Login navigates to `/setup` (not `/select-restaurant`); `/setup` secured with `authGuard`; `/select-restaurant` moved outside `MainLayoutComponent` (no sidebar during onboarding)
- **Setup wizard (11 steps, matching Square's onboarding flow):**
  1. Welcome + Business Name
  2. Verticals ("What do you sell at [Business Name]?")
  3. Primary Vertical ("What's your primary focus?") — requires explicit selection
  4. Complexity ("How do you plan to use OrderStack?")
  5. Recommended Mode ("Here's your ideal setup") + "Select another mode" card grid grouped by "Based on what you sell" / "Other options"
  6. Tax & Locale
  7. Business Hours
  8. Payment
  9. Menu
  10. Owner PIN
  11. Review & Confirm
- **Address step removed:** Business address is collected during SaaS subscription signup, before login credentials are issued. Not needed in onboarding wizard. Address data still exists in the model and payload for the platform service to populate from the subscription record.
- **Mode recommendation system:** `recommendedMode` computed auto-selects best mode based on verticals + complexity (Food & Drink → Full Service; payments_only → Quick Service). "Select another mode" shows all modes in card grid grouped by relevance.
- **Model updates:** Added `highlights: string[]` to `DevicePosModeConfig` for mode feature bullets; renamed "Grocery & Gourmet" → "Grocery / Gourmet / Alcohol"
- **Hidden for now:** All verticals except Food & Drink; Retail and Services modes — ready to enable later
- **Square reference:** Mode documentation at https://squareup.com/help/us/en/article/8114-create-and-manage-device-profiles — modes are customizable device profiles with checkout, security, and add-on settings
- **Files modified:** `login.ts`, `login.html`, `login.scss`, `app.config.ts`, `app.routes.ts`, `setup-wizard.ts`, `setup-wizard.html`, `setup-wizard.scss`, `platform.model.ts`
- **Pending:** Fix restaurant-select (Router navigation), fix setup wizard success screen navigation, continue testing wizard flow
- Next: Continue testing remaining wizard steps, style refinements

**[February 21, 2026] (Session 3) — GOS-SPEC-02: POS Device Setup & Hardware Management:**
- **New: `models/device.model.ts`** — All hardware types: `Device`, `DeviceHardwareInfo`, `DeviceFormData`, `DeviceMode`, `DeviceModeSettings`, `DeviceModeFormData`, `PrinterProfile`, `PrintRoutingRule`, `PrinterProfileFormData`, `PeripheralDevice`, `PeripheralType`, `PeripheralConnectionType`, `KioskProfile`, `KioskProfileFormData`, `DeviceHubTab`, `PrintJobType`, plus `defaultModeSettings()` and `defaultModeSettingsForPosMode()` factories
- **New: `services/device.ts`** — `DeviceService` with ~25 CRUD methods for devices, modes, printer profiles, peripherals, kiosk profiles. Signals + computeds: `activeDevices`, `pendingDevices`, `isCurrentDevicePaired`, `currentDevicePosMode`, `currentDeviceMode`, `defaultPrinterProfile`. API-first with localStorage fallback pattern (matches existing services)
- **New: `resolvers/device-init.resolver.ts`** — Functional resolver that runs on MainLayout load: calls `deviceService.resolveCurrentDevice()`, then sets platform mode from device's `posMode`
- **New: `guards/device-mode.guard.ts`** — `deviceModeRedirectGuard` replaces static `redirectTo: 'orders'`. Routes: unpaired → `/device-setup`, full_service → `/floor-plan`, quick_service → `/order-pad`, bar → `/pos`, bookings → `/reservations`, services → `/invoicing`, default → `/orders`
- **New: `features/onboarding/device-setup/`** — Square-inspired pairing screen with 5-character code input, "Skip for now" option, auto-detect hardware info, success animation
- **New: `features/settings/device-hub/`** — Unified hardware management with 5 sub-tabs (Devices, Modes, Printer Profiles, Peripherals, Kiosk Profiles). Imports existing `PrinterSettings` and `StationSettings` as children. Mode editor has 4 collapsible sections (checkout, receipt, security, display). Printer profile routing matrix. Kiosk Profiles tab conditionally visible for food_and_drink/retail verticals
- **Modified: `services/platform.ts`** — Added `setDeviceModeFromDevice(posMode, overrides?)` method
- **Modified: `app.routes.ts`** — Added `/device-setup` route (auth-protected, outside MainLayout), `deviceInitResolver` on MainLayout, replaced `redirectTo: 'orders'` with `deviceModeRedirectGuard`
- **Modified: `layouts/main-layout.component.ts`** — Mode-aware sidebar: `filteredNavItems` computed filters by `requiredModule` and `requiredFlag` from `PlatformService.featureFlags()`. Floor Plan requires `enableFloorPlan`, KDS requires `enableKds`, Menu requires `menu_management`, etc.
- **Modified: `models/settings.model.ts`** — `ControlPanelTab` consolidated: removed `'printers'`, `'stations'`, `'devices'`, added `'hardware'` (13 → 11 values)
- **Modified: `features/settings/control-panel/`** — Replaced 3 separate tab imports (PrinterSettings, StationSettings, DeviceManagement) with single DeviceHub import. Default tab changed to `'hardware'`
- **Modified: `models/restaurant.model.ts`** — Renamed `Device` → `LegacyDevice` to resolve naming conflict with new `Device` interface in `device.model.ts`
- **Modified: `models/index.ts`** — Added `export * from './device.model'`
- **Build: zero errors** — Production build passes clean
- Next: Test device pairing flow end-to-end, implement device code generation with backend API, wire up mode settings to POS components (ServerPosTerminal, OrderPad, KioskTerminal)

**[February 21, 2026] (Session 4) — End-to-End Flow Testing & Fixes:**
- **Tested full flow:** Login → Setup Wizard → Device Setup → PIN → Landing. Found and fixed 8+ issues:
- **Fix: Setup wizard step 11 (Owner Account)** — Continue button stuck disabled. Root cause: `<form>` wrapper triggered Angular's NgForm requiring `name` attributes on `ngModel` inputs. Fixed by removing the `<form>` wrapper.
- **Fix: `goToDashboard()` in setup-wizard** — Changed from `router.navigate(['/orders'])` to `router.navigate(['/'])` so `deviceModeRedirectGuard` intercepts correctly.
- **Fix: `onboardingGuard` not wired** — Added to MainLayout's `canActivate: [authGuard, onboardingGuard]`. Also added localStorage fallback (`onboarding-result`) so guard doesn't redirect after page refresh.
- **Fix: `completeOnboarding()` not populating merchantProfile** — Added `buildProfileFromPayload()` method to PlatformService. Onboarding guard would redirect back to `/setup` without this.
- **Fix: `deviceInitResolver` missing merchantProfile load** — Added `platformService.loadMerchantProfile()` in parallel with `deviceService.resolveCurrentDevice()`.
- **Fix: Redundant API calls** — Added early-return guards to `resolveCurrentDevice()` and `loadMerchantProfile()` when data already loaded.
- **Fix: Device-setup UX** — Flipped layout: "Get Started" (skip pairing) is now the primary CTA. Pairing code moved to secondary position below divider. Fixed chicken-and-egg messaging about getting pairing code from dashboard.
- **Major: Embedded PIN login into device-setup** — Eliminated separate `/pos-login` route (routing wasn't working despite clean build). Rewrote device-setup as multi-phase component with 4 phases:
  1. `device` — Get Started button + optional pairing code entry
  2. `pin` — "Who's Working?" avatar grid (Square-style) showing owner from onboarding localStorage
  3. `pin-entry` — PIN keypad with dots, shake animation on error, 5-attempt lockout
  4. `success` — Checkmark animation → auto-navigate to mode-appropriate landing
- **Modified: `pos-login.ts`** — Added standalone:true, Router/DeviceService/PlatformService injection, owner seeding from localStorage, local PIN validation, navigateToLanding(). (These changes remain but are unused since device-setup now handles PIN internally)
- **Files modified:** `setup-wizard.ts`, `setup-wizard.html`, `app.routes.ts`, `guards/onboarding.guard.ts`, `resolvers/device-init.resolver.ts`, `services/platform.ts`, `services/device.ts`, `pos-login.ts`
- **Files rewritten:** `device-setup.ts`, `device-setup.html`, `device-setup.scss` (all three fully rewritten for 4-phase flow with embedded PIN)
- **Build: zero errors**
- Next: Style remaining feature pages to Square light theme, wire up mode settings to POS components

**[February 22, 2026] (Session 5) — Flow Testing, PIN Screen, Table Management Restyle:**
- **Flow working end-to-end:** Login → Setup Wizard → "Let's Go" → POS Login (PIN screen) → Floor Plan
- **Fix: `inject()` in method body** — `DeviceService` was injected inside `goToDashboard()` method (NG0203 error). Moved to class field.
- **Fix: Setup wizard `goToDashboard()`** — Now calls `deviceService.skipDeviceSetup()` + `platformService.setDeviceModeFromDevice()` directly, then navigates to `/pos-login`. Eliminated the device-setup intermediate screen for first-time onboarding.
- **Fix: PIN length mismatch** — PosLogin hardcoded 4-digit passcode. Setup wizard allows 4-6 digits. Fixed `passcodeDots` and `onDigit()` to use `passcodeLength` computed from selected member's actual passcode length.
- **Restyled: PosLogin** — Rewrote `pos-login.scss` from dark POS terminal theme to Square-inspired light theme (white cards, `#006aff` blue, light gray background). Added OrderStack brand header to avatar grid screen.
- **Restyled: Floor Plan / Table Management** — Rewrote `floor-plan.scss` from old dark theme (`midnight-black`, `deep-lake`, purple accents) to Square light theme. All elements: KPI cards, canvas, table nodes, list view, detail panel, modals, forms.
- **Quick Service description updated** — Added "Ideal for counter service, food trucks, caterers, and ghost kitchens." to help steer non-table businesses to the right mode.
- **Table service simplified** — Removed all API calls (backend endpoints don't exist yet). CRUD operations work locally with localStorage persistence. Will connect to Supabase directly when ready.
- **Device resolver fixed** — Checks `device_skipped` localStorage before making API calls. Eliminates 404 errors for local/skipped devices.
- **Square research completed** — Modes are siloed (can't combine), different devices can run different modes, features gated by plan tier + mode. Tableless businesses (caterers, food trucks) use Quick Service mode. Our wizard auto-recommendation is a competitive advantage over Square's manual template selection.
- **KEY DESIGN PRINCIPLE ESTABLISHED: Default to Square.** Every UI decision, flow, and interaction should mirror Square's approach first. Research Square before building. Don't invent, don't guess. This applies to all future work across the entire app.
- **Data persistence direction:** Use Supabase directly from frontend for CRUD. Express backend is for server-side logic only (auth, webhooks, integrations), not basic data operations.
- **Files modified:** `setup-wizard.ts`, `setup-wizard.html`, `pos-login.ts`, `pos-login.html`, `pos-login.scss`, `floor-plan.scss`, `floor-plan.html`, `platform.model.ts`, `services/device.ts`, `services/table.ts`
- **Build: zero errors**
- Next: Wire up mode settings to POS components (ServerPosTerminal, OrderPad, KioskTerminal). Device pairing flow with backend API.

**[February 22, 2026] (Session 6) — Status Updates & Mode Research:**
- **Table service Supabase connection confirmed done** — `services/table.ts` already fully wired to Supabase (all CRUD: load, create, update, updatePosition, updateStatus, delete). Session 5 notes were stale; the localStorage removal happened between sessions.
- **Mode combination question resolved (following Square):** Modes are per-device, not combined. A Quick Service restaurant that also needs bookings assigns a different mode to a separate device. Our `DeviceMode` model already supports this. No mode-mixing logic needed.
- **Square reference:** https://squareup.com/help/us/en/article/8458-use-modes-with-square-point-of-sale — "You cannot combine features from multiple modes into one. You must switch modes."
- **Removed "Before You Go..." winback modal** from cancel-subscription flow. Cancel flow is now: Reason → Follow-Up → Confirm (no retention offer).
- **Stale items cleaned up:** Restaurant-select routing works (guard chain intercepts `/` correctly). Table service Supabase wiring confirmed done. Mode combination resolved. These were carried across multiple sessions unnecessarily.
- **Audit of remaining work:**
  - **Mode-aware POS behavior (0%)** — ServerPosTerminal, OrderPad, KioskTerminal do NOT inject DeviceService or read `currentDevicePosMode()`. Feature flags exist in PlatformService (`enableFloorPlan`, `enableKds`, etc.) and MainLayout sidebar uses them, but POS components ignore them entirely. This is the primary outstanding item.
  - **Device pairing backend (90%)** — DeviceService is fully wired to API (`POST /devices/pair`, `GET /devices/{id}`, etc.) with localStorage fallback. Needs backend endpoint verification.
- **Segment 1 complete: Mode-aware ServerPosTerminal** — Injected PlatformService, added 5 convenience computeds (`canUseSeatAssignment`, `canUseSplitting`, `canUseTransfer`, `canUsePreAuthTabs`, `canUseOrderNumbers`), gated 8 template sections with `@if` blocks. Updated `createNewOrder()` for tableless mode. Fixed Bar mode preset: `enableSeatAssignment` set to `false` (bar customers don't use numbered seats). Playwright-tested in Full Service mode: Tables panel visible, seat bar visible, empty state text correct.
- **Segment 2 complete: Mode-aware OrderPad** — Injected PlatformService, exposed 3 flags (`canUseFloorPlan`, `canUseSeatAssignment`, `canUseOrderNumbers`). Gated 3 template sections: table pills (`@if canUseFloorPlan` with `@else` New Order button), seat selector (`@if canUseSeatAssignment`), order number badge (`@if canUseOrderNumbers`). Updated `createNewOrder()` for tableless mode, `onItemTap()` error message adapts per mode. Build: zero errors.
- **Plan COMPLETE:** `.claude/plans/mode-aware-pos-components.md` — both segments delivered and verified.
- **Files modified:** `services/platform.ts`, `models/platform.model.ts`, `features/pos/server-pos-terminal/server-pos-terminal.ts`, `features/pos/server-pos-terminal/server-pos-terminal.html`, `features/pos/order-pad/order-pad.ts`, `features/pos/order-pad/order-pad.html`
- Next: Style remaining feature pages to Square light theme. Verify device pairing backend endpoints exist.

**[February 22, 2026] (Session 7) — Device Management Backend + Frontend Stub Cleanup:**
- **Plan:** `.claude/plans/device-backend-stub-cleanup.md` — 5-segment plan, ALL COMPLETE
- **Segment 1 (Prisma schema):** Expanded `Device` model (removed `deviceId`/`isActive`, added `deviceCode`/`posMode`/`modeId`/`status`/`hardwareInfo`/`pairedAt`/`expiresAt`/`locationId`). Added 4 new models: `DeviceMode`, `PrinterProfile`, `PeripheralDevice`, `KioskProfile`. Added relations to `Restaurant`. Used `prisma db push --accept-data-loss` (migration history drift). Fixed `auth.middleware.ts` and `socket.service.ts` for new field names.
- **Segment 2 (Device routes + pairing):** Created `src/utils/device-code.ts` (5-char code generator). Rewrote `device.routes.ts` (7 endpoints with Zod validation). Created `device-pairing.routes.ts` (`POST /pair` unauthenticated, `GET /:id` authenticated). Updated `onboarding.routes.ts` to create browser device in transaction, return `deviceId` in response. Mounted in `app.ts`.
- **Segment 3 (New CRUD routes):** Created `device-mode.routes.ts` (DeviceMode CRUD with nested settings validation, default enforcement, delete protection), `printer-profile.routes.ts`, `peripheral.routes.ts`, `kiosk-profile.routes.ts`. Mounted all in `app.ts`. Fixed Zod `.default({})` TypeScript error with explicit default values.
- **Segment 4 (Frontend stub removal):**
  - **Removed:** `skipDeviceSetup()` from `DeviceService`, `device_skipped` localStorage read from `resolveCurrentDevice()`, fake `OnboardingResult` catch block from `PlatformService.completeOnboarding()`, `onboarding-result` localStorage fallback from `onboardingGuard`
  - **Added:** `registerBrowserDevice(posMode)` to `DeviceService` — calls `POST /devices/register-browser`, stores `device_id` in localStorage. `deviceId: string` to `OnboardingResult` interface. `device_id` localStorage storage on successful onboarding.
  - **Updated:** `setup-wizard.ts` `goToDashboard()` → calls `registerBrowserDevice()` instead of `skipDeviceSetup()`. `device-setup.ts` `getStarted()` → calls `registerBrowserDevice()` instead of `skipDeviceSetup()`.
- **Segment 5 (Integration hardening):** Verified device code expiration (15min create, rejected on pair), default mode enforcement, delete protection. Confirmed zero orphaned localStorage keys (`device_skipped`, `onboarding-result`, `local-onboarding`, `local-browser` all eliminated).
- **Backend files created (6):** `device-code.ts`, `device-pairing.routes.ts`, `device-mode.routes.ts`, `printer-profile.routes.ts`, `peripheral.routes.ts`, `kiosk-profile.routes.ts`
- **Backend files modified (5):** `prisma/schema.prisma`, `device.routes.ts` (full rewrite), `onboarding.routes.ts`, `app.ts`, `auth.middleware.ts`, `socket.service.ts`
- **Frontend files modified (5):** `services/device.ts`, `services/platform.ts`, `guards/onboarding.guard.ts`, `features/onboarding/setup-wizard/setup-wizard.ts`, `features/onboarding/device-setup/device-setup.ts`
- **Build: zero errors** — both backend (`tsc --noEmit`) and frontend (`ng build --configuration=production`)
- Next: Style remaining feature pages to Square light theme. End-to-end test with live backend.

*Last Updated: February 22, 2026 (Session 7)*
