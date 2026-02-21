export interface InventoryItem {
  id: string;
  restaurantId: string;
  name: string;
  nameEn: string | null;
  unit: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  costPerUnit: number;
  supplier: string | null;
  category: string;
  lastRestocked: string | null;
  lastCountDate: string | null;
  active: boolean;
}

export interface InventoryAlert {
  type: 'low_stock' | 'out_of_stock' | 'reorder_soon' | 'overstock';
  severity: 'critical' | 'warning' | 'info';
  itemId: string;
  itemName: string;
  message: string;
  currentStock: number;
  threshold: number;
  suggestedAction: string;
}

export interface StockPrediction {
  inventoryItemId: string;
  itemName: string;
  currentStock: number;
  unit: string;
  avgDailyUsage: number;
  daysUntilEmpty: number;
  predictedEmptyDate: string;
  reorderRecommended: boolean;
  reorderQuantity: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface InventoryReorderItem {
  item: InventoryItem;
  suggestedQuantity: number;
  estimatedCost: number;
}

export interface InventoryReport {
  restaurantId: string;
  reportDate: string;
  totalItems: number;
  totalValue: number;
  alerts: InventoryAlert[];
  predictions: StockPrediction[];
  lowStockItems: InventoryItem[];
  reorderList: InventoryReorderItem[];
}

export type InventoryTab = 'overview' | 'items' | 'predictions';
export type StockActionType = 'restock' | 'usage' | 'adjustment';
