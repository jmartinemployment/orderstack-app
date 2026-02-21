# GetOrderStack Product Specification
# GOS-SPEC-02: Menu Item Management

**Version:** 1.0
**Date:** February 20, 2026
**Author:** Jeff (Geek @ Your Spot)
**Purpose:** Feature specification for Claude Code implementation
**Industry Reference:** Square Catalog API, Toast Menu Builder, NCR Aloha

---

## 1. Executive Summary

Menu management is the backbone of every restaurant POS. It defines what can be sold, at what price, with what customizations, and where. This spec covers the complete data model and feature set for creating, organizing, pricing, and displaying menu items in GetOrderStack.

**Key Principle:** A manager with no tech background should be able to add a new menu item from their phone in under 60 seconds — including variations, modifiers, and pricing — and have it appear on every POS device instantly.

---

## 2. Core Concepts

### 2.1 The Menu Hierarchy

```
Restaurant
└── Menu (e.g., "Lunch Menu", "Dinner Menu", "Happy Hour")
    └── Category (e.g., "Appetizers", "Entrees", "Drinks")
        └── Item (e.g., "Burger", "Caesar Salad")
            ├── Variation (e.g., "Single Patty $12", "Double Patty $16")
            └── Modifier List (e.g., "Cheese Options", "Cooking Temp")
                └── Modifier (e.g., "Cheddar +$1", "Medium Rare")
```

### 2.2 Key Terminology

| Concept | Definition | Example |
|---------|-----------|---------|
| **Menu** | A named collection of categories, optionally time-scheduled | "Brunch Menu" (Sat-Sun 10am-2pm) |
| **Category** | A grouping of items within a menu | "Appetizers", "Mains", "Desserts" |
| **Item** | A product available for sale | "Cheeseburger" |
| **Variation** | A specific purchasable version of an item with its own price | "6oz Patty - $12", "8oz Patty - $16" |
| **Modifier List** | A group of options that customize an item | "Cheese Options", "Toppings" |
| **Modifier** | A single customization option within a list | "Swiss Cheese +$1.00", "No Onions" |
| **Tax** | Tax rate applied to items | "Sales Tax 7%" |
| **Discount** | Price reduction rule | "Happy Hour 20% off drinks" |

---

## 3. Data Model

### 3.1 Menu

```typescript
interface Menu {
  id: string;                       // UUID
  restaurant_id: string;
  name: string;                     // "Lunch Menu", "Dinner Menu"
  description?: string;
  
  // Scheduling - when this menu is active
  is_always_available: boolean;     // true = no schedule constraints
  schedule?: MenuSchedule[];
  
  // Location availability
  available_at_all_locations: boolean;
  location_ids?: string[];          // specific locations if not all
  
  // Ordering
  sort_order: number;               // display order among menus
  
  // Status
  is_active: boolean;
  
  // Channels - where this menu appears
  channels: MenuChannel[];          // 'POS', 'ONLINE', 'KIOSK', 'THIRD_PARTY'
  
  created_at: DateTime;
  updated_at: DateTime;
}

interface MenuSchedule {
  id: string;
  menu_id: string;
  day_of_week: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';
  start_time: string;              // "11:00" (24hr)
  end_time: string;                // "15:00"
}

type MenuChannel = 'POS' | 'ONLINE_ORDERING' | 'KIOSK' | 'THIRD_PARTY';
```

### 3.2 Category

```typescript
interface Category {
  id: string;                       // UUID
  restaurant_id: string;
  menu_id: string;                  // which menu this belongs to
  parent_category_id?: string;      // for subcategories (e.g., "Red Wine" under "Wine")
  
  name: string;                     // "Appetizers"
  description?: string;
  image_url?: string;
  
  // Display
  sort_order: number;               // position in menu
  color?: string;                   // hex color for POS grid button
  
  // Location visibility
  available_at_all_locations: boolean;
  location_ids?: string[];
  
  is_active: boolean;
  created_at: DateTime;
  updated_at: DateTime;
}
```

### 3.3 Item (The Core Object)

```typescript
interface MenuItem {
  id: string;                        // UUID
  restaurant_id: string;
  
  // Basic info
  name: string;                      // "Classic Burger"
  description?: string;              // "Angus beef, lettuce, tomato, house sauce"
  
  // Classification
  category_id: string;               // FK to category
  product_type: 'FOOD_AND_BEV' | 'MERCHANDISE' | 'SERVICE';
  
  // Images
  image_urls: string[];              // multiple photos
  
  // Variations - EVERY item must have at least one
  variations: ItemVariation[];
  
  // Modifier lists assigned to this item
  modifier_list_assignments: ItemModifierListAssignment[];
  
  // Tax
  tax_ids: string[];                 // which taxes apply
  
  // Food-specific details (when product_type = FOOD_AND_BEV)
  food_details?: FoodAndBevDetails;
  
  // Availability
  available_at_all_locations: boolean;
  location_ids?: string[];
  is_active: boolean;
  
  // Stock status (86'd)
  stock_status: 'IN_STOCK' | 'OUT_OF_STOCK'; // "86" = OUT_OF_STOCK
  
  // POS display
  sort_order: number;
  button_color?: string;             // hex for POS grid
  
  // Reporting
  sku?: string;
  
  created_at: DateTime;
  updated_at: DateTime;
}

interface FoodAndBevDetails {
  calorie_count?: number;
  dietary_preferences: DietaryPref[];  // VEGAN, VEGETARIAN, GLUTEN_FREE, etc.
  allergens: Allergen[];               // NUTS, DAIRY, SHELLFISH, etc.
  ingredients?: string;
  spice_level?: 'MILD' | 'MEDIUM' | 'HOT' | 'EXTRA_HOT';
}

type DietaryPref = 'VEGAN' | 'VEGETARIAN' | 'GLUTEN_FREE' | 'DAIRY_FREE' 
  | 'NUT_FREE' | 'HALAL' | 'KOSHER' | 'KETO' | 'PALEO';

type Allergen = 'MILK' | 'EGGS' | 'FISH' | 'SHELLFISH' | 'TREE_NUTS' 
  | 'PEANUTS' | 'WHEAT' | 'SOY' | 'SESAME';
```

### 3.4 Item Variation

Every item **must** have at least one variation. This is what gets added to an order.

```typescript
interface ItemVariation {
  id: string;                        // UUID
  item_id: string;                   // parent item
  
  name: string;                      // "Regular", "Small", "Large", "6oz", "12oz"
  sku?: string;                      // unique product code
  
  // Pricing
  pricing_type: 'FIXED' | 'VARIABLE';
  price?: number;                    // cents (required if FIXED)
  // VARIABLE = server enters price at time of sale (e.g., market price fish)
  
  // Cost tracking
  cost?: number;                     // cost to make in cents (for profit reporting)
  
  // Location-specific pricing overrides
  location_overrides?: LocationPriceOverride[];
  
  // Inventory
  track_inventory: boolean;
  inventory_count?: number;
  low_stock_alert_threshold?: number;
  
  // Availability
  is_active: boolean;
  stock_status: 'IN_STOCK' | 'OUT_OF_STOCK';
  
  // Display
  sort_order: number;
  
  created_at: DateTime;
  updated_at: DateTime;
}

interface LocationPriceOverride {
  location_id: string;
  price: number;                     // cents - overrides default variation price
}
```

### 3.5 Modifier List

A modifier list groups related customization options together.

```typescript
interface ModifierList {
  id: string;                         // UUID
  restaurant_id: string;
  
  name: string;                       // "Cheese Options", "Protein Choice", "Size"
  
  // Type
  modifier_type: 'LIST' | 'TEXT';
  // LIST = predefined options (cheese types, toppings)
  // TEXT = free-form text input (special instructions, custom engraving)
  
  // Selection rules
  min_selected: number;               // 0 = optional, 1+ = required
  max_selected: number;               // 1 = single select, 2+ = multi select
  // Example: Burger temp → min:1, max:1 (must pick exactly one)
  // Example: Pizza toppings → min:0, max:5 (pick up to 5)
  // Example: Protein choice → min:1, max:1 (required, choose one)
  
  // Allow quantity per modifier (e.g., "2 pumps vanilla" for coffee)
  allow_quantities: boolean;
  
  // Modifiers (the actual options) - only for LIST type
  modifiers: Modifier[];
  
  // For TEXT type
  max_text_length?: number;           // e.g., 200 chars
  text_required?: boolean;
  
  // Display
  sort_order: number;
  
  // Visibility
  hidden_from_customer: boolean;      // hide on receipts/online (e.g., kitchen notes)
  
  is_active: boolean;
  created_at: DateTime;
  updated_at: DateTime;
}

interface Modifier {
  id: string;                          // UUID
  modifier_list_id: string;
  
  name: string;                        // "Cheddar", "Swiss", "No Cheese"
  
  // Pricing
  price: number;                       // cents (0 = free, positive = upcharge)
  // Example: "Add Bacon" = 200 ($2.00)
  // Example: "Medium Rare" = 0 (no charge)
  // Example: "No Onions" = 0 (no charge)
  
  // Default selection
  is_default: boolean;                 // pre-selected on POS/online
  
  // Display
  sort_order: number;
  
  // Availability
  is_active: boolean;
  stock_status: 'IN_STOCK' | 'OUT_OF_STOCK';
  
  created_at: DateTime;
  updated_at: DateTime;
}
```

### 3.6 Item ↔ Modifier List Assignment

This is the junction that connects items to modifier lists, with optional overrides.

```typescript
interface ItemModifierListAssignment {
  id: string;
  item_id: string;
  modifier_list_id: string;
  
  // Per-item overrides (optional — defaults come from ModifierList)
  min_selected_override?: number;
  max_selected_override?: number;
  hidden_from_customer_override?: boolean;
  
  // Which modifiers are enabled for THIS item (subset of the full list)
  // null = all modifiers enabled
  enabled_modifier_ids?: string[];
  
  sort_order: number;                  // order modifier lists appear for this item
}
```

### 3.7 Tax

```typescript
interface Tax {
  id: string;                          // UUID
  restaurant_id: string;
  
  name: string;                        // "Sales Tax", "Alcohol Tax"
  percentage: number;                  // e.g., 7.5 for 7.5%
  
  // When tax is calculated
  calculation_phase: 'SUBTOTAL' | 'TOTAL';
  // SUBTOTAL = tax on item price before other taxes (most common)
  // TOTAL = tax on total including other taxes
  
  // What it applies to
  applies_to_custom_amounts: boolean;  // ad-hoc items
  inclusion_type: 'ADDITIVE' | 'INCLUSIVE';
  // ADDITIVE = tax added on top (US standard)
  // INCLUSIVE = tax included in price (some international)
  
  // Location
  available_at_all_locations: boolean;
  location_ids?: string[];
  
  is_active: boolean;
  created_at: DateTime;
  updated_at: DateTime;
}
```

---

## 4. Real-World Examples

### 4.1 Burger with Full Customization

```
ITEM: "Classic Burger"
├── Description: "Angus beef patty, lettuce, tomato, house sauce on brioche"
├── Category: "Burgers"
├── Food Details: { calories: 650, allergens: [WHEAT, MILK, SOY] }
│
├── VARIATIONS:
│   ├── "Single" — $12.99
│   ├── "Double" — $16.99
│   └── "Impossible (Plant)" — $14.99
│
├── MODIFIER LIST: "Cooking Temperature" (min:1, max:1, required)
│   ├── Rare — $0
│   ├── Medium Rare — $0  [DEFAULT]
│   ├── Medium — $0
│   ├── Medium Well — $0
│   └── Well Done — $0
│
├── MODIFIER LIST: "Cheese" (min:0, max:1, optional)
│   ├── American — $0
│   ├── Cheddar — $0
│   ├── Swiss — $0
│   ├── Pepper Jack — $0
│   └── Blue Cheese — $1.50
│
├── MODIFIER LIST: "Toppings" (min:0, max:5, optional)
│   ├── Bacon — $2.00
│   ├── Fried Egg — $1.50
│   ├── Avocado — $2.00
│   ├── Jalapeños — $0.50
│   ├── Caramelized Onions — $1.00
│   └── Mushrooms — $1.00
│
├── MODIFIER LIST: "Remove" (min:0, max:4, optional, hidden_from_customer:false)
│   ├── No Lettuce — $0
│   ├── No Tomato — $0
│   ├── No Onion — $0
│   └── No Sauce — $0
│
└── TAX: "Sales Tax" (7.0%)

ORDER EXAMPLE:
  Classic Burger (Double)             $16.99
    Medium Rare                        $0.00
    Pepper Jack                        $0.00
    Bacon                              $2.00
    Avocado                            $2.00
    No Onion                           $0.00
  ─────────────────────────────────────
  Subtotal:                           $20.99
  Tax (7%):                            $1.47
  Total:                              $22.46
```

### 4.2 Coffee with Quantity Modifiers

```
ITEM: "Latte"
├── VARIATIONS:
│   ├── "Small (12oz)" — $4.50
│   ├── "Medium (16oz)" — $5.50
│   └── "Large (20oz)" — $6.50
│
├── MODIFIER LIST: "Milk Choice" (min:1, max:1, required)
│   ├── Whole Milk — $0 [DEFAULT]
│   ├── Skim Milk — $0
│   ├── Oat Milk — $0.75
│   └── Almond Milk — $0.75
│
├── MODIFIER LIST: "Flavor Shots" (min:0, max:3, allow_quantities:true)
│   ├── Vanilla — $0.60/pump
│   ├── Caramel — $0.60/pump
│   ├── Hazelnut — $0.60/pump
│   └── Mocha — $0.75/pump
│
└── MODIFIER LIST: "Extras" (min:0, max:2)
    ├── Extra Shot — $1.00
    ├── Whipped Cream — $0.50
    └── Decaf — $0

ORDER EXAMPLE:
  Latte (Medium)                       $5.50
    Oat Milk                           $0.75
    Vanilla (2 pumps)                  $1.20
    Extra Shot                         $1.00
  ─────────────────────────────────────
  Subtotal:                            $8.45
```

### 4.3 Simple Item (No Modifiers)

```
ITEM: "French Fries"
├── VARIATIONS:
│   ├── "Regular" — $4.99
│   └── "Large" — $6.99
└── TAX: "Sales Tax" (7.0%)
```

---

## 5. Menu Scheduling & Availability

### 5.1 Time-Based Menu Switching

Menus automatically activate/deactivate based on schedule:

```
"Breakfast Menu"  → Mon-Fri 6:00-11:00, Sat-Sun 7:00-14:00
"Lunch Menu"      → Mon-Fri 11:00-16:00
"Dinner Menu"     → Mon-Thu 16:00-22:00, Fri-Sat 16:00-23:00
"Happy Hour"      → Mon-Fri 16:00-18:00
"Late Night"      → Fri-Sat 22:00-02:00

When POS loads, it shows only items from currently-active menus.
Items in multiple menus appear only once (deduped).
Manager can manually override to show any menu ("Open Breakfast Menu").
```

### 5.2 86'd Items (Out of Stock)

The most critical real-time feature. Kitchen runs out of salmon? Mark it 86'd instantly.

```
86 FLOW:
1. Kitchen/Manager marks item or variation as OUT_OF_STOCK
2. Change propagates to ALL POS devices in real-time (WebSocket)
3. Item appears grayed out on POS with "86'd" badge
4. Online ordering hides item completely
5. If server tries to add 86'd item → warning "Item is 86'd — override?" 
6. Manager can override and add anyway
7. When restocked, mark IN_STOCK → available again immediately

86 CAN APPLY TO:
- Entire item (e.g., "Salmon" — all variations gone)
- Single variation (e.g., "Large Fries" gone but "Regular" available)  
- Single modifier (e.g., "Blue Cheese" gone)
```

---

## 6. POS Display — Menu Grid

### 6.1 Grid Layout

The POS shows a grid of touchable buttons organized by category:

```
┌──────────────────────────────────────────────────────────┐
│  [Appetizers] [Burgers] [Sandwiches] [Sides] [Drinks]   │  ← Category tabs
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │          │  │          │  │ ░░░░░░░░ │              │
│  │  Classic  │  │  BBQ     │  │  Salmon  │              │
│  │  Burger  │  │  Burger  │  │  Burger  │  ← 86'd     │
│  │  $12.99  │  │  $14.99  │  │  $16.99  │  (grayed)    │
│  └──────────┘  └──────────┘  └──────────┘              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │          │  │          │  │          │              │
│  │  Turkey  │  │  Veggie  │  │  Chicken │              │
│  │  Burger  │  │  Burger  │  │  Burger  │              │
│  │  $13.99  │  │  $11.99  │  │  $13.99  │              │
│  └──────────┘  └──────────┘  └──────────┘              │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 6.2 Item Selection Flow

```
1. Tap "Classic Burger"
2. IF multiple variations → show variation picker:
   ┌─────────────────────────────┐
   │ Classic Burger              │
   │                             │
   │  ○ Single    $12.99        │
   │  ● Double    $16.99        │
   │  ○ Impossible $14.99       │
   └─────────────────────────────┘
3. Tap variation → show required modifiers first:
   ┌─────────────────────────────┐
   │ Cooking Temperature (req'd) │
   │                             │
   │  ○ Rare                    │
   │  ● Medium Rare             │
   │  ○ Medium                  │
   │  ○ Medium Well             │
   │  ○ Well Done               │
   └─────────────────────────────┘
4. Show optional modifiers (can skip):
   ┌─────────────────────────────┐
   │ Cheese (optional)           │
   │  ○ None  ○ American        │
   │  ○ Cheddar  ○ Swiss        │
   │                             │
   │ Toppings (up to 5)         │
   │  ☐ Bacon +$2  ☐ Egg +$1.50│
   │  ☐ Avocado +$2 ☐ Jalapeño │
   │                             │
   │        [ADD TO ORDER $16.99]│
   └─────────────────────────────┘
5. Item added to order ticket with computed total
```

---

## 7. API Endpoints

### 7.1 Menus

```
GET    /api/menus                        # List menus (filter: active, location, channel)
POST   /api/menus                        # Create menu
GET    /api/menus/:id                    # Get menu with categories
PATCH  /api/menus/:id                    # Update menu
DELETE /api/menus/:id                    # Soft delete menu

GET    /api/menus/active                 # Get currently active menus for POS
POST   /api/menus/:id/schedule           # Set menu schedule
```

### 7.2 Categories

```
GET    /api/categories                   # List (filter: menu_id, parent_id)
POST   /api/categories                   # Create
GET    /api/categories/:id               # Get with items
PATCH  /api/categories/:id               # Update
DELETE /api/categories/:id               # Soft delete
PATCH  /api/categories/reorder           # Batch update sort orders
```

### 7.3 Items

```
GET    /api/items                        # Search/list items (filters: category, name, stock)
POST   /api/items                        # Create item (with variations inline)
GET    /api/items/:id                    # Get full item (variations, modifiers, tax)
PATCH  /api/items/:id                    # Update item
DELETE /api/items/:id                    # Soft delete (archive)

# Batch operations
POST   /api/items/batch-upsert           # Create/update multiple items at once
POST   /api/items/batch-delete           # Archive multiple items

# Stock management
PATCH  /api/items/:id/stock-status       # Set IN_STOCK or OUT_OF_STOCK (86)
PATCH  /api/variations/:id/stock-status  # 86 a specific variation

# Search
POST   /api/items/search                 # Full-text search + filters
```

### 7.4 Variations

```
POST   /api/items/:id/variations         # Add variation to item
PATCH  /api/variations/:id               # Update variation (price, name, etc.)
DELETE /api/variations/:id               # Remove variation
```

### 7.5 Modifier Lists & Modifiers

```
GET    /api/modifier-lists               # List all modifier lists
POST   /api/modifier-lists               # Create (with modifiers inline)
GET    /api/modifier-lists/:id           # Get with modifiers
PATCH  /api/modifier-lists/:id           # Update list settings
DELETE /api/modifier-lists/:id           # Soft delete

POST   /api/modifier-lists/:id/modifiers      # Add modifier to list
PATCH  /api/modifiers/:id                      # Update modifier
DELETE /api/modifiers/:id                      # Remove modifier
PATCH  /api/modifiers/:id/stock-status         # 86 a modifier

# Assignment
POST   /api/items/:id/modifier-lists           # Assign modifier list to item
DELETE /api/items/:id/modifier-lists/:listId   # Remove assignment
PATCH  /api/items/:id/modifier-lists/:listId   # Update assignment overrides
```

### 7.6 Taxes

```
GET    /api/taxes                        # List taxes
POST   /api/taxes                        # Create tax
PATCH  /api/taxes/:id                    # Update tax
DELETE /api/taxes/:id                    # Soft delete
POST   /api/items/update-tax-assignments # Batch assign/remove taxes from items
```

---

## 8. Database Schema (Prisma)

```prisma
model Menu {
  id                  String   @id @default(uuid())
  restaurantId        String   @map("restaurant_id")
  name                String
  description         String?
  isAlwaysAvailable   Boolean  @default(true) @map("is_always_available")
  availableAtAll      Boolean  @default(true) @map("available_at_all_locations")
  sortOrder           Int      @default(0) @map("sort_order")
  isActive            Boolean  @default(true) @map("is_active")
  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")

  restaurant          Restaurant    @relation(fields: [restaurantId], references: [id])
  categories          Category[]
  schedules           MenuSchedule[]
  locationAssignments MenuLocation[]
  channels            MenuChannelAssignment[]

  @@map("menus")
}

model MenuSchedule {
  id          String @id @default(uuid())
  menuId      String @map("menu_id")
  dayOfWeek   String @map("day_of_week") // MON, TUE, etc.
  startTime   String @map("start_time")  // "11:00"
  endTime     String @map("end_time")    // "15:00"

  menu        Menu   @relation(fields: [menuId], references: [id], onDelete: Cascade)

  @@map("menu_schedules")
}

model Category {
  id                  String     @id @default(uuid())
  restaurantId        String     @map("restaurant_id")
  menuId              String     @map("menu_id")
  parentCategoryId    String?    @map("parent_category_id")
  name                String
  description         String?
  imageUrl            String?    @map("image_url")
  sortOrder           Int        @default(0) @map("sort_order")
  color               String?    // hex for POS button
  availableAtAll      Boolean    @default(true) @map("available_at_all_locations")
  isActive            Boolean    @default(true) @map("is_active")
  createdAt           DateTime   @default(now()) @map("created_at")
  updatedAt           DateTime   @updatedAt @map("updated_at")

  restaurant          Restaurant @relation(fields: [restaurantId], references: [id])
  menu                Menu       @relation(fields: [menuId], references: [id])
  parentCategory      Category?  @relation("SubCategories", fields: [parentCategoryId], references: [id])
  subCategories       Category[] @relation("SubCategories")
  items               MenuItem[]

  @@map("categories")
}

model MenuItem {
  id                  String    @id @default(uuid())
  restaurantId        String    @map("restaurant_id")
  categoryId          String    @map("category_id")
  name                String
  description         String?
  productType         String    @default("FOOD_AND_BEV") @map("product_type")
  imageUrls           String[]  @map("image_urls") // array of URLs
  sortOrder           Int       @default(0) @map("sort_order")
  buttonColor         String?   @map("button_color")
  sku                 String?
  availableAtAll      Boolean   @default(true) @map("available_at_all_locations")
  isActive            Boolean   @default(true) @map("is_active")
  stockStatus         String    @default("IN_STOCK") @map("stock_status")
  
  // Food & Bev details (stored as JSONB)
  calorieCount        Int?      @map("calorie_count")
  dietaryPreferences  String[]  @map("dietary_preferences")
  allergens           String[]
  ingredients         String?
  spiceLevel          String?   @map("spice_level")
  
  createdAt           DateTime  @default(now()) @map("created_at")
  updatedAt           DateTime  @updatedAt @map("updated_at")

  restaurant          Restaurant              @relation(fields: [restaurantId], references: [id])
  category            Category                @relation(fields: [categoryId], references: [id])
  variations          ItemVariation[]
  modifierAssignments ItemModifierAssignment[]
  taxAssignments      ItemTaxAssignment[]
  locationAssignments ItemLocation[]

  @@map("menu_items")
}

model ItemVariation {
  id                  String    @id @default(uuid())
  itemId              String    @map("item_id")
  name                String    // "Small", "Large", "Regular"
  sku                 String?
  pricingType         String    @default("FIXED") @map("pricing_type") // FIXED, VARIABLE
  price               Int?      // cents
  cost                Int?      // cost in cents
  trackInventory      Boolean   @default(false) @map("track_inventory")
  inventoryCount      Int?      @map("inventory_count")
  lowStockThreshold   Int?      @map("low_stock_threshold")
  sortOrder           Int       @default(0) @map("sort_order")
  isActive            Boolean   @default(true) @map("is_active")
  stockStatus         String    @default("IN_STOCK") @map("stock_status")
  createdAt           DateTime  @default(now()) @map("created_at")
  updatedAt           DateTime  @updatedAt @map("updated_at")

  item                MenuItem  @relation(fields: [itemId], references: [id], onDelete: Cascade)
  locationPrices      VariationLocationPrice[]

  @@map("item_variations")
}

model VariationLocationPrice {
  id            String @id @default(uuid())
  variationId   String @map("variation_id")
  locationId    String @map("location_id")
  price         Int    // cents

  variation     ItemVariation @relation(fields: [variationId], references: [id], onDelete: Cascade)

  @@unique([variationId, locationId])
  @@map("variation_location_prices")
}

model ModifierList {
  id                  String     @id @default(uuid())
  restaurantId        String     @map("restaurant_id")
  name                String
  modifierType        String     @default("LIST") @map("modifier_type") // LIST, TEXT
  minSelected         Int        @default(0) @map("min_selected")
  maxSelected         Int        @default(1) @map("max_selected")
  allowQuantities     Boolean    @default(false) @map("allow_quantities")
  maxTextLength       Int?       @map("max_text_length")
  textRequired        Boolean?   @map("text_required")
  sortOrder           Int        @default(0) @map("sort_order")
  hiddenFromCustomer  Boolean    @default(false) @map("hidden_from_customer")
  isActive            Boolean    @default(true) @map("is_active")
  createdAt           DateTime   @default(now()) @map("created_at")
  updatedAt           DateTime   @updatedAt @map("updated_at")

  restaurant          Restaurant              @relation(fields: [restaurantId], references: [id])
  modifiers           Modifier[]
  itemAssignments     ItemModifierAssignment[]

  @@map("modifier_lists")
}

model Modifier {
  id                  String       @id @default(uuid())
  modifierListId      String       @map("modifier_list_id")
  name                String
  price               Int          @default(0) // cents (0 = no charge)
  isDefault           Boolean      @default(false) @map("is_default")
  sortOrder           Int          @default(0) @map("sort_order")
  isActive            Boolean      @default(true) @map("is_active")
  stockStatus         String       @default("IN_STOCK") @map("stock_status")
  createdAt           DateTime     @default(now()) @map("created_at")
  updatedAt           DateTime     @updatedAt @map("updated_at")

  modifierList        ModifierList @relation(fields: [modifierListId], references: [id], onDelete: Cascade)

  @@map("modifiers")
}

model ItemModifierAssignment {
  id                      String       @id @default(uuid())
  itemId                  String       @map("item_id")
  modifierListId          String       @map("modifier_list_id")
  minSelectedOverride     Int?         @map("min_selected_override")
  maxSelectedOverride     Int?         @map("max_selected_override")
  hiddenOverride          Boolean?     @map("hidden_override")
  enabledModifierIds      String[]     @map("enabled_modifier_ids") // empty = all enabled
  sortOrder               Int          @default(0) @map("sort_order")

  item                    MenuItem     @relation(fields: [itemId], references: [id], onDelete: Cascade)
  modifierList            ModifierList @relation(fields: [modifierListId], references: [id])

  @@unique([itemId, modifierListId])
  @@map("item_modifier_assignments")
}

model Tax {
  id                  String   @id @default(uuid())
  restaurantId        String   @map("restaurant_id")
  name                String
  percentage          Float    // 7.5 = 7.5%
  calculationPhase    String   @default("SUBTOTAL") @map("calculation_phase")
  inclusionType       String   @default("ADDITIVE") @map("inclusion_type")
  appliesToCustom     Boolean  @default(true) @map("applies_to_custom")
  availableAtAll      Boolean  @default(true) @map("available_at_all_locations")
  isActive            Boolean  @default(true) @map("is_active")
  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")

  restaurant          Restaurant         @relation(fields: [restaurantId], references: [id])
  itemAssignments     ItemTaxAssignment[]

  @@map("taxes")
}

model ItemTaxAssignment {
  id      String   @id @default(uuid())
  itemId  String   @map("item_id")
  taxId   String   @map("tax_id")

  item    MenuItem @relation(fields: [itemId], references: [id], onDelete: Cascade)
  tax     Tax      @relation(fields: [taxId], references: [id])

  @@unique([itemId, taxId])
  @@map("item_tax_assignments")
}
```

---

## 9. Real-Time Updates (WebSocket Events)

Menu changes must propagate to all POS devices instantly:

```typescript
// Events emitted via WebSocket to all connected POS devices
type MenuEvent = 
  | { type: 'ITEM_86';           itemId: string; variationId?: string }
  | { type: 'ITEM_RESTOCKED';    itemId: string; variationId?: string }
  | { type: 'MODIFIER_86';       modifierId: string }
  | { type: 'MODIFIER_RESTOCKED'; modifierId: string }
  | { type: 'MENU_UPDATED';      menuId: string }   // full refresh
  | { type: 'ITEM_CREATED';      item: MenuItem }
  | { type: 'ITEM_UPDATED';      item: MenuItem }
  | { type: 'ITEM_DELETED';      itemId: string }
  | { type: 'PRICE_CHANGED';     variationId: string; newPrice: number }
  | { type: 'MENU_ACTIVATED';    menuId: string }    // schedule trigger
  | { type: 'MENU_DEACTIVATED';  menuId: string };
```

---

## 10. Implementation Priority

### Phase 1 — MVP (Build First)
1. Categories CRUD (flat, no subcategories yet)
2. Items CRUD with single variation (name + price)
3. Simple modifier lists with modifiers (LIST type only)
4. Assign modifier lists to items
5. POS grid display (category tabs → item buttons → modifier selection)
6. 86 items (mark out of stock / in stock)
7. Basic tax assignment

### Phase 2 — Core Features
8. Multiple variations per item (size/price combos)
9. Menu scheduling (time-based activation)
10. Modifier selection rules (min/max enforcement)
11. Item search (full-text across name, description, SKU)
12. Batch upsert (create multiple items at once)
13. WebSocket real-time updates for 86/restock
14. Images on items

### Phase 3 — Advanced
15. Subcategories (nested)
16. TEXT-type modifiers (special instructions)
17. Quantity modifiers (2 pumps of vanilla)
18. Location-specific pricing overrides
19. Food & bev details (calories, allergens, dietary)
20. Menu channels (different menus for POS vs online vs kiosk)
21. Discount engine (happy hour, bundled, volume)
22. Inventory tracking with low-stock alerts

---

## 11. Key Business Rules

1. **Every item must have at least one variation** — cannot save item without variation
2. **Variations must have a price** (unless VARIABLE pricing type)
3. **Modifier list min/max must be logical** — min ≤ max, max ≤ number of modifiers
4. **86'd items show on POS but blocked** — grayed out, server warned, manager can override
5. **86'd items hidden from online ordering** — customer never sees unavailable items
6. **Menu schedule runs in restaurant's local timezone** — not UTC
7. **Deletes are always soft deletes** — items appear in historical orders forever
8. **Prices are in cents (integers)** — never floating point ($12.99 = 1299)
9. **Modifier lists are reusable** — same "Cheese Options" list on burgers AND sandwiches
10. **Tax is auto-applied at order time** — based on item's tax_ids, not manually selected
