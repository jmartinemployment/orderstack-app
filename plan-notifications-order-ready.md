# Plan: Notifications Tab — KDS Order-Ready Alerts to Source Device

## Context

All four POS-style terminals (POS, Bar, Kiosk, Register) have a Notifications tab in the bottom nav that currently shows a placeholder. When kitchen staff bump an order on the KDS (marking it ready), the device that originally placed the order should receive an in-app notification. This matches Square's pattern where a blue dot appears on the bell icon and order-ready alerts appear in a notification center.

**Key requirement:** Each notification opens once — tapping it navigates to the relevant order or dismisses it. No toggles, no recurring state.

---

## Square's Notification System — How It Works

### Bell Icon / Notification Center

- **Blue dot indicator** on the bell icon in the bottom nav when new notifications exist
- **In-app alerts** appear as a list when the bell/Notifications tab is tapped
- **Sound/vibration** on new order arrival (configurable in Settings > Orders > Order notifications)
- **Push notifications** on iOS even when app is backgrounded

### KDS → POS Notification Flow

1. Kitchen staff bumps order on KDS (marks items/order as ready)
2. KDS sends status update to backend
3. Backend broadcasts `order:updated` event via socket to the **source device** that created the order + all KDS devices
4. Source POS/Bar/Register receives the event and shows an alert
5. Optionally, customer receives SMS text ("Your order is ready!")

### What the Server/Staff Sees

- Notification appears indicating order is ready (order number, table if applicable)
- Tapping the notification navigates to the order or dismisses it
- Notifications auto-clear after being acknowledged

---

## OrderStack Current Implementation — What Already Works

### Socket Infrastructure (fully implemented)

| Component | Status | Location |
|-----------|--------|----------|
| `SocketService` | Working | `src/app/services/socket.ts` — connects with `deviceId` + `deviceType` |
| `broadcastToSourceAndKDS()` | Working | Backend `socket.service.ts` — sends events to source device + all KDS |
| `sendOrderEventToDevice()` | Working | Backend — sends to ONE specific device by ID |
| `items:ready` socket event | Working | Backend emits when items marked ready, includes `orderId`, `stationName`, `allReady` |
| `order:updated` socket event | Working | Backend emits full order object on status change |
| `_itemReadyNotifications` signal | Working | `src/app/services/order.ts` — stores up to 5 notifications |
| `_courseCompleteNotifications` signal | Working | `src/app/services/order.ts` — course-fire notifications |
| `clearItemReadyNotification(id)` | Working | `src/app/services/order.ts` — dismisses a notification |
| Device ID on orders | Working | `order.device.guid` stores which device created the order |
| `sourceDeviceId` query param | Working | `loadOrders({ sourceDeviceId })` filters orders by device |

### What's Missing

| Component | Status | What's Needed |
|-----------|--------|---------------|
| Notifications tab UI | Placeholder | Build notification list that reads `itemReadyNotifications` signal |
| Bell badge (unread count) | Missing | Show count on bell icon in bottom nav |
| Notification sound | Missing | Play audio on new `items:ready` event |
| Notification tap action | Missing | Navigate to order or dismiss |
| KDS "all ready" distinction | Partial | `allReady` boolean exists in event but not surfaced in UI |

---

## Discrepancies Found

### 1. `device.guid` vs `sourceDeviceId` naming inconsistency

- **Order model** (`order.model.ts` line 131-134): Uses `OrderDevice { guid, name }`
- **Order service** (`order.ts` line 956): Maps `sourceDeviceId` from `orderData` into `device.guid`
- **Order service** (`order.ts` line 1547): Fallback mapping uses `raw.sourceDeviceId` → `device.guid`
- **Backend socket**: Uses `sourceDeviceId` field name
- **Issue:** Two names for the same concept. Frontend uses `device.guid`, backend uses `sourceDeviceId`. Works but confusing.

### 2. Kiosk gets notifications but probably shouldn't create kitchen orders

- **Kiosk** has a Notifications tab and `BottomTab` type includes `'notifications'`
- **But:** Kiosk is customer-facing self-service — customers don't need order-ready notifications in the same format as staff terminals
- **Recommendation:** Keep Notifications tab on Kiosk but show customer-appropriate messaging (e.g., "Your order #123 is being prepared" → "Your order #123 is ready!")

### 3. `_itemReadyNotifications` signal exists but no terminal reads it

- `order.ts` already collects `items:ready` socket events into a signal (max 5)
- No terminal component currently reads `orderService.itemReadyNotifications()`
- This is the key wiring gap — the data flows, but nothing renders it

### 4. Notification service (backend) is stubbed

- `notification.service.ts` has Twilio SMS and SendGrid email stubs
- `onOrderReady()` is never called from the order-ready endpoint
- **Not blocking for in-app notifications** — in-app uses socket events which already work

### 5. `device.name` is always hardcoded to `'POS Device'`

- `order.ts` line 956: `name: 'POS Device'` regardless of terminal type
- Should use actual device name from `DeviceService` (e.g., "Bar POS", "Register 1")
- Minor — doesn't block notifications but affects display

---

## Implementation Steps

### Step 1: Build Notification list UI in POS terminal

**File:** `src/app/features/pos/server-pos-terminal/server-pos-terminal.html`

Replace the Notifications placeholder (lines 160-167):

```html
@if (activeBottomTab() === 'notifications') {
  <div class="notifications-panel">
    <h3 class="notifications-title">Notifications</h3>

    @if (orderService.itemReadyNotifications().length === 0) {
      <div class="notifications-empty">
        <i class="bi bi-bell"></i>
        <p>No new notifications</p>
      </div>
    } @else {
      <div class="notifications-list">
        @for (notif of orderService.itemReadyNotifications(); track notif.id) {
          <button
            type="button"
            class="notification-item"
            (click)="dismissNotification(notif.id)">
            <div class="notification-icon">
              <i class="bi bi-check-circle-fill"></i>
            </div>
            <div class="notification-content">
              <span class="notification-title">
                @if (notif.allReady) {
                  Order ready
                } @else {
                  Items ready — {{ notif.stationName }}
                }
              </span>
              <span class="notification-detail">
                Order #{{ notif.orderId.slice(-4) }}
              </span>
              <span class="notification-time">
                {{ getTimeAgo(notif.timestamp) }}
              </span>
            </div>
            <i class="bi bi-x notification-dismiss"></i>
          </button>
        }
      </div>
    }
  </div>
}
```

**File:** `src/app/features/pos/server-pos-terminal/server-pos-terminal.ts`

Add:
```typescript
readonly orderService = inject(OrderService); // if not already injected

dismissNotification(id: string): void {
  this.orderService.clearItemReadyNotification(id);
}

getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}
```

### Step 2: Add unread badge to bell icon in bottom nav

**All 4 terminal HTML files** — update the Notifications bottom nav button:

```html
<button
  type="button"
  class="bottom-nav-item"
  [class.active]="activeBottomTab() === 'notifications'"
  (click)="selectBottomTab('notifications')">
  <div class="nav-icon-wrapper">
    <i class="bi bi-bell"></i>
    @if (orderService.itemReadyNotifications().length > 0) {
      <span class="notification-badge">{{ orderService.itemReadyNotifications().length }}</span>
    }
  </div>
  <span>Notifications</span>
</button>
```

**All 4 terminal SCSS files** — add badge styles:

```scss
.nav-icon-wrapper {
  position: relative;
  display: inline-flex;
}

.notification-badge {
  position: absolute;
  top: -4px;
  right: -8px;
  background: #ef4444;
  color: white;
  font-size: 10px;
  font-weight: 600;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}
```

### Step 3: Replicate Notification UI to Bar, Kiosk, Register

**Files:**
- `src/app/features/bar/bar-terminal/bar-terminal.{ts,html,scss}`
- `src/app/features/kiosk/kiosk-terminal/kiosk-terminal.{ts,html,scss}`
- `src/app/features/register/register-terminal/register-terminal.{ts,html,scss}`

Same notification list, badge, and dismiss logic as POS (Step 1 + Step 2).

### Step 4: Add notification sound

**File:** `src/app/services/order.ts`

In the `items:ready` socket listener (around line 315), after pushing to `_itemReadyNotifications`, play a notification sound:

```typescript
// After pushing notification to signal
this.playNotificationSound();

private playNotificationSound(): void {
  try {
    const audio = new Audio('assets/sounds/notification.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => { /* browser may block autoplay */ });
  } catch { /* ignore audio errors */ }
}
```

**New file:** `src/assets/sounds/notification.mp3` — short chime sound (needs to be sourced/created).

### Step 5: Style the notifications panel

**All 4 terminal SCSS files:**

```scss
.notifications-panel {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.notifications-title {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 16px;
}

.notifications-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #9ca3af;

  i { font-size: 48px; margin-bottom: 12px; }
  p { font-size: 15px; }
}

.notifications-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.notification-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #f0f7ff;
  border: 1px solid #d0e3ff;
  border-radius: 10px;
  cursor: pointer;
  width: 100%;
  text-align: left;
  transition: all 0.15s;

  &:hover {
    background: #e0eeff;
  }
}

.notification-icon {
  i {
    font-size: 24px;
    color: #22c55e;
  }
}

.notification-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.notification-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}

.notification-detail {
  font-size: 13px;
  color: #6b7280;
}

.notification-time {
  font-size: 11px;
  color: #9ca3af;
}

.notification-dismiss {
  font-size: 16px;
  color: #9ca3af;
}
```

---

## Data Flow (End-to-End)

```
1. POS/Bar/Register creates order
   → orderData includes sourceDeviceId (from localStorage.device_id)
   → Backend stores order with device reference

2. KDS displays order → kitchen staff prepares food

3. Kitchen staff bumps order on KDS (marks items ready)
   → KDS calls PATCH /orders/:id/items/ready
   → Backend checks if ALL items complete
   → Backend emits socket events:
      • 'items:ready' → source device ONLY (with orderId, stationName, allReady)
      • 'order:updated' → source device + ALL KDS

4. Source POS/Bar/Register receives 'items:ready' socket event
   → OrderService pushes to _itemReadyNotifications signal (max 5)
   → Notification sound plays
   → Bell icon shows red badge with count

5. Staff taps Notifications tab
   → Sees list of ready orders
   → Taps notification to dismiss it
   → Badge count decreases
```

---

## Files Summary

| # | File | Change |
|---|------|--------|
| 1 | `src/app/features/pos/server-pos-terminal/server-pos-terminal.ts` | Add `dismissNotification()`, `getTimeAgo()`, expose `orderService` |
| 2 | `src/app/features/pos/server-pos-terminal/server-pos-terminal.html` | Replace Notifications placeholder with list UI + bell badge |
| 3 | `src/app/features/pos/server-pos-terminal/server-pos-terminal.scss` | Add notification panel + badge styles |
| 4 | `src/app/features/bar/bar-terminal/bar-terminal.ts` | Same as POS |
| 5 | `src/app/features/bar/bar-terminal/bar-terminal.html` | Same as POS |
| 6 | `src/app/features/bar/bar-terminal/bar-terminal.scss` | Same as POS |
| 7 | `src/app/features/kiosk/kiosk-terminal/kiosk-terminal.ts` | Same as POS |
| 8 | `src/app/features/kiosk/kiosk-terminal/kiosk-terminal.html` | Same as POS |
| 9 | `src/app/features/kiosk/kiosk-terminal/kiosk-terminal.scss` | Same as POS |
| 10 | `src/app/features/register/register-terminal/register-terminal.ts` | Same as POS |
| 11 | `src/app/features/register/register-terminal/register-terminal.html` | Same as POS |
| 12 | `src/app/features/register/register-terminal/register-terminal.scss` | Same as POS |
| 13 | `src/app/services/order.ts` | Add `playNotificationSound()` to `items:ready` handler |
| 14 | `src/assets/sounds/notification.mp3` | **NEW** — notification chime audio file |

## Verification

1. `ng serve` — confirm no build errors
2. Open `/pos` in browser tab 1, open `/kds` in browser tab 2 (same restaurant)
3. On POS: create an order with items, send to kitchen
4. On KDS: verify order appears in NEW column
5. On KDS: bump order to ready
6. On POS: verify bell icon shows red badge with "1"
7. On POS: verify notification sound plays
8. On POS: tap Notifications tab — verify notification shows with "Order ready" + order number
9. Tap the notification — verify it dismisses and badge count decreases
10. Repeat with `/bar` and `/register` as the source device
11. Verify Kiosk also receives notifications for orders placed from kiosk

## Sources

- [Square KDS](https://squareup.com/us/en/point-of-sale/restaurants/kitchen-display-system)
- [Square order-ready texts](https://squareup.com/help/us/en/article/8069-text-customers-order-is-ready-with-square-for-restaurants)
- [Square order alerts on mobile](https://intercom.help/sociavore/en/articles/4392704-how-to-receive-square-pos-order-alerts-on-your-mobile-device)
- [Square order alert sound — Community](https://community.squareup.com/t5/General-Discussion/ORDERS-Alert-Sound/m-p/739878)
