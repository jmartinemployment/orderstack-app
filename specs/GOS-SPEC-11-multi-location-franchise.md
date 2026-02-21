# GOS-SPEC-11: Multi-Location & Franchise — Square Parity Enhancements

## Context

Square for Franchises provides a centralized franchisor dashboard with multi-location oversight, permission-based menu customization (corporate sets base menu, locations can customize within guardrails), automated royalty/fee calculation, flat organizational hierarchy with location groups, consolidated reporting across all locations, centralized customer data with cross-location loyalty pooling, and staff management across locations. OrderStack's multi-location system has foundations — location group CRUD with members, cross-location KPI comparison, menu sync (one-way preview + execute), settings propagation (5 types), and sync history — but lacks franchise-specific features and several cross-location capabilities.

**Key gaps identified:**
- No **franchise royalty/fee tracking** — no revenue share calculation or franchisor reporting
- No **cross-location inventory** — stock tracked per-restaurant only, no group-level visibility
- No **cross-location staff management** — `TeamMember.assignedLocationIds` exists but no UI to view/schedule across locations
- No **cross-location loyalty pooling** — points earned at location A cannot be redeemed at location B
- No **cross-location customer deduplication** — same customer at two locations exists as separate records
- No **centralized marketing** — campaigns target one restaurant's customers only
- No **location-specific menu guardrails** — menu sync is all-or-nothing, no "corporate required items" vs "local optional items"
- No **real-time location health monitoring** — no all-locations live dashboard
- Settings propagation covers only 5 types (missing tip-management, stations, break-types, workweek)
- Menu sync is **one-way manual** — no auto-sync on publish, no category-level selective sync
- No **location performance benchmarking** — basic KPI table but no percentile rankings or standardized scoring

**Existing assets:**
- `models/multi-location.model.ts` — LocationGroup, CrossLocationReport, MenuSyncPreview, SettingsPropagation, MultiLocationTab (4 tabs)
- `services/multi-location.ts` — MultiLocationService with 13 methods (groups, members, reporting, menu sync, settings propagation)
- `multi-location/multi-location-dashboard/` — 4 tabs (Overview, Groups, Menu Sync, Settings)
- `models/restaurant.model.ts` — Restaurant with slug, settings, taxRate

---

## Mode Awareness (GOS-SPEC-01 Alignment)

Multi-location management and franchising are **universal across all business verticals**. The `multi_location` platform module is enabled for most verticals. A franchise/chain can be a restaurant group, a retail chain, a salon franchise, or a services network — the organizational structure is identical.

### Universal Features (All Verticals)

Every feature in this spec is fundamentally universal:
- Location group management (CRUD, member assignment)
- Cross-location KPI comparison
- Franchise configuration (royalties, fees, control levels)
- Menu/catalog sync between locations
- Settings propagation
- Cross-location customer unification and loyalty pooling
- Cross-location staff management and transfers
- Cross-location inventory visibility and transfers
- Location health monitoring
- Performance benchmarking and compliance

### Vertical-Specific Adaptations

| Feature | Adaptation | Notes |
|---|---|---|
| **Menu sync** | `food_and_drink`: syncs menu items, modifier groups, categories. `retail`: syncs products, variations, vendor SKUs. `services`: syncs service catalog, pricing, duration. | The sync mechanism is universal; the *content* being synced differs by vertical |
| **Menu control levels** | Universal concept. `strict`: locations can only toggle items on/off. `moderate`: ±X% price flex + local additions. `flexible`: full control, corporate items protected. | Works identically for restaurant menus, retail catalogs, and service lists |
| **Cross-location inventory** | `food_and_drink` + `retail` + `grocery`: full inventory sync, transfer, reorder. `services`: limited (product inventory only, not service capacity). | Gated by `inventory` module presence |
| **Cross-location loyalty** | Universal — points earned at any group location, redeemed at any. | No vertical difference |
| **Franchise royalties** | Universal — percentage or flat fee on revenue. | Royalty types and calculation identical across verticals |
| **Settings propagation types** | Universal base set (ai, pricing, loyalty, delivery, payment). Restaurant adds: tip_management, stations, break_types. All verticals: workweek, timeclock, business_hours. | `PropagationSettingType` includes vertical-specific types that are hidden when not applicable |
| **Location health monitoring** | Universal — online/offline, active alerts, device status. Restaurant adds: KDS queue depth, overdue orders. Retail adds: POS transaction rate. Services adds: appointment utilization. | Health dashboard shows vertical-appropriate metrics per location |
| **Performance benchmarking** | Universal scoring (revenue, labor %, customer satisfaction). Restaurant adds: food cost %, table turn time. Retail adds: inventory turnover, shrinkage rate. Services adds: utilization rate, rebooking rate. | Score weights adapt per vertical |
| **Compliance dashboard** | Universal structure (checklist per location). Restaurant: menu compliance + hours compliance. Retail: product compliance + pricing compliance. Franchise: brand compliance. | Checklist items adapt per vertical |

### Multi-Vertical Franchise Groups

A franchise group can span **multiple verticals**. Example: a brewery chain with food service (food_and_drink) + merchandise (retail) at each location. The multi-location dashboard handles this by:
- Showing the **primary vertical's** metrics by default
- Allowing vertical filter on KPI comparison ("Show restaurant metrics" / "Show retail metrics")
- Menu sync operates per-vertical (restaurant menu synced separately from retail catalog)
- Settings propagation includes vertical-specific settings only when applicable

### Device Mode Diversity Across Locations

Within a franchise group, different locations may use different device modes:
- Location A (full-service restaurant): Full Service iPads + Bar terminals
- Location B (fast-casual): Quick Service iPads + Kiosk
- Location C (ghost kitchen): Quick Service only

The multi-location dashboard displays **location-level** metrics (not device-level), so mode diversity is transparent. However:
- **Settings propagation** respects mode — propagating `enableCoursing: true` to a QSR location is valid (it's stored but unused until the mode enables it)
- **Menu sync** is mode-independent — all items sync; visibility per channel/mode is a local setting
- **Device health** shows per-device mode badges in the health dashboard

### Cross-Location Marketing Adaptation

Group-level campaigns (`MarketingService.createGroupCampaign`) target customers across all group locations. The campaign content adapts per location's vertical if the group spans multiple verticals:
- Template variables: `{{location_name}}`, `{{location_address}}`, `{{location_hours}}`
- Vertical-specific content blocks (e.g., menu highlights for restaurants, new arrivals for retail) selected per location

---

## Phase 1 — Franchise Foundation (Steps 1-5)

### Step 1: Franchise Configuration Model

**Add to `models/multi-location.model.ts`:**
```ts
export interface FranchiseConfig {
  id: string;
  groupId: string;
  franchisorName: string;
  royaltyType: 'percentage' | 'flat_monthly';
  royaltyRate: number;            // % of revenue or flat $
  marketingFeeType: 'percentage' | 'flat_monthly';
  marketingFeeRate: number;
  technologyFeeMonthly: number;
  reportingFrequency: 'weekly' | 'monthly';
  menuControlLevel: 'strict' | 'moderate' | 'flexible';
  // strict = locations can only toggle items on/off
  // moderate = locations can adjust prices ±X%, add local items
  // flexible = locations have full menu control, corporate items can't be removed
  priceFlexibilityPercent: number;  // How much locations can adjust prices (e.g. 10 = ±10%)
  requireApprovalForMenuChanges: boolean;
  brandingEnforced: boolean;
}

export interface FranchiseRoyaltyReport {
  periodStart: string;
  periodEnd: string;
  locations: FranchiseLocationRoyalty[];
  totalRevenue: number;
  totalRoyalties: number;
  totalMarketingFees: number;
  totalTechnologyFees: number;
  totalDue: number;
}

export interface FranchiseLocationRoyalty {
  restaurantId: string;
  restaurantName: string;
  grossRevenue: number;
  netRevenue: number;
  royaltyAmount: number;
  marketingFeeAmount: number;
  technologyFeeAmount: number;
  totalDue: number;
  isPaid: boolean;
  paidAt: string | null;
}

export type MultiLocationTab = 'overview' | 'groups' | 'menu-sync' | 'settings' | 'franchise' | 'staff' | 'customers' | 'inventory';
```

### Step 2: Franchise Royalty Dashboard

**Add to `MultiLocationService`:**
- `loadFranchiseConfig(groupId)` — GET `/location-groups/:groupId/franchise-config`
- `updateFranchiseConfig(groupId, data)` — PATCH `/location-groups/:groupId/franchise-config`
- `generateRoyaltyReport(groupId, periodStart, periodEnd)` — POST `/location-groups/:groupId/royalty-report`
- `markRoyaltyPaid(groupId, restaurantId, period)` — PATCH `/location-groups/:groupId/royalty-payment`
- `loadRoyaltyHistory(groupId)` — GET `/location-groups/:groupId/royalty-history`

**Add "Franchise" tab (5th tab) to Multi-Location Dashboard:**
- Franchise config form: royalty type/rate, marketing fee, technology fee, menu control level, price flexibility
- Current period royalty summary: per-location table (revenue, royalty, fees, total due, paid status)
- Historical royalty reports: period selector, exportable (CSV/PDF)
- Payment tracking: mark individual locations as paid, outstanding balance alerts

### Step 3: Menu Control Guardrails

**Add to `models/menu.model.ts`:**
```ts
// Add to MenuItem
isCorporateItem: boolean;         // Set by franchisor, cannot be removed by location
corporateItemId: string | null;   // Links to source item in franchisor's menu
localPriceOverride: number | null; // Location's price if different from corporate
isLocalAddition: boolean;          // Item added by location (not from corporate)
requiresApproval: boolean;         // Location menu change needs franchisor approval
approvalStatus: 'pending' | 'approved' | 'rejected' | null;
```

**Enhance Menu Sync:**
- **Corporate push**: franchisor publishes menu → auto-sync to all locations (with notification)
- **Local customization**: based on `menuControlLevel`:
  - **strict**: locations can only toggle corporate items on/off, no price changes, no additions
  - **moderate**: locations can adjust prices within ±X%, add local items (flagged as local), corporate items can't be removed
  - **flexible**: full menu control, but corporate "required" items can't be removed
- **Approval workflow**: if `requireApprovalForMenuChanges`, location changes go to pending → franchisor approves/rejects
- **Category-level sync**: sync specific categories instead of entire menu

### Step 4: Cross-Location Customer Unification

**Add to `MultiLocationService`:**
- `loadCrossLocationCustomers(groupId)` — GET `/location-groups/:groupId/customers`
- `mergeCrossLocationCustomers(groupId, customerIds)` — POST `/location-groups/:groupId/customers/merge`
- `getCustomerLocationHistory(groupId, customerId)` — GET `/location-groups/:groupId/customers/:id/locations`

**Add "Customers" tab (7th tab) to Multi-Location Dashboard:**
- Unified customer list across all group locations
- "Visits" column shows per-location breakdown
- Merge duplicates across locations
- Customer detail: combined order history from all locations, unified loyalty balance

### Step 5: Cross-Location Loyalty Pooling

**Add to `models/loyalty.model.ts`:**
```ts
// Add to LoyaltyConfig
crossLocationEnabled: boolean;      // Points earned at any group location
crossLocationGroupId: string | null;
```

**Add to `LoyaltyService`:**
- `enableCrossLocationLoyalty(groupId)` — POST `/loyalty/cross-location/enable`
- `getCrossLocationBalance(customerId, groupId)` — GET `/loyalty/cross-location/balance`

**Integrate:**
- When cross-location loyalty enabled: points query checks all restaurants in group
- Earn at location A → redeem at location B
- Transaction history shows which location earned/redeemed
- Loyalty settings: "Cross-Location" toggle in franchise config

---

## Phase 2 — Cross-Location Operations (Steps 6-10)

### Step 6: Cross-Location Staff Management

**Add "Staff" tab (6th tab) to Multi-Location Dashboard:**
- Unified staff directory across all group locations
- Filter by location, role, status
- Cross-location scheduling: view one employee's shifts across all locations
- "Transfer" action: reassign team member to different location
- Shared permission sets at group level

**Add to `MultiLocationService`:**
- `loadCrossLocationStaff(groupId)` — GET `/location-groups/:groupId/staff`
- `transferStaff(teamMemberId, fromRestaurantId, toRestaurantId)` — POST `/location-groups/:groupId/staff/transfer`

### Step 7: Cross-Location Inventory

**Add "Inventory" tab (8th tab) to Multi-Location Dashboard:**
- Group-level stock summary: item name, per-location quantities, total
- Low stock alerts across all locations
- Inter-location transfer: move stock from one location to another
- Centralized reorder recommendations: aggregate needs across locations for bulk ordering

**Add to `MultiLocationService`:**
- `loadCrossLocationInventory(groupId)` — GET `/location-groups/:groupId/inventory`
- `createInventoryTransfer(fromRestaurantId, toRestaurantId, items)` — POST `/location-groups/:groupId/inventory/transfer`
- `loadTransferHistory(groupId)` — GET `/location-groups/:groupId/inventory/transfers`

### Step 8: Extended Settings Propagation

**Extend `SettingsPropagation.settingType`:**
```ts
export type PropagationSettingType =
  | 'ai'
  | 'pricing'
  | 'loyalty'
  | 'delivery'
  | 'payment'
  | 'tip_management'      // NEW
  | 'stations'            // NEW
  | 'break_types'         // NEW
  | 'workweek'            // NEW
  | 'timeclock'           // NEW
  | 'auto_gratuity'       // NEW
  | 'business_hours';     // NEW
```

Update Settings tab to show all 12 propagation types.

### Step 9: Group-Level Marketing

**Extend `MarketingService` for cross-location campaigns:**
- `loadGroupCampaigns(groupId)` — GET `/location-groups/:groupId/campaigns`
- `createGroupCampaign(groupId, data)` — POST `/location-groups/:groupId/campaigns`
- `getGroupAudienceEstimate(groupId, audience)` — POST `/location-groups/:groupId/campaigns/audience-estimate`

**UI:**
- Campaign Builder: "All Locations" toggle → targets customers across group
- Per-location customization: same campaign template, location-specific details (address, hours)
- Group-level performance aggregation

### Step 10: Location Health Monitoring

**Add real-time health dashboard to Overview tab:**
- Per-location status indicators: online (green), degraded (amber), offline (red)
- Last heartbeat timestamp per location
- Active alerts per location (from MonitoringService)
- KDS status: orders in queue, overdue count
- Device status: online/offline device count per location
- Auto-refresh every 30 seconds

**Add to `MultiLocationService`:**
- `loadLocationHealth(groupId)` — GET `/location-groups/:groupId/health`

---

## Phase 3 — Benchmarking & Compliance (Steps 11-13)

### Step 11: Location Performance Benchmarking

**Enhance Overview tab:**
- Percentile rankings: each location ranked vs group average for each KPI
- Performance score: weighted composite score (revenue 30%, labor % 20%, food cost % 20%, customer satisfaction 15%, speed 15%)
- Trend arrows: improving/declining vs previous period
- "Needs Attention" flag for locations consistently below 25th percentile
- Best practice sharing: "Location X excels at labor management — apply their schedule template?"

### Step 12: Franchise Compliance Dashboard

**Add to Franchise tab:**
- Brand compliance checklist per location:
  - Menu compliance: required corporate items present and active
  - Pricing compliance: prices within allowed flex range
  - Settings compliance: required settings propagated and applied
  - Hours compliance: operating during required hours
- Compliance score per location (% of checklist items met)
- Non-compliant items flagged with corrective action suggestions
- Compliance history trend

### Step 13: Build Verification

- `ng build` both library and elements — zero errors
- Verify franchise config form saves royalty/fee settings
- Verify royalty report generates correct calculations
- Verify menu guardrails enforce control level restrictions
- Verify cross-location customer list shows unified records
- Verify cross-location loyalty allows earn at A / redeem at B
- Verify staff transfer moves team member between locations
- Verify inventory transfer records inter-location stock movement
- Verify location health dashboard shows real-time status

---

## Files Summary

### New Files
| File | Purpose |
|------|---------|
| (none — all changes extend existing files) | |

### Modified Files
| File | Changes |
|------|---------|
| `models/multi-location.model.ts` | FranchiseConfig, FranchiseRoyaltyReport, MultiLocationTab expanded to 8 tabs, PropagationSettingType expanded to 12 |
| `models/menu.model.ts` | isCorporateItem, corporateItemId, localPriceOverride, isLocalAddition, approvalStatus |
| `models/loyalty.model.ts` | crossLocationEnabled, crossLocationGroupId |
| `services/multi-location.ts` | Franchise config, royalty reports, cross-location customers/staff/inventory/health, inventory transfers, group campaigns |
| `services/loyalty.ts` | Cross-location loyalty balance, enable/disable |
| `services/marketing.ts` | Group-level campaign CRUD, audience estimate |
| `multi-location/multi-location-dashboard/` | 4 new tabs (Franchise, Staff, Customers, Inventory), health monitoring, benchmarking, compliance |
| `menu-mgmt/item-management/` | Corporate item badges, approval workflow indicators |
| `settings/loyalty-settings/` | Cross-location toggle |

---

## Verification

1. `ng build` both library and elements — zero errors
2. Franchise config form saves royalty type, rate, and menu control level
3. Royalty report shows per-location revenue and calculated fees
4. Menu guardrails enforce strict/moderate/flexible control levels
5. Cross-location customer list merges duplicate records
6. Cross-location loyalty points earned at location A, redeemable at location B
7. Staff transfer moves team member and updates assignedLocationIds
8. Inventory transfer records stock movement between locations
9. Location health dashboard shows real-time online/offline status
10. Compliance dashboard flags non-compliant locations with corrective actions
