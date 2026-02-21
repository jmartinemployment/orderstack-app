# GOS-SPEC-07: Online Ordering — Square Parity Enhancements

## Context

Square Online provides a full website builder with custom domains, SEO, integrated ordering with scheduled pickup/delivery windows (15-minute time slot capacity), delivery zone geofencing with radius/polygon zones, multi-location ordering (customer selects nearest location), social media ordering integration (Instagram/Facebook shops), promo codes, item-level modifier selection, age verification for alcohol, upsell prompts in checkout, and Neighborhoods on Cash App for hyperlocal discovery. OrderStack's Online Order Portal has strong foundations — 5 order types (pickup/delivery/dine-in/curbside/catering), DaaS delivery with real-time tracking, loyalty/gift card redemption, tip presets, QR tableside multi-round ordering, and surcharge pass-through — but lacks several Square Online features.

**Key gaps identified:**
- No **scheduled ordering** — no "order for later" date/time picker, no future pickup/delivery windows
- No **delivery zone validation** — any address accepted, no geofencing or radius check
- No **minimum order enforcement** for delivery
- No **item-level modifiers in online portal** — `addToCart(item)` adds plain items, no `ModifierPrompt` in online flow
- No **promo/discount codes** — only loyalty rewards and gift cards reduce price
- No **prep time estimate** shown to customer ("ready in X minutes")
- No **upsell prompts** in online checkout (upsell exists in SosTerminal only)
- No **saved customer addresses** — returning customers re-enter address every time
- No **order-again** from past order history for returning customers
- No **age verification** for alcohol items
- No **real-time socket order tracking** — uses 15-second polling instead of WebSocket events

**Existing assets:**
- `online-ordering/online-order-portal/` — 4-step flow (menu → cart → info → confirm), all 5 order types
- `services/order.ts` — OrderService with `orderSource` tracking, `notifyArrival()`
- `services/delivery.ts` — DaaS delivery quotes + dispatch
- `services/cart.ts` — CartService with loyalty, gift card, surcharge signals
- `services/socket.ts` — SocketService with `order:updated` event (not wired to online portal)
- `table-mgmt/floor-plan/` — QR code generation (`getQrUrl()`, `getQrImageUrl()`)

---

## Mode Awareness (GOS-SPEC-01 Alignment)

Online ordering is enabled by the `online_ordering` platform module and applies to **multiple verticals** — not just restaurants. The ordering flow, checkout steps, and fulfillment options adapt per business vertical.

### Vertical Applicability

| Vertical | Online Ordering Available? | Order Types | Notes |
|---|---|---|---|
| `food_and_drink` | Yes | Pickup, Delivery, Dine-in, Curbside, Catering | Full 5-type support with modifiers, scheduling, tableside QR |
| `retail` / `grocery` | Yes | Pickup, Delivery, Shipping | No dine-in/curbside/catering; adds shipping as fulfillment type |
| `beauty_wellness` / `sports_fitness` | Via `appointments` module | Online Booking | Not "ordering" — uses booking widget (GOS-SPEC-10) instead |
| `healthcare` / `services` | Via `appointments` module | Online Booking | Same — booking, not ordering |
| `professional_services` | No | — | Uses invoicing (GOS-SPEC-04) instead |

### Feature Adaptation by Vertical

| Feature | `food_and_drink` | `retail` / `grocery` | Notes |
|---|---|---|---|
| **Online modifier selection** | Yes — modifier groups with min/max | Yes — product options (size, color) via variations | Same UI, different data source: modifiers vs variations |
| **Scheduled ordering** | Yes — time slots based on kitchen capacity | Yes — time slots based on fulfillment capacity | Slot logic is universal; capacity source differs |
| **Delivery zone validation** | Yes | Yes | Universal — delivery is delivery regardless of what's being delivered |
| **Minimum order for delivery** | Yes | Yes | Universal |
| **Promo codes** | Yes | Yes | Universal |
| **Prep time estimate** | Yes — kitchen prep time | Yes — fulfillment processing time | Label adapts: "Ready in X min" vs "Ships in X days" vs "Processing time: X min" |
| **Upsell prompts** | Yes — menu engineering data | Yes — frequently bought together | Data source differs; UI pattern is the same |
| **Saved addresses** | Yes (delivery) | Yes (delivery/shipping) | Universal |
| **Order again** | Yes | Yes | Universal |
| **Age verification** | Yes — alcohol items | Yes — age-restricted products | Universal gate; age threshold and items vary |
| **Real-time tracking** | Yes — WebSocket | Yes — WebSocket | Universal |
| **Tip presets** | Yes (if `enableTipping`) | No | Gated by `enableTipping` feature flag |
| **QR tableside ordering** | Yes (FSR only) | No | Gated by `enableTableManagement` — requires table context |
| **Multi-round ordering** | Yes (tableside QR) | No | Restaurant-specific (add items to existing open check) |

### Online Portal UI Adaptation

The `OnlineOrderPortal` component adapts its 4-step flow based on vertical:

**`food_and_drink`:**
1. Menu → modifier bottom-sheet, allergen icons, availability windows
2. Cart → upsell prompt, loyalty/gift card/promo, tip presets
3. Info → order type selector (5 types), delivery address + zone check, scheduled time
4. Confirm → prep time estimate, WebSocket tracking, "Order More" for tableside

**`retail` / `grocery`:**
1. Browse → product cards with variations (size/color selector), stock availability
2. Cart → upsell ("frequently bought together"), loyalty/gift card/promo, no tip
3. Info → fulfillment selector (pickup/delivery/ship), delivery address + zone check, scheduled time
4. Confirm → fulfillment estimate, tracking number (for shipping)

### Business Hours & Scheduling

Business hours and scheduled ordering are **universal** — every vertical has operating hours. The `BusinessHours` interface includes an `orderTypes` field that adapts per vertical:
- `food_and_drink`: `['pickup', 'delivery', 'dine-in', 'curbside', 'catering']`
- `retail`: `['pickup', 'delivery', 'shipping']`

### Multi-Location Online Ordering

Multi-location ordering is **universal** — the location selector (Step 10) works identically across verticals. Location cards show vertical-appropriate info:
- `food_and_drink`: hours, current wait time, delivery zones
- `retail`: hours, in-stock count for cart items, delivery/shipping options
- `services`: hours, next available appointment slot

---

## Phase 1 — Ordering Enhancements (Steps 1-5)

### Step 1: Online Modifier Selection

**Extend Online Order Portal with modifier support:**
- When customer taps an item that has modifier groups, open a bottom-sheet modifier selector (reuse `ModifierPrompt` logic)
- Required modifiers block "Add to Cart" until selected
- Multi-select modifiers with min/max enforcement
- Special instructions text field per item
- Price adjustment display (+$X for premium modifiers)
- Mobile-optimized: full-width bottom sheet, large touch targets

**Changes:**
- `online-order-portal.ts` — add `_selectedItemForModifiers` signal, `openModifierSheet(item)`, `addToCartWithModifiers(item, modifiers)`
- `online-order-portal.html` — modifier bottom-sheet template with `@for` groups
- `services/cart.ts` — `addItem()` already accepts modifiers array, just needs to be wired

### Step 2: Scheduled Ordering (Order for Later)

**Add to Online Order Portal:**

```ts
// Add to models/order.model.ts
export interface ScheduledOrderWindow {
  date: string;           // ISO date
  startTime: string;      // 'HH:mm'
  endTime: string;        // 'HH:mm'
  slotsAvailable: number;
  slotCapacity: number;
}
```

**UI changes:**
- "ASAP" / "Schedule for Later" toggle on cart/info step
- Date picker (today + next 6 days)
- Time slot grid (15-minute windows, 8am-10pm, respecting business hours)
- Slot capacity display (X of Y available — from backend)
- Selected slot persists through checkout, included in order payload as `scheduledFor`

**Add to `OrderService`:**
- `loadAvailableSlots(restaurantId, date, orderType)` — GET `/orders/available-slots?date=...&type=...`

**Add to `Order` model:**
- `scheduledFor: string | null` — ISO datetime of scheduled pickup/delivery

### Step 3: Delivery Zone Validation

**Add to `models/delivery.model.ts`:**
```ts
export interface DeliveryZone {
  id: string;
  restaurantId: string;
  name: string;              // e.g. 'Standard', 'Extended'
  type: 'radius' | 'polygon';
  radiusMiles: number | null;
  polygonCoords: [number, number][] | null;  // [lat, lng] pairs
  deliveryFee: number;
  minimumOrder: number;
  estimatedMinutes: number;
  isActive: boolean;
}

export interface DeliveryZoneCheck {
  inZone: boolean;
  zone: DeliveryZone | null;
  deliveryFee: number;
  minimumOrder: number;
  estimatedMinutes: number;
  message: string | null;     // "Outside delivery area" or null
}
```

**Add to `DeliveryService`:**
- `checkDeliveryZone(restaurantId, address)` — POST `/delivery/zone-check`
- Returns zone info, fee, minimum, estimated time

**Integrate into Online Portal:**
- After delivery address entry, call zone check before allowing checkout
- Display delivery fee, estimated time, minimum order warning
- Block checkout if outside all zones: "Sorry, we don't deliver to this address"
- Zone-specific delivery fee overrides static `OnlinePricingSettings.deliveryFee`

### Step 4: Promo Codes

**Add to `models/order.model.ts`:**
```ts
export interface PromoCode {
  id: string;
  restaurantId: string;
  code: string;               // Uppercase, 4-20 chars
  discountType: 'percentage' | 'flat' | 'free_delivery';
  discountValue: number;
  minimumOrder: number;
  maxUses: number | null;      // null = unlimited
  currentUses: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  applicableChannels: string[];  // ['online', 'kiosk'] or ['all']
  applicableOrderTypes: string[]; // ['delivery', 'pickup'] or ['all']
}

export interface PromoCodeValidation {
  valid: boolean;
  promoCode: PromoCode | null;
  discountAmount: number;
  message: string;            // 'Applied!', 'Expired', 'Minimum not met', etc.
}
```

**Add to `OrderService`:**
- `validatePromoCode(restaurantId, code, orderTotal, channel, orderType)` — POST `/orders/promo/validate`

**Add to Online Portal + Kiosk:**
- Promo code input field on cart step
- "Apply" button → validates → shows discount or error message
- Applied promo shows as line item in totals
- Stacks with loyalty discount (promo applied first, then loyalty)

### Step 5: Prep Time Estimate + Real-Time Tracking

**Prep time estimate:**
- After order placed, display "Estimated ready in X minutes"
- Backend calculates from: avg prep time of items + current queue depth + kitchen load
- Add `estimatedReadyAt: string | null` to `Order` model
- Display countdown timer on confirm step

**Real-time tracking via WebSocket:**
- Replace 15-second `setInterval` polling with `SocketService` subscription
- On order placement, join order-specific room: `socket.emit('join:order', orderId)`
- Listen for `order:updated` → update order status reactively
- Listen for `delivery:location_updated` → update driver position on map (if delivery)
- Graceful fallback to polling if WebSocket disconnects

---

## Phase 2 — Customer Experience (Steps 6-10)

### Step 6: Upsell in Online Checkout

**Add upsell prompt between cart and info steps:**
- Reuse `AnalyticsService.fetchUpsellSuggestions(cartItemIds)` (already exists)
- Display 3-4 suggested items as horizontal scroll cards
- "Add to Order" button on each
- "No Thanks" / "Continue" to skip
- Items added from upsell tagged with `source: 'upsell'` for analytics

### Step 7: Saved Customer Addresses

**Add to `models/customer.model.ts`:**
```ts
export interface SavedAddress {
  id: string;
  customerId: string;
  label: string;              // 'Home', 'Work', 'Other'
  address: string;
  address2: string | null;
  city: string;
  state: string;
  zip: string;
  isDefault: boolean;
}
```

**Add to `CustomerService`:**
- `loadSavedAddresses(customerId)` — GET `/customers/:id/addresses`
- `saveAddress(customerId, data)` — POST `/customers/:id/addresses`
- `deleteAddress(customerId, addressId)` — DELETE `/customers/:id/addresses/:id`

**Integrate into Online Portal:**
- After loyalty phone lookup identifies customer, load saved addresses
- Address selector dropdown: saved addresses + "Enter new address"
- "Save this address" checkbox when entering new address
- Default address auto-selected

### Step 8: Order Again

**Add "Order Again" functionality:**
- After loyalty phone lookup, load customer's recent orders (last 5)
- "Order Again" section showing recent orders as compact cards (date, items, total)
- Tap → adds all items to cart (with original modifiers)
- Customer can modify before checkout

**Add to `OrderService`:**
- `getCustomerRecentOrders(restaurantId, phone, limit)` — GET `/orders/recent?phone=...&limit=5`

### Step 9: Age Verification for Alcohol

**Add to `models/menu.model.ts`:**
```ts
// Add to MenuItem
requiresAgeVerification: boolean;   // True for alcohol items
minimumAge: number;                 // Default 21
```

**Implement in Online Portal + Kiosk:**
- When cart contains age-restricted items, show age verification gate before checkout
- "Are you 21 or older?" confirmation dialog
- Date of birth input for stricter verification (optional per restaurant setting)
- Age verification timestamp stored on order: `ageVerifiedAt: string | null`
- POS terminal: verbal verification prompt when adding alcohol items

### Step 10: Multi-Location Online Ordering

**Enhance Online Portal for multi-location restaurants:**
- If restaurant slug resolves to a group, show location selector first
- Location cards: name, address, distance (if browser geolocation available), hours, current wait time
- "Find Nearest" button using browser geolocation API
- Selected location persists for the session
- Each location may have different menus, hours, delivery zones

**Add to `OnlineOrderPortal`:**
- `_availableLocations` signal
- `_selectedLocationId` signal
- Location selector step (inserted before menu step when multi-location)

---

## Phase 3 — Advanced Online Features (Steps 11-14)

### Step 11: Online Ordering Business Hours

**Add to `models/restaurant.model.ts`:**
```ts
export interface BusinessHours {
  dayOfWeek: number;          // 0-6
  openTime: string;           // 'HH:mm'
  closeTime: string;          // 'HH:mm'
  isOpen: boolean;
  orderTypes: string[];       // Which order types accepted during these hours
}

export interface SpecialHours {
  date: string;               // ISO date
  openTime: string | null;    // null = closed
  closeTime: string | null;
  reason: string;             // 'Holiday', 'Private Event', etc.
}
```

**Implement:**
- Online portal checks business hours before allowing orders
- "Currently Closed" message with next open time
- Scheduled orders only available during business hours
- Special hours override regular hours (holidays, events)

### Step 12: Social Media Order Links

**Add sharing/linking functionality:**
- Shareable menu item links: `https://domain.com/orderstack-online-ordering?restaurant=SLUG&item=ITEM_ID`
- Deep link opens portal with item pre-selected in modifier sheet
- "Share" button on menu items generates link + copies to clipboard
- Open Graph meta tags for item preview when shared on social media (image, name, price, description)

### Step 13: Online Portal Analytics Events

**Add event tracking for conversion funnel:**
- Track: page_view, menu_view, item_view, add_to_cart, remove_from_cart, checkout_start, promo_applied, order_placed, order_failed
- `AnalyticsService.trackOnlineEvent(type, metadata)` — POST `/analytics/events`
- Events power the conversion funnel report in GOS-SPEC-05

### Step 14: Build Verification

- `ng build` both library and elements — zero errors
- Verify modifier selection works in online portal
- Verify scheduled ordering shows available time slots
- Verify delivery zone check blocks out-of-zone addresses
- Verify promo code validation and discount application
- Verify real-time order tracking via WebSocket
- Verify upsell prompt appears between cart and info steps

---

## Files Summary

### New Files
| File | Purpose |
|------|---------|
| (none — all changes extend existing files) | |

### Modified Files
| File | Changes |
|------|---------|
| `models/order.model.ts` | ScheduledOrderWindow, PromoCode, PromoCodeValidation, scheduledFor field, ageVerifiedAt, estimatedReadyAt |
| `models/delivery.model.ts` | DeliveryZone, DeliveryZoneCheck |
| `models/menu.model.ts` | requiresAgeVerification, minimumAge on MenuItem |
| `models/customer.model.ts` | SavedAddress interface |
| `models/restaurant.model.ts` | BusinessHours, SpecialHours |
| `services/order.ts` | Available slots, promo validation, recent orders by phone |
| `services/delivery.ts` | Zone check method |
| `services/customer.ts` | Saved address CRUD |
| `services/cart.ts` | Promo code discount signal, scheduled order time |
| `online-ordering/online-order-portal/` | Modifiers, scheduling, zone check, promo codes, upsell, saved addresses, order again, age verification, multi-location, WebSocket tracking, business hours |
| `kiosk/kiosk-terminal/` | Promo code input, age verification |

---

## Verification

1. `ng build` both library and elements — zero errors
2. Online modifier sheet opens for items with modifier groups
3. Scheduled ordering shows time slot grid with capacity
4. Delivery zone check blocks out-of-zone addresses with message
5. Promo code applies discount and shows in totals
6. Prep time estimate displays after order placement
7. WebSocket-driven order status updates replace polling
8. Upsell suggestions appear between cart and checkout
9. Saved addresses load after phone lookup
10. Age verification gate appears for alcohol items
