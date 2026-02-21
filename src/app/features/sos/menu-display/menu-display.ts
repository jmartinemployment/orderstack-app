import { Component, inject, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { AuthService } from '@services/auth';
import { MenuService } from '@services/menu';
import { CartService } from '@services/cart';
import { MenuItem, Modifier } from '@models/index';
import { MenuItemCard } from '../menu-item-card/menu-item-card';
import { LoadingSpinner } from '@shared/loading-spinner/loading-spinner';
import { ErrorDisplay } from '@shared/error-display/error-display';

@Component({
  selector: 'os-menu-display',
  imports: [MenuItemCard, LoadingSpinner, ErrorDisplay],
  templateUrl: './menu-display.html',
  styleUrl: './menu-display.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuDisplay {
  readonly authService = inject(AuthService);
  private readonly menuService = inject(MenuService);
  private readonly cartService = inject(CartService);

  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly categories = this.menuService.activeCategories;
  readonly isLoading = this.menuService.isLoading;
  readonly error = this.menuService.error;
  readonly currentLanguage = this.menuService.currentLanguage;

  private readonly _selectedCategoryId = signal<string | null>(null);
  readonly selectedCategoryId = this._selectedCategoryId.asReadonly();

  private readonly _menuLoaded = signal(false);

  readonly selectedCategory = computed(() => {
    const id = this._selectedCategoryId();
    if (!id) return this.categories()[0] ?? null;
    return this.categories().find(c => c.id === id) ?? null;
  });

  readonly subcategories = computed(() => {
    const category = this.selectedCategory();
    if (!category) return [];
    return category.subcategories || [];
  });

  readonly displayItems = computed(() => {
    const category = this.selectedCategory();
    if (!category) return [];

    const items: MenuItem[] = [];
    if (category.items) {
      items.push(...category.items);
    }
    if (category.subcategories) {
      for (const sub of category.subcategories) {
        if (sub.items) {
          items.push(...sub.items);
        }
      }
    }
    return items;
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

  selectCategory(categoryId: string): void {
    this._selectedCategoryId.set(categoryId);
  }

  toggleLanguage(): void {
    const newLang = this.currentLanguage() === 'en' ? 'es' : 'en';
    this.menuService.setLanguage(newLang);
  }

  onItemSelected(item: MenuItem): void {
    this.cartService.addItem(item, 1, []);
  }

  onAddToCart(event: { item: MenuItem; quantity: number; modifiers: Modifier[]; specialInstructions?: string }): void {
    this.cartService.addItem(event.item, event.quantity, event.modifiers, event.specialInstructions);
  }

  clearError(): void {
    this.menuService.clearError();
  }

  retry(): void {
    this.menuService.loadMenu();
  }
}
