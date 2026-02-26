# OrderStack — Comprehensive Test Plan

> Generated: February 25, 2026
> Framework: Vitest 4.0.18 + jsdom
> Project: Angular 21 standalone components, signal-based state, zoneless

---

## Table of Contents

1. [Project Map](#1-project-map)
2. [Existing Test Inventory](#2-existing-test-inventory)
3. [Coverage Gap Analysis](#3-coverage-gap-analysis)
4. [Prioritized Test Plan](#4-prioritized-test-plan)
5. [Estimated Test Files Per Area](#5-estimated-test-files-per-area)

---

## 1. Project Map

### 1.1 Components (103 total)

| Feature Area | Components | Files |
|---|---|---|
| **Auth** | Login, PosLogin, RestaurantSelect | 3 |
| **Home** | HomeDashboard, HardwareGuide | 2 |
| **Orders** | PendingOrders, OrderHistory, ReceiptPrinter | 3 |
| **POS** | ServerPosTerminal, OrderPad, CashDrawer, CustomerDisplay, ModifierPrompt, VoidModal, DiscountModal, ManagerPinPrompt | 8 |
| **KDS** | KdsDisplay, OrderCard, StatusBadge | 3 |
| **SOS (Self-Order Station)** | SosTerminal, MenuDisplay, MenuItemCard, CartDrawer, CheckoutModal, OrderNotifications, UpsellBar | 7 |
| **Menu Management** | MenuManagement, CategoryManagement, ItemManagement, ComboManagement, ModifierManagement, ScheduleManagement | 6 |
| **Inventory** | InventoryDashboard | 1 |
| **Analytics** | CommandCenter, MenuEngineeringDashboard, SalesDashboard | 3 |
| **Reports** | CloseOfDay, ReportBuilder, ReportDashboard | 3 |
| **CRM** | CustomerDashboard | 1 |
| **Marketing** | CampaignBuilder | 1 |
| **Labor** | StaffScheduling | 1 |
| **Reservations** | ReservationManager, BookingWidget | 2 |
| **Table Management** | FloorPlan | 1 |
| **Retail** | CatalogManagement, RetailPOS, RetailInventory, RetailReports, Returns, PurchaseOrders, VendorManagement, VariationEditor, FulfillmentDashboard | 9 |
| **Retail Ecommerce** | ProductList, ProductDetail, RetailCheckout | 3 |
| **Settings** | ControlPanel + 19 child settings components (DeviceHub, AiSettings, KitchenOrders, OnlinePricing, PaymentSettings, TipManagement, LoyaltySettings, DeliverySettings, GiftCardManagement, StaffManagement, BreakConfig, AccountBilling, PrinterSettings, StationSettings, RewardsManagement, AutoGratuitySetting, DeviceManagement, CancelSubscription, CateringCalendar) | 20 |
| **Onboarding** | SetupWizard, DeviceSetup | 2 |
| **Online Ordering** | OnlineOrderPortal, CustomerPortal, ScanToPay, GuestCheck | 4 |
| **AI/Voice** | ChatAssistant, VoiceOrder | 2 |
| **Other** | DynamicPricing, MonitoringAgent, WasteTracker, SentimentDashboard, InvoiceManager, KioskTerminal, MultiLocationDashboard, StaffPortal, TipManagement | 9 |
| **Layouts** | MainLayout, AuthLayout | 2 |
| **Shared** | LoadingSpinner, ErrorDisplay, ConnectionStatus | 3 |

### 1.2 Services (42 total)

#### Core (5)
| Service | Lines | State Pattern | HTTP Calls |
|---|---|---|---|
| AuthService | ~400 | Signals | 5 endpoints |
| PlatformService | ~600 | Signals + computed | 6 endpoints |
| SocketService | ~300 | Signals | WebSocket (Socket.io) |
| CartService | ~350 | Signals (local only) | None |
| PWAInstallService | ~50 | Signals (local only) | None |

#### Order Flow (4)
| Service | Lines | HTTP Calls |
|---|---|---|
| OrderService | 1,781 | 20+ endpoints |
| CheckService | 541 | 15+ endpoints |
| PaymentService | ~400 | 3 endpoints + providers |
| PaymentConnectService | ~200 | 6 endpoints |

#### Menu & Catalog (4)
| Service | Lines | HTTP Calls |
|---|---|---|
| MenuService | 1,045 | 30+ endpoints |
| ComboService | ~200 | 4 endpoints |
| ModifierService | ~250 | 7 endpoints |
| RetailCatalogService | 864 | 25+ endpoints |

#### Retail (3)
| Service | Lines | HTTP Calls |
|---|---|---|
| RetailCheckoutService | 738 | 8 endpoints |
| RetailInventoryService | 471 | 4 endpoints |
| RetailEcommerceService | 496 | 20+ endpoints |

#### Customer & Loyalty (3)
| Service | Lines | HTTP Calls |
|---|---|---|
| CustomerService | 553 | 20+ endpoints |
| LoyaltyService | ~300 | 6 endpoints |
| GiftCardService | ~250 | 8 endpoints |

#### Inventory & Labor (3)
| Service | Lines | HTTP Calls |
|---|---|---|
| InventoryService | 397 | 16 endpoints |
| LaborService | 1,497 | 17+ endpoints |
| StaffManagementService | 493 | 20+ endpoints |

#### Analytics & Reporting (2)
| Service | Lines | HTTP Calls |
|---|---|---|
| AnalyticsService | 859 | 28 endpoints |
| ReportService | 689 | 6 endpoints |

#### Delivery & Integrations (1)
| Service | Lines | HTTP Calls |
|---|---|---|
| DeliveryService | 1,217 | 15+ endpoints |

#### Settings & Devices (4)
| Service | Lines | HTTP Calls |
|---|---|---|
| RestaurantSettingsService | 653 | 17 endpoints |
| DeviceService | 661 | 10+ endpoints |
| PrinterService | ~150 | 5 endpoints |
| StationService | ~200 | 6 endpoints |

#### Other (13)
| Service | Lines | Purpose |
|---|---|---|
| CashDrawerService | 486 | Cash management (localStorage) |
| ReservationService | 844 | Reservations + waitlist |
| TableService | ~200 | Table layout management |
| MultiLocationService | 603 | Multi-branch operations |
| MarketingService | ~300 | Campaigns + automations |
| VendorService | ~200 | Supplier management |
| InvoiceService | ~300 | Invoicing + house accounts |
| RecipeCostingService | ~150 | AI recipe costing |
| ChatService | ~100 | AI chat |
| MonitoringService | ~150 | System health |
| TipService | ~200 | Tip management |
| SubscriptionService | ~150 | Plan management |
| RecipeCostingService | ~150 | Cost estimation |

### 1.3 Guards (4)

| Guard | File | Logic |
|---|---|---|
| `authGuard` | guards/auth.guard.ts | Checks `isAuthenticated()`, redirects to /signup |
| `guestGuard` | guards/guest.guard.ts | Redirects authenticated users to /home |
| `onboardingGuard` | guards/onboarding.guard.ts | Ensures merchant profile loaded, redirects to /setup |
| `deviceModeRedirectGuard` | guards/device-mode.guard.ts | Redirects to /home (placeholder) |

### 1.4 Interceptors (1)

| Interceptor | Logic |
|---|---|
| `authInterceptor` | Attaches Bearer token, catches 401s, triggers session expiry |

### 1.5 Pipes & Directives

None. The project uses Angular built-in pipes and template control flow exclusively.

### 1.6 Routes (49 total)

#### Public (12)
| Path | Component | Guard |
|---|---|---|
| `/signup`, `/login` | Login | guestGuard |
| `/order/:restaurantSlug` | OnlineOrderPortal | — |
| `/kiosk/:restaurantSlug` | KioskTerminal | — |
| `/staff` | StaffPortal | — |
| `/guest-check` | GuestCheck | — |
| `/account/:restaurantSlug` | CustomerPortal | — |
| `/pay/:checkToken` | ScanToPay | — |
| `/customer-display` | CustomerDisplay | — |
| `/shop/:storeSlug` | ProductList | — |
| `/shop/:storeSlug/product/:productId` | ProductDetail | — |
| `/shop/:storeSlug/checkout` | RetailCheckout | — |

#### Authenticated (4)
| Path | Component | Guard |
|---|---|---|
| `/setup` | SetupWizard | authGuard |
| `/device-setup` | DeviceSetup | authGuard |
| `/pos-login` | PosLogin | authGuard |
| `/select-restaurant` | RestaurantSelect | authGuard |

#### Main App (33 — all auth + onboarding + deviceInit)
`/home`, `/hardware-guide`, `/orders`, `/order-history`, `/order-pad`, `/pos`, `/kds`, `/sos`, `/floor-plan`, `/reservations`, `/menu`, `/combos`, `/inventory`, `/command-center`, `/sales`, `/menu-engineering`, `/close-of-day`, `/reports`, `/customers`, `/marketing`, `/food-cost`, `/scheduling`, `/invoicing`, `/cash-drawer`, `/monitoring`, `/ai-chat`, `/voice-order`, `/dynamic-pricing`, `/waste-tracker`, `/sentiment`, `/retail/*` (10 sub-routes), `/multi-location`, `/settings`

### 1.7 Models (42 files, 500+ types)

Core: `auth`, `order`, `menu`, `restaurant`, `platform`, `cart`, `payment`
Retail: `retail`, `retail-ecommerce`, `retail-inventory`
Operations: `cash-drawer`, `dining-option`, `table`, `invoice`, `pricing`, `vendor`, `reservation`, `station`
CRM: `customer`, `loyalty`, `marketing`, `gift-card`
Staff: `staff-management`, `labor`
Devices: `device`, `printer`, `settings`
Analytics: `analytics`, `report`, `monitoring`, `sentiment`
Integrations: `delivery`, `subscription`
Other: `combo`, `chat`, `voice`, `waste`, `multi-location`, `tip`

### 1.8 API Endpoints (300+ across 29 service files)

| Domain | Endpoints | Key Services |
|---|---|---|
| Auth | 5 | auth.ts |
| Menu | 32 | menu.ts, combo.ts, modifier.ts |
| Orders | 20+ | order.ts, check.ts |
| Payments | 9 | payment.ts, payment-connect.ts |
| Analytics | 28 | analytics.ts |
| Reporting | 6 | report.ts |
| Inventory | 16 | inventory.ts |
| Labor | 17+ | labor.ts |
| Staff | 20+ | staff-management.ts |
| Retail Catalog | 25+ | retail-catalog.ts |
| Retail Ecommerce | 20+ | retail-ecommerce.ts |
| Retail Checkout | 8 | retail-checkout.ts |
| Retail Inventory | 4 | retail-inventory.ts |
| CRM | 20+ | customer.ts |
| Loyalty | 6 | loyalty.ts |
| Gift Cards | 8 | gift-card.ts |
| Delivery | 15+ | delivery.ts |
| Reservations | 15+ | reservation.ts |
| Settings | 17 | restaurant-settings.ts |
| Devices | 10+ | device.ts |
| Marketing | 8 | marketing.ts |
| Platform | 6 | platform.ts |
| Multi-Location | 5 | multi-location.ts |

---

## 2. Existing Test Inventory

### 2.1 Test Files (16 files, 184+ test cases)

| # | File | Tests | What It Covers |
|---|---|---|---|
| 1 | `models/retail-ecommerce.model.spec.ts` | 97 | Type construction for all ecommerce types (ProductListing, EcommerceOrder, ShippingMethod, CartItem, etc.) |
| 2 | `features/retail/ecommerce/product-list/product-list.spec.ts` | 40 | Filtering, sorting, search, cart operations for storefront |
| 3 | `features/onboarding/setup-wizard/setup-wizard.spec.ts` | 32 | Mode auto-detection, business type filtering, step validation |
| 4 | `layouts/main-layout.spec.ts` | 28 | Navigation structure per business mode and vertical |
| 5 | `features/retail/ecommerce/retail-checkout/retail-checkout.spec.ts` | 28 | Cart calculations, shipping, tax, order total, fulfillment |
| 6 | `features/retail/ecommerce/product-detail/product-detail.spec.ts` | 27 | Product selection, pricing, variations, cart |
| 7 | `features/retail/fulfillment/fulfillment-dashboard.spec.ts` | 26 | Order filtering by status, KPI counts, time formatting |
| 8 | `features/reports/close-of-day/close-of-day.spec.ts` | 22 | KPI computation, payment breakdown, top sellers |
| 9 | `features/home/home-dashboard/home-dashboard.spec.ts` | 21 | Setup tasks, progress calculation, KPIs, quick actions |
| 10 | `services/retail-ecommerce.spec.ts` | 49 | Computed filtering, mutations, upserting for ecommerce |
| 11 | `services/delivery.spec.ts` | 13 | Delivery dispatch status labels and tracking state |
| 12 | `features/kds/kds-display/kds-display.spec.ts` | 10 | Auto-dispatch, delivery credentials, quote expiration |
| 13 | `features/pos/modifier-prompt/modifier-prompt.spec.ts` | 9 | Modifier selection, text input, quantity calculations |
| 14 | `services/order.spec.ts` | 9 | `applyOrderTemplate()` — template loading, validation |
| 15 | `services/report.spec.ts` | 6 | `getRealTimeKpis()` — success/failure, error signals |
| 16 | `features/kds/order-card/order-card.spec.ts` | 5 | `canRemake()`, `onRemakeItem()` |

### 2.2 Testing Patterns In Use

- **Pure function extraction** — Component logic broken into testable pure functions
- **Fixture builders** — `makeItem()`, `makeListing()`, `makeOrder()` factory functions
- **TestBed** — Angular DI for component/service tests with mocked dependencies
- **Signal mocking** — `signal()` + `.asReadonly()` for readonly signal inputs
- **HttpClient mocking** — `vi.fn()` returning `of()` observables
- **Timer manipulation** — `vi.useFakeTimers()` / `vi.useRealTimers()`

### 2.3 What IS Covered

| Area | Coverage Level | Notes |
|---|---|---|
| Retail ecommerce (models) | High | 97 tests across all types |
| Retail ecommerce (components) | High | product-list, product-detail, checkout, fulfillment all tested |
| Retail ecommerce (service) | High | 49 tests on computed/filter logic |
| Onboarding wizard | High | 32 tests on mode detection and step validation |
| Navigation/layout | Good | 28 tests across all modes and verticals |
| Close-of-day reports | Good | 22 tests on KPI aggregation |
| Home dashboard | Good | 21 tests on setup tasks and progress |
| KDS display | Partial | 15 tests (auto-dispatch, order card) |
| POS modifier prompt | Partial | 9 tests on selection logic |
| Order service | Minimal | 9 tests (only template application) |
| Delivery service | Minimal | 13 tests (only status labels) |
| Report service | Minimal | 6 tests (only real-time KPIs) |

---

## 3. Coverage Gap Analysis

### 3.1 Critical Gaps (Revenue-Impacting)

| Gap | Risk | Components/Services Affected |
|---|---|---|
| **Order creation and lifecycle** | Orders are the core business object. Only 9 tests exist (templates only). Zero tests for createOrder, updateOrder, cancelOrder, voidOrder, completeOrder. | OrderService (1,781 lines), PendingOrders, OrderHistory |
| **Check splitting/merging** | Full-service restaurants depend on check operations. Zero tests. | CheckService (541 lines), ServerPosTerminal |
| **Payment processing** | No tests for payment flow, multi-processor logic, preauth, refunds. | PaymentService, StripePaymentProvider, PayPalPaymentProvider |
| **Payment Connect onboarding** | No tests for Stripe Connect or PayPal referral flows. | PaymentConnectService |
| **Cart calculations** | No tests for subtotal, tax, tip, surcharge computation. | CartService |
| **POS terminal flow** | No tests for the main POS interface — item adding, check management, payment. | ServerPosTerminal, OrderPad |

### 3.2 High-Priority Gaps (Core Features)

| Gap | Risk | Components/Services Affected |
|---|---|---|
| **Auth flow** | Login, signup, session validation, token refresh, session expiry — zero tests. | AuthService, Login, authGuard, guestGuard, onboardingGuard, authInterceptor |
| **Menu CRUD** | Menu management is a daily operation. No tests for create/update/delete categories, items, variations, schedules. | MenuService (1,045 lines), MenuManagement |
| **KDS full flow** | Only partial coverage. No tests for order routing, bump, priority, station assignment. | KdsDisplay, StationService |
| **Inventory management** | No tests for stock tracking, alerts, predictions, cycle counts, unit conversions. | InventoryService (397 lines) |
| **Labor/scheduling** | No tests for the most complex service after OrderService (1,497 lines). | LaborService, StaffScheduling |
| **Reservation system** | No tests for booking, waitlist, availability, recurring reservations. | ReservationService (844 lines), ReservationManager |

### 3.3 Medium-Priority Gaps

| Gap | Components/Services Affected |
|---|---|
| **Customer/CRM** | CustomerService (553 lines), CustomerDashboard |
| **Marketing campaigns** | MarketingService, CampaignBuilder |
| **Analytics computed values** | AnalyticsService (859 lines), CommandCenter, SalesDashboard |
| **Delivery integration** | DeliveryService (1,217 lines) — only status labels tested |
| **Cash drawer reconciliation** | CashDrawerService (486 lines) — complex local state |
| **Restaurant settings** | RestaurantSettingsService (653 lines), ControlPanel |
| **Retail catalog CRUD** | RetailCatalogService (864 lines) |
| **Retail POS** | RetailPOS, RetailCheckoutService (738 lines) |
| **Multi-location** | MultiLocationService (603 lines) |
| **Device management** | DeviceService (661 lines) |
| **Socket/real-time** | SocketService — WebSocket connection, reconnect, event handling |

### 3.4 Lower-Priority Gaps

| Gap | Components/Services Affected |
|---|---|
| Loyalty/rewards | LoyaltyService, LoyaltySettings |
| Gift cards | GiftCardService, GiftCardManagement |
| Invoicing | InvoiceService, InvoiceManager |
| Vendor management | VendorService, VendorManagement |
| AI chat | ChatService, ChatAssistant |
| Voice ordering | VoiceOrder |
| Dynamic pricing | DynamicPricing |
| Waste tracking | WasteTracker |
| Sentiment analysis | SentimentDashboard |
| Monitoring | MonitoringService, MonitoringAgent |
| Subscription/billing | SubscriptionService, AccountBilling |
| SOS terminal | SosTerminal + 6 child components |
| Online ordering | OnlineOrderPortal, CustomerPortal |
| Tip management | TipService |

### 3.5 Infrastructure Gaps

| Gap | What Needs Testing |
|---|---|
| **Guards** | All 4 guards have zero tests — auth redirect logic, onboarding check, guest redirect |
| **Interceptor** | authInterceptor has zero tests — token injection, 401 handling, session expiry trigger |
| **Platform service** | Complex computed signals (featureFlags, availableModes, enabledModules) — zero tests |
| **Router config** | No tests verifying lazy-loaded route resolution or guard application |
| **Layouts** | AuthLayout has zero tests (MainLayout has 28) |

### 3.6 Coverage by Lines of Code

Services ranked by lines of code with current test coverage:

| Service | Lines | Tests | Coverage |
|---|---|---|---|
| OrderService | 1,781 | 9 (templates only) | **~2%** |
| LaborService | 1,497 | 0 | **0%** |
| DeliveryService | 1,217 | 13 (status labels only) | **~5%** |
| MenuService | 1,045 | 0 | **0%** |
| RetailCatalogService | 864 | 0 | **0%** |
| AnalyticsService | 859 | 0 | **0%** |
| ReservationService | 844 | 0 | **0%** |
| RetailCheckoutService | 738 | 0 | **0%** |
| ReportService | 689 | 6 | **~3%** |
| DeviceService | 661 | 0 | **0%** |
| RestaurantSettingsService | 653 | 0 | **0%** |
| MultiLocationService | 603 | 0 | **0%** |
| CustomerService | 553 | 0 | **0%** |
| CheckService | 541 | 0 | **0%** |
| RetailEcommerceService | 496 | 49 | **~40%** |
| StaffManagementService | 493 | 0 | **0%** |
| CashDrawerService | 486 | 0 | **0%** |
| RetailInventoryService | 471 | 0 | **0%** |

---

## 4. Prioritized Test Plan

### Priority 1 — CRITICAL (Revenue & Core Order Flow)

These are the highest-risk areas. A bug here means lost revenue or broken operations.

#### 1A. OrderService (order.spec.ts — expand)
- `createOrder()` — validates payload, sends POST, updates signal
- `updateOrderStatus()` — all status transitions (pending→preparing→ready→completed)
- `cancelOrder()` / `voidOrder()` — cancellation with reason
- `completeOrder()` — marks complete, updates history
- `addItemToCheck()` / `removeItemFromCheck()` — item manipulation
- `loadOrders()` — fetches and populates signals
- `loadOrderHistory()` — pagination, filtering
- Computed signals: `activeOrders`, `completedOrders`, `totalOpenChecks`, `averageCheckSize`
- Error handling: API failures, network errors
- **Est. tests: 40-50**

#### 1B. CheckService (NEW: check.spec.ts)
- `splitCheckByItem()`, `splitCheckByEqual()`, `splitCheckBySeat()`
- `mergeChecks()` — combines two checks
- `transferCheck()` — moves to different table
- `voidItem()`, `compItem()` — item-level operations
- `applyDiscount()` — percentage and fixed discounts
- `openTab()` / `closeTab()` — tab lifecycle
- `validateManagerPin()` — authorization flow
- **Est. tests: 30-35**

#### 1C. CartService (NEW: cart.spec.ts)
- `addItem()`, `removeItem()`, `updateQuantity()`
- `incrementQuantity()`, `decrementQuantity()` — boundary checks
- Computed: `subtotal`, `tax`, `total`, `itemCount`, `isEmpty`, `surchargeAmount`
- `setTip()`, `setTipPercentage()` — tip calculations
- `setLoyaltyRedemption()` — discount application
- `setSurcharge()` — surcharge toggle and calculation
- `getOrderData()` — payload construction
- `clear()` — full reset
- **Est. tests: 35-40**

#### 1D. PaymentService (NEW: payment.spec.ts)
- `initiatePayment()` — starts payment flow
- `mountPaymentUI()` — renders payment form
- `confirmPayment()` — submits payment
- `cancelPayment()` — cancels in-progress payment
- `requestRefund()` — refund flow
- `preauthorize()` / `capturePreauth()` — pre-auth lifecycle
- `setProcessorType()` — switches between Stripe/PayPal
- `isConfigured()`, `needsExplicitConfirm()` — provider-specific behavior
- Payment step state machine transitions
- Error handling for declined payments, network errors
- **Est. tests: 25-30**

#### 1E. AuthService (NEW: auth.spec.ts)
- `login()` — success, invalid credentials, network error
- `signup()` — success, duplicate email, validation errors
- `logout()` — clears session, redirects
- `validateSession()` — valid token, expired token, network error
- `selectRestaurant()` — sets active restaurant
- `handleSessionExpired()` — clears state, navigates to login
- `setSession()` — localStorage persistence
- Session restoration on app load
- **Est. tests: 25-30**

### Priority 2 — HIGH (Daily Operations)

#### 2A. MenuService (NEW: menu.spec.ts)
- Category CRUD: create, update, delete, reorder
- Item CRUD: create, update, delete, toggle 86'd
- Variation CRUD: create, update, delete
- Schedule management: create, update, delete, set active
- Daypart logic: `assignItemsToDaypart()`, `removeItemsFromDaypart()`, `previewMenuAt()`
- AI features: `estimateItemCost()`, `generateItemDescription()`
- Import/export: CSV import, CSV export
- Computed: `activeCategories`, `allItems`, `availableItems`, `activeDayparts`
- **Est. tests: 45-50**

#### 2B. Guards & Interceptor (NEW: guards.spec.ts, auth.interceptor.spec.ts)
- `authGuard` — authenticated passes, unauthenticated redirects to /signup
- `guestGuard` — unauthenticated passes, authenticated redirects to /home
- `onboardingGuard` — profile loaded passes, missing profile redirects to /setup, fallback load
- `authInterceptor` — token attached, 401 triggers session expiry, login endpoint excluded
- **Est. tests: 20-25**

#### 2C. PlatformService (NEW: platform.spec.ts)
- `loadMerchantProfile()` — success, error
- `saveMerchantProfile()` — success, validation error
- `setDeviceMode()` — mode switching logic
- Computed signals: `featureFlags`, `availableModes`, `enabledModules`, `isRestaurantMode`, `isRetailMode`
- Feature flag overrides
- `lookupTaxRate()` — tax rate resolution
- **Est. tests: 25-30**

#### 2D. KDS Full Flow (expand kds-display.spec.ts)
- Order routing to correct station
- Bump (mark item done)
- Priority ordering
- Course firing
- Timer accuracy (prep time tracking)
- **Est. tests: 15-20**

#### 2E. InventoryService (NEW: inventory.spec.ts)
- `loadReport()`, `loadItems()` — data loading
- `updateStock()`, `recordUsage()`, `recordRestock()` — stock mutations
- `loadAlerts()` — low stock alerts
- `loadPredictions()`, `predictItem()` — stock prediction
- Cycle count lifecycle: start, submit
- Expiring items, unit conversions
- **Est. tests: 25-30**

#### 2F. LaborService (NEW: labor.spec.ts)
- Schedule CRUD: create, update, delete shifts
- Timecard lifecycle: clock in, clock out, edit
- PTO requests: create, approve, deny
- Compliance alerts and summary
- Commission rules CRUD
- Labor forecasting
- Payroll periods
- **Est. tests: 35-40**

### Priority 3 — MEDIUM (Feature Completeness)

#### 3A. CustomerService (NEW: customer.spec.ts)
- Customer CRUD, search, tags
- Address management (save, delete)
- Feedback: send request, load, respond
- Referral config
- Smart groups: CRUD, refresh counts
- Messaging: threads, send, mark read, templates
- OTP flow: send, verify
- Computed: `totalUnreadMessages`, `customerCount`, `averageNps`
- **Est. tests: 30-35**

#### 3B. CashDrawerService (NEW: cash-drawer.spec.ts)
- Open/close drawer lifecycle
- Event recording: cash sale, paid out, drop, tip payout, petty cash
- Denomination tracking
- Reconciliation calculations (expected vs actual)
- Session history (localStorage)
- **Est. tests: 20-25**

#### 3C. DeliveryService (expand delivery.spec.ts)
- Credential management: save, delete DoorDash/Uber credentials
- Security profile management
- DaaS flow: request quote, accept, cancel, status
- Marketplace integrations: CRUD, menu mappings
- Status sync jobs
- **Est. tests: 25-30**

#### 3D. AnalyticsService (NEW: analytics.spec.ts)
- `getTodaySalesStats()` — today's revenue
- `loadMenuEngineering()` — profitability matrix
- Sales reports by period
- Goal CRUD and progress
- Forecasting: revenue, demand, staffing
- Upsell suggestions
- Computed values
- **Est. tests: 30-35**

#### 3E. ReservationService (NEW: reservation.spec.ts)
- Reservation CRUD
- Availability checking
- Waitlist management
- Recurring reservations
- Event management
- **Est. tests: 20-25**

#### 3F. RetailCatalogService (NEW: retail-catalog.spec.ts)
- Item CRUD with variations
- Category CRUD
- Option set CRUD
- Collection and bundle management
- Image upload/delete
- Bulk price updates
- Tax rules, CSV import
- **Est. tests: 30-35**

#### 3G. RetailCheckoutService (NEW: retail-checkout.spec.ts)
- Cart operations: add, remove, void
- Discount application
- Layaway: create, release
- Receipt template management
- Payment processing
- Quick keys
- Return policy
- **Est. tests: 25-30**

#### 3H. RestaurantSettingsService (NEW: restaurant-settings.spec.ts)
- Load/save for each settings domain (hours, taxes, delivery, loyalty, tips, etc.)
- AI admin config: load, save key, delete key, features, usage
- Business hours check
- Special hours
- **Est. tests: 20-25**

#### 3I. SocketService (NEW: socket.spec.ts)
- Connection lifecycle: connect, disconnect
- Event handling: order:new, order:updated, order:cancelled
- Reconnect logic with exponential backoff
- Fallback to polling
- Browser online/offline handling
- **Est. tests: 15-20**

#### 3J. StaffManagementService (NEW: staff-management.spec.ts)
- User CRUD
- PIN management
- Team member CRUD
- Job management
- Permission set CRUD
- Device pairing
- Onboarding tracking
- **Est. tests: 20-25**

### Priority 4 — LOWER (Feature Polish)

#### 4A. DeviceService (NEW: device.spec.ts)
- Device CRUD, pairing, code generation
- Mode management
- Printer profiles
- Peripheral management
- Kiosk profiles
- **Est. tests: 20-25**

#### 4B. MultiLocationService (NEW: multi-location.spec.ts)
- Location CRUD
- Metrics loading
- Location switching
- Device consolidation
- **Est. tests: 15-20**

#### 4C. LoyaltyService (NEW: loyalty.spec.ts)
- Config load/save
- Reward CRUD
- Redemption flow
- **Est. tests: 12-15**

#### 4D. GiftCardService (NEW: gift-card.spec.ts)
- Card creation, activation
- Balance check, redemption
- Disable, history
- **Est. tests: 12-15**

#### 4E. InvoiceService (NEW: invoice.spec.ts)
- Invoice CRUD
- Send, record payment, cancel
- House account management
- **Est. tests: 15-18**

#### 4F. VendorService (NEW: vendor.spec.ts)
- Vendor CRUD
- Purchase invoice management
- **Est. tests: 8-10**

#### 4G. MarketingService (NEW: marketing.spec.ts)
- Campaign CRUD
- Automation CRUD
- **Est. tests: 10-12**

#### 4H. Remaining services (chat, monitoring, tip, subscription, recipe-costing, table, printer, station)
- Basic CRUD and signal state tests for each
- **Est. tests: 5-8 per service (40-64 total)**

### Priority 5 — COMPONENT INTEGRATION

After service tests stabilize, add component-level tests for:

| Component | Focus | Est. Tests |
|---|---|---|
| ServerPosTerminal | Full POS flow: select items, apply modifiers, split checks, pay | 20-25 |
| OrderPad | Item search, category browsing, cart interaction | 15-20 |
| MenuManagement | Category/item CRUD UI, drag-drop reorder, 86 toggle | 15-20 |
| CustomerDashboard | Tab navigation, customer search, feedback view | 10-15 |
| FloorPlan | Table layout rendering, assignment, status display | 10-15 |
| ControlPanel (Settings) | Tab routing, form persistence | 10-15 |
| SosTerminal | Self-order flow: browse, customize, cart, checkout | 15-20 |
| Login | Form validation, error display, redirect | 8-10 |
| RestaurantSelect | Restaurant list, selection, redirect | 5-8 |

---

## 5. Estimated Test Files Per Area

### Summary

| Priority | Area | New Files | New Tests (est.) |
|---|---|---|---|
| **P1 Critical** | Order, Check, Cart, Payment, Auth | 4 new + 1 expand | 155-185 |
| **P2 High** | Menu, Guards, Platform, KDS, Inventory, Labor | 6 new + 1 expand | 165-195 |
| **P3 Medium** | Customer, CashDrawer, Delivery, Analytics, Reservation, RetailCatalog, RetailCheckout, Settings, Socket, Staff | 9 new + 1 expand | 235-285 |
| **P4 Lower** | Device, MultiLocation, Loyalty, GiftCard, Invoice, Vendor, Marketing, misc | 7 new + 8 small | 130-180 |
| **P5 Components** | POS, OrderPad, Menu, CRM, FloorPlan, Settings, SOS, Login | 9 new | 110-150 |
| | | | |
| **TOTAL** | | **~45 new test files** | **~795-995 new tests** |

### Current vs Target

| Metric | Current | Target |
|---|---|---|
| Test files | 16 | ~61 |
| Test cases | 184 | ~980-1,180 |
| Services tested | 5 of 42 (12%) | 42 of 42 (100%) |
| Components tested | 10 of 103 (10%) | ~20 of 103 (19%) |
| Guards/interceptors tested | 0 of 5 (0%) | 5 of 5 (100%) |
| Models tested | 1 of 42 (2%) | 1 of 42 (service tests cover model usage) |

### File Naming Convention

All test files follow the existing pattern:
- Services: `src/app/services/{service-name}.spec.ts`
- Components: `src/app/features/{feature}/{component}/{component}.spec.ts`
- Guards: `src/app/guards/{guard-name}.spec.ts`
- Interceptors: `src/app/interceptors/{interceptor-name}.spec.ts`

### Testing Strategy

1. **Pure function tests first** — Extract complex logic into pure functions and test those (matches existing pattern)
2. **Signal state tests** — Verify computed signals produce correct derived state
3. **HTTP mocking** — Use `vi.fn()` returning `of()` for HttpClient methods
4. **No E2E in Vitest** — E2E testing handled separately by Playwright skill
5. **Focus on business logic** — Don't test Angular framework behavior (template rendering, DI wiring)
6. **Fixture builders** — Create `make{Entity}()` helpers for each domain (matches existing pattern)
