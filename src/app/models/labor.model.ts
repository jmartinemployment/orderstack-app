export type ShiftPosition = 'server' | 'cook' | 'bartender' | 'host' | 'manager' | 'expo';
export type StaffScheduleTab = 'schedule' | 'time-clock' | 'labor-report' | 'ai-insights' | 'edits' | 'payroll';
export type ReportRange = 'week' | 'biweek' | 'month';

export interface StaffMember {
  id: string;
  name: string;
  role: string;
}

export interface Shift {
  id: string;
  restaurantId: string;
  staffPinId: string;
  staffName: string;
  staffRole: string;
  date: string;
  startTime: string;
  endTime: string;
  position: ShiftPosition;
  breakMinutes: number;
  notes: string | null;
  isPublished: boolean;
}

export interface ShiftFormData {
  staffPinId: string;
  date: string;
  startTime: string;
  endTime: string;
  position: ShiftPosition;
  breakMinutes?: number;
  notes?: string;
}

export interface TimeEntry {
  id: string;
  staffPinId: string;
  staffName: string;
  staffRole: string;
  shiftId: string | null;
  clockIn: string;
  clockOut: string | null;
  breakMinutes: number;
  hoursWorked: number;
}

export interface LaborTarget {
  id: string;
  dayOfWeek: number;
  targetPercent: number;
  targetCost: number | null;
}

export interface StaffLaborSummary {
  staffPinId: string;
  staffName: string;
  staffRole: string;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  laborCost: number;
  shiftsWorked: number;
}

export interface DailyLaborBreakdown {
  date: string;
  hours: number;
  cost: number;
  revenue: number;
  laborPercent: number;
  targetPercent: number | null;
}

export interface OvertimeFlag {
  staffPinId: string;
  staffName: string;
  weeklyHours: number;
  overtimeHours: number;
}

export interface LaborReport {
  startDate: string;
  endDate: string;
  totalHours: number;
  totalLaborCost: number;
  totalRevenue: number;
  laborPercent: number;
  staffSummaries: StaffLaborSummary[];
  dailyBreakdown: DailyLaborBreakdown[];
  overtimeFlags: OvertimeFlag[];
}

// --- Timecard types ---

export type TimecardStatus = 'OPEN' | 'CLOSED';
export type TimeclockTab = 'clock' | 'history' | 'breaks';
export type TimecardEditType = 'clock_in' | 'clock_out' | 'break_start' | 'break_end' | 'job_change';
export type TimecardEditStatus = 'pending' | 'approved' | 'denied' | 'expired';

export interface TimecardBreak {
  id: string;
  timecardId: string;
  breakTypeId: string;
  name: string;
  expectedMinutes: number;
  isPaid: boolean;
  startAt: string;
  endAt: string | null;
  actualMinutes: number | null;
}

export interface Timecard {
  id: string;
  restaurantId: string;
  locationId: string | null;
  teamMemberId: string;
  teamMemberName: string;
  clockInAt: string;
  clockOutAt: string | null;
  status: TimecardStatus;
  jobTitle: string;
  hourlyRate: number;
  isTipEligible: boolean;
  declaredCashTips: number | null;
  regularHours: number;
  overtimeHours: number;
  totalPaidHours: number;
  totalBreakMinutes: number;
  breaks: TimecardBreak[];
  deviceId: string | null;
  createdBy: string | null;
  modifiedBy: string | null;
  modificationReason: string | null;
}

export interface BreakType {
  id: string;
  restaurantId: string;
  name: string;
  expectedMinutes: number;
  isPaid: boolean;
  isActive: boolean;
}

export interface TimecardEdit {
  id: string;
  timecardId: string;
  requestedBy: string;
  requestedByName: string;
  approvedBy: string | null;
  approvedByName: string | null;
  editType: TimecardEditType;
  originalValue: string;
  newValue: string;
  reason: string;
  status: TimecardEditStatus;
  createdAt: string;
  resolvedAt: string | null;
  expiresAt: string | null;
}

export interface WorkweekConfig {
  id: string;
  restaurantId: string;
  startDay: number;
  startTime: string;
  overtimeThresholdHours: number;
}

export interface PosSession {
  token: string;
  teamMemberId: string;
  teamMemberName: string;
  role: string;
  permissions: Record<string, boolean>;
  clockedIn: boolean;
  activeTimecardId: string | null;
}

// --- Staff Portal types ---

export type StaffPortalTab = 'schedule' | 'availability' | 'swaps' | 'timeclock';

export type SwapRequestStatus = 'pending' | 'approved' | 'rejected';

export interface SwapRequest {
  id: string;
  shiftId: string;
  shiftDate: string;
  shiftStartTime: string;
  shiftEndTime: string;
  shiftPosition: ShiftPosition;
  requestorPinId: string;
  requestorName: string;
  targetPinId: string | null;
  targetName: string | null;
  reason: string;
  status: SwapRequestStatus;
  createdAt: string;
  respondedAt: string | null;
  respondedBy: string | null;
}

export interface AvailabilityPreference {
  id: string;
  staffPinId: string;
  dayOfWeek: number;
  isAvailable: boolean;
  preferredStart: string | null;
  preferredEnd: string | null;
  notes: string | null;
}

export interface StaffEarnings {
  periodStart: string;
  periodEnd: string;
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
  basePay: number;
  overtimePay: number;
  tips: number;
  totalEarnings: number;
}

export type LaborRecommendationType = 'overstaffed' | 'understaffed' | 'cost_optimization' | 'scheduling_tip';

export interface LaborRecommendation {
  type: LaborRecommendationType;
  title: string;
  message: string;
  hour?: number;
  dayOfWeek?: number;
  priority: 'high' | 'medium' | 'low';
  potentialSavings?: number;
}

// --- Schedule Templates ---

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
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  position: ShiftPosition;
  breakMinutes: number;
}

// --- Live Labor ---

export interface LiveLaborData {
  currentHourlyCost: number;
  clockedInCount: number;
  todayRevenue: number;
  laborPercent: number;
  projectedDailyCost: number;
}

// --- Staff Notifications ---

export type StaffNotificationType =
  | 'schedule_published'
  | 'shift_changed'
  | 'swap_approved'
  | 'swap_rejected'
  | 'timecard_approved'
  | 'timecard_rejected'
  | 'announcement';

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

// --- Payroll ---

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

// --- Commission Rules ---

export interface CommissionRule {
  id: string;
  restaurantId: string;
  name: string;
  jobTitle: string;
  type: 'percentage' | 'flat_per_order';
  rate: number;
  minimumSales: number;
  isActive: boolean;
}

export interface CommissionCalculation {
  teamMemberId: string;
  displayName: string;
  totalSales: number;
  commissionEarned: number;
  ruleName: string;
}

// --- PTO ---

export type PtoType = 'vacation' | 'sick' | 'personal' | 'holiday';
export type PtoRequestStatus = 'pending' | 'approved' | 'denied';

export interface PtoPolicy {
  id: string;
  restaurantId: string;
  name: string;
  type: PtoType;
  accrualRate: number;
  maxBalance: number;
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
