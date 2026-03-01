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

const QSR_PALETTE = [
  '#dc3545', // red
  '#0d6efd', // blue
  '#198754', // green
  '#fd7e14', // orange
  '#6f42c1', // purple
  '#20c997', // teal
  '#795548', // brown
  '#e91e8f', // pink
];

@Component({
  selector: 'os-quick-service-terminal',
  imports: [CurrencyPipe, FormsModule, TopNavigation, WeightScale, BottomNavigation, Checkout],
  templateUrl: './quick-service-terminal.html',
  styleUrl: './quick-service-terminal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickServiceTerminal implements OnInit {
  private readonly menuService = inject(MenuService);
  private readonly settingsService = inject(RestaurantSettingsService);
  private readonly tableService = inject(TableService);
  readonly checkout = inject(CheckoutService);

  // Top tab state — default to Favorites
  readonly topTabs: TopNavigationTab[] = [
    { key: 'keypad', label: 'Keypad' },
    { key: 'library', label: 'Library' },
    { key: 'favorites', label: 'Favorites' },
    { key: 'menu', label: 'Items' },
  ];
  private readonly _activeTopTab = signal<TopTab>('menu');
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

  // Category color map — maps every category AND subcategory ID to a color.
  // Top-level categories use category.color if set, otherwise rotate the palette.
  // Subcategories inherit their top-level parent's color.
  readonly categoryColorMap = computed(() => {
    const cats = this._categories();
    const map = new Map<string, string>();

    const mapSubcategories = (children: MenuCategory[], color: string): void => {
      for (const child of children) {
        map.set(child.id, child.color ?? color);
        if (child.subcategories) {
          mapSubcategories(child.subcategories, child.color ?? color);
        }
      }
    };

    cats.forEach((cat, index) => {
      const color = cat.color ?? QSR_PALETTE[index % QSR_PALETTE.length];
      map.set(cat.id, color);
      if (cat.subcategories) {
        mapSubcategories(cat.subcategories, color);
      }
    });

    return map;
  });

  // Collect all items from a category tree (handles nested subcategories)
  private collectItems(cats: MenuCategory[]): MenuItem[] {
    const items: MenuItem[] = [];
    for (const cat of cats) {
      if (cat.items) items.push(...cat.items);
      if (cat.subcategories) items.push(...this.collectItems(cat.subcategories));
    }
    return items;
  }

  private terminalFilter(items: MenuItem[]): MenuItem[] {
    return items.filter(i =>
      i.isActive !== false &&
      !i.eightySixed &&
      i.channelVisibility?.pos !== false &&
      isItemAvailable(i) &&
      this.menuService.isItemInActiveDaypart(i)
    );
  }

  // All available items (used for Favorites fallback)
  private readonly allItems = computed(() => {
    return this.terminalFilter(this.collectItems(this._categories()));
  });

  // Filter items by selected category (applied across all tabs)
  private filterByCategory(items: MenuItem[]): MenuItem[] {
    const catId = this._selectedCategoryId();
    if (!catId) return items;
    const cat = this._categories().find(c => c.id === catId);
    if (!cat) return items;
    const catItems = this.terminalFilter(this.collectItems([cat]));
    const catItemIds = new Set(catItems.map(i => i.id));
    return items.filter(i => catItemIds.has(i.id));
  }

  // Filtered items for the grid based on active top tab + category
  readonly gridItems = computed(() => {
    const tab = this._activeTopTab();
    const items = this.allItems();

    if (tab === 'favorites') {
      const popular = items.filter(i => i.popular || i.isPopular);
      const base = popular.length > 0 ? popular : items;
      return this.filterByCategory(base);
    }

    if (tab === 'menu' || tab === 'library') {
      return this.filterByCategory(items);
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
  }

  selectTopTab(tab: TopTab | string): void {
    this._activeTopTab.set(tab as TopTab);
  }

  onMoreClick(): void {
    // Placeholder for more menu
  }

  selectCategory(categoryId: string): void {
    this._selectedCategoryId.set(categoryId || null);
  }

  onKeypadPress(key: string): void {
    if (key === 'clear') {
      this._keypadValue.set('');
    } else if (key === 'backspace') {
      this._keypadValue.update(v => v.slice(0, -1));
    } else {
      this._keypadValue.update(v => v + key);
    }
  }

  getCategoryColor(item: MenuItem): string {
    const catId = item.categoryId;
    if (!catId) return QSR_PALETTE[0];
    return this.categoryColorMap().get(catId) ?? QSR_PALETTE[0];
  }

  formatPrice(price: number | string): number {
    return typeof price === 'string' ? Number.parseFloat(price) : price;
  }
}
