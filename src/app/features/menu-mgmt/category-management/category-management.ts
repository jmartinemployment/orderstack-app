import { Component, inject, signal, effect, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MenuService } from '@services/menu';
import { AuthService } from '@services/auth';
import { LoadingSpinner } from '@shared/loading-spinner/loading-spinner';
import { ErrorDisplay } from '@shared/error-display/error-display';
import { MenuCategory } from '@models/index';

@Component({
  selector: 'os-category-management',
  imports: [ReactiveFormsModule, LoadingSpinner, ErrorDisplay],
  templateUrl: './category-management.html',
  styleUrl: './category-management.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryManagement {
  private readonly fb = inject(FormBuilder);
  readonly menuService = inject(MenuService);
  private readonly authService = inject(AuthService);

  readonly isAuthenticated = this.authService.isAuthenticated;

  private readonly _editingCategory = signal<MenuCategory | null>(null);
  private readonly _showForm = signal(false);
  private readonly _isSaving = signal(false);
  private readonly _localError = signal<string | null>(null);
  private readonly _menuLoaded = signal(false);
  private readonly _deleteTarget = signal<MenuCategory | null>(null);

  readonly editingCategory = this._editingCategory.asReadonly();
  readonly showForm = this._showForm.asReadonly();
  readonly isSaving = this._isSaving.asReadonly();
  readonly localError = this._localError.asReadonly();
  readonly deleteTarget = this._deleteTarget.asReadonly();

  readonly categories = this.menuService.categories;
  readonly isLoading = this.menuService.isLoading;
  readonly crudSupported = this.menuService.crudSupported;

  readonly categoryForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    isActive: [true],
  });

  constructor() {
    effect(() => {
      const restaurantId = this.authService.selectedRestaurantId();
      if (this.isAuthenticated() && restaurantId && !this._menuLoaded()) {
        this._menuLoaded.set(true);
        this.menuService.loadMenu();
      }
    });
  }

  openCreateForm(): void {
    this._editingCategory.set(null);
    this.categoryForm.reset({ name: '', description: '', isActive: true });
    this._showForm.set(true);
  }

  openEditForm(category: MenuCategory): void {
    this._editingCategory.set(category);
    this.categoryForm.patchValue({
      name: category.name,
      description: category.description || '',
      isActive: category.isActive ?? true,
    });
    this._showForm.set(true);
  }

  closeForm(): void {
    this._showForm.set(false);
    this._editingCategory.set(null);
    this.categoryForm.reset();
  }

  async saveCategory(): Promise<void> {
    if (this.categoryForm.invalid || this._isSaving()) return;

    this._isSaving.set(true);
    this._localError.set(null);

    try {
      const formValue = this.categoryForm.value;
      const data = {
        name: formValue.name!,
        description: formValue.description || undefined,
        isActive: formValue.isActive ?? true,
      };

      if (this._editingCategory()) {
        const success = await this.menuService.updateCategory(
          this._editingCategory()!.id,
          data
        );
        if (!success) {
          this._localError.set(this.menuService.error() ?? 'Failed to update category');
          return;
        }
      } else {
        const result = await this.menuService.createCategory(data);
        if (!result) {
          this._localError.set(this.menuService.error() ?? 'Failed to create category');
          return;
        }
      }

      this.closeForm();
    } catch (err: any) {
      this._localError.set(err?.message ?? 'An unexpected error occurred');
    } finally {
      this._isSaving.set(false);
    }
  }

  confirmDelete(category: MenuCategory): void {
    this._deleteTarget.set(category);
  }

  cancelDelete(): void {
    this._deleteTarget.set(null);
  }

  async executeDelete(): Promise<void> {
    const category = this._deleteTarget();
    if (!category) return;

    this._localError.set(null);
    this._deleteTarget.set(null);
    try {
      const success = await this.menuService.deleteCategory(category.id);
      if (!success) {
        this._localError.set(this.menuService.error() ?? 'Failed to delete category');
      }
    } catch (err: unknown) {
      this._localError.set(err instanceof Error ? err.message : 'An unexpected error occurred');
    }
  }

  async toggleActive(category: MenuCategory): Promise<void> {
    this._localError.set(null);
    try {
      const success = await this.menuService.updateCategory(
        category.id,
        { isActive: !category.isActive }
      );
      if (!success) {
        this._localError.set(this.menuService.error() ?? 'Failed to update category');
      }
    } catch (err: any) {
      this._localError.set(err?.message ?? 'An unexpected error occurred');
    }
  }

  clearLocalError(): void {
    this._localError.set(null);
  }

  retry(): void {
    this._localError.set(null);
    this.menuService.loadMenu();
  }
}
