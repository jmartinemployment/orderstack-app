# GOS-SPEC-24: Retail Ecommerce Integration

**Status:** NOT STARTED
**Vertical:** Retail
**Square Reference:** Square Online — Product sync, inventory sync, shipping, BOPIS, curbside, local delivery, abandoned cart, customer accounts, social selling

---

## Overview

Retail ecommerce connects the in-store catalog to an online storefront. Products with variation selectors (size/color pickers), real-time inventory sync between POS and online, multiple fulfillment methods (ship, BOPIS, curbside, local delivery), and unified order management. Extends the existing OnlineOrderPortal architecture with retail-specific flows.

---

## Phase 1 — Online Store (Steps 1-5)

### Step 1: Ecommerce Models

**Files to create:**
- `src/app/models/retail-ecommerce.model.ts` —
  - `ProductListing` (id, retailItemId, title, description, seoTitle, seoDescription, slug, images: ProductImage[], isPublished, channelVisibility: {online, facebook, instagram, google}, fulfillmentOptions: FulfillmentOption[])
  - `ProductImage` (id, url, altText, position, isPrimary)
  - `FulfillmentOption` ('ship' | 'pickup' | 'curbside' | 'local_delivery')
  - `ShippingMethod` (id, name, type: 'flat_rate' | 'by_weight' | 'by_total' | 'by_quantity' | 'carrier_calculated', rate, freeAbove?, carrier?: 'usps' | 'ups' | 'fedex')
  - `ShippingRate` (methodId, methodName, rate, estimatedDays)
  - `EcommerceOrder` (id, orderNumber, customerId, customerName, customerEmail, items: EcommerceOrderItem[], shippingAddress?, billingAddress?, shippingMethod?, shippingCost, fulfillmentType: FulfillmentOption, fulfillmentStatus: FulfillmentStatus, subtotal, taxTotal, shippingTotal, discountTotal, total, trackingNumber?, paidAt, createdAt)
  - `EcommerceOrderItem` (itemId, variationId, name, variationName, sku, quantity, unitPrice, lineTotal, imageUrl)
  - `FulfillmentStatus` ('pending' | 'processing' | 'ready_for_pickup' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled')
  - `ShippingLabel` (id, orderId, carrier, trackingNumber, labelUrl, cost, createdAt)

### Step 2: Ecommerce Service

**Files to create:**
- `src/app/services/retail-ecommerce.ts` — `RetailEcommerceService` with:
  - **Products:** `loadListings()`, `createListing(retailItemId)`, `updateListing()`, `publishListing()`, `unpublishListing()`, `syncAllListings()`
  - **Orders:** `loadOrders(status?, dateRange?)`, `getOrder(id)`, `updateFulfillmentStatus(orderId, status)`, `addTrackingNumber(orderId, carrier, trackingNumber)`
  - **Shipping:** `loadShippingMethods()`, `createShippingMethod()`, `updateShippingMethod()`, `deleteShippingMethod()`, `calculateShippingRates(orderId)`
  - **Fulfillment:** `markReadyForPickup(orderId)`, `markShipped(orderId, trackingNumber)`, `markDelivered(orderId)`, `printShippingLabel(orderId)`
  - Signals: `_listings`, `_orders`, `_shippingMethods`, `_isLoading`
  - Computeds: `publishedListings`, `pendingOrders`, `readyForPickupOrders`, `shippedOrders`

### Step 3: Product Listing Pages

**Files to create:**
- `src/app/features/retail/ecommerce/product-list/product-list.ts` (+ html, scss)

Public-facing product grid (route: `/shop/:storeSlug`). Filter by category, price range, sort by (popular, price low-high, newest). Product cards with primary image, name, price (show range for variations: "$29.99 - $49.99"), "Add to Cart" button. Category sidebar navigation.

### Step 4: Product Detail Page

**Files to create:**
- `src/app/features/retail/ecommerce/product-detail/product-detail.ts` (+ html, scss)

Route: `/shop/:storeSlug/product/:productSlug`. Image gallery (thumbnail strip + main image, click to enlarge). Variation selectors: size buttons, color swatches with stock indicators (in stock, low stock, out of stock). Price updates based on selected variation. Add to Cart button (disabled if out of stock). Description, reviews section. "Ships from [location]" or "Available for pickup at [location]" based on stock.

### Step 5: Shopping Cart & Checkout

**Files to create:**
- `src/app/features/retail/ecommerce/checkout/retail-checkout.ts` (+ html, scss)

Cart drawer/page: item list with variation display, quantity adjusters, remove button, subtotal. Checkout flow: (1) Shipping address (or pickup location selector for BOPIS), (2) Shipping method selection with rates and estimated delivery, (3) Payment (Stripe elements), (4) Order confirmation with order number and tracking info.

---

## Phase 2 — Fulfillment (Steps 6-10)

### Step 6: Ship from Store

**Files to create:**
- `src/app/features/retail/fulfillment/fulfillment-dashboard.ts` (+ html, scss)

Pick-pack-ship workflow: (1) Pick list — items to pull from shelves grouped by order, (2) Pack — confirm items packed, enter box dimensions/weight, (3) Ship — generate shipping label, mark as shipped. Batch processing for multiple orders.

### Step 7: Buy Online Pick Up In Store (BOPIS)

Customer selects "Pickup" at checkout → chooses store location → places order. Staff receives notification. Staff picks items and marks "Ready for Pickup". Customer notified via email/SMS. Customer arrives, staff hands over items, marks "Picked Up". Configurable pickup window (e.g., ready within 2 hours).

### Step 8: Curbside Pickup

Extension of BOPIS: customer selects "Curbside" → provides vehicle description → notified when ready → texts "I'm here" → staff brings order to car. "Arrived" notification from customer's device.

### Step 9: Shipping Rate Calculation

Flat rate, weight-based, total-based, quantity-based shipping. Carrier API integration (USPS, UPS, FedEx) for real-time rates at checkout. Free shipping threshold configuration. Shipping label printing with discounted carrier rates.

### Step 10: Customer Notifications

Email notifications at each fulfillment stage: order confirmed, ready for pickup, shipped (with tracking link), out for delivery, delivered. SMS notifications optional. Configurable email templates.

---

## Phase 3 — Channel Sync (Steps 11-14)

### Step 11: Real-Time Inventory Sync

When item sold in-store (POS), online stock decremented immediately. When item sold online, POS stock decremented. Prevents overselling. Buffer stock option (hold X units for online-only).

### Step 12: Price Sync

Price change in catalog → auto-reflects on online store. Per-channel pricing option (different online vs in-store prices). Sale pricing with start/end dates.

### Step 13: Product Visibility Per Channel

Per-item toggles: in-store only, online only, both. Hide items from online when out of stock. Show "Sold Out" badge vs hiding entirely (configurable). Per-variation channel visibility.

### Step 14: Build Verification

- `ng build --configuration=production` — zero errors
- Routes: `/shop/:storeSlug`, `/shop/:storeSlug/product/:slug`, `/shop/:storeSlug/cart`, `/shop/:storeSlug/checkout`, `/retail/fulfillment`
