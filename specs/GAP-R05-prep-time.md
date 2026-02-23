# GAP-R05: Kitchen Prep Time Estimates

**Status:** Phase 1 COMPLETE
**Priority:** 5
**Square Reference:** Estimated prep time per item. KDS shows total time. Online ordering shows estimated ready time.

---

## Overview

Each menu item gets an `estimatedPrepMinutes` field. KDS order cards show total estimated prep time. Online ordering confirmation shows estimated ready time. Historical data refines estimates over time.

---

## Phase 1 — Prep Time Basics (Steps 1-5)

### Step 1: Model Update

**Files to modify:**
- `src/app/models/menu.model.ts` — add `estimatedPrepMinutes: number | null` to `MenuItem` (default null = no estimate).

### Step 2: Item Management UI

**Files to modify:**
- `src/app/features/menu-mgmt/item-management/item-management.ts` — add `estimatedPrepMinutes` to form.
- `src/app/features/menu-mgmt/item-management/item-management.html` — prep time input field in item editor (number input, minutes, optional).

### Step 3: KDS Prep Time Display

**Files to modify:**
- `src/app/features/kds/order-card/order-card.ts` — add `estimatedPrepMinutes` computed that sums prep times of all items in the order. `prepTimeClass` computed (green < 10min, amber 10-20min, red > 20min).
- `src/app/features/kds/order-card/order-card.html` — prep time badge on order card header showing total estimated minutes with clock icon.
- `src/app/features/kds/order-card/order-card.scss` — prep time badge styles with color coding.

### Step 4: Online Ordering Ready Time

**Files to modify:**
- `src/app/features/online-ordering/online-order-portal/online-order-portal.ts` — `estimatedReadyMinutes` computed from cart items' prep times + buffer. Display on confirmation step.
- `src/app/features/online-ordering/online-order-portal/online-order-portal.html` — "Estimated ready in ~X minutes" on confirmation screen.

### Step 5: Build Verification

- `ng build --configuration=production` — zero errors

---

## Phase 2 — Accuracy Tracking (Steps 6-9)

### Step 6: Historical Tracking

Track actual completion time (KDS bump timestamp - order received timestamp) vs estimated.

**Files to modify:**
- `src/app/services/analytics.ts` — `getPrepTimeAccuracy(dateRange): Promise<{itemId, itemName, estimated, actualAvg, accuracy, sampleSize}[]>`.

### Step 7: Accuracy Dashboard

Section in Menu Engineering Dashboard showing prep time accuracy per item.

### Step 8: Auto-Adjust Suggestions

Flag items where actual prep time consistently differs from estimate by >25%. Suggest adjusted values.

### Step 9: Queue-Based Estimates

Factor in current KDS queue depth when estimating ready time for online orders.
