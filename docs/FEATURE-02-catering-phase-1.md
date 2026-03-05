# FEATURE-02 — Catering Module (Phase 1: Standalone Event Management)
## Claude Code Implementation Prompt

---

## Overview

Build a standalone **Catering** module as a new top-level sidebar item in the
OrderStack admin layout. This is Phase 1: event management only — no order
integration, no deposits, no invoicing. Those are Phase 2 and 3.

The existing **Settings → Catering Calendar** section (capacity config +
monthly calendar) must be **migrated into** this new module and **permanently
removed from Settings** — delete it cleanly, no need to preserve the old code.

Default to Square's catering/events approach for all UX decisions.

---

## Pre-requisite: Platform Model & Service Changes

Before building any catering UI, make the following foundational changes.
These are required for the sidebar visibility condition and onboarding
integration to work correctly.

### A. Add `'catering'` to `PlatformModule` — `src/app/models/platform.model.ts`

1. Add `'catering'` to the `PlatformModule` type union:
```typescript
export type PlatformModule =
  | 'menu_management'
  | 'table_management'
  | 'kds'
  | 'bookings'
  | 'catering'           // ← ADD THIS
  | 'online_ordering'
  | 'inventory'
  | 'invoicing'
  | 'appointments'
  | 'marketing'
  | 'loyalty'
  | 'delivery'
  | 'gift_cards'
  | 'staff_scheduling'
  | 'payroll'
  | 'reports'
  | 'crm'
  | 'multi_location';
```

2. Add `'catering'` to the `food_and_drink` vertical's `enabledModules` array
   in `BUSINESS_VERTICAL_CATALOG`. This ensures all food_and_drink businesses
   get the catering module by default (the sidebar condition below will further
   restrict visibility to caterers specifically).

### B. Add `businessCategory` to `MerchantProfile` — `src/app/models/platform.model.ts`

Add an optional `businessCategory` field to the `MerchantProfile` interface:
```typescript
export interface MerchantProfile {
  // ... existing fields ...
  businessCategory?: string | null;   // ← ADD THIS (e.g. 'Caterer', 'Fine Dining')
}
```

### C. Add `businessCategory` to `OnboardingPayload` — `src/app/services/platform.ts`

Add `businessCategory` to the `OnboardingPayload` interface:
```typescript
export interface OnboardingPayload {
  // ... existing fields ...
  businessCategory: string | null;   // ← ADD THIS
}
```

### D. Pass `businessCategory` from the wizard — `src/app/features/onboarding/setup-wizard/setup-wizard.ts`

In `submitOnboarding()`, add the selected business type name to the payload:
```typescript
const payload: OnboardingPayload = {
  // ... existing fields ...
  businessCategory: this._selectedBusinessType()?.name ?? null,  // ← ADD THIS
};
```

### E. Persist `businessCategory` in `buildProfileFromPayload()` — `src/app/services/platform.ts`

In `buildProfileFromPayload()`, include `businessCategory` in the profile:
```typescript
const profile: MerchantProfile = {
  ...defaultMerchantProfile(),
  // ... existing fields ...
  businessCategory: payload.businessCategory ?? null,  // ← ADD THIS
};
```

### F. Expose `businessCategory` from `PlatformService` — `src/app/services/platform.ts`

Add a computed signal:
```typescript
readonly businessCategory = computed<string | null>(
  () => this._merchantProfile()?.businessCategory ?? null
);
```

---

## Supabase Tables

Use the Supabase MCP tool to create the following tables directly.

```sql
-- catering_events
create table if not exists catering_events (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id),
  title text not null,
  event_type text not null,
  status text not null default 'inquiry',
  event_date date not null,
  start_time text not null,
  end_time text not null,
  headcount integer not null,
  location_type text not null default 'on_site',
  location_address text,
  contact_name text not null,
  contact_phone text not null,
  contact_email text not null,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- catering_capacity_settings
create table if not exists catering_capacity_settings (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null unique references restaurants(id),
  max_events_per_day integer not null default 3,
  max_headcount_per_day integer not null default 200,
  conflict_alerts_enabled boolean not null default true,
  updated_at timestamptz default now()
);
```

Also add a `business_category` column to the `restaurants` table if it does
not already exist:
```sql
alter table restaurants
  add column if not exists business_category text;
```

---

## What to Build

### 1. Model — `src/app/models/catering.model.ts`

```typescript
export type CateringEventStatus =
  | 'inquiry'
  | 'proposal_sent'
  | 'confirmed'
  | 'completed'
  | 'cancelled';

export type CateringEventType =
  | 'corporate'
  | 'wedding'
  | 'birthday'
  | 'social'
  | 'fundraiser'
  | 'other';

export type CateringLocationType = 'on_site' | 'off_site';

export interface CateringEvent {
  id: string;
  restaurantId: string;
  title: string;
  eventType: CateringEventType;
  status: CateringEventStatus;
  eventDate: string;                  // ISO date string
  startTime: string;                  // "HH:mm"
  endTime: string;                    // "HH:mm"
  headcount: number;
  locationType: CateringLocationType;
  locationAddress?: string;           // required when off_site
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CateringCapacitySettings {
  maxEventsPerDay: number;
  maxHeadcountPerDay: number;
  conflictAlertsEnabled: boolean;
}
```

---

### 2. Service — `src/app/services/catering.service.ts`

Angular service using signals. Reads/writes to Supabase tables
`catering_events` and `catering_capacity_settings`.

Expose:
- `events = signal<CateringEvent[]>([])`
- `capacitySettings = signal<CateringCapacitySettings | null>(null)`
- `isLoading = signal(false)`
- `loadEvents(restaurantId: string): Promise<void>`
- `loadCapacitySettings(restaurantId: string): Promise<void>`
- `createEvent(data: Omit<CateringEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<CateringEvent>`
- `updateEvent(id: string, data: Partial<CateringEvent>): Promise<void>`
- `updateStatus(id: string, status: CateringEventStatus): Promise<void>`
- `deleteEvent(id: string): Promise<void>`
- `saveCapacitySettings(restaurantId: string, settings: CateringCapacitySettings): Promise<void>`

Computed helpers:
- `upcomingEvents` — eventDate >= today, sorted ascending
- `activeEvents` — status is inquiry | proposal_sent | confirmed
- `pastEvents` — eventDate < today OR status completed | cancelled
- `conflictDays` — dates where confirmed headcount exceeds maxHeadcountPerDay

---

### 3. Feature Directory — `src/app/features/catering/`

```
catering/
├── Claude.md
├── catering-dashboard/
│   ├── catering-dashboard.component.ts
│   └── catering-dashboard.component.html
├── catering-event-form/
│   ├── catering-event-form.component.ts
│   └── catering-event-form.component.html
├── catering-event-card/
│   ├── catering-event-card.component.ts
│   └── catering-event-card.component.html
└── catering-calendar/
    ├── catering-calendar.component.ts
    └── catering-calendar.component.html
```

---

### 4. CateringDashboard Component (`os-catering-dashboard`)

**Route:** `/app/catering` (lazy-loaded inside main layout)

**Header row:**
- Page title: "Catering"
- `+ New Event` button (top right, primary blue)

**Stats bar (4 cards):**
- UPCOMING EVENTS — count of upcomingEvents
- TOTAL HEADCOUNT — sum of headcount across confirmed upcoming events
- CONFLICT DAYS — count of conflictDays
- PENDING APPROVALS — count of events with status inquiry or proposal_sent

**Tab bar:** Active | Upcoming | Past | Calendar | Capacity

**Active tab** (default):
- Events with status: inquiry, proposal_sent, confirmed
- Sorted: confirmed first, then proposal_sent, then inquiry
- Renders `os-catering-event-card` for each

**Upcoming tab:**
- Events where eventDate >= today (except cancelled), sorted ascending

**Past tab:**
- Events where eventDate < today OR status completed/cancelled, sorted descending

**Calendar tab:**
- Migrated from Settings → Catering Calendar
- Monthly calendar view — days with events show dot indicators
- Clicking a day opens a panel listing events for that day
- Current day highlighted

**Capacity tab:**
- Migrated from Settings → Catering Calendar capacity section
- MAX EVENTS / DAY input
- MAX HEADCOUNT / DAY input
- Conflict Alerts toggle
- Save button → `saveCapacitySettings()`

**Empty states:** Each tab shows a relevant message + "Create Event" button.

---

### 5. CateringEventCard Component (`os-catering-event-card`)

Input: `event: CateringEvent`

Display:
- Event title (bold)
- Status badge (color-coded pill):
  - inquiry → gray
  - proposal_sent → yellow/warning
  - confirmed → green
  - completed → blue
  - cancelled → red/muted
- Event type badge (secondary pill)
- Date + time range (e.g. "Mar 15, 2026 · 6:00 PM – 10:00 PM")
- Headcount (icon + number)
- Location type chip: "On-Site" or "Off-Site"
- Contact name

Quick-action row:
- **Advance Status** button — label changes per current status:
  - inquiry → "Send Proposal"
  - proposal_sent → "Confirm Event"
  - confirmed → "Mark Complete"
  - completed → no button
- **Edit** button
- **Cancel** button (hidden when status is completed or cancelled)

---

### 6. CateringEventForm Component (`os-catering-event-form`)

Used for both create and edit. Match the slide-over or full-page form
pattern already used elsewhere in the app.

Fields:
- Event Title (text, required)
- Event Type (select: Corporate / Wedding / Birthday / Social / Fundraiser / Other)
- Status (select — all 5 statuses, required)
- Event Date (date picker, required)
- Start Time / End Time (time inputs, required)
- Headcount (number, required, min 1)
- Location Type (radio: On-Site / Off-Site)
- Location Address (text, visible only when Off-Site selected)
- Contact Name (text, required)
- Contact Phone (text, required)
- Contact Email (email, required)
- Notes (textarea, optional)

Show inline validation errors before save.

---

### 7. Routing — `app.routes.ts`

Add lazy-loaded route inside main layout children:

```typescript
{
  path: 'catering',
  loadComponent: () =>
    import('./features/catering/catering-dashboard/catering-dashboard.component')
      .then(m => m.CateringDashboardComponent),
}
```

---

### 8. Sidebar — `main-layout.component.ts`

Insert Catering **between Bookings and Settings**.

The sidebar condition uses the new `businessCategory` signal from
PlatformService (added in the pre-requisite section above):

```typescript
const isCaterer = this.platform.businessCategory() === 'Caterer';

if (isCaterer || hasModule(modules, 'catering')) {
  items.push({
    label: 'Catering',
    icon: 'bi-calendar2-event',
    route: '/app/catering',
  });
}
```

This means:
- A restaurant that selected "Caterer" during onboarding sees it automatically
- Any restaurant that manually has `'catering'` in their `enabledModules` also sees it
- All other business types do not see it

---

### 9. Settings — Remove Catering Calendar

In `src/app/features/settings/` (control panel component):
- Delete the "Catering Calendar" tab and all associated code permanently
- Capacity config and monthly calendar now live exclusively in the Catering module

---

### 10. Claude.md for the new feature

Create `src/app/features/catering/Claude.md`:

```markdown
# Catering

## Purpose
Standalone catering event management module. Handles the full lifecycle of
catering inquiries from first contact through event completion.

## Routes
- `/app/catering` — Dashboard (Active / Upcoming / Past / Calendar / Capacity tabs)

## Components
- **CateringDashboard** (`os-catering-dashboard`) — Main tabbed view
- **CateringEventCard** (`os-catering-event-card`) — Event card with status actions
- **CateringEventForm** (`os-catering-event-form`) — Create/edit form
- **CateringCalendar** (`os-catering-calendar`) — Monthly calendar (migrated from Settings)

## Services
- `CateringService` — CRUD events + capacity settings, signal-based state

## Models
- `catering.model` — CateringEvent, CateringCapacitySettings, enums

## Sidebar Visibility
Catering nav item shows when:
  platform.businessCategory() === 'Caterer'  OR  'catering' in enabledModules

## Onboarding Integration
- businessCategory is now stored on MerchantProfile and in Supabase restaurants table
- Selecting 'Caterer' in setup wizard sets businessCategory = 'Caterer'
- food_and_drink vertical now includes 'catering' in enabledModules

## Status Machine
inquiry → proposal_sent → confirmed → completed (or cancelled at any point)

## Phase 1 Scope
Event management only. Phase 2 adds order linkage + deposits.
Phase 3 adds invoicing + catering-specific menu pricing.
```

---

## Styling Notes

- Square-inspired design: clean cards, Bootstrap 5.3.8 utility classes
- Match card/badge patterns used in Orders and Bookings
- Status badge colors must use the existing badge palette — no new CSS variables
- `os-` prefix on all component selectors
- `ChangeDetectionStrategy.OnPush` on all components
- Standalone components only — no NgModules

---

## What NOT to Build in Phase 1

- No order creation from catering events
- No deposit tracking or payment
- No invoice / proposal PDF generation
- No catering-specific menu or per-person pricing
- No KDS integration
- No email notifications to clients

Those are Phase 2 and Phase 3.

---

## Test Cases (I will verify after deploy)

1. Catering nav item visible for a restaurant with businessCategory = 'Caterer'
2. Catering nav item NOT visible for Fine Dining, Bar, or other non-caterer types
3. `/app/catering` loads with 4 stats cards + 5 tabs
4. Active tab renders event cards correctly
5. Upcoming / Past / Calendar / Capacity tabs render without errors
6. "+ New Event" opens the event form
7. Creating an event saves to Supabase and appears in Active tab
8. Editing an event updates correctly in Supabase
9. "Send Proposal" advances inquiry → proposal_sent
10. "Confirm Event" advances proposal_sent → confirmed
11. "Mark Complete" advances confirmed → completed
12. Cancel sets status to cancelled
13. Calendar tab shows current month with dot indicators on event days
14. Clicking a day on the calendar shows events for that day
15. Capacity tab loads existing settings and saves changes to Supabase
16. Settings → Catering Calendar tab is gone
17. Stats bar counts update reactively when events change
18. New onboarding: selecting "Caterer" sets businessCategory on the profile
19. After onboarding as Caterer, Catering nav item is visible immediately
20. Existing restaurant with businessCategory = 'Caterer' sees Catering after
    profile is reloaded
