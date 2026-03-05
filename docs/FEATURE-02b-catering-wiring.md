# FEATURE-02b — Catering Module: Wiring
## Claude Code Prompt 2 of 3

---

## Prerequisite

Prompt 1 (FEATURE-02a) must be complete:
- Prisma migration ran successfully (`catering_events` and
  `catering_capacity_settings` tables exist, `business_category` column
  added to `restaurants`)
- `PlatformModule` includes `'catering'`
- `MerchantProfile` has `businessCategory`
- `PlatformService` exposes `businessCategory` computed signal
- `ng build` is clean

---

## Objective

Add the backend API routes, the Angular catering model and service, wire
up the route and sidebar item, clean up Settings, and create the Claude.md.
End with a clean `ng build` and `/app/catering` loading a placeholder
without errors.

---

## Step 1 — Backend: `catering.routes.ts`

Create `Get-Order-Stack-Restaurant-Backend/src/app/catering.routes.ts`.

Follow the exact pattern of `invoice.routes.ts` or `marketing.routes.ts` —
use the Prisma client directly, `requireAuth` is applied at the `app.ts`
level so do not apply it inside the routes file.

### Routes to implement

```
GET    /api/merchant/:merchantId/catering/events
POST   /api/merchant/:merchantId/catering/events
GET    /api/merchant/:merchantId/catering/events/:id
PATCH  /api/merchant/:merchantId/catering/events/:id
DELETE /api/merchant/:merchantId/catering/events/:id

GET    /api/merchant/:merchantId/catering/capacity
PUT    /api/merchant/:merchantId/catering/capacity
```

### Implementation notes

- All event endpoints filter by `restaurantId = merchantId`
- GET /events: return all events sorted by `eventDate` ascending
- GET /events/:id: 404 if not found or wrong restaurantId
- POST /events: create with all required fields; `status` defaults to `'inquiry'`
- PATCH /events/:id: partial update; always set `updatedAt = new Date()`
- DELETE /events/:id: hard delete
- GET /capacity: return existing settings or return defaults
  `{ maxEventsPerDay: 3, maxHeadcountPerDay: 200, conflictAlertsEnabled: true }`
  if none exist yet
- PUT /capacity: upsert using `restaurantId` as unique key (`upsert` with
  `create` + `update`)

Response shape for events matches the `CateringEvent` interface in the
Angular model (camelCase). Use Prisma's field names directly — they already
match camelCase.

---

## Step 2 — Register in `app.ts`

In `Get-Order-Stack-Restaurant-Backend/src/app/app.ts`:

1. Import the new routes:
```typescript
import cateringRoutes from './catering.routes';
```

2. Register alongside the other authenticated merchant routes (add after
   `retailRoutes`):
```typescript
app.use('/api/merchant', requireAuth, cateringRoutes);
```

---

## Step 3 — Angular model: `src/app/models/catering.model.ts`

Create this file:

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
  eventDate: string;          // ISO date string
  startTime: string;          // "HH:mm"
  endTime: string;            // "HH:mm"
  headcount: number;
  locationType: CateringLocationType;
  locationAddress?: string;
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

Export from `src/app/models/index.ts`.

---

## Step 4 — Angular service: `src/app/services/catering.service.ts`

Use `HttpClient` + `environment.apiUrl` — same pattern as `BookingService`
and `InvoiceService`. Do not use Supabase directly.

```typescript
@Injectable({ providedIn: 'root' })
export class CateringService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  private get restaurantId(): string {
    return this.authService.selectedMerchantId() ?? '';
  }

  private readonly _events = signal<CateringEvent[]>([]);
  private readonly _capacitySettings = signal<CateringCapacitySettings | null>(null);
  readonly isLoading = signal(false);

  readonly events = this._events.asReadonly();
  readonly capacitySettings = this._capacitySettings.asReadonly();

  readonly activeEvents = computed(() =>
    this._events().filter(e =>
      e.status === 'inquiry' || e.status === 'proposal_sent' || e.status === 'confirmed'
    ).sort((a, b) => {
      const order: Record<CateringEventStatus, number> = {
        confirmed: 0, proposal_sent: 1, inquiry: 2, completed: 3, cancelled: 4
      };
      return order[a.status] - order[b.status];
    })
  );

  readonly upcomingEvents = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this._events()
      .filter(e => e.eventDate >= today && e.status !== 'cancelled')
      .sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  });

  readonly pastEvents = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this._events()
      .filter(e => e.eventDate < today || e.status === 'completed' || e.status === 'cancelled')
      .sort((a, b) => b.eventDate.localeCompare(a.eventDate));
  });

  readonly conflictDays = computed(() => {
    const settings = this._capacitySettings();
    if (!settings) return [];
    const confirmed = this._events().filter(e => e.status === 'confirmed');
    const byDate: Record<string, number> = {};
    for (const e of confirmed) {
      byDate[e.eventDate] = (byDate[e.eventDate] ?? 0) + e.headcount;
    }
    return Object.entries(byDate)
      .filter(([, total]) => total > settings.maxHeadcountPerDay)
      .map(([date]) => date);
  });
}
```

Methods (use `firstValueFrom` + `HttpClient` like other services):
- `loadEvents(): Promise<void>` — GET `/api/merchant/:id/catering/events`
- `loadCapacitySettings(): Promise<void>` — GET `/api/merchant/:id/catering/capacity`
- `createEvent(data: Omit<CateringEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<CateringEvent | null>`
- `updateEvent(id: string, data: Partial<CateringEvent>): Promise<void>`
- `updateStatus(id: string, status: CateringEventStatus): Promise<void>` — PATCH with `{ status }`
- `deleteEvent(id: string): Promise<void>`
- `saveCapacitySettings(settings: CateringCapacitySettings): Promise<void>` — PUT

On success of any mutating method, reload events or update the signal in place.

---

## Step 5 — Angular route: `src/app/app.routes.ts`

Add the catering route inside the main layout children, between `bookings`
and `settings`:

```typescript
{
  path: 'catering',
  loadComponent: () =>
    import('./features/catering/catering-dashboard/catering-dashboard.component')
      .then(m => m.CateringDashboardComponent),
},
```

---

## Step 6 — Sidebar: `main-layout.component.ts`

Inject `PlatformService`. In the nav items computed, insert the Catering
item between Bookings and Settings:

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

---

## Step 7 — Settings cleanup

In `src/app/features/settings/` find and permanently delete:
- The "Catering Calendar" tab from the tab bar
- All associated template blocks, component logic, and child component files
  dedicated to that tab

No commented-out code. The capacity config and monthly calendar now live
exclusively in the Catering module (built in Prompt 3).

---

## Step 8 — Placeholder component

Create a minimal `CateringDashboardComponent` at:
`src/app/features/catering/catering-dashboard/catering-dashboard.component.ts`

```typescript
@Component({
  selector: 'os-catering-dashboard',
  standalone: true,
  template: `<div class="p-4"><h1>Catering</h1><p>Coming soon.</p></div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CateringDashboardComponent {}
```

This will be replaced entirely in Prompt 3.

---

## Step 9 — Claude.md

Create `src/app/features/catering/Claude.md`:

```markdown
# Catering

## Purpose
Standalone catering event management module. Manages the full lifecycle
from inquiry through event completion.

## API Base
GET/POST /api/merchant/:id/catering/events
PATCH/DELETE /api/merchant/:id/catering/events/:eventId
GET/PUT /api/merchant/:id/catering/capacity

## Routes
- /app/catering — CateringDashboard (5 tabs)

## Components
- CateringDashboard (os-catering-dashboard)
- CateringEventCard (os-catering-event-card)
- CateringEventForm (os-catering-event-form)
- CateringCalendar (os-catering-calendar)

## Service
CateringService — HttpClient-based, signal state

## Sidebar visibility
platform.businessCategory() === 'Caterer' OR 'catering' in enabledModules

## Status flow
inquiry → proposal_sent → confirmed → completed (cancelled at any point)

## Phase 1 scope
Event management only. No orders, deposits, or invoicing yet.
```

---

## Step 10 — Verify

```bash
ng build
```

Zero TypeScript errors. Then confirm:
- `/app/catering` loads the placeholder without console errors
- "Catering" appears in the sidebar for a Caterer account
- Settings no longer shows Catering Calendar tab
