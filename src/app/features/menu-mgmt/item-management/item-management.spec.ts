import '../../../../test-setup';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signal, computed } from '@angular/core';
import { of } from 'rxjs';
import { ItemManagement, SortField } from './item-management';
import { MenuService } from '@services/menu';
import { ModifierService } from '@services/modifier';
import { AuthService } from '@services/auth';
import type { MenuItem, MenuCategory, ModifierGroup, ReportingCategory } from '@models/index';

function createMockAuthService() {
  return {
    isAuthenticated: computed(() => true),
    selectedMerchantId: signal<string | null>('r-1').asReadonly(),
    selectedMerchantName: signal<string | null>('Test').asReadonly(),
  };
}

function createTestItems(): MenuItem[] {
  return [
    { id: 'i-1', name: 'Burger', price: 12, categoryId: 'cat-1', merchantId: 'r-1', isActive: true, prepTimeMinutes: 15, description: 'Classic beef burger' } as MenuItem,
    { id: 'i-2', name: 'Salad', price: 8, categoryId: 'cat-2', merchantId: 'r-1', isActive: true, prepTimeMinutes: 5, sku: 'SAL-001' } as MenuItem,
    { id: 'i-3', name: 'Pasta', price: 14, categoryId: 'cat-1', merchantId: 'r-1', isActive: false, prepTimeMinutes: 20 } as MenuItem,
  ];
}

function createMockMenuService() {
  return {
    allItems: signal<MenuItem[]>(createTestItems()).asReadonly(),
    categories: signal<MenuCategory[]>([
      { id: 'cat-1', name: 'Mains', merchantId: 'r-1', isActive: true, displayOrder: 0 },
      { id: 'cat-2', name: 'Sides', merchantId: 'r-1', isActive: true, displayOrder: 1 },
    ]).asReadonly(),
    isLoading: signal(false).asReadonly(),
    error: signal<string | null>(null).asReadonly(),
    crudSupported: signal(true).asReadonly(),
    reportingCategories: signal<ReportingCategory[]>([]).asReadonly(),
    loadMenu: vi.fn(),
    loadReportingCategories: vi.fn(),
    createItem: vi.fn().mockResolvedValue({ id: 'i-new' }),
    updateItem: vi.fn().mockResolvedValue(true),
    deleteItem: vi.fn().mockResolvedValue(true),
    toggleEightySix: vi.fn().mockResolvedValue(true),
    importMenuFromCsv: vi.fn().mockResolvedValue({ created: 5, updated: 0, errors: [] }),
    exportMenuToCsv: vi.fn().mockResolvedValue(undefined),
    autoGenerateSku: vi.fn().mockResolvedValue('AUTO-SKU-1'),
    uploadItemImage: vi.fn().mockResolvedValue({ imageUrl: 'http://example.com/img.webp' }),
    deleteItemImage: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockModifierService() {
  return {
    groups: signal<ModifierGroup[]>([
      { id: 'mg-1', name: 'Sizes', merchantId: 'r-1', required: true, multiSelect: false, minSelections: 1, maxSelections: 1, modifiers: [] },
    ]).asReadonly(),
    isLoading: signal(false).asReadonly(),
    error: signal<string | null>(null).asReadonly(),
    loadGroups: vi.fn(),
  };
}

describe('ItemManagement', () => {
  let fixture: ComponentFixture<ItemManagement>;
  let component: ItemManagement;
  let menuService: ReturnType<typeof createMockMenuService>;

  beforeEach(() => {
    menuService = createMockMenuService();

    TestBed.configureTestingModule({
      imports: [ItemManagement],
      providers: [
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: MenuService, useValue: menuService },
        { provide: ModifierService, useValue: createMockModifierService() },
        { provide: HttpClient, useValue: { get: vi.fn().mockReturnValue(of([])) } },
      ],
    });
    fixture = TestBed.createComponent(ItemManagement);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // --- Search & Sort ---

  it('setSearchQuery updates search', () => {
    component.setSearchQuery('burg');
    expect(component.searchQuery()).toBe('burg');
  });

  it('filteredItems filters by search query', () => {
    component.setSearchQuery('burg');
    expect(component.filteredItems().length).toBe(1);
    expect(component.filteredItems()[0].name).toBe('Burger');
  });

  it('filteredItems searches description', () => {
    component.setSearchQuery('beef');
    expect(component.filteredItems().length).toBe(1);
    expect(component.filteredItems()[0].id).toBe('i-1');
  });

  it('filteredItems searches SKU', () => {
    component.setSearchQuery('SAL-001');
    expect(component.filteredItems().length).toBe(1);
    expect(component.filteredItems()[0].id).toBe('i-2');
  });

  it('filteredItems filters by category', () => {
    component.selectCategory('cat-2');
    expect(component.filteredItems().length).toBe(1);
    expect(component.filteredItems()[0].name).toBe('Salad');
  });

  it('selectCategory with null shows all', () => {
    component.selectCategory('cat-2');
    component.selectCategory(null);
    expect(component.filteredItems().length).toBe(3);
  });

  it('setSort toggles direction when same field', () => {
    expect(component.sortField()).toBe('name');
    expect(component.sortDirection()).toBe('asc');
    component.setSort('name');
    expect(component.sortDirection()).toBe('desc');
  });

  it('setSort changes field and resets to asc', () => {
    component.setSort('price');
    expect(component.sortField()).toBe('price');
    expect(component.sortDirection()).toBe('asc');
  });

  it('filteredItems sorts by price ascending', () => {
    component.setSort('price');
    const items = component.filteredItems();
    expect(items[0].name).toBe('Salad');     // $8
    expect(items[1].name).toBe('Burger');     // $12
    expect(items[2].name).toBe('Pasta');      // $14
  });

  it('filteredItems sorts by price descending', () => {
    component.setSort('price');
    component.setSort('price'); // toggle to desc
    const items = component.filteredItems();
    expect(items[0].name).toBe('Pasta');
    expect(items[2].name).toBe('Salad');
  });

  it('getSortIcon returns correct icons', () => {
    expect(component.getSortIcon('name')).toBe('bi-sort-alpha-down');
    expect(component.getSortIcon('price')).toBe('bi-arrow-down-up');
    component.setSort('name'); // toggle to desc
    expect(component.getSortIcon('name')).toBe('bi-sort-alpha-up');
  });

  // --- Form open/close ---

  it('openCreateForm shows empty form', () => {
    component.openCreateForm();
    expect(component.showForm()).toBe(true);
    expect(component.editingItem()).toBeNull();
    expect(component.itemForm.get('name')?.value).toBe('');
  });

  it('openCreateForm preselects category if filtered', () => {
    component.selectCategory('cat-2');
    component.openCreateForm();
    expect(component.itemForm.get('categoryId')?.value).toBe('cat-2');
  });

  it('openEditForm populates form', () => {
    const item = createTestItems()[0];
    component.openEditForm(item);
    expect(component.showForm()).toBe(true);
    expect(component.editingItem()).toBe(item);
    expect(component.itemForm.get('name')?.value).toBe('Burger');
    expect(component.itemForm.get('price')?.value).toBe(12);
  });

  it('duplicateItem copies data with "(Copy)" suffix', () => {
    const item = createTestItems()[0];
    component.duplicateItem(item);
    expect(component.showForm()).toBe(true);
    expect(component.editingItem()).toBeNull(); // new item
    expect(component.itemForm.get('name')?.value).toBe('Burger (Copy)');
    expect(component.itemForm.get('sku')?.value).toBe(''); // cleared
    expect(component.itemForm.get('barcode')?.value).toBe(''); // cleared
  });

  it('closeForm hides form and resets state', () => {
    component.openCreateForm();
    component.closeForm();
    expect(component.showForm()).toBe(false);
    expect(component.editingItem()).toBeNull();
    expect(component.imagePreview()).toBeNull();
  });

  // --- Modifier groups ---

  it('toggleModifierGroup adds and removes group ids', () => {
    component.openCreateForm();
    expect(component.isModifierGroupSelected('mg-1')).toBe(false);
    component.toggleModifierGroup('mg-1');
    expect(component.isModifierGroupSelected('mg-1')).toBe(true);
    component.toggleModifierGroup('mg-1');
    expect(component.isModifierGroupSelected('mg-1')).toBe(false);
  });

  // --- Form sections ---

  it('toggleSkuSection toggles visibility', () => {
    expect(component.showSkuSection()).toBe(false);
    component.toggleSkuSection();
    expect(component.showSkuSection()).toBe(true);
    component.toggleSkuSection();
    expect(component.showSkuSection()).toBe(false);
  });

  it('toggleChannelSection toggles visibility', () => {
    expect(component.showChannelSection()).toBe(false);
    component.toggleChannelSection();
    expect(component.showChannelSection()).toBe(true);
  });

  it('toggleAllergenSection toggles visibility', () => {
    expect(component.showAllergenSection()).toBe(false);
    component.toggleAllergenSection();
    expect(component.showAllergenSection()).toBe(true);
  });

  // --- Channel visibility ---

  it('setChannelVisibility updates specific channel', () => {
    component.setChannelVisibility('kiosk', false);
    expect(component.formChannelVisibility().kiosk).toBe(false);
    expect(component.formChannelVisibility().pos).toBe(true);
  });

  // --- Allergens ---

  it('toggleAllergen adds and removes allergen', () => {
    expect(component.hasAllergen('milk')).toBe(false);
    component.toggleAllergen('milk');
    expect(component.hasAllergen('milk')).toBe(true);
    component.toggleAllergen('milk');
    expect(component.hasAllergen('milk')).toBe(false);
  });

  it('getAllergenSeverity returns default "contains"', () => {
    component.toggleAllergen('eggs');
    expect(component.getAllergenSeverity('eggs')).toBe('contains');
  });

  it('setAllergenSeverity updates severity', () => {
    component.toggleAllergen('wheat');
    component.setAllergenSeverity('wheat', 'may_contain');
    expect(component.getAllergenSeverity('wheat')).toBe('may_contain');
  });

  it('getAllergenLabel returns display name', () => {
    expect(component.getAllergenLabel('tree_nuts')).toBe('Tree Nuts');
    expect(component.getAllergenLabel('sesame')).toBe('Sesame');
  });

  // --- Availability windows ---

  it('addAvailabilityWindow adds a default window', () => {
    expect(component.formAvailabilityWindows().length).toBe(0);
    component.addAvailabilityWindow();
    expect(component.formAvailabilityWindows().length).toBe(1);
    expect(component.formAvailabilityWindows()[0].startTime).toBe('09:00');
  });

  it('removeAvailabilityWindow removes by index', () => {
    component.addAvailabilityWindow();
    component.addAvailabilityWindow();
    component.removeAvailabilityWindow(0);
    expect(component.formAvailabilityWindows().length).toBe(1);
  });

  it('updateAvailabilityWindow updates field', () => {
    component.addAvailabilityWindow();
    component.updateAvailabilityWindow(0, 'startTime', '10:00');
    expect(component.formAvailabilityWindows()[0].startTime).toBe('10:00');
  });

  it('toggleAvailabilityDay adds and removes days', () => {
    component.addAvailabilityWindow();
    // Default has days [1,2,3,4,5]
    expect(component.isAvailabilityDaySelected(0, 6)).toBe(false);
    component.toggleAvailabilityDay(0, 6);
    expect(component.isAvailabilityDaySelected(0, 6)).toBe(true);
    component.toggleAvailabilityDay(0, 1);
    expect(component.isAvailabilityDaySelected(0, 1)).toBe(false);
  });

  // --- Nutrition ---

  it('updateNutrition sets numeric fields', () => {
    component.updateNutrition('calories', '250');
    expect(component.formNutrition().calories).toBe(250);
  });

  it('updateNutrition sets servingSize as string', () => {
    component.updateNutrition('servingSize', '1 cup');
    expect(component.formNutrition().servingSize).toBe('1 cup');
  });

  it('updateNutrition sets null for empty value', () => {
    component.updateNutrition('calories', '250');
    component.updateNutrition('calories', '');
    expect(component.formNutrition().calories).toBeNull();
  });

  // --- Save item ---

  it('saveItem creates with valid form', async () => {
    component.openCreateForm();
    component.itemForm.patchValue({
      name: 'New Item', price: 9.99, categoryId: 'cat-1',
    });
    await component.saveItem();
    expect(menuService.createItem).toHaveBeenCalledWith(expect.objectContaining({
      name: 'New Item',
      price: 9.99,
      categoryId: 'cat-1',
    }));
    expect(component.showForm()).toBe(false);
  });

  it('saveItem updates existing item', async () => {
    const item = createTestItems()[0];
    component.openEditForm(item);
    component.itemForm.patchValue({ name: 'Updated Burger' });
    await component.saveItem();
    expect(menuService.updateItem).toHaveBeenCalledWith('i-1', expect.objectContaining({ name: 'Updated Burger' }));
  });

  it('saveItem does nothing when form is invalid', async () => {
    component.openCreateForm();
    component.itemForm.patchValue({ name: '', categoryId: '' });
    await component.saveItem();
    expect(menuService.createItem).not.toHaveBeenCalled();
  });

  it('saveItem sets localError on failure', async () => {
    menuService.createItem.mockResolvedValue(null);
    component.openCreateForm();
    component.itemForm.patchValue({ name: 'Test', price: 5, categoryId: 'cat-1' });
    await component.saveItem();
    expect(component.localError()).toBeTruthy();
  });

  // --- Delete ---

  it('confirmDelete sets target', () => {
    const item = createTestItems()[0];
    component.confirmDelete(item);
    expect(component.deleteTarget()).toBe(item);
  });

  it('cancelDelete clears target', () => {
    component.confirmDelete(createTestItems()[0]);
    component.cancelDelete();
    expect(component.deleteTarget()).toBeNull();
  });

  it('executeDelete calls service', async () => {
    component.confirmDelete(createTestItems()[0]);
    await component.executeDelete();
    expect(menuService.deleteItem).toHaveBeenCalledWith('i-1');
  });

  // --- Toggle active / 86 ---

  it('toggleActive flips isActive', async () => {
    const item = createTestItems()[0]; // isActive: true
    await component.toggleActive(item);
    expect(menuService.updateItem).toHaveBeenCalledWith('i-1', { isActive: false });
  });

  it('toggleEightySix calls service', async () => {
    const item = { ...createTestItems()[0], eightySixed: false } as MenuItem;
    await component.toggleEightySix(item);
    expect(menuService.toggleEightySix).toHaveBeenCalledWith('i-1', true, 'Out of stock');
  });

  // --- CSV import/export ---

  it('openImportModal shows modal', () => {
    component.openImportModal();
    expect(component.showImportModal()).toBe(true);
  });

  it('closeImportModal hides modal', () => {
    component.openImportModal();
    component.closeImportModal();
    expect(component.showImportModal()).toBe(false);
  });

  it('exportCsv delegates to service', async () => {
    await component.exportCsv();
    expect(menuService.exportMenuToCsv).toHaveBeenCalled();
  });

  // --- Helpers ---

  it('getCategoryName returns name or Unknown', () => {
    expect(component.getCategoryName('cat-1')).toBe('Mains');
    expect(component.getCategoryName('nonexistent')).toBe('Unknown');
  });

  it('clearLocalError clears error', () => {
    component.clearLocalError();
    expect(component.localError()).toBeNull();
  });

  it('retry reloads menu', () => {
    component.retry();
    expect(menuService.loadMenu).toHaveBeenCalled();
  });
});
