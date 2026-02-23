# GAP-R07: Menu Scheduling (Daypart Menus)

**Status:** NOT STARTED
**Priority:** 4
**Square Reference:** Different menus active at different times. Breakfast 6am-11am, lunch 11am-4pm, dinner 4pm-close. Items auto appear/disappear. Kiosk and online ordering respect schedules. Multiple time periods per day supported.

---

## Overview

Restaurants serve different menus at different times of day (dayparts). A breakfast menu is active from 6am-11am, lunch from 11am-4pm, dinner from 4pm-close. Items tagged with daypart schedules automatically appear and disappear across all channels (POS, KDS, online ordering, kiosk). Menu schedule management UI in Menu Management.

---

## Phase 1 — Daypart Scheduling (Steps 1-5)

### Step 1: Schedule Models

**Files to modify:**
- `src/app/models/menu.model.ts` — add `Daypart` interface (id, name, startTime: string (HH:mm), endTime: string (HH:mm), daysOfWeek: number[] (0=Sun..6=Sat), isActive: boolean). Add `MenuSchedule` interface (id, name, dayparts: Daypart[], isDefault: boolean). Add `daypartIds: string[]` to `MenuItem` (items belong to zero or more dayparts; empty = always available). Add `activeMenuScheduleId: string | null` to restaurant settings.

### Step 2: Service Methods

**Files to modify:**
- `src/app/services/menu.ts` — add `loadMenuSchedules()`, `createMenuSchedule()`, `updateMenuSchedule()`, `deleteMenuSchedule()`, `assignItemsToDaypart(itemIds, daypartId)`, `removeItemsFromDaypart(itemIds, daypartId)`. New signals: `_menuSchedules`. New computed: `activeMenuItems` — filters `menuItems()` by current time against active dayparts. Items with no daypart assignment are always shown. Computed recalculates every minute via interval.

### Step 3: Menu Schedule Management UI

**Files to create or modify:**
- Add "Schedules" tab or section to Menu Management. Schedule list with daypart time blocks. Create/edit schedule form: name, daypart list (name, start time, end time, days of week checkboxes). Visual timeline showing dayparts across a 24-hour bar. Assign items to dayparts via multi-select + daypart dropdown.

### Step 4: Channel Filtering

All ordering channels respect active daypart filtering.

**Files to modify:**
- `src/app/features/pos/server-pos-terminal/` — use `activeMenuItems` instead of `menuItems` for item grid.
- `src/app/features/pos/order-pad/` — same filtering.
- `src/app/features/online-ordering/online-order-portal/` — filter displayed items by active daypart. Show "Available from X:XX" badge on items outside current daypart.
- `src/app/features/kds/kds-display/` — no change needed (KDS displays ordered items regardless of schedule).
- `src/app/features/sos/menu-display/` — filter kiosk items by active daypart.

### Step 5: Build Verification

- `ng build --configuration=production` — zero errors

---

## Phase 2 — Advanced Scheduling (Steps 6-8)

### Step 6: Schedule Preview

Preview which items will be active at any given time. "What's on the menu at 3pm on Tuesday?" preview tool.

### Step 7: Holiday / Special Day Overrides

Override schedules for specific dates (e.g., brunch-only on Mother's Day, closed Christmas).

### Step 8: Schedule Notifications

Alert staff when daypart is about to change (e.g., "Lunch menu starts in 15 minutes").
