export interface LocationGroup {
  id: string;
  restaurantGroupId: string;
  name: string;
  description: string | null;
  memberCount: number;
  createdAt: string;
}

export interface LocationGroupMember {
  id: string;
  locationGroupId: string;
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
}

export interface LocationGroupFormData {
  name: string;
  description?: string;
  restaurantIds: string[];
}

export interface LocationKpi {
  restaurantId: string;
  restaurantName: string;
  revenue: number;
  orderCount: number;
  averageOrderValue: number;
  laborCostPercent: number;
  foodCostPercent: number;
  customerCount: number;
}

export interface CrossLocationReport {
  period: string;
  startDate: string;
  endDate: string;
  locations: LocationKpi[];
  totals: {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    avgLaborCostPercent: number;
    avgFoodCostPercent: number;
  };
}

export interface MenuSyncPreview {
  sourceLocationName: string;
  targetLocationNames: string[];
  itemsToAdd: { name: string; category: string; price: number }[];
  itemsToUpdate: { name: string; category: string; oldPrice: number; newPrice: number }[];
  itemsToSkip: { name: string; reason: string }[];
  conflicts: { name: string; issue: string }[];
}

export interface MenuSyncResult {
  id: string;
  sourceRestaurantId: string;
  targetRestaurantIds: string[];
  itemsAdded: number;
  itemsUpdated: number;
  itemsSkipped: number;
  conflicts: number;
  syncedAt: string;
  syncedBy: string;
}

export interface MenuSyncHistory {
  syncs: MenuSyncResult[];
}

export interface SettingsPropagation {
  settingType: 'ai' | 'pricing' | 'loyalty' | 'delivery' | 'payment';
  sourceRestaurantId: string;
  targetRestaurantIds: string[];
  overrideExisting: boolean;
}

export type MultiLocationTab = 'overview' | 'groups' | 'menu-sync' | 'settings';
