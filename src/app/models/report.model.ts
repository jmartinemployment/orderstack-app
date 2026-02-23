export type ReportBlockType =
  | 'sales_summary'
  | 'payment_methods'
  | 'item_sales'
  | 'category_sales'
  | 'modifier_sales'
  | 'team_member_sales'
  | 'discounts'
  | 'voids_comps'
  | 'taxes_fees'
  | 'tips'
  | 'hourly_breakdown'
  | 'section_sales'
  | 'channel_breakdown'
  | 'refunds';

export interface ReportBlock {
  type: ReportBlockType;
  label: string;
  displayOrder: number;
  columns?: string[];
}

export interface SavedReport {
  id: string;
  restaurantId: string;
  name: string;
  blocks: ReportBlock[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavedReportFormData {
  name: string;
  blocks: ReportBlock[];
}

export type ReportScheduleFrequency = 'daily' | 'weekly' | 'monthly';

export interface ReportSchedule {
  id: string;
  restaurantId: string;
  savedReportId: string;
  frequency: ReportScheduleFrequency;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  timeOfDay: string;
  recipientEmails: string[];
  isActive: boolean;
  lastSentAt: string | null;
  createdAt: string;
}

export interface ReportScheduleFormData {
  savedReportId: string;
  frequency: ReportScheduleFrequency;
  dayOfWeek?: number;
  dayOfMonth?: number;
  timeOfDay: string;
  recipientEmails: string[];
}

export type ReportExportFormat = 'csv' | 'xlsx' | 'pdf';

export type ComparisonPeriod = 'previous_period' | 'same_period_last_year' | 'custom';

export interface ReportDateRange {
  startDate: string;
  endDate: string;
  comparisonPeriod?: ComparisonPeriod;
  comparisonStartDate?: string;
  comparisonEndDate?: string;
}

export interface HourlySalesRow {
  hour: number;
  orderCount: number;
  revenue: number;
  avgTicket: number;
  covers: number;
}

export interface SectionSalesRow {
  sectionName: string;
  orderCount: number;
  revenue: number;
  avgTicket: number;
  covers: number;
  avgTurnTimeMinutes: number;
}

export interface ChannelBreakdownRow {
  channel: string;
  orderCount: number;
  revenue: number;
  percentage: number;
}

export interface DiscountReportRow {
  discountName: string;
  discountType: string;
  timesApplied: number;
  totalAmount: number;
  avgDiscount: number;
  topItems: string[];
}

export interface RefundReportRow {
  date: string;
  orderNumber: string;
  amount: number;
  reason: string;
  processedBy: string;
  paymentMethod: string;
}

export type ShiftPreset = 'all' | 'morning' | 'afternoon' | 'evening';

export interface ShiftFilter {
  preset: ShiftPreset;
  startHour: number;
  endHour: number;
  label: string;
}

export const SHIFT_PRESETS: ShiftFilter[] = [
  { preset: 'all', startHour: 0, endHour: 24, label: 'All Day' },
  { preset: 'morning', startHour: 6, endHour: 14, label: 'Morning (6am - 2pm)' },
  { preset: 'afternoon', startHour: 14, endHour: 22, label: 'Afternoon (2pm - 10pm)' },
  { preset: 'evening', startHour: 22, endHour: 30, label: 'Evening (10pm - 6am)' },
];
