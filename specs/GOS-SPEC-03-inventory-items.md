# GOS-SPEC-03: Inventory & Items — Square Parity Enhancements

## Context

Square's Item Library is a centralized hub with rich item metadata (variations with per-variation SKU/stock/cost, reporting categories distinct from organizational categories, allergen/nutrition data, time-based availability windows, barcode generation/scanning, and CSV bulk import/export). OrderStack's current menu system has strong foundations — bilingual items, modifier groups with min/max rules, AI cost estimation, 86'd tracking, and dietary tags — but lacks several features Square considers standard.

**Key gaps identified:**
- No SKU/barcode support on `MenuItem`
- No distinction between **variations** (inventory-tracked size/options) and **modifiers** (add-on customizations)
- No **reporting categories** separate from organizational categories
- No time-based **item availability windows** (daypart restrictions)
- No **allergen management** beyond 8 dietary tags
- No **CSV bulk import** for menu items
- No **item visibility per channel** (POS vs online vs kiosk vs delivery)
- No **purchase order workflow** (only reorder recommendations)

**Existing codebase assets to build on:**
- `models/menu.model.ts` — `MenuItem`, `MenuCategory`, `ModifierGroup`, `Modifier`, `DietaryInfo`
- `services/menu.ts` — `MenuService` with CRUD + AI methods
- `models/inventory.model.ts` — `InventoryItem` with stock tracking, alerts, predictions
- `services/inventory.ts` — `InventoryService` with 10 methods
- `models/vendor.model.ts` — `Vendor`, `PurchaseInvoice`, `PurchaseLineItem` (Food Cost dashboard)
- `menu-mgmt/item-management/` — existing item CRUD UI
- `menu-mgmt/category-management/` — existing category CRUD UI
- `inventory/inventory-dashboard/` — existing 3-tab inventory UI

---

## Mode Awareness (GOS-SPEC-01 Alignment)

This spec's enhancements apply across **all business verticals** — every vertical has items and inventory. However, model fields and UI features diverge significantly by vertical and device mode.

### MenuItem Field Categorization

| Field Category | Fields | Verticals |
|---|---|---|
| **Universal (all verticals)** | `id`, `name`, `nameEs`, `description`, `price`, `isActive`, `sku`, `barcode`, `barcodeFormat`, `channelVisibility`, `reportingCategoryId`, `variations`, `optionSetIds`, `hasVariations` | All |
| **Food & Drink extension** | `prepTimeMinutes`, `modifierGroups`, `allergens`, `nutritionFacts`, `availabilityWindows`, `dietaryInfo`, `aiEstimatedCost`, `aiSuggestedPrice` | `food_and_drink` only |
| **Retail extension** | `weight`, `dimensions`, `shelfLocation`, `vendorSku`, `reorderPoint` | `retail`, `grocery` |
| **Services extension** | `durationMinutes`, `depositRequired`, `depositAmount`, `staffRequired` | `beauty_wellness`, `healthcare`, `sports_fitness` |

**Implementation rule:** All extensions live on the same `MenuItem` interface as nullable fields. `PlatformService.featureFlags` determines which fields appear in the Item Management UI.

### Feature Flag Gating

| Feature | Required Flag / Vertical | Effect When Disabled |
|---|---|---|
| SKU / Barcode | Universal (always available) | — |
| Barcode **scanning** | `enableBarcodeScanning` (Retail, Grocery) | Scan icon hidden in Item Management; manual barcode entry still available |
| Modifier groups on items | `food_and_drink` vertical | Modifier tab hidden in Item Management |
| Allergens & Nutrition | `food_and_drink` vertical | Allergen/nutrition sections hidden |
| Availability windows (dayparts) | `food_and_drink` vertical | Availability section hidden |
| Variations (size/color) | Universal | — |
| CSV import/export | Universal | — |
| Reporting categories | Universal | — |
| Channel visibility | Universal | Channels shown adapt per vertical (POS is always shown; Online/Kiosk/Delivery shown only if enabled modules include them) |
| Purchase order workflow | Universal (inventory module) | Hidden if `inventory` not in `enabledModules` |
| AI cost estimation | `food_and_drink` vertical | AI buttons hidden |

### Item Management UI Adaptation

**By POS mode:**
- **Retail / Grocery modes**: Item Management emphasizes SKU, barcode (with scan button), variations (size/color), reorder point. Hides prep time, modifiers, allergens, nutrition, daypart windows.
- **Restaurant modes (QSR/FSR/Bar)**: Item Management emphasizes modifiers, prep time, allergens, dietary info. Shows barcode fields but hides scan button. Shows daypart availability.
- **Services / Bookings modes**: Item Management shows duration, deposit, staff requirement fields. Hides all food-specific and retail-specific fields.

**Channel Visibility adapts per vertical:**
- `food_and_drink`: POS, Online Ordering, Kiosk, Delivery Apps
- `retail` / `grocery`: POS, Online Store, Marketplace
- `beauty_wellness` / `healthcare`: POS, Online Booking
- `services`: POS, Online Booking, Invoice

### Inventory Enhancements — Vertical Applicability

| Feature | Applicability |
|---|---|
| Link inventory to item variations | Universal |
| Purchase order workflow | Universal (all verticals with `inventory` module) |
| Cycle counts | Universal |
| Shelf life / expiration tracking | `food_and_drink`, `grocery` (perishable goods) |
| Multi-unit conversions | `food_and_drink`, `grocery` (cooking unit conversions) |
| Allergen display in consumer UIs | `food_and_drink` only |
| Time-based item availability | `food_and_drink` only (dayparts: breakfast/lunch/dinner/happy hour) |

---

## Phase 1 — Item Enrichment (Steps 1-5)

### Step 1: Extend `models/menu.model.ts` — SKU, Barcode, Reporting Category, Availability

Add to `MenuItem`:
```ts
sku: string | null;                    // Auto-generated or manual
barcode: string | null;                // UPC/EAN barcode value
barcodeFormat: 'UPC-A' | 'EAN-13' | 'CODE-128' | null;
reportingCategoryId: string | null;    // Distinct from organizational category
channelVisibility: ChannelVisibility;
availabilityWindows: AvailabilityWindow[];
allergens: Allergen[];
nutritionFacts: NutritionFacts | null;
```

New interfaces:
```ts
export interface ChannelVisibility {
  pos: boolean;
  onlineOrdering: boolean;
  kiosk: boolean;
  deliveryApps: boolean;
}

export interface AvailabilityWindow {
  daysOfWeek: number[];    // 0=Sun, 1=Mon, ..., 6=Sat
  startTime: string;       // 'HH:mm' (24h)
  endTime: string;         // 'HH:mm' (24h)
  label: string;           // e.g. 'Breakfast', 'Happy Hour'
}

export type AllergenType = 'milk' | 'eggs' | 'fish' | 'shellfish' | 'tree_nuts' | 'peanuts' | 'wheat' | 'soy' | 'sesame';

export interface Allergen {
  type: AllergenType;
  severity: 'contains' | 'may_contain' | 'facility';
}

export interface NutritionFacts {
  calories: number | null;
  totalFat: number | null;        // grams
  saturatedFat: number | null;
  transFat: number | null;
  cholesterol: number | null;     // mg
  sodium: number | null;          // mg
  totalCarbs: number | null;      // grams
  dietaryFiber: number | null;
  totalSugars: number | null;
  protein: number | null;         // grams
  servingSize: string | null;     // e.g. '1 slice (120g)'
}

export interface ReportingCategory {
  id: string;
  restaurantId: string;
  name: string;
  displayOrder: number;
}
```

### Step 2: Add Item Variations to Menu Model

Square distinguishes variations (tracked) from modifiers (untracked). Add:

```ts
export interface ItemVariation {
  id: string;
  menuItemId: string;
  name: string;               // e.g. 'Small', 'Medium', 'Large'
  sku: string | null;
  barcode: string | null;
  price: number;              // Override price for this variation
  costPerUnit: number | null; // COGS for this variation
  inventoryItemId: string | null;  // Links to InventoryItem for stock tracking
  isDefault: boolean;
  isActive: boolean;
  displayOrder: number;
}

export interface ItemOptionSet {
  id: string;
  restaurantId: string;
  name: string;               // e.g. 'Size', 'Color'
  values: string[];           // e.g. ['Small', 'Medium', 'Large']
}
```

Add to `MenuItem`:
```ts
variations: ItemVariation[];
optionSetIds: string[];       // Which option sets generate variations
hasVariations: boolean;       // Quick check: variations.length > 0
```

### Step 3: Extend `services/menu.ts` — New Methods

Add to `MenuService`:
- `createVariation(itemId, data: ItemVariation)` — POST `/menu/items/:id/variations`
- `updateVariation(itemId, variationId, data)` — PATCH `/menu/items/:id/variations/:vid`
- `deleteVariation(itemId, variationId)` — DELETE `/menu/items/:id/variations/:vid`
- `loadReportingCategories()` — GET `/reporting-categories`
- `createReportingCategory(data)` — POST `/reporting-categories`
- `updateReportingCategory(id, data)` — PATCH `/reporting-categories/:id`
- `deleteReportingCategory(id)` — DELETE `/reporting-categories/:id`
- `loadOptionSets()` — GET `/option-sets`
- `createOptionSet(data)` — POST `/option-sets`
- `importMenuFromCsv(file: File)` — POST `/menu/import` (multipart)
- `exportMenuToCsv()` — GET `/menu/export` (returns CSV blob)
- `autoGenerateSku(itemId)` — POST `/menu/items/:id/generate-sku`
- Signals: `_reportingCategories`, `_optionSets`

### Step 4: Enhance Item Management UI

**File: `menu-mgmt/item-management/`**

Add to the item form/card:
- **SKU/Barcode section:** SKU field with "Auto-generate" button, barcode field with format selector
- **Channel Visibility toggles:** 4 checkboxes (POS, Online, Kiosk, Delivery)
- **Availability Windows:** Add/remove time windows with day-of-week checkboxes + start/end time pickers + label
- **Reporting Category dropdown:** Select from list (separate from organizational category)
- **Allergen checkboxes:** 9 types × 3 severity levels (contains/may_contain/facility)
- **Nutrition Facts panel:** Collapsible form with all macro fields + serving size
- **Variations tab:** (if item has variations) List of variations with per-variation price, cost, SKU, linked inventory item, active toggle

### Step 5: CSV Import/Export UI

**File: `menu-mgmt/item-management/`** — Add to header:
- **Export button:** Downloads all items as CSV (name, category, price, cost, SKU, barcode, description, allergens, dietary, modifiers, variations, availability)
- **Import button:** File upload modal with:
  - Drag-drop zone for CSV/XLSX
  - Preview table showing first 10 rows with column mapping
  - Validation summary (errors, warnings, auto-fixable issues)
  - "Import X items" confirmation button
  - Progress bar during import
  - Results summary (created, updated, skipped, errors)

---

## Phase 2 — Inventory Enhancements (Steps 6-10)

### Step 6: Link Inventory to Item Variations

Connect `InventoryItem` to `ItemVariation`:
- Add `linkedVariationId: string | null` to `InventoryItem`
- When a sale includes a variation with a linked inventory item, stock decrements automatically
- Inventory Dashboard shows which items are linked vs unlinked

### Step 7: Purchase Order Workflow

**Extend `services/vendor.ts`** with PO lifecycle:
- `createPurchaseOrder(vendorId, items[])` — POST `/purchase-orders`
- `submitPurchaseOrder(poId)` — PATCH `/purchase-orders/:id/submit` (email to vendor)
- `receivePurchaseOrder(poId, receivedItems[])` — PATCH `/purchase-orders/:id/receive`
- `cancelPurchaseOrder(poId)` — PATCH `/purchase-orders/:id/cancel`

**Extend `models/vendor.model.ts`:**
```ts
export type PurchaseOrderStatus = 'draft' | 'submitted' | 'partially_received' | 'received' | 'cancelled';

export interface PurchaseOrder {
  id: string;
  restaurantId: string;
  vendorId: string;
  vendorName: string;
  poNumber: string;
  status: PurchaseOrderStatus;
  lineItems: PurchaseOrderLineItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  notes: string | null;
  submittedAt: string | null;
  receivedAt: string | null;
  createdAt: string;
}

export interface PurchaseOrderLineItem {
  inventoryItemId: string;
  itemName: string;
  quantity: number;
  unitCost: number;
  receivedQuantity: number | null;
}
```

**Extend Food Cost Dashboard** with PO tab: draft → submit → receive workflow, auto-update inventory on receive.

### Step 8: Inventory Cycle Counts

Add to `InventoryService`:
- `startCycleCount(categoryId?)` — POST `/inventory/cycle-counts` (snapshot current expected quantities)
- `submitCycleCount(countId, entries[])` — PATCH `/inventory/cycle-counts/:id` (actual vs expected)
- `loadCycleCountHistory()` — GET `/inventory/cycle-counts`

Add to `InventoryDashboard` Items tab:
- "Start Count" button → select category or all items → enter actual quantities → submit
- Variance report: expected vs actual, over/short per item, total variance value

### Step 9: Shelf Life / Expiration Tracking

Add to `InventoryItem`:
```ts
shelfLifeDays: number | null;
expirationTracking: boolean;
```

Add to `InventoryService`:
- `loadExpiringItems(daysAhead)` — GET `/inventory/expiring?days=7`

Add to `InventoryDashboard` Overview tab:
- "Expiring Soon" alert card showing items expiring within configurable window (default 7 days)
- Sorted by expiration date, with "Use First" FIFO indicator

### Step 10: Multi-Unit Conversions

Add to `models/inventory.model.ts`:
```ts
export interface UnitConversion {
  fromUnit: string;
  toUnit: string;
  factor: number;      // e.g. 1 lb = 16 oz → factor = 16
}
```

Add to `InventoryService`:
- `loadUnitConversions()` — GET `/inventory/unit-conversions`
- `createUnitConversion(data)` — POST `/inventory/unit-conversions`

Add to `InventoryDashboard`: unit conversion calculator when adjusting stock or recording usage.

---

## Phase 3 — Advanced Item Features (Steps 11-14)

### Step 11: Reporting Categories Management

**New section in Category Management** or standalone tab:
- CRUD for reporting categories (name, display order)
- Assign reporting category to items (separate from organizational category)
- Reporting categories appear in sales reports as grouping option

### Step 12: Allergen & Nutrition Display

**Extend Online Ordering Portal + Kiosk + SOS Terminal:**
- Allergen icons on menu item cards (standardized icons for each of 9 types)
- "Contains allergens" warning banner when adding item to cart
- Nutrition info expandable panel on item detail
- Filter menu by allergen ("Show items without [allergen]")

### Step 13: Time-Based Item Availability

**Extend MenuService:**
- `isItemAvailable(item, now)` — checks availability windows against current time
- Items outside their window: grayed out in POS/online with "Available during [label]" message
- KDS does not receive orders for unavailable items (validation at order creation)

### Step 14: Build Verification

- `ng build get-order-stack-restaurant-frontend-library` — zero errors
- `ng build get-order-stack-restaurant-frontend-elements` — zero errors
- Verify MenuItem has SKU, barcode, allergens, nutritionFacts, variations, channelVisibility, availabilityWindows
- Verify CSV import/export works in Item Management
- Verify reporting categories are separate from organizational categories

---

## Files Summary

### New Files
| File | Purpose |
|------|---------|
| (none — all changes extend existing files) | |

### Modified Files
| File | Changes |
|------|---------|
| `models/menu.model.ts` | Add SKU, barcode, allergens, nutrition, variations, channelVisibility, availabilityWindows, ReportingCategory, ItemVariation, ItemOptionSet |
| `models/inventory.model.ts` | Add linkedVariationId, shelfLifeDays, expirationTracking, UnitConversion |
| `models/vendor.model.ts` | Add PurchaseOrder, PurchaseOrderLineItem, PurchaseOrderStatus |
| `services/menu.ts` | Add variation CRUD, reporting category CRUD, option sets, CSV import/export, SKU generation |
| `services/inventory.ts` | Add cycle count, expiring items, unit conversions |
| `services/vendor.ts` | Add PO lifecycle (create, submit, receive, cancel) |
| `menu-mgmt/item-management/` | SKU/barcode, channel visibility, availability, allergens, nutrition, variations tab, CSV import/export |
| `menu-mgmt/category-management/` | Reporting categories section |
| `inventory/inventory-dashboard/` | PO workflow, cycle counts, expiration alerts, unit conversion |
| `food-cost/food-cost-dashboard/` | PO tab integration |
| `online-ordering/online-order-portal/` | Allergen icons, nutrition panel, availability checks |
| `kiosk/kiosk-terminal/` | Allergen icons, availability filtering |

---

## Verification

1. `ng build` both library and elements — zero errors
2. MenuItem has all new fields with backward-compatible null defaults
3. CSV export downloads valid CSV; CSV import creates items correctly
4. Variations appear when item has option sets assigned
5. Allergen icons render on menu item cards in all consumer-facing UIs
6. Reporting categories are distinct from organizational categories in reports
