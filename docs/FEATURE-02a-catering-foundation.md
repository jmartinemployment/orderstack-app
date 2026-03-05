# FEATURE-02a — Catering Module: Foundation
## Claude Code Prompt 1 of 3

---

## Objective

Create the two new database tables via Supabase MCP, update the Prisma
schema so the client has TypeScript types, and make the foundational
Angular model/service changes. No UI. End with a clean `ng build`.

---

## Step 1 — Create tables via Supabase MCP

Use the Supabase MCP `execute_sql` tool to run the following three
statements. Run them one at a time and confirm each succeeds before
continuing.

### Statement 1 — `catering_events`
```sql
create table if not exists catering_events (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  title text not null,
  event_type text not null,
  status text not null default 'inquiry',
  event_date date not null,
  start_time varchar(5) not null,
  end_time varchar(5) not null,
  headcount integer not null,
  location_type text not null default 'on_site',
  location_address text,
  contact_name text not null,
  contact_phone text not null,
  contact_email text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists catering_events_restaurant_id_idx
  on catering_events(restaurant_id);
create index if not exists catering_events_restaurant_status_idx
  on catering_events(restaurant_id, status);
create index if not exists catering_events_restaurant_date_idx
  on catering_events(restaurant_id, event_date);
```

### Statement 2 — `catering_capacity_settings`
```sql
create table if not exists catering_capacity_settings (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null unique references restaurants(id) on delete cascade,
  max_events_per_day integer not null default 3,
  max_headcount_per_day integer not null default 200,
  conflict_alerts_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
```

### Statement 3 — `business_category` column on `restaurants`
```sql
alter table restaurants
  add column if not exists business_category text;
```

Confirm all three statements succeeded before continuing.

---

## Step 2 — Update Prisma schema

The tables now exist in the database. Update the Prisma schema so the
client has TypeScript types. Do NOT run `prisma migrate dev` — the tables
are already created. Use `prisma db pull` or add the models manually, then
run `prisma generate`.

In `Get-Order-Stack-Restaurant-Backend/prisma/schema.prisma`:

### Add `businessCategory` to the `Restaurant` model

```prisma
businessCategory  String?  @map("business_category")
```

Place it near `cuisineType`.

### Add `CateringEvent` model

```prisma
model CateringEvent {
  id              String    @id @default(uuid())
  restaurantId    String    @map("restaurant_id")
  title           String
  eventType       String    @map("event_type")
  status          String    @default("inquiry")
  eventDate       DateTime  @map("event_date") @db.Date
  startTime       String    @map("start_time") @db.VarChar(5)
  endTime         String    @map("end_time") @db.VarChar(5)
  headcount       Int
  locationType    String    @default("on_site") @map("location_type")
  locationAddress String?   @map("location_address")
  contactName     String    @map("contact_name")
  contactPhone    String    @map("contact_phone")
  contactEmail    String    @map("contact_email")
  notes           String?
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  restaurant      Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)

  @@index([restaurantId])
  @@index([restaurantId, status])
  @@index([restaurantId, eventDate])
  @@map("catering_events")
}
```

### Add `CateringCapacitySettings` model

```prisma
model CateringCapacitySettings {
  id                    String    @id @default(uuid())
  restaurantId          String    @unique @map("restaurant_id")
  maxEventsPerDay       Int       @default(3) @map("max_events_per_day")
  maxHeadcountPerDay    Int       @default(200) @map("max_headcount_per_day")
  conflictAlertsEnabled Boolean   @default(true) @map("conflict_alerts_enabled")
  updatedAt             DateTime  @updatedAt @map("updated_at")

  restaurant            Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)

  @@map("catering_capacity_settings")
}
```

### Add relations to `Restaurant` model

In the relations block alongside `events`, `reservations`, etc.:

```prisma
cateringEvents           CateringEvent[]
cateringCapacitySettings CateringCapacitySettings?
```

### Regenerate the Prisma client

```bash
cd Get-Order-Stack-Restaurant-Backend
npx prisma generate
```

Confirm the client regenerates without errors.

---

## Step 3 — Angular: `src/app/models/platform.model.ts`

### A. Add `'catering'` to `PlatformModule` type

```typescript
export type PlatformModule =
  | 'menu_management'
  | 'table_management'
  | 'kds'
  | 'bookings'
  | 'catering'           // ← ADD
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

### B. Add `'catering'` to `food_and_drink` enabledModules

In `BUSINESS_VERTICAL_CATALOG`, find the `food_and_drink` entry and add
`'catering'` to its `enabledModules` array.

### C. Add `businessCategory` to `MerchantProfile`

```typescript
export interface MerchantProfile {
  // ... existing fields unchanged ...
  businessCategory?: string | null;
}
```

### D. Update `defaultMerchantProfile()`

```typescript
export function defaultMerchantProfile(): MerchantProfile {
  return {
    // ... existing fields unchanged ...
    businessCategory: null,
  };
}
```

---

## Step 4 — Angular: `src/app/services/platform.ts`

### E. Add `businessCategory` to `OnboardingPayload`

```typescript
export interface OnboardingPayload {
  // ... existing fields unchanged ...
  businessCategory: string | null;
}
```

### F. Add `businessCategory` computed signal

```typescript
readonly businessCategory = computed<string | null>(
  () => this._merchantProfile()?.businessCategory ?? null
);
```

### G. Persist in `buildProfileFromPayload()`

```typescript
const profile: MerchantProfile = {
  // ... existing fields unchanged ...
  businessCategory: payload.businessCategory ?? null,
};
```

---

## Step 5 — Angular: `setup-wizard.ts`

### H. Pass `businessCategory` in the payload

In `submitOnboarding()`:

```typescript
businessCategory: this._selectedBusinessType()?.name ?? null,
```

---

## Step 6 — Fix any other `OnboardingPayload` call sites

Search for any other places that construct an `OnboardingPayload` and
add `businessCategory: null` to each.

---

## Step 7 — Verify

```bash
ng build
```

Zero TypeScript errors required. Do not proceed to Prompt 2 until:
- All three Supabase MCP statements confirmed successful
- `prisma generate` completed without errors
- `ng build` is clean
