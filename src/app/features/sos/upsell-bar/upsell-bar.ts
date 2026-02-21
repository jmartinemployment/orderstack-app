import { Component, inject, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { MenuItem, UpsellSuggestion } from '@models/index';
import { CartService } from '@services/cart';

@Component({
  selector: 'os-upsell-bar',
  imports: [CurrencyPipe],
  templateUrl: './upsell-bar.html',
  styleUrl: './upsell-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsellBar {
  private readonly cartService = inject(CartService);

  suggestions = input<UpsellSuggestion[]>([]);
  fallbackItems = input<MenuItem[]>([]);
  title = input<string>('Add to your order?');
  isLoading = input<boolean>(false);

  itemAdded = output<MenuItem>();

  readonly isEmpty = this.cartService.isEmpty;

  addItem(item: MenuItem): void {
    this.cartService.addItem(item);
    this.itemAdded.emit(item);
  }
}
