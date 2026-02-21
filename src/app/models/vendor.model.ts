export interface Vendor {
  id: string;
  restaurantId: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VendorFormData {
  name: string;
  contactName?: string;
  contactEmail?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

export type PurchaseInvoiceStatus = 'pending_review' | 'approved' | 'paid';

export interface PurchaseLineItem {
  id: string;
  invoiceId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  normalizedIngredient: string | null;
}

export interface PurchaseInvoice {
  id: string;
  restaurantId: string;
  vendorId: string;
  vendorName?: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
  status: PurchaseInvoiceStatus;
  imageUrl: string | null;
  ocrProcessedAt: string | null;
  lineItems: PurchaseLineItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseInvoiceFormData {
  vendorId: string;
  invoiceNumber: string;
  invoiceDate: string;
  lineItems: Omit<PurchaseLineItem, 'id' | 'invoiceId'>[];
}

export interface IngredientPriceHistory {
  ingredientName: string;
  vendorId: string;
  vendorName: string;
  unitCost: number;
  unit: string;
  invoiceDate: string;
}

export interface RecipeIngredient {
  id: string;
  recipeId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  estimatedUnitCost: number;
  actualUnitCost?: number;
}

export interface Recipe {
  id: string;
  menuItemId: string;
  restaurantId: string;
  name: string;
  yieldQty: number;
  yieldUnit: string;
  ingredients: RecipeIngredient[];
  totalCost?: number;
  costPerServing?: number;
  createdAt: string;
  updatedAt: string;
}

export interface RecipeFormData {
  menuItemId: string;
  name: string;
  yieldQty: number;
  yieldUnit: string;
  ingredients: Omit<RecipeIngredient, 'id' | 'recipeId'>[];
}

export interface FoodCostSummary {
  totalRevenue: number;
  totalCogs: number;
  foodCostPercent: number;
  theoreticalCogs: number;
  theoreticalFoodCostPercent: number;
  variance: number;
  variancePercent: number;
  topCostItems: {
    menuItemName: string;
    recipeCost: number;
    menuPrice: number;
    foodCostPercent: number;
    quantitySold: number;
  }[];
  priceAlerts: {
    ingredientName: string;
    vendorName: string;
    previousCost: number;
    currentCost: number;
    changePercent: number;
  }[];
}

export type FoodCostTab = 'invoices' | 'vendors' | 'recipes';
