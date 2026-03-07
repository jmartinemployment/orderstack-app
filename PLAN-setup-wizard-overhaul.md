# Setup Wizard Overhaul + Bug Fixes

## Context

After onboarding through the setup wizard, the sidebar is broken — module-gated items like Menu, Online Ordering, Inventory, etc. never appear because `enabledModules` is hardcoded to `[]` in the backend. The dashboard shows to-do items for things already completed in the wizard (business hours). The wizard itself needs new steps for Taxes, Team Members, Owner PIN, Discounts, KDS, and Hardware. Skippable steps need a permanent home in the sidebar so users can find them later.

---

## Chunk 1: Fix Critical Bugs (do first)

This chunk fixes everything that's broken **right now** after a user completes the existing wizard. No new steps are added here — this is purely about making the current 9-step (food) / 7-step (other) wizard produce correct results.

Three sub-chunks remaining. **Execute in order** — 1.2 and 1.3 depend on `enabledModules` being populated (already done in backend).

### Summary of remaining bugs

| Sub-chunk | Bug | Impact | Root cause |
|-----------|-----|--------|-----------|
| 1.2 | Sidebar says "Items" for food businesses | Confusing — restaurants expect "Menu" | Label not mode-aware |
| 1.3 | Dashboard shows stale to-do tasks | "Set up online ordering" appears as a to-do even though sidebar already has an Online link | Task list not trimmed after wizard |
| 1.4 | Owner PIN stored as plain text | Security vulnerability — PINs must be hashed | Onboarding endpoint writes raw PIN to DB, bypasses `authService.hashPin()` |

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

**Repo:** `orderstack-app`
**Files changed:** `src/app/features/home/home-dashboard/home-dashboard.ts`

**Remaining fixes:**

| Task ID | Current label | What changes |
|---------|--------------|-------------|
| `items` | "Create your first menu items" | Check if menu categories exist via `MenuService.categories()`. If array has items → auto-mark done + relabel to "Review your menu". |
| `online` | "Set up online ordering" | **Remove entirely.** The sidebar already has an "Online" link. Having it as both a to-do and a sidebar item is confusing. |

**How to test:**

*Test A — Food business that selected a cuisine:*
1. Complete wizard as food_and_drink, select a cuisine
2. Dashboard → "Review your menu" should be **done** (checkmark), "Set up online ordering" should be **gone**

*Test B — Food business that skipped cuisine:*
1. Complete wizard, skip cuisine step
2. Dashboard → "Create your first menu items" stays **undone** (menu is empty)

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
Chunk 1.4 (backend: PIN hashing) — independent
Chunk 1.2 (frontend: Menu label)
Chunk 1.3 (frontend: dashboard tasks)
```

Recommended order: **1.4 → 1.2 → 1.3**

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
| `src/app/onboarding.routes.ts` | Hash owner PIN |
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
2. After wizard: sidebar should show "Menu" (not "Items"), "Online", "Inventory", "Setup Guide", etc.
3. Click "Menu" → should see categories and items from the template
4. Dashboard should show "Review your menu" (done), "Set owner PIN" (done)
5. Dashboard should NOT show "Set up online ordering" as a task
6. "Setup Guide" should appear in sidebar, disappear when all tasks are marked done
7. `ng build --configuration=production` — zero errors
8. `tsc --noEmit` (backend) — zero errors
