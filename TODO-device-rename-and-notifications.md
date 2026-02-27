# TODO: Device Type Rename, Route Restructuring, and Notification Enforcement

> **Status:** Planned — not yet implemented
> **Created:** February 27, 2026
> **Priority:** High — affects kiosk, delivery, and online ordering flows

## Context

The current device type names (`pos_terminal`, `kds_station`, `order_pad`, `printer_station`) don't match industry terminology. Square uses Register, Terminal, Handheld. Additionally, `order_pad` is functionally identical to `pos_terminal` (just restricted permissions), so it should be absorbed. A new `register` type is needed for fixed counter stations with cash drawers.

The `/home` route serves as the admin dashboard and should be renamed to `/administration`.

The public kiosk route (`/kiosk/:restaurantSlug`) should be removed — all devices must be registered and authenticated.

Orders from kiosk, delivery, and online/pickup channels must ALWAYS notify the customer when marked ready — no opt-out.

Voids, comps, and discounts are manager/owner-only operations performed from the Administration dashboard, NOT from the POS terminal.

## Device Type Mapping

| Old | New | Notes |
|-----|-----|-------|
| `pos_terminal` | `terminal` | Portable server device |
| `order_pad` | `terminal` | Absorbed — same hardware, role controls permissions |
| `kds_station` | `kds` | Kitchen display |
| `kiosk` | `kiosk` | No change |
| `printer_station` | `printer` | Headless print station |
| *(new)* | `register` | Fixed counter + cash drawer + receipt printer + customer display |

## All device types require a user record

When registering a device, it must be associated with a user account. Default suggestion is the owner. The user account provides:
- Auth token for the device
- Audit trail for orders placed on that device
- Identity for notification routing

## Files to Modify

### Backend (Get-Order-Stack-Restaurant-Backend) — Deploy First

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Update device_type comments (lines 1152, 1177) |
| *New Prisma migration* | UPDATE existing rows: `pos_terminal`/`order_pad` → `terminal`, `kds_station` → `kds`, `printer_station` → `printer` |
| `src/app/device.routes.ts:16` | Zod enum → `['terminal', 'kds', 'kiosk', 'printer', 'register']`; add `teamMemberId` to create schema; line 134 hard-coded `'pos_terminal'` → `'terminal'` |
| `src/app/device-mode.routes.ts:68,75` | Zod enums → same new values |
| `src/app/onboarding.routes.ts:407` | Hard-coded `'pos_terminal'` → `'terminal'` |
| `src/services/notification.service.ts:109` | Force notification for kiosk/delivery/online/pickup order sources |
| `src/app/device.routes.integration.test.ts` | All `'pos_terminal'` → `'terminal'` in fixtures/assertions |
| `src/app/device-mode.routes.integration.test.ts` | Same rename in test fixtures |

### Frontend (orderstack-app)

| File | Line(s) | Change |
|------|---------|--------|
| `src/app/models/device.model.ts` | 12 | `DeviceType` → `'terminal' \| 'kds' \| 'kiosk' \| 'printer' \| 'register'`; add `teamMemberId?: string` to `DeviceFormData` |
| `src/app/services/device.ts` | 80 | `devicesByType` array → new values |
| `src/app/features/settings/device-hub/device-hub.ts` | 35-49, 131, 141, 149, 194 | Labels, icons, defaults (`register` as default), deviceTypes array |
| `src/app/features/settings/device-hub/device-hub.html` | 157 | `'kds_station'` → `'kds'` |
| `src/app/features/auth/pos-login/pos-login.ts` | 456-472 | Switch cases: remove `order_pad`, rename types, `printer` → `/administration` |
| `src/app/app.routes.ts` | 55-57 | Remove public kiosk route `/kiosk/:restaurantSlug` |
| `src/app/app.routes.ts` | 105, 177 | `'home'` → `'administration'` |
| `src/app/layouts/main-layout.component.ts` | 106 | Sidebar: "Home" → "Administration", `/home` → `/administration` |
| `src/app/features/kiosk/kiosk-terminal/kiosk-terminal.ts` | 231-242 | Remove slug handling from `ngOnInit()`, remove `ActivatedRoute` import |

## Notification Rules by Order Source

| Order Source | Customer Info Source | Notification Mandatory? | Channels |
|---|---|---|---|
| **Kiosk** | Collected at checkout (name/phone/email) | YES — always | SMS + email (based on what was provided) |
| **Delivery** | Delivery platform provides contact | YES — always | SMS + email |
| **Online/Pickup** | Collected during online checkout | YES — always | SMS + email |
| **POS (register/terminal)** | Not collected | NO — server tells customer verbally | None (unless setting enabled) |

Backend change in `notification.service.ts`:
```typescript
const forcedSources = ['kiosk', 'delivery', 'online', 'pickup'];
const isForced = forcedSources.includes(order.orderSource);
if (!isForced && !settings.orderReadyNotifyCustomer) {
  return results; // Skip for POS orders when disabled
}
```

## Voids / Comps / Discounts — Administration Only

These are manager/owner-only operations. They should be removed from the POS terminal (`server-pos-terminal.ts`) and only accessible from the Administration dashboard (`/administration`, currently `/home`).

Server POS currently has modals for: modifier, discount, void, comp, split, transfer, tab, templates, save-template, qr-pay, course-fire, payment.

**Remove from POS:** discount, void, comp
**Keep in POS:** modifier, split, transfer, tab, templates, save-template, qr-pay, course-fire, payment

These operations move to a new section in the Administration dashboard where managers can look up orders and apply voids/comps/discounts.

## Database Migration SQL

```sql
-- devices table
UPDATE devices SET device_type = 'terminal' WHERE device_type IN ('pos_terminal', 'order_pad');
UPDATE devices SET device_type = 'kds' WHERE device_type = 'kds_station';
UPDATE devices SET device_type = 'printer' WHERE device_type = 'printer_station';

-- device_modes table
UPDATE device_modes SET device_type = 'terminal' WHERE device_type IN ('pos_terminal', 'order_pad');
UPDATE device_modes SET device_type = 'kds' WHERE device_type = 'kds_station';
UPDATE device_modes SET device_type = 'printer' WHERE device_type = 'printer_station';
```

No ALTER TYPE needed — Prisma uses plain String columns.

## Execution Order

1. Backend: Prisma migration (data UPDATE) — must precede validation changes
2. Backend: Update all Zod enums, hard-coded values, notification service
3. Backend: Update integration tests, verify pass
4. **Deploy backend to Render** — gate before frontend changes
5. Frontend: Models and services
6. Frontend: Device hub UI
7. Frontend: POS login routing
8. Frontend: Routes and navigation (`/home` → `/administration`, remove public kiosk)
9. Frontend: Kiosk terminal cleanup (remove slug handling)

## Verification

1. Backend: `npx prisma migrate dev` succeeds, tests pass
2. Frontend: `ng build --configuration=development` compiles clean
3. Settings > Hardware shows: Register (default), Terminal, KDS, Kiosk, Printer
4. Sidebar shows "Administration" at `/administration`
5. `/kiosk/taipa-kendall` returns 404 (public route removed)
6. `/kiosk` requires registered kiosk device
7. PATCH kiosk order to status=ready → notification fires regardless of settings
