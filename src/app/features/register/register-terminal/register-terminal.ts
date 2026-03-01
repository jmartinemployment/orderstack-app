import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  signal,
  computed,
  effect,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MenuService } from '@services/menu';
import { RestaurantSettingsService } from '@services/restaurant-settings';
import { TableService } from '@services/table';
import { LoyaltyService } from '@services/loyalty';
import { CheckoutService } from '@services/checkout';
import { TopNavigation, TopNavigationTab } from '@shared/top-navigation';
import { WeightScale } from '@shared/weight-scale';
import { Checkout } from '@shared/checkout/checkout';
import { BottomNavigation } from '@shared/bottom-navigation/bottom-navigation';
import {
  MenuCategory,
  MenuItem,
  WEIGHT_UNIT_LABELS,
  isItemAvailable,
} from '@models/index';

type TopTab = 'keypad' | 'library' | 'favorites' | 'menu';

@Component({
  selector: 'os-register-terminal',
  imports: [CurrencyPipe, FormsModule, TopNavigation, WeightScale, BottomNavigation, Checkout],
  templateUrl: './register-terminal.html',
  styleUrl: './register-terminal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterTerminal implements OnInit {
  private readonly menuService = inject(MenuService);
  private readonly settingsService = inject(RestaurantSettingsService);
  private readonly tableService = inject(TableService);
  private readonly loyaltyService = inject(LoyaltyService);
  readonly checkout = inject(CheckoutService);

  // Top tab state — default to Favorites
  readonly topTabs: TopNavigationTab[] = [
    { key: 'keypad', label: 'Keypad' },
    { key: 'library', label: 'Library' },
    { key: 'favorites', label: 'Favorites' },
    { key: 'menu', label: 'Items' },
  ];
  private readonly _activeTopTab = signal<TopTab>('favorites');
  readonly activeTopTab = this._activeTopTab.asReadonly();

  // Menu state
  private readonly _categories = signal<MenuCategory[]>([]);
  private readonly _selectedCategoryId = signal<string | null>(null);
  readonly categories = this._categories.asReadonly();
  readonly selectedCategoryId = this._selectedCategoryId.asReadonly();

  // Loading
  readonly isLoading = this.menuService.isLoading;
  readonly menuError = this.menuService.error;

  // Helper for weight unit labels in template
  readonly weightUnitLabels = WEIGHT_UNIT_LABELS;

  // Collect all items from a category tree (handles nested subcategories)
  private collectItems(cats: MenuCategory[]): MenuItem[] {
    const items: MenuItem[] = [];
    for (const cat of cats) {
      if (cat.items) items.push(...cat.items);
      if (cat.subcategories) items.push(...this.collectItems(cat.subcategories));
    }
    return items;
  }

  private registerFilter(items: MenuItem[]): MenuItem[] {
    return items.filter(i =>
      i.isActive !== false &&
      !i.eightySixed &&
      i.channelVisibility?.pos !== false &&
      isItemAvailable(i) &&
      this.menuService.isItemInActiveDaypart(i)
    );
  }

  // All available register items
  private readonly allRegisterItems = computed(() => {
    return this.registerFilter(this.collectItems(this._categories()));
  });

  // Filtered items for the grid based on active top tab
  readonly gridItems = computed(() => {
    const tab = this._activeTopTab();
    const cats = this._categories();
    const allItems = this.allRegisterItems();

    if (tab === 'favorites') {
      const popular = allItems.filter(i => i.popular || i.isPopular);
      // Fallback: if no items are marked popular, show all items
      return popular.length > 0 ? popular : allItems;
    }

    if (tab === 'menu') {
      const catId = this._selectedCategoryId();
      if (catId) {
        const cat = cats.find(c => c.id === catId);
        return cat ? this.registerFilter(this.collectItems([cat])) : [];
      }
      return allItems;
    }

    if (tab === 'library') {
      return allItems;
    }

    // Keypad tab shows nothing (keypad input mode)
    return [];
  });

  // Keypad state
  private readonly _keypadValue = signal('');
  readonly keypadValue = this._keypadValue.asReadonly();

  // React to categories loading — field initializer keeps injection context
  private readonly _categoryEffect = effect(() => {
    const cats = this.menuService.categories();
    if (cats.length > 0) {
      this._categories.set(cats);
      if (!this._selectedCategoryId() && cats[0]) {
        this._selectedCategoryId.set(cats[0].id);
      }
    }
  });

  ngOnInit(): void {
    this.menuService.loadMenu();
    this.tableService.loadTables();
    this.settingsService.loadSettings();
    this.loyaltyService.loadConfig();
  }

  // --- Tab navigation ---

  selectTopTab(tab: TopTab | string): void {
    this._activeTopTab.set(tab as TopTab);
  }

  onMoreClick(): void {
    // Placeholder for more menu
  }

  selectCategory(categoryId: string): void {
    this._selectedCategoryId.set(categoryId);
  }

  // --- Keypad ---

  onKeypadPress(key: string): void {
    if (key === 'clear') {
      this._keypadValue.set('');
    } else if (key === 'backspace') {
      this._keypadValue.update(v => v.slice(0, -1));
    } else {
      this._keypadValue.update(v => v + key);
    }
  }

  // --- Helpers ---

  getItemImage(item: MenuItem): string | null {
    return item.imageUrl ?? item.thumbnailUrl ?? item.image ?? null;
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    const container = img.parentElement;
    if (container) {
      container.classList.add('item-image-placeholder');
    }
  }

  formatPrice(price: number | string): number {
    return typeof price === 'string' ? Number.parseFloat(price) : price;
  }
}
