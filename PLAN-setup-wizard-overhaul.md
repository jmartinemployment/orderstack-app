# Setup Wizard Overhaul + Bug Fixes

## Context

After onboarding through the setup wizard, the sidebar is broken — module-gated items like Menu, Online Ordering, Inventory, etc. never appear because `enabledModules` is hardcoded to `[]` in the backend. The dashboard shows to-do items for things already completed in the wizard (business hours). The wizard itself needs new steps for Taxes, Team Members, Owner PIN, Discounts, KDS, and Hardware. Skippable steps need a permanent home in the sidebar so users can find them later.

---

## Chunk 1: Fix Critical Bugs (do first)

This chunk fixes everything that's broken **right now** after a user completes the existing wizard. No new steps are added here — this is purely about making the current 9-step (food) / 7-step (other) wizard produce correct results.

Four sub-chunks, each independently testable. **Execute in order** — 1.1 must land before 1.2 can be visually verified, and 1.3 depends on 1.1 being live so the sidebar links it references actually exist.

### Summary of bugs

| Sub-chunk | Bug | Impact | Root cause |
|-----------|-----|--------|-----------|
| 1.1 | `enabledModules` is `[]` after onboarding | Sidebar shows no module-gated items (Menu, Online, Inventory, etc.) | Backend hardcodes empty array instead of deriving from `primaryVertical` |
| 1.2 | Sidebar says "Items" for food businesses | Confusing — restaurants expect "Menu" | Label not mode-aware |
| 1.3 | Dashboard shows stale to-do tasks | "Set business hours" appears undone even though wizard always sets hours; "Create menu items" appears undone even though cuisine step already seeded a menu template | Dashboard reads localStorage, doesn't check actual data |
| 1.4 | Owner PIN stored as plain text | Security vulnerability — PINs must be hashed | Onboarding endpoint writes raw PIN to DB, bypasses `authService.hashPin()` |

---

### Chunk 1.1 — Populate `enabledModules` during onboarding

**Depends on:** Nothing (this is the foundation fix)
**Repo:** `Get-Order-Stack-Restaurant-Backend`
**Files changed:** `src/app/onboarding.routes.ts` (line 256)

**The problem:** Line 256 hardcodes `enabledModules: []`. The frontend's `PlatformService.enabledModules` computed (in `orderstack-app/src/app/services/platform.ts:82-85`) reads this value directly from `merchantProfile.enabledModules`. Since it's empty, `main-layout.component.ts:36` gets an empty array, and every `hasModule(modules, 'xxx')` check on lines 60, 67, 82, 86 etc. returns false. Result: the sidebar is missing Menu, Online Ordering, Inventory, KDS, Reservations, and every other module-gated nav item.

**The fix:** Add a `VERTICAL_MODULES` lookup object to `onboarding.routes.ts` that mirrors the `enabledModules` arrays from the frontend's `BUSINESS_VERTICAL_CATALOG` (defined in `orderstack-app/src/app/models/platform.model.ts:29-124`). Then replace line 256 with a lookup.

**Complete module mapping (must match `platform.model.ts` exactly):**

| Vertical | `enabledModules` array |
|----------|----------------------|
| `food_and_drink` | `menu_management`, `table_management`, `kds`, `reservations`, `online_ordering`, `inventory`, `marketing`, `loyalty`, `delivery`, `gift_cards`, `staff_scheduling`, `payroll`, `reports`, `crm`, `multi_location` |
| `retail` | `inventory`, `online_ordering`, `marketing`, `loyalty`, `gift_cards`, `staff_scheduling`, `payroll`, `reports`, `crm`, `multi_location` |
| `grocery` | `inventory`, `online_ordering`, `marketing`, `loyalty`, `gift_cards`, `staff_scheduling`, `payroll`, `reports`, `crm`, `multi_location` |
| `beauty_wellness` | `appointments`, `inventory`, `marketing`, `loyalty`, `gift_cards`, `staff_scheduling`, `payroll`, `reports`, `crm`, `multi_location` |
| `healthcare` | `appointments`, `invoicing`, `marketing`, `staff_scheduling`, `payroll`, `reports`, `crm` |
| `sports_fitness` | `appointments`, `inventory`, `marketing`, `loyalty`, `gift_cards`, `staff_scheduling`, `payroll`, `reports`, `crm`, `multi_location` |
| `home_repair` | `invoicing`, `marketing`, `staff_scheduling`, `payroll`, `reports`, `crm` |
| `professional_services` | `invoicing`, `marketing`, `staff_scheduling`, `payroll`, `reports`, `crm` |

**Line 256 changes from:**
```typescript
enabledModules: [],
```
**To:**
```typescript
enabledModules: VERTICAL_MODULES[primaryVertical ?? 'food_and_drink'] ?? [],
```

**Sidebar items this unblocks** (per `main-layout.component.ts` lines 55-90):
- Line 60: `hasModule(modules, 'menu_management')` → "Items" link appears
- Line 67: `hasModule(modules, 'online_ordering')` → "Online" link appears
- Line 82: `hasModule(modules, 'inventory')` → "Inventory" link appears
- Line 86: `hasModule(modules, 'kds')` → "KDS" link appears (food only)
- Line 89: `hasModule(modules, 'reservations')` → "Reservations" link appears (food only)
- Plus any future sidebar items gated by `hasModule()`

**How to test:**

This is a backend-only change (one file in `Get-Order-Stack-Restaurant-Backend`). There are no backend unit tests — verification is done by inspecting the database after onboarding.

*Step 1 — Compile check:*
```bash
cd /Users/jam/development/Get-Order-Stack-Restaurant-Backend
npx tsc --noEmit
```
Zero errors means the `VERTICAL_MODULES` object and lookup are syntactically correct.

*Step 2 — Code review (no running servers needed):*
Manually verify the `VERTICAL_MODULES` object in `onboarding.routes.ts` matches `BUSINESS_VERTICAL_CATALOG` in `orderstack-app/src/app/models/platform.model.ts:29-124` entry-for-entry. Every vertical must have the same modules in the same order. This is the most important check — a mismatch here means the sidebar shows wrong items for that business type.

*Step 3 — Database verification (requires local backend + Supabase):*
```bash
cd /Users/jam/development/Get-Order-Stack-Restaurant-Backend
npm run dev
```
Then in another terminal, `ng serve` the frontend. Complete the wizard as a food_and_drink business. Then query Supabase:
```sql
SELECT
  name,
  merchant_profile->'primaryVertical' AS vertical,
  merchant_profile->'enabledModules' AS modules
FROM "Restaurant"
ORDER BY created_at DESC
LIMIT 1;
```
The `modules` column should return the full array for `food_and_drink` (15 modules), not `[]`.

*Step 4 — End-to-end sidebar check (requires both servers running):*
After completing onboarding in Step 3, the sidebar should now show module-gated items:
- food_and_drink → Dashboard, Orders, POS, Items, Online, Customers, Reports, Staff, Inventory, KDS, Reservations, Settings
- retail → Dashboard, Orders, POS, Items, Online Store, Customers, Reports, Staff, Inventory, Settings
- professional_services → Dashboard, Items & Services, Customers, Reports, Staff, Settings

Steps 3 and 4 can be automated with the Playwright skill later, but for the initial fix, manual verification is sufficient since you're changing one line and adding one lookup object.

---

### Chunk 1.2 — Rename sidebar "Items" to "Menu" for food businesses

**Depends on:** Chunk 1.1 (the "Items" link won't even appear in the sidebar until `enabledModules` is populated)
**Repo:** `orderstack-app`
**Files changed:** `src/app/layouts/main-layout.component.ts` (line 61)

**The problem:** Line 61 shows "Items" for all non-retail, non-service businesses. Food & drink businesses expect to see "Menu" — this is standard in every restaurant POS (Square, Toast, Clover all say "Menu").

**The fix:** Change line 61:
```typescript
// Before:
items.push({ label: 'Items', icon: 'bi-book', route: '/menu' });

// After:
items.push({ label: restaurant ? 'Menu' : 'Items', icon: 'bi-book', route: '/menu' });
```

The `restaurant` boolean on line 33 is already `true` when the platform mode is `full_service`, `quick_service`, or `bar` — exactly the food & drink modes.

**How to test:**
1. Log in as a food_and_drink business (e.g., `owner@taipa.com` / `owner123`)
2. Sidebar should show **"Menu"** (not "Items") with the `bi-book` icon
3. Click it — should navigate to `/menu` and show the menu management page
4. Log in as (or onboard) a non-food, non-retail, non-service business — sidebar should still show **"Items"**
5. `ng build --configuration=production` — zero errors

---

### Chunk 1.3 — Fix dashboard tasks to reflect wizard completion

**Depends on:** Chunk 1.1 (the "Online" sidebar link referenced in the `online` task removal only appears after `enabledModules` is populated; also the menu categories check in the `items` task depends on the cuisine → template flow which already works but only matters once the sidebar is functional)
**Repo:** `orderstack-app`
**Files changed:** `src/app/features/home/home-dashboard/home-dashboard.ts`

**The problem:** The dashboard to-do card uses `localStorage` key `os-setup-tasks` to track completion. The wizard doesn't write to this key, so after onboarding:
- "Set business hours" shows as undone — even though the wizard always sends `defaultBusinessHours()` in the payload (line 907 of `setup-wizard.ts`), so hours are always set.
- "Create your first menu items" shows as undone — even though if the user selected a cuisine at Step 3, the backend already seeded categories and items from `MENU_TEMPLATES` (backend lines 324-360). The user already has a full menu.
- "Set up online ordering" shows as a to-do — but online ordering already has its own sidebar link (after Chunk 1.1), making this redundant.

**The fix:** On dashboard init, check actual data state before showing tasks:

| Task ID | Current label | What changes |
|---------|--------------|-------------|
| `hours` | "Set your business hours" | **Always auto-mark done.** The wizard always sets default hours. No food or non-food path skips this. |
| `items` | "Create your first menu items" | Check if menu categories exist via `MenuService.categories()`. If the array has items → auto-mark done + relabel to "Review your menu". (See "Cuisine step connection" below for why this works.) |
| `online` | "Set up online ordering" | **Remove entirely.** The sidebar already has an "Online" link (line 67-68 of `main-layout.component.ts`). Having it as both a to-do and a sidebar item is confusing. |
| `pin` | "Set owner PIN" | Keep as-is for now. The current wizard sends `pin: ''` (line 912 of `setup-wizard.ts`), so the backend `if (ownerPin?.pin)` guard on line 299 skips PIN creation. This stays a to-do until Chunk 2 adds the Owner PIN step. |
| All others | Various | No change. `taxes`, `team`, `discounts`, `hardware`, `display` stay as-is until their wizard steps are added in Chunks 2-4. |

**The cuisine step connection:** The "Select Your Cuisine" step (Step 3, food_and_drink only) is the mechanism that pre-populates the menu. The flow is:
1. User picks a cuisine (e.g., "Mexican") in `setup-wizard.ts:763-767`
2. `CUISINE_TEMPLATE_MAP` maps it to a template ID (or defaults to `casual-dining`)
3. The template ID is sent as `menuTemplateId` in the `OnboardingPayload` (line 909)
4. Backend receives it, looks up `MENU_TEMPLATES.find(t => t.id === menuTemplateId)` (line 325)
5. Backend creates categories + items from the template (lines 327-360)
6. **So the dashboard's "Create your first menu items" task is already done** if a cuisine was selected

If the user **skipped** the cuisine step (`skipCuisine()` on line 769 sets `menuTemplateId` to `null`), no template is applied, and the menu is empty — so the task correctly remains as a to-do.

**How to test:**

*Test A — Food business that selected a cuisine:*
1. Complete wizard as food_and_drink, select "Mexican" as cuisine
2. Land on dashboard → to-do card should show:
   - "Set your business hours" — **done** (checkmark)
   - "Review your menu" — **done** (checkmark, note the relabeled text)
   - "Set up online ordering" — **gone** (not in list at all)
   - "Set owner PIN" — undone (still a to-do)
3. Click "Review your menu" if it's a link → should go to `/menu` and show seeded categories

*Test B — Food business that skipped cuisine:*
1. Complete wizard as food_and_drink, click "Skip" on cuisine step
2. Dashboard → "Create your first menu items" should remain **undone** (no template was applied, menu is empty)
3. "Set your business hours" should still be **done**

*Test C — Non-food business (e.g., retail):*
1. Complete wizard as retail (no cuisine step exists for non-food)
2. Dashboard → "Set your business hours" should be **done**
3. "Set up online ordering" should be **gone**
4. Menu-related task behavior depends on whether retail has an equivalent — if `MenuService.categories()` returns empty, task stays undone

5. `ng build --configuration=production` — zero errors

---

### Chunk 1.4 — Fix Owner PIN — not hashed during onboarding

**Depends on:** Nothing (independent backend fix, can be done in parallel with 1.2 and 1.3)
**Repo:** `Get-Order-Stack-Restaurant-Backend`
**Files changed:** `src/app/onboarding.routes.ts` (lines 299-307)

**The problem:** Line 303 stores the PIN as plain text: `pin: ownerPin.pin`. The rest of the app uses `authService.hashPin()` (bcrypt) when creating PINs via the `POST /api/auth/:restaurantId/pins` endpoint, but the onboarding route bypasses this and writes directly to `tx.staffPin.create()`.

**The fix:** Hash before storing:
```typescript
// Before (line 303):
pin: ownerPin.pin,

// After:
pin: await authService.hashPin(ownerPin.pin),
```

**Note:** Currently the wizard sends `pin: ''` (line 912 of `setup-wizard.ts`), and the `if (ownerPin?.pin)` guard on line 299 skips creation for empty strings. So this bug won't manifest until the Owner PIN step is added in Chunk 2. But it should be fixed now so it's correct when that step lands.

**How to test:**
1. Temporarily modify `setup-wizard.ts` line 912 to send a test PIN: `pin: '1234'`
2. Complete the wizard
3. Query the database: `SELECT pin FROM "StaffPin" WHERE role = 'owner' ORDER BY "createdAt" DESC LIMIT 1;`
4. The `pin` column should contain a bcrypt hash (starts with `$2b$`) — **not** the literal string `1234`
5. Verify POS login works with that PIN (bcrypt compare should pass)
6. Revert the temporary change to `setup-wizard.ts`
7. `tsc --noEmit` in the backend — zero errors

---

### Execution order

```
Chunk 1.1 (backend: enabledModules)
  ├── Chunk 1.2 (frontend: Menu label) — depends on 1.1
  └── Chunk 1.3 (frontend: dashboard tasks) — depends on 1.1

Chunk 1.4 (backend: PIN hashing) — independent, can run in parallel with anything
```

Recommended order: **1.1 → 1.4 → 1.2 → 1.3** (both backend fixes first since they touch the same file, then both frontend fixes)

---

## Chunk 2: New Wizard Steps (Part A — Owner PIN + Taxes)

### Current step order (food_and_drink, 9 steps):
1. Business Name + Home Address + Business Address
2. Business Type
3. Cuisine → sets menu template
4. Annual Revenue → **submits onboarding here**
5. Multiple Locations
6. Delivery Providers
7. Plan & Payment Processor
8. Hardware
9. Done

### New step order (food_and_drink, 15 steps):
1. Business Name + Home Address + Business Address
2. Business Type
3. Cuisine → sets menu template
4. Annual Revenue → **submits onboarding here**
5. Multiple Locations
6. **Set Up Taxes** (new) — skippable
7. **Set Owner PIN** (new) — **NOT skippable**
8. **Add Team Members** (new) — skippable
9. **Create Discounts** (new) — skippable
10. **Configure KDS** (new) — skippable, food only
11. Delivery Providers (food only)
12. Plan & Payment Processor
13. **Set Up Hardware** (existing, stays)
14. Done

For non-food businesses (no cuisine, no KDS, no delivery): 11 steps.

### Step 6: Set Up Taxes
**What it does:** Auto-lookup tax rate by the business state (already entered in step 1), let user confirm or override.

**UI:**
- Display: "Based on your location in [State], your estimated tax rate is [X]%"
- Editable field for the rate (pre-filled from `GET /api/platform/tax-rate?state=XX`)
- Toggle: "Tax included in prices" (yes/no)
- "Skip — I'll set this up later" link

**Backend:** Already exists — `GET /api/platform/tax-rate` + saved via `PATCH /api/restaurant/:id/merchant-profile`

**Signals to add:** `_taxRate`, `_taxInclusive`

### Step 7: Set Owner PIN
**What it does:** Create a 4-6 digit PIN for the owner. Used for POS login, manager approvals, voiding items.

**UI:**
- Explanation: "Your PIN is used to sign in to the POS terminal, approve voids and refunds, and clock in/out."
- PIN input (4-6 digits, masked with dots, numpad-style entry)
- Confirm PIN input (must match)
- Validation: 4-6 digits, both fields match
- **No skip button** — this step is required

**Backend:** Already handled in onboarding create payload (`ownerPin.pin`). Currently the pin field is sent as empty string `''` (line 913 of setup-wizard.ts). We'll populate it from this step.

**Signals to add:** `_ownerPin`, `_ownerPinConfirm`

---

## Chunk 3: New Wizard Steps (Part B — Team Members + Discounts)

### Step 8: Add Team Members
**What it does:** Create staff PINs for team members who will use the POS.

**UI:**
- Explanation: "Add your team so they can clock in and use the POS. You can always add more later in Settings."
- "Add team member" button → inline form: Name, Role (staff/manager), 4-6 digit PIN
- List of added members with delete button
- "Skip — I'll add team later" link

**Backend:** `POST /api/auth/:restaurantId/pins` (already exists). Called after onboarding submit since we need the restaurantId.

**Signals to add:** `_teamMembers` (array of {name, role, pin})

**Note:** These get created via API calls AFTER the onboarding submission (step 4), since we need the restaurant ID. The wizard will batch-create them when leaving this step.

### Step 9: Create Discounts
**What it does:** Create reusable discount presets (employee meal, loyalty, happy hour, etc.)

**UI:**
- Explanation: "Set up discounts your team can apply at the register. You can always add more in Settings."
- Quick-add presets: "Employee Meal (100% comp)", "Loyalty (10% off)", "Happy Hour (20% off)", "Senior Discount (15% off)"
- Each preset is a toggle (on/off) — toggled on means it gets created
- Custom discount button → Name, Type (% or $), Value
- List of selected/custom discounts
- "Skip — I'll set this up later" link

**Backend:** No discount preset endpoint exists yet. We need to add a `restaurant_discounts` table or store in merchant profile JSON. Simplest: store as array in `merchantProfile.discountPresets[]` and create a small endpoint.

**New backend work:**
- Add `GET/POST/DELETE /api/restaurant/:restaurantId/discounts` for preset CRUD
- Or store in merchantProfile (simpler, no schema change)

**Signals to add:** `_discountPresets` (array of {name, type, value, enabled})

---

## Chunk 4: New Wizard Steps (Part C — KDS)

### Step 10: Configure KDS (food_and_drink only)
**What it does:** Set up kitchen display stations and assign menu categories to them.

**UI:**
- Explanation: "Stations route orders to the right prep area. For example, a 'Grill' station gets burger orders, 'Bar' gets drink orders."
- Default suggestion: Create one station called "Kitchen" that gets all categories (simplest setup)
- "Add station" button → Name, Color picker
- After onboarding: assign categories to stations (categories come from menu template)
- "Skip — I'll configure this later" link

**Backend:** `POST /api/restaurant/:restaurantId/stations` (StationService, already exists). Called after onboarding since we need restaurantId and category IDs.

**Signals to add:** `_kdsStations` (array of {name, color})

---

## Chunk 5: Sidebar Setup Guide + Dashboard Task Cleanup

### Sidebar "Setup Guide" Link

**File:** `orderstack-app/src/app/layouts/main-layout.component.ts`

**What:** Add a temporary "Setup Guide" nav item with a checklist icon that links to `/home` (which has the setup tasks card). Show it above Settings, only when not all essential tasks are complete.

**How:** Check a signal from PlatformService or a new shared service that tracks setup completion. When all essential dashboard tasks are done, the link disappears.

**Implementation:** Add to `navItems` computed:
```typescript
// Show Setup Guide until essential tasks are complete
if (!this.setupComplete()) {
  items.push({ label: 'Setup Guide', icon: 'bi-journal-check', route: '/home' });
}
items.push({ label: 'Settings', icon: 'bi-gear', route: '/settings' });
```

The `setupComplete` signal reads from the same localStorage `os-setup-tasks` that the dashboard uses, exposed via a shared service.

### Dashboard Task Cleanup

**File:** `orderstack-app/src/app/features/home/home-dashboard/home-dashboard.ts`

Changes to the 9 existing tasks:

| Task ID | Current | Change |
|---------|---------|--------|
| `items` | "Create your first menu items" | If menu exists → "Review your menu" (auto-done) |
| `taxes` | "Set up taxes" | If done in wizard → auto-done |
| `team` | "Add team members" | If done in wizard → auto-done |
| `hours` | "Set your business hours" | **Always auto-done** (wizard always sets hours) |
| `online` | "Set up online ordering" | **Remove** — sidebar has Online link |
| `display` | "Configure your display" | Keep as-is |
| `discounts` | "Create discounts" | If done in wizard → auto-done |
| `hardware` | "Set up hardware" | Keep as-is |
| `pin` | "Set owner PIN" | If done in wizard → auto-done (always done since not skippable) |

---

## Files Modified

### Backend (`Get-Order-Stack-Restaurant-Backend/`)
| File | Change |
|------|--------|
| `src/app/onboarding.routes.ts` | Populate `enabledModules` from vertical; hash owner PIN |
| `src/app/onboarding.routes.ts` or new file | Add discount preset storage (merchantProfile JSON or new endpoint) |

### Frontend (`orderstack-app/`)
| File | Change |
|------|--------|
| `src/app/features/onboarding/setup-wizard/setup-wizard.ts` | Add 6 new steps, signals, validation, API calls |
| `src/app/features/onboarding/setup-wizard/setup-wizard.html` | Add 6 new step templates |
| `src/app/features/onboarding/setup-wizard/setup-wizard.scss` | Styles for new steps (PIN pad, team list, discount toggles, station cards) |
| `src/app/layouts/main-layout.component.ts` | Rename "Items" → "Menu" for food; add Setup Guide link |
| `src/app/features/home/home-dashboard/home-dashboard.ts` | Auto-complete tasks from wizard data; remove online ordering task |
| `src/app/services/setup-progress.ts` | **New file** — shared service for setup completion state (used by sidebar + dashboard) |

---

## Verification

1. Complete onboarding as a food_and_drink business, selecting a cuisine
2. After wizard: sidebar should show "Menu", "Online", "Inventory", "Setup Guide", etc.
3. Click "Menu" → should see categories and items from the template
4. Dashboard should show "Review your menu" (done), "Set business hours" (done), "Set owner PIN" (done)
5. Dashboard should NOT show "Set up online ordering" as a task
6. "Setup Guide" should appear in sidebar, disappear when all tasks are marked done
7. `ng build --configuration=production` — zero errors
8. `tsc --noEmit` (backend) — zero errors
