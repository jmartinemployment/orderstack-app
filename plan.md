# Get-Order-Stack AI Feature Roadmap — Toast POS Competitor

> **This is the production roadmap for getorderstack.com.**

## Context

Get-Order-Stack is a restaurant operating system built to compete with Toast, Square, Clover POS. The **backend already has significant AI features built with Claude Sonnet 4** (cost estimation, menu engineering, sales insights, inventory predictions, order profit analysis). The frontend surfaces all four original tiers of features (T1–T4 complete) plus the majority of Tier 5 Toast POS parity features (Sessions 33-36). The system is deployed via WordPress at geekatyourspot.com with 18+ feature pages.

**Foundational Capabilities:** Dining Options (dine-in, takeout, curbside, delivery, catering) fully implemented with frontend workflows (Session 11) and production-ready backend validation via Zod (Session 12). Control Panel fully implemented with 10 tabs: Printers, AI Settings, Online Pricing, Catering Calendar, Payments, Tip Management, Loyalty, Delivery, Stations, Gift Cards. Course System UI, Expo Station, KDS Recall Ticket, Course Pacing (frontend + backend execution), Catering Approval Timeout, Offline Mode all complete (Sessions 13-17, 24-25). PayPal Zettle + Stripe payment integration complete (Sessions 18-19). Tip Pooling complete (Session 19). Loyalty Program complete full-stack (Session 20). Third-Party Delivery DaaS Phase 1 complete (Session 22). Multi-device KDS station routing complete (Session 32). Order throttling complete (Session 27). AI auto-fire course pacing optimization v1 complete (Session 26).

**Toast POS Parity (Sessions 33-40, ALL 10/10 COMPLETE):** Server POS Terminal with check management, modifiers, discounts, voids, comps, tabs with pre-auth (Session 33). Close-of-Day reports, Cash Drawer management, QR tableside ordering, Kiosk self-service, credit card surcharging (Session 34). Employee Scheduling + time clock, Waitlist management, Gift Card system (Session 35). Email/SMS Marketing campaigns, Invoicing with house accounts, Combo/bundle management (Session 36). Backend endpoints for gift cards (6 routes), invoices (10 routes), marketing (8 routes), combos (4 routes), and check management deployed to Render (Session 37). Order Pad + Staff Portal (Session 38). Food Cost Dashboard with vendor management + recipe costing (Session 39). Multi-Location Dashboard with group management, cross-location analytics, menu sync, settings propagation (Session 40).

This plan maps every AI integration opportunity across all restaurant operations domains, organized by implementation effort.

---

## Competitive Analysis: Technology Stacks

### Why Angular Elements / Web Components — Not React Native

Research into what the 8 major restaurant POS competitors actually use confirms that **React Native is unnecessary** for Get-Order-Stack's use case. The system is a web-based ordering platform embedded in WordPress via Angular Elements — exactly the scenario where web technologies excel.

### Competitor Tech Stacks (February 2026)

| Competitor | Core Platform | Mobile Tech | KDS | Customer Ordering |
|---|---|---|---|---|
| **Toast** | Android-native (custom OS) | Native Android | Android tablets | Web-based |
| **Square** | Hybrid iOS/Android | Native apps | Android + iPad | Web + native apps |
| **Clover** | Android-native (custom OS) | Native Android + REST API | Android | Web apps via REST |
| **SpotOn** | Cloud-based | Native iOS/Android ("GoTo Place") | Included in plan | Web + app |
| **TouchBistro** | iOS-native (iPad only) | **Migrating to React Native** | iPad | Web-based |
| **Lightspeed** | iPad + cloud | Native iOS | **Any web browser** | Web-based |
| **ChowNow** | Web (**React**) | Branded native apps | N/A | React web |
| **Olo** | Enterprise SaaS | React-based | N/A | Web-based |

### Key Findings

1. **No major competitor uses Web Components** — this is a differentiation opportunity, not a weakness
2. **React Native is only used by TouchBistro** (migrating from native iOS) — and only for their staff-facing iPad POS, not customer ordering
3. **Customer-facing ordering is universally web-based** — Toast, Lightspeed, ChowNow, and Olo all use web technologies for customer ordering
4. **KDS splits between native (Toast, Square) and web (Lightspeed)** — Lightspeed proves browser-based KDS is viable
5. **React Native's advantage is hardware integration** — receipt printers (StarXpand SDK), NFC readers, Bluetooth peripherals, cash drawers — none of which apply to a web-first SaaS product

### When React Native Would Make Sense (Future, Not Now)

React Native becomes relevant only if Get-Order-Stack builds a **dedicated staff-facing POS app** requiring:
- **Bluetooth portable printer integration** for delivery drivers (StarXpand SDK for React Native with Star SM-L200) — in-restaurant receipt stations are fully handled by Star CloudPRNT from the backend, no React Native needed
- NFC card reader support
- Cash drawer triggers
- Offline-first with SQLite (no network = still processing orders)
- App Store distribution for branded restaurant apps

That's a separate product from the web-based Angular Elements platform and would be a Tier 5+ consideration. Note: receipt printing for in-restaurant use does **not** require React Native — see the Receipt Printing Architecture section below.

### Get-Order-Stack's Web Components Advantage

| Strength | Why It Matters |
|---|---|
| No app download required | Lower friction for customers vs. Toast's branded app |
| SEO-discoverable ordering pages | Web-based menus index in Google; native apps don't |
| Instant updates (no App Store review) | Deploy bug fixes in minutes, not days |
| Runs on any device with a browser | No Android/iOS lock-in like Toast (Android-only) or TouchBistro (iPad-only) |
| WordPress integration via `wp_enqueue_script_module()` | Proven multi-bundle scope isolation on production site |
| Single codebase for all platforms | vs. Toast maintaining separate Android codebases per product |

### Trade-off Matrix

| Approach | Dev Cost | Performance | Hardware Access | Offline | Maintenance |
|---|---|---|---|---|---|
| **Native (iOS/Android)** | Highest | Best | Full | Excellent | 2 codebases |
| **React Native** | Medium-High | Near-native | Excellent | Excellent | 1 codebase |
| **PWA / Web Components** | Lowest | Good | Limited | Good | 1 codebase |

**Verdict:** Angular Elements / Web Components is the correct architecture for a web-embedded restaurant ordering platform. The competitors that use React Native or native apps do so for hardware-integrated staff POS — a different product category entirely.

### Receipt Printing Architecture

A critical staff workflow — **Order Ready → Receipt Print → Deliver to Customer** — requires receipt printer integration. Research into browser-based printing APIs reveals that **the solution is entirely backend-driven**, reinforcing the Angular Elements architecture.

#### Browser Printing API Support Matrix

| Technology | Chrome | Safari/iPad | Firefox | How It Works | Verdict |
|---|---|---|---|---|---|
| **Web Serial API** | Yes | No | No | Direct USB/serial connection | Chromium-only — unusable |
| **Web USB API** | Yes | No | No | USB device access from browser | Chromium-only — unusable |
| **Web Bluetooth API** | Yes | No | No | Bluetooth device access | Chromium-only — unusable |
| **Star CloudPRNT** | N/A | N/A | N/A | Printer polls cloud server | **Works on all devices** |
| **Epson ePOS SDK** | Yes | Yes | Yes | Network printer via WebSocket | Works on LAN only |
| **QZ Tray** | Yes | Yes | Yes | Desktop middleware agent | Requires local install |

#### Key Finding: Browser Hardware APIs Are Chromium-Only

Web Serial, Web USB, and Web Bluetooth **do not work on Safari/iPad** — the primary tablet used in restaurants. Any solution relying on browser-to-hardware communication breaks on the most common restaurant device. This eliminates all client-side printing approaches for production use.

#### Recommended: Star CloudPRNT (Backend-Triggered)

**Star CloudPRNT** is the correct architecture for Get-Order-Stack:

1. **How it works:** The Star printer polls a cloud endpoint (our backend) every few seconds. When an order is marked "Ready," the backend queues a print job. The printer picks it up on its next poll — no browser involvement at all.
2. **Why it's ideal:**
   - Works with **any browser on any device** — the frontend just changes order status
   - No hardware APIs, no drivers, no browser compatibility issues
   - The frontend only needs a "Printing..." status indicator
   - Supported by Star's entire CloudPRNT-compatible lineup
3. **CloudPRNT Next (2025):** Uses MQTT instead of HTTP polling for sub-second print delivery. Same backend integration pattern, faster response.

**Supported Star Printers:**
- **mC-Print3** (80mm, recommended — CloudPRNT built-in, ethernet + USB + Bluetooth)
- **mC-Print2** (58mm, compact receipt)
- **TSP654II** (CloudPRNT via ethernet)
- **TSP743II** (wide format, kitchen use)
- **TSP847II** (extra-wide, detailed receipts)

#### Secondary: Epson ePOS SDK (On-Premise Network)

For restaurants that want on-premise printing without cloud dependency:
- Epson ePOS SDK connects to network printers via WebSocket from the browser
- Works on all browsers (including Safari/iPad) when printer is on the same LAN
- No cloud polling — direct browser-to-printer over local network
- Requires Epson TM-series printers with ePOS support

#### Order Ready → Receipt Print Workflow

```
Staff clicks "Ready" in KDS/PendingOrders
        │
        ▼
Frontend: PATCH /orders/:id/status { status: 'ready' }
        │
        ▼
Backend: Update order status + queue print job
        │
        ├──► Star CloudPRNT: Printer polls backend, picks up job
        │    (works everywhere, 2-5 second delay, sub-second with MQTT)
        │
        └──► Epson ePOS: Backend sends to printer via LAN WebSocket
             (on-premise only, instant)
        │
        ▼
Frontend: WebSocket event → show "Printing..." badge on order card
        │
        ▼
Staff picks up printed receipt + food → delivers to customer
```

#### When React Native IS Actually Needed for Printing

React Native is **only** needed for one specific scenario: **mobile delivery drivers using Bluetooth portable printers** (e.g., Star SM-L200 via StarXpand SDK). This is a Tier 5+ consideration for a dedicated delivery driver app — completely separate from in-restaurant receipt stations, which are fully handled by CloudPRNT from the backend.

---

## WordPress Multi-Page Distribution

> **STATUS: COMPLETE** — Deployed in Session 9. All 18 feature pages are live.

The original expansion plan (taipa-*-demo slugs) was superseded by the production deployment using `orderstack-*` slugs. See `CLAUDE.md` Session 9 notes for the full page template table. 23 custom elements are registered in `main.ts`, with `functions.php` loading the bundle conditionally on all 18 OrderStack pages.

### Build & Deploy Workflow

```bash
# 1. Build in this workspace
ng build get-order-stack-restaurant-frontend-elements

# 2. Copy to Geek dist
cp dist/get-order-stack-restaurant-frontend-elements/browser/{main.js,styles.css} \
   /Users/jam/development/geek-at-your-spot-workspace/dist/geek-at-your-spot-elements/browser/get-order-stack-elements/

# 3. FTP upload
```

One bundle serves all OrderStack pages. New custom elements are available on any page that includes the `<script type="module">` tag.

---

## Domain Map

| Domain | Current State | AI Priority |
|--------|--------------|-------------|
| Self-Order System (SOS) | ✅ Built (menu, cart, checkout, upsell, voice) | Complete |
| Kitchen Display (KDS) | ✅ Built (prep times, rush, recall, course pacing UI + backend fire execution, expo station, multi-device station routing) | Complete |
| Order Management | ✅ Built (pending, history, receipt, profit, offline queue) | Complete |
| Menu Management | ✅ Built (CRUD, AI cost estimation, AI descriptions) | Complete |
| Inventory | ✅ Built (dashboard, alerts, predictions, stock actions) | Complete |
| Analytics/Reporting | ✅ Built (menu engineering, sales, command center) | Complete |
| Payments | ✅ Built (PayPal Zettle + Stripe provider pattern, refunds, payment badges) | Complete |
| Table Management | ✅ Built (floor plan, drag-and-drop, status management) | Complete |
| Customer/CRM | ✅ Built (dashboard, segments, search, detail panel) | Complete |
| Staff/Scheduling | ✅ Built (drag-drop shift builder, time clock, labor reports, AI recommendations) | Complete |
| Gift Cards | ✅ Built (physical + digital, balance check, redeem at checkout, management UI) | Complete |
| Email Marketing | ✅ Built (campaign builder, templates, audience targeting, performance tracking) | Complete |
| QR Tableside Order & Pay | ✅ Built (QR generation in floor plan, tableside mode in online portal, multi-round ordering, tip presets) | Complete |
| Kiosk Self-Ordering | ✅ Built (5-step flow, touch-optimized, AI upsell, auto-reset) | Complete |
| Invoicing (Catering/Events) | ✅ Built (invoice manager, house accounts, line items, payment recording) | Complete |
| Combos/Bundles | ✅ Built (combo CRUD, pricing preview, item picker) | Complete |
| POS Terminal | ✅ Built (server POS, checks, modifiers, discounts, voids, comps, tabs with pre-auth) | Complete |
| Cash Drawer | ✅ Built (open/close, cash in/out, reconciliation) | Complete |
| Close of Day | ✅ Built (sales summary, payment breakdown, tips, comps/voids, top sellers) | Complete |
| AP Automation / Recipe Costing | ✅ Built (vendor management, invoice OCR, recipe costing, food cost dashboard) | Complete |
| Multi-Location Management | ✅ Built (location groups, cross-location analytics, menu sync, settings propagation) | Complete |
| Waitlist + Guest Profiles | ✅ Built (waitlist tab in reservations, walk-in queue, estimated wait, notify/seat actions) | Complete |
| Employee Self-Service | ✅ Built (PIN login, schedule view, availability editor, swap requests, earnings) | Complete |
| Third-Party Delivery | ✅ DaaS Phase 1 complete (DoorDash Drive + Uber Direct, KDS dispatch, webhooks, deployed backend routes) | 🚧 Marketplace Phase 2 in progress (build + verification tooling complete; pilot rollout execution pending) |
| Reservations | ✅ Built (manager, booking, status workflow) | Complete |
| Online Ordering | ✅ Built (customer portal, 4-step flow, order tracking) | Complete |
| Marketing/Loyalty | ✅ Built (loyalty config, tiers, rewards CRUD, points earn/redeem, phone lookup) | Complete |
| Settings | ✅ Built (Control Panel: printers, AI settings, online pricing, catering calendar, payments, tip management, loyalty, delivery) | Complete |
| Monitoring | ✅ Built (autonomous agent, anomaly rules, alert feed) | Complete |
| Voice Ordering | ✅ Built (Web Speech API, bilingual EN/ES, fuzzy match) | Complete |
| Dynamic Pricing | ✅ Built (rules engine, time-based, price preview) | Complete |
| Waste Reduction | ✅ Built (waste log, analysis, AI recommendations) | Complete |
| Sentiment Analysis | ✅ Built (NLP, keyword scoring, flag categories) | Complete |

---

## TIER 1: Surface What's Already Built — ✅ COMPLETE (8/8)

> All 8 features fully implemented (Sessions 2-5, 11-13). T1-01 through T1-07: backend ready, zero backend work needed. T1-08: complete (frontend Session 11, backend phases 1-6 Session 12, phases 7-8 Session 12). Control Panel expanded with AI Settings, Online Pricing, and Catering Calendar tabs (Session 13).

### T1-01. AI-Powered Cart-Aware Upsell Bar
**Domain:** SOS / Menu Engineering
**What:** Replace static `popularItems` with the live `GET /analytics/upsell-suggestions?cartItems=id1,id2` endpoint that returns high-margin items with `reason` and `suggestedScript` based on what's in the cart.
**Backend:** READY
**Frontend:** Create `AnalyticsService`, modify `SosTerminal` line 50 to call it reactively on cart changes (debounced), update `UpsellBar` to show reason text.
**Impact:** Cart-aware suggestions are 3-5x more effective than static lists. Each upsell adds $2-5 profit.

### T1-02. Menu Engineering Dashboard (Stars/Cash Cows/Puzzles/Dogs)
**Domain:** Analytics
**What:** New `menu-engineering-dashboard` component showing quadrant scatter plot, sortable item table with classification badges, AI insights panel (4-6 actionable recommendations), and upsell staff scripts.
**Backend:** READY — `GET /analytics/menu-engineering?days=30`
**Frontend:** New component in `lib/analytics/menu-engineering-dashboard/`, add "Analytics" nav to SOS Terminal drawer, register as custom element.
**Impact:** Core Toast IQ competitor. A single price adjustment on a Puzzle item can add thousands in annual profit.

### T1-03. Sales Insights Dashboard (Daily/Weekly AI Reports)
**Domain:** Analytics
**What:** New `sales-dashboard` with daily/weekly toggle, KPI tiles with comparison arrows, color-coded insight cards, AI recommendations panel, peak hours bar chart, top sellers lists.
**Backend:** READY — `GET /analytics/sales/daily`, `/weekly`, `/summary`
**Frontend:** New component in `lib/analytics/sales-dashboard/`, date picker for custom range.
**Impact:** Daily actionable intelligence. Catches revenue drops same-day. This is the "For You" feed for Toast IQ.

### T1-04. Order Profit Insights (Staff-Facing)
**Domain:** Orders
**What:** Show profit margin, star item, insightText, and quickTip after each order is placed. Add profit badges to order history. Running averages dashboard.
**Backend:** READY — `OrderService.getProfitInsight()` already exists in frontend (line 187) but is **never called**.
**Frontend:** Call it in `CheckoutModal` after submit, add profit badge to `PendingOrders`/`OrderHistory` cards.
**Impact:** Staff awareness of margins improves upselling behavior. 5-15% margin improvement documented.

### T1-05. Inventory Management Dashboard
**Domain:** Inventory
**What:** Full inventory UI — item list with stock levels, stock adjustment modal, AI-powered alerts (low/out/overstock), days-until-empty predictions, reorder recommendations.
**Backend:** READY — Full CRUD + `GET /inventory/alerts`, `/predictions`, `/report`
**Frontend:** New `InventoryService`, new `lib/inventory/` directory with 4-5 components, add to SOS Terminal nav.
**Impact:** Eliminates out-of-stock surprises. Reduces food waste from over-ordering. Saves 30-60 min per ordering session.

### T1-06. AI Cost Estimation in Menu Item Management
**Domain:** Menu Management
**What:** Add "AI Estimate Cost" and "Generate English Description" buttons to item management. Show `aiEstimatedCost`, `aiSuggestedPrice`, `aiProfitMargin`, `aiConfidence` inline. Batch estimation for all items.
**Backend:** READY — `POST /menu/items/:id/estimate-cost`, `/generate-description`, `/estimate-all-costs`, `/generate-all-descriptions`
**Frontend:** Add methods to `MenuService`, add buttons and AI data display to `ItemManagement` form.
**Impact:** Most restaurants have no idea what their food cost is. Instant visibility into margins per item.

### T1-07. Payment Integration (PayPal Zettle + Stripe)
**Domain:** Payments
**Status:** ✅ COMPLETE (Session 5 Stripe, Session 18 PayPal frontend, Session 19 PayPal backend)
**What:** Processor-agnostic payment system with `PaymentProvider` interface. PayPal Zettle (recommended, lowest fees) and Stripe (fallback) as provider implementations. Restaurants select their processor in Control Panel → Payments tab. Card input, payment confirmation, refund capability in order management.
**Backend:** ✅ COMPLETE — Stripe endpoints + PayPal endpoints (`/paypal-create`, `/paypal-capture`, webhook). Shared routes (`/payment-status`, `/cancel-payment`, `/refund`) are processor-agnostic, detecting Stripe vs PayPal automatically. `paypal.service.ts` mirrors `stripe.service.ts` pattern with token caching, idempotent order creation, and capture ID extraction for refunds.
**Frontend:** `PaymentService` orchestrator delegates to `StripePaymentProvider` or `PayPalPaymentProvider` plain classes. PayPal buttons auto-confirm; Stripe requires explicit Pay button. `PaymentSettingsComponent` in Control Panel for processor selection.
**Impact:** Without this, the system cannot process real transactions. PayPal Zettle saves ~$3K/year vs Stripe on $80K/month volume.

#### Backend Endpoints

| Method | Endpoint | Request | Response | Status |
|--------|----------|---------|----------|--------|
| POST | `/restaurant/:id/orders/:orderId/payment-intent` | None | `{ clientSecret, paymentIntentId }` | ✅ READY |
| GET | `/restaurant/:id/orders/:orderId/payment-status` | None | `{ orderId, orderNumber, paymentStatus, paymentMethod, total, processorData }` | ✅ READY |
| POST | `/restaurant/:id/orders/:orderId/cancel-payment` | None | `{ success, message }` | ✅ READY |
| POST | `/restaurant/:id/orders/:orderId/refund` | `{ amount?: number }` | `{ success, refundId, amount, status }` | ✅ READY |
| POST | `/api/webhooks/stripe` | Stripe webhook payload | `{ received: true }` | ✅ READY |
| POST | `/restaurant/:id/orders/:orderId/paypal-create` | `{}` | `{ paypalOrderId }` | ✅ READY |
| POST | `/restaurant/:id/orders/:orderId/paypal-capture` | `{}` | `{ success }` | ✅ READY |
| POST | `/api/webhooks/paypal` | PayPal webhook payload | `{ received: true }` | ✅ READY |

Payment statuses: `pending`, `paid`, `failed`, `cancelled`, `partial_refund`, `refunded`

### T1-08. Receipt Printing via Star CloudPRNT
**Domain:** Orders / KDS
**Status:** ✅ COMPLETE (Sessions 11-12)
**What:** When staff marks an order "Ready" in KDS or PendingOrders, the backend queues a print job via Star CloudPRNT API. The CloudPRNT-compatible printer polls the backend and picks up the job — no browser hardware APIs needed, works on any device including iPad/Safari.
**Backend:** ✅ COMPLETE (8/8 phases) — Prisma schema, DTOs, Star Line Mode utility, CloudPrntService + PrinterService (singleton pattern), CloudPRNT protocol routes, order status integration, WebSocket print events (`order:printed`, `order:print_failed`), background stale job cleanup (every 10 min).
**Frontend:** ✅ COMPLETE — PrinterSettings UI with CRUD, CloudPRNT config display, MAC validation, test print. ControlPanel shell with Printers tab. PrinterService with 5 methods. Registered `get-order-stack-control-panel` custom element (23 total).
**Hardware:** Star CloudPRNT-compatible printer (mC-Print3 recommended — 80mm thermal, ethernet + USB + Bluetooth, CloudPRNT built-in). CloudPRNT Next (MQTT) supported for sub-second delivery.
**Impact:** Completes the staff order fulfillment workflow. Without receipt printing, "Order Ready" is a dead end — staff has no physical ticket to deliver with the food. Pairs naturally with T1-07 (Stripe) since payment + receipt go together.

---

## TIER 2: Enhance Existing Features with AI — COMPLETE (6/6)

> All 6 features complete. T2-01, T2-02, T2-03, T2-05, T2-06 (Sessions 6-7). T2-04 multi-device station routing (Session 32).

### T2-01. Smart KDS with Prep Time Predictions & Station Routing
**Domain:** KDS
**Status:** ✅ COMPLETE (prep time + rush + recall ticket + course pacing + expo station)
**What:** Show estimated prep time countdown on order cards, color escalation (green/amber/red by time), route items to kitchen stations, add station filter to KDS header, "Rush" button. Expo Station adds a 4th KDS column for expediter verification before printing/serving.
**Backend:** PARTIAL — `prepTimeMinutes` and `Station` model exist. Course pacing execution endpoints are live (`PATCH /:restaurantId/orders/:orderId/fire-course`, `PATCH /:restaurantId/orders/:orderId/fire-item`, Session 24). Course pacing target gap is now persisted/validated in `aiSettings.targetCourseServeGapSeconds` (Session 25, deployed). Station-category mapping complete (Session 32). Prep estimate endpoint remains pending.
**Frontend:** Prep time countdown with color escalation from MenuItem.prepTimeMinutes. Rush priority toggle. KDS stats header (active/overdue/avg wait). Recall ticket (backward status transitions). Course pacing mode from AI Settings with operator override. Auto-fire timing now consumes AI Settings target gap (`targetCourseServeGapSeconds`) with adaptive delay heuristics. Expo Station: local verification layer on READY_FOR_PICKUP orders — 4-column grid (NEW/COOKING/EXPO/READY), expo check triggers print, toggle-off safety prints unchecked orders, AI Settings + KDS header toggles with override pattern. Station routing complete (Session 32) — see T2-04.
**Impact:** Station routing cuts ticket times 15-20%. Expo verification prevents incorrect plates reaching customers.

### T2-02. Intelligent 86 System (Auto-86 from Inventory)
**Domain:** Menu / Inventory
**Status:** ✅ COMPLETE
**What:** When inventory drops below threshold (via `RecipeIngredient` links), auto-86 the menu item and notify SOS terminals in real-time via WebSocket.
**Backend:** PARTIAL — `RecipeIngredient` model, `eightySixed` field, `PATCH /86` endpoint exist. Need automated trigger.
**Impact:** Prevents selling items you're out of. Eliminates customer disappointment.

### T2-03. AI-Enhanced Menu Item Cards
**Domain:** SOS
**Status:** ✅ COMPLETE
**What:** Replace manual "Popular" checkbox with data-driven badges: "Best Seller" (top 10% by volume), "Chef's Pick" (high margin), "New" (< 14 days). Staff mode shows profit overlay.
**Backend:** Uses existing menu engineering classification endpoint — no new endpoint needed.
**Frontend:** MenuItemCard now shows data-driven badges from AnalyticsService menu engineering data: Best Seller (stars), Chef's Pick (cash-cows), Popular (puzzles), New (< 14 days). SosTerminal loads engineering data on init.
**Impact:** Guided choices toward profitable items. "Popular" badges increase selection 20-30%.

### T2-04. Smart Order Routing (Multi-Device)
**Domain:** KDS
**Status:** ✅ COMPLETE (Session 32)
**What:** Route order items to correct KDS station by category. Each KDS tablet selects its station to see only relevant items. "All Stations" mode shows everything.
**Backend:** ✅ COMPLETE — `StationCategoryMapping` join model, station CRUD routes, bulk category assignment with exclusivity enforcement, flat mapping list endpoint. Deployed to Render (`7a25d3e`).
**Frontend:** StationService (signal-based CRUD, `categoryToStationMap` computed), `menuItemToStationMap` in KDS, station selector with localStorage persistence, order/item filtering with partial order badge, StationSettings component in Control Panel 9th tab with category assignment UI.
**Impact:** Critical for multi-station kitchens. Cuts ticket times 15-20%.

### T2-05. Real-Time Priority Notifications
**Domain:** Orders
**Status:** ✅ COMPLETE
**What:** Color-code notifications by wait time, escalate overdue orders, VIP customer flagging, differentiated sound alerts, desktop notification API.
**Frontend:** Web Audio API (4 distinct tones), Desktop Notification API, urgency classification, elapsed time display, sound/desktop toggle controls, pulse animation for urgent alerts. Course-ready audio chime + desktop alerts. Duplicate notification fix (single course-specific message).
**Impact:** No more lost orders. Catches bottlenecks before customer complaints.

### T2-06. Table Management Floor Plan
**Domain:** Tables
**Status:** ✅ COMPLETE
**What:** Visual drag-and-drop floor plan using `posX`/`posY`, color-coded status, click-to-view current order.
**Backend:** READY — Full CRUD endpoints exist.
**Frontend:** `FloorPlan` component with drag-and-drop canvas, list view, KPI strip, section filtering, add/edit/delete tables, status management, active order display. `TableService` with full CRUD. Registered as `get-order-stack-floor-plan`.
**Impact:** Standard for dine-in POS. Hosts need instant table visibility.

---

## TIER 3: New AI-Powered Modules (Compete with Toast) — COMPLETE

### T3-01. AI Command Center / Restaurant IQ
**Domain:** All
**Status:** ✅ COMPLETE
**What:** Central dashboard: real-time KPIs, "For You" AI recommendations feed, active alerts, quick actions. Single screen for all restaurant intelligence.
**Frontend:** 3 tabs: Overview (6 KPIs + insights + top sellers + stock watch), AI Insights (unified feed), Alerts (inventory alerts + predictions). Composes AnalyticsService, InventoryService, OrderService via `Promise.all()`.
**Impact:** Flagship Toast IQ competitor. Reduces manager screens from 5+ to 1.

### T3-02. Customer Intelligence / CRM
**Domain:** CRM
**Status:** ✅ COMPLETE
**What:** Customer profiles, order history, spend analysis, AI-generated segments (VIP, At-Risk, New, Dormant), personalized outreach recommendations.
**Frontend:** Search, segment filtering (VIP/Regular/New/At-Risk/Dormant), sortable table, detail side panel. CustomerService with segment calculation.
**Impact:** Retention is 5x cheaper than acquisition. AI segmentation catches churn risk.

### T3-03. Labor Intelligence / Staff Scheduling
**Domain:** Staff
**Status:** ⏭️ SUPERSEDED by T5-03 (Employee Scheduling) in Tier 5 Toast Parity plan
**What:** AI staffing recommendations from historical sales patterns, demand forecasting by hour/day, schedule management, labor cost tracking vs targets.
**Backend:** NEEDS NEW — Need `Shift`/`StaffSchedule` models, `LaborIntelligenceService`.
**Impact:** Labor is 25-35% of costs. AI scheduling saves $500-2000/month.
**Note:** T5-03 expands this scope with full Toast-parity scheduling: drag-drop shift builder, auto-scheduling, overtime warnings, availability management, shift swap, time clock, and labor cost forecasting. See Tier 5.

### T3-04. Online Ordering Portal (Customer-Facing)
**Domain:** Online Ordering
**Status:** ✅ COMPLETE
**What:** Mobile-optimized customer ordering: menu browsing, cart, Stripe checkout, real-time order tracking. Separate theme from staff UI.
**Frontend:** 4-step mobile-optimized flow (menu → cart → info → confirm). Category pills, search, qty controls, floating cart bar, order type toggle (pickup/delivery/dine-in/curbside/catering), customer form, order summary, order tracking with polling. Slug-based restaurant resolution.
**Impact:** 30-40% of restaurant revenue is digital. Table stakes for modern POS.

### T3-05. Reservation System with AI Capacity Planning
**Domain:** Reservations
**Status:** ✅ COMPLETE
**What:** Reservation management with AI-predicted table turn times, auto-table assignment, waitlist with estimated wait, overbooking recommendations.
**Frontend:** Today/upcoming/past tabs, booking form, status actions, KPI strip. ReservationService with CRUD + status workflow.
**Impact:** AI turn time prediction increases covers 10-15%.

### T3-06. Conversational AI Assistant (Restaurant IQ Chat)
**Domain:** All
**Status:** ✅ COMPLETE
**What:** Chat interface for natural language queries: "How did we do last Tuesday?", "Which items should I cut?", "When will we run out of chicken?" Routes queries to backend services via Claude function-calling.
**Frontend:** Message bubbles, typing indicator, suggested queries, auto-scroll. ChatService with conversation management.
**Impact:** Direct Toast IQ competitor. Natural language access to all restaurant data.

---

## TIER 4: Differentiators (Beyond Toast) — COMPLETE

### T4-01. Autonomous AI Monitoring Agent
**Status:** ✅ COMPLETE
**What:** Background agent runs every 60s (configurable), detects anomalies (revenue drops, inventory discrepancies, fraud patterns, kitchen bottlenecks), pushes proactive alerts.
**Frontend:** 3 tabs: Live Feed (filtered alerts with severity/category), Alert History, Rules (8 built-in anomaly rules, toggle on/off). MonitoringService with configurable polling, deduplication, acknowledge/clear, snapshot timeline. Polls AnalyticsService + InventoryService — no new backend needed.
**Impact:** Catches problems before crises. Fraud detection saves $5K-20K/year.

### T4-02. Voice AI Ordering
**Status:** ✅ COMPLETE
**What:** Voice-activated ordering at kiosk or phone using browser Web Speech API + Claude NLP for entity extraction. Bilingual (English/Spanish).
**Frontend:** Web Speech API integration, bilingual (EN/ES), fuzzy menu matching with quantity extraction ("two chicken tacos"), SpeechSynthesis voice feedback, animated waveform, confidence badges.
**Impact:** $2.5B market by 2027. Accessibility improvement. Differentiator over all major POS competitors.

### T4-03. Dynamic Menu Pricing
**Status:** ✅ COMPLETE
**What:** Time-based and demand-based price adjustments (happy hour, surge pricing, off-peak discounts). AI recommends pricing strategies.
**Frontend:** 3 tabs: Rules (CRUD form with type/multiplier/time/days), Price Preview (live table with strikethrough base prices), AI Suggestions. Time-based rule engine checks current time/day against rules. Rule types: happy_hour, surge, off_peak, seasonal, custom. localStorage persistence per restaurant.
**Impact:** Dynamic pricing increases revenue 5-15%.

### T4-04. AI-Powered Waste Reduction
**Status:** ✅ COMPLETE
**What:** Track food waste by category (prep, expired, returns). AI analyzes patterns, suggests prep quantity adjustments.
**Frontend:** 3 tabs: Waste Log (entry form + filtered list), Analysis (category breakdown bars + top wasted items), AI Tips (computed recommendations from actual waste data). 5 waste categories: prep_loss, spoilage, customer_return, damaged, overproduction. Integrates with InventoryService.recordUsage() to deduct stock.
**Impact:** Cuts waste 30-50%, saving $500-2000/month.

### T4-05. Sentiment Analysis from Order Data
**Status:** ✅ COMPLETE
**What:** NLP analysis of `specialInstructions` text and order patterns to gauge satisfaction. Detects complaint keywords, tracks return rates.
**Frontend:** 3 tabs: Overview (sentiment bars + keyword cloud + flag grid), Entries (filtered list with score/keywords/flags), Flags (detail view by flag type). Client-side NLP: keyword matching for positive/negative scoring, 6 flag categories (complaint, allergy, rush, compliment, dietary, modification).
**Impact:** Early detection of quality issues before negative reviews.

---

## TIER 5: Toast POS Parity — ✅ COMPLETE (10/10)

> Gap analysis performed February 2026 against Toast POS full product suite. All 10 features are now complete (Sessions 33-40). T5-01 through T5-09 (Sessions 33-36), T5-07 AP Automation + Recipe Costing (Session 39), T5-08 Multi-Location Management (Session 40), T5-11 Employee Self-Service (Session 38).
>
> **Sources:** [Toast POS](https://pos.toasttab.com), [Deliverect Toast Guide](https://www.deliverect.com/en-us/blog/pos-systems/toast-pos-everything-you-need-to-know), [Slam Media Lab Review](https://www.slammedialab.com/post/toast-software), [The Retail Exec Review](https://theretailexec.com/tools/toast-review/), [NerdWallet Review](https://www.nerdwallet.com/business/software/reviews/toast-pos), [Korona POS Overview](https://koronapos.com/blog/toast-pos-overview/), [Toast Payroll](https://pos.toasttab.com/products/payroll), [Toast Marketing](https://pos.toasttab.com/products/toast-marketing), [Toast Loyalty](https://pos.toasttab.com/products/loyalty), [Toast Gift Cards](https://pos.toasttab.com/products/gift-card), [Toast Invoicing](https://pos.toasttab.com/products/invoicing), [xtraCHEF by Toast](https://pos.toasttab.com/products/xtrachef), [Toast Tables](https://pos.toasttab.com/products/toast-tables), [Toast Capital](https://pos.toasttab.com/products/capital), [Multi-Location Management](https://pos.toasttab.com/products/multi-location-management), [Software Curio Payroll Review](https://www.softwarecurio.com/blog/toast-payroll-review/)

### Toast Parity Summary

| Toast Feature | Get-Order-Stack Status | Gap? |
|---|---|---|
| POS / Ordering | ✅ SOS Terminal (+ AI upsell, voice) | No — **we exceed** |
| KDS | ✅ KDS (+ AI prep timing, station routing, expo, course pacing, throttling) | No — **we exceed** |
| Online Ordering | ✅ Online Order Portal | No |
| 3rd-Party Delivery | ✅ DaaS + Marketplace | No |
| Inventory Management | ✅ Inventory Dashboard (+ AI predictions) | No — **we exceed** |
| Reporting / Analytics | ✅ Sales, Menu Engineering, Command Center (+ AI insights) | No — **we exceed** |
| Loyalty Program | ✅ Tiers, rewards, points, redemption | No |
| Reservations / Tables | ✅ Reservation Manager + Floor Plan | Partial — see T5-09 |
| Tip Management | ✅ Pooling, tip-out, compliance, CSV | No |
| Receipt Printing | ✅ Star CloudPRNT | No |
| Payment Processing | ✅ PayPal Zettle + Stripe | No |
| CRM / Customers | ✅ Dashboard + segments | No |
| Menu Management | ✅ CRUD + AI cost estimation + AI descriptions | No — **we exceed** |
| AI Chat Assistant | ✅ Chat Assistant | **Toast doesn't have** |
| Dynamic Pricing | ✅ Rules engine + price preview | **Toast doesn't have** |
| Waste Reduction | ✅ Waste Tracker + AI tips | **Toast doesn't have** |
| Monitoring / Anomaly | ✅ Autonomous agent | **Toast doesn't have** |
| Voice Ordering | ✅ Web Speech API + bilingual | **Toast doesn't have** |
| Sentiment Analysis | ✅ NLP Dashboard | **Toast doesn't have** |
| **Gift Cards** | ✅ Physical + digital, redeem at checkout, management UI | No |
| **Email Marketing** | ✅ Campaign builder, templates, audience targeting, performance | No |
| **Employee Scheduling** | ✅ Shift builder, time clock, labor reports, AI recommendations | No |
| **QR Tableside Order & Pay** | ✅ QR generation, tableside mode, multi-round ordering, tips | No |
| **Kiosk Self-Ordering** | ✅ 5-step touch flow, AI upsell, auto-reset | No |
| **Invoicing** | ✅ Invoice manager, house accounts, line items, payments | No |
| **AP Automation / Recipe Costing** | ✅ Food Cost Dashboard (vendor mgmt, invoice OCR, recipe costing) | No |
| **Multi-Location Management** | ✅ Multi-Location Dashboard (groups, analytics, menu sync, settings) | No |
| **Waitlist + Guest Profiles** | ✅ Waitlist queue, walk-ins, estimated wait, notify/seat | No |
| **Employee Self-Service** | ✅ Staff Portal (PIN auth, schedule, availability, swaps, earnings) | No |
| Website Builder | ✅ WordPress (superior) | Non-gap |
| Fraud Detection | ✅ Stripe Radar + PayPal built-in | Non-gap |

### T5-01. Gift Card System (Physical + Digital)
**Domain:** Payments / Online Ordering
**Status:** ✅ COMPLETE (Frontend Session 35, Backend Session 37)
**Toast charges:** $50/mo add-on
**Priority:** HIGH — Direct revenue generator, standard customer expectation

**What Toast does:**
- Digital e-gift cards purchasable online + in-store
- Physical gift cards (mag-stripe or manual entry)
- Custom denominations ($10, $25, $50, $100, custom)
- Gift card as payment method at checkout
- Balance check online
- Gift card linked to loyalty account (QR code scan)
- Personal messages on gift cards
- Optional expiration dates

**Backend (6 steps):**
1. **Prisma schema** — `GiftCard` model (id, restaurantId, code, type: `'digital' | 'physical'`, initialBalance, currentBalance, purchaserName, purchaserEmail, recipientName, recipientEmail, personalMessage, expiresAt, isActive, createdAt, redeemedAt), `GiftCardTransaction` model (id, giftCardId, orderId, amount, type: `'purchase' | 'redemption' | 'refund' | 'adjustment'`, balanceBefore, balanceAfter, createdAt)
2. **Gift card service** — `src/services/gift-card.service.ts` — generate unique codes (16-char alphanumeric), create, check balance, redeem (deduct from balance + create transaction), reload, deactivate, send email (digital)
3. **Gift card routes** — `src/app/gift-card.routes.ts`:
   - `POST /gift-cards` — purchase a gift card (creates card + optional email delivery)
   - `GET /gift-cards/:code/balance` — public balance check (no auth required)
   - `POST /gift-cards/:code/redeem` — redeem amount (used at checkout)
   - `POST /gift-cards/:code/reload` — add balance
   - `GET /gift-cards` — list all gift cards (admin)
   - `PATCH /gift-cards/:code` — update (deactivate, extend expiry)
4. **Checkout integration** — modify order creation to accept `giftCardCode` + `giftCardAmount`, validate sufficient balance, create redemption transaction, reduce remaining total sent to payment processor
5. **Email delivery** — send digital gift card via email template (code, balance, personal message, restaurant branding)
6. **Mount routes + Zod validators**

**Frontend (5 steps):**
7. **Model** — `gift-card.model.ts` — `GiftCard`, `GiftCardTransaction`, `GiftCardFormData`, `GiftCardRedemption`
8. **Service** — `gift-card.ts` — `GiftCardService` with `purchase()`, `checkBalance()`, `redeem()`, `reload()`, `listAll()`, `deactivate()`
9. **Gift Card Settings** — Control Panel 10th tab — configure denominations, enable/disable, expiration policy, view all cards with balance/status
10. **Checkout integration** — gift card code entry field in CheckoutModal + OnlineOrderPortal, balance display, partial/full apply to order total (before payment processor), loyalty points still earned on original total
11. **Gift Card Purchase flow** — section in OnlineOrderPortal or standalone component: select amount, enter recipient email, add personal message, pay with card

**Impact:** Gift cards generate immediate revenue (cash collected before service rendered), drive new customer acquisition (recipients become new customers), and average 20% overspend beyond card value.

### T5-02. Email/SMS Marketing Campaigns
**Domain:** Marketing / CRM
**Status:** ✅ COMPLETE (Frontend Session 36, Backend Session 37)
**Toast charges:** $75/mo add-on
**Priority:** HIGH — Customer retention driver, 39% avg open rate

**What Toast does:**
- AI-powered email campaign creation (goals + tone → generated layout + copy via AI)
- Automated campaigns (welcome new guests, thank repeat, win-back lapsed)
- A/B testing (subject lines, content)
- Audience segmentation (from POS + loyalty data)
- Performance tracking (open rates, click rates, revenue attribution)
- Templates library
- Scheduled sends

**Backend (5 steps):**
1. **Prisma schema** — `EmailCampaign` (id, restaurantId, name, subject, bodyHtml, status: `'draft' | 'scheduled' | 'sending' | 'sent' | 'automated'`, segmentFilter JSON, scheduledAt, sentAt, recipientCount, openCount, clickCount, revenueAttributed), `EmailRecipient` (id, campaignId, customerId, email, status: `'pending' | 'sent' | 'opened' | 'clicked' | 'bounced' | 'unsubscribed'`, sentAt, openedAt, clickedAt)
2. **Email campaign service** — `src/services/email-campaign.service.ts` — segment builder (queries Customer by visit count, last order date, loyalty tier, spend bracket), AI content generation via Claude (prompt: campaign goal + tone + restaurant name → subject + body HTML), send via SendGrid/Resend API, tracking pixel for opens, link wrapping for clicks, revenue attribution (track orders within 7 days of open)
3. **Campaign routes** — CRUD + `POST /send` + `POST /schedule` + `GET /stats` + `POST /generate-content` (AI)
4. **Automated campaign engine** — background job checks triggers: new customer (1st order → welcome), repeat customer (5th order → thank you), lapsed customer (no order in 30 days → win-back), loyalty tier upgrade (congratulations), birthday (if collected)
5. **Webhook receiver** — SendGrid/Resend delivery webhooks for open/click/bounce/unsubscribe tracking

**Frontend (4 steps):**
6. **Model** — `email-campaign.model.ts` — `EmailCampaign`, `EmailRecipient`, `CampaignSegment`, `CampaignStats`
7. **Service** — `email-campaign.ts` — `EmailCampaignService`
8. **Email Marketing Dashboard** — campaign list with status badges, create/edit form (AI "Generate Content" button, audience segment picker with live count preview, schedule date/time picker, preview mode), campaign detail view with performance stats (sent/opened/clicked/bounced/revenue)
9. **Register custom element** — `get-order-stack-email-marketing`

**Impact:** Email marketing drives 15-25% of repeat visits. AI content generation eliminates the "blank page" problem for restaurant operators who don't have time to write marketing copy.

### T5-03. Employee Scheduling + Time Clock
**Domain:** Staff / Labor
**Status:** ✅ COMPLETE (Frontend Session 35, Backend labor routes deployed Session 23)
**Toast charges:** $90/mo + $9/employee
**Priority:** HIGH — Labor is 25-35% of restaurant costs

**What Toast does:**
- Drag-and-drop weekly shift builder
- Auto-scheduling based on availability + labor targets
- Overtime warnings (approaching 40 hrs)
- Availability management per employee
- Shift swap/trade requests
- Schedule publish with push notifications
- Labor cost forecasting (scheduled labor $ vs projected sales)
- POS-integrated time clock (actual hours vs scheduled)
- Break compliance tracking
- Payroll sync (hours → wages → tax filing)

**Backend (6 steps):**
1. **Prisma schema** — `Employee` (id, restaurantId, name, role, hourlyRate, overtimeRate, email, phone, isActive, hiredAt), `Shift` (id, restaurantId, employeeId, date, startTime, endTime, breakMinutes, role, status: `'draft' | 'published' | 'swap_requested' | 'completed' | 'no_show'`), `EmployeeAvailability` (id, employeeId, dayOfWeek, startTime, endTime, isAvailable), `TimeEntry` (id, employeeId, shiftId, clockIn, clockOut, breakStart, breakEnd, tips, overtimeMinutes, status: `'clocked_in' | 'on_break' | 'clocked_out'`)
2. **Scheduling service** — `src/services/scheduling.service.ts` — auto-schedule (fill open shifts from employee availability + role matching + fairness rotation), overtime calculator (warn at 35 hrs, block at 40 unless manager override), labor cost projector (sum scheduled hours × rates vs forecasted revenue from sales history), conflict detection (double-booking, unavailable)
3. **Scheduling routes** — shift CRUD, weekly schedule view, publish (batch status → published + notification), swap request/approve, employee availability CRUD, `GET /labor-forecast` (scheduled $ vs projected sales)
4. **Time tracking routes** — `POST /clock-in` (PIN-based, links to shift), `POST /clock-out`, `POST /break-start`, `POST /break-end`, `GET /time-entries` (by date range, employee)
5. **Labor analytics routes** — labor cost percentage (actual labor ÷ revenue), scheduled vs actual hours variance, overtime report by employee, break compliance report
6. **Mount routes + Zod validators, employee CRUD routes**

**Frontend (6 steps):**
7. **Models** — extend `labor.model.ts` — `Employee`, `Shift`, `EmployeeAvailability`, `TimeEntry`, `ScheduleWeek`, `LaborForecast`
8. **Service** — `scheduling.ts` — `SchedulingService` with shift CRUD, publish, swap, time clock, labor analytics
9. **Schedule Builder** — weekly grid view (rows = employees, columns = days), drag-and-drop shift blocks, color by role, overtime warning badges, labor cost sidebar (scheduled $ / projected revenue), "Auto-Fill" button, "Publish" button
10. **Time Clock** — PIN-based clock in/out screen (reuse existing staff PIN auth), active shift display with timer, break start/end button, shift summary on clock-out (hours, tips, earnings)
11. **Labor Dashboard** — labor cost % vs revenue chart (daily/weekly), hours by employee table, overtime alerts, scheduled vs actual comparison, break compliance
12. **Register elements** — `get-order-stack-schedule`, `get-order-stack-time-clock`

**Impact:** AI-assisted scheduling saves 30-40% of scheduling creation time. Overtime warnings prevent surprise labor costs. Labor analytics gives real-time visibility into biggest controllable expense.

### T5-04. QR Code Tableside Order & Pay
**Domain:** SOS / Online Ordering
**Status:** ✅ COMPLETE (Frontend Session 34)
**Toast charges:** Included in higher tiers
**Priority:** HIGH — Post-COVID standard, reduces server dependency

**What Toast does:**
- Guest scans QR code on table tent/sticker
- Opens menu on phone (no app download, no login required)
- Browse, customize, order from phone
- Pay + add gratuity from phone
- Tab management (order more items, close tab when done)
- No physical menus, receipts, credit cards, or pens needed

**Backend (3 steps):**
1. **QR code generation** — `GET /restaurant/:id/tables/:tableId/qr` — returns SVG/PNG QR code encoding URL like `https://getorderstack.com/order?restaurant=SLUG&table=TABLE_NUM`
2. **Table-linked ordering** — modify order creation to accept `tableId` parameter, link order to table, auto-update table status to `'occupied'`, support `orderedBy: 'guest_qr'` source tag
3. **Tab management** — `POST /orders/:orderId/add-items` — append items to existing open order on table (multi-round ordering within a single check), `POST /orders/:orderId/close-tab` — finalize order

**Frontend (4 steps):**
4. **Extend OnlineOrderPortal** — detect `table` URL param, switch to dine-in QR mode: hide address/pickup fields, show "Table X" header, enable "Order More" button (adds to existing open tab at table), show running tab total
5. **Tab view** — itemized running bill of all rounds ordered at table, pay button, tip selector (preset % and custom), split check option (future)
6. **QR Code Generator** — admin tool in Floor Plan component: generate/download/print QR codes per table (batch print all tables as PDF), preview QR with table number overlay
7. **Table status sync** — when QR order placed, table status updates via WebSocket → reflects on Floor Plan as `'occupied'`, when tab closed → status returns to `'available'`

**Impact:** Reduces server touches per table by 40-60%. Increases avg check size 15-20% (guests order more when they control the pace). Eliminates "waiting for the check" friction.

### T5-05. Self-Service Kiosk Mode
**Domain:** SOS
**Status:** ✅ COMPLETE (Frontend Session 34)
**Toast charges:** Hardware-dependent (included in software)
**Priority:** MEDIUM-HIGH — Essential for quick-service/fast-casual

**What Toast does:**
- Full-screen customer-facing ordering UI
- Large touch-friendly buttons (optimized for 15"+ screens)
- Built-in upsell prompts ("Add a drink? Upsize?")
- Payment at kiosk (card terminal integration)
- Order number display on completion
- Accessibility features (high contrast, large text)

**Frontend (5 steps — no new backend needed, uses existing SOS/cart/order APIs):**
1. **Kiosk Terminal component** — `lib/kiosk/kiosk-terminal/` — full-screen layout for touch screens: large category tiles (with images), big item cards, prominent add-to-cart animation, minimal text input (no keyboard needed for basic ordering)
2. **Kiosk Cart** — always-visible right panel (not hidden drawer), large qty +/- buttons, item images in cart, prominent total display, "Start Over" button with confirmation
3. **Kiosk Upsell Screen** — after "Checkout" tap, before payment: 2-3 AI upsell cards as large tiles ("Add fries for $2.99?"), clear "No Thanks" skip button
4. **Order Complete Screen** — order number in large font (80px+), "Your order has been sent to the kitchen!" message, auto-reset timer (45s countdown → return to menu), "New Order" button
5. **Register element** — `get-order-stack-kiosk`

**Design considerations:**
- No login required (anonymous ordering)
- Dining option defaulted to "Dine-In" or "Takeout" with large toggle at start
- Payment integration uses existing PayPal/Stripe flow with card-present terminal (future hardware integration) or QR payment code
- ADA: minimum 44px touch targets, high contrast mode toggle, screen reader support

**Impact:** Kiosks increase average order value 15-30% through built-in upsells. Reduces front-counter staffing by 1-2 positions during peak. Essential for quick-service restaurants.

### T5-06. Invoicing (Catering & Events)
**Domain:** Catering / Payments
**Status:** ✅ COMPLETE (Frontend Session 35, Backend Session 37)
**Toast charges:** Included in higher tiers
**Priority:** MEDIUM — Enables catering/events revenue stream

**What Toast does:**
- Create and send itemized digital invoices from any device
- Deposit collection and redemption against invoice
- Payment due dates + automatic reminders (before, on, after due date)
- Tip collection on invoices
- Integrated with POS menu items (line items from menu)

**Backend (4 steps):**
1. **Prisma schema** — `Invoice` (id, restaurantId, customerId, invoiceNumber, items JSON array, subtotal, tax, tip, total, depositRequired, depositPaid, status: `'draft' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled'`, dueDate, sentAt, paidAt, notes, eventDate, eventName), `InvoicePayment` (id, invoiceId, amount, method: `'card' | 'cash' | 'check' | 'gift_card'`, reference, processedAt)
2. **Invoice service** — `src/services/invoice.service.ts` — generate sequential invoice numbers (`INV-YYYY-NNNN`), calculate totals from menu items + tax + gratuity, send via email (HTML template with payment link), track payments, overdue detection
3. **Invoice routes** — CRUD + `POST /send` (email) + `POST /payments` (record payment) + `GET /public/:invoiceNumber` (customer-facing payment page — unauthenticated, shows invoice detail + pay button)
4. **Automated reminders** — cron job: send email reminder 3 days before due, on due date, 3 days after due (overdue notice)

**Frontend (3 steps):**
5. **Model + Service** — `invoice.model.ts` + `invoice.ts` — `InvoiceService` with CRUD, send, payments, public view
6. **Invoice Manager component** — `lib/invoicing/invoice-manager/` — invoice list with status filter badges, create form (select customer, add menu items as line items with qty/price, set due date, deposit amount, event details, notes), detail view with payment history, "Send" and "Record Payment" buttons
7. **Register element** — `get-order-stack-invoicing`

**Impact:** Catering is 10-25% of revenue for full-service restaurants. Professional invoicing (vs manual emails/paper) increases conversion and reduces payment delays.

### T5-07. AP Automation + Recipe Costing (xtraCHEF)
**Domain:** Inventory / Finance
**Status:** ✅ COMPLETE (Frontend Session 39)
**Toast charges:** Enterprise add-on (separate pricing)
**Priority:** MEDIUM — Saves 3%+ on food costs

**What Toast does (via xtraCHEF):**
- OCR invoice scanning (photo/PDF → digitized line items within 24 hours)
- Vendor management (track suppliers, price trends over time)
- Recipe costing (ingredients → actual cost per menu item from real purchase data)
- Food cost tracking (actual vs theoretical COGS — theoretical = what it should cost based on recipes, actual = what you really paid based on invoices)
- Accounts payable automation (approve invoices, schedule payments)
- Purchase order management

**Backend (5 steps):**
1. **Prisma schema** — `Vendor` (id, restaurantId, name, contactName, contactEmail, phone, address, notes, isActive), `PurchaseInvoice` (id, restaurantId, vendorId, invoiceNumber, invoiceDate, totalAmount, status: `'pending_review' | 'approved' | 'paid'`, imageUrl, ocrProcessedAt), `PurchaseLineItem` (id, invoiceId, ingredientName, quantity, unit, unitCost, totalCost, normalizedIngredient), `Recipe` (id, menuItemId, restaurantId, name, yieldQty, yieldUnit), `RecipeIngredient` (id, recipeId, ingredientName, quantity, unit, estimatedUnitCost)
2. **Invoice OCR service** — `src/services/invoice-ocr.service.ts` — accept image/PDF upload → Claude Vision API for OCR (extract vendor name, invoice number, date, line items with ingredient, qty, unit, cost), vendor auto-matching by name, ingredient normalization (map "Chx Brst 10lb" → "chicken breast"), price history tracking per ingredient per vendor
3. **Recipe costing service** — `src/services/recipe-costing.service.ts` — link recipe ingredients to purchase line items (fuzzy match on normalized ingredient name), calculate actual cost per recipe (latest purchase prices), compare actual vs AI-estimated cost (from existing T1-06), theoretical food cost % = (recipe cost ÷ menu price × 100), actual COGS = sum of (recipe cost × items sold)
4. **Routes** — vendor CRUD, invoice upload + OCR + review/approve + CRUD, recipe CRUD (per menu item), food cost report (`GET /food-cost-report`: actual vs theoretical by item, trend over time, variance alerts)
5. **Food cost dashboard data** — aggregate actual COGS from invoices vs revenue from sales, food cost % trend, ingredient price variance alerts (>10% increase from vendor)

**Frontend (4 steps):**
6. **Models** — `vendor.model.ts`, `recipe.model.ts` (or extend existing inventory model)
7. **Services** — `VendorService`, `RecipeCostingService`
8. **AP + Recipe Dashboard** — `lib/food-cost/food-cost-dashboard/` — 3 tabs: Invoices (drag-drop upload, OCR results table with edit capability, approve/reject, payment tracking), Vendors (CRUD list, price trend charts per ingredient), Recipes (per menu item: ingredient list builder, actual vs estimated cost comparison, margin calculator)
9. **Register element** — `get-order-stack-food-cost`

**Impact:** xtraCHEF claims 3% average food cost reduction ($330K/year for multi-unit). Recipe costing from real purchase data is dramatically more accurate than AI estimation alone. Vendor price tracking catches supplier price creep.

### T5-08. Multi-Location Management
**Domain:** Settings / All
**Status:** ✅ COMPLETE (Frontend Session 40)
**Toast charges:** Custom pricing
**Priority:** MEDIUM — Required for restaurant groups/chains

**What Toast does:**
- Centralized menu management (push to all or specific locations)
- Cross-location reporting (comparative analytics)
- Location groups (by region, concept, ownership)
- Standardized settings propagation (AI settings, pricing rules, loyalty config)
- Per-location overrides where needed

**Backend (5 steps):**
1. **Prisma schema extensions** — `LocationGroup` (id, restaurantGroupId, name, description), `LocationGroupMember` (id, locationGroupId, restaurantId). Add `isLocalOverride: boolean` and `menuTemplateSourceId: string?` to `MenuItem` for template-based syncing. Add `settingsSourceId: string?` to `Restaurant` for inherited settings.
2. **Menu sync service** — `src/services/menu-sync.service.ts` — push menu from "source" location to targets: create missing items, update matching items (by `menuTemplateSourceId`), preserve items marked `isLocalOverride: true`, generate sync report (added/updated/skipped/conflicts)
3. **Cross-location analytics** — `src/services/cross-location.service.ts` — aggregate sales, labor, inventory, waste across locations. Side-by-side comparison. Rank locations by KPI.
4. **Settings propagation** — push AI settings, pricing rules, loyalty config, delivery settings from group level to member locations. Per-location override flag prevents overwrites.
5. **Routes** — location group CRUD, menu sync (`POST /sync-menu` with source/target params + dry-run option), cross-location report endpoints, settings propagation

**Frontend (3 steps):**
6. **Multi-Location Dashboard** — `lib/multi-location/multi-location-dashboard/` — location switcher (dropdown in header), comparative KPI cards (revenue, labor %, food cost % across locations), group management (create/edit groups, add/remove locations)
7. **Menu Sync UI** — select source location, pick target locations (checkboxes), preview changes (items to add/update/skip), confirm sync button, sync history log
8. **Register element** — `get-order-stack-multi-location`

**Impact:** Multi-location is table stakes for chain restaurants. Without it, each location is a silo — menu changes must be duplicated manually, reporting requires switching between locations.

### T5-09. Advanced Waitlist & Guest Profiles (Toast Tables Enhancement)
**Domain:** Reservations / CRM
**Status:** ✅ COMPLETE (Frontend Session 34 — waitlist tab in ReservationManager)
**Toast charges:** Separate add-on
**Priority:** MEDIUM — Enhances existing reservation system

**What Toast does (beyond basic reservations):**
- Walk-in waitlist with real-time estimated wait times
- 2-way SMS with guests ("Your table is ready!", guest replies "5 min away")
- Server rotation / "next up" seating assignment (fairest cover distribution)
- Guest profiles: VIP tags, dietary notes, preferences, visit history, allergies
- Cover count tracking per server per shift
- Automated waitlist notifications (position updates)

**Backend (4 steps):**
1. **Prisma schema** — `WaitlistEntry` (id, restaurantId, guestName, guestPhone, partySize, estimatedWaitMinutes, quotedWaitMinutes, status: `'waiting' | 'notified' | 'seated' | 'no_show' | 'cancelled'`, joinedAt, notifiedAt, seatedAt, tableId, notes), `GuestProfile` (id, restaurantId, customerId, vipStatus: boolean, dietaryNotes, allergies, seatingPreference, tags JSON, totalVisits, lastVisitDate)
2. **Waitlist service** — `src/services/waitlist.service.ts` — estimate wait time from (average turn time for party size × parties ahead in queue), SMS via Twilio (`POST /sms` — "Your table is ready! Reply ETA or CANCEL"), auto-remove after configurable no-show timeout (default 10 min), position tracking
3. **Server rotation** — track cover count per server per active shift, "next up" algorithm assigns tables to server with fewest covers (fairness), manual override available
4. **Routes** — waitlist CRUD + `POST /notify` (SMS) + `POST /seat` (assign table) + `POST /no-show`, guest profile CRUD (extend existing customer endpoints), server rotation endpoint (`GET /next-server`)

**Frontend (3 steps):**
5. **Waitlist Panel** — new tab in ReservationManager: add walk-in (name, phone, party size), live queue with position numbers + wait estimates, "Notify" button (sends SMS), "Seat" button (assigns table + removes from queue), "No Show" / "Cancel" buttons, SMS conversation thread
6. **Guest Profile enhancements** — extend CRM detail panel: VIP toggle, dietary notes field, allergy tags, seating preference, visit timeline with dates
7. **Server rotation indicator** — in Floor Plan: show "Next Up: [Server Name]" badge, cover count per server, manual reassign

**Impact:** Waitlist management reduces walk-away rate by 30%. 2-way SMS keeps guests engaged. Server rotation prevents section stacking and improves tip equity.

### T5-11. Employee Self-Service Portal
**Domain:** Staff
**Status:** ✅ COMPLETE (Frontend Session 38)
**Priority:** LOW — Only useful after scheduling is built

**What Toast does (MyToast app):**
- View upcoming shifts + past shifts with details
- See earnings by shift and pay period
- Tips breakdown per shift
- Request shift swaps
- Update availability preferences

**Frontend (2 steps — depends on T5-03 backend):**
1. **Staff Portal component** — `lib/staff/staff-portal/` — PIN login (reuse existing), 3 tabs: My Schedule (calendar view of upcoming shifts, past shift history with hours/tips/earnings), Availability (day-of-week editor), Swap Requests (request swap on a shift, view pending incoming swaps, approve/reject)
2. **Register element** — `get-order-stack-staff-portal`

**Impact:** Employee satisfaction + reduced manager overhead for schedule inquiries. Toast's MyToast app is one of their stickiest features (employees use it daily).

### Non-Gaps (No Implementation Needed)

**Website Builder (Toast Digital Storefront):** Get-Order-Stack deploys on WordPress, which is a far more capable and customizable website platform than Toast's drag-and-drop builder. The Online Order Portal already embeds on any WordPress page. SEO, themes, plugins, and custom PHP templates are all superior. **No action needed.**

**Fraud Detection (Toast Payment Security):** Stripe Radar and PayPal's built-in fraud protection already handle real-time transaction fraud monitoring. The MonitoringAgent already detects revenue anomalies and discount abuse patterns. **No action needed** — optionally add void/discount abuse rules to MonitoringService.

### Tier 5 Implementation Priority

| # | Feature | Effort | Backend | Revenue Impact | Toast Charges | Status |
|---|---------|--------|---------|----------------|---------------|--------|
| T5-01 | Gift Cards | 3-4 days | ✅ Deployed | Direct revenue | $50/mo | ✅ COMPLETE |
| T5-04 | QR Tableside Order & Pay | 2-3 days | Uses existing | Reduces labor, +15-20% check | Included | ✅ COMPLETE |
| T5-05 | Kiosk Mode | 2-3 days | Uses existing | +15-30% order value | Hardware | ✅ COMPLETE |
| T5-02 | Email Marketing | 4-5 days | ✅ Deployed | 15-25% repeat visits | $75/mo | ✅ COMPLETE |
| T5-03 | Employee Scheduling | 5-7 days | ✅ Deployed | Saves $500-2K/mo labor | $90/mo + $9/ee | ✅ COMPLETE |
| T5-06 | Invoicing | 3-4 days | ✅ Deployed | Catering revenue | Included | ✅ COMPLETE |
| T5-09 | Waitlist + Guest Profiles | 3-4 days | Uses existing | Better table utilization | Add-on | ✅ COMPLETE |
| T5-07 | AP Automation + Recipe Costing | 5-7 days | New schema + Claude Vision | 3%+ food cost savings | Enterprise | ✅ COMPLETE |
| T5-08 | Multi-Location | 4-5 days | Schema extensions + sync | Required for chains | Custom | ✅ COMPLETE |
| T5-11 | Employee Self-Service | 2-3 days | Depends on T5-03 (done) | Employee satisfaction | Included | ✅ COMPLETE |
| | **COMPLETED** | **~30-35 days** | | | | **10/10** |

### Tier 5 Files Impact Summary — ACTUAL (Sessions 33-37)

**New frontend files (~80):**
- 10 new model files (cash-drawer, combo, gift-card, invoice, labor, marketing, station, vendor, multi-location, + staff portal models)
- 10 new service files (cash-drawer, check, combo, gift-card, invoice, labor, marketing, station, vendor, recipe-costing, multi-location)
- ~25 new component directories (pos/server-pos-terminal, pos/modifier-prompt, pos/discount-modal, pos/void-modal, pos/manager-pin-prompt, pos/cash-drawer, pos/order-pad, reports/close-of-day, kiosk/kiosk-terminal, labor/staff-scheduling, marketing/campaign-builder, invoicing/invoice-manager, menu-mgmt/combo-management, settings/station-settings, settings/gift-card-management, settings/delivery-settings, staff/staff-portal, food-cost/food-cost-dashboard, multi-location/multi-location-dashboard)

**New backend files (Session 37):**
- 4 new route files (gift-card.routes.ts, invoice.routes.ts, marketing.routes.ts, combo.routes.ts)
- 8 new Prisma models (GiftCard, GiftCardRedemption, Invoice, InvoiceLineItem, HouseAccount, Campaign, CampaignPerformance, Combo)
- Check management routes (check.routes.ts) also deployed

**New custom elements (12 added in Sessions 33-40):** `get-order-stack-pos-terminal`, `get-order-stack-close-of-day`, `get-order-stack-cash-drawer`, `get-order-stack-kiosk`, `get-order-stack-scheduling`, `get-order-stack-campaign-builder`, `get-order-stack-invoice-manager`, `get-order-stack-combo-management`, `get-order-stack-staff-portal`, `get-order-stack-order-pad`, `get-order-stack-food-cost`, `get-order-stack-multi-location`

**T5-07/T5-08 backend COMPLETE (Session 42):** vendor CRUD (4 routes), purchase invoice CRUD + Claude Vision OCR upload (7 routes), recipe CRUD with ingredient costing (4 routes), food cost report with theoretical vs actual COGS + price spike alerts (1 route), location group CRUD (4 routes), member management (3 routes), cross-location KPI report (1 route), menu sync preview/execute/history (3 routes), settings propagation (1 route) — 28 endpoints total, 8 new Prisma models (Vendor, PurchaseInvoice, PurchaseLineItem, FoodCostRecipe, FoodCostRecipeIngredient, LocationGroup, LocationGroupMember, MenuSyncLog), deployed to Render

---

## Implementation Priority

| # | Feature | Effort | Sprint | Backend Work | Status |
|---|---------|--------|--------|-------------|--------|
| T1-01 | AI Upsell Bar | 1-2 days | 1 | None | ✅ COMPLETE |
| T1-06 | AI Cost in Menu Mgmt | 1-2 days | 1 | None | ✅ COMPLETE |
| T1-04 | Order Profit Insights | 1 day | 1 | None | ✅ COMPLETE |
| T1-07 | Payment Integration (PayPal + Stripe) | 3-4 days | 2 | ✅ All endpoints ready | ✅ COMPLETE |
| T1-08 | Receipt Printing (CloudPRNT) | 2-3 days | 2 | CloudPRNT API | ✅ COMPLETE |
| CP | Control Panel Tabs (AI Settings, Online Pricing, Catering Calendar) | 1 day | — | PATCH settings | ✅ COMPLETE |
| CS | Course System UI (PendingOrders display + fire, OrderNotifications chime, duplicate notification bugfix, Course Pacing Mode Selector, KDS Recall Ticket) | 1 day | — | None | ✅ COMPLETE |
| EX | Expo Station (KDS 4-column layout, AI Settings toggle, expo check → print trigger, toggle-off safety) | 0.5 day | — | None | ✅ COMPLETE |
| EC | Edge Cases (Catering Approval Timeout, Offline Mode order queue) | 1 day | — | None | ✅ COMPLETE |
| T1-02 | Menu Engineering Dashboard | 3-4 days | 2 | None | ✅ COMPLETE |
| T1-03 | Sales Dashboard | 3-4 days | 3 | None | ✅ COMPLETE |
| T1-05 | Inventory Dashboard | 5-7 days | 3-4 | None | ✅ COMPLETE |
| T2-06 | Table Floor Plan | 3-4 days | 4 | None | ✅ COMPLETE |
| T2-01 | Smart KDS | 3-4 days | 4-5 | New endpoint | ✅ COMPLETE |
| T2-04 | Multi-Device Station Routing | 2-3 days | — | Station CRUD + mapping | ✅ COMPLETE |
| T2-02 | Auto-86 System | 2-3 days | 5 | WebSocket event | ✅ COMPLETE |
| T2-03 | Enhanced Menu Cards | 1-2 days | 5 | New endpoint | ✅ COMPLETE |
| T3-01 | AI Command Center | 5-7 days | 6-7 | Aggregation endpoint | ✅ COMPLETE |
| T3-02 | Customer CRM | 5-7 days | 7-8 | Search/segment endpoints | ✅ COMPLETE |
| T3-06 | AI Chat Assistant | 7-10 days | 8-9 | ChatService + tool-use | ✅ COMPLETE |
| T3-04 | Online Ordering | 10+ days | 9-11 | Minor additions | ✅ COMPLETE |
| T3-03 | Labor Intelligence | — | — | — | ⏭️ SUPERSEDED by T5-03 |
| T3-05 | Reservations AI | 5-7 days | 12-13 | AI prediction endpoint | ✅ COMPLETE |
| T4-01 | Autonomous Agent | 7-10 days | 14+ | Background job system | ✅ COMPLETE |
| T4-02 | Voice Ordering | 7-10 days | 15+ | NLP endpoint | ✅ COMPLETE |
| T4-03 | Dynamic Pricing | 5-7 days | 16+ | New schema | ✅ COMPLETE |
| T4-04 | Waste Reduction | 5-7 days | 17+ | New schema + service | ✅ COMPLETE |
| T4-05 | Sentiment Analysis | 3-5 days | 18+ | NLP pipeline | ✅ COMPLETE |
| LY | Loyalty Program (config, tiers, rewards, points, redemption) | 2-3 days | — | ✅ Prisma + routes + validators | ✅ COMPLETE |
| T5-01 | Gift Card System | 3-4 days | — | ✅ 6 routes deployed | ✅ COMPLETE |
| T5-04 | QR Tableside Order & Pay | 2-3 days | — | None (uses existing) | ✅ COMPLETE |
| T5-05 | Kiosk Self-Ordering Mode | 2-3 days | — | None (uses existing) | ✅ COMPLETE |
| T5-02 | Email/SMS Marketing Campaigns | 4-5 days | — | ✅ 8 routes deployed | ✅ COMPLETE |
| T5-03 | Employee Scheduling + Time Clock | 5-7 days | — | ✅ Labor routes deployed | ✅ COMPLETE |
| T5-06 | Invoicing (Catering/Events) | 3-4 days | — | ✅ 10 routes deployed | ✅ COMPLETE |
| T5-09 | Waitlist + Guest Profiles | 3-4 days | — | Uses existing reservation routes | ✅ COMPLETE |
| POS | Server POS Terminal + Check Mgmt | 5-7 days | — | ✅ Check routes deployed | ✅ COMPLETE |
| COD | Close of Day + Cash Drawer | 2-3 days | — | None (client-side) | ✅ COMPLETE |
| CMB | Combos/Bundles | 2-3 days | — | ✅ 4 routes deployed | ✅ COMPLETE |
| T5-07 | AP Automation + Recipe Costing | 5-7 days | — | New schema + Claude Vision OCR | ✅ COMPLETE |
| T5-08 | Multi-Location Management | 4-5 days | — | Schema extensions + sync | ✅ COMPLETE |
| T5-11 | Employee Self-Service Portal | 2-3 days | — | Depends on T5-03 (now complete) | ✅ COMPLETE |

---

## Next Task (Current Focus)

✅ **Completed (Sessions 26-35):** Marketplace Phases 1-5, KDS optimization (course pacing, throttling, station routing), delivery credential encryption, pilot verification tooling.

✅ **Completed (Sessions 33-36):** Toast POS Parity Plan — all 4 phases, 18 steps:
- **Phase 1 (Session 33):** Server POS Terminal with check management (12 POS modal/component files), floor plan POS actions, tab support with pre-auth
- **Phase 2 (Session 34):** Close-of-Day reports, Cash Drawer management, QR tableside ordering, Kiosk self-service, credit card surcharging
- **Phase 3 (Session 35):** Employee Scheduling + time clock, Waitlist management, Gift Card system
- **Phase 4 (Session 36):** Email/SMS Marketing campaigns, Invoicing with house accounts, Combo/bundle management

✅ **Completed (Session 37):** Phase 2 Backend — Gift Cards (6 routes), Invoices (10 routes), Marketing (8 routes), Combos (4 routes) + Check Management deployed to Render (`df41bfb`). 8 new Prisma models, database synced.

**ALL Tier 5 features COMPLETE (10/10).**

**Pending items:**
- ~~Backend endpoints for T5-07~~ ✅ COMPLETE (Session 42 — 16 endpoints deployed)
- ~~Backend endpoints for T5-08~~ ✅ COMPLETE (Session 42 — 12 endpoints deployed)
- ~~Frontend-backend endpoint gaps~~ ✅ COMPLETE (Session 43 — marketing URL fix, 6 staff portal endpoints + 2 Prisma models built/deployed, invoice send already existed)
- Marketplace pilot rollout execution (verification tooling complete, pending cohort selection)
- Tenant-isolated credential encryption Phase B (managed KMS adapter pending paid service)

### Detailed Plan (Current Focus): Marketplace Pilot Rollout Execution

**Goal:** Complete live pilot validation now that Marketplace Phase 2 build work is implemented.

**Progress:** Phases 1-4 are complete (Sessions 30-33). Phase 5 tooling is complete (Sessions 34-35). Remaining work is live rollout execution once pilot restaurants are assigned.

**Phase 1 — Control Panel Marketplace Integration (Frontend + Existing Backend APIs)**
1. ✅ Implemented in Sessions 30-33.

**Phase 2 — Menu Mapping + Inbound Quality Hardening**
1. ✅ Implemented in Session 31.

**Phase 3 — Outbound Marketplace Status Sync**
1. ✅ Implemented in Session 32.

**Phase 4 — Operator UX in KDS/Orders**
1. ✅ Implemented in Session 33.

**Phase 5 — Verification + Pilot Rollout**
1. ✅ Add webhook contract + end-to-end verification script (`scripts/verify-marketplace-phase5.ts`) for provider signature/idempotency/order-flow checks.
2. ✅ Add operational runbook (`docs/MARKETPLACE-PHASE5-VERIFICATION.md`) for execution inputs and pass/fail interpretation.
3. ✅ Add pilot monitoring + stop/go gates (`/marketplace/pilot/summary`, `npm run pilot:marketplace:gates`).
4. 🚧 Execute rollout in sequence: DoorDash pilot restaurant(s) -> Uber Eats pilot -> broader cohort expansion.
   - Blocker: no pilot restaurants are currently assigned.
5. Keep Grubhub feature-gated and disabled unless partnership/API access is confirmed.

**Exit Criteria**
1. Inbound marketplace orders are idempotent, auditable, and consistently mapped to internal menu items.
2. Outbound status updates succeed with retries and observable failure states.
3. Operators can identify and triage marketplace orders in normal KDS workflow without ambiguity.
4. Pilot restaurants complete live validation with no critical ingestion/sync regressions.

### Detailed Plan (In Scope): Tenant-Isolated Credential Encryption (Free Now, KMS-Ready)

**Status:** `IN PROGRESS` (dual-mode foundation implemented; managed backend live verification and full migration tooling pending).
- **Free mode:** implemented and selectable.
- **Most secure mode:** implemented as mode + backend contract + gating; live managed backend validation is pending paid/service setup.
- **Migration scope rule:** based on credential rows (`restaurantDeliveryCredentials`), not an "active restaurant" flag.

**Testing Constraint (Current Reality)**
1. Most implementation can be completed now.
2. End-to-end verification against a real managed KMS/Vault service is constrained until paid/external service is provisioned.

**Non-Negotiable Constraints**
1. No key columns added to the `Restaurant` table.
2. Use neutral dedicated tables:
`restaurant_provider_profiles`, `restaurant_provider_profile_events`.
3. Keep backend architecture KMS-ready so Phase B is an adapter swap + re-wrap flow.

**Implementation Checklist (and Current Completion)**
1. ✅ **Control Plane + UI switch:** Delivery Control Panel supports `free` vs `most_secure` mode selection, save, and backend readiness gating.
2. ✅ **Neutral schema:** `restaurant_provider_profiles` and `restaurant_provider_profile_events` added with relations/indexes.
3. ✅ **Dual-mode credential crypto path:** backend supports versioned encrypted payloads with backend marker and mode-based re-encryption on switch.
4. ✅ **Security profile APIs:** read/update endpoints implemented for credential security mode.
5. ✅ **Provider profile/audit writes:** credential save/clear and mode switch now update profile metadata/events.
6. ✅ **Backend abstraction scaffolding:** key management types/service skeleton added (`vault_oss` + `managed_kms` contract).
7. 🚧 **Managed backend adapter (real external service):** wire to real AWS/GCP/Vault API and validate live health/readiness semantics.
8. ✅ **Legacy migration tooling:** added migration command `npm run migrate:delivery:profiles` (dry-run by default; supports targeted run env vars).
9. 🚧 **Cutover hardening:** startup guard added (`DELIVERY_REQUIRE_MOST_SECURE`) but legacy fallback removal remains pending post-soak.
10. 🚧 **Full security test matrix:** unit/integration coverage for mode switch rollback, migration resume, and managed backend outage behavior.

**Detailed Execution Plan (No "Active Restaurant" Dependency)**
1. **Target set definition (credentials-first)**
   - Scope migration by data presence, not business status.
   - Source set: every row in `restaurantDeliveryCredentials`; optional single-target override by `DELIVERY_PROFILE_MIGRATE_RESTAURANT_ID`.
   - If no rows exist, migration is a no-op and considered successful.
2. **Pre-migration safety checks**
   - Validate required env for selected backend (`free` requires free-wrapping source; `most_secure` requires managed wrapping key).
   - Record baseline counts for `restaurant_delivery_credentials`, `restaurant_provider_profiles`, and `restaurant_provider_profile_events`.
   - Keep dry-run as default (`DELIVERY_PROFILE_MIGRATE_DRY_RUN=true`) for first pass in each environment.
3. **Dry-run verification pass**
   - Run `npm run migrate:delivery:profiles` in dry-run mode across all credential rows.
   - Verify output includes: row count, backend selection, and `failures=0`.
   - Resolve decryption/key issues before any write pass.
4. **Write migration pass**
   - Run with `DELIVERY_PROFILE_MIGRATE_DRY_RUN=false`.
   - Expected writes per restaurant: credential ciphertext refresh + doordash profile upsert + uber profile upsert + corresponding events.
   - Capture post-run summary (`updatedRows`, `migratedProfiles`, `failures`) and store in deployment notes.
5. **Post-migration validation**
   - API smoke: credential status endpoint still reports correct configured/not-configured state per provider.
   - DB checks: each migrated restaurant has `doordash` and `uber` rows in `restaurant_provider_profiles`.
   - Audit checks: migration events exist in `restaurant_provider_profile_events` with `action=migration_profile_sync`.
6. **Cutover hardening**
   - Keep legacy decrypt compatibility temporarily for rollback window.
   - After soak and successful reads/writes, remove legacy payload fallback path and require versioned payload format.
   - Enforce startup guard in strict environments with `DELIVERY_REQUIRE_MOST_SECURE=true`.
7. **Test completion gates**
   - Add/finish tests for mode-switch rollback on partial failure.
   - Add migration resume/idempotency tests (safe rerun semantics).
   - Add managed-backend-unavailable tests (`most_secure` selection blocked, no partial writes).

**Immediate Next Task (Updated)**
1. Run the credential migration dry-run against all rows in the target environment and capture summary counts.
2. If `failures=0`, execute write mode (`DELIVERY_PROFILE_MIGRATE_DRY_RUN=false`) and record post-run counts/events.

**Execution Phases**
1. **Phase A (now / pre-revenue):** free mode production hardening + migration tooling.
2. **Phase B (future / paid scale):** managed external key service (`AWS KMS` / `GCP KMS` / managed `Vault`) live adapter + key re-wrap + rollout.

**Acceptance Criteria**
1. Free and most-secure modes are both operationally switchable via Control Panel (with readiness checks).
2. Mode switch is auditable and credential material is re-encrypted to the selected backend.
3. Managed backend cutover requires no schema redesign.
4. Remaining test gap is explicitly limited to live managed-service verification until service is provisioned.

---

## Services & Models Inventory — ✅ ALL IMPLEMENTED

**Services (28 total):** `AnalyticsService`, `AuthService`, `CartService`, `CashDrawerService`, `ChatService`, `CheckService`, `ComboService`, `CustomerService`, `DeliveryService`, `GiftCardService`, `InventoryService`, `InvoiceService`, `LaborService`, `LoyaltyService`, `MarketingService`, `MenuService`, `MonitoringService`, `MultiLocationService`, `OrderService`, `PaymentService`, `PrinterService`, `RecipeCostingService`, `ReservationService`, `RestaurantSettingsService`, `SocketService`, `StationService`, `TableService`, `TipService`, `VendorService`

**Payment Providers (2):** `StripePaymentProvider`, `PayPalPaymentProvider` — plain classes (not Angular services) implementing `PaymentProvider` interface, used by `PaymentService` orchestrator

**Delivery Providers (2):** `DoorDashDeliveryProvider`, `UberDeliveryProvider` — plain classes implementing `DeliveryProvider` interface, used by `DeliveryService` orchestrator

**Models (32 files):** `analytics.model.ts`, `auth.model.ts`, `cart.model.ts`, `cash-drawer.model.ts`, `chat.model.ts`, `combo.model.ts`, `customer.model.ts`, `delivery.model.ts`, `dining-option.model.ts`, `gift-card.model.ts`, `inventory.model.ts`, `invoice.model.ts`, `labor.model.ts`, `loyalty.model.ts`, `marketing.model.ts`, `menu.model.ts`, `monitoring.model.ts`, `multi-location.model.ts`, `order.model.ts`, `payment.model.ts`, `pricing.model.ts`, `printer.model.ts`, `reservation.model.ts`, `restaurant.model.ts`, `sentiment.model.ts`, `settings.model.ts`, `station.model.ts`, `table.model.ts`, `tip.model.ts`, `vendor.model.ts`, `voice.model.ts`, `waste.model.ts`

**Custom Elements (35 registered in main.ts):** `get-order-stack-login`, `get-order-stack-restaurant-select`, `get-order-stack-sos-terminal`, `get-order-stack-kds-display`, `get-order-stack-command-center`, `get-order-stack-menu-engineering`, `get-order-stack-sales-dashboard`, `get-order-stack-inventory-dashboard`, `get-order-stack-category-management`, `get-order-stack-item-management`, `get-order-stack-floor-plan`, `get-order-stack-control-panel`, `get-order-stack-crm`, `get-order-stack-reservations`, `get-order-stack-ai-chat`, `get-order-stack-online-ordering`, `get-order-stack-monitoring-agent`, `get-order-stack-voice-order`, `get-order-stack-dynamic-pricing`, `get-order-stack-waste-tracker`, `get-order-stack-sentiment`, `get-order-stack-pending-orders`, `get-order-stack-order-history`, `get-order-stack-pos-terminal`, `get-order-stack-order-pad`, `get-order-stack-close-of-day`, `get-order-stack-cash-drawer`, `get-order-stack-kiosk`, `get-order-stack-scheduling`, `get-order-stack-campaign-builder`, `get-order-stack-invoice-manager`, `get-order-stack-combo-management`, `get-order-stack-staff-portal`, `get-order-stack-food-cost`, `get-order-stack-multi-location`

---

## Key Files

| File | Role |
|------|------|
| `library/src/lib/services/menu.ts` | Pattern reference for new services; extend with AI cost methods |
| `library/src/lib/sos/sos-terminal/sos-terminal.ts` | Main container — add nav items, AI upsell |
| `library/src/lib/sos/upsell-bar/upsell-bar.ts` | Replace static input with AI-driven data |
| `library/src/lib/services/order.ts:187` | `getProfitInsight()` — already built, never called |
| `elements/src/main.ts` | Register all new custom elements |
| Backend: `src/app/analytics.routes.ts` | All analytics endpoints (defines response shapes) |
| Backend: `src/services/menu-engineering.service.ts` | Defines interfaces frontend models must mirror |
| Backend: `src/services/sales-insights.service.ts` | Defines sales report interfaces |
| Backend: `src/services/inventory.service.ts` | Full inventory + predictions |
| Backend: `src/services/stripe.service.ts` | Stripe payment processing |
| Backend: `src/services/paypal.service.ts` | PayPal Orders v2 payment processing |
| `library/src/lib/services/providers/` | PayPal + Stripe payment provider implementations |
| `library/src/lib/settings/payment-settings/` | Payment processor selection UI |
| `library/src/lib/services/tip.ts` | TipService — reactive tip pooling/compliance computation engine |
| `library/src/lib/tip-mgmt/tip-management/` | Tip Management 4-tab dashboard (reports, pool rules, tip-out, compliance) |
| `library/src/lib/services/loyalty.ts` | LoyaltyService — config, rewards CRUD, points, phone lookup |
| `library/src/lib/settings/loyalty-settings/` | Loyalty config UI (enable, points/dollar, tiers, redemption) |
| `library/src/lib/settings/rewards-management/` | Rewards CRUD table with tier badges |

---

## Verification

For each tier, verify by:
1. **T1 features:** Call the backend endpoint directly (`curl` or Playwright) to confirm response shape, then build frontend component, `ng serve` the elements app, and verify data renders
2. **T2 features:** Test backend additions with Postman/curl first, then verify frontend integration
3. **T3/T4 features:** Create backend service with unit tests, verify endpoints, then build frontend
4. **All features:** Check WebSocket events in browser DevTools Network tab, verify signals update reactively
