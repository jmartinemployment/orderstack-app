import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth';
import { environment } from '@environments/environment';
import { Campaign, CampaignFormData, CampaignPerformance } from '../models';

@Injectable({ providedIn: 'root' })
export class MarketingService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private readonly _campaigns = signal<Campaign[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly campaigns = this._campaigns.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly draftCampaigns = computed(() =>
    this._campaigns().filter(c => c.status === 'draft')
  );

  readonly sentCampaigns = computed(() =>
    this._campaigns().filter(c => c.status === 'sent')
  );

  readonly scheduledCampaigns = computed(() =>
    this._campaigns().filter(c => c.status === 'scheduled')
  );

  readonly totalSent = computed(() =>
    this._campaigns().reduce((sum, c) => sum + c.performance.sent, 0)
  );

  readonly avgOpenRate = computed(() => {
    const sent = this.sentCampaigns();
    if (sent.length === 0) return 0;
    const totalOpened = sent.reduce((s, c) => s + c.performance.opened, 0);
    const totalDelivered = sent.reduce((s, c) => s + c.performance.delivered, 0);
    return totalDelivered > 0 ? Math.round((totalOpened / totalDelivered) * 100) : 0;
  });

  readonly totalRevenue = computed(() =>
    this._campaigns().reduce((sum, c) => sum + c.performance.revenueAttributed, 0)
  );

  private get restaurantId(): string {
    return this.authService.selectedRestaurantId() ?? '';
  }

  private get baseUrl(): string {
    return `${environment.apiUrl}/restaurant/${this.restaurantId}`;
  }

  async loadCampaigns(): Promise<void> {
    if (!this.restaurantId) return;
    this._isLoading.set(true);
    this._error.set(null);
    try {
      const campaigns = await firstValueFrom(
        this.http.get<Campaign[]>(`${this.baseUrl}/campaigns`)
      );
      this._campaigns.set(campaigns);
    } catch {
      this._error.set('Failed to load campaigns');
    } finally {
      this._isLoading.set(false);
    }
  }

  async createCampaign(data: CampaignFormData): Promise<Campaign | null> {
    this._error.set(null);
    try {
      const campaign = await firstValueFrom(
        this.http.post<Campaign>(`${this.baseUrl}/campaigns`, data)
      );
      this._campaigns.update(list => [campaign, ...list]);
      return campaign;
    } catch {
      this._error.set('Failed to create campaign');
      return null;
    }
  }

  async updateCampaign(campaignId: string, data: Partial<CampaignFormData>): Promise<void> {
    this._error.set(null);
    try {
      const updated = await firstValueFrom(
        this.http.patch<Campaign>(`${this.baseUrl}/campaigns/${campaignId}`, data)
      );
      this._campaigns.update(list =>
        list.map(c => c.id === campaignId ? updated : c)
      );
    } catch {
      this._error.set('Failed to update campaign');
    }
  }

  async deleteCampaign(campaignId: string): Promise<void> {
    this._error.set(null);
    try {
      await firstValueFrom(
        this.http.delete(`${this.baseUrl}/campaigns/${campaignId}`)
      );
      this._campaigns.update(list => list.filter(c => c.id !== campaignId));
    } catch {
      this._error.set('Failed to delete campaign');
    }
  }

  async sendCampaign(campaignId: string): Promise<void> {
    this._error.set(null);
    try {
      const updated = await firstValueFrom(
        this.http.post<Campaign>(`${this.baseUrl}/campaigns/${campaignId}/send`, {})
      );
      this._campaigns.update(list =>
        list.map(c => c.id === campaignId ? updated : c)
      );
    } catch {
      this._error.set('Failed to send campaign');
    }
  }

  async scheduleCampaign(campaignId: string, scheduledAt: string): Promise<void> {
    this._error.set(null);
    try {
      const updated = await firstValueFrom(
        this.http.post<Campaign>(`${this.baseUrl}/campaigns/${campaignId}/schedule`, { scheduledAt })
      );
      this._campaigns.update(list =>
        list.map(c => c.id === campaignId ? updated : c)
      );
    } catch {
      this._error.set('Failed to schedule campaign');
    }
  }

  async getPerformance(campaignId: string): Promise<CampaignPerformance | null> {
    try {
      return await firstValueFrom(
        this.http.get<CampaignPerformance>(`${this.baseUrl}/campaigns/${campaignId}/performance`)
      );
    } catch {
      return null;
    }
  }

  async getAudienceEstimate(segments: string[], loyaltyTiers: string[]): Promise<number> {
    try {
      const result = await firstValueFrom(
        this.http.post<{ estimatedRecipients: number }>(`${this.baseUrl}/campaigns/audience-estimate`, { segments, loyaltyTiers })
      );
      return result.estimatedRecipients;
    } catch {
      return 0;
    }
  }

  clearError(): void {
    this._error.set(null);
  }
}
