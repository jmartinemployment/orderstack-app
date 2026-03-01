# Plan: Bottom Nav "More" Button — Square-Style Applet Menu

## Context

All four POS-style terminals (POS, Bar, Kiosk, Register) have a bottom navigation bar with 4 items: Checkout, Open Orders/Transactions, Notifications, and **More**. The "More" tab currently shows a placeholder ("Additional options will appear here."). This plan implements the More menu as a grid of action buttons that navigate to other parts of the app — matching Square's applet pattern.

**Key constraint:** Each button in the More menu is a one-shot navigation action — it opens the target route. No toggles, no state changes, just navigate and go.

---

## Square's "More" Button — How It Works

### Bottom Navigation Bar

Square's POS bottom nav contains 3-4 primary tabs (varies by mode) plus a **More** (hamburger/list icon) tab. The primary tabs give instant access to the most-used features. "More" is the overflow — everything else.

### What "More" Contains

When tapped, More replaces the left panel content with a **grid of applet tiles** — each tile is an icon + label. Tapping a tile navigates to that feature. Square's known applets include:

| Applet | Icon | What it opens |
|--------|------|---------------|
| New Sale | register icon | Fresh checkout screen |
| Floor Plan | grid/table icon | Table management layout |
| Open Tickets | receipt icon | List of open/unsettled checks |
| Cash Drawer | cash icon | Cash drawer management |
| Time Cards | clock icon | Employee clock in/out |
| Reports | chart icon | Sales reports |
| Settings | gear icon | POS settings |

### Key Patterns

- **Grid layout** — consistent tile size, 3-4 columns depending on screen width
- **Icon + label** — each tile has an icon above a short label (same style as the bottom nav items but larger)
- **One-tap action** — tapping a tile navigates immediately. No sub-menus, no confirmation
- **Customizable** — merchants can choose which applets appear in the main bottom nav vs. in More
- **Context-aware** — available applets vary by device mode (full-service vs. quick-service vs. bar)

---

## OrderStack Current Implementation

### Bottom Nav (all 4 terminals)

```
[ Checkout ] [ Open Orders / Transactions ] [ Notifications ] [ More ]
```

- **Checkout** — shows the item grid (keypad, library, favorites, menu tabs)
- **Open Orders** (POS) / **Transactions** (Bar/Kiosk/Register) — placeholder
- **Notifications** — placeholder
- **More** — placeholder: `<div class="tab-placeholder"><h3>More</h3></div>`

### State Management

```typescript
type BottomTab = 'checkout' | 'open-orders' | 'notifications' | 'more';
// or for bar/kiosk/register:
type BottomTab = 'checkout' | 'transactions' | 'notifications' | 'more';
```

The `@if (activeBottomTab() === 'more')` block currently renders a placeholder div.

---

## Recommended Implementation

Replace the More placeholder with a grid of navigation tiles. Each tile navigates to a route using `Router.navigate()`. Since these are full-screen terminal routes (no sidebar), navigating away leaves the terminal — the user returns via browser back or by navigating to the terminal route again.

### More Menu Items by Terminal

**POS Terminal (`/pos`):**

| Tile | Icon | Route | Purpose |
|------|------|-------|---------|
| Floor Plan | `bi-grid-3x3` | `/floor-plan` | Table management |
| Cash Drawer | `bi-cash-stack` | `/cash-drawer` | Cash management |
| Reports | `bi-bar-chart-line` | `/reports` | Sales reports |
| Close of Day | `bi-journal-check` | `/close-of-day` | End-of-day reconciliation |
| Customers | `bi-people` | `/customers` | CRM dashboard |
| Settings | `bi-gear` | `/settings` | Control panel |

**Bar Terminal (`/bar`):**

| Tile | Icon | Route | Purpose |
|------|------|-------|---------|
| Cash Drawer | `bi-cash-stack` | `/cash-drawer` | Cash management |
| Reports | `bi-bar-chart-line` | `/reports` | Sales reports |
| Close of Day | `bi-journal-check` | `/close-of-day` | End-of-day reconciliation |
| Customers | `bi-people` | `/customers` | CRM dashboard |
| Settings | `bi-gear` | `/settings` | Control panel |

**Kiosk Terminal (`/kiosk`):**

| Tile | Icon | Route | Purpose |
|------|------|-------|---------|
| Reports | `bi-bar-chart-line` | `/reports` | Sales reports |
| Settings | `bi-gear` | `/settings` | Control panel |

**Register Terminal (`/register`):**

| Tile | Icon | Route | Purpose |
|------|------|-------|---------|
| Cash Drawer | `bi-cash-stack` | `/cash-drawer` | Cash management |
| Reports | `bi-bar-chart-line` | `/reports` | Sales reports |
| Close of Day | `bi-journal-check` | `/close-of-day` | End-of-day reconciliation |
| Customers | `bi-people` | `/customers` | CRM dashboard |
| Settings | `bi-gear` | `/settings` | Control panel |

---

## Implementation Steps

### Step 1: Define More menu items in each terminal TS file

**Files:**
- `src/app/features/pos/server-pos-terminal/server-pos-terminal.ts`
- `src/app/features/bar/bar-terminal/bar-terminal.ts`
- `src/app/features/kiosk/kiosk-terminal/kiosk-terminal.ts`
- `src/app/features/register/register-terminal/register-terminal.ts`

Add Router import and a readonly array of menu items:

```typescript
private readonly router = inject(Router);

readonly moreMenuItems = [
  { icon: 'bi-grid-3x3', label: 'Floor Plan', route: '/floor-plan' },
  { icon: 'bi-cash-stack', label: 'Cash Drawer', route: '/cash-drawer' },
  { icon: 'bi-bar-chart-line', label: 'Reports', route: '/reports' },
  { icon: 'bi-journal-check', label: 'Close of Day', route: '/close-of-day' },
  { icon: 'bi-people', label: 'Customers', route: '/customers' },
  { icon: 'bi-gear', label: 'Settings', route: '/settings' },
];

navigateTo(route: string): void {
  this.router.navigate([route]);
}
```

### Step 2: Replace More placeholder in each terminal HTML

**Files:**
- `src/app/features/pos/server-pos-terminal/server-pos-terminal.html`
- `src/app/features/bar/bar-terminal/bar-terminal.html`
- `src/app/features/kiosk/kiosk-terminal/kiosk-terminal.html`
- `src/app/features/register/register-terminal/register-terminal.html`

Replace the `tab-placeholder` block:

```html
<!-- ===== MORE TAB CONTENT ===== -->
@if (activeBottomTab() === 'more') {
  <div class="more-menu">
    <h3 class="more-menu-title">More</h3>
    <div class="more-menu-grid">
      @for (item of moreMenuItems; track item.route) {
        <button
          type="button"
          class="more-menu-tile"
          (click)="navigateTo(item.route)">
          <i class="bi {{ item.icon }}"></i>
          <span>{{ item.label }}</span>
        </button>
      }
    </div>
  </div>
}
```

### Step 3: Style the More menu grid

**Files:**
- `src/app/features/pos/server-pos-terminal/server-pos-terminal.scss`
- `src/app/features/bar/bar-terminal/bar-terminal.scss`
- `src/app/features/kiosk/kiosk-terminal/kiosk-terminal.scss`
- `src/app/features/register/register-terminal/register-terminal.scss`

```scss
.more-menu {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.more-menu-title {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 20px;
}

.more-menu-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;

  @media (max-width: 600px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.more-menu-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px 16px;
  background: #f9f9f9;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s;

  i {
    font-size: 28px;
    color: #374151;
  }

  span {
    font-size: 13px;
    font-weight: 500;
    color: #374151;
    text-align: center;
  }

  &:hover {
    background: #f0f0f0;
    border-color: #d0d0d0;
  }

  &:active {
    background: #e5e5e5;
    transform: scale(0.97);
  }
}
```

---

## Files Summary

| # | File | Change |
|---|------|--------|
| 1 | `src/app/features/pos/server-pos-terminal/server-pos-terminal.ts` | Add `Router`, `moreMenuItems` array, `navigateTo()` method |
| 2 | `src/app/features/pos/server-pos-terminal/server-pos-terminal.html` | Replace More placeholder with tile grid |
| 3 | `src/app/features/pos/server-pos-terminal/server-pos-terminal.scss` | Add `.more-menu`, `.more-menu-grid`, `.more-menu-tile` styles |
| 4 | `src/app/features/bar/bar-terminal/bar-terminal.ts` | Same as POS (different items list) |
| 5 | `src/app/features/bar/bar-terminal/bar-terminal.html` | Same as POS |
| 6 | `src/app/features/bar/bar-terminal/bar-terminal.scss` | Same as POS |
| 7 | `src/app/features/kiosk/kiosk-terminal/kiosk-terminal.ts` | Same (minimal items: Reports, Settings) |
| 8 | `src/app/features/kiosk/kiosk-terminal/kiosk-terminal.html` | Same as POS |
| 9 | `src/app/features/kiosk/kiosk-terminal/kiosk-terminal.scss` | Same as POS |
| 10 | `src/app/features/register/register-terminal/register-terminal.ts` | Same as POS (no Floor Plan) |
| 11 | `src/app/features/register/register-terminal/register-terminal.html` | Same as POS |
| 12 | `src/app/features/register/register-terminal/register-terminal.scss` | Same as POS |

## Verification

1. `ng serve` — confirm no build errors
2. Navigate to `/pos` — tap "More" in bottom nav
3. Verify 6 tiles appear in a 3-column grid (Floor Plan, Cash Drawer, Reports, Close of Day, Customers, Settings)
4. Tap "Floor Plan" — verify it navigates to `/floor-plan`
5. Tap "Settings" — verify it navigates to `/settings`
6. Navigate to `/bar` — tap More, verify 5 tiles (no Floor Plan)
7. Navigate to `/kiosk` — tap More, verify 2 tiles (Reports, Settings)
8. Navigate to `/register` — tap More, verify 5 tiles (no Floor Plan)
9. Verify each tile is a one-shot navigation — no toggles, no modals, just route change

## Sources

- [Square Restaurant POS Navigation Bar — Community](https://community.squareup.com/t5/Square-for-Restaurants/Restaurant-POS-Navigation-Bar/m-p/711270)
- [Restaurants POS Redesigned — Square Community](https://community.squareup.com/t5/Product-Updates/New-Restaurants-POS-redesigned-with-you-in-mind-Opt-in-today/bc-p/704896)
- [Create and assign modes | Square](https://squareup.com/help/us/en/article/8114-create-and-manage-device-profiles)
- [Square Restaurant POS](https://squareup.com/us/en/point-of-sale/restaurants)
