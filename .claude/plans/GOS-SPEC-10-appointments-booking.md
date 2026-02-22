# GOS-SPEC-10: Appointments & Booking — Square Parity Enhancements

## Context

Square Appointments provides online booking with the Square Assistant AI (automated SMS responses for scheduling), waitlist management with 5 availability preferences, no-show protection (deposits/prepayment/cancellation fees), recurring appointments, multi-staff scheduling with resource allocation, Google Calendar sync, intake forms/digital contracts/waivers, and class/group booking. OrderStack's current reservation system handles basic restaurant booking — reservation CRUD with 6 status states, waitlist with notify/seat/reorder, walk-in form, and table assignment — but lacks several advanced booking features that restaurants increasingly need for private events, cooking classes, and catering.

**Key gaps identified:**
- No **online booking widget** — reservations only created by staff, no customer-facing booking page
- No **confirmation/reminder SMS/email** — `confirmationSent`/`reminderSent` fields exist but no sending mechanism
- No **capacity enforcement** — any date/time accepted, no covers-per-timeslot tracking
- No **time slot availability checking** — booking form accepts any time with no conflict detection
- No **recurring reservations** — no repeat booking for regular guests
- No **deposit/prepayment** for large parties or private events
- No **timeline view** — `ReservationViewMode` includes 'timeline' but only list view built
- No **floor plan integration** — table assignment is text field, not visual picker from FloorPlan
- No **class/event booking** — system only handles covers-based reservations
- No **intake forms** — no custom questions for event bookings
- **Avg table turn hardcoded** at 45 minutes — ignores historical data
- No **guest preferences** linked to customer profile

**Existing assets:**
- `models/reservation.model.ts` — Reservation (13 fields), ReservationStatus (6 states), WaitlistEntry (12 fields), WaitlistStatus (5 states)
- `services/reservation.ts` — ReservationService with 11 methods (CRUD + waitlist)
- `reservations/reservation-manager/` — 4 tabs (Today/Upcoming/Past/Waitlist), booking form, status actions, KPI strip
- `table-mgmt/floor-plan/` — visual table canvas with drag-drop, status colors, QR codes
- `services/table.ts` — TableService with CRUD + status updates
- `models/settings.model.ts` — CateringCapacitySettings (maxEventsPerDay, maxHeadcountPerDay)

---

## Mode Awareness (GOS-SPEC-01 Alignment)

Appointments and booking is primarily a **services-vertical feature**, but restaurants also use reservations and event booking. The `appointments` and `reservations` platform modules serve different verticals with overlapping infrastructure.

### Vertical Applicability

| Vertical | Module | Booking Concept | Notes |
|---|---|---|---|
| `food_and_drink` | `reservations` | Table reservations, waitlist, events/classes | Reservation = covers for a time slot at a table |
| `beauty_wellness` | `appointments` | Service appointments | Appointment = provider + service + duration + client |
| `healthcare` | `appointments` | Patient appointments | Same as beauty — provider-based scheduling |
| `sports_fitness` | `appointments` | Class bookings, personal training | Class = group event with capacity; PT = 1:1 appointment |
| `retail` | — | Not applicable | Retail doesn't use appointments (could add `appointments` for personal shopping, but not default) |
| `professional_services` | `appointments` (optional) | Client meetings | Optional — many use external calendars |

### Two Booking Systems, Shared Infrastructure

This spec covers **two parallel systems** that share models and UI patterns:

1. **Reservations** (`food_and_drink` vertical) — table-based, covers-based capacity, floor plan integration, dining-specific
2. **Appointments** (services verticals) — provider-based, service-duration-based capacity, no floor plan

**Shared infrastructure (both systems):**
- Online booking widget (customer-facing)
- Capacity & time slot management
- Confirmation & reminder automation
- No-show protection (deposits, cancellation fees)
- Recurring bookings
- Intake forms
- Calendar sync (Google Calendar)

**Reservation-only features:**
- Floor plan integration for table assignment (requires `enableFloorPlan`)
- Section-based capacity (main dining, patio, bar seating)
- Table turn time calculation
- Guest preferences (seating preference, high chairs)
- Waitlist with estimated wait (requires `enableWaitlist`)
- Timeline view with tables on Y-axis

**Appointment-only features:**
- Provider assignment (which staff member performs the service)
- Service duration determines slot length (not a fixed turn time)
- Provider availability calendar (integrates with staff scheduling — GOS-SPEC-08)
- Resource allocation (rooms, equipment, chairs)
- No table/floor plan concepts

### Feature Flag Gating

| Feature | Required Flag / Module | Enabled Modes |
|---|---|---|
| Table reservations | `reservations` module | Full Service (primary), Bar (limited — bar seating only) |
| Waitlist | `enableWaitlist` | Full Service, Bookings |
| Floor plan table picker | `enableFloorPlan` | Full Service only |
| Timeline view (tables × time) | `enableFloorPlan` + `enableTableManagement` | Full Service only |
| Appointment booking | `appointments` module | Bookings, Services |
| Online booking widget | `reservations` or `appointments` module | All modes with either module |
| Event/class booking | `reservations` or `appointments` module | All modes with either module |
| Confirmation/reminder SMS | Universal | All modes with booking |
| Deposit/no-show protection | Universal | All modes with booking |
| Recurring bookings | Universal | All modes with booking |
| Calendar sync | Universal | All modes with booking |

### Booking Widget Adaptation

The `<get-order-stack-booking>` custom element adapts its UI based on vertical:

**`food_and_drink` (Reservation mode):**
- Party size selector, date picker, time slot grid
- Seating preference (indoor/outdoor/bar/private)
- Special occasion selector (birthday, anniversary, business)
- Dietary restrictions checklist

**Services verticals (Appointment mode):**
- Service selector (from menu items where `durationMinutes` is set)
- Provider selector (staff members qualified for selected service)
- Date picker filtered by provider availability
- Duration auto-calculated from service
- Intake form (if configured for the service)

### Model Unification Strategy

The `Reservation` and `EventBooking` interfaces defined in this spec are **restaurant-first** but designed for extension:
- `Reservation` works for table reservations. For appointments, a parallel `Appointment` interface extends the same patterns (time slot, capacity, customer, confirmation, deposit) with provider-specific fields.
- `EventBooking` is universal — cooking classes (restaurant), group fitness classes (gym), workshops (services) all use the same structure.
- `BookingType` union (`'reservation' | 'event' | 'class'`) extends to `'appointment'` for services verticals.

### Reservation Manager vs Appointment Manager

The `reservation-manager` component adapts its tab structure:
- **`food_and_drink`**: Today, Upcoming, Past, Waitlist, Events (5 tabs) — table-centric
- **Services verticals**: Today, Upcoming, Past, Events (4 tabs) — provider-centric, no waitlist tab unless `enableWaitlist` is on

Both share the same component shell; content adapts based on `PlatformService.merchantProfile.primaryVertical`.

---

## Phase 1 — Online Booking + Capacity (Steps 1-5)

### Step 1: Online Booking Widget

**New: `reservations/booking-widget/` (4 files)**

Customer-facing reservation booking page:
- Embedded via `<get-order-stack-booking>` custom element with `restaurant-slug` attribute
- Date picker (calendar view, today + 60 days)
- Party size selector (1-20+)
- Available time slots grid (based on capacity — see Step 2)
- Guest info form: name, phone, email
- Special requests text field
- Dietary restrictions / allergen checklist
- Confirmation page with "Add to Calendar" button (generates .ics file)
- Register as `get-order-stack-booking` custom element

### Step 2: Capacity & Time Slot Management

**Add to `models/reservation.model.ts`:**
```ts
export interface ReservationCapacity {
  restaurantId: string;
  maxCoversPerSlot: number;      // Max diners per 15-min slot
  slotDurationMinutes: number;   // Default 15
  defaultTurnTimeMinutes: number; // Default 90 for dinner, 60 for lunch
  bufferMinutes: number;          // Gap between seatings (default 15)
  acceptablePartySize: { min: number; max: number };
}

export interface TimeSlot {
  time: string;                  // 'HH:mm'
  availableCovers: number;
  totalCovers: number;
  isAvailable: boolean;
}

export interface DayAvailability {
  date: string;
  slots: TimeSlot[];
  isFullyBooked: boolean;
  totalReservations: number;
  totalCovers: number;
}
```

**Add to `ReservationService`:**
- `getAvailability(restaurantId, date, partySize)` — GET `/reservations/availability?date=...&partySize=...`
- `getCapacityConfig()` — GET `/reservations/capacity-config`
- `updateCapacityConfig(data)` — PATCH `/reservations/capacity-config`
- `getDayAvailability(date)` — GET `/reservations/day-availability?date=...`

**Integrate:**
- Booking widget shows only available slots
- Reservation Manager: visual timeline showing capacity utilization per hour
- Overbooking protection: reject bookings that exceed slot capacity

### Step 3: Confirmation & Reminder Automation

**Add to `ReservationService`:**
- `sendConfirmation(reservationId)` — POST `/reservations/:id/confirm-send` (SMS + email)
- `sendReminder(reservationId)` — POST `/reservations/:id/remind` (triggered by backend cron)
- `configureReminders(config)` — PATCH `/reservations/reminder-config`

**Add to `models/reservation.model.ts`:**
```ts
export interface ReminderConfig {
  confirmationEnabled: boolean;
  confirmationChannel: 'sms' | 'email' | 'both';
  reminderEnabled: boolean;
  reminderHoursBefore: number[];   // e.g. [24, 2] — 24h and 2h before
  reminderChannel: 'sms' | 'email' | 'both';
  includeModifyLink: boolean;      // Link to modify/cancel reservation
  includePrepaymentLink: boolean;
}
```

**Integrate:**
- Auto-send confirmation on reservation creation
- Backend cron triggers reminders at configured intervals
- Reminder includes "Confirm / Modify / Cancel" links
- Reservation Manager: "Resend Confirmation" / "Send Reminder" manual buttons

### Step 4: No-Show Protection (Deposits & Fees)

**Add to `models/reservation.model.ts`:**
```ts
export interface NoShowPolicy {
  depositRequired: boolean;
  depositType: 'flat' | 'per_person';
  depositAmount: number;          // $ flat or $ per person
  depositMinPartySize: number;    // Only require for parties >= X
  cancellationFeeEnabled: boolean;
  cancellationFeeAmount: number;
  cancellationCutoffHours: number; // Must cancel X hours before to avoid fee
  noShowFeeEnabled: boolean;
  noShowFeeAmount: number;
}

// Add to Reservation
depositPaid: boolean;
depositAmount: number;
depositPaymentId: string | null;
cancellationFee: number | null;
```

**Integrate:**
- Booking widget: if deposit required for party size, show Stripe/PayPal payment form
- Reservation Manager: deposit badge on reservation cards, refund deposit button
- Cancellation: auto-charge fee if within cutoff window
- No-show marking: auto-charge no-show fee

### Step 5: Floor Plan Integration for Table Assignment

**Enhance Reservation Manager:**
- Replace text-based table number field with visual FloorPlan selector
- When assigning table: open mini floor plan overlay showing available tables for the time slot
- Table capacity validation (don't assign 6-top party to 2-top table)
- Auto-suggest best table based on party size and section preference
- Hover on reservation → highlight assigned table on floor plan

**Changes:**
- `reservation-manager.ts` — import FloorPlan (or embed simplified version), add `_showTablePicker` signal
- `reservation-manager.html` — table picker modal with FloorPlan canvas
- `services/reservation.ts` — `suggestTable(date, time, partySize)` method

---

## Phase 2 — Advanced Booking Features (Steps 6-10)

### Step 6: Timeline View

**Build the declared but unimplemented timeline view:**
- Horizontal time axis (business hours, 15-min increments)
- Vertical axis: tables (sorted by section → capacity)
- Reservation blocks as colored bars (by party size or status)
- Drag to reschedule (change time), resize to adjust duration
- Click to open reservation detail
- Current time indicator line
- Capacity heat strip at top showing utilization per hour

### Step 7: Recurring Reservations

**Add to `models/reservation.model.ts`:**
```ts
export type RecurrencePattern = 'weekly' | 'biweekly' | 'monthly' | 'first_weekday' | 'last_weekday';

export interface RecurringReservation {
  id: string;
  restaurantId: string;
  pattern: RecurrencePattern;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  startDate: string;
  endDate: string | null;        // null = no end
  baseReservation: Partial<Reservation>;  // Template data
  generatedReservationIds: string[];
  isActive: boolean;
}
```

**Add to `ReservationService`:**
- `createRecurring(data)` — POST `/reservations/recurring`
- `updateRecurring(id, data)` — PATCH `/reservations/recurring/:id` (update future instances)
- `cancelRecurring(id)` — DELETE `/reservations/recurring/:id`
- `loadRecurring()` — GET `/reservations/recurring`

**UI in Reservation Manager:**
- "Make Recurring" option in booking form
- Recurring icon badge on reservation cards
- "Edit Series" / "Edit This Only" options
- Recurring reservations list in settings/management section

### Step 8: Event & Class Booking

**Add to `models/reservation.model.ts`:**
```ts
export type BookingType = 'reservation' | 'event' | 'class';

export interface EventBooking {
  id: string;
  restaurantId: string;
  bookingType: BookingType;
  title: string;                  // e.g. 'Wine Tasting', 'Cooking Class'
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  maxAttendees: number;
  currentAttendees: number;
  pricePerPerson: number;
  requiresPrepayment: boolean;
  intakeFormId: string | null;
  isPublished: boolean;
  attendees: EventAttendee[];
}

export interface EventAttendee {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  ticketCount: number;
  paymentStatus: 'paid' | 'pending' | 'refunded';
  intakeFormData: Record<string, string> | null;
}

export interface IntakeForm {
  id: string;
  restaurantId: string;
  name: string;
  fields: IntakeFormField[];
}

export interface IntakeFormField {
  id: string;
  label: string;
  type: 'text' | 'select' | 'checkbox' | 'textarea';
  options: string[] | null;
  isRequired: boolean;
}
```

**UI:**
- New "Events" tab in Reservation Manager
- Event creation form: title, description, date/time, capacity, price, intake form
- Event list with attendee count, revenue, published toggle
- Public booking page for events (customer-facing, linked from online portal)
- Attendee management: check-in, refund, send reminder

### Step 9: Dynamic Table Turn Times

**Replace hardcoded 45-minute turn time:**
- Calculate historical average turn time from completed reservations (seated → completed timestamps)
- Segment by: party size (1-2 = 45min, 3-4 = 60min, 5-6 = 75min, 7+ = 90min), meal period (lunch shorter, dinner longer), day of week
- Use for waitlist estimate calculation
- Use for capacity slot availability calculation
- Display in Reservation Manager: "Avg turn: Xmin" KPI

**Add to `ReservationService`:**
- `getTurnTimeStats()` — GET `/reservations/turn-time-stats`

### Step 10: Guest Preferences & Customer Linkage

**Enhance reservation with customer profile:**
- When phone number entered in booking form, auto-lookup customer
- Pre-fill name, email from customer record
- Display: loyalty tier badge, dietary restrictions, notes, visit count
- Add `preferences` field to Reservation:

```ts
export interface GuestPreferences {
  seatingPreference: 'indoor' | 'outdoor' | 'bar' | 'private' | 'no_preference';
  highChairsNeeded: number;
  wheelchairAccessible: boolean;
  dietaryRestrictions: string[];
  celebration: string | null;    // 'birthday', 'anniversary', 'business', etc.
  notes: string | null;
}
```

**Integrate:**
- Booking widget: preference form fields
- Reservation Manager: preferences visible on reservation card and detail view
- Host stand view: preferences highlighted for seating decisions

---

## Phase 3 — Integration & Advanced (Steps 11-13)

### Step 11: Calendar Sync

**Add Google Calendar integration:**
- OAuth2 flow to connect Google Calendar
- Push reservations as calendar events (with guest name, party size, table)
- Pull calendar blocks as unavailable times (owner's personal calendar)
- Two-way sync: changes in Google Calendar update reservation times

### Step 12: Waitlist Enhancements

**Improve existing waitlist:**
- SMS notification when table is ready (requires SMS provider)
- "On My Way" response from guest (via SMS reply or link)
- Estimated wait recalculation as tables turn over
- Waitlist analytics: avg wait time by day/hour, no-show rate from waitlist
- Virtual waitlist: guests can join from their phone via QR code or link (no staff needed)

### Step 13: Build Verification

- `ng build` both library and elements — zero errors
- Verify booking widget renders and shows available time slots
- Verify capacity enforcement blocks overbooking
- Verify confirmation SMS/email sends on reservation creation
- Verify deposit payment flow works for large parties
- Verify floor plan table picker shows in reservation form
- Verify timeline view renders reservation blocks on time axis
- Verify event booking with attendee management works

---

## Files Summary

### New Files
| File | Purpose |
|------|---------|
| `reservations/booking-widget/` (4 files) | Customer-facing online booking |

### Modified Files
| File | Changes |
|------|---------|
| `models/reservation.model.ts` | ReservationCapacity, TimeSlot, DayAvailability, ReminderConfig, NoShowPolicy, RecurringReservation, EventBooking, IntakeForm, GuestPreferences |
| `services/reservation.ts` | Availability, capacity config, confirmations, reminders, recurring, events, turn times, guest preferences |
| `reservations/reservation-manager/` | Timeline view, floor plan picker, capacity display, recurring UI, events tab, preferences panel |
| `table-mgmt/floor-plan/` | Mini floor plan for table selection modal |
| `public-api.ts` | Add BookingWidget export |
| `elements/src/main.ts` | Register `get-order-stack-booking` |

---

## Verification

1. `ng build` both library and elements — zero errors
2. Booking widget shows available time slots based on capacity
3. Overbooking protection rejects excess reservations
4. Confirmation sends on creation, reminders send before reservation time
5. Deposit required for large parties, collected via payment form
6. Floor plan table picker shows available tables visually
7. Timeline view renders reservation blocks with drag-to-reschedule
8. Recurring reservation creates future instances
9. Event booking tracks attendees with check-in and payment
10. Dynamic turn time replaces hardcoded 45-minute estimate
