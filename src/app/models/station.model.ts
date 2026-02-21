export interface KdsStation {
  id: string;
  restaurantId: string;
  name: string;
  color: string | null;
  displayOrder: number;
  isExpo: boolean;
  isActive: boolean;
  categoryIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface StationFormData {
  name: string;
  color?: string;
  displayOrder?: number;
  isExpo?: boolean;
  isActive?: boolean;
}

export interface StationCategoryMapping {
  stationId: string;
  categoryId: string;
}
