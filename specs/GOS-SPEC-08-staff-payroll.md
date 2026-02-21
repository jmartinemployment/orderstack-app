# GOS-SPEC-08: Staff & Payroll — Square Parity Enhancements

## Context

Square's Team Management provides 3 built-in permission levels (Owner/Manager/Employee) plus custom permission sets, Square Team App for mobile clock-in/scheduling/messaging, integrated payroll with multi-state tax compliance (federal + state + local withholding, W-2/1099 generation), tip pooling with compliance checks, commission tracking, shift swaps via mobile, PTO accrual/tracking, new-hire onboarding (I-9/W-4/direct deposit forms), team communication/announcements ($2.50/member/month), and labor cost percentage tracking with forecasting. OrderStack has strong labor foundations — 5-tab scheduling (grid/time-clock/labor-report/AI-insights/edits), full timeclock with breaks and edit requests, staff portal (PIN auth, availability, swaps, clock-in), team member management with multi-job support and permission sets — but lacks several Square staff features.

**Key gaps identified:**
- No **staff management UI component** — `StaffManagementService` (24 methods) is fully built but no component is registered in `main.ts`; the 'staff' tab in Control Panel has no corresponding component
- No **time-clock-config UI** — `TimeclockSettings` model + `ControlPanelTab` entry exist but no component built
- No **devices tab UI** — `'devices'` tab declared but no component (being addressed by GOS-SPEC-02)
- No **payroll processing** — `StaffEarnings` calculates hours/pay but no payroll run, period close, or export
- No **tax withholding** — no W-2/1099, no federal/state/local tax calculation
- No **onboarding workflow** — no new-hire document collection (I-9, W-4, direct deposit)
- No **staff notifications/messaging** — schedule changes are passive, no push/SMS to staff
- No **schedule templates** — no "copy last week" or reusable shift templates
- No **PTO tracking** — no paid time off accrual or request/approval workflow
- No **commission tracking** — no sales-based commission calculation for servers
- No **live labor cost gauge** — labor report is historical, no real-time "labor % right now"

**Existing assets:**
- `models/labor.model.ts` — Shift, Timecard, TimecardBreak, WorkweekConfig, LaborReport, StaffEarnings, SwapRequest, AvailabilityPreference (28+ types)
- `models/staff-management.model.ts` — StaffUser, TeamMember, TeamMemberJob, PermissionSet, PERMISSION_DEFINITIONS (21 permissions), DeviceRegistration
- `models/settings.model.ts` — TimeclockSettings, AutoClockOutMode
- `services/labor.ts` — LaborService with 29+ methods (scheduling, timeclock, breaks, edits, availability, swaps, POS sessions)
- `services/staff-management.ts` — StaffManagementService with 24 methods (users, PINs, team members, permissions, devices)
- `labor/staff-scheduling/` — 5-tab scheduling component (grid, time-clock, labor-report, AI-insights, edits)
- `staff/staff-portal/` — PIN-authenticated 4-tab portal (schedule, availability, swaps, timeclock)
- `settings/control-panel/` — ControlPanelTab includes 'staff', 'devices', 'time-clock-config' (no components built)

---

## Mode Awareness (GOS-SPEC-01 Alignment)

Staff management, scheduling, and payroll are **universal across all business verticals** — every business has employees. The `staff_scheduling` and `payroll` platform modules are enabled for all 8 verticals in `BUSINESS_VERTICAL_CATALOG`. However, specific labor features adapt based on vertical and device mode.

### Universal Features (All Verticals)

All of the following apply regardless of business vertical:
- Staff management (users, PINs, team members, permissions)
- Time clock configuration and enforcement
- Schedule creation, publishing, and templates ("Copy Last Week")
- Real-time labor cost gauge (labor % = labor cost / revenue)
- Staff notifications (schedule published, shift changed, swap approved/rejected)
- Payroll period generation, approval, and export
- PTO tracking (accrual, request, approval)
- Onboarding workflow (personal info, tax forms, direct deposit)
- Staff Portal (PIN auth, schedule view, availability, swap requests)

### Vertical-Specific Adaptations

| Feature | `food_and_drink` | `retail` / `grocery` | `services` / `bookings` | Notes |
|---|---|---|---|---|
| **Permission categories** | POS, Menu, Time Clock, Team, Reporting, Settings (21 permissions) | Same base set; "Menu" → "Products", "KDS" permissions hidden | Same base set; adds "Appointments" category; "KDS" hidden | Permission labels adapt per vertical |
| **Job titles** | Server, Bartender, Cook, Host, Expo, Manager | Cashier, Stocker, Buyer, Manager, Stylist | Stylist, Therapist, Trainer, Receptionist, Provider | Defaults differ; user can always create custom titles |
| **Tip pooling / tip management** | Full tip pool rules, compliance, tip-out | Limited (retail rarely tips) | Yes (beauty/wellness tips) | Gated by `enableTipping` feature flag |
| **Commission tracking** | Yes — server sales commission | Yes — sales associate commission | Yes — service provider commission | Universal concept, different rate structures |
| **Shift positions** | BOH, FOH, Bar, Expo, Host | Sales Floor, Stockroom, Register, Receiving | Provider, Front Desk, Support | Position labels adapt per vertical |
| **Labor forecasting** | Based on covers and order volume | Based on foot traffic and transaction volume | Based on appointment count and booking density | Data source for demand prediction differs |
| **Break compliance** | State law varies (CA, NY, etc.) | Same state laws apply | Same state laws apply | Universal compliance — no vertical difference |

### Schedule Grid Adaptation

The scheduling grid is universal in structure (staff × days × shifts). Vertical-specific adaptations:
- **`food_and_drink`**: Position colors for BOH/FOH/Bar/Expo/Host, shift labels include station assignment, "coverage" metric shows FOH-to-covers ratio
- **`retail`**: Position colors for Sales Floor/Stockroom/Register, "coverage" metric shows staff-to-expected-traffic ratio
- **`services`**: Schedule grid doubles as appointment availability — blocked times show as booked appointments, not just shifts. Integration with GOS-SPEC-10 (Appointments) for availability-based booking.

### Device Mode Impact on Staff Features

Staff management is primarily a **back-office** function (Control Panel, not POS), so device POS modes have minimal direct impact. Exceptions:
- **POS Terminal**: `requirePinPerTransaction` (from DeviceModeSettings in GOS-SPEC-02) determines whether the POS prompts for staff PIN before each order. This varies by mode:
  - Quick Service: typically `false` (speed-focused, single operator per terminal)
  - Full Service: typically `true` (multiple servers share terminals)
  - Bar: typically `false` (bartender owns their terminal)
  - Retail: configurable (depends on store size)
- **Staff Portal**: Universal across all verticals — PIN-authenticated schedule/availability/swap view. No mode adaptation needed.

### Payroll — Universal with Vertical Label Differences

Payroll calculation is identical across verticals (hours × rate + OT + tips + commissions). Label adaptations:
- `food_and_drink`: "Tips Declared", "Tip Pool Share", "Tip Credit"
- `retail`: "Commissions", "Sales Bonus" (no tip fields unless `enableTipping`)
- `services`: "Service Tips", "Commissions", "Product Sales Bonus"

---

## Phase 1 — Missing UI Components + Schedule Templates (Steps 1-5)

### Step 1: Staff Management Component

**New: `settings/staff-management/` (4 files)**

Build the missing UI for `StaffManagementService`:

**4 sub-tabs** (matching `StaffManagementTab`):
1. **Users** — admin user list with email, name, role badge, active/inactive toggle, last login. Create/edit modal: email, password, name, role dropdown (super_admin/owner/manager/staff), restaurant assignment checkboxes. Deactivate confirmation.
2. **PINs** — staff PIN list with name, role, active toggle. Create/edit modal: name, 4-digit PIN (masked), role. PIN uniqueness validation.
3. **Team Members** — team member cards with display name, email, phone, status badge, job titles. Create/edit modal: basic info + passcode + hire date + permission set selector + location assignment. Job management sub-form (title, hourly rate, tip eligible, primary, OT eligible). Deactivate/terminate flow.
4. **Permissions** — permission set list with name, default badge, member count. Create/edit modal: name, isDefault toggle, grouped checkboxes by category (POS/Menu/Time Clock/Team/Reporting/Settings — 21 permissions from `PERMISSION_DEFINITIONS`).

**Add to Control Panel** as 'staff' tab content.

### Step 2: Time Clock Config Component

**New: `settings/time-clock-config/` (4 files)**

Build the missing UI for `TimeclockSettings`:
- Schedule enforcement toggle + early clock-in grace minutes slider (5-60)
- Late clock-in threshold minutes slider (5-30)
- Manager override toggle
- Auto clock-out mode radio: "After Shift End" (+ delay slider 15-120 min), "Business Day Cutoff" (+ time picker), "Never"
- Alert open timecards toggle
- Break types management: CRUD for break types (name, duration, paid/unpaid)
- Workweek config: start day dropdown (Sun-Sat), overtime threshold (hours, default 40)

**Add to Control Panel** as 'time-clock-config' tab content.

### Step 3: Schedule Templates (Copy Week)

**Add to `models/labor.model.ts`:**
```ts
export interface ScheduleTemplate {
  id: string;
  restaurantId: string;
  name: string;
  shifts: TemplateShift[];
  createdBy: string;
  createdAt: string;
}

export interface TemplateShift {
  staffMemberId: string;
  dayOfWeek: number;          // 0-6
  startTime: string;          // 'HH:mm'
  endTime: string;
  position: ShiftPosition;
  breakMinutes: number;
}
```

**Add to `LaborService`:**
- `loadTemplates()` — GET `/labor/schedule-templates`
- `saveAsTemplate(name, weekStartDate)` — POST `/labor/schedule-templates` (captures current week's shifts)
- `applyTemplate(templateId, weekStartDate)` — POST `/labor/schedule-templates/:id/apply`
- `deleteTemplate(id)` — DELETE `/labor/schedule-templates/:id`
- `copyPreviousWeek(targetWeekStart)` — POST `/labor/copy-week` (copies shifts from prior week)

**Add to Staff Scheduling header:**
- "Copy Last Week" button — one-click copy
- "Templates" dropdown → save current week as template, apply saved template
- Applied template creates draft shifts (not published) for review

### Step 4: Real-Time Labor Cost Gauge

**Add to Staff Scheduling "Schedule" tab header:**
- Live labor cost percentage: (current clocked-in labor cost / today's revenue so far) × 100
- Color coding: green (<25%), amber (25-32%), red (>32%)
- Updates every 60 seconds from `LaborService` + `AnalyticsService`
- Daily projected labor cost based on remaining scheduled shifts

**Add to `LaborService`:**
- `getLiveLabor(restaurantId)` — GET `/labor/live` → returns `{ currentHourlyCost, clockedInCount, todayRevenue, laborPercent }`

### Step 5: Staff Notifications

**Add to `models/labor.model.ts`:**
```ts
export type StaffNotificationType = 'schedule_published' | 'shift_changed' | 'swap_approved' | 'swap_rejected' | 'timecard_approved' | 'timecard_rejected' | 'announcement';

export interface StaffNotification {
  id: string;
  restaurantId: string;
  recipientPinId: string;
  type: StaffNotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}
```

**Add to `LaborService`:**
- `sendScheduleNotification(weekStart)` — POST `/labor/notifications/schedule-published`
- `sendAnnouncement(message, recipientPinIds)` — POST `/labor/notifications/announcement`
- `loadNotifications(pinId)` — GET `/labor/notifications?pinId=...`
- `markNotificationRead(id)` — PATCH `/labor/notifications/:id/read`

**Integrate:**
- Staff Scheduling: "Publish & Notify" button sends schedule_published notification to all staff with shifts
- Staff Portal: notification bell icon with unread count badge, notification feed panel
- Swap/edit approval triggers automatic notification to requester

---

## Phase 2 — Payroll & PTO (Steps 6-10)

### Step 6: Payroll Period Management

**Add to `models/labor.model.ts`:**
```ts
export type PayrollFrequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
export type PayrollStatus = 'draft' | 'reviewed' | 'approved' | 'exported';

export interface PayrollPeriod {
  id: string;
  restaurantId: string;
  frequency: PayrollFrequency;
  periodStart: string;
  periodEnd: string;
  status: PayrollStatus;
  teamMemberSummaries: PayrollTeamMemberSummary[];
  totalGrossPay: number;
  totalOvertimePay: number;
  totalTips: number;
  totalCommissions: number;
  createdAt: string;
  approvedAt: string | null;
  approvedBy: string | null;
}

export interface PayrollTeamMemberSummary {
  teamMemberId: string;
  displayName: string;
  regularHours: number;
  overtimeHours: number;
  regularPay: number;
  overtimePay: number;
  tipsDeclared: number;
  tipsPooled: number;
  commissions: number;
  grossPay: number;
  jobBreakdown: PayrollJobBreakdown[];
}

export interface PayrollJobBreakdown {
  jobTitle: string;
  hourlyRate: number;
  regularHours: number;
  overtimeHours: number;
  pay: number;
}
```

**Add to `LaborService`:**
- `generatePayrollPeriod(start, end)` — POST `/labor/payroll/generate` (calculates from timecards)
- `loadPayrollPeriods()` — GET `/labor/payroll`
- `getPayrollPeriod(id)` — GET `/labor/payroll/:id`
- `approvePayroll(id)` — PATCH `/labor/payroll/:id/approve`
- `exportPayroll(id, format)` — POST `/labor/payroll/:id/export` (CSV/PDF)

### Step 7: Payroll UI in Staff Scheduling

**Add 6th tab to Staff Scheduling: "Payroll"**
- Payroll period list with status badges (draft/reviewed/approved/exported)
- "Generate Period" button → date range picker based on frequency
- Period detail view: per-employee summary table (hours, pay, tips, commissions, gross)
- Expandable job-level breakdown per employee
- Approve button (manager/owner only)
- Export: CSV for payroll providers (ADP, Gusto, QuickBooks format), PDF summary
- Running totals at bottom: total gross, total OT, total tips

### Step 8: Commission Tracking

**Add to `models/labor.model.ts`:**
```ts
export interface CommissionRule {
  id: string;
  restaurantId: string;
  name: string;
  jobTitle: string;           // Which job title earns commission
  type: 'percentage' | 'flat_per_order';
  rate: number;               // Percentage or flat amount
  minimumSales: number;       // Threshold before commission kicks in
  isActive: boolean;
}
```

**Add to `LaborService`:**
- `loadCommissionRules()` — GET `/labor/commissions/rules`
- `createCommissionRule(data)` — POST `/labor/commissions/rules`
- `updateCommissionRule(id, data)` — PATCH `/labor/commissions/rules/:id`
- `deleteCommissionRule(id)` — DELETE `/labor/commissions/rules/:id`
- `calculateCommissions(periodStart, periodEnd)` — GET `/labor/commissions/calculate?start=...&end=...`

**UI in Payroll tab:**
- Commission rules management section
- Commission column in payroll summary (auto-calculated from sales per employee)

### Step 9: PTO Tracking

**Add to `models/labor.model.ts`:**
```ts
export type PtoType = 'vacation' | 'sick' | 'personal' | 'holiday';
export type PtoRequestStatus = 'pending' | 'approved' | 'denied';

export interface PtoPolicy {
  id: string;
  restaurantId: string;
  name: string;
  type: PtoType;
  accrualRate: number;         // Hours per pay period
  maxBalance: number;          // Max hours that can accrue
  isActive: boolean;
}

export interface PtoRequest {
  id: string;
  teamMemberId: string;
  displayName: string;
  type: PtoType;
  startDate: string;
  endDate: string;
  hoursRequested: number;
  status: PtoRequestStatus;
  reason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface PtoBalance {
  teamMemberId: string;
  type: PtoType;
  accrued: number;
  used: number;
  available: number;
}
```

**Add to `LaborService`:**
- `loadPtoPolicies()` / `createPtoPolicy(data)` / `updatePtoPolicy(id, data)` — CRUD
- `loadPtoRequests(status?)` — GET `/labor/pto/requests`
- `submitPtoRequest(data)` — POST `/labor/pto/requests`
- `approvePtoRequest(id)` / `denyPtoRequest(id)` — PATCH `/labor/pto/requests/:id`
- `getPtoBalances(teamMemberId)` — GET `/labor/pto/balances/:teamMemberId`

**UI:**
- Staff Scheduling: PTO requests in "Edits" tab (or new sub-section) — approve/deny workflow
- Staff Portal: "Request Time Off" button → date range picker, type selector, reason field, balance display
- Schedule grid: PTO days shown as blocked/colored differently (not available for scheduling)

### Step 10: Onboarding Workflow

**Add to `models/staff-management.model.ts`:**
```ts
export type OnboardingStep = 'personal_info' | 'tax_forms' | 'direct_deposit' | 'documents' | 'training' | 'complete';

export interface OnboardingChecklist {
  teamMemberId: string;
  steps: OnboardingStepStatus[];
  completedAt: string | null;
}

export interface OnboardingStepStatus {
  step: OnboardingStep;
  label: string;
  isComplete: boolean;
  completedAt: string | null;
  notes: string | null;
}
```

**Add to Staff Management component:**
- New hire onboarding card appears for team members without completed onboarding
- Checklist UI: personal info (name, address, SSN last 4, emergency contact), tax form status (W-4/W-9 indicator), direct deposit form (routing #, account #), document uploads placeholder, training acknowledgement checkbox
- Progress bar showing onboarding completion %
- "Send Onboarding Link" button → emails employee with self-service form link

---

## Phase 3 — Advanced Staff Features (Steps 11-14)

### Step 11: Multi-Location Staff View

**Enhance Staff Management for multi-location:**
- Staff list filterable by location
- Cross-location scheduling view (see one employee's shifts across all locations)
- "Transfer" action: move team member from one location to another
- Shared permission sets across locations (managed at group level)

### Step 12: Labor Forecasting

**Add to Labor Report or AI Insights tab:**
- Projected labor cost for next week based on published schedule + historical wage data
- Compare projected vs budget/target
- Over/under-staffed hours visualization (bar chart per hour showing scheduled vs recommended)
- AI recommendation: "Add 1 server on Saturday 6-9pm" based on sales patterns

### Step 13: Compliance Dashboard

**Add to Staff Scheduling or as Control Panel section:**
- Break compliance: flag shifts where required breaks weren't taken (state law varies)
- Overtime alerts: employees approaching 40h threshold with time to course-correct
- Minor labor restrictions: (if age tracked) flag shifts violating minor work hour limits
- Tip credit compliance: ensure tipped employees earn at least minimum wage after tips

### Step 14: Build Verification

- `ng build` both library and elements — zero errors
- Verify Staff Management component renders 4 sub-tabs in Control Panel
- Verify Time Clock Config component renders and saves settings
- Verify "Copy Last Week" creates draft shifts
- Verify payroll period generates correct calculations from timecards
- Verify PTO request/approval workflow works
- Verify staff notification bell shows in Staff Portal

---

## Files Summary

### New Files
| File | Purpose |
|------|---------|
| `settings/staff-management/` (4 files) | Staff Management UI (users, PINs, team members, permissions) |
| `settings/time-clock-config/` (4 files) | Time Clock configuration UI |

### Modified Files
| File | Changes |
|------|---------|
| `models/labor.model.ts` | ScheduleTemplate, PayrollPeriod, CommissionRule, PtoPolicy, PtoRequest, PtoBalance, StaffNotification |
| `models/staff-management.model.ts` | OnboardingChecklist, OnboardingStepStatus |
| `services/labor.ts` | Templates, copy week, live labor, notifications, payroll, commissions, PTO |
| `services/staff-management.ts` | Onboarding methods |
| `labor/staff-scheduling/` | Payroll tab, schedule templates, live labor gauge, compliance section |
| `staff/staff-portal/` | Notification bell, PTO request, onboarding self-service |
| `settings/control-panel/` | Wire 'staff' and 'time-clock-config' tab components |
| `public-api.ts` | Add StaffManagement, TimeClockConfig exports |

---

## Verification

1. `ng build` both library and elements — zero errors
2. Staff Management renders 4 sub-tabs (Users, PINs, Team Members, Permissions)
3. Time Clock Config renders all settings with save/discard
4. Schedule template save/apply works
5. "Copy Last Week" button creates draft shifts for current week
6. Payroll period generates and shows per-employee summaries
7. PTO request submits from Staff Portal, appears in scheduling for approval
8. Staff notifications appear in Staff Portal notification bell
9. Live labor cost gauge updates in scheduling header
