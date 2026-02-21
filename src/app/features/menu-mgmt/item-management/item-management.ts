import { Component, inject, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { MenuService } from '@services/menu';
import { ModifierService } from '@services/modifier';
import { AuthService } from '@services/auth';
import { LoadingSpinner } from '@shared/loading-spinner/loading-spinner';
import { ErrorDisplay } from '@shared/error-display/error-display';
import { MenuItem, DietaryInfo, AICostEstimation } from '@models/index';

export type SortField = 'name' | 'price' | 'category' | 'prepTime';
export type SortDirection = 'asc' | 'desc';

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

  private readonly _editingItem = signal<MenuItem | null>(null);
  private readonly _showForm = signal(false);
  private readonly _isSaving = signal(false);
  private readonly _selectedCategoryId = signal<string | null>(null);
  private readonly _localError = signal<string | null>(null);
  private readonly _menuLoaded = signal(false);
  private readonly _isEstimating = signal<string | null>(null);
  private readonly _isGenerating = signal<string | null>(null);
  private readonly _lastEstimation = signal<AICostEstimation | null>(null);

  // Search & sort
  private readonly _searchQuery = signal('');
  private readonly _sortField = signal<SortField>('name');
  private readonly _sortDirection = signal<SortDirection>('asc');

  // Delete confirmation
  private readonly _deleteTarget = signal<MenuItem | null>(null);

  // Modifier group selection for form
  private readonly _selectedModifierGroupIds = signal<string[]>([]);

  readonly editingItem = this._editingItem.asReadonly();
  readonly showForm = this._showForm.asReadonly();
  readonly isSaving = this._isSaving.asReadonly();
  readonly selectedCategoryId = this._selectedCategoryId.asReadonly();
  readonly localError = this._localError.asReadonly();
  readonly isEstimating = this._isEstimating.asReadonly();
  readonly isGenerating = this._isGenerating.asReadonly();
  readonly lastEstimation = this._lastEstimation.asReadonly();
  readonly searchQuery = this._searchQuery.asReadonly();
  readonly sortField = this._sortField.asReadonly();
  readonly sortDirection = this._sortDirection.asReadonly();
  readonly deleteTarget = this._deleteTarget.asReadonly();
  readonly selectedModifierGroupIds = this._selectedModifierGroupIds.asReadonly();

  readonly items = this.menuService.allItems;
  readonly categories = this.menuService.categories;
  readonly isLoading = this.menuService.isLoading;
  readonly crudSupported = this.menuService.crudSupported;
  readonly modifierGroups = this.modifierService.groups;

  readonly filteredItems = computed(() => {
    const catId = this._selectedCategoryId();
    const query = this._searchQuery().toLowerCase().trim();
    const field = this._sortField();
    const dir = this._sortDirection();

    let result = this.items();

    // Category filter
    if (catId) {
      result = result.filter(item => item.categoryId === catId);
    }

    // Search filter
    if (query) {
      result = result.filter(item =>
        item.name.toLowerCase().includes(query) ||
        (item.description ?? '').toLowerCase().includes(query)
      );
    }

    // Sort
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
  });

  constructor() {
    effect(() => {
      const restaurantId = this.authService.selectedRestaurantId();
      if (this.isAuthenticated() && restaurantId && !this._menuLoaded()) {
        this._menuLoaded.set(true);
        this.menuService.loadMenu();
        this.modifierService.loadGroups();
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

  // ============ Form (Create/Edit/Duplicate) ============

  openCreateForm(): void {
    this._editingItem.set(null);
    this._selectedModifierGroupIds.set([]);
    this.itemForm.reset({
      name: '',
      description: '',
      price: 0,
      cost: null,
      categoryId: this._selectedCategoryId() || '',
      image: '',
      isActive: true,
      isPopular: false,
      dietary: '',
      prepTimeMinutes: null,
      displayOrder: null,
    });
    this._showForm.set(true);
  }

  openEditForm(item: MenuItem): void {
    this._editingItem.set(item);
    this._selectedModifierGroupIds.set(
      item.modifierGroups?.map(g => g.id) ?? []
    );
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
    });
    this._showForm.set(true);
  }

  duplicateItem(item: MenuItem): void {
    this._editingItem.set(null);
    this._selectedModifierGroupIds.set(
      item.modifierGroups?.map(g => g.id) ?? []
    );
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
    });
    this._showForm.set(true);
  }

  closeForm(): void {
    this._showForm.set(false);
    this._editingItem.set(null);
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
      };

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
      const success = await this.menuService.updateItem(
        item.id,
        { isActive: !item.isActive }
      );
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

  // ============ Helpers ============

  getCategoryName(categoryId: string): string {
    const category = this.categories().find(c => c.id === categoryId);
    return category?.name ?? 'Unknown';
  }

  clearLocalError(): void {
    this._localError.set(null);
  }

  retry(): void {
    this._localError.set(null);
    this.menuService.loadMenu();
  }

  // ============ AI Features ============

  async estimateCost(item: MenuItem): Promise<void> {
    this._isEstimating.set(item.id);
    this._localError.set(null);
    try {
      const result = await this.menuService.estimateItemCost(item.id);
      if (result) {
        this._lastEstimation.set(result.estimation);
      } else {
        this._localError.set(this.menuService.error() ?? 'Failed to estimate cost');
      }
    } catch (err: unknown) {
      this._localError.set(err instanceof Error ? err.message : 'Failed to estimate cost');
    } finally {
      this._isEstimating.set(null);
    }
  }

  async generateDescription(item: MenuItem): Promise<void> {
    this._isGenerating.set(item.id);
    this._localError.set(null);
    try {
      const result = await this.menuService.generateItemDescription(item.id);
      if (!result) {
        this._localError.set(this.menuService.error() ?? 'Failed to generate description');
      }
    } catch (err: unknown) {
      this._localError.set(err instanceof Error ? err.message : 'Failed to generate description');
    } finally {
      this._isGenerating.set(null);
    }
  }

  async estimateAllCosts(): Promise<void> {
    this._isEstimating.set('all');
    this._localError.set(null);
    try {
      const result = await this.menuService.estimateAllCosts();
      if (!result) {
        this._localError.set(this.menuService.error() ?? 'Failed to estimate costs');
      }
    } catch (err: unknown) {
      this._localError.set(err instanceof Error ? err.message : 'Failed to estimate costs');
    } finally {
      this._isEstimating.set(null);
    }
  }

  async generateAllDescriptions(): Promise<void> {
    this._isGenerating.set('all');
    this._localError.set(null);
    try {
      const result = await this.menuService.generateAllDescriptions();
      if (!result) {
        this._localError.set(this.menuService.error() ?? 'Failed to generate descriptions');
      }
    } catch (err: unknown) {
      this._localError.set(err instanceof Error ? err.message : 'Failed to generate descriptions');
    } finally {
      this._isGenerating.set(null);
    }
  }

  dismissEstimation(): void {
    this._lastEstimation.set(null);
  }

  getConfidenceBadgeClass(confidence: string): string {
    switch (confidence) {
      case 'high': return 'bg-success';
      case 'medium': return 'bg-warning text-dark';
      case 'low': return 'bg-danger';
      default: return 'bg-secondary';
    }
  }
}
