// --- Provider type ---
export type DeliveryProviderType = 'doordash' | 'uber' | 'self' | 'none';

/** Provider types that represent an active DaaS provider (excludes settings sentinels). */
export type ActiveDeliveryProviderType = Exclude<DeliveryProviderType, 'none'>;

/** Client-side dispatch lifecycle state for KDS delivery dispatch UI. */
export type DispatchState = 'idle' | 'quoting' | 'dispatching' | 'dispatched' | 'failed';

// --- DaaS dispatch status (granular, separate from DeliveryInfo.deliveryState) ---
export type DeliveryDispatchStatus =
  | 'QUOTED'
  | 'DISPATCH_REQUESTED'
  | 'DRIVER_ASSIGNED'
  | 'DRIVER_EN_ROUTE_TO_PICKUP'
  | 'DRIVER_AT_PICKUP'
  | 'PICKED_UP'
  | 'DRIVER_EN_ROUTE_TO_DROPOFF'
  | 'DRIVER_AT_DROPOFF'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'FAILED';

// --- Quote response from backend ---
export interface DeliveryQuote {
  provider: DeliveryProviderType;
  quoteId: string;
  fee: number;
  estimatedPickupAt: string;
  estimatedDeliveryAt: string;
  expiresAt: string;
}

// --- Dispatch result from backend ---
export interface DeliveryDispatchResult {
  deliveryExternalId: string;
  trackingUrl: string;
  estimatedDeliveryAt: string;
}

// --- Real-time driver info (ephemeral, from status endpoint) ---
export interface DeliveryDriverInfo {
  name?: string;
  phone?: string;
  photoUrl?: string;
  location?: { lat: number; lng: number };
  estimatedDeliveryAt?: string;
}

export type DeliveryProviderMode = 'production' | 'test';

export interface DoorDashCredentialPayload {
  apiKey?: string;
  signingSecret?: string;
  mode?: DeliveryProviderMode;
}

export interface UberCredentialPayload {
  clientId?: string;
  clientSecret?: string;
  customerId?: string;
  webhookSigningKey?: string;
}

export interface DeliveryCredentialSummary {
  securityProfile: DeliveryCredentialSecurityProfile;
  doordash: {
    configured: boolean;
    hasApiKey: boolean;
    hasSigningSecret: boolean;
    mode: DeliveryProviderMode;
    updatedAt: string | null;
  };
  uber: {
    configured: boolean;
    hasClientId: boolean;
    hasClientSecret: boolean;
    hasCustomerId: boolean;
    hasWebhookSigningKey: boolean;
    updatedAt: string | null;
  };
}

export type DeliveryCredentialSecurityMode = 'free' | 'most_secure';
export type DeliveryCredentialSecurityBackend = 'vault_oss' | 'managed_kms';

export interface DeliveryCredentialSecurityProfile {
  mode: DeliveryCredentialSecurityMode;
  backend: DeliveryCredentialSecurityBackend;
  availableModes: DeliveryCredentialSecurityMode[];
  canUseMostSecure: boolean;
  updatedAt: string | null;
}

export type MarketplaceProviderType = 'doordash_marketplace' | 'ubereats' | 'grubhub';

export interface MarketplaceIntegrationSummary {
  provider: MarketplaceProviderType;
  enabled: boolean;
  externalStoreId: string | null;
  hasWebhookSigningSecret: boolean;
  updatedAt: string | null;
}

export interface MarketplaceIntegrationsResponse {
  integrations: MarketplaceIntegrationSummary[];
}

export interface MarketplaceIntegrationUpdatePayload {
  enabled?: boolean;
  externalStoreId?: string;
  webhookSigningSecret?: string;
}

export interface MarketplaceMenuMapping {
  id: string;
  provider: MarketplaceProviderType;
  externalItemId: string;
  externalItemName: string | null;
  menuItemId: string;
  menuItemName: string;
  updatedAt: string;
}

export interface MarketplaceMenuMappingsResponse {
  mappings: MarketplaceMenuMapping[];
}

export interface MarketplaceMenuMappingUpsertPayload {
  provider: MarketplaceProviderType;
  externalItemId: string;
  externalItemName?: string;
  menuItemId: string;
}

export type MarketplaceSyncJobState =
  | 'QUEUED'
  | 'PROCESSING'
  | 'FAILED'
  | 'SUCCESS'
  | 'DEAD_LETTER';

export interface MarketplaceStatusSyncJobSummary {
  id: string;
  provider: MarketplaceProviderType;
  externalOrderId: string;
  targetStatus: string;
  status: MarketplaceSyncJobState;
  attemptCount: number;
  nextAttemptAt: string;
  completedAt: string | null;
  lastError: string | null;
  updatedAt: string;
}

export interface MarketplaceStatusSyncJobsResponse {
  jobs: MarketplaceStatusSyncJobSummary[];
}

// --- Context passed to provider classes (mirrors PaymentContext) ---
export interface DeliveryContext {
  restaurantId: string;
  apiUrl: string;
}

// --- Provider interface (mirrors PaymentProvider) ---
export interface DeliveryProvider {
  readonly type: ActiveDeliveryProviderType;
  requestQuote(orderId: string, context: DeliveryContext): Promise<DeliveryQuote>;
  acceptQuote(orderId: string, quoteId: string, context: DeliveryContext): Promise<DeliveryDispatchResult>;
  cancelDelivery(orderId: string, deliveryExternalId: string, context: DeliveryContext): Promise<boolean>;
  getStatus(orderId: string, deliveryExternalId: string, context: DeliveryContext): Promise<DeliveryDriverInfo>;
  destroy(): void;
}
