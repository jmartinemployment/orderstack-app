# GOS-SPEC-20: Retail Catalog & Variations

**Status:** NOT STARTED
**Vertical:** Retail
**Square Reference:** Square for Retail — Catalog/Item Management, Option Sets, Variations, Product Bundles

---

## Overview

The retail catalog is fundamentally different from the restaurant menu. Instead of modifiers (add cheese, extra sauce), retail uses **variations** (size S/M/L, color Red/Blue) where each combination is a distinct SKU with its own barcode, price, cost, and stock level. Option sets generate variation matrices automatically. Products can be bundled into kits where component inventory is decremented on sale.

---

## Phase 1 — Item Variations (Steps 1-5)

### Step 1: Retail Item Model

**Files to create:**
- `src/app/models/retail.model.ts` — Core interfaces:
  - `RetailItem` (id, name, sku, barcode, barcodeFormat, description, basePrice, cost, imageUrl, thumbnailUrl, categoryId, subcategoryId, vendorId, vendorCode, itemType: 'physical' | 'digital' | 'service', taxable, trackInventory, weightBased, weightUnit: 'lb' | 'kg' | 'oz' | 'g' | null, markupPercent: number | null, variations: RetailItemVariation[], optionSetIds: string[], tags: string[], channelVisibility: RetailChannelVisibility, isActive, createdAt, updatedAt)
  - `RetailItemVariation` (id, itemId, name, sku, barcode, price, cost, weight, dimensions: {length, width, height, unit} | null, stockQuantity, lowStockThreshold, reorderPoint, optionValues: {optionSetId, value}[], imageUrl, isActive)
  - `RetailOptionSet` (id, name, values: string[]) — e.g., "Size" with ["S", "M", "L", "XL"] or "Color" with ["Red", "Blue", "Green"]
  - `RetailChannelVisibility` (inStore: boolean, online: boolean, kiosk: boolean)
  - `RetailCategory` (id, name, parentId: string | null, depth: number, sortOrder: number, taxRuleId: string | null, children?: RetailCategory[])
  - `RetailCatalogImportResult` (totalRows, created, updated, skipped, errors: {row: number, message: string}[])

### Step 2: Option Set → Variation Matrix Generation

When a retail item has multiple option sets, the system auto-generates all permutations.

Logic: If option sets are Size=[S,M,L] and Color=[Red,Blue], generate 6 variations: S-Red, S-Blue, M-Red, M-Blue, L-Red, L-Blue. Each variation gets a default price (from base item) and empty SKU/barcode for the user to fill in.

**Files to modify:**
- `src/app/models/retail.model.ts` — add `generateVariationMatrix(optionSets: RetailOptionSet[]): Partial<RetailItemVariation>[]` utility function.

### Step 3: Retail Catalog Service

**Files to create:**
- `src/app/services/retail-catalog.ts` — `RetailCatalogService` with:
  - **Items:** `loadItems()`, `createItem()`, `updateItem()`, `deleteItem()`, `searchItems(query)`, `lookupByBarcode(barcode)`, `lookupBySku(sku)`
  - **Variations:** `createVariation()`, `updateVariation()`, `deleteVariation()`, `generateVariationsFromOptionSets(itemId, optionSetIds)`, `bulkUpdateVariationPrices(updates: {variationId, price}[])`
  - **Option Sets:** `loadOptionSets()`, `createOptionSet()`, `updateOptionSet()`, `deleteOptionSet()`
  - **Categories:** `loadCategories()`, `createCategory()`, `updateCategory()`, `deleteCategory()`, `moveCategory(id, newParentId)`
  - **Import/Export:** `importFromCsv(file: File)`, `exportToCsv()`, `autoGenerateSku(itemName, variationName)`
  - Signals: `_items`, `_optionSets`, `_categories`, `_isLoading`
  - Computeds: `activeItems`, `itemsByCategory`, `categoryTree` (nested hierarchy), `lowStockItems`

### Step 4: Catalog Management Component

**Files to create:**
- `src/app/features/retail/catalog-management/catalog-management.ts`
- `src/app/features/retail/catalog-management/catalog-management.html`
- `src/app/features/retail/catalog-management/catalog-management.scss`

**UI:**
- Tab navigation: Items, Categories, Option Sets
- Items tab: search bar + barcode scan input, filter by category/vendor/stock status, item cards with thumbnail/name/SKU/price/stock, create/edit item modal
- Item form: name, description, base price, cost, markup % (auto-calc price from cost), item type, tax, weight-based toggle, image upload, category picker, vendor picker, option set multi-select, channel visibility checkboxes
- Categories tab: tree view with drag-to-reorder, create/rename/delete, expand/collapse
- Option Sets tab: list with values chips, create/edit form (name + comma-separated values)

### Step 5: Variation Editor Component

**Files to create:**
- `src/app/features/retail/variation-editor/variation-editor.ts`
- `src/app/features/retail/variation-editor/variation-editor.html`
- `src/app/features/retail/variation-editor/variation-editor.scss`

**UI:**
- Matrix grid view: rows = variation combinations, columns = SKU, Barcode, Price, Cost, Stock, Active
- Inline editing for all fields
- "Generate All" button from option sets
- Bulk price adjustment: select variations → set price or apply % change
- Per-variation image upload
- Barcode auto-generate from SKU option

---

## Phase 2 — Categories & Organization (Steps 6-10)

### Step 6: Hierarchical Categories

3-level hierarchy: Department → Category → Subcategory. Tree view with expand/collapse, drag-to-reorder, breadcrumb navigation.

### Step 7: Product Collections

Smart collections (auto-populated by rules: vendor, price range, stock level, tags) and manual collections (hand-picked items). Collection display for online store and kiosk.

### Step 8: Bulk Category Assignment

Select multiple items → assign to category in one action. Bulk edit: select items → change price/category/vendor/visibility.

### Step 9: Category Tax Rules

Assign tax rules per category (e.g., clothing tax-exempt under $110 in NY). Override item-level tax settings.

### Step 10: CSV Import/Export

Import: upload CSV with columns (Item Name, Variation Name, SKU, Barcode, Price, Cost, Category, Vendor, Stock). Export: download full catalog as CSV. Import results modal showing created/updated/skipped/errors.

---

## Phase 3 — Product Bundles & Kits (Steps 11-14)

### Step 11: Bundle Model

`RetailBundle` (id, name, sku, barcode, price, bundleType: 'fixed_price' | 'percent_discount' | 'cheapest_free', discountPercent?, components: BundleComponent[]). `BundleComponent` (itemId, variationId?, quantity, isRequired).

### Step 12: Bundle Editor

Create bundle: select component items, set quantities, choose pricing strategy. Preview: show component list with individual prices vs bundle price, savings displayed.

### Step 13: Bundle at Checkout

When bundle is scanned/added, all component items added to cart as a group. Inventory decremented per component. Bundle discount auto-applied.

### Step 14: Build Verification

- `ng build --configuration=production` — zero errors
- Routes added for `/retail/catalog`, `/retail/variation-editor`
