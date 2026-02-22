# GOS-SPEC-06: Orders — Square Parity Enhancements

## Context

Square's order management provides a 5-state lifecycle (New → In Progress → Ready → Active → Completed), multi-channel order aggregation (POS, online, kiosk, QR, third-party delivery all in one view), fractional check splitting (split individual items into precise portions), pre-authorization bar tabs ($1.01-$250 hold range), text modifiers for free-form customization, bulk order actions (mark multiple orders as complete), and expo station recall/refire. OrderStack already has excellent order management — full check splitting (by item/seat/equal), tab management with pre-auth, void/comp workflows, course pacing with auto-fire, DaaS delivery dispatch, and marketplace order ingestion — but several Square features are missing or weak.

**Key gaps identified:**
- No **guest-facing check view** — QR exists for ordering but not for viewing/paying an existing check
- No **bulk order actions** — each order managed individually in pending-orders
- No **text/free-form modifiers** — modifiers are predefined selections only, no "special instructions" at modifier level
- No **order activity log** — individual order events not displayed as timeline
- No **automatic gratuity** — surcharging exists but no auto-gratuity for large parties
- No **order fulfillment types** — no curbside arrival notification from POS side
- Weak **order search** — order history has basic search, no receipt lookup by payment method or last 4 digits

**Existing assets:**
- `models/order.model.ts` — Order, Check, Selection, Course, Payment, DiningOption, OrderMetrics, MarketplaceOrderInfo
- `services/order.ts` — OrderService with full CRUD + status + fire + throttle
- `services/check.ts` — CheckService with 12 methods (split, merge, void, comp, discount, tab)
- `orders/pending-orders/` — live order list with status actions, CSV export
- `orders/order-history/` — filtered list with detail modal, refund, profit insight
- `pos/server-pos-terminal/` — 3-panel POS with check management
- `pos/order-pad/` — mobile tableside ordering
- `kds/kds-display/` — station-filtered KDS with expo, auto-fire, throttling

---

## Mode Awareness (GOS-SPEC-01 Alignment)

Orders are a **universal platform concept** — every vertical creates orders. However, the order *lifecycle*, check management, and fulfillment features diverge significantly by device POS mode. This spec's enhancements must respect `ModeFeatureFlags` from GOS-SPEC-01.

### Feature Gating by ModeFeatureFlags

| Feature | Required Flag | Enabled Modes | Disabled Behavior |
|---|---|---|---|
| **Order activity log** | — (universal) | All | Always available |
| **Bulk order actions** | — (universal) | All | Always available |
| **Text/free-form modifiers** | — (universal) | All | Always available (modifiers themselves are `food_and_drink`-specific, but text modifiers can apply to any item's special instructions) |
| **Guest-facing check view & pay** | `enableOpenChecks` | Full Service, Bar | Hidden — QSR/Retail use order-number-based pickup, not open checks |
| **Automatic gratuity** | `enableTipping` | QSR, FSR, Bar, Bookings | Hidden — Retail and Services don't have party-based gratuity |
| **Open checks / tabs** | `enableOpenChecks` | Full Service, Bar | Orders auto-close on payment (no persistent checks) |
| **Check splitting** | `enableCheckSplitting` | Full Service, Bar | Split buttons hidden |
| **Fractional check splitting** | `enableCheckSplitting` | Full Service, Bar | Fraction controls hidden |
| **Check transfer** | `enableCheckTransfer` | Full Service | Transfer button hidden |
| **Course management** | `enableCoursing` | Full Service | Course pacing, fire controls hidden |
| **Pre-auth tabs** | `enablePreAuthTabs` | Bar | Tab/pre-auth controls hidden |
| **Seat assignment** | `enableSeatAssignment` | Full Service, Bar | Seat selectors hidden |
| **Curbside arrival** | — (order type) | QSR, FSR (with delivery module) | Only shown when order has `orderType: 'curbside'` |
| **Order refire/remake** | `enableKds` | QSR, FSR, Bar | Remake button hidden (no KDS = no remake workflow) |
| **Multi-channel aggregation** | — (universal) | All | Channel list adapts per vertical |
| **Order notes** | — (universal) | All | Note types adapt: `kitchen` type only when `enableKds` |

### Order Lifecycle by Mode

**Full Service (FSR):**
- Full 5-state lifecycle: New → In Progress → Ready → Active → Completed
- Open checks persist until closed; multiple checks per order
- Coursing with fire control; seat assignment; check splitting/transfer
- Guest check view via QR; auto-gratuity for large parties
- Activity log shows all 20 event types

**Quick Service (QSR):**
- Simplified lifecycle: New → In Progress → Ready → Completed (no "Active" state — orders are picked up, not "actively being served")
- No open checks — order = single check, auto-closed on payment
- Order number tracking replaces table assignment
- Bulk actions for managing high-volume queues
- No coursing, no seat assignment, no check splitting

**Bar:**
- Tab-based lifecycle: Tab Opened → Items Added → Tab Closed → Completed
- Pre-auth holds on card; conversational modifier flow
- Open checks with seat assignment (bar seats) but no table/floor plan
- Guest check view via QR for tab viewing/closing
- No coursing, no check transfer (tabs stay at the bar)

**Retail:**
- Transaction lifecycle: New → Completed (single-step — scan, pay, done)
- No open checks, no coursing, no seats, no tabs
- Returns/exchanges add a reverse lifecycle: Return Initiated → Refund Processed
- Bulk actions useful for inventory counts and adjustments
- No KDS, no curbside, no remake

**Services / Bookings:**
- Appointment lifecycle: Booked → Checked In → In Progress → Completed
- Invoicing replaces immediate payment (pay later workflow)
- No KDS, no coursing, no checks, no seats
- Activity log tracks appointment status changes instead of kitchen events

### Order Model — Universal vs Vertical Fields

| Field on `Order` | Universal? | Notes |
|---|---|---|
| `id`, `restaurantId`, `orderNumber`, `status`, `createdAt` | Yes | Core order identity |
| `checks[]` | Yes | Every order has at least one check — in retail/QSR, always exactly one |
| `orderType` (dine-in/takeout/delivery/curbside/catering) | `food_and_drink` | Retail uses `in_store`/`online`/`pickup`; Services uses `in_person`/`virtual` |
| `orderSource` (pos/online/kiosk/qr/marketplace) | Yes | Channel tracking is universal |
| `courses[]` | `food_and_drink` + `enableCoursing` | Null/empty for non-restaurant |
| `scheduledFor` | Yes | Scheduled orders apply to all verticals |
| `estimatedReadyAt` | `food_and_drink`, `retail` | Prep time for food; fulfillment time for retail orders |
| `ageVerifiedAt` | `food_and_drink`, `retail` | Alcohol for restaurants; age-restricted products for retail |

### Pending Orders & Order History Adaptation

**Pending Orders** adapts its card layout and action buttons:
- **FSR**: Shows table number, server name, course status, check count
- **QSR**: Shows order number prominently, name/pickup indicator, elapsed time
- **Bar**: Shows tab name, pre-auth badge, seat number
- **Retail**: Shows transaction type (sale/return), item count, total
- **Services**: Shows client name, service type, appointment time

**Order History** search fields adapt:
- Universal: date range, employee, channel, payment status, receipt number
- `food_and_drink` adds: table number, dining option filter
- `retail` adds: SKU/barcode search, return status filter
- `services` adds: client name, service type, appointment date

### Order Notes — Type Adaptation

The 3 note types adapt per vertical:
- `internal`: Universal — staff-only notes
- `kitchen`: Only when `enableKds` — hidden for retail/services
- `customer`: Universal — visible on guest-facing views (guest check for restaurants, order confirmation for retail, appointment summary for services)

---

## Phase 1 — Order Lifecycle Enhancements (Steps 1-5)

### Step 1: Order Activity Log

**Add to `models/order.model.ts`:**
```ts
export interface OrderActivityEvent {
  id: string;
  orderId: string;
  eventType: OrderEventType;
  description: string;
  performedBy: string | null;   // Staff name or 'system'
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export type OrderEventType =
  | 'order_created'
  | 'item_added'
  | 'item_removed'
  | 'item_voided'
  | 'item_comped'
  | 'status_changed'
  | 'check_split'
  | 'check_merged'
  | 'check_transferred'
  | 'payment_received'
  | 'payment_refunded'
  | 'discount_applied'
  | 'discount_removed'
  | 'tab_opened'
  | 'tab_closed'
  | 'course_fired'
  | 'delivery_dispatched'
  | 'delivery_status_changed'
  | 'manager_override'
  | 'note_added';
```

**Add to `OrderService`:**
- `loadOrderActivity(orderId)` — GET `/orders/:id/activity`

**Add to Order History detail modal + POS Terminal:**
- Timeline view showing all events with timestamps, icons, and performer names
- Collapsible by default, expandable to show full history

### Step 2: Bulk Order Actions

**Enhance `orders/pending-orders/`:**
- Checkbox on each order card for multi-select
- Bulk action bar (appears when 1+ selected): "Mark In Progress", "Mark Ready", "Mark Complete", "Print All"
- Select all / deselect all toggle
- Count badge: "X orders selected"
- Confirmation modal for bulk status changes

**Add to `OrderService`:**
- `bulkUpdateStatus(orderIds[], newStatus)` — PATCH `/orders/bulk-status`

### Step 3: Text Modifiers (Free-Form Customization)

**Extend `models/menu.model.ts`:**
```ts
// Add to ModifierGroup
allowTextModifier: boolean;       // Enable free-text input as last option
textModifierLabel: string | null; // e.g. 'Special Instructions', 'Substitutions'
textModifierMaxLength: number;    // Default 200
```

**Extend modifier prompt UI** (`pos/modifier-prompt/`):
- When `allowTextModifier` is true, show text input field below modifier options
- Placeholder text from `textModifierLabel`
- Character counter
- Text modifier stored as special `Modifier` with `isTextModifier: true` and `textValue: string`

**Extend `Selection` model:**
```ts
// Add to Selection.modifiers entry
textValue: string | null;         // For text modifiers
```

### Step 4: Guest-Facing Check View & Pay

**New: `online-ordering/guest-check/` (4 files)**

Allows diners to view their check and pay from their phone:
- Accessed via QR code on receipt or table tent: `/guest-check?order=ORDER_GUID&check=CHECK_GUID`
- Read-only view of check items with prices
- Tip selection (preset percentages + custom)
- Payment via Stripe/PayPal (reuses existing `PaymentService`)
- Split-my-share: select which items are mine → pay only those
- "Request Server" button → sends notification to POS
- No login required — order GUID acts as auth token
- Register as `get-order-stack-guest-check` custom element

### Step 5: Automatic Gratuity

**Add to `models/settings.model.ts`:**
```ts
export interface AutoGratuitySettings {
  enabled: boolean;
  minPartySize: number;         // e.g. 6
  gratuityPercent: number;      // e.g. 18
  applyToTakeout: boolean;      // Usually false
  applyToDelivery: boolean;     // Usually false
}
```

**Add to `RestaurantSettingsService`:**
- `_autoGratuitySettings` signal
- `saveAutoGratuitySettings(data)` — PATCH `/restaurant/:id` with autoGratuity field

**Integrate into checkout flows:**
- `CheckoutModal`, `OnlineOrderPortal`, `ServerPosTerminal`: check party size, auto-add gratuity line item
- Display as "Auto Gratuity (18%)" — not editable by guest, removable by manager
- Auto-gratuity shows in tip report separately from voluntary tips

---

## Phase 2 — Order Search & Fulfillment (Steps 6-10)

### Step 6: Advanced Order Search

**Enhance `orders/order-history/`:**
- **Search by last 4 digits** of card number (payment processor lookup)
- **Search by phone number** (customer info)
- **Search by receipt number** (unique receipt ID)
- **Search by date + time window** (not just date)
- **Search by employee** (who created the order)
- **Filter by channel** (POS, online, kiosk, delivery, QR)
- **Filter by payment status** (paid, unpaid, partial, refunded)
- **Saved searches** — save frequently used filter combinations

### Step 7: Curbside Arrival Management

**Enhance Pending Orders for curbside:**
- Curbside orders show vehicle description prominently
- "Customer Arrived" button (triggered by guest notification or manual)
- Arrival notification: plays sound + visual alert in POS and KDS
- Timer from arrival → handoff
- Batch view: all active curbside orders with status (preparing/ready/arrived/picked up)

**Integrate with `OnlineOrderPortal`:**
- Guest "I'm Here" button sends notification via `OrderService.notifyArrival(orderId)`
- Vehicle info displayed in POS arrival alert

### Step 8: Order Refire / Remake Workflow

**Enhance KDS order cards:**
- "Remake" button on completed items → creates duplicate order item with `isRemake: true` flag
- Remake reason selector: wrong item, quality issue, customer complaint, dropped
- Remake items route back to original station
- Remake count tracked per item for waste analysis
- Expo station can request remake from specific prep station

**Add to `models/order.model.ts`:**
```ts
// Add to Selection
isRemake: boolean;
remakeReason: string | null;
originalSelectionId: string | null;
```

### Step 9: Multi-Channel Order Aggregation View

**Enhance `orders/pending-orders/`:**
- Channel filter tabs at top: All | POS | Online | Kiosk | QR | Delivery | Marketplace
- Channel icon badge on each order card
- Unified sorting across all channels
- Auto-refresh via WebSocket for all channels
- Channel-specific actions (e.g., delivery orders show dispatch button, marketplace orders show accept/reject)

### Step 10: Order Notes & Communication

**Add order-level and check-level notes:**
- "Add Note" button on order/check → text input with timestamp + author
- Notes visible in POS, KDS, and order history
- Note types: internal (staff only), kitchen (visible on KDS), customer (visible on guest check)
- Manager notes highlighted with different color

**Add to `models/order.model.ts`:**
```ts
export interface OrderNote {
  id: string;
  orderId: string;
  checkGuid: string | null;
  noteType: 'internal' | 'kitchen' | 'customer';
  text: string;
  createdBy: string;
  createdAt: string;
}
```

---

## Phase 3 — Advanced Order Features (Steps 11-14)

### Step 11: Fractional Check Splitting

**Extend `CheckService`:**
- `splitItemFraction(checkGuid, selectionId, fractions)` — split one item into N portions across N checks
- Example: split a $90 bottle of wine into 3 × $30 portions
- Each fraction becomes a new `Selection` with `fractionOf: originalSelectionId` and `fractionAmount: 1/3`
- Fractions can be recombined if all return to same check

**Add to `models/order.model.ts`:**
```ts
// Add to Selection
fractionOf: string | null;       // Original selection ID
fractionNumerator: number | null; // e.g. 1
fractionDenominator: number | null; // e.g. 3
```

### Step 12: Order Templates / Quick Orders

**Add to POS Terminal:**
- "Quick Orders" button → list of saved order templates
- Template: named combination of items (e.g., "Lunch Special A" = soup + sandwich + drink)
- Create template from current order: "Save as Template"
- Templates are per-restaurant, managed in settings

**Add to `models/order.model.ts`:**
```ts
export interface OrderTemplate {
  id: string;
  restaurantId: string;
  name: string;
  items: OrderTemplateItem[];
  createdBy: string;
  createdAt: string;
}

export interface OrderTemplateItem {
  menuItemId: string;
  quantity: number;
  modifiers: string[];       // Modifier IDs
}
```

### Step 13: Order Retry / Recovery

**Handle failed orders gracefully:**
- If order creation fails (network, backend error): save to `localStorage` as draft
- "Drafts" indicator in POS header showing count of failed orders
- Retry button to resubmit draft orders
- Auto-retry on network reconnection (via `SocketService` reconnect event)
- Draft orders survive page refresh

### Step 14: Build Verification

- `ng build` both library and elements — zero errors
- Verify order activity log renders timeline in order detail
- Verify bulk actions work on multiple selected orders
- Verify text modifiers appear in modifier prompt and on KDS
- Verify guest check component renders and accepts payment
- Verify auto-gratuity applies to large party orders
- Verify curbside arrival notification works

---

## Files Summary

### New Files
| File | Purpose |
|------|---------|
| `online-ordering/guest-check/` (4 files) | Guest-facing check view & pay |

### Modified Files
| File | Changes |
|------|---------|
| `models/order.model.ts` | OrderActivityEvent, OrderNote, OrderTemplate, fractional splitting fields, isRemake |
| `models/menu.model.ts` | Text modifier fields on ModifierGroup |
| `models/settings.model.ts` | AutoGratuitySettings |
| `services/order.ts` | Activity log, bulk status, notify arrival, order templates, draft recovery |
| `services/check.ts` | Fractional splitting |
| `services/restaurant-settings.ts` | Auto-gratuity settings |
| `orders/pending-orders/` | Bulk actions, channel filter tabs, curbside management |
| `orders/order-history/` | Advanced search (last 4 digits, phone, receipt #, channel, employee) |
| `pos/server-pos-terminal/` | Activity log panel, auto-gratuity, order templates, notes |
| `pos/modifier-prompt/` | Text modifier input field |
| `kds/order-card/` | Remake button + reason, notes display |
| `kds/kds-display/` | Remake routing |
| `public-api.ts` | Add GuestCheck export |
| `elements/src/main.ts` | Register `get-order-stack-guest-check` |

---

## Verification

1. `ng build` both library and elements — zero errors
2. Order activity log shows timeline of events
3. Bulk actions bar appears when orders are selected
4. Text modifier input appears in modifier prompt when enabled
5. Guest check page renders order items and accepts payment
6. Auto-gratuity applies to parties >= configured size
7. Curbside "I'm Here" notification appears in POS
8. Fractional check splitting divides item into portions
9. Order templates can be saved and applied
