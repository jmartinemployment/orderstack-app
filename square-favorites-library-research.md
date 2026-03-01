# Square POS: Favorites vs Library Tab Research

## How Square Actually Works

### Favorites Tab
- **Merchant-curated grid** — the owner/manager manually picks which items appear here
- Drag-and-drop positioning for optimal checkout speed
- Can have **multiple pages** (e.g., a Coffee page, Food page, Merch page)
- Supports adding: Items, Gift Cards, Rewards, Discounts, Services
- Setup: long-press an empty tile → pick from item catalog → place on grid
- This is the **default landing tab** on Square Terminal and Register
- Purpose: fast access to high-frequency items without searching

### Library Tab
- **Complete item catalog** — every item in the merchant's Square account
- Read-only layout — merchant cannot rearrange items here
- Organized **alphabetically and by category**
- Browsable/searchable when the item isn't on Favorites
- Purpose: find any item when it's not pinned to Favorites

### Key Difference
Favorites = curated speed grid (merchant configures).
Library = full catalog reference (system-generated, alphabetical).

## What OrderStack Currently Does (Wrong)

Both tabs pull from the same `allItems` computed signal:

| Tab | Current behavior | Problem |
|-----|-----------------|---------|
| **Favorites** | Filters `item.popular \|\| item.isPopular`, falls back to showing ALL items if none marked | No merchant customization, identical to Library when no items flagged |
| **Library** | Shows all items unsorted | Identical to Favorites fallback — no differentiation |
| **Menu/Items** | Category pills + filtered items | This is correct and matches Square |

## What Needs to Change

### Library (quick fix — no backend needed)
- Sort items alphabetically by name
- Show category headers/grouping (A-Z within each category)
- Add a search bar at top for filtering by name
- This makes Library useful as the "find anything" tab

### Favorites (requires backend persistence)
To properly match Square, Favorites needs:

1. **Data model**: `favorites_grid` — stores item IDs + grid positions per restaurant per device type
   ```
   restaurant_id, device_type, page_number, position, item_id
   ```
2. **Edit mode**: long-press empty tile → item picker overlay → place item
3. **Drag-and-drop reordering** in edit mode
4. **Multiple pages**: swipe or page dots to switch between Favorites pages
5. **Backend endpoint**: CRUD for favorites grid configuration

### Interim Solution (no backend)
Keep current `popular` flag behavior but:
- Label it honestly: "Popular Items" instead of "Favorites"
- Or rename tab to "Quick Items" to avoid confusion with Square's Favorites concept
- Sort alphabetically within the popular items

## Sources
- [Set up item grid — Square Support](https://squareup.com/help/us/en/article/8334-set-up-item-grid)
- [Adding items to favorites in Square Terminal](https://community.squareup.com/t5/Orders-Menu-Items-Catalog/adding-items-to-favorites-in-square-terminal/m-p/747992)
- [Arrange items on Square Terminal favorites grid](https://community.squareup.com/t5/Orders-Menu-Items-Catalog/How-to-arrange-items-categories-on-Square-Terminal-using-the/td-p/819144)
- [Square for Retail POS: Actions and Defaults](https://squareup.com/help/us/en/article/5777-square-retail-pos-app-actions-and-defaults)
- [Customize the Library tab — Square Community](https://community.squareup.com/t5/Archived-Discussions-Read-Only/How-can-I-customize-the-Library-tab-in-checkout-in-Square-app/td-p/311647)
