export interface MenuCategory {
  id: string;
  restaurantId?: string;
  slug?: string;
  name: string;
  nameEs?: string;
  nameEn?: string;
  description?: string;        // Spanish (default)
  descriptionEn?: string;      // English
  description_en?: string;     // API may use snake_case
  icon?: string;
  displayOrder: number;
  parentId?: string;
  subcategories?: MenuCategory[];
  items?: MenuItem[];
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface MenuItem {
  id: string;
  categoryId?: string;
  name: string;
  nameEs?: string;
  nameEn?: string;
  description?: string;        // Default description
  descriptionEs?: string;      // Spanish
  descriptionEn?: string;      // English
  description_es?: string;     // API may use snake_case
  description_en?: string;     // API may use snake_case
  price: number | string;
  cost?: number;
  image?: string;
  displayOrder?: number;
  modifierGroups?: ModifierGroup[];
  dietary?: DietaryInfo[];
  popular?: boolean;
  isPopular?: boolean;
  isActive?: boolean;
  eightySixed?: boolean;
  eightySixReason?: string;
  prepTimeMinutes?: number;
  aiEstimatedCost?: number;
  aiSuggestedPrice?: number;
  aiProfitMargin?: number;
  aiConfidence?: 'high' | 'medium' | 'low';
  aiLastUpdated?: string;
  createdAt?: string;
  updatedAt?: string;

  // --- Square parity fields (GOS-SPEC-03) ---
  sku?: string | null;
  barcode?: string | null;
  barcodeFormat?: BarcodeFormat | null;
  reportingCategoryId?: string | null;
  channelVisibility?: ChannelVisibility;
  availabilityWindows?: AvailabilityWindow[];
  allergens?: Allergen[];
  nutritionFacts?: NutritionFacts | null;
  variations?: ItemVariation[];
  optionSetIds?: string[];
  hasVariations?: boolean;

  // --- Age verification (GOS-SPEC-07) ---
  requiresAgeVerification?: boolean;
  minimumAge?: number;
}

export interface ModifierGroup {
  id: string;
  name: string;
  description?: string;
  required: boolean;
  multiSelect: boolean;
  minSelections: number;
  maxSelections: number;
  displayOrder?: number;
  modifiers: Modifier[];
  allowTextModifier?: boolean;
  textModifierLabel?: string;
  textModifierMaxLength?: number;
}

export interface Modifier {
  id: string;
  name: string;
  priceAdjustment: number;
  isDefault: boolean;
  isActive: boolean;
  available?: boolean;
  displayOrder?: number;
}

export interface ModifierGroupFormData {
  name: string;
  description?: string;
  required: boolean;
  multiSelect: boolean;
  minSelections: number;
  maxSelections: number;
  modifiers?: ModifierFormData[];
}

export interface ModifierFormData {
  name: string;
  priceAdjustment: number;
  isDefault?: boolean;
  available?: boolean;
}

export type DietaryInfo = 'vegetarian' | 'vegan' | 'gluten-free' | 'dairy-free' | 'nut-free' | 'spicy' | 'halal' | 'kosher';

export interface AICostEstimation {
  estimatedCost: number;
  suggestedPrice: number;
  profitMargin: number;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

export interface AICostEstimationResponse {
  item: MenuItem;
  estimation: AICostEstimation;
}

export interface AIBatchResponse {
  message: string;
  itemsProcessed: number;
  itemsEstimated?: number;
  itemsGenerated?: number;
}

export interface GroupedMenu {
  categories: MenuCategory[];
}

// --- Square Parity: Channel Visibility ---

export interface ChannelVisibility {
  pos: boolean;
  onlineOrdering: boolean;
  kiosk: boolean;
  deliveryApps: boolean;
}

// --- Square Parity: Availability Windows ---

export interface AvailabilityWindow {
  daysOfWeek: number[];    // 0=Sun, 1=Mon, ..., 6=Sat
  startTime: string;       // 'HH:mm' (24h)
  endTime: string;         // 'HH:mm' (24h)
  label: string;           // e.g. 'Breakfast', 'Happy Hour'
}

// --- Square Parity: Allergens & Nutrition ---

export type AllergenType = 'milk' | 'eggs' | 'fish' | 'shellfish' | 'tree_nuts' | 'peanuts' | 'wheat' | 'soy' | 'sesame';

export interface Allergen {
  type: AllergenType;
  severity: 'contains' | 'may_contain' | 'facility';
}

export interface NutritionFacts {
  calories: number | null;
  totalFat: number | null;
  saturatedFat: number | null;
  transFat: number | null;
  cholesterol: number | null;
  sodium: number | null;
  totalCarbs: number | null;
  dietaryFiber: number | null;
  totalSugars: number | null;
  protein: number | null;
  servingSize: string | null;
}

// --- Square Parity: SKU & Barcode ---

export type BarcodeFormat = 'UPC-A' | 'EAN-13' | 'CODE-128';

// --- Square Parity: Reporting Categories ---

export interface ReportingCategory {
  id: string;
  restaurantId: string;
  name: string;
  displayOrder: number;
}

// --- Square Parity: Item Variations ---

export interface ItemVariation {
  id: string;
  menuItemId: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  price: number;
  costPerUnit: number | null;
  inventoryItemId: string | null;
  isDefault: boolean;
  isActive: boolean;
  displayOrder: number;
}

export interface ItemOptionSet {
  id: string;
  restaurantId: string;
  name: string;
  values: string[];
}

// --- CSV Import ---

export interface CsvImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

// --- Utility Functions ---

export function isItemAvailable(item: MenuItem, now: Date = new Date()): boolean {
  const windows = item.availabilityWindows;
  if (!windows || windows.length === 0) return true;

  const dayOfWeek = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return windows.some(w => {
    if (!w.daysOfWeek.includes(dayOfWeek)) return false;
    const [startH, startM] = w.startTime.split(':').map(Number);
    const [endH, endM] = w.endTime.split(':').map(Number);
    const start = startH * 60 + startM;
    const end = endH * 60 + endM;
    return currentMinutes >= start && currentMinutes <= end;
  });
}

export function getItemAvailabilityLabel(item: MenuItem): string {
  const windows = item.availabilityWindows;
  if (!windows || windows.length === 0) return '';
  return windows.map(w => w.label).filter(Boolean).join(', ');
}

const ALLERGEN_LABELS: Record<AllergenType, string> = {
  milk: 'Milk',
  eggs: 'Eggs',
  fish: 'Fish',
  shellfish: 'Shellfish',
  tree_nuts: 'Tree Nuts',
  peanuts: 'Peanuts',
  wheat: 'Wheat',
  soy: 'Soy',
  sesame: 'Sesame',
};

const ALLERGEN_ICONS: Record<AllergenType, string> = {
  milk: 'bi-droplet-fill',
  eggs: 'bi-egg-fill',
  fish: 'bi-water',
  shellfish: 'bi-shell',
  tree_nuts: 'bi-tree-fill',
  peanuts: 'bi-nut-fill',
  wheat: 'bi-grain',
  soy: 'bi-flower1',
  sesame: 'bi-circle-fill',
};

export function getAllergenLabel(type: AllergenType): string {
  return ALLERGEN_LABELS[type] ?? type;
}

export function getAllergenIcon(type: AllergenType): string {
  return ALLERGEN_ICONS[type] ?? 'bi-exclamation-triangle-fill';
}
