import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CategoryManagement } from './category-management/category-management';
import { ItemManagement } from './item-management/item-management';
import { ModifierManagement } from './modifier-management/modifier-management';

type MenuTab = 'categories' | 'items' | 'modifiers';

@Component({
  selector: 'os-menu-management',
  standalone: true,
  imports: [CategoryManagement, ItemManagement, ModifierManagement],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="os-page-header">
      <h1>Menu Management</h1>
    </div>
    <div class="os-page-content">
      <div class="os-tabs">
        <button class="os-tab" [class.active]="activeTab() === 'categories'" (click)="activeTab.set('categories')">Categories</button>
        <button class="os-tab" [class.active]="activeTab() === 'items'" (click)="activeTab.set('items')">Items</button>
        <button class="os-tab" [class.active]="activeTab() === 'modifiers'" (click)="activeTab.set('modifiers')">Modifiers</button>
      </div>
      <div class="tab-content">
        @if (activeTab() === 'categories') {
          <os-category-management />
        } @else if (activeTab() === 'items') {
          <os-item-management />
        } @else if (activeTab() === 'modifiers') {
          <os-modifier-management />
        }
      </div>
    </div>
  `,
  styles: [`
    .tab-content {
      margin-top: 16px;
    }
  `],
})
export class MenuManagement {
  readonly activeTab = signal<MenuTab>('categories');
}
