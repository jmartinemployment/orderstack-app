import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  MenuCategory,
  MenuItem,
  AICostEstimationResponse,
  AIBatchResponse,
  ItemVariation,
  ReportingCategory,
  ItemOptionSet,
  CsvImportResult,
  isItemAvailable,
} from '../models';
import { AuthService } from './auth';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root',
})
export class MenuService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  // Private writable signals
  private readonly _categories = signal<MenuCategory[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _currentLanguage = signal<'en' | 'es'>('es');

  private readonly _crudSupported = signal(false);

  // Reporting categories
  private readonly _reportingCategories = signal<ReportingCategory[]>([]);

  // Option sets
  private readonly _optionSets = signal<ItemOptionSet[]>([]);

  // Public readonly signals
  readonly categories = this._categories.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly currentLanguage = this._currentLanguage.asReadonly();
  readonly crudSupported = this._crudSupported.asReadonly();
  readonly reportingCategories = this._reportingCategories.asReadonly();
  readonly optionSets = this._optionSets.asReadonly();

  // Computed signals
  readonly activeCategories = computed(() =>
    this._categories().filter(cat => cat.isActive !== false)
  );

  readonly allItems = computed(() => {
    const items: MenuItem[] = [];
    const collectItems = (categories: MenuCategory[]) => {
      for (const cat of categories) {
        if (cat.items) {
          items.push(...cat.items.filter(item => item.isActive !== false));
        }
        if (cat.subcategories) {
          collectItems(cat.subcategories);
        }
      }
    };
    collectItems(this._categories());
    return items;
  });

  readonly availableItems = computed(() =>
    this.allItems().filter(item => isItemAvailable(item))
  );

  readonly popularItems = computed(() =>
    this.allItems().filter(item => item.popular || item.isPopular)
  );

  private get restaurantId(): string | null {
    return this.authService.selectedRestaurantId();
  }

  async loadMenu(): Promise<void> {
    return this.loadMenuForRestaurant(this.restaurantId);
  }

  async loadMenuForRestaurant(restaurantId: string | null): Promise<void> {
    if (!restaurantId) {
      this._error.set('No restaurant selected');
      return;
    }

    if (this._isLoading()) {
      return;
    }

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.get<MenuCategory[]>(
          `${this.apiUrl}/restaurant/${restaurantId}/menu/grouped?lang=${this._currentLanguage()}`
        )
      );
      this._categories.set(this.normalizeMenuData(response || []));
      this._crudSupported.set(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load menu';
      this._error.set(message);
    } finally {
      this._isLoading.set(false);
    }
  }

  setLanguage(lang: 'en' | 'es'): void {
    this._currentLanguage.set(lang);
    this.loadMenu();
  }

  async createCategory(data: Partial<MenuCategory>): Promise<MenuCategory | null> {
    if (!this.restaurantId) return null;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const category = await firstValueFrom(
        this.http.post<MenuCategory>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/menu/categories`,
          data
        )
      );
      await this.loadMenu();
      return category;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create category';
      this._error.set(message);
      return null;
    } finally {
      this._isLoading.set(false);
    }
  }

  async updateCategory(categoryId: string, data: Partial<MenuCategory>): Promise<boolean> {
    if (!this.restaurantId) return false;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.patch(
          `${this.apiUrl}/restaurant/${this.restaurantId}/menu/categories/${categoryId}`,
          data
        )
      );
      this._crudSupported.set(true);
      await this.loadMenu();
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update category';
      this._error.set(message);
      return false;
    } finally {
      this._isLoading.set(false);
    }
  }

  async deleteCategory(categoryId: string): Promise<boolean> {
    if (!this.restaurantId) return false;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.delete(
          `${this.apiUrl}/restaurant/${this.restaurantId}/menu/categories/${categoryId}`
        )
      );
      this._crudSupported.set(true);
      await this.loadMenu();
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete category';
      this._error.set(message);
      return false;
    } finally {
      this._isLoading.set(false);
    }
  }

  async createItem(data: Partial<MenuItem>): Promise<MenuItem | null> {
    if (!this.restaurantId) return null;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const item = await firstValueFrom(
        this.http.post<MenuItem>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/menu/items`,
          data
        )
      );
      await this.loadMenu();
      return item;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create item';
      this._error.set(message);
      return null;
    } finally {
      this._isLoading.set(false);
    }
  }

  async updateItem(itemId: string, data: Partial<MenuItem>): Promise<boolean> {
    if (!this.restaurantId) return false;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.patch(
          `${this.apiUrl}/restaurant/${this.restaurantId}/menu/items/${itemId}`,
          data
        )
      );
      this._crudSupported.set(true);
      await this.loadMenu();
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update item';
      this._error.set(message);
      return false;
    } finally {
      this._isLoading.set(false);
    }
  }

  async deleteItem(itemId: string): Promise<boolean> {
    if (!this.restaurantId) return false;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.delete(
          `${this.apiUrl}/restaurant/${this.restaurantId}/menu/items/${itemId}`
        )
      );
      this._crudSupported.set(true);
      await this.loadMenu();
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete item';
      this._error.set(message);
      return false;
    } finally {
      this._isLoading.set(false);
    }
  }

  async toggleEightySix(itemId: string, eightySixed: boolean, reason?: string): Promise<boolean> {
    if (!this.restaurantId) return false;

    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.patch(
          `${this.apiUrl}/restaurant/${this.restaurantId}/menu/items/${itemId}/86`,
          { eightySixed, reason: eightySixed ? reason : undefined }
        )
      );
      await this.loadMenu();
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update 86 status';
      this._error.set(message);
      return false;
    }
  }

  async estimateItemCost(itemId: string): Promise<AICostEstimationResponse | null> {
    if (!this.restaurantId) return null;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.post<AICostEstimationResponse>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/menu/items/${itemId}/estimate-cost`,
          {}
        )
      );
      await this.loadMenu();
      return response;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to estimate item cost';
      this._error.set(message);
      return null;
    } finally {
      this._isLoading.set(false);
    }
  }

  async generateItemDescription(itemId: string): Promise<MenuItem | null> {
    if (!this.restaurantId) return null;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const item = await firstValueFrom(
        this.http.post<MenuItem>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/menu/items/${itemId}/generate-description`,
          {}
        )
      );
      await this.loadMenu();
      return item;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate description';
      this._error.set(message);
      return null;
    } finally {
      this._isLoading.set(false);
    }
  }

  async estimateAllCosts(): Promise<AIBatchResponse | null> {
    if (!this.restaurantId) return null;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.post<AIBatchResponse>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/menu/estimate-all-costs`,
          {}
        )
      );
      await this.loadMenu();
      return response;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to estimate costs';
      this._error.set(message);
      return null;
    } finally {
      this._isLoading.set(false);
    }
  }

  async generateAllDescriptions(): Promise<AIBatchResponse | null> {
    if (!this.restaurantId) return null;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.post<AIBatchResponse>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/menu/generate-all-descriptions`,
          {}
        )
      );
      await this.loadMenu();
      return response;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate descriptions';
      this._error.set(message);
      return null;
    } finally {
      this._isLoading.set(false);
    }
  }

  // --- Item Variations ---

  async createVariation(itemId: string, data: Partial<ItemVariation>): Promise<ItemVariation | null> {
    if (!this.restaurantId) return null;

    this._error.set(null);

    try {
      const variation = await firstValueFrom(
        this.http.post<ItemVariation>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/menu/items/${itemId}/variations`,
          data
        )
      );
      await this.loadMenu();
      return variation;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create variation';
      this._error.set(message);
      return null;
    }
  }

  async updateVariation(itemId: string, variationId: string, data: Partial<ItemVariation>): Promise<boolean> {
    if (!this.restaurantId) return false;

    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.patch(
          `${this.apiUrl}/restaurant/${this.restaurantId}/menu/items/${itemId}/variations/${variationId}`,
          data
        )
      );
      await this.loadMenu();
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update variation';
      this._error.set(message);
      return false;
    }
  }

  async deleteVariation(itemId: string, variationId: string): Promise<boolean> {
    if (!this.restaurantId) return false;

    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.delete(
          `${this.apiUrl}/restaurant/${this.restaurantId}/menu/items/${itemId}/variations/${variationId}`
        )
      );
      await this.loadMenu();
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete variation';
      this._error.set(message);
      return false;
    }
  }

  // --- Reporting Categories ---

  async loadReportingCategories(): Promise<void> {
    if (!this.restaurantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<ReportingCategory[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/reporting-categories`
        )
      );
      this._reportingCategories.set(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load reporting categories';
      this._error.set(message);
    }
  }

  async createReportingCategory(data: Partial<ReportingCategory>): Promise<ReportingCategory | null> {
    if (!this.restaurantId) return null;

    this._error.set(null);

    try {
      const category = await firstValueFrom(
        this.http.post<ReportingCategory>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/reporting-categories`,
          data
        )
      );
      await this.loadReportingCategories();
      return category;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create reporting category';
      this._error.set(message);
      return null;
    }
  }

  async updateReportingCategory(id: string, data: Partial<ReportingCategory>): Promise<boolean> {
    if (!this.restaurantId) return false;

    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.patch(
          `${this.apiUrl}/restaurant/${this.restaurantId}/reporting-categories/${id}`,
          data
        )
      );
      await this.loadReportingCategories();
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update reporting category';
      this._error.set(message);
      return false;
    }
  }

  async deleteReportingCategory(id: string): Promise<boolean> {
    if (!this.restaurantId) return false;

    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.delete(
          `${this.apiUrl}/restaurant/${this.restaurantId}/reporting-categories/${id}`
        )
      );
      await this.loadReportingCategories();
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete reporting category';
      this._error.set(message);
      return false;
    }
  }

  // --- Option Sets ---

  async loadOptionSets(): Promise<void> {
    if (!this.restaurantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<ItemOptionSet[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/option-sets`
        )
      );
      this._optionSets.set(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load option sets';
      this._error.set(message);
    }
  }

  async createOptionSet(data: Partial<ItemOptionSet>): Promise<ItemOptionSet | null> {
    if (!this.restaurantId) return null;

    this._error.set(null);

    try {
      const optionSet = await firstValueFrom(
        this.http.post<ItemOptionSet>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/option-sets`,
          data
        )
      );
      await this.loadOptionSets();
      return optionSet;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create option set';
      this._error.set(message);
      return null;
    }
  }

  // --- CSV Import/Export ---

  async importMenuFromCsv(file: File): Promise<CsvImportResult | null> {
    if (!this.restaurantId) return null;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await firstValueFrom(
        this.http.post<CsvImportResult>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/menu/import`,
          formData
        )
      );
      await this.loadMenu();
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to import menu';
      this._error.set(message);
      return null;
    } finally {
      this._isLoading.set(false);
    }
  }

  async exportMenuToCsv(): Promise<void> {
    if (!this.restaurantId) return;

    this._error.set(null);

    try {
      const blob = await firstValueFrom(
        this.http.get(
          `${this.apiUrl}/restaurant/${this.restaurantId}/menu/export`,
          { responseType: 'blob' }
        )
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'menu-export.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to export menu';
      this._error.set(message);
    }
  }

  // --- SKU Generation ---

  async autoGenerateSku(itemId: string): Promise<string | null> {
    if (!this.restaurantId) return null;

    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.post<{ sku: string }>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/menu/items/${itemId}/generate-sku`,
          {}
        )
      );
      await this.loadMenu();
      return result.sku;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate SKU';
      this._error.set(message);
      return null;
    }
  }

  clearError(): void {
    this._error.set(null);
  }

  private normalizeMenuData(categories: MenuCategory[]): MenuCategory[] {
    return categories.map(cat => ({
      ...cat,
      isActive: cat.isActive ?? true,
      items: cat.items?.map(item => ({ ...item, isActive: item.isActive ?? true })),
      subcategories: cat.subcategories
        ? this.normalizeMenuData(cat.subcategories)
        : undefined,
    }));
  }
}
