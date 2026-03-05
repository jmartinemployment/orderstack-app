# FEATURE-02c — Catering Module: UI Components
## Claude Code Prompt 3 of 3

---

## Prerequisite

Prompts 1 and 2 (FEATURE-02a and FEATURE-02b) must be complete:
- Supabase tables exist
- `CateringService` is wired up
- Route `/app/catering` loads the placeholder component
- Sidebar item is visible for Caterer accounts

---

## Objective

Replace the placeholder `CateringDashboardComponent` with the full UI.
Build all four components. End with a fully functional Catering module
that passes all test cases listed at the bottom of this prompt.

---

## Component 1 — CateringDashboard (`os-catering-dashboard`)

Replace the placeholder at:
`src/app/features/catering/catering-dashboard/catering-dashboard.component.ts`

### Layout

**Header row:**
- Page title: "Catering"
- `+ New Event` button (top right, primary blue) — opens `CateringEventForm`
  in create mode

**Stats bar (4 cards, same pattern as Bookings dashboard):**
- UPCOMING EVENTS — `cateringService.upcomingEvents().length`
- TOTAL HEADCOUNT — sum of headcount on confirmed upcoming events
- CONFLICT DAYS — `cateringService.conflictDays().length`
- PENDING APPROVALS — count of events with status `inquiry` or `proposal_sent`

**Tab bar:** Active | Upcoming | Past | Calendar | Capacity

### Active tab (default)
- Renders `os-catering-event-card` for each event in `cateringService.activeEvents()`
- Empty state: "No active events" + "Create Event" button

### Upcoming tab
- Renders `os-catering-event-card` for each event in `cateringService.upcomingEvents()`
- Empty state: "No upcoming events" + "Create Event" button

### Past tab
- Renders `os-catering-event-card` for each event in `cateringService.pastEvents()`
- Empty state: "No past events yet"

### Calendar tab
- Renders `os-catering-calendar`

### Capacity tab
- MAX EVENTS / DAY — number input, bound to local signal
- MAX HEADCOUNT / DAY — number input, bound to local signal
- Conflict Alerts — toggle, bound to local signal
- Save button → calls `cateringService.saveCapacitySettings()`
- Loads existing settings on tab open via `cateringService.loadCapacitySettings()`

### Lifecycle
On init: call `cateringService.loadEvents(restaurantId)` and
`cateringService.loadCapacitySettings(restaurantId)`.
Get `restaurantId` from `AuthService.selectedMerchantId()`.

---

## Component 2 — CateringEventCard (`os-catering-event-card`)

File: `src/app/features/catering/catering-event-card/catering-event-card.component.ts`

### Inputs
```typescript
@Input({ required: true }) event!: CateringEvent;
```

### Outputs
```typescript
@Output() statusAdvanced = new EventEmitter<{ id: string; status: CateringEventStatus }>();
@Output() editRequested = new EventEmitter<CateringEvent>();
@Output() cancelRequested = new EventEmitter<string>(); // event id
```

### Display

Top row:
- Event title (bold, larger text)
- Status badge (pill, color-coded):
  - `inquiry` → gray (`bg-secondary`)
  - `proposal_sent` → yellow (`bg-warning text-dark`)
  - `confirmed` → green (`bg-success`)
  - `completed` → blue (`bg-primary`)
  - `cancelled` → muted red (`bg-danger`)
- Event type badge (secondary, smaller pill)

Detail row:
- `bi-calendar3` icon + formatted date (e.g. "Sat Mar 15, 2026")
- `bi-clock` icon + time range (e.g. "6:00 PM – 10:00 PM")
- `bi-people` icon + headcount
- Location chip: "On-Site" or "Off-Site" (outline pill)
- `bi-person` icon + contact name

Action row (bottom):
- **Advance Status** button (outline primary):
  - `inquiry` → label "Send Proposal"
  - `proposal_sent` → label "Confirm Event"
  - `confirmed` → label "Mark Complete"
  - `completed` → no button rendered
- **Edit** button (outline secondary) — emits `editRequested`
- **Cancel** button (outline danger, text only) — hidden when status is
  `completed` or `cancelled` — emits `cancelRequested`

---

## Component 3 — CateringEventForm (`os-catering-event-form`)

File: `src/app/features/catering/catering-event-form/catering-event-form.component.ts`

Opens as an offcanvas panel (Bootstrap `offcanvas`) sliding in from the
right — matching the pattern used in other forms in the app.

### Inputs
```typescript
@Input() event: CateringEvent | null = null; // null = create mode
@Input() visible = false;
```

### Outputs
```typescript
@Output() saved = new EventEmitter<void>();
@Output() cancelled = new EventEmitter<void>();
```

### Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| Event Title | text | yes | |
| Event Type | select | yes | Corporate / Wedding / Birthday / Social / Fundraiser / Other |
| Status | select | yes | All 5 statuses |
| Event Date | date | yes | |
| Start Time | time | yes | |
| End Time | time | yes | |
| Headcount | number | yes | min 1 |
| Location Type | radio | yes | On-Site / Off-Site |
| Location Address | text | conditional | shown + required only when Off-Site |
| Contact Name | text | yes | |
| Contact Phone | text | yes | |
| Contact Email | email | yes | |
| Notes | textarea | no | |

### Behavior
- In create mode (event = null): all fields start empty, status defaults to `inquiry`
- In edit mode: fields pre-populated from the event input
- Show inline validation errors on attempted save
- On save: call `cateringService.createEvent()` or `cateringService.updateEvent()`
  then emit `saved`
- On cancel/close: emit `cancelled`

---

## Component 4 — CateringCalendar (`os-catering-calendar`)

File: `src/app/features/catering/catering-calendar/catering-calendar.component.ts`

### Display
- Monthly calendar grid (Sun–Sat header)
- Prev / Next month navigation
- Current day highlighted (light blue background)
- Days that have catering events show a small colored dot indicator below
  the date number:
  - confirmed event → green dot
  - inquiry or proposal_sent → yellow dot
  - multiple events → show count badge instead of dot

### Day click
Clicking a day that has events opens a small inline panel below the
calendar row (or a Bootstrap popover) listing:
- Each event's title, status badge, and headcount for that day

### Input
Reads directly from `CateringService.events()` — no separate input needed.

---

## Wiring the form into the dashboard

In `CateringDashboardComponent`:
- Add `showForm = signal(false)` and `editingEvent = signal<CateringEvent | null>(null)`
- `+ New Event` button sets `editingEvent(null)` and `showForm(true)`
- `editRequested` from event card sets `editingEvent(event)` and `showForm(true)`
- `cancelRequested` from event card calls `cateringService.updateStatus(id, 'cancelled')`
- Form `saved` event closes form and reloads events
- Form `cancelled` event closes form

---

## Styling Notes

- Bootstrap 5.3.8 utility classes throughout
- Match the card style used in `os-booking` and the Orders pending cards
- Status badge colors must use existing Bootstrap contextual classes only —
  no new CSS variables
- `os-` prefix on all selectors
- `ChangeDetectionStrategy.OnPush` on all components
- Standalone components only

---

## Test Cases

1. `/app/catering` loads with 4 stats cards and 5 tabs
2. Active tab shows event cards (empty state when no events)
3. Upcoming / Past / Calendar / Capacity tabs all render without errors
4. "+ New Event" opens the offcanvas form
5. Creating an event saves to Supabase and appears in Active tab immediately
6. Editing an event pre-populates the form and updates correctly
7. "Send Proposal" advances inquiry → proposal_sent on the card
8. "Confirm Event" advances proposal_sent → confirmed
9. "Mark Complete" advances confirmed → completed
10. Cancel button sets status to cancelled; card disappears from Active tab
11. Calendar tab shows current month; days with events have dot indicators
12. Clicking an event day on the calendar shows event details
13. Capacity tab loads current settings; saving updates Supabase
14. Stats bar counts reflect live data (update after status changes)
15. Conflict days count increases when headcount exceeds daily max
