import { Component, inject, signal, effect, ChangeDetectionStrategy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@services/auth';
import { Restaurant } from '@models/index';
import { LoadingSpinner } from '@shared/loading-spinner/loading-spinner';
import { ErrorDisplay } from '@shared/error-display/error-display';
import { environment } from '@environments/environment';

@Component({
  selector: 'os-restaurant-select',
  imports: [LoadingSpinner, ErrorDisplay],
  templateUrl: './restaurant-select.html',
  styleUrl: './restaurant-select.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestaurantSelect {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly selectedRestaurantId = this.authService.selectedRestaurantId;

  private readonly _restaurants = signal<Restaurant[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _restaurantsLoaded = signal(false);

  readonly restaurants = this._restaurants.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly userName = this.authService.user;

  constructor() {
    effect(() => {
      if (this.isAuthenticated() && !this._restaurantsLoaded()) {
        this._restaurantsLoaded.set(true);
        this.loadRestaurants();
      }
    });
  }

  private async loadRestaurants(): Promise<void> {
    const restaurantIds = this.authService.userRestaurants();
    if (restaurantIds.length === 0) {
      this._error.set('No restaurants assigned to your account');
      return;
    }

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const restaurants: Restaurant[] = [];
      for (const id of restaurantIds) {
        const restaurant = await firstValueFrom(
          this.http.get<Restaurant>(`${this.apiUrl}/restaurant/${id}`)
        );
        restaurants.push(restaurant);
      }
      this._restaurants.set(restaurants);
    } catch (err: any) {
      const message = err?.error?.message ?? 'Failed to load restaurants';
      this._error.set(message);
    } finally {
      this._isLoading.set(false);
    }
  }

  selectRestaurant(restaurant: Restaurant): void {
    this.authService.selectRestaurant(restaurant.id, restaurant.name, restaurant.logo);
    this.router.navigate(['/']);
  }

  async logout(): Promise<void> {
    await this.authService.logout();
  }

  clearError(): void {
    this._error.set(null);
  }

  retry(): void {
    this.loadRestaurants();
  }
}
