# GAP-R08: Integrated Delivery Dispatch

**Status:** NOT STARTED
**Priority:** 10
**Square Reference:** Built-in delivery driver management. Assign orders to drivers, track location, estimated delivery time. Integration with DoorDash Drive, Uber Direct for on-demand courier dispatch.

---

## Overview

Restaurants with in-house delivery need driver management, order-to-driver assignment, and status tracking. For restaurants without their own drivers, third-party courier APIs (DoorDash Drive, Uber Direct) dispatch professional couriers at per-order rates. Both flows integrate into the existing orders workflow.

---

## Phase 1 — In-House Driver Management (Steps 1-5)

### Step 1: Delivery Models

**Files to create:**
- `src/app/models/delivery.model.ts` — `Driver` (id, name, phone, email, vehicleType: 'car' | 'bike' | 'scooter' | 'walk', status: DriverStatus, currentOrderId?, lastLocationLat?, lastLocationLng?, lastLocationAt?). `DriverStatus` ('available' | 'assigned' | 'en_route' | 'delivering' | 'offline'). `DeliveryAssignment` (id, orderId, driverId, assignedAt, pickedUpAt?, deliveredAt?, estimatedDeliveryMinutes?, distanceKm?, customerLat?, customerLng?, status: DeliveryAssignmentStatus). `DeliveryAssignmentStatus` ('assigned' | 'picked_up' | 'en_route' | 'delivered' | 'cancelled'). `DeliveryDispatchConfig` (enableInHouseDelivery, enableThirdParty, thirdPartyProvider: 'doordash_drive' | 'uber_direct' | null, maxDeliveryRadiusKm, baseDeliveryFee, perKmFee).

### Step 2: Delivery Service

**Files to create:**
- `src/app/services/delivery.ts` — `DeliveryService` with: `loadDrivers()`, `createDriver()`, `updateDriver()`, `deleteDriver()`, `setDriverStatus(id, status)`, `assignOrderToDriver(orderId, driverId)`, `updateAssignmentStatus(assignmentId, status)`, `loadActiveAssignments()`, `estimateDeliveryTime(orderId, driverId)`, `dispatchThirdParty(orderId)`. Signals: `_drivers`, `_activeAssignments`, `_isLoading`. Computeds: `availableDrivers`, `assignedDrivers`, `inTransitAssignments`.

### Step 3: Driver Assignment Panel in Pending Orders

**Files to modify:**
- `src/app/features/orders/pending-orders/pending-orders.ts` — inject `DeliveryService`. `deliveryOrders` computed (orders with dining option = delivery). Driver assignment dropdown per delivery order. Assignment status badges.
- `src/app/features/orders/pending-orders/pending-orders.html` — delivery section: unassigned delivery orders with driver dropdown, assigned orders with status timeline (Assigned → Picked Up → En Route → Delivered), driver avatar + name.

### Step 4: Driver Management in Delivery Settings

**Files to modify:**
- `src/app/features/settings/delivery-settings/delivery-settings.ts` — driver CRUD section. Driver list with name, vehicle type, status. Add/edit driver form. Delivery configuration (radius, fees, enable in-house/third-party).
- `src/app/features/settings/delivery-settings/delivery-settings.html` — driver management table, add driver modal, dispatch configuration section.

### Step 5: Build Verification

- `ng build --configuration=production` — zero errors

---

## Phase 2 — Third-Party Dispatch (Steps 6-9)

### Step 6: DoorDash Drive Integration

API integration to dispatch DoorDash Drive couriers for individual orders. Backend proxies DoorDash Drive API.

### Step 7: Uber Direct Integration

Same pattern for Uber Direct courier dispatch.

### Step 8: Delivery Tracking

Real-time delivery status updates via Socket.io. Map view showing driver location (using browser geolocation API from driver's device).

### Step 9: Delivery Analytics

Report: average delivery time, deliveries per driver, on-time percentage, cost per delivery.
