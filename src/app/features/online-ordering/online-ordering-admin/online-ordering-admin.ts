import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MenuService } from '@services/menu';
import { RestaurantSettingsService } from '@services/restaurant-settings';
import { AuthService } from '@services/auth';
import { MenuItem, MenuCategory, ChannelVisibility } from '@models/index';
import { LoadingSpinner } from '@shared/loading-spinner/loading-spinner';

@Component({
  selector: 'os-online-ordering-admin',
  imports: [CurrencyPipe, FormsModule, LoadingSpinner],
  templateUrl: './online-ordering-admin.html',
  styleUrl: './online-ordering-admin.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlineOrderingAdmin implements OnInit {
  private readonly menuService = inject(MenuService);
  private readonly settingsService = inject(RestaurantSettingsService);
  private readonly authService = inject(AuthService);

  readonly isLoading = this.menuService.isLoading;
  readonly categories = this.menuService.categories;
  readonly onlinePricingSettings = this.settingsService.onlinePricingSettings;

  private readonly _selectedCategoryId = signal<string | null>(null);
  readonly selectedCategoryId = this._selectedCategoryId.asReadonly();

  private readonly _searchQuery = signal('');
  readonly searchQuery = this._searchQuery.asReadonly();

  // Collect all items from category tree
  private collectItems(cats: MenuCategory[]): MenuItem[] {
    const items: MenuItem[] = [];
    for (const cat of cats) {
      if (cat.items) items.push(...cat.items);
      if (cat.subcategories) items.push(...this.collectItems(cat.subcategories));
    }
    return items;
  }

  readonly allItems = computed(() => this.collectItems(this.categories()));

  readonly filteredItems = computed(() => {
    let items = this.allItems();
    const catId = this._selectedCategoryId();
    if (catId) {
      const cat = this.categories().find(c => c.id === catId);
      if (cat) {
        const catItemIds = new Set(this.collectItems([cat]).map(i => i.id));
        items = items.filter(i => catItemIds.has(i.id));
      }
    }
    const query = this._searchQuery().toLowerCase().trim();
    if (query) {
      items = items.filter(i => i.name.toLowerCase().includes(query));
    }
    return items;
  });

  readonly onlineItemCount = computed(() =>
    this.allItems().filter(i => i.channelVisibility?.onlineOrdering !== false).length
  );

  readonly hiddenItemCount = computed(() =>
    this.allItems().filter(i => i.channelVisibility?.onlineOrdering === false).length
  );

  ngOnInit(): void {
    this.menuService.loadMenu();
    this.settingsService.loadSettings();
  }

  selectCategory(categoryId: string | null): void {
    this._selectedCategoryId.set(categoryId);
  }

  onSearchChange(query: string): void {
    this._searchQuery.set(query);
  }

  isItemOnline(item: MenuItem): boolean {
    return item.channelVisibility?.onlineOrdering !== false;
  }

  getItemImage(item: MenuItem): string | null {
    return item.imageUrl ?? item.thumbnailUrl ?? item.image ?? null;
  }
}
