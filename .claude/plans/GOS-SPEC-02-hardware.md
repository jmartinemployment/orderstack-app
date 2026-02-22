# GOS-SPEC-02: POS Device Setup & Hardware Management

## Context

Square's POS ecosystem treats hardware as a unified domain — devices, printers, KDS stations, peripherals, and kiosk profiles are all managed from a single "Devices" section in the dashboard. Each device gets a **device code** (5-character, expires in 5 days) for zero-touch pairing, and restaurants apply reusable **Modes** (configuration profiles for checkout behavior, receipt routing, security) to devices rather than configuring each one individually. Printer routing is handled via **Printer Profiles** (named groups that map print job types like receipts/kitchen tickets to specific printers). KDS stations distinguish between **Prep** (line cook) and **Expeditor** (expo) roles with timer configurations.

**Current OrderStack state** — hardware is scattered across 3 separate Control Panel tabs:
- **`'devices'`** tab — basic `DeviceRegistration` with 6-digit codes, 48h expiry, pending/active/revoked status (`staff-management.model.ts:167-186`)
- **`'printers'`** tab — `Printer` with Star models, CloudPRNT config, MAC/IP (`printer.model.ts`)
- **`'stations'`** tab — `KdsStation` with color, displayOrder, isExpo, category mappings (`station.model.ts`)

These 3 domains need to be unified under a single **Hardware** hub with shared device identity, reusable configuration profiles (Modes), and printer routing profiles — matching Square's cohesive approach.

---

## Mode Awareness (GOS-SPEC-01 Integration)

**Dependency:** This spec builds on `PlatformService` and `ModeFeatureFlags` from GOS-SPEC-01. Device hardware management is the **bridge** between the platform mode system and the physical POS environment — each device is assigned both a hardware configuration profile (`DeviceMode`) and a platform POS mode (`DevicePosMode`).

### Business Verticals

Hardware management is **universal across all verticals**. Every merchant — restaurant, retail, services, bookings — registers devices, manages printers, and configures peripherals. The DeviceHub UI is available to all verticals.

### Device Type ↔ POS Mode Relationship

The existing `DeviceType` in this spec maps to platform modes from GOS-SPEC-01:

| DeviceType | Typical POS Modes | Vertical |
|---|---|---|
| `pos_terminal` | `quick_service`, `full_service`, `bar`, `retail`, `services`, `standard` | All |
| `kds_station` | N/A (KDS is a display, not a POS mode) — enabled by `enableKds` flag | Food & Drink |
| `kiosk` | `quick_service` (always) | Food & Drink, Retail |
| `order_pad` | Inherits parent device's mode | Food & Drink |
| `printer_station` | N/A (receives print jobs, not a POS mode) | All |

**Key change:** The `Device` interface gains a `posMode` field linking to `DevicePosMode`:

```ts
// Add to Device interface
posMode: DevicePosMode | null;  // Links to GOS-SPEC-01 platform mode (null for non-POS devices like printers/KDS)
```

### DeviceMode vs DevicePosMode — Two Layers

This spec's `DeviceMode` (checkout, receipt, security, display settings) operates as a **hardware configuration profile** — a layer below the platform `DevicePosMode`. They compose:

- **`DevicePosMode`** (from GOS-SPEC-01) → determines **what features are available** (open checks, coursing, floor plan, etc.)
- **`DeviceMode`** (from this spec) → determines **how the device behaves** (auto-print, tip presets, timeout, grid layout)

During device pairing (Step 9), the admin selects **both**: a POS mode (Full Service, Quick Service, Bar, etc.) and a hardware mode profile (Front Counter, Bar POS, Drive-Through, etc.).

### DeviceModeSettings Adaptation by POS Mode

The `DeviceModeSettings` fields in Step 1 should adapt their defaults based on the selected `DevicePosMode`:

| Setting | Quick Service Default | Full Service Default | Bar Default | Retail Default |
|---|---|---|---|---|
| `checkout.defaultOrderType` | `'takeout'` | `'dine-in'` | `'dine-in'` | N/A (no order type) |
| `checkout.requireTableSelection` | `false` | `true` | `false` | `false` |
| `checkout.skipPaymentScreen` | `false` | `true` (pay later) | `true` (tab) | `false` |
| `checkout.showTipPrompt` | `true` | `true` | `true` | `false` |
| `receipt.autoPrintKitchenTicket` | `true` | `true` | `true` | `false` |
| `display.showImages` | `true` | `true` | `false` | `true` |
| `display.gridColumns` | `3` | `3` | `2` | `4` |

### Mode-Conditional UI in DeviceHub

The DeviceHub component (Step 3) adapts its sub-tabs based on the merchant's verticals:

| Sub-Tab | Condition |
|---|---|
| Devices | Always shown |
| Modes | Always shown |
| Printer Profiles | Always shown |
| Peripherals | Always shown |
| Kiosk Profiles | Only if `food_and_drink` or `retail` vertical enabled |

The mode configuration form (Step 7) should:
- Filter the device type dropdown to types relevant to the merchant's verticals
- Show POS mode selector (from `PlatformService.availableModes()`) during mode creation
- Pre-populate `DeviceModeSettings` defaults from the selected POS mode preset
- Hide restaurant-specific settings (e.g., `requireTableSelection`) when mode is `retail` or `services`

### Kiosk Profile Mode Awareness

`KioskProfile` (Step 1) implicitly runs in `quick_service` mode for food & drink, or `retail` mode for retail merchants. Add:

```ts
// Add to KioskProfile
posMode: DevicePosMode;  // 'quick_service' for restaurants, 'retail' for retail
```

### Peripheral Relevance by Vertical

| Peripheral Type | Food & Drink | Retail | Services | Bookings |
|---|---|---|---|---|
| `cash_drawer` | ✓ | ✓ | ✓ | ✓ |
| `barcode_scanner` | — | ✓ | — | — |
| `card_reader` | ✓ | ✓ | ✓ | ✓ |
| `customer_display` | ✓ | ✓ | — | — |
| `scale` | — | ✓ (grocery) | — | — |

The peripheral registration form (Step 12) should filter `PeripheralType` options based on `PlatformService.featureFlags()` — e.g., `barcode_scanner` only appears if `enableBarcodeScanning` is true.

---

## Phase 1 — Unified Device Model + Enhanced Registration (Steps 1-5)

### Step 1: Create `models/device.model.ts`

New model file with all hardware types:

```ts
// Device types that can be registered
export type DeviceType = 'pos_terminal' | 'kds_station' | 'kiosk' | 'order_pad' | 'printer_station';

// Enhanced device (replaces DeviceRegistration from staff-management.model.ts)
export interface Device {
  id: string;
  restaurantId: string;
  locationId: string | null;
  deviceCode: string;           // 5-char alphanumeric (Square-style)
  deviceName: string;
  deviceType: DeviceType;
  modeId: string | null;        // Links to DeviceMode
  status: 'pending' | 'active' | 'revoked';
  hardwareInfo: DeviceHardwareInfo | null;  // Populated after pairing
  lastSeenAt: string | null;
  pairedAt: string | null;
  expiresAt: string;            // Code expiration (5 days)
  createdAt: string;
}

export interface DeviceHardwareInfo {
  platform: string;             // 'iPad', 'Android', 'Windows', 'Browser'
  osVersion: string | null;
  appVersion: string | null;
  screenSize: string | null;    // e.g. '10.2"', '13"'
  serialNumber: string | null;
}

export interface DeviceFormData {
  deviceName: string;
  deviceType: DeviceType;
  locationId?: string;
  modeId?: string;
}

// --- Device Modes (reusable config profiles, like Square Modes) ---

export interface DeviceMode {
  id: string;
  restaurantId: string;
  name: string;                 // e.g. 'Front Counter', 'Bar POS', 'Drive-Through'
  deviceType: DeviceType;       // Mode applies to this device type only
  isDefault: boolean;
  settings: DeviceModeSettings;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceModeSettings {
  // Checkout behavior
  checkout: {
    defaultOrderType: 'dine-in' | 'takeout' | 'delivery';
    requireTableSelection: boolean;
    skipPaymentScreen: boolean;  // For quick-service (pay later)
    autoSendToKds: boolean;
    showTipPrompt: boolean;
    tipPresets: number[];        // e.g. [15, 18, 20, 25]
  };
  // Receipt routing
  receipt: {
    autoPrintReceipt: boolean;
    autoPrintKitchenTicket: boolean;
    printerProfileId: string | null;  // Links to PrinterProfile
  };
  // Security
  security: {
    requirePinPerTransaction: boolean;
    inactivityTimeoutMinutes: number;  // 0 = disabled
    lockOnSleep: boolean;
  };
  // Display
  display: {
    fontSize: 'small' | 'medium' | 'large';
    showImages: boolean;
    gridColumns: 2 | 3 | 4;
    categoryDisplayMode: 'tabs' | 'sidebar';
  };
}

export interface DeviceModeFormData {
  name: string;
  deviceType: DeviceType;
  isDefault?: boolean;
  settings: DeviceModeSettings;
}

// --- Printer Profiles (print job routing) ---

export type PrintJobType = 'customer_receipt' | 'kitchen_ticket' | 'bar_ticket' | 'expo_ticket' | 'order_summary' | 'close_of_day';

export interface PrinterProfile {
  id: string;
  restaurantId: string;
  name: string;                 // e.g. 'Main Floor', 'Patio Bar'
  isDefault: boolean;
  routingRules: PrintRoutingRule[];
  createdAt: string;
  updatedAt: string;
}

export interface PrintRoutingRule {
  jobType: PrintJobType;
  printerId: string;            // Links to existing Printer
  copies: number;               // 1-3
  enabled: boolean;
}

export interface PrinterProfileFormData {
  name: string;
  isDefault?: boolean;
  routingRules: PrintRoutingRule[];
}

// --- Peripheral Devices ---

export type PeripheralType = 'cash_drawer' | 'barcode_scanner' | 'card_reader' | 'customer_display' | 'scale';
export type PeripheralConnectionType = 'usb' | 'bluetooth' | 'network';

export interface PeripheralDevice {
  id: string;
  restaurantId: string;
  parentDeviceId: string;       // Which Device this peripheral is attached to
  type: PeripheralType;
  name: string;
  connectionType: PeripheralConnectionType;
  status: 'connected' | 'disconnected' | 'error';
  lastSeenAt: string | null;
}

// --- Kiosk Profile ---

export interface KioskProfile {
  id: string;
  restaurantId: string;
  name: string;
  welcomeMessage: string;
  showImages: boolean;
  enabledCategories: string[];   // Menu category IDs to display
  requireNameForOrder: boolean;
  maxIdleSeconds: number;        // Auto-reset timeout
  enableAccessibility: boolean;  // Larger fonts, high contrast
  createdAt: string;
  updatedAt: string;
}

export interface KioskProfileFormData {
  name: string;
  welcomeMessage?: string;
  showImages?: boolean;
  enabledCategories?: string[];
  requireNameForOrder?: boolean;
  maxIdleSeconds?: number;
  enableAccessibility?: boolean;
}

// Tab navigation for DeviceHub
export type DeviceHubTab = 'devices' | 'modes' | 'printer-profiles' | 'peripherals' | 'kiosk-profiles';

// Default mode settings factory
export function defaultModeSettings(): DeviceModeSettings {
  return {
    checkout: {
      defaultOrderType: 'dine-in',
      requireTableSelection: true,
      skipPaymentScreen: false,
      autoSendToKds: true,
      showTipPrompt: true,
      tipPresets: [15, 18, 20, 25],
    },
    receipt: {
      autoPrintReceipt: true,
      autoPrintKitchenTicket: true,
      printerProfileId: null,
    },
    security: {
      requirePinPerTransaction: false,
      inactivityTimeoutMinutes: 5,
      lockOnSleep: true,
    },
    display: {
      fontSize: 'medium',
      showImages: true,
      gridColumns: 3,
      categoryDisplayMode: 'tabs',
    },
  };
}
```

### Step 2: Create `services/device.ts` — DeviceService

New service consolidating all hardware management:

- **Device CRUD:** `loadDevices()`, `generateDeviceCode(data: DeviceFormData)`, `pairDevice(code, hardwareInfo)`, `updateDevice(id, data)`, `revokeDevice(id)`, `deleteDevice(id)`
- **Mode CRUD:** `loadModes()`, `createMode(data)`, `updateMode(id, data)`, `deleteMode(id)`, `assignModeToDevice(deviceId, modeId)`
- **Printer Profile CRUD:** `loadPrinterProfiles()`, `createPrinterProfile(data)`, `updatePrinterProfile(id, data)`, `deletePrinterProfile(id)`
- **Peripheral CRUD:** `loadPeripherals()`, `registerPeripheral(data)`, `updatePeripheral(id, data)`, `removePeripheral(id)`
- **Kiosk Profile CRUD:** `loadKioskProfiles()`, `createKioskProfile(data)`, `updateKioskProfile(id, data)`, `deleteKioskProfile(id)`
- **Signals:** `_devices`, `_modes`, `_printerProfiles`, `_peripherals`, `_kioskProfiles` (all with readonly public accessors)
- **Computeds:** `activeDevices`, `pendingDevices`, `devicesByType`, `defaultMode(type)`, `defaultPrinterProfile`

### Step 3: Create `settings/device-hub/` (4 files) — DeviceHub Component

Unified hardware management UI replacing the 3 separate tabs:

**5 sub-tabs:**
1. **Devices** — device list with type icons, status dots (green/yellow/red), code display, mode badge, "Generate Code" button, pair/revoke actions, hardware info panel
2. **Modes** — mode list by device type, create/edit form with 4 setting groups (checkout, receipt, security, display), "Set as Default" toggle, preview panel
3. **Printer Profiles** — profile list, routing rule matrix (job type × printer grid with checkboxes + copy counts), "Set as Default" toggle
4. **Peripherals** — peripheral list grouped by parent device, connection type badges, status indicators, register form
5. **Kiosk Profiles** — profile list, edit form with welcome message, category selector, accessibility toggle, timeout setting

### Step 4: Consolidate Control Panel Tabs

**File: `models/settings.model.ts`**
- Remove `'printers'`, `'stations'`, `'devices'` from `ControlPanelTab` union
- Add `'hardware'` to `ControlPanelTab`
- Net change: 13 values → 11 values

**File: `settings/control-panel/control-panel.ts` + `.html`**
- Replace 3 tab cases with single `'hardware'` tab rendering `<app-device-hub>`
- DeviceHub internally manages its own 5 sub-tabs
- Existing `PrinterSettings`, `StationSettings` components become **internal sub-components** of DeviceHub (imported, not registered as separate tabs)

### Step 5: Update Exports + Registration

**File: `models/index.ts`** — add `device.model` export
**File: `public-api.ts`** — add `DeviceService`, `DeviceHub` exports
**File: `elements/src/main.ts`** — no new custom element (DeviceHub is internal to ControlPanel)

---

## Phase 2 — Device Modes + Printer Profiles (Steps 6-10)

### Step 6: Device Code Generation UI

In the Devices sub-tab of DeviceHub:
- "Generate Device Code" button → opens modal with device name, type selector (5 types with icons), optional location, optional mode assignment
- On submit: calls `DeviceService.generateDeviceCode()` → displays large 5-character code with countdown timer (5-day expiry)
- Code display: monospace font, share button (copy to clipboard), QR code (encode pairing URL)
- Pending devices list with "Waiting for pairing..." pulse animation and expiry countdown

### Step 7: Mode Configuration Form

Full mode editor with 4 collapsible sections:
- **Checkout:** order type dropdown, table selection toggle, skip payment toggle, auto-send-to-KDS toggle, tip prompt + presets editor (drag to reorder, add/remove)
- **Receipt:** auto-print toggles for receipt + kitchen ticket, printer profile selector dropdown
- **Security:** PIN-per-transaction toggle, inactivity timeout slider (0-60 min), lock-on-sleep toggle
- **Display:** font size radio, show images toggle, grid columns selector (2/3/4), category display mode toggle
- Live preview panel showing how the POS terminal would look with current settings
- "Duplicate Mode" button for creating variants

### Step 8: Printer Profile Routing Matrix

Visual matrix editor:
- Rows: print job types (Customer Receipt, Kitchen Ticket, Bar Ticket, Expo Ticket, Order Summary, Close of Day)
- Columns: registered printers (from existing `PrinterService`)
- Each cell: checkbox (enabled) + copies spinner (1-3)
- "Test Route" button per job type — sends test print to configured printer(s)
- Drag to reorder job priority
- Default profile indicator (star badge)

### Step 9: Device Pairing Flow

When a device navigates to the pairing URL or enters a code:
- Client-side: `DeviceService.pairDevice(code, hardwareInfo)` sends device platform, OS, screen size
- Server response: returns full `Device` with assigned mode settings
- Post-pairing: device stores `deviceId` in localStorage, applies mode settings
- Admin sees device move from "Pending" to "Active" with hardware info populated
- "Identify Device" action: triggers a visual flash on the paired device (via WebSocket)

### Step 10: Existing Component Integration

Connect modes to existing POS components:
- `ServerPosTerminal` reads mode settings from `DeviceService` for grid layout, tip presets, auto-send behavior
- `KioskTerminal` reads kiosk profile from `DeviceService` for welcome message, category filtering, timeout
- `OrderPad` reads mode settings for default order type, table selection requirement
- `ReceiptPrinter` reads printer profile for routing decisions (which printer for which job type)

---

## Phase 3 — Station Binding + Peripherals + Kiosk Profiles (Steps 11-15)

### Step 11: KDS Station-Device Binding

Link KDS stations to registered devices:
- Add `boundDeviceId: string | null` to `KdsStation` interface
- In Devices sub-tab: "Assign Station" dropdown on KDS-type devices
- In KDS display: auto-select station filter based on bound device ID from localStorage
- One device = one station (enforced)

### Step 12: Peripheral Management

Register and monitor peripherals:
- Cash drawer: auto-detect via USB HID, "Open Drawer" test button, auto-open on cash payment toggle
- Barcode scanner: USB HID input listener, test scan field, prefix/suffix config
- Card reader: connection status, test charge ($0.00), firmware version
- Customer-facing display: mirror mode (show order items) or custom message mode
- Status polling: periodic check via WebSocket, auto-reconnect prompts

### Step 13: Kiosk Profile Configuration

Full kiosk profile editor:
- Welcome message (rich text with restaurant name variable)
- Category selector: checkbox list of menu categories, drag to reorder display order
- Branding: logo upload placeholder, color theme override (primary/accent)
- Behavior: require name toggle, idle timeout slider (30-300 seconds), accessibility mode toggle
- "Preview" button opens kiosk in a modal iframe-like view

### Step 14: Device Health Dashboard

Overview panel at top of Devices sub-tab:
- Total devices count by type (icon badges)
- Online/Offline split (green/red counts)
- Last-seen timestamps with "X minutes ago" relative time
- Alert for devices not seen in >1 hour
- Battery level (if reported by mobile devices)

### Step 15: Build Verification

- `ng build get-order-stack-restaurant-frontend-library` — zero errors
- `ng build get-order-stack-restaurant-frontend-elements` — zero errors
- Verify ControlPanel has `'hardware'` tab replacing `'printers'`, `'stations'`, `'devices'`
- Verify DeviceHub has 5 sub-tabs (Devices, Modes, Printer Profiles, Peripherals, Kiosk Profiles)
- Verify all new model interfaces exported from `public-api.ts`

---

## Files Summary

### New Files
| File | Purpose |
|------|---------|
| `models/device.model.ts` | All hardware types: Device, DeviceMode, PrinterProfile, PeripheralDevice, KioskProfile |
| `services/device.ts` | DeviceService — unified hardware management (~25 methods) |
| `settings/device-hub/device-hub.ts` | DeviceHub component — 5-tab hardware management UI |
| `settings/device-hub/device-hub.html` | Template |
| `settings/device-hub/device-hub.scss` | Styles |
| `settings/device-hub/index.ts` | Barrel export |

### Modified Files
| File | Changes |
|------|---------|
| `models/settings.model.ts` | Replace `'printers' \| 'stations' \| 'devices'` with `'hardware'` in ControlPanelTab |
| `models/station.model.ts` | Add `boundDeviceId: string \| null` to KdsStation (Phase 3) |
| `models/index.ts` | Add device.model export |
| `settings/control-panel/control-panel.ts` | Replace 3 tab cases with single 'hardware' → DeviceHub |
| `settings/control-panel/control-panel.html` | Replace 3 tab contents with DeviceHub |
| `public-api.ts` | Add DeviceService, DeviceHub exports |

### Existing Components Reused Inside DeviceHub
| Component | Current Tab | New Location |
|-----------|-------------|-------------|
| `PrinterSettings` | `'printers'` tab | DeviceHub > Printer Profiles sub-tab (imported internally) |
| `StationSettings` | `'stations'` tab | DeviceHub > Devices sub-tab KDS section (imported internally) |

---

## Implementation Order

1. **Step 1** — Create `models/device.model.ts` (all interfaces + types)
2. **Step 2** — Create `services/device.ts` (DeviceService with CRUD methods)
3. **Step 3** — Create `settings/device-hub/` (DeviceHub component with 5 sub-tabs)
4. **Step 4** — Consolidate ControlPanel tabs (`'hardware'` replaces 3 tabs)
5. **Step 5** — Update exports (`models/index.ts`, `public-api.ts`)
6. **Build verification** — `ng build` both library and elements
7. **Steps 6-10** — Device code generation, mode form, printer profile matrix, pairing, component integration
8. **Steps 11-15** — Station binding, peripherals, kiosk profiles, health dashboard

---

## API Endpoints (Backend — assumed to exist or built in parallel)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/restaurant/:id/devices` | List all devices |
| POST | `/api/restaurant/:id/devices` | Generate device code |
| PATCH | `/api/restaurant/:id/devices/:deviceId` | Update device |
| POST | `/api/restaurant/:id/devices/:deviceId/pair` | Pair device with code |
| DELETE | `/api/restaurant/:id/devices/:deviceId` | Revoke/delete device |
| GET | `/api/restaurant/:id/device-modes` | List modes |
| POST | `/api/restaurant/:id/device-modes` | Create mode |
| PATCH | `/api/restaurant/:id/device-modes/:modeId` | Update mode |
| DELETE | `/api/restaurant/:id/device-modes/:modeId` | Delete mode |
| GET | `/api/restaurant/:id/printer-profiles` | List printer profiles |
| POST | `/api/restaurant/:id/printer-profiles` | Create printer profile |
| PATCH | `/api/restaurant/:id/printer-profiles/:profileId` | Update printer profile |
| DELETE | `/api/restaurant/:id/printer-profiles/:profileId` | Delete printer profile |
| GET | `/api/restaurant/:id/peripherals` | List peripherals |
| POST | `/api/restaurant/:id/peripherals` | Register peripheral |
| PATCH | `/api/restaurant/:id/peripherals/:peripheralId` | Update peripheral |
| DELETE | `/api/restaurant/:id/peripherals/:peripheralId` | Remove peripheral |
| GET | `/api/restaurant/:id/kiosk-profiles` | List kiosk profiles |
| POST | `/api/restaurant/:id/kiosk-profiles` | Create kiosk profile |
| PATCH | `/api/restaurant/:id/kiosk-profiles/:profileId` | Update kiosk profile |
| DELETE | `/api/restaurant/:id/kiosk-profiles/:profileId` | Delete kiosk profile |

---

## Verification

1. `ng build get-order-stack-restaurant-frontend-library` — zero errors
2. `ng build get-order-stack-restaurant-frontend-elements` — zero errors
3. Verify Control Panel shows "Hardware" tab (not separate Printers/Stations/Devices)
4. Verify DeviceHub renders 5 sub-tabs
5. Verify device code generation produces 5-char alphanumeric codes
6. Verify mode settings form has 4 collapsible sections
7. Verify printer profile routing matrix renders correctly with existing printers
8. Verify all new interfaces exported from `public-api.ts`
