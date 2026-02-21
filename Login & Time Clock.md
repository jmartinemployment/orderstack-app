# GetOrderStack Product Specification
# GOS-SPEC-01: Authentication, Login & Time Clock

**Version:** 1.0
**Date:** February 20, 2026
**Author:** Jeff (Geek @ Your Spot)
**Purpose:** Feature specification for Claude Code implementation
**Industry Reference:** Square for Restaurants, Toast POS

---

## 1. Executive Summary

This spec defines how restaurant staff authenticate, log in to POS devices, and track work hours in GetOrderStack. These are the first screens any user sees — they must be fast, foolproof, and work on BYOD tablets and phones in noisy, greasy, high-pressure environments.

**Key Principle:** A restaurant worker clocking in at 6 AM with wet hands needs to get onto the system in under 5 seconds. Every design decision flows from that.

---

## 2. User Roles & Access Levels

### 2.1 Role Hierarchy

| Role | Description | Example Users |
|------|-------------|---------------|
| **Owner** | Full system access, billing, configuration | Restaurant owner |
| **Manager** | Operations access, overrides, reporting, scheduling | GM, Assistant Manager |
| **Team Lead** | Limited overrides (voids, discounts), reporting | Shift Lead, Head Server |
| **Team Member** | POS operations only (take orders, process payments) | Server, Bartender, Cashier |
| **Kitchen** | Kitchen display only (view/manage tickets) | Line Cook, Expo |
| **Back Office** | Dashboard/reporting only, no POS | Bookkeeper, Accountant |

### 2.2 Permission Sets

Owners create custom **Permission Sets** (not tied 1:1 to roles). Each permission set controls:

```
PERMISSION CATEGORIES:
├── Point of Sale Access
│   ├── Take orders
│   ├── Process payments
│   ├── Apply discounts (up to $X or X%)
│   ├── Void items (before payment)
│   ├── Void items (after payment / refund)
│   ├── Open cash drawer (no sale)
│   ├── Reprint receipts
│   └── Manage tables (assign, transfer, merge)
│
├── Menu & Inventory
│   ├── 86 items (mark out of stock)
│   ├── Edit menu items
│   ├── Edit prices
│   └── View inventory counts
│
├── Time Clock
│   ├── Clock in/out (own)
│   ├── Edit timecards (own)
│   ├── Edit timecards (others)
│   ├── Approve timecard edit requests
│   └── Run labor reports
│
├── Team Management
│   ├── View team members
│   ├── Add/edit team members
│   ├── Manage schedules
│   └── Assign permissions
│
├── Reporting
│   ├── View sales summary
│   ├── View detailed sales reports
│   ├── View labor reports
│   ├── View product mix reports
│   └── Export reports
│
└── Settings & Configuration
    ├── Device management
    ├── Payment settings
    ├── Tax configuration
    └── Restaurant profile
```

---

## 3. Authentication Methods

### 3.1 Owner/Manager — Full Authentication

Used for: Dashboard login (web browser), initial device setup.

```
FLOW: Email + Password → Optional 2FA → Dashboard Access
```

**Data Model:**
```typescript
interface UserAccount {
  id: string;                    // UUID
  email: string;                 // unique, lowercase
  password_hash: string;         // bcrypt
  mfa_enabled: boolean;
  mfa_secret?: string;           // TOTP secret
  restaurant_id: string;         // FK to restaurant
  role: Role;
  status: 'active' | 'inactive' | 'suspended';
  created_at: DateTime;
  updated_at: DateTime;
  last_login_at?: DateTime;
}
```

### 3.2 POS Device Authentication — Device Code

Devices (tablets, phones) authenticate to a specific **Location** using a one-time device code. This avoids sharing owner passwords with every device.

```
FLOW:
1. Owner generates Device Code in Dashboard (6-digit, expires 48 hours)
2. Staff enters Device Code on tablet → device binds to Location
3. Device stays authenticated until manually unpaired
4. Staff then use Personal Passcodes to identify themselves
```

**Data Model:**
```typescript
interface DeviceRegistration {
  id: string;                    // UUID
  device_code: string;           // 6-digit numeric, unique, temp
  device_name: string;           // "Bar iPad", "Host Stand"
  location_id: string;           // FK to location
  restaurant_id: string;         // FK to restaurant
  device_fingerprint?: string;   // browser/device identifier
  status: 'pending' | 'active' | 'expired' | 'revoked';
  paired_at?: DateTime;
  expires_at: DateTime;          // 48 hours from creation
  created_by: string;            // FK to user who generated code
  created_at: DateTime;
}
```

### 3.3 Team Member — Personal Passcode (PRIMARY POS LOGIN)

This is the most-used auth method. Fast, simple, works with gloves.

```
FLOW:
1. POS shows numeric keypad with team member avatars/names
2. Team member taps their name OR enters 4-digit passcode
3. System validates → loads their permission set
4. They're now "active" on this device
5. After inactivity timeout OR explicit logout → returns to passcode screen
```

**Data Model:**
```typescript
interface TeamMember {
  id: string;                     // UUID
  restaurant_id: string;
  first_name: string;
  last_name: string;
  display_name: string;           // shown on POS
  email?: string;
  phone?: string;
  personal_passcode: string;      // 4-digit, unique per restaurant, hashed
  permission_set_id: string;      // FK to permission set
  status: 'active' | 'inactive';
  
  // Job & Compensation
  jobs: TeamMemberJob[];          // can have multiple (server + bartender)
  primary_job_id: string;
  
  // Location assignment
  assigned_location_ids: string[];
  
  avatar_url?: string;
  hire_date?: Date;
  created_at: DateTime;
  updated_at: DateTime;
}

interface TeamMemberJob {
  id: string;
  team_member_id: string;
  job_title: string;              // "Server", "Bartender", "Host"
  hourly_rate: number;            // in cents
  is_tip_eligible: boolean;
  is_primary: boolean;
  overtime_eligible: boolean;
  created_at: DateTime;
}
```

### 3.4 Shared Team Passcode (Optional, Budget Tier)

For small restaurants that don't need individual tracking. Single shared passcode for all team-level staff.

```
FLOW: Enter shared 4-digit code → POS unlocked with team permissions
LIMITATION: Cannot track sales, tips, or time by individual
```

---

## 4. POS Login Screen — UI Specification

### 4.1 Screen States

```
STATE MACHINE:

[Device Locked] 
    → Enter Device Code → [Device Paired]
    
[Device Paired / Idle]
    → Shows: Clock icon + Team member list/keypad
    → Tap name or enter passcode → [Team Member Active]
    
[Team Member Active]
    → Full POS access per permission set
    → "Switch User" button always visible
    → Inactivity timeout (configurable: 1-30 min, default 5)
        → [Device Paired / Idle]
    → Explicit "Log Out" 
        → [Device Paired / Idle]
    → "Clock In/Out" accessible from this state
```

### 4.2 Login Screen Layout (Device Paired / Idle)

```
┌─────────────────────────────────────────────┐
│  GetOrderStack          📍 Main St Location │
│  ─────────────────────────────────────────  │
│                                             │
│  Who's working?                             │
│                                             │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐   │
│  │  👤  │  │  👤  │  │  👤  │  │  👤  │   │
│  │ Sara │  │ Mike │  │ Alex │  │ Kim  │   │
│  └──────┘  └──────┘  └──────┘  └──────┘   │
│  ┌──────┐  ┌──────┐  ┌──────┐             │
│  │  👤  │  │  👤  │  │  👤  │             │
│  │ Juan │  │ Tina │  │ Chef │             │
│  └──────┘  └──────┘  └──────┘             │
│                                             │
│  ──── or enter passcode ────                │
│                                             │
│  ┌─────────────────────┐                    │
│  │  [1] [2] [3]        │                    │
│  │  [4] [5] [6]        │                    │
│  │  [7] [8] [9]        │                    │
│  │  [←] [0] [GO]       │                    │
│  └─────────────────────┘                    │
│                                             │
│  🕐 Clock In/Out                            │
└─────────────────────────────────────────────┘
```

### 4.3 Passcode Validation Rules

- 4 digits, numeric only
- Unique per restaurant (no two team members share a passcode)
- System auto-generates or owner manually sets
- Max 5 failed attempts → 30-second lockout (prevents brute force)
- Passcodes are hashed (bcrypt) in database, never stored plaintext

---

## 5. Time Clock System

### 5.1 Overview

The time clock is integrated into the POS login flow. When a team member identifies themselves, they can clock in/out before or after accessing POS features.

### 5.2 Clock-In Flow

```
FLOW:
1. Team member enters passcode on POS
2. System checks: Are they currently clocked in?
   
   IF NOT clocked in:
   ├── Show "Clock In" prompt with current time
   ├── If member has multiple jobs → show job selector
   │   ("Clocking in as: [Server ▼]")
   ├── Member confirms → Timecard created
   └── POS unlocks with their permissions
   
   IF already clocked in:
   ├── Show "Welcome back, [Name]" with shift duration
   └── POS unlocks immediately
```

### 5.3 Clock-Out Flow

```
FLOW:
1. Team member taps "Clock Out" or "End Shift"
2. System checks for open breaks → auto-ends any open break
3. Show Shift Summary:
   ├── Clock in time
   ├── Clock out time (now)
   ├── Total hours
   ├── Break time taken
   ├── Net paid hours
   └── [Enter Cash Tips] field (optional)
4. Member enters declared cash tips (if tip eligible)
5. Confirm → Timecard closed
6. Option: Print shift summary receipt
7. Return to idle/login screen
```

### 5.4 Break Management

```
BREAK TYPES (configured by owner per location):
- Paid Break: 15 min (name: "Paid Break")
- Unpaid Meal Break: 30 min (name: "Meal Break")
- Custom break types allowed

BREAK FLOW:
1. Clocked-in member taps "Start Break"
2. Select break type from configured list
3. Break timer starts
4. To end: tap "End Break" → resume shift
5. If break exceeds expected duration by 2x → alert manager

AUTO-BREAK REMINDER (configurable):
- After 5 hours continuous work → prompt "Time for a break?"
- Configurable per state labor law requirements
```

### 5.5 Timecard Data Model

```typescript
interface Timecard {
  id: string;                      // UUID
  restaurant_id: string;
  location_id: string;
  team_member_id: string;
  
  // Shift timing
  clock_in_at: DateTime;           // when shift started
  clock_out_at?: DateTime;         // null = still clocked in
  status: 'OPEN' | 'CLOSED';
  
  // Job & wage snapshot (captured at clock-in time)
  job_title: string;
  hourly_rate: number;             // cents, snapshot at clock-in
  is_tip_eligible: boolean;
  
  // Breaks
  breaks: TimecardBreak[];
  
  // Tips
  declared_cash_tips?: number;     // cents, entered at clock-out
  
  // Computed fields
  regular_hours?: number;          // decimal hours
  overtime_hours?: number;
  total_paid_hours?: number;
  total_break_minutes?: number;
  
  // Audit
  created_by: string;              // 'system' or manager ID if manual
  modified_by?: string;
  modification_reason?: string;
  device_id?: string;              // which device used for clock-in
  
  created_at: DateTime;
  updated_at: DateTime;
}

interface TimecardBreak {
  id: string;
  timecard_id: string;
  break_type_id: string;
  
  name: string;                    // "Meal Break", "Paid Break"
  expected_duration_minutes: number;
  is_paid: boolean;
  
  start_at: DateTime;
  end_at?: DateTime;               // null = break in progress
  
  actual_duration_minutes?: number; // computed on end
}

interface BreakType {
  id: string;
  restaurant_id: string;
  location_id?: string;            // null = all locations
  
  name: string;                    // "Paid Break", "Meal Break"
  expected_duration_minutes: number;
  is_paid: boolean;
  is_active: boolean;
  
  created_at: DateTime;
}

interface WorkweekConfig {
  id: string;
  restaurant_id: string;
  
  start_day: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';
  start_time: string;             // "00:00:00" - most use midnight
  overtime_threshold_hours: number; // typically 40
  
  created_at: DateTime;
  updated_at: DateTime;
}
```

### 5.6 Manager Overrides & Timecard Edits

Managers can:
- Clock in/out a team member who forgot
- Edit clock-in or clock-out times
- Add missing breaks retroactively
- Approve/reject team member edit requests

All edits require a **reason** and are **audit-logged**.

```typescript
interface TimecardEdit {
  id: string;
  timecard_id: string;
  
  requested_by: string;          // team member or manager
  approved_by?: string;          // manager who approved
  
  edit_type: 'CLOCK_IN' | 'CLOCK_OUT' | 'ADD_BREAK' | 'EDIT_BREAK' | 'DELETE';
  
  original_value?: string;       // JSON of original field(s)
  new_value: string;             // JSON of new field(s)
  reason: string;                // required
  
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  expires_at: DateTime;          // 30 days
  
  created_at: DateTime;
  resolved_at?: DateTime;
}
```

### 5.7 Auto Clock-Out

Configurable safety net. If a team member forgets to clock out:

```
OPTIONS:
1. Auto clock-out X minutes after scheduled shift end (e.g., 30 min)
2. Auto clock-out at business day cutoff (e.g., 5 AM)  
3. Never auto clock-out (24-hour restaurants)
4. Alert manager of open timecards at end of day
```

### 5.8 Schedule Enforcement (Optional)

When enabled:
- Block clock-in if no scheduled shift (require manager override)
- Block early clock-in more than X minutes before shift (configurable, e.g., 15 min)
- Alert on late clock-in
- Grace period configurable (e.g., clock in up to 7 minutes early/late without flag)

---

## 6. API Endpoints

### 6.1 Authentication

```
POST   /api/auth/login              # Email + password → JWT
POST   /api/auth/verify-mfa         # Verify TOTP code
POST   /api/auth/refresh            # Refresh JWT
POST   /api/auth/logout             # Invalidate session

POST   /api/devices/register        # Pair device with device code
DELETE /api/devices/:id             # Unpair device
GET    /api/devices                 # List registered devices

POST   /api/pos/login               # Passcode → session token + permissions
POST   /api/pos/logout              # End POS session
```

### 6.2 Time Clock

```
POST   /api/timecards               # Clock in (create timecard)
PATCH  /api/timecards/:id           # Update timecard (clock out, add break, etc.)
GET    /api/timecards/:id           # Get single timecard
GET    /api/timecards               # Search timecards (filters: member, date, status)
DELETE /api/timecards/:id           # Delete timecard (manager only)

POST   /api/timecards/:id/breaks    # Start a break
PATCH  /api/timecards/:id/breaks/:breakId  # End a break

GET    /api/break-types             # List break types for location
POST   /api/break-types             # Create break type
PATCH  /api/break-types/:id         # Update break type

POST   /api/timecard-edits          # Request timecard edit
PATCH  /api/timecard-edits/:id      # Approve/reject edit request

GET    /api/workweek-config         # Get workweek settings
PATCH  /api/workweek-config/:id     # Update workweek settings
```

### 6.3 Team Members

```
GET    /api/team-members                    # List (filter by location, status)
POST   /api/team-members                    # Create
GET    /api/team-members/:id                # Get one
PATCH  /api/team-members/:id                # Update
DELETE /api/team-members/:id                # Deactivate (soft delete)

GET    /api/team-members/:id/wages          # Get wage/job info
POST   /api/team-members/:id/jobs           # Add job assignment
PATCH  /api/team-members/:id/jobs/:jobId    # Update job/wage

GET    /api/permission-sets                 # List permission sets
POST   /api/permission-sets                 # Create
PATCH  /api/permission-sets/:id             # Update
```

---

## 7. Database Schema (Prisma)

```prisma
model TeamMember {
  id                String   @id @default(uuid())
  restaurantId      String   @map("restaurant_id")
  firstName         String   @map("first_name")
  lastName          String   @map("last_name")
  displayName       String   @map("display_name")
  email             String?
  phone             String?
  passcodeHash      String   @map("passcode_hash")
  permissionSetId   String   @map("permission_set_id")
  status            String   @default("active") // active, inactive
  avatarUrl         String?  @map("avatar_url")
  hireDate          DateTime? @map("hire_date")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  restaurant        Restaurant     @relation(fields: [restaurantId], references: [id])
  permissionSet     PermissionSet  @relation(fields: [permissionSetId], references: [id])
  jobs              TeamMemberJob[]
  timecards         Timecard[]
  locationAssignments TeamMemberLocation[]

  @@unique([restaurantId, passcodeHash])
  @@map("team_members")
}

model TeamMemberJob {
  id              String   @id @default(uuid())
  teamMemberId    String   @map("team_member_id")
  jobTitle        String   @map("job_title")
  hourlyRate      Int      @map("hourly_rate") // cents
  isTipEligible   Boolean  @default(false) @map("is_tip_eligible")
  isPrimary       Boolean  @default(false) @map("is_primary")
  overtimeEligible Boolean @default(true) @map("overtime_eligible")
  createdAt       DateTime @default(now()) @map("created_at")

  teamMember      TeamMember @relation(fields: [teamMemberId], references: [id])
  @@map("team_member_jobs")
}

model Timecard {
  id              String    @id @default(uuid())
  restaurantId    String    @map("restaurant_id")
  locationId      String    @map("location_id")
  teamMemberId    String    @map("team_member_id")
  clockInAt       DateTime  @map("clock_in_at")
  clockOutAt      DateTime? @map("clock_out_at")
  status          String    @default("OPEN") // OPEN, CLOSED
  jobTitle        String    @map("job_title")
  hourlyRate      Int       @map("hourly_rate") // cents snapshot
  isTipEligible   Boolean   @map("is_tip_eligible")
  declaredCashTips Int?     @map("declared_cash_tips") // cents
  regularHours    Float?    @map("regular_hours")
  overtimeHours   Float?    @map("overtime_hours")
  deviceId        String?   @map("device_id")
  createdBy       String    @map("created_by")
  modifiedBy      String?   @map("modified_by")
  modificationReason String? @map("modification_reason")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  restaurant      Restaurant     @relation(fields: [restaurantId], references: [id])
  location        Location       @relation(fields: [locationId], references: [id])
  teamMember      TeamMember     @relation(fields: [teamMemberId], references: [id])
  breaks          TimecardBreak[]
  edits           TimecardEdit[]

  @@map("timecards")
}

model TimecardBreak {
  id              String    @id @default(uuid())
  timecardId      String    @map("timecard_id")
  breakTypeId     String    @map("break_type_id")
  name            String
  expectedMinutes Int       @map("expected_minutes")
  isPaid          Boolean   @map("is_paid")
  startAt         DateTime  @map("start_at")
  endAt           DateTime? @map("end_at")
  actualMinutes   Int?      @map("actual_minutes")

  timecard        Timecard  @relation(fields: [timecardId], references: [id])
  breakType       BreakType @relation(fields: [breakTypeId], references: [id])

  @@map("timecard_breaks")
}

model BreakType {
  id              String   @id @default(uuid())
  restaurantId    String   @map("restaurant_id")
  locationId      String?  @map("location_id")
  name            String
  expectedMinutes Int      @map("expected_minutes")
  isPaid          Boolean  @map("is_paid")
  isActive        Boolean  @default(true) @map("is_active")
  createdAt       DateTime @default(now()) @map("created_at")

  restaurant      Restaurant     @relation(fields: [restaurantId], references: [id])
  timecardBreaks  TimecardBreak[]

  @@map("break_types")
}

model PermissionSet {
  id              String   @id @default(uuid())
  restaurantId    String   @map("restaurant_id")
  name            String   // "Manager", "Server", "Kitchen"
  permissions     Json     // JSONB - the full permission tree
  isDefault       Boolean  @default(false) @map("is_default")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  restaurant      Restaurant   @relation(fields: [restaurantId], references: [id])
  teamMembers     TeamMember[]

  @@map("permission_sets")
}

model DeviceRegistration {
  id              String    @id @default(uuid())
  deviceCode      String    @unique @map("device_code")
  deviceName      String    @map("device_name")
  locationId      String    @map("location_id")
  restaurantId    String    @map("restaurant_id")
  status          String    @default("pending") // pending, active, expired, revoked
  pairedAt        DateTime? @map("paired_at")
  expiresAt       DateTime  @map("expires_at")
  createdBy       String    @map("created_by")
  createdAt       DateTime  @default(now()) @map("created_at")

  restaurant      Restaurant @relation(fields: [restaurantId], references: [id])
  location        Location   @relation(fields: [locationId], references: [id])

  @@map("device_registrations")
}
```

---

## 8. Implementation Priority

### Phase 1 — MVP (Build First)
1. Team Member CRUD with passcode
2. POS passcode login/logout (4-digit keypad)
3. Basic permission check (can_take_orders, can_void, can_refund)
4. Clock in / clock out (single job)
5. Timecard list view (today's timecards)

### Phase 2 — Core Features
6. Device registration with device codes
7. Full permission sets (configurable)
8. Break management (start/end breaks)
9. Multiple jobs per team member (job switcher)
10. Shift summary on clock-out with tip declaration

### Phase 3 — Advanced
11. Timecard edit requests & approvals
12. Schedule enforcement
13. Auto clock-out
14. Labor cost reporting (labor vs. sales)
15. Overtime calculation per workweek config

---

## 9. Key Business Rules

1. **Passcodes must be unique per restaurant** — system rejects duplicates
2. **Only one open timecard per team member** — must close previous before new
3. **Clock-out requires all breaks ended** — auto-close open breaks on clock-out
4. **Wage is snapshotted at clock-in** — if rate changes mid-shift, timecard keeps original
5. **All timecard edits are audit-logged** — who changed what, when, why
6. **Inactivity timeout returns to login screen** — does NOT clock out the user
7. **Manager override requires manager passcode** — entered on same device
8. **Deactivating a team member does not delete timecards** — soft delete only
