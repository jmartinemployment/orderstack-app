import { Component, Input, output, signal, computed, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { MenuItem, Modifier, ModifierGroup, MenuItemBadge, Allergen, AllergenType, isItemAvailable, getItemAvailabilityLabel, getAllergenLabel } from '@models/index';
import { MenuService } from '@services/menu';
import { AnalyticsService } from '@services/analytics';

@Component({
  selector: 'os-menu-item-card',
  imports: [CurrencyPipe],
  templateUrl: './menu-item-card.html',
  styleUrl: './menu-item-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuItemCard {
  private readonly menuService = inject(MenuService);
  private readonly analyticsService = inject(AnalyticsService);
  private readonly cdr = inject(ChangeDetectorRef);

  itemValue: MenuItem | undefined;

  @Input() set item(value: MenuItem | undefined) {
    this.itemValue = value;
    this.cdr.markForCheck();
  }

  addToCart = output<{ item: MenuItem; quantity: number; modifiers: Modifier[]; specialInstructions?: string }>();

  private readonly _showDetails = signal(false);
  private readonly _quantity = signal(1);
  private readonly _selectedModifiers = signal<Map<string, Modifier[]>>(new Map());
  private readonly _specialInstructions = signal('');

  readonly showDetails = this._showDetails.asReadonly();
  readonly quantity = this._quantity.asReadonly();
  readonly specialInstructions = this._specialInstructions.asReadonly();
  readonly currentLanguage = this.menuService.currentLanguage;

  readonly isEightySixed = computed(() => this.itemValue?.eightySixed === true);
  readonly isUnavailable = computed(() => this.itemValue ? !isItemAvailable(this.itemValue) : false);
  readonly availabilityLabel = computed(() => this.itemValue ? getItemAvailabilityLabel(this.itemValue) : '');
  readonly itemAllergens = computed<Allergen[]>(() => this.itemValue?.allergens ?? []);
  readonly hasNutrition = computed(() => this.itemValue?.nutritionFacts !== null && this.itemValue?.nutritionFacts !== undefined);

  readonly badge = computed<MenuItemBadge | null>(() => {
    const item = this.itemValue;
    if (!item) return null;
    // Trigger reactivity on the engineering data signal
    this.analyticsService.itemBadges();
    return this.analyticsService.getItemBadge(item.id, item.createdAt);
  });

  readonly localizedName = computed(() => {
    const item = this.itemValue;
    if (!item) return '';
    if (this.currentLanguage() === 'en') {
      return item.nameEn || item.name;
    }
    return item.nameEs || item.name;
  });

  readonly localizedDescription = computed(() => {
    const item = this.itemValue;
    if (!item) return '';
    if (this.currentLanguage() === 'en') {
      return item.descriptionEn || item.description;
    }
    return item.description;
  });

  readonly totalPrice = computed(() => {
    const item = this.itemValue;
    if (!item) return 0;
    const basePrice = item.price;
    const modifierTotal = this.getSelectedModifiersArray().reduce(
      (sum, mod) => sum + mod.priceAdjustment,
      0
    );
    return (Number(basePrice) + modifierTotal) * this._quantity();
  });

  readonly hasModifiers = computed(() => {
    const item = this.itemValue;
    return item?.modifierGroups && item.modifierGroups.length > 0;
  });

  toggleDetails(): void {
    this._showDetails.update(show => !show);
    if (!this._showDetails()) {
      this.resetSelections();
    }
  }

  closeDetails(): void {
    this._showDetails.set(false);
    this.resetSelections();
  }

  private resetSelections(): void {
    this._quantity.set(1);
    this._selectedModifiers.set(new Map());
    this._specialInstructions.set('');
  }

  onSpecialInstructionsInput(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this._specialInstructions.set(value);
  }

  incrementQuantity(): void {
    this._quantity.update(q => q + 1);
  }

  decrementQuantity(): void {
    this._quantity.update(q => Math.max(1, q - 1));
  }

  toggleModifier(group: ModifierGroup, modifier: Modifier): void {
    this._selectedModifiers.update(map => {
      const newMap = new Map(map);
      const current = newMap.get(group.id) ?? [];

      if (group.multiSelect) {
        const index = current.findIndex(m => m.id === modifier.id);
        if (index >= 0) {
          newMap.set(group.id, current.filter(m => m.id !== modifier.id));
        } else if (current.length < group.maxSelections) {
          newMap.set(group.id, [...current, modifier]);
        }
      } else {
        newMap.set(group.id, [modifier]);
      }

      return newMap;
    });
  }

  isModifierSelected(groupId: string, modifierId: string): boolean {
    const selected = this._selectedModifiers().get(groupId) ?? [];
    return selected.some(m => m.id === modifierId);
  }

  private getSelectedModifiersArray(): Modifier[] {
    const all: Modifier[] = [];
    this._selectedModifiers().forEach(mods => all.push(...mods));
    return all;
  }

  canAddToCart(): boolean {
    const item = this.itemValue;
    if (!item) return false;
    const groups = item.modifierGroups ?? [];
    for (const group of groups) {
      if (group.required) {
        const selected = this._selectedModifiers().get(group.id) ?? [];
        if (selected.length < group.minSelections) {
          return false;
        }
      }
    }
    return true;
  }

  onAddToCart(): void {
    const item = this.itemValue;
    if (!item) return;

    if (this.hasModifiers() && !this._showDetails()) {
      this.toggleDetails();
      return;
    }

    if (!this.canAddToCart()) {
      return;
    }

    this.addToCart.emit({
      item,
      quantity: this._quantity(),
      modifiers: this.getSelectedModifiersArray(),
      specialInstructions: this._specialInstructions().trim() || undefined,
    });

    this.closeDetails();
  }

  getAllergenLabel(type: AllergenType): string {
    return getAllergenLabel(type);
  }

  quickAdd(): void {
    const item = this.itemValue;
    if (!item) return;

    if (this.hasModifiers()) {
      this.toggleDetails();
    } else {
      this.addToCart.emit({
        item,
        quantity: 1,
        modifiers: [],
      });
    }
  }
}
