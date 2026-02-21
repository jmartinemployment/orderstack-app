import { Injectable, computed, inject, signal } from '@angular/core';
import {
  DeliveryProviderType,
  DeliveryProvider,
  DeliveryContext,
  DeliveryQuote,
  DeliveryDispatchResult,
  DeliveryDriverInfo,
  DoorDashCredentialPayload,
  UberCredentialPayload,
  DeliveryCredentialSummary,
  DeliveryCredentialSecurityMode,
  DeliveryCredentialSecurityProfile,
  MarketplaceProviderType,
  MarketplaceIntegrationsResponse,
  MarketplaceIntegrationSummary,
  MarketplaceIntegrationUpdatePayload,
  MarketplaceMenuMappingsResponse,
  MarketplaceMenuMapping,
  MarketplaceMenuMappingUpsertPayload,
  MarketplaceSyncJobState,
  MarketplaceStatusSyncJobSummary,
  MarketplaceStatusSyncJobsResponse,
  Order,
} from '../models';
import { AuthService } from './auth';
import { environment } from '@environments/environment';
import { DoorDashDeliveryProvider } from './providers/doordash-provider';
import { UberDeliveryProvider } from './providers/uber-provider';

export interface DeliveryConfigStatus {
  doordash: boolean;
  uber: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class DeliveryService {
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  private provider: DeliveryProvider | null = null;

  private readonly _providerType = signal<DeliveryProviderType>('none');
  private readonly _isProcessing = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _currentQuote = signal<DeliveryQuote | null>(null);
  private readonly _driverInfo = signal<DeliveryDriverInfo | null>(null);
  private readonly _configStatus = signal<DeliveryConfigStatus | null>(null);
  private readonly _credentialsSummary = signal<DeliveryCredentialSummary | null>(null);
  private readonly _credentialSecurityProfile = signal<DeliveryCredentialSecurityProfile | null>(null);
  private readonly _marketplaceIntegrations = signal<MarketplaceIntegrationSummary[]>([]);
  private readonly _marketplaceMenuMappings = signal<MarketplaceMenuMapping[]>([]);
  private readonly _marketplaceStatusSyncJobs = signal<MarketplaceStatusSyncJobSummary[]>([]);

  readonly providerType = this._providerType.asReadonly();
  readonly isProcessing = this._isProcessing.asReadonly();
  readonly error = this._error.asReadonly();
  readonly currentQuote = this._currentQuote.asReadonly();
  readonly driverInfo = this._driverInfo.asReadonly();
  readonly configStatus = this._configStatus.asReadonly();
  readonly credentialsSummary = this._credentialsSummary.asReadonly();
  readonly credentialSecurityProfile = this._credentialSecurityProfile.asReadonly();
  readonly marketplaceIntegrations = this._marketplaceIntegrations.asReadonly();
  readonly marketplaceMenuMappings = this._marketplaceMenuMappings.asReadonly();
  readonly marketplaceStatusSyncJobs = this._marketplaceStatusSyncJobs.asReadonly();
  readonly selectedProviderConfigured = computed(() =>
    this.isProviderConfiguredFor(this._providerType())
  );

  private get restaurantId(): string | null {
    return this.authService.selectedRestaurantId();
  }

  private get deliveryContext(): DeliveryContext | null {
    if (!this.restaurantId) return null;
    return { restaurantId: this.restaurantId, apiUrl: this.apiUrl };
  }

  setProviderType(type: DeliveryProviderType): void {
    if (this._providerType() === type && this.provider !== null) return;

    this.provider?.destroy();
    this.provider = null;
    this._providerType.set(type);

    switch (type) {
      case 'doordash':
        this.provider = new DoorDashDeliveryProvider();
        break;
      case 'uber':
        this.provider = new UberDeliveryProvider();
        break;
      case 'self':
      case 'none':
        break;
    }
  }

  isConfigured(): boolean {
    return this.provider !== null && this._providerType() !== 'none' && this._providerType() !== 'self';
  }

  isProviderConfiguredFor(type: DeliveryProviderType): boolean {
    const status = this._configStatus();
    if (!status) return false;
    if (type === 'doordash') return status.doordash;
    if (type === 'uber') return status.uber;
    return false;
  }

  async loadConfigStatus(): Promise<DeliveryConfigStatus | null> {
    if (!this.restaurantId) return null;

    try {
      const response = await fetch(
        `${this.apiUrl}/restaurant/${this.restaurantId}/delivery/config-status`
      );
      if (response.ok) {
        const status: DeliveryConfigStatus = await response.json();
        this._configStatus.set(status);
        return status;
      }
      return this._configStatus();
    } catch {
      // Config status unavailable — non-critical
      return this._configStatus();
    }
  }

  async ensureSelectedProviderConfigured(): Promise<boolean> {
    if (!this.isConfigured()) return false;
    if (this.isProviderConfiguredFor(this._providerType())) return true;
    const status = await this.loadConfigStatus();
    if (!status) return false;
    return this.isProviderConfiguredFor(this._providerType());
  }

  async loadCredentialSummary(): Promise<DeliveryCredentialSummary | null> {
    if (!this.restaurantId) return null;

    try {
      const response = await fetch(
        `${this.apiUrl}/restaurant/${this.restaurantId}/delivery/credentials`,
        { headers: this.buildAuthHeaders() },
      );
      if (!response.ok) {
        this._error.set(await this.readErrorMessage(response, 'Failed to load delivery credentials'));
        return null;
      }
      const summary = await response.json() as DeliveryCredentialSummary;
      this.applyCredentialSummary(summary);
      return summary;
    } catch {
      this._error.set('Failed to load delivery credentials');
      return null;
    }
  }

  async loadCredentialSecurityProfile(): Promise<DeliveryCredentialSecurityProfile | null> {
    if (!this.restaurantId) return null;

    try {
      const response = await fetch(
        `${this.apiUrl}/restaurant/${this.restaurantId}/delivery/credentials/security-profile`,
        { headers: this.buildAuthHeaders() },
      );
      if (!response.ok) {
        this._error.set(await this.readErrorMessage(response, 'Failed to load credential security profile'));
        return null;
      }
      const profile = await response.json() as DeliveryCredentialSecurityProfile;
      this._credentialSecurityProfile.set(profile);
      return profile;
    } catch {
      this._error.set('Failed to load credential security profile');
      return null;
    }
  }

  async saveCredentialSecurityProfile(mode: DeliveryCredentialSecurityMode): Promise<boolean> {
    if (!this.restaurantId) return false;

    this._isProcessing.set(true);
    this._error.set(null);
    try {
      const response = await fetch(
        `${this.apiUrl}/restaurant/${this.restaurantId}/delivery/credentials/security-profile`,
        {
          method: 'PUT',
          headers: this.buildAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ mode }),
        },
      );
      if (!response.ok) {
        this._error.set(await this.readErrorMessage(response, 'Failed to save credential security profile'));
        return false;
      }
      const profile = await response.json() as DeliveryCredentialSecurityProfile;
      this._credentialSecurityProfile.set(profile);
      return true;
    } catch {
      this._error.set('Failed to save credential security profile');
      return false;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async saveDoorDashCredentials(payload: DoorDashCredentialPayload): Promise<boolean> {
    if (!this.restaurantId) return false;

    this._isProcessing.set(true);
    this._error.set(null);
    try {
      const response = await fetch(
        `${this.apiUrl}/restaurant/${this.restaurantId}/delivery/credentials/doordash`,
        {
          method: 'PUT',
          headers: this.buildAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        this._error.set(await this.readErrorMessage(response, 'Failed to save DoorDash credentials'));
        return false;
      }
      const summary = await response.json() as DeliveryCredentialSummary;
      this.applyCredentialSummary(summary);
      return true;
    } catch {
      this._error.set('Failed to save DoorDash credentials');
      return false;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async saveUberCredentials(payload: UberCredentialPayload): Promise<boolean> {
    if (!this.restaurantId) return false;

    this._isProcessing.set(true);
    this._error.set(null);
    try {
      const response = await fetch(
        `${this.apiUrl}/restaurant/${this.restaurantId}/delivery/credentials/uber`,
        {
          method: 'PUT',
          headers: this.buildAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        this._error.set(await this.readErrorMessage(response, 'Failed to save Uber credentials'));
        return false;
      }
      const summary = await response.json() as DeliveryCredentialSummary;
      this.applyCredentialSummary(summary);
      return true;
    } catch {
      this._error.set('Failed to save Uber credentials');
      return false;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async deleteDoorDashCredentials(): Promise<boolean> {
    if (!this.restaurantId) return false;

    this._isProcessing.set(true);
    this._error.set(null);
    try {
      const response = await fetch(
        `${this.apiUrl}/restaurant/${this.restaurantId}/delivery/credentials/doordash`,
        {
          method: 'DELETE',
          headers: this.buildAuthHeaders(),
        },
      );
      if (!response.ok) {
        this._error.set(await this.readErrorMessage(response, 'Failed to delete DoorDash credentials'));
        return false;
      }
      const summary = await response.json() as DeliveryCredentialSummary;
      this.applyCredentialSummary(summary);
      return true;
    } catch {
      this._error.set('Failed to delete DoorDash credentials');
      return false;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async deleteUberCredentials(): Promise<boolean> {
    if (!this.restaurantId) return false;

    this._isProcessing.set(true);
    this._error.set(null);
    try {
      const response = await fetch(
        `${this.apiUrl}/restaurant/${this.restaurantId}/delivery/credentials/uber`,
        {
          method: 'DELETE',
          headers: this.buildAuthHeaders(),
        },
      );
      if (!response.ok) {
        this._error.set(await this.readErrorMessage(response, 'Failed to delete Uber credentials'));
        return false;
      }
      const summary = await response.json() as DeliveryCredentialSummary;
      this.applyCredentialSummary(summary);
      return true;
    } catch {
      this._error.set('Failed to delete Uber credentials');
      return false;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async loadMarketplaceIntegrations(): Promise<MarketplaceIntegrationSummary[] | null> {
    if (!this.restaurantId) return null;

    try {
      const response = await fetch(
        `${this.apiUrl}/restaurant/${this.restaurantId}/marketplace/integrations`,
        { headers: this.buildAuthHeaders() },
      );
      if (!response.ok) {
        this._error.set(await this.readErrorMessage(response, 'Failed to load marketplace integrations'));
        return null;
      }
      const body = await response.json() as MarketplaceIntegrationsResponse;
      this._marketplaceIntegrations.set(body.integrations ?? []);
      return this._marketplaceIntegrations();
    } catch {
      this._error.set('Failed to load marketplace integrations');
      return null;
    }
  }

  async updateMarketplaceIntegration(
    provider: MarketplaceProviderType,
    payload: MarketplaceIntegrationUpdatePayload,
  ): Promise<boolean> {
    if (!this.restaurantId) return false;

    this._isProcessing.set(true);
    this._error.set(null);
    try {
      const response = await fetch(
        `${this.apiUrl}/restaurant/${this.restaurantId}/marketplace/integrations/${provider}`,
        {
          method: 'PUT',
          headers: this.buildAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        this._error.set(await this.readErrorMessage(response, 'Failed to update marketplace integration'));
        return false;
      }
      const summary = await response.json() as MarketplaceIntegrationSummary;
      this.upsertMarketplaceIntegrationSummary(summary);
      return true;
    } catch {
      this._error.set('Failed to update marketplace integration');
      return false;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async clearMarketplaceIntegrationSecret(provider: MarketplaceProviderType): Promise<boolean> {
    if (!this.restaurantId) return false;

    this._isProcessing.set(true);
    this._error.set(null);
    try {
      const response = await fetch(
        `${this.apiUrl}/restaurant/${this.restaurantId}/marketplace/integrations/${provider}/secret`,
        {
          method: 'DELETE',
          headers: this.buildAuthHeaders(),
        },
      );
      if (!response.ok) {
        this._error.set(await this.readErrorMessage(response, 'Failed to clear marketplace integration secret'));
        return false;
      }
      const summary = await response.json() as MarketplaceIntegrationSummary;
      this.upsertMarketplaceIntegrationSummary(summary);
      return true;
    } catch {
      this._error.set('Failed to clear marketplace integration secret');
      return false;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async loadMarketplaceMenuMappings(provider?: MarketplaceProviderType): Promise<MarketplaceMenuMapping[] | null> {
    if (!this.restaurantId) return null;

    try {
      const query = provider ? `?provider=${encodeURIComponent(provider)}` : '';
      const response = await fetch(
        `${this.apiUrl}/restaurant/${this.restaurantId}/marketplace/menu-mappings${query}`,
        { headers: this.buildAuthHeaders() },
      );
      if (!response.ok) {
        this._error.set(await this.readErrorMessage(response, 'Failed to load marketplace menu mappings'));
        return null;
      }
      const body = await response.json() as MarketplaceMenuMappingsResponse;
      this._marketplaceMenuMappings.set(body.mappings ?? []);
      return this._marketplaceMenuMappings();
    } catch {
      this._error.set('Failed to load marketplace menu mappings');
      return null;
    }
  }

  async upsertMarketplaceMenuMapping(payload: MarketplaceMenuMappingUpsertPayload): Promise<boolean> {
    if (!this.restaurantId) return false;

    this._isProcessing.set(true);
    this._error.set(null);
    try {
      const response = await fetch(
        `${this.apiUrl}/restaurant/${this.restaurantId}/marketplace/menu-mappings`,
        {
          method: 'POST',
          headers: this.buildAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        this._error.set(await this.readErrorMessage(response, 'Failed to save marketplace menu mapping'));
        return false;
      }
      const mapping = await response.json() as MarketplaceMenuMapping;
      this.upsertMarketplaceMenuMappingSummary(mapping);
      return true;
    } catch {
      this._error.set('Failed to save marketplace menu mapping');
      return false;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async deleteMarketplaceMenuMapping(mappingId: string): Promise<boolean> {
    if (!this.restaurantId) return false;

    this._isProcessing.set(true);
    this._error.set(null);
    try {
      const response = await fetch(
        `${this.apiUrl}/restaurant/${this.restaurantId}/marketplace/menu-mappings/${mappingId}`,
        {
          method: 'DELETE',
          headers: this.buildAuthHeaders(),
        },
      );
      if (!response.ok) {
        this._error.set(await this.readErrorMessage(response, 'Failed to delete marketplace menu mapping'));
        return false;
      }
      this._marketplaceMenuMappings.update((entries) => entries.filter((entry) => entry.id !== mappingId));
      return true;
    } catch {
      this._error.set('Failed to delete marketplace menu mapping');
      return false;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async loadMarketplaceStatusSyncJobs(options?: {
    status?: MarketplaceSyncJobState;
    limit?: number;
  }): Promise<MarketplaceStatusSyncJobSummary[] | null> {
    if (!this.restaurantId) return null;

    try {
      const params = new URLSearchParams();
      if (options?.status) params.set('status', options.status);
      if (options?.limit) params.set('limit', String(options.limit));
      const query = params.toString();

      const response = await fetch(
        `${this.apiUrl}/restaurant/${this.restaurantId}/marketplace/status-sync/jobs${query ? `?${query}` : ''}`,
        { headers: this.buildAuthHeaders() },
      );
      if (!response.ok) {
        this._error.set(await this.readErrorMessage(response, 'Failed to load marketplace sync jobs'));
        return null;
      }

      const body = await response.json() as MarketplaceStatusSyncJobsResponse;
      this._marketplaceStatusSyncJobs.set(body.jobs ?? []);
      return this._marketplaceStatusSyncJobs();
    } catch {
      this._error.set('Failed to load marketplace sync jobs');
      return null;
    }
  }

  async retryMarketplaceStatusSyncJob(jobId: string): Promise<boolean> {
    if (!this.restaurantId) return false;

    this._isProcessing.set(true);
    this._error.set(null);
    try {
      const response = await fetch(
        `${this.apiUrl}/restaurant/${this.restaurantId}/marketplace/status-sync/jobs/${jobId}/retry`,
        {
          method: 'POST',
          headers: this.buildAuthHeaders(),
        },
      );
      if (!response.ok) {
        this._error.set(await this.readErrorMessage(response, 'Failed to retry marketplace sync job'));
        return false;
      }

      const summary = await response.json() as MarketplaceStatusSyncJobSummary;
      this.upsertMarketplaceStatusSyncJobSummary(summary);
      return true;
    } catch {
      this._error.set('Failed to retry marketplace sync job');
      return false;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async processMarketplaceStatusSyncJobs(limit = 20): Promise<boolean> {
    if (!this.restaurantId) return false;

    this._isProcessing.set(true);
    this._error.set(null);
    try {
      const response = await fetch(
        `${this.apiUrl}/restaurant/${this.restaurantId}/marketplace/status-sync/process`,
        {
          method: 'POST',
          headers: this.buildAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ limit }),
        },
      );
      if (!response.ok) {
        this._error.set(await this.readErrorMessage(response, 'Failed to process marketplace sync jobs'));
        return false;
      }
      return true;
    } catch {
      this._error.set('Failed to process marketplace sync jobs');
      return false;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async retryMarketplaceSyncForOrder(order: Order): Promise<boolean> {
    const marketplace = order.marketplace;
    if (!marketplace) {
      this._error.set('Order is not linked to a marketplace source');
      return false;
    }

    const deadLetterJobs = await this.loadMarketplaceStatusSyncJobs({
      status: 'DEAD_LETTER',
      limit: 200,
    });
    if (deadLetterJobs === null) return false;

    let candidates = deadLetterJobs.filter(job =>
      job.externalOrderId === marketplace.externalOrderId
    );

    if (candidates.length === 0) {
      const failedJobs = await this.loadMarketplaceStatusSyncJobs({
        status: 'FAILED',
        limit: 200,
      });
      if (failedJobs === null) return false;
      candidates = failedJobs.filter(job =>
        job.externalOrderId === marketplace.externalOrderId
      );
    }

    if (candidates.length > 0) {
      candidates.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      const retried = await this.retryMarketplaceStatusSyncJob(candidates[0].id);
      if (!retried) return false;
    }

    return this.processMarketplaceStatusSyncJobs(25);
  }

  async requestQuote(orderId: string): Promise<DeliveryQuote | null> {
    if (!this.provider || !this.deliveryContext) {
      this._error.set('Delivery provider not configured');
      return null;
    }

    this._isProcessing.set(true);
    this._error.set(null);

    try {
      const quote = await this.provider.requestQuote(orderId, this.deliveryContext);
      this._currentQuote.set(quote);
      return quote;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get delivery quote';
      this._error.set(message);
      return null;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async acceptQuote(orderId: string, quoteId: string): Promise<DeliveryDispatchResult | null> {
    if (!this.provider || !this.deliveryContext) {
      this._error.set('Delivery provider not configured');
      return null;
    }

    this._isProcessing.set(true);
    this._error.set(null);

    try {
      const result = await this.provider.acceptQuote(orderId, quoteId, this.deliveryContext);
      this._currentQuote.set(null);
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to dispatch driver';
      this._error.set(message);
      return null;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async cancelDelivery(orderId: string, deliveryExternalId: string): Promise<boolean> {
    if (!this.provider || !this.deliveryContext) return false;

    this._isProcessing.set(true);
    this._error.set(null);

    try {
      return await this.provider.cancelDelivery(orderId, deliveryExternalId, this.deliveryContext);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to cancel delivery';
      this._error.set(message);
      return false;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async getDeliveryStatus(orderId: string, deliveryExternalId: string): Promise<DeliveryDriverInfo | null> {
    if (!this.provider || !this.deliveryContext) return null;

    try {
      const info = await this.provider.getStatus(orderId, deliveryExternalId, this.deliveryContext);
      this._driverInfo.set(info);
      return info;
    } catch {
      return null;
    }
  }

  updateDriverInfo(info: DeliveryDriverInfo): void {
    this._driverInfo.set(info);
  }

  reset(): void {
    // Keep the configured provider; reset is for transient order-level state.
    this._isProcessing.set(false);
    this._error.set(null);
    this._currentQuote.set(null);
    this._driverInfo.set(null);
  }

  clearError(): void {
    this._error.set(null);
  }

  private applyCredentialSummary(summary: DeliveryCredentialSummary): void {
    this._credentialSecurityProfile.set(summary.securityProfile ?? null);
    this._credentialsSummary.set(summary);
    this._configStatus.set({
      doordash: summary.doordash.configured,
      uber: summary.uber.configured,
    });
  }

  private upsertMarketplaceIntegrationSummary(summary: MarketplaceIntegrationSummary): void {
    const next = [...this._marketplaceIntegrations()];
    const index = next.findIndex((entry) => entry.provider === summary.provider);
    if (index >= 0) {
      next[index] = summary;
    } else {
      next.push(summary);
    }
    next.sort((a, b) => a.provider.localeCompare(b.provider));
    this._marketplaceIntegrations.set(next);
  }

  private upsertMarketplaceMenuMappingSummary(summary: MarketplaceMenuMapping): void {
    const next = [...this._marketplaceMenuMappings()];
    const index = next.findIndex((entry) => entry.id === summary.id);
    if (index >= 0) {
      next[index] = summary;
    } else {
      next.push(summary);
    }
    next.sort((a, b) => {
      if (a.provider !== b.provider) return a.provider.localeCompare(b.provider);
      return a.externalItemId.localeCompare(b.externalItemId);
    });
    this._marketplaceMenuMappings.set(next);
  }

  private upsertMarketplaceStatusSyncJobSummary(summary: MarketplaceStatusSyncJobSummary): void {
    const next = [...this._marketplaceStatusSyncJobs()];
    const index = next.findIndex((entry) => entry.id === summary.id);
    if (index >= 0) {
      next[index] = summary;
    } else {
      next.push(summary);
    }
    next.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    this._marketplaceStatusSyncJobs.set(next);
  }

  private buildAuthHeaders(extra: Record<string, string> = {}): HeadersInit {
    const headers: Record<string, string> = { ...extra };
    const token = this.authService.token();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async readErrorMessage(response: Response, fallback: string): Promise<string> {
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      try {
        const body = await response.json() as { error?: string };
        return body.error ?? fallback;
      } catch {
        return fallback;
      }
    }
    try {
      const text = await response.text();
      return text || fallback;
    } catch {
      return fallback;
    }
  }
}
