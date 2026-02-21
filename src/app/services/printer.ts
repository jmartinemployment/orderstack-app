import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Printer, PrinterFormData, PrinterCreateResponse, TestPrintResponse } from '../models';
import { AuthService } from './auth';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PrinterService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  private readonly _printers = signal<Printer[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly printers = this._printers.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  private get restaurantId(): string {
    return this.authService.selectedRestaurantId() ?? '';
  }

  async loadPrinters(): Promise<void> {
    if (!this.restaurantId) return;
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const printers = await firstValueFrom(
        this.http.get<Printer[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/printers`
        )
      );
      this._printers.set(printers);
    } catch {
      this._error.set('Failed to load printers');
    } finally {
      this._isLoading.set(false);
    }
  }

  async createPrinter(data: PrinterFormData): Promise<PrinterCreateResponse | null> {
    if (!this.restaurantId) return null;
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.post<PrinterCreateResponse>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/printers`,
          data
        )
      );
      this._printers.update(printers => {
        let updated = [...printers, response.printer];
        if (response.printer.isDefault) {
          updated = updated.map(p =>
            p.id !== response.printer.id ? { ...p, isDefault: false } : p
          );
        }
        return updated;
      });
      return response;
    } catch {
      this._error.set('Failed to register printer');
      return null;
    }
  }

  async updatePrinter(
    printerId: string,
    data: Partial<Printer>
  ): Promise<Printer | null> {
    if (!this.restaurantId) return null;
    this._error.set(null);

    try {
      const updated = await firstValueFrom(
        this.http.patch<Printer>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/printers/${printerId}`,
          data
        )
      );
      this._printers.update(printers => {
        let list = printers.map(p => (p.id === printerId ? updated : p));
        if (updated.isDefault) {
          list = list.map(p =>
            p.id !== printerId ? { ...p, isDefault: false } : p
          );
        }
        return list;
      });
      return updated;
    } catch {
      this._error.set('Failed to update printer');
      return null;
    }
  }

  async deletePrinter(printerId: string): Promise<boolean> {
    if (!this.restaurantId) return false;
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.delete(
          `${this.apiUrl}/restaurant/${this.restaurantId}/printers/${printerId}`
        )
      );
      this._printers.update(printers =>
        printers.filter(p => p.id !== printerId)
      );
      return true;
    } catch {
      this._error.set('Failed to delete printer');
      return false;
    }
  }

  async testPrint(printerId: string): Promise<TestPrintResponse | null> {
    if (!this.restaurantId) return null;
    this._error.set(null);

    try {
      return await firstValueFrom(
        this.http.post<TestPrintResponse>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/printers/${printerId}/test`,
          {}
        )
      );
    } catch {
      this._error.set('Test print failed');
      return null;
    }
  }
}
