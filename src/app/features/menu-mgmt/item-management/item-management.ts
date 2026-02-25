import { Component, inject, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { MenuService } from '@services/menu';
import { ModifierService } from '@services/modifier';
import { AuthService } from '@services/auth';
import { LoadingSpinner } from '@shared/loading-spinner/loading-spinner';
import { ErrorDisplay } from '@shared/error-display/error-display';
import {
  MenuItem,
  DietaryInfo,
  AllergenType,
  Allergen,
  AvailabilityWindow,
  ChannelVisibility,
  NutritionFacts,
  BarcodeFormat,
  CsvImportResult,
} from '@models/index';

export type SortField = 'name' | 'price' | 'category' | 'prepTime';
export type SortDirection = 'asc' | 'desc';

const ALL_ALLERGEN_TYPES: AllergenType[] = [
  'milk', 'eggs', 'fish', 'shellfish', 'tree_nuts', 'peanuts', 'wheat', 'soy', 'sesame',
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

@Component({
  selector: 'os-item-management',
  imports: [ReactiveFormsModule, CurrencyPipe, LoadingSpinner, ErrorDisplay],
  templateUrl: './item-management.html',
  styleUrl: './item-management.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemManagement {
  private readonly fb = inject(FormBuilder);
  readonly menuService = inject(MenuService);
  private readonly modifierService = inject(ModifierService);
  private readonly authService = inject(AuthService);

  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly allergenTypes = ALL_ALLERGEN_TYPES;
  readonly dayLabels = DAY_LABELS;

  private readonly _editingItem = signal<MenuItem | null>(null);
  private readonly _showForm = signal(false);
  private readonly _isSaving = signal(false);
  private readonly _selectedCategoryId = signal<string | null>(null);
  private readonly _localError = signal<string | null>(null);
  private readonly _menuLoaded = signal(false);

  // Search & sort
  private readonly _searchQuery = signal('');
  private readonly _sortField = signal<SortField>('name');
  private readonly _sortDirection = signal<SortDirection>('asc');

  // Delete confirmation
  private readonly _deleteTarget = signal<MenuItem | null>(null);

  // Modifier group selection for form
  private readonly _selectedModifierGroupIds = signal<string[]>([]);

  // Form sections (collapsible)
  private readonly _showSkuSection = signal(false);
  private readonly _showChannelSection = signal(false);
  private readonly _showAvailabilitySection = signal(false);
  private readonly _showAllergenSection = signal(false);
  private readonly _showNutritionSection = signal(false);

  // Form-level state for complex fields
  private readonly _formAllergens = signal<Allergen[]>([]);
  private readonly _formAvailabilityWindows = signal<AvailabilityWindow[]>([]);
  private readonly _formChannelVisibility = signal<ChannelVisibility>({
    pos: true, onlineOrdering: true, kiosk: true, deliveryApps: true,
  });
  private readonly _formNutrition = signal<NutritionFacts>({
    calories: null, totalFat: null, saturatedFat: null, transFat: null,
    cholesterol: null, sodium: null, totalCarbs: null, dietaryFiber: null,
    totalSugars: null, protein: null, servingSize: null,
  });

  // CSV import
  private readonly _showImportModal = signal(false);
  private readonly _importResult = signal<CsvImportResult | null>(null);
  private readonly _isImporting = signal(false);

  // Image upload
  private readonly _isUploadingImage = signal(false);
  private readonly _imagePreview = signal<string | null>(null);

  readonly editingItem = this._editingItem.asReadonly();
  readonly showForm = this._showForm.asReadonly();
  readonly isSaving = this._isSaving.asReadonly();
  readonly selectedCategoryId = this._selectedCategoryId.asReadonly();
  readonly localError = this._localError.asReadonly();
  readonly searchQuery = this._searchQuery.asReadonly();
  readonly sortField = this._sortField.asReadonly();
  readonly sortDirection = this._sortDirection.asReadonly();
  readonly deleteTarget = this._deleteTarget.asReadonly();
  readonly selectedModifierGroupIds = this._selectedModifierGroupIds.asReadonly();

  readonly showSkuSection = this._showSkuSection.asReadonly();
  readonly showChannelSection = this._showChannelSection.asReadonly();
  readonly showAvailabilitySection = this._showAvailabilitySection.asReadonly();
  readonly showAllergenSection = this._showAllergenSection.asReadonly();
  readonly showNutritionSection = this._showNutritionSection.asReadonly();
  readonly formAllergens = this._formAllergens.asReadonly();
  readonly formAvailabilityWindows = this._formAvailabilityWindows.asReadonly();
  readonly formChannelVisibility = this._formChannelVisibility.asReadonly();
  readonly formNutrition = this._formNutrition.asReadonly();
  readonly showImportModal = this._showImportModal.asReadonly();
  readonly importResult = this._importResult.asReadonly();
  readonly isImporting = this._isImporting.asReadonly();
  readonly isUploadingImage = this._isUploadingImage.asReadonly();
  readonly imagePreview = this._imagePreview.asReadonly();

  readonly items = this.menuService.allItems;
  readonly categories = this.menuService.categories;
  readonly isLoading = this.menuService.isLoading;
  readonly crudSupported = this.menuService.crudSupported;
  readonly modifierGroups = this.modifierService.groups;
  readonly reportingCategories = this.menuService.reportingCategories;

  readonly filteredItems = computed(() => {
    const catId = this._selectedCategoryId();
    const query = this._searchQuery().toLowerCase().trim();
    const field = this._sortField();
    const dir = this._sortDirection();

    let result = this.items();

    if (catId) {
      result = result.filter(item => item.categoryId === catId);
    }

    if (query) {
      result = result.filter(item =>
        item.name.toLowerCase().includes(query) ||
        (item.description ?? '').toLowerCase().includes(query) ||
        (item.sku ?? '').toLowerCase().includes(query)
      );
    }

    const sorted = [...result].sort((a, b) => {
      let cmp = 0;
      switch (field) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'price':
          cmp = Number(a.price) - Number(b.price);
          break;
        case 'category':
          cmp = this.getCategoryName(a.categoryId ?? '').localeCompare(this.getCategoryName(b.categoryId ?? ''));
          break;
        case 'prepTime':
          cmp = (a.prepTimeMinutes ?? 0) - (b.prepTimeMinutes ?? 0);
          break;
      }
      return dir === 'asc' ? cmp : -cmp;
    });

    return sorted;
  });

  readonly itemForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    price: [0, [Validators.required, Validators.min(0)]],
    cost: [null as number | null],
    categoryId: ['', Validators.required],
    image: [''],
    isActive: [true],
    isPopular: [false],
    dietary: [''],
    prepTimeMinutes: [null as number | null],
    displayOrder: [null as number | null],
    sku: [''],
    barcode: [''],
    barcodeFormat: ['' as string],
    reportingCategoryId: [''],
  });

  constructor() {
    effect(() => {
      const restaurantId = this.authService.selectedRestaurantId();
      if (this.isAuthenticated() && restaurantId && !this._menuLoaded()) {
        this._menuLoaded.set(true);
        this.menuService.loadMenu();
        this.modifierService.loadGroups();
        this.menuService.loadReportingCategories();
      }
    });
  }

  // ============ Search & Sort ============

  setSearchQuery(query: string): void {
    this._searchQuery.set(query);
  }

  setSort(field: SortField): void {
    if (this._sortField() === field) {
      this._sortDirection.set(this._sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this._sortField.set(field);
      this._sortDirection.set('asc');
    }
  }

  getSortIcon(field: SortField): string {
    if (this._sortField() !== field) return 'bi-arrow-down-up';
    return this._sortDirection() === 'asc' ? 'bi-sort-alpha-down' : 'bi-sort-alpha-up';
  }

  // ============ Category Filter ============

  selectCategory(categoryId: string | null): void {
    this._selectedCategoryId.set(categoryId);
  }

  // ============ Form Sections ============

  toggleSkuSection(): void { this._showSkuSection.update(v => !v); }
  toggleChannelSection(): void { this._showChannelSection.update(v => !v); }
  toggleAvailabilitySection(): void { this._showAvailabilitySection.update(v => !v); }
  toggleAllergenSection(): void { this._showAllergenSection.update(v => !v); }
  toggleNutritionSection(): void { this._showNutritionSection.update(v => !v); }

  // ============ Channel Visibility ============

  setChannelVisibility(channel: keyof ChannelVisibility, value: boolean): void {
    this._formChannelVisibility.update(cv => ({ ...cv, [channel]: value }));
  }

  // ============ Allergens ============

  hasAllergen(type: AllergenType): boolean {
    return this._formAllergens().some(a => a.type === type);
  }

  getAllergenSeverity(type: AllergenType): string {
    return this._formAllergens().find(a => a.type === type)?.severity ?? 'contains';
  }

  toggleAllergen(type: AllergenType): void {
    const current = this._formAllergens();
    if (current.some(a => a.type === type)) {
      this._formAllergens.set(current.filter(a => a.type !== type));
    } else {
      this._formAllergens.set([...current, { type, severity: 'contains' }]);
    }
  }

  setAllergenSeverity(type: AllergenType, severity: 'contains' | 'may_contain' | 'facility'): void {
    this._formAllergens.update(allergens =>
      allergens.map(a => a.type === type ? { ...a, severity } : a)
    );
  }

  getAllergenLabel(type: AllergenType): string {
    const labels: Record<AllergenType, string> = {
      milk: 'Milk', eggs: 'Eggs', fish: 'Fish', shellfish: 'Shellfish',
      tree_nuts: 'Tree Nuts', peanuts: 'Peanuts', wheat: 'Wheat', soy: 'Soy', sesame: 'Sesame',
    };
    return labels[type];
  }

  // ============ Availability Windows ============

  addAvailabilityWindow(): void {
    this._formAvailabilityWindows.update(windows => [
      ...windows,
      { daysOfWeek: [1, 2, 3, 4, 5], startTime: '09:00', endTime: '17:00', label: '' },
    ]);
  }

  removeAvailabilityWindow(index: number): void {
    this._formAvailabilityWindows.update(windows => windows.filter((_, i) => i !== index));
  }

  updateAvailabilityWindow(index: number, field: keyof AvailabilityWindow, value: unknown): void {
    this._formAvailabilityWindows.update(windows =>
      windows.map((w, i) => i === index ? { ...w, [field]: value } : w)
    );
  }

  toggleAvailabilityDay(index: number, day: number): void {
    this._formAvailabilityWindows.update(windows =>
      windows.map((w, i) => {
        if (i !== index) return w;
        const days = w.daysOfWeek.includes(day)
          ? w.daysOfWeek.filter(d => d !== day)
          : [...w.daysOfWeek, day].sort();
        return { ...w, daysOfWeek: days };
      })
    );
  }

  isAvailabilityDaySelected(index: number, day: number): boolean {
    return this._formAvailabilityWindows()[index]?.daysOfWeek.includes(day) ?? false;
  }

  // ============ Nutrition ============

  updateNutrition(field: keyof NutritionFacts, value: string): void {
    if (field === 'servingSize') {
      this._formNutrition.update(n => ({ ...n, servingSize: value || null }));
    } else {
      const num = value ? Number(value) : null;
      this._formNutrition.update(n => ({ ...n, [field]: num }));
    }
  }

  // ============ Form (Create/Edit/Duplicate) ============

  openCreateForm(): void {
    this._editingItem.set(null);
    this._imagePreview.set(null);
    this._selectedModifierGroupIds.set([]);
    this._formAllergens.set([]);
    this._formAvailabilityWindows.set([]);
    this._formChannelVisibility.set({ pos: true, onlineOrdering: true, kiosk: true, deliveryApps: true });
    this._formNutrition.set({
      calories: null, totalFat: null, saturatedFat: null, transFat: null,
      cholesterol: null, sodium: null, totalCarbs: null, dietaryFiber: null,
      totalSugars: null, protein: null, servingSize: null,
    });
    this.itemForm.reset({
      name: '', description: '', price: 0, cost: null,
      categoryId: this._selectedCategoryId() || '',
      image: '', isActive: true, isPopular: false, dietary: '',
      prepTimeMinutes: null, displayOrder: null,
      sku: '', barcode: '', barcodeFormat: '', reportingCategoryId: '',
    });
    this._showForm.set(true);
  }

  openEditForm(item: MenuItem): void {
    this._editingItem.set(item);
    this._imagePreview.set(item.imageUrl ?? null);
    this._selectedModifierGroupIds.set(item.modifierGroups?.map(g => g.id) ?? []);
    this._formAllergens.set(item.allergens ?? []);
    this._formAvailabilityWindows.set(item.availabilityWindows ?? []);
    this._formChannelVisibility.set(item.channelVisibility ?? {
      pos: true, onlineOrdering: true, kiosk: true, deliveryApps: true,
    });
    this._formNutrition.set(item.nutritionFacts ?? {
      calories: null, totalFat: null, saturatedFat: null, transFat: null,
      cholesterol: null, sodium: null, totalCarbs: null, dietaryFiber: null,
      totalSugars: null, protein: null, servingSize: null,
    });
    this.itemForm.patchValue({
      name: item.name,
      description: item.description || '',
      price: Number(item.price),
      cost: item.cost ?? null,
      categoryId: item.categoryId,
      image: item.image || '',
      isActive: item.isActive ?? true,
      isPopular: item.isPopular ?? false,
      dietary: item.dietary?.join(', ') || '',
      prepTimeMinutes: item.prepTimeMinutes ?? null,
      displayOrder: item.displayOrder ?? null,
      sku: item.sku || '',
      barcode: item.barcode || '',
      barcodeFormat: item.barcodeFormat || '',
      reportingCategoryId: item.reportingCategoryId || '',
    });
    this._showForm.set(true);
  }

  duplicateItem(item: MenuItem): void {
    this._editingItem.set(null);
    this._selectedModifierGroupIds.set(item.modifierGroups?.map(g => g.id) ?? []);
    this._formAllergens.set(item.allergens ?? []);
    this._formAvailabilityWindows.set(item.availabilityWindows ?? []);
    this._formChannelVisibility.set(item.channelVisibility ?? {
      pos: true, onlineOrdering: true, kiosk: true, deliveryApps: true,
    });
    this._formNutrition.set(item.nutritionFacts ?? {
      calories: null, totalFat: null, saturatedFat: null, transFat: null,
      cholesterol: null, sodium: null, totalCarbs: null, dietaryFiber: null,
      totalSugars: null, protein: null, servingSize: null,
    });
    this.itemForm.patchValue({
      name: `${item.name} (Copy)`,
      description: item.description || '',
      price: Number(item.price),
      cost: item.cost ?? null,
      categoryId: item.categoryId,
      image: item.image || '',
      isActive: true,
      isPopular: item.isPopular ?? false,
      dietary: item.dietary?.join(', ') || '',
      prepTimeMinutes: item.prepTimeMinutes ?? null,
      displayOrder: null,
      sku: '',
      barcode: '',
      barcodeFormat: item.barcodeFormat || '',
      reportingCategoryId: item.reportingCategoryId || '',
    });
    this._showForm.set(true);
  }

  closeForm(): void {
    this._showForm.set(false);
    this._editingItem.set(null);
    this._imagePreview.set(null);
    this._selectedModifierGroupIds.set([]);
    this.itemForm.reset();
  }

  toggleModifierGroup(groupId: string): void {
    const current = this._selectedModifierGroupIds();
    if (current.includes(groupId)) {
      this._selectedModifierGroupIds.set(current.filter(id => id !== groupId));
    } else {
      this._selectedModifierGroupIds.set([...current, groupId]);
    }
  }

  isModifierGroupSelected(groupId: string): boolean {
    return this._selectedModifierGroupIds().includes(groupId);
  }

  async saveItem(): Promise<void> {
    if (this.itemForm.invalid || this._isSaving()) return;

    this._isSaving.set(true);
    this._localError.set(null);

    try {
      const formValue = this.itemForm.value;
      const dietaryStrings = formValue.dietary
        ? formValue.dietary.split(',').map(d => d.trim().toLowerCase()).filter(d => d)
        : [];

      const validDietary: DietaryInfo[] = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free', 'spicy', 'halal', 'kosher'];
      const dietary = dietaryStrings.filter(d => validDietary.includes(d as DietaryInfo)) as DietaryInfo[];

      const data: Record<string, unknown> = {
        name: formValue.name!,
        description: formValue.description || undefined,
        price: formValue.price!,
        categoryId: formValue.categoryId!,
        image: formValue.image || undefined,
        isActive: formValue.isActive ?? true,
        isPopular: formValue.isPopular ?? false,
        dietary,
        modifierGroupIds: this._selectedModifierGroupIds(),
        sku: formValue.sku || null,
        barcode: formValue.barcode || null,
        barcodeFormat: formValue.barcodeFormat || null,
        reportingCategoryId: formValue.reportingCategoryId || null,
        channelVisibility: this._formChannelVisibility(),
        allergens: this._formAllergens(),
        availabilityWindows: this._formAvailabilityWindows(),
      };

      // Only include nutrition if at least one field is set
      const nutrition = this._formNutrition();
      const hasNutrition = Object.values(nutrition).some(v => v !== null);
      if (hasNutrition) {
        data['nutritionFacts'] = nutrition;
      }

      if (formValue.cost !== null && formValue.cost !== undefined) {
        data['cost'] = formValue.cost;
      }
      if (formValue.prepTimeMinutes !== null && formValue.prepTimeMinutes !== undefined) {
        data['prepTimeMinutes'] = formValue.prepTimeMinutes;
      }
      if (formValue.displayOrder !== null && formValue.displayOrder !== undefined) {
        data['displayOrder'] = formValue.displayOrder;
      }

      if (this._editingItem()) {
        const success = await this.menuService.updateItem(
          this._editingItem()!.id,
          data as Partial<MenuItem>
        );
        if (!success) {
          this._localError.set(this.menuService.error() ?? 'Failed to update item');
          return;
        }
      } else {
        const result = await this.menuService.createItem(data as Partial<MenuItem>);
        if (!result) {
          this._localError.set(this.menuService.error() ?? 'Failed to create item');
          return;
        }
      }

      this.closeForm();
    } catch (err: unknown) {
      this._localError.set(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      this._isSaving.set(false);
    }
  }

  // ============ Delete with Confirmation ============

  confirmDelete(item: MenuItem): void {
    this._deleteTarget.set(item);
  }

  cancelDelete(): void {
    this._deleteTarget.set(null);
  }

  async executeDelete(): Promise<void> {
    const item = this._deleteTarget();
    if (!item) return;

    this._localError.set(null);
    this._deleteTarget.set(null);
    try {
      const success = await this.menuService.deleteItem(item.id);
      if (!success) {
        this._localError.set(this.menuService.error() ?? 'Failed to delete item');
      }
    } catch (err: unknown) {
      this._localError.set(err instanceof Error ? err.message : 'An unexpected error occurred');
    }
  }

  // ============ Toggle Actions ============

  async toggleActive(item: MenuItem): Promise<void> {
    this._localError.set(null);
    try {
      const success = await this.menuService.updateItem(item.id, { isActive: !item.isActive });
      if (!success) {
        this._localError.set(this.menuService.error() ?? 'Failed to update item');
      }
    } catch (err: unknown) {
      this._localError.set(err instanceof Error ? err.message : 'An unexpected error occurred');
    }
  }

  async toggleEightySix(item: MenuItem): Promise<void> {
    this._localError.set(null);
    const newState = !item.eightySixed;
    const reason = newState ? 'Out of stock' : undefined;
    try {
      const success = await this.menuService.toggleEightySix(item.id, newState, reason);
      if (!success) {
        this._localError.set(this.menuService.error() ?? 'Failed to update 86 status');
      }
    } catch (err: unknown) {
      this._localError.set(err instanceof Error ? err.message : 'Failed to update 86 status');
    }
  }

  // ============ CSV Import/Export ============

  openImportModal(): void {
    this._showImportModal.set(true);
    this._importResult.set(null);
  }

  closeImportModal(): void {
    this._showImportModal.set(false);
    this._importResult.set(null);
  }

  async handleImportFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this._isImporting.set(true);
    this._localError.set(null);

    try {
      const result = await this.menuService.importMenuFromCsv(file);
      if (result) {
        this._importResult.set(result);
      } else {
        this._localError.set(this.menuService.error() ?? 'Failed to import CSV');
      }
    } catch (err: unknown) {
      this._localError.set(err instanceof Error ? err.message : 'Failed to import CSV');
    } finally {
      this._isImporting.set(false);
    }
  }

  async exportCsv(): Promise<void> {
    this._localError.set(null);
    await this.menuService.exportMenuToCsv();
  }

  // ============ SKU Generation ============

  async generateSku(): Promise<void> {
    const item = this._editingItem();
    if (!item) return;

    this._localError.set(null);
    const sku = await this.menuService.autoGenerateSku(item.id);
    if (sku) {
      this.itemForm.patchValue({ sku });
    }
  }

  // ============ Helpers ============

  getCategoryName(categoryId: string): string {
    const category = this.categories().find(c => c.id === categoryId);
    return category?.name ?? 'Unknown';
  }

  getReportingCategoryName(id: string | null | undefined): string {
    if (!id) return '';
    const cat = this.reportingCategories().find(c => c.id === id);
    return cat?.name ?? '';
  }

  clearLocalError(): void {
    this._localError.set(null);
  }

  retry(): void {
    this._localError.set(null);
    this.menuService.loadMenu();
  }

  // ============ Image Upload (GAP-R09) ============

  onImageFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      this._localError.set('Image must be under 2MB');
      return;
    }

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      this._localError.set('Accepted formats: JPG, PNG, WebP');
      return;
    }

    // Show local preview
    const reader = new FileReader();
    reader.onload = () => {
      this._imagePreview.set(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload if editing existing item
    const item = this._editingItem();
    if (item) {
      this.uploadImage(item.id, file);
    }
  }

  private async uploadImage(itemId: string, file: File): Promise<void> {
    this._isUploadingImage.set(true);
    this._localError.set(null);
    try {
      const optimized = await this.optimizeImage(file);
      const result = await this.menuService.uploadItemImage(itemId, optimized);
      this._imagePreview.set(result.imageUrl);
    } catch {
      this._localError.set('Failed to upload image');
    } finally {
      this._isUploadingImage.set(false);
    }
  }

  private optimizeImage(file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.85): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        // Skip if already small enough
        if (width <= maxWidth && height <= maxHeight && file.size <= 500 * 1024) {
          resolve(file);
          return;
        }

        // Scale down proportionally
        if (width > maxWidth) {
          height = Math.round(height * (maxWidth / width));
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round(width * (maxHeight / height));
          height = maxHeight;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        // Try WebP first, fall back to JPEG
        const outputType = 'image/webp';
        canvas.toBlob(
          blob => {
            if (!blob) {
              resolve(file);
              return;
            }
            const ext = outputType === 'image/webp' ? 'webp' : 'jpg';
            const optimizedFile = new File([blob], file.name.replace(/\.[^.]+$/, `.${ext}`), { type: outputType });
            resolve(optimizedFile);
          },
          outputType,
          quality,
        );
      };
      img.onerror = () => reject(new Error('Failed to load image for optimization'));
      img.src = URL.createObjectURL(file);
    });
  }

  async removeImage(): Promise<void> {
    const item = this._editingItem();
    if (!item) return;

    this._isUploadingImage.set(true);
    try {
      await this.menuService.deleteItemImage(item.id);
      this._imagePreview.set(null);
    } catch {
      this._localError.set('Failed to remove image');
    } finally {
      this._isUploadingImage.set(false);
    }
  }
}
