import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  AISettings,
  OnlinePricingSettings,
  CateringCapacitySettings,
  PaymentSettings,
  PaymentProcessorType,
  TipManagementSettings,
  DeliverySettings,
  TimeclockSettings,
  CapacityBlock,
  AIAdminConfig,
  AIUsageSummary,
  AIFeatureKey,
  NotificationSettings,
  defaultAISettings,
  defaultOnlinePricingSettings,
  defaultCateringCapacitySettings,
  defaultPaymentSettings,
  defaultTipManagementSettings,
  defaultDeliverySettings,
  defaultTimeclockSettings,
  defaultNotificationSettings,
  AutoGratuitySettings,
  defaultAutoGratuitySettings,
  ScanToPaySettings,
  defaultScanToPaySettings,
  SpecialHours,
  BusinessHoursCheck,
} from '../models';
import { Order } from '../models';
import { AuthService } from './auth';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root',
})
export class RestaurantSettingsService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  private readonly _aiSettings = signal<AISettings>(defaultAISettings());
  private readonly _onlinePricingSettings = signal<OnlinePricingSettings>(defaultOnlinePricingSettings());
  private readonly _cateringCapacitySettings = signal<CateringCapacitySettings>(defaultCateringCapacitySettings());
  private readonly _paymentSettings = signal<PaymentSettings>(defaultPaymentSettings());
  private readonly _tipManagementSettings = signal<TipManagementSettings>(defaultTipManagementSettings());
  private readonly _deliverySettings = signal<DeliverySettings>(defaultDeliverySettings());
  private readonly _timeclockSettings = signal<TimeclockSettings>(defaultTimeclockSettings());
  private readonly _autoGratuitySettings = signal<AutoGratuitySettings>(defaultAutoGratuitySettings());
  private readonly _scanToPaySettings = signal<ScanToPaySettings>(defaultScanToPaySettings());
  private readonly _notificationSettings = signal<NotificationSettings>(defaultNotificationSettings());
  private readonly _capacityBlocks = signal<CapacityBlock[]>([]);
  private readonly _cateringOrders = signal<Order[]>([]);
  private readonly _aiAdminConfig = signal<AIAdminConfig | null>(null);
  private readonly _isLoading = signal(false);
  private readonly _isLoadingCatering = signal(false);
  private readonly _isLoadingAiAdmin = signal(false);
  private readonly _isCheckingBusinessHours = signal(false);
  private readonly _isLoadingSpecialHours = signal(false);
  private readonly _isSaving = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly aiSettings = this._aiSettings.asReadonly();
  readonly aiAdminConfig = this._aiAdminConfig.asReadonly();
  readonly onlinePricingSettings = this._onlinePricingSettings.asReadonly();
  readonly cateringCapacitySettings = this._cateringCapacitySettings.asReadonly();
  readonly paymentSettings = this._paymentSettings.asReadonly();
  readonly tipManagementSettings = this._tipManagementSettings.asReadonly();
  readonly deliverySettings = this._deliverySettings.asReadonly();
  readonly timeclockSettings = this._timeclockSettings.asReadonly();
  readonly autoGratuitySettings = this._autoGratuitySettings.asReadonly();
  readonly scanToPaySettings = this._scanToPaySettings.asReadonly();
  readonly notificationSettings = this._notificationSettings.asReadonly();
  readonly capacityBlocks = this._capacityBlocks.asReadonly();
  readonly cateringOrders = this._cateringOrders.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly isSaving = this._isSaving.asReadonly();
  readonly error = this._error.asReadonly();

  private static readonly MIN_TARGET_COURSE_GAP_SECONDS = 300;
  private static readonly MAX_TARGET_COURSE_GAP_SECONDS = 3600;
  private static readonly MIN_MAX_ACTIVE_ORDERS = 2;
  private static readonly MAX_MAX_ACTIVE_ORDERS = 120;
  private static readonly MIN_MAX_OVERDUE_ORDERS = 1;
  private static readonly MAX_MAX_OVERDUE_ORDERS = 50;
  private static readonly MIN_MAX_HOLD_MINUTES = 1;
  private static readonly MAX_MAX_HOLD_MINUTES = 180;

  private get restaurantId(): string {
    return this.authService.selectedRestaurantId() ?? '';
  }

  async loadSettings(): Promise<void> {
    if (!this.restaurantId) return;
    // Prevent concurrent loads — skip if already in progress
    if (this._isLoading()) return;
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.get<Record<string, unknown>>(
          `${this.apiUrl}/restaurant/${this.restaurantId}`
        )
      );

      const aiFromServer = response['aiSettings'] as Partial<AISettings> | undefined;
      const pricingFromServer = response['onlinePricingSettings'] as Partial<OnlinePricingSettings> | undefined;
      const cateringFromServer = response['cateringCapacitySettings'] as Partial<CateringCapacitySettings> | undefined;
      const paymentFromServer = response['paymentSettings'] as Partial<PaymentSettings> | undefined;
      const processorFromServer = response['paymentProcessor'] as PaymentProcessorType | undefined;

      this._aiSettings.set(this.normalizeAISettings({
        ...defaultAISettings(),
        ...this.migrateAISettings(this.readLocalStorage('ai-settings') ?? {}),
        ...this.migrateAISettings((aiFromServer ?? {}) as Record<string, unknown>),
      }));
      this._onlinePricingSettings.set({ ...defaultOnlinePricingSettings(), ...this.readLocalStorage('online-pricing-settings'), ...pricingFromServer });
      this._cateringCapacitySettings.set({ ...defaultCateringCapacitySettings(), ...this.readLocalStorage('catering-capacity-settings'), ...cateringFromServer });
      this._paymentSettings.set({
        ...defaultPaymentSettings(),
        ...this.readLocalStorage('payment-settings'),
        ...paymentFromServer,
        ...(processorFromServer && !paymentFromServer ? { processor: processorFromServer } : {}),
      });

      const tipFromServer = response['tipManagementSettings'] as Partial<TipManagementSettings> | undefined;
      this._tipManagementSettings.set({ ...defaultTipManagementSettings(), ...this.readLocalStorage('tip-management-settings'), ...tipFromServer });

      const deliveryFromServer = response['deliverySettings'] as Partial<DeliverySettings> | undefined;
      this._deliverySettings.set({ ...defaultDeliverySettings(), ...this.readLocalStorage('delivery-settings'), ...deliveryFromServer });

      const timeclockFromServer = response['timeclockSettings'] as Partial<TimeclockSettings> | undefined;
      this._timeclockSettings.set({ ...defaultTimeclockSettings(), ...this.readLocalStorage('timeclock-settings'), ...timeclockFromServer });

      const autoGratuityFromServer = response['autoGratuitySettings'] as Partial<AutoGratuitySettings> | undefined;
      this._autoGratuitySettings.set({ ...defaultAutoGratuitySettings(), ...this.readLocalStorage('auto-gratuity-settings'), ...autoGratuityFromServer });

      const scanToPayFromServer = response['scanToPaySettings'] as Partial<ScanToPaySettings> | undefined;
      this._scanToPaySettings.set({ ...defaultScanToPaySettings(), ...this.readLocalStorage('scan-to-pay-settings'), ...scanToPayFromServer });

      const notificationFromServer = response['notificationSettings'] as Partial<NotificationSettings> | undefined;
      this._notificationSettings.set({ ...defaultNotificationSettings(), ...this.readLocalStorage('notification-settings'), ...notificationFromServer });
    } catch {
      // Backend may not have these fields yet — fall back to localStorage
      this._aiSettings.set(this.normalizeAISettings({
        ...defaultAISettings(),
        ...this.migrateAISettings(this.readLocalStorage('ai-settings') ?? {}),
      }));
      this._onlinePricingSettings.set({ ...defaultOnlinePricingSettings(), ...this.readLocalStorage('online-pricing-settings') });
      this._cateringCapacitySettings.set({ ...defaultCateringCapacitySettings(), ...this.readLocalStorage('catering-capacity-settings') });
      this._paymentSettings.set({ ...defaultPaymentSettings(), ...this.readLocalStorage('payment-settings') });
      this._tipManagementSettings.set({ ...defaultTipManagementSettings(), ...this.readLocalStorage('tip-management-settings') });
      this._deliverySettings.set({ ...defaultDeliverySettings(), ...this.readLocalStorage('delivery-settings') });
      this._timeclockSettings.set({ ...defaultTimeclockSettings(), ...this.readLocalStorage('timeclock-settings') });
      this._autoGratuitySettings.set({ ...defaultAutoGratuitySettings(), ...this.readLocalStorage('auto-gratuity-settings') });
      this._scanToPaySettings.set({ ...defaultScanToPaySettings(), ...this.readLocalStorage('scan-to-pay-settings') });
      this._notificationSettings.set({ ...defaultNotificationSettings(), ...this.readLocalStorage('notification-settings') });
    } finally {
      this.loadCapacityBlocks();
      this._isLoading.set(false);
    }
  }

  async saveAISettings(s: AISettings): Promise<void> {
    if (!this.restaurantId) return;
    this._isSaving.set(true);
    this._error.set(null);
    const normalized = this.normalizeAISettings(s);

    try {
      await firstValueFrom(
        this.http.patch(
          `${this.apiUrl}/restaurant/${this.restaurantId}`,
          { aiSettings: normalized }
        )
      );
    } catch {
      this._error.set('Settings saved locally only — backend sync failed');
    } finally {
      localStorage.setItem(`${this.restaurantId}-ai-settings`, JSON.stringify(normalized));
      this._aiSettings.set(normalized);
      this._isSaving.set(false);
    }
  }

  async saveOnlinePricingSettings(s: OnlinePricingSettings): Promise<void> {
    if (!this.restaurantId) return;
    this._isSaving.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.patch(
          `${this.apiUrl}/restaurant/${this.restaurantId}`,
          { onlinePricingSettings: s }
        )
      );
    } catch {
      this._error.set('Settings saved locally only — backend sync failed');
    } finally {
      localStorage.setItem(`${this.restaurantId}-online-pricing-settings`, JSON.stringify(s));
      this._onlinePricingSettings.set(s);
      this._isSaving.set(false);
    }
  }

  async saveCateringCapacitySettings(s: CateringCapacitySettings): Promise<void> {
    if (!this.restaurantId) return;
    this._isSaving.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.patch(
          `${this.apiUrl}/restaurant/${this.restaurantId}`,
          { cateringCapacitySettings: s }
        )
      );
    } catch {
      this._error.set('Settings saved locally only — backend sync failed');
    } finally {
      localStorage.setItem(`${this.restaurantId}-catering-capacity-settings`, JSON.stringify(s));
      this._cateringCapacitySettings.set(s);
      this._isSaving.set(false);
    }
  }

  async savePaymentSettings(s: PaymentSettings): Promise<void> {
    if (!this.restaurantId) return;
    this._isSaving.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.patch(
          `${this.apiUrl}/restaurant/${this.restaurantId}`,
          { paymentSettings: s }
        )
      );
    } catch {
      this._error.set('Settings saved locally only — backend sync failed');
    } finally {
      localStorage.setItem(`${this.restaurantId}-payment-settings`, JSON.stringify(s));
      this._paymentSettings.set(s);
      this._isSaving.set(false);
    }
  }

  async saveTipManagementSettings(s: TipManagementSettings): Promise<void> {
    if (!this.restaurantId) return;
    this._isSaving.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.patch(
          `${this.apiUrl}/restaurant/${this.restaurantId}`,
          { tipManagementSettings: s }
        )
      );
    } catch {
      this._error.set('Settings saved locally only — backend sync failed');
    } finally {
      localStorage.setItem(`${this.restaurantId}-tip-management-settings`, JSON.stringify(s));
      this._tipManagementSettings.set(s);
      this._isSaving.set(false);
    }
  }

  async saveDeliverySettings(s: DeliverySettings): Promise<void> {
    if (!this.restaurantId) return;
    this._isSaving.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.patch(
          `${this.apiUrl}/restaurant/${this.restaurantId}`,
          { deliverySettings: s }
        )
      );
    } catch {
      this._error.set('Settings saved locally only — backend sync failed');
    } finally {
      localStorage.setItem(`${this.restaurantId}-delivery-settings`, JSON.stringify(s));
      this._deliverySettings.set(s);
      this._isSaving.set(false);
    }
  }

  async saveTimeclockSettings(s: TimeclockSettings): Promise<void> {
    if (!this.restaurantId) return;
    this._isSaving.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.patch(
          `${this.apiUrl}/restaurant/${this.restaurantId}`,
          { timeclockSettings: s }
        )
      );
    } catch {
      this._error.set('Settings saved locally only — backend sync failed');
    } finally {
      localStorage.setItem(`${this.restaurantId}-timeclock-settings`, JSON.stringify(s));
      this._timeclockSettings.set(s);
      this._isSaving.set(false);
    }
  }

  async saveAutoGratuitySettings(s: AutoGratuitySettings): Promise<void> {
    if (!this.restaurantId) return;
    this._isSaving.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.patch(
          `${this.apiUrl}/restaurant/${this.restaurantId}`,
          { autoGratuitySettings: s }
        )
      );
    } catch {
      this._error.set('Settings saved locally only — backend sync failed');
    } finally {
      localStorage.setItem(`${this.restaurantId}-auto-gratuity-settings`, JSON.stringify(s));
      this._autoGratuitySettings.set(s);
      this._isSaving.set(false);
    }
  }

  async saveScanToPaySettings(s: ScanToPaySettings): Promise<void> {
    if (!this.restaurantId) return;
    this._isSaving.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.patch(
          `${this.apiUrl}/restaurant/${this.restaurantId}`,
          { scanToPaySettings: s }
        )
      );
    } catch {
      this._error.set('Settings saved locally only — backend sync failed');
    } finally {
      localStorage.setItem(`${this.restaurantId}-scan-to-pay-settings`, JSON.stringify(s));
      this._scanToPaySettings.set(s);
      this._isSaving.set(false);
    }
  }

  async saveNotificationSettings(s: NotificationSettings): Promise<void> {
    if (!this.restaurantId) return;
    this._isSaving.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.patch(
          `${this.apiUrl}/restaurant/${this.restaurantId}`,
          { notificationSettings: s }
        )
      );
    } catch {
      this._error.set('Settings saved locally only — backend sync failed');
    } finally {
      localStorage.setItem(`${this.restaurantId}-notification-settings`, JSON.stringify(s));
      this._notificationSettings.set(s);
      this._isSaving.set(false);
    }
  }

  async loadCateringOrders(): Promise<void> {
    if (!this.restaurantId) return;
    if (this._isLoadingCatering()) return;
    this._isLoadingCatering.set(true);

    try {
      const orders = await firstValueFrom(
        this.http.get<Order[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/orders?orderType=catering&limit=200`
        )
      );
      this._cateringOrders.set(orders);
    } catch {
      this._error.set('Failed to load catering orders');
    } finally {
      this._isLoadingCatering.set(false);
    }
  }

  addCapacityBlock(block: Omit<CapacityBlock, 'id'>): void {
    const newBlock: CapacityBlock = {
      ...block,
      id: crypto.randomUUID(),
    };
    this._capacityBlocks.update(blocks => [...blocks, newBlock]);
    this.persistCapacityBlocks();
  }

  removeCapacityBlock(blockId: string): void {
    this._capacityBlocks.update(blocks => blocks.filter(b => b.id !== blockId));
    this.persistCapacityBlocks();
  }

  async loadAiAdminConfig(): Promise<void> {
    if (!this.restaurantId) return;
    if (this._isLoadingAiAdmin()) return;
    this._isLoadingAiAdmin.set(true);
    this._error.set(null);

    try {
      const config = await firstValueFrom(
        this.http.get<AIAdminConfig>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/ai-admin/config`
        )
      );
      this._aiAdminConfig.set(config);
    } catch {
      this._error.set('Failed to load AI admin config');
    } finally {
      this._isLoadingAiAdmin.set(false);
    }
  }

  async saveApiKey(apiKey: string): Promise<void> {
    if (!this.restaurantId) return;
    this._isSaving.set(true);
    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.put<{ configured: boolean; keyLastFour: string | null; isValid: boolean }>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/ai-admin/api-key`,
          { apiKey }
        )
      );
      this._aiAdminConfig.update(prev => prev ? {
        ...prev,
        apiKeyConfigured: result.configured,
        apiKeyLastFour: result.keyLastFour,
        apiKeyValid: result.isValid,
      } : null);
    } catch {
      this._error.set('Failed to save API key');
    } finally {
      this._isSaving.set(false);
    }
  }

  async deleteApiKey(): Promise<void> {
    if (!this.restaurantId) return;
    this._isSaving.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.delete(
          `${this.apiUrl}/restaurant/${this.restaurantId}/ai-admin/api-key`
        )
      );
      this._aiAdminConfig.update(prev => prev ? {
        ...prev,
        apiKeyConfigured: false,
        apiKeyLastFour: null,
        apiKeyValid: false,
      } : null);
    } catch {
      this._error.set('Failed to delete API key');
    } finally {
      this._isSaving.set(false);
    }
  }

  async saveAiFeatures(features: Partial<Record<AIFeatureKey, boolean>>): Promise<void> {
    if (!this.restaurantId) return;
    this._isSaving.set(true);
    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.patch<{ features: Record<AIFeatureKey, boolean> }>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/ai-admin/features`,
          features
        )
      );
      this._aiAdminConfig.update(prev => prev ? {
        ...prev,
        features: result.features,
      } : null);
    } catch {
      this._error.set('Failed to save AI features');
    } finally {
      this._isSaving.set(false);
    }
  }

  async loadAiUsage(startDate?: string, endDate?: string): Promise<AIUsageSummary | null> {
    if (!this.restaurantId) return null;

    try {
      let url = `${this.apiUrl}/restaurant/${this.restaurantId}/ai-admin/usage`;
      if (startDate && endDate) {
        url += `?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
      }
      return await firstValueFrom(this.http.get<AIUsageSummary>(url));
    } catch {
      return null;
    }
  }

  clearError(): void {
    this._error.set(null);
  }

  private migrateAISettings(raw: Record<string, unknown>): Partial<AISettings> {
    const migrated: Record<string, unknown> = { ...raw };

    if ('aiCoursePacingEnabled' in migrated && !('coursePacingMode' in migrated)) {
      migrated['coursePacingMode'] = migrated['aiCoursePacingEnabled'] ? 'server_fires' : 'disabled';
    }

    if ('targetCourseServeGapMinutes' in migrated && !('targetCourseServeGapSeconds' in migrated)) {
      const minutes = Number(migrated['targetCourseServeGapMinutes']);
      if (Number.isFinite(minutes)) {
        migrated['targetCourseServeGapSeconds'] = Math.round(minutes * 60);
      }
    }

    return migrated as Partial<AISettings>;
  }

  private normalizeAISettings(raw: Partial<AISettings>): AISettings {
    const defaults = defaultAISettings();
    const mode = raw.coursePacingMode;
    const coursePacingMode =
      mode === 'disabled' || mode === 'server_fires' || mode === 'auto_fire_timed'
        ? mode
        : defaults.coursePacingMode;

    return {
      ...defaults,
      ...raw,
      coursePacingMode,
      targetCourseServeGapSeconds: this.normalizeTargetCourseServeGapSeconds(raw.targetCourseServeGapSeconds),
      orderThrottlingEnabled: Boolean(raw.orderThrottlingEnabled ?? defaults.orderThrottlingEnabled),
      maxActiveOrders: this.normalizeMaxActiveOrders(raw.maxActiveOrders),
      maxOverdueOrders: this.normalizeMaxOverdueOrders(raw.maxOverdueOrders),
      releaseActiveOrders: this.normalizeReleaseActiveOrders(raw.releaseActiveOrders, raw.maxActiveOrders),
      releaseOverdueOrders: this.normalizeReleaseOverdueOrders(raw.releaseOverdueOrders, raw.maxOverdueOrders),
      maxHoldMinutes: this.normalizeMaxHoldMinutes(raw.maxHoldMinutes),
      allowRushThrottle: Boolean(raw.allowRushThrottle ?? defaults.allowRushThrottle),
    };
  }

  private normalizeTargetCourseServeGapSeconds(value: unknown): number {
    const defaults = defaultAISettings().targetCourseServeGapSeconds;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return defaults;

    const rounded = Math.round(parsed);
    return Math.min(
      RestaurantSettingsService.MAX_TARGET_COURSE_GAP_SECONDS,
      Math.max(RestaurantSettingsService.MIN_TARGET_COURSE_GAP_SECONDS, rounded)
    );
  }

  private normalizeMaxActiveOrders(value: unknown): number {
    const defaults = defaultAISettings().maxActiveOrders;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return defaults;
    return Math.min(
      RestaurantSettingsService.MAX_MAX_ACTIVE_ORDERS,
      Math.max(RestaurantSettingsService.MIN_MAX_ACTIVE_ORDERS, Math.round(parsed))
    );
  }

  private normalizeMaxOverdueOrders(value: unknown): number {
    const defaults = defaultAISettings().maxOverdueOrders;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return defaults;
    return Math.min(
      RestaurantSettingsService.MAX_MAX_OVERDUE_ORDERS,
      Math.max(RestaurantSettingsService.MIN_MAX_OVERDUE_ORDERS, Math.round(parsed))
    );
  }

  private normalizeReleaseActiveOrders(value: unknown, maxActiveOrdersRaw: unknown): number {
    const defaults = defaultAISettings().releaseActiveOrders;
    const maxActive = this.normalizeMaxActiveOrders(maxActiveOrdersRaw);
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return Math.min(defaults, Math.max(0, maxActive - 1));
    }
    const rounded = Math.round(parsed);
    return Math.min(Math.max(0, maxActive - 1), Math.max(0, rounded));
  }

  private normalizeReleaseOverdueOrders(value: unknown, maxOverdueOrdersRaw: unknown): number {
    const defaults = defaultAISettings().releaseOverdueOrders;
    const maxOverdue = this.normalizeMaxOverdueOrders(maxOverdueOrdersRaw);
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return Math.min(defaults, Math.max(0, maxOverdue - 1));
    }
    const rounded = Math.round(parsed);
    return Math.min(Math.max(0, maxOverdue - 1), Math.max(0, rounded));
  }

  private normalizeMaxHoldMinutes(value: unknown): number {
    const defaults = defaultAISettings().maxHoldMinutes;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return defaults;
    return Math.min(
      RestaurantSettingsService.MAX_MAX_HOLD_MINUTES,
      Math.max(RestaurantSettingsService.MIN_MAX_HOLD_MINUTES, Math.round(parsed))
    );
  }

  private readLocalStorage(key: string): Record<string, unknown> | undefined {
    if (!this.restaurantId) return undefined;
    const raw = localStorage.getItem(`${this.restaurantId}-${key}`);
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return undefined;
    }
  }

  private loadCapacityBlocks(): void {
    if (!this.restaurantId) return;
    const raw = localStorage.getItem(`${this.restaurantId}-capacity-blocks`);
    if (raw) {
      try {
        this._capacityBlocks.set(JSON.parse(raw) as CapacityBlock[]);
      } catch {
        this._capacityBlocks.set([]);
      }
    }
  }

  private persistCapacityBlocks(): void {
    if (!this.restaurantId) return;
    localStorage.setItem(
      `${this.restaurantId}-capacity-blocks`,
      JSON.stringify(this._capacityBlocks())
    );
  }

  // --- Business Hours (GOS-SPEC-07 Phase 3) ---

  private readonly _specialHours = signal<SpecialHours[]>([]);
  private readonly _businessHoursCheck = signal<BusinessHoursCheck | null>(null);

  readonly specialHours = this._specialHours.asReadonly();
  readonly businessHoursCheck = this._businessHoursCheck.asReadonly();

  async checkBusinessHours(restaurantId: string): Promise<BusinessHoursCheck> {
    if (this._isCheckingBusinessHours()) {
      return this._businessHoursCheck() ?? {
        isOpen: true,
        currentDay: '',
        openTime: null,
        closeTime: null,
        nextOpenDay: null,
        nextOpenTime: null,
        specialHoursReason: null,
      };
    }
    this._isCheckingBusinessHours.set(true);

    try {
      const result = await firstValueFrom(
        this.http.get<BusinessHoursCheck>(`${this.apiUrl}/restaurant/${restaurantId}/business-hours/check`)
      );
      this._businessHoursCheck.set(result);
      return result;
    } catch {
      const fallback: BusinessHoursCheck = {
        isOpen: true,
        currentDay: '',
        openTime: null,
        closeTime: null,
        nextOpenDay: null,
        nextOpenTime: null,
        specialHoursReason: null,
      };
      this._businessHoursCheck.set(fallback);
      return fallback;
    } finally {
      this._isCheckingBusinessHours.set(false);
    }
  }

  async loadSpecialHours(restaurantId: string): Promise<void> {
    if (this._isLoadingSpecialHours()) return;
    this._isLoadingSpecialHours.set(true);

    try {
      const result = await firstValueFrom(
        this.http.get<SpecialHours[]>(`${this.apiUrl}/restaurant/${restaurantId}/special-hours`)
      );
      this._specialHours.set(result);
    } catch {
      this._specialHours.set([]);
    } finally {
      this._isLoadingSpecialHours.set(false);
    }
  }
}
