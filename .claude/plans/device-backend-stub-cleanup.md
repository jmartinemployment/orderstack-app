# Plan: Device Management Backend + Frontend Stub Cleanup

## Context

The frontend `DeviceService` calls 24 API endpoints across 5 domains (devices, modes, printer profiles, peripherals, kiosk profiles). The backend only has 6 basic device endpoints with a simple Prisma model. The frontend uses localStorage stubs to fake data when APIs don't exist — this violates the project's "Correctness Over Completion" rule and must be removed. The backend must be running for all flows to work.

**Backend:** `/Users/jam/development/Get-Order-Stack-Restaurant-Backend`
**Frontend:** `/Users/jam/development/orderstack-app`

---

## Segment 1: Prisma Schema Migration

**Goal:** Expand Device model, add 4 new models.

**File:** `prisma/schema.prisma`

**1a. Rewrite `Device` model** (replace existing):
- Remove old `deviceId` field (external string identifier)
- Add: `locationId`, `deviceCode` (5-char pairing code, unique, nullable), `deviceName` (required), `posMode`, `modeId` (FK to DeviceMode), `status` ('pending'|'active'|'revoked' — replaces boolean `isActive`), `hardwareInfo` (Json), `pairedAt`, `expiresAt`
- Add relation: `mode DeviceMode?`, `peripherals PeripheralDevice[]`

**1b. Add `DeviceMode` model:**
- Fields: `id`, `restaurantId`, `name`, `deviceType`, `isDefault`, `settings` (Json — checkout/receipt/security/display), `createdAt`, `updatedAt`
- Unique constraint: `[restaurantId, name]`
- Relations: `restaurant Restaurant`, `devices Device[]`

**1c. Add `PrinterProfile` model:**
- Fields: `id`, `restaurantId`, `name`, `isDefault`, `routingRules` (Json — PrintRoutingRule[]), `createdAt`, `updatedAt`
- Unique constraint: `[restaurantId, name]`

**1d. Add `PeripheralDevice` model:**
- Fields: `id`, `restaurantId`, `parentDeviceId` (FK to Device), `type`, `name`, `connectionType`, `status`, `lastSeenAt`, `createdAt`, `updatedAt`
- Relations: `parentDevice Device`, `restaurant Restaurant`

**1e. Add `KioskProfile` model:**
- Fields: `id`, `restaurantId`, `name`, `posMode`, `welcomeMessage`, `showImages`, `enabledCategories` (Json string[]), `requireNameForOrder`, `maxIdleSeconds`, `enableAccessibility`, `createdAt`, `updatedAt`
- Unique constraint: `[restaurantId, name]`

**1f. Add relations to `Restaurant` model:**
- `deviceModes DeviceMode[]`, `printerProfiles PrinterProfile[]`, `peripheralDevices PeripheralDevice[]`, `kioskProfiles KioskProfile[]`

**Verify:** `npx prisma migrate dev --name device-management-expansion` succeeds, `npx prisma generate` succeeds, `npx tsc --noEmit` passes.

---
---
# END OF SEGMENT 1 — TEST HERE BEFORE CONTINUING
---
---

## Segment 2: Rewrite Device Routes + Add Pairing

**Goal:** Replace old simple device CRUD with frontend-aligned API. Add device pairing flow.

### 2a. Device code utility

**New file:** `src/utils/device-code.ts`
- `generateDeviceCode()` — 5-char uppercase alphanumeric (excludes ambiguous chars 0/O/I/1/L)
- Checks uniqueness against existing `pending` devices in database
- Returns the code string

### 2b. Rewrite `src/app/device.routes.ts`

Replace all existing endpoints. New endpoints:

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/:restaurantId/devices` | List devices (optional `?status=active` filter) |
| `POST` | `/:restaurantId/devices` | Create device with pairing code (`status: 'pending'`, `expiresAt: +15min`) |
| `POST` | `/:restaurantId/devices/register-browser` | Register browser as device (`status: 'active'`, no code, captures hardwareInfo) |
| `GET` | `/:restaurantId/devices/:id` | Get single device by UUID |
| `PATCH` | `/:restaurantId/devices/:id` | Update device (name, posMode, modeId, status) |
| `DELETE` | `/:restaurantId/devices/:id` | Delete device |
| `POST` | `/:restaurantId/devices/:id/heartbeat` | Update lastSeenAt |

All routes: `requireAuth` + `requireRestaurantAccess` middleware. Zod validation on request bodies.

### 2c. Device pairing route (global scope)

**New file:** `src/app/device-pairing.routes.ts`

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/devices/pair` | Pair device by code. Accepts `{ code, hardwareInfo }`. Validates: device exists, status is `pending`, not expired. Updates to `status: 'active'`, stores hardwareInfo, sets pairedAt. Returns full device. **No auth required** (code is self-authenticating). |
| `GET` | `/api/devices/:id` | Get device by UUID. Used by frontend `resolveCurrentDevice()` on page refresh. `requireAuth` middleware. |

### 2d. Update onboarding to create browser device

**File:** `src/app/onboarding.routes.ts`

Inside the `POST /api/onboarding/create` transaction, after creating restaurant + user, add:
```
Device.create({ restaurantId, deviceName: 'Browser', deviceType: 'pos_terminal',
  posMode: defaultDeviceMode, status: 'active', pairedAt: now, hardwareInfo: { platform: 'Browser' } })
```

Include `deviceId: device.id` in the onboarding response.

### 2e. Mount new routes

**File:** `src/app/app.ts`
- Mount `device-pairing.routes.ts` at `/api/devices`
- Existing device routes already mounted

**Verify:**
1. `npx tsc --noEmit` passes
2. `POST /api/onboarding/create` returns `deviceId` in response
3. `GET /api/restaurant/:id/devices` lists the browser device
4. `POST /api/restaurant/:id/devices` creates device with pairing code
5. `POST /api/devices/pair` with valid code activates the device
6. `POST /api/devices/pair` with expired/invalid code returns 400
7. `GET /api/devices/:id` returns device details

---
---
# END OF SEGMENT 2 — TEST HERE BEFORE CONTINUING
---
---

## Segment 3: New Backend Route Files (Modes, Printer Profiles, Peripherals, Kiosks)

**Goal:** Four new CRUD route files matching frontend DeviceService API contract.

Each file follows the `station.routes.ts` pattern: Zod schemas at top, CRUD handlers, `requireAuth` + `requireRestaurantAccess` middleware.

### 3a. `src/app/device-mode.routes.ts`

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/:restaurantId/device-modes` | List modes |
| `POST` | `/:restaurantId/device-modes` | Create mode (validate name, deviceType, settings JSON) |
| `PATCH` | `/:restaurantId/device-modes/:id` | Update mode |
| `DELETE` | `/:restaurantId/device-modes/:id` | Delete mode (reject if devices reference it) |

When `isDefault: true`, unset any existing default for same `restaurantId` + `deviceType`.

### 3b. `src/app/printer-profile.routes.ts`

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/:restaurantId/printer-profiles` | List profiles |
| `POST` | `/:restaurantId/printer-profiles` | Create profile |
| `PATCH` | `/:restaurantId/printer-profiles/:id` | Update profile |
| `DELETE` | `/:restaurantId/printer-profiles/:id` | Delete profile |

When `isDefault: true`, unset any existing default for same `restaurantId`.

### 3c. `src/app/peripheral.routes.ts`

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/:restaurantId/peripherals` | List peripherals (optional `?parentDeviceId=` filter) |
| `POST` | `/:restaurantId/peripherals` | Register peripheral (validate parentDeviceId exists) |
| `DELETE` | `/:restaurantId/peripherals/:id` | Remove peripheral |

### 3d. `src/app/kiosk-profile.routes.ts`

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/:restaurantId/kiosk-profiles` | List profiles |
| `POST` | `/:restaurantId/kiosk-profiles` | Create profile |
| `PATCH` | `/:restaurantId/kiosk-profiles/:id` | Update profile |
| `DELETE` | `/:restaurantId/kiosk-profiles/:id` | Delete profile |

### 3e. Mount all in `src/app/app.ts`

**Verify:**
1. `npx tsc --noEmit` passes
2. CRUD test each domain: create → list → update → delete
3. Default enforcement: creating `isDefault: true` mode unsets previous default
4. Delete protection: deleting a mode referenced by a device returns 409

---
---
# END OF SEGMENT 3 — TEST HERE BEFORE CONTINUING
---
---

## Segment 4: Frontend — Remove Stubs, Keep Caching

**Goal:** Remove every localStorage-as-stub pattern. Backend is required for all flows.

### 4a. `src/app/services/device.ts`

**Remove:**
- `skipDeviceSetup()` method entirely
- `device_skipped` localStorage read in `resolveCurrentDevice()`

**Add:**
- `registerBrowserDevice(posMode: DevicePosMode): Promise<Device | null>` — calls `POST /restaurant/:id/devices/register-browser` with `{ posMode, hardwareInfo: { platform: 'Browser', screenSize, osVersion } }`. On success, stores `device_id` in localStorage, sets `_currentDevice` signal. On failure, sets `_error` signal, returns null.

**Keep unchanged:**
- `persistData()` / `loadFallback()` — cache-after-success pattern
- `device_id` localStorage key — stores real device UUID after registration or pairing
- All other CRUD methods (already API-first)

### 4b. `src/app/services/platform.ts`

**Remove from `completeOnboarding()` catch block:**
- The fake `OnboardingResult` with `token: 'local-onboarding'`
- The `localStorage.setItem('onboarding-payload', ...)` fallback
- The `localStorage.setItem('onboarding-result', ...)` fallback
- The `buildProfileFromPayload()` call in the catch

**Replace with:** Set `_error` signal with message, return `null`. Let UI show the error.

**Add to `completeOnboarding()` success path:**
- Store `result.deviceId` in localStorage as `device_id` (the onboarding response now includes this)

### 4c. `src/app/guards/onboarding.guard.ts`

**Remove:** The `localStorage.getItem('onboarding-result')` fallback check. This existed solely for the fake `local-onboarding` token case.

**Keep:** Profile-in-memory check, restaurantId + API reload, restaurants array from login.

### 4d. `src/app/features/onboarding/setup-wizard/setup-wizard.ts`

**In `goToDashboard()`:**
- Replace `this.deviceService.skipDeviceSetup(...)` with `await this.deviceService.registerBrowserDevice(defaultMode)`
- On success: `platformService.setDeviceModeFromDevice(defaultMode)`, navigate to `/pos-login`
- On failure: Show error to user, don't navigate

### 4e. `src/app/features/onboarding/device-setup/device-setup.ts`

**In `getStarted()` / skip handler:**
- Replace `skipDeviceSetup()` with `registerBrowserDevice()`
- Same success/failure pattern as 4d

### 4f. Update `OnboardingResult` type if needed

**File:** `src/app/models/platform.model.ts` (or wherever `OnboardingResult` is defined)
- Add `deviceId: string` field if not already present

**Verify:**
1. `ng build --configuration=production` — zero errors
2. Full flow: Login → Setup Wizard → "Let's Go" → POS Login → Landing
3. Confirm `device_id` in localStorage is a real UUID (not `local-browser`)
4. Confirm no `local-onboarding` or `onboarding-result` in localStorage
5. Page refresh works: resolver fetches device by ID from API
6. Backend down during onboarding: error message shown, no fake data created

---
---
# END OF SEGMENT 4 — TEST HERE BEFORE CONTINUING
---
---

## Segment 5: Integration Hardening

**Goal:** Edge cases and robustness.

### 5a. Device code expiration
- Devices created with pairing codes get `expiresAt: now + 15 minutes`
- Pairing endpoint rejects expired codes with 400
- Browser devices get `expiresAt: null`

### 5b. Heartbeat and online status
- `GET /:restaurantId/devices` computes `isOnline` (lastSeenAt within 30 seconds)
- Frontend can call heartbeat on interval for real paired devices

### 5c. Auth on all routes
- All restaurant-scoped routes: `requireAuth` + `requireRestaurantAccess`
- `POST /api/devices/pair`: no auth (code is self-authenticating)
- `GET /api/devices/:id`: `requireAuth`

### 5d. Cleanup unused localStorage keys
- Remove any code that reads `device_skipped`
- Remove any code that reads `onboarding-result`
- Grep both codebases for orphaned localStorage references

**Verify:**
1. Expired pairing code returns 400
2. Default mode enforcement works (only one default per deviceType per restaurant)
3. Unauthenticated requests to device routes return 401
4. No orphaned localStorage keys remain
5. Full end-to-end: fresh onboarding → device registered → mode set → POS loads with correct gates

---

## Files Summary

### Backend — New Files (6)
| File | Purpose |
|------|---------|
| `src/utils/device-code.ts` | Pairing code generator |
| `src/app/device-pairing.routes.ts` | Global pairing + device lookup |
| `src/app/device-mode.routes.ts` | DeviceMode CRUD |
| `src/app/printer-profile.routes.ts` | PrinterProfile CRUD |
| `src/app/peripheral.routes.ts` | PeripheralDevice CRUD |
| `src/app/kiosk-profile.routes.ts` | KioskProfile CRUD |

### Backend — Modified Files (4)
| File | Change |
|------|--------|
| `prisma/schema.prisma` | Expand Device, add 4 models, add Restaurant relations |
| `src/app/device.routes.ts` | Full rewrite |
| `src/app/onboarding.routes.ts` | Add browser device creation in transaction |
| `src/app/app.ts` | Mount 5 new route files |

### Frontend — Modified Files (5-6)
| File | Change |
|------|--------|
| `src/app/services/device.ts` | Remove `skipDeviceSetup`, add `registerBrowserDevice` |
| `src/app/services/platform.ts` | Remove fake OnboardingResult, store real deviceId |
| `src/app/guards/onboarding.guard.ts` | Remove `onboarding-result` localStorage fallback |
| `src/app/features/onboarding/setup-wizard/setup-wizard.ts` | Use `registerBrowserDevice` |
| `src/app/features/onboarding/device-setup/device-setup.ts` | Use `registerBrowserDevice` |
| `src/app/models/platform.model.ts` | Add `deviceId` to `OnboardingResult` if needed |
