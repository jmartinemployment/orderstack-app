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
