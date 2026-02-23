import { MenuItem } from './menu.model';

export type MenuBadgeType = 'best-seller' | 'chefs-pick' | 'new' | 'popular' | null;

export interface MenuItemBadge {
  type: MenuBadgeType;
  label: string;
  cssClass: string;
}

export interface UpsellSuggestion {
  item: MenuItem;
  reason: string;
  suggestedScript: string;
}

export type MenuQuadrant = 'star' | 'cash-cow' | 'puzzle' | 'dog';

export interface MenuEngineeringItem {
  id: string;
  name: string;
  price: number;
  cost: number;
  profitMargin: number;
  popularity: number;
  classification: MenuQuadrant;
  categoryName: string;
}

export interface MenuEngineeringInsight {
  text: string;
  type: 'action' | 'observation' | 'warning';
  priority: 'high' | 'medium' | 'low';
}

export interface MenuEngineeringData {
  items: MenuEngineeringItem[];
  insights: MenuEngineeringInsight[];
  summary: {
    totalItems: number;
    stars: number;
    cashCows: number;
    puzzles: number;
    dogs: number;
    averageMargin: number;
    averagePopularity: number;
  };
}

export interface SalesSummary {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  topSellingItems: { name: string; quantity: number; revenue: number }[];
  peakHours: { hour: number; orders: number; revenue: number }[];
}

export interface SalesInsight {
  text: string;
  type: 'positive' | 'negative' | 'neutral';
  metric?: string;
  change?: number;
}

export interface SalesReport {
  summary: SalesSummary;
  insights: SalesInsight[];
  comparison?: {
    revenueChange: number;
    orderChange: number;
    aovChange: number;
  };
}

// --- Sales Goal Tracking (Phase 2) ---

export type GoalPeriodType = 'daily' | 'weekly' | 'monthly';

export interface SalesGoal {
  id: string;
  restaurantId: string;
  type: GoalPeriodType;
  targetRevenue: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
}

export interface SalesGoalFormData {
  type: GoalPeriodType;
  targetRevenue: number;
  startDate: string;
  endDate: string;
}

export interface GoalProgress {
  goalId: string;
  type: GoalPeriodType;
  targetRevenue: number;
  currentRevenue: number;
  progressPercent: number;
  paceStatus: 'on_track' | 'ahead' | 'behind';
  paceAmount: number;
  streak: number;
}

// --- Period-Over-Period Comparison (Phase 2) ---

export type ComparisonMode = 'previous_period' | 'same_last_week' | 'same_last_year' | 'custom';

export interface ComparisonData {
  currentValue: number;
  previousValue: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'flat';
}

// --- Team Performance Analytics (Phase 2) ---

export interface TeamMemberSales {
  staffId: string;
  staffName: string;
  jobTitle: string;
  totalRevenue: number;
  orderCount: number;
  averageTicket: number;
  totalTips: number;
  itemsSold: number;
}

export interface TeamSalesReport {
  members: TeamMemberSales[];
  periodStart: string;
  periodEnd: string;
  totalRevenue: number;
  totalOrders: number;
}

// --- Conversion Funnel (Phase 2) ---

export interface FunnelStep {
  name: string;
  count: number;
  conversionRate: number;
  dropOffRate: number;
}

export interface ConversionFunnel {
  steps: FunnelStep[];
  overallConversionRate: number;
  periodStart: string;
  periodEnd: string;
}

// --- Anomaly Sales Alerts (Phase 2) ---

export type SalesAlertType = 'revenue_anomaly' | 'aov_anomaly' | 'volume_spike' | 'volume_drop' | 'new_customer_surge' | 'channel_shift';

export interface SalesAlert {
  id: string;
  type: SalesAlertType;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  value: number;
  baseline: number;
  changePercent: number;
  timestamp: string;
  acknowledged: boolean;
}
