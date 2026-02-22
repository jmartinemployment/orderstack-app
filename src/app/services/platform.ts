import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  MerchantProfile,
  ModeFeatureFlags,
  DevicePosMode,
  BusinessVertical,
  PlatformModule,
  PlatformComplexity,
  MenuTemplate,
  MENU_TEMPLATES,
  getModePreset,
  getModesForVerticals,
  getModulesForVerticals,
  defaultMerchantProfile,
  OnboardingPinData,
  BusinessHoursDay,
  PaymentProcessorType,
} from '../models';
import { AuthService } from './auth';
import { environment } from '@environments/environment';

export interface OnboardingPayload {
  businessName: string;
  address: MerchantProfile['address'];
  verticals: BusinessVertical[];
  primaryVertical: BusinessVertical;
  complexity: PlatformComplexity;
  defaultDeviceMode: DevicePosMode;
  taxLocale: MerchantProfile['taxLocale'];
  businessHours: BusinessHoursDay[];
  paymentProcessor: PaymentProcessorType;
  menuTemplateId: string | null;
  ownerPin: OnboardingPinData;
  ownerEmail: string;
  ownerPassword: string;
}

export interface OnboardingResult {
  restaurantId: string;
  token: string;
  deviceId: string;
  restaurant: Record<string, unknown>;
}

@Injectable({
  providedIn: 'root',
})
export class PlatformService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  private readonly _merchantProfile = signal<MerchantProfile | null>(null);
  private readonly _currentDeviceMode = signal<DevicePosMode>('full_service');
  private readonly _featureFlagOverrides = signal<Partial<ModeFeatureFlags>>({});
  private readonly _menuTemplates = signal<MenuTemplate[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _onboardingStep = signal(1);

  readonly merchantProfile = this._merchantProfile.asReadonly();
  readonly currentDeviceMode = this._currentDeviceMode.asReadonly();
  readonly menuTemplates = this._menuTemplates.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly onboardingStep = this._onboardingStep.asReadonly();

  readonly featureFlags = computed<ModeFeatureFlags>(() => {
    const preset = getModePreset(this._currentDeviceMode());
    const overrides = this._featureFlagOverrides();
    return { ...preset, ...overrides };
  });

  readonly availableModes = computed<DevicePosMode[]>(() => {
    const profile = this._merchantProfile();
    if (!profile) return getModesForVerticals(['food_and_drink']);
    return getModesForVerticals(profile.verticals);
  });

  readonly enabledModules = computed<PlatformModule[]>(() => {
    const profile = this._merchantProfile();
    if (!profile) return getModulesForVerticals(['food_and_drink']);
    return profile.enabledModules;
  });

  readonly isRestaurantMode = computed(() => {
    const mode = this._currentDeviceMode();
    return mode === 'quick_service' || mode === 'full_service' || mode === 'bar';
  });

  readonly isRetailMode = computed(() => this._currentDeviceMode() === 'retail');

  readonly isServiceMode = computed(() => {
    const mode = this._currentDeviceMode();
    return mode === 'services' || mode === 'bookings';
  });

  readonly canUseOpenChecks = computed(() => this.featureFlags().enableOpenChecks);
  readonly canUseFloorPlan = computed(() => this.featureFlags().enableFloorPlan);
  readonly canUseKds = computed(() => this.featureFlags().enableKds);
  readonly canUseCoursing = computed(() => this.featureFlags().enableCoursing);
  readonly canUseTipping = computed(() => this.featureFlags().enableTipping);
  readonly canUseExpoStation = computed(() => this.featureFlags().enableExpoStation);
  readonly canUseAppointments = computed(() => this.featureFlags().enableAppointmentBooking);
  readonly canUseSeatAssignment = computed(() => this.featureFlags().enableSeatAssignment);
  readonly canUseSplitting = computed(() => this.featureFlags().enableCheckSplitting);
  readonly canUseTransfer = computed(() => this.featureFlags().enableCheckTransfer);
  readonly canUsePreAuthTabs = computed(() => this.featureFlags().enablePreAuthTabs);
  readonly canUseOrderNumbers = computed(() => this.featureFlags().enableOrderNumberTracking);

  private get restaurantId(): string {
    return this.authService.selectedRestaurantId() ?? '';
  }

  async loadMerchantProfile(): Promise<void> {
    if (!this.restaurantId) {
      console.warn('[PlatformService] loadMerchantProfile called with no restaurantId');
      return;
    }
    // Skip if already loaded
    if (this._merchantProfile() !== null && this._merchantProfile()!.businessName) return;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.get<MerchantProfile | null>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/merchant-profile`
        )
      );

      if (response) {
        this._merchantProfile.set(response);
        this._currentDeviceMode.set(
          this.resolveDeviceMode(response.defaultDeviceMode)
        );
        this.persistProfile(response);
      } else {
        this.loadFallbackProfile();
      }
    } catch {
      this.loadFallbackProfile();
    } finally {
      this._isLoading.set(false);
    }
  }

  async saveMerchantProfile(profile: Partial<MerchantProfile>): Promise<void> {
    if (!this.restaurantId) {
      console.warn('[PlatformService] saveMerchantProfile called with no restaurantId');
      return;
    }
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const updated = await firstValueFrom(
        this.http.patch<MerchantProfile>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/merchant-profile`,
          profile
        )
      );
      this._merchantProfile.set(updated);
      this.persistProfile(updated);
    } catch {
      this._error.set('Failed to save merchant profile — saved locally only');
      const current = this._merchantProfile();
      if (current) {
        const merged = { ...current, ...profile };
        this._merchantProfile.set(merged);
        this.persistProfile(merged);
      }
    } finally {
      this._isLoading.set(false);
    }
  }

  setDeviceMode(mode: DevicePosMode): void {
    this._currentDeviceMode.set(mode);
    if (this.restaurantId) {
      localStorage.setItem(`${this.restaurantId}-device-mode`, mode);
    }
  }

  setDeviceModeFromDevice(posMode: DevicePosMode, overrides?: Partial<ModeFeatureFlags>): void {
    this._currentDeviceMode.set(posMode);
    if (overrides) {
      this._featureFlagOverrides.set(overrides);
    }
    if (this.restaurantId) {
      localStorage.setItem(`${this.restaurantId}-device-mode`, posMode);
    }
  }

  setFeatureFlagOverrides(overrides: Partial<ModeFeatureFlags>): void {
    this._featureFlagOverrides.set(overrides);
  }

  setOnboardingStep(step: number): void {
    this._onboardingStep.set(step);
  }

  isModuleEnabled(mod: PlatformModule): boolean {
    return this.enabledModules().includes(mod);
  }

  resolveDeviceMode(preferred: DevicePosMode): DevicePosMode {
    const available = this.availableModes();
    if (available.includes(preferred)) return preferred;
    return available[0] ?? 'standard';
  }

  async loadMenuTemplates(vertical?: BusinessVertical): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const params = vertical ? `?vertical=${vertical}` : '';
      const templates = await firstValueFrom(
        this.http.get<MenuTemplate[]>(
          `${this.apiUrl}/platform/menu-templates${params}`
        )
      );
      this._menuTemplates.set(templates);
    } catch {
      // API not available — use hardcoded starter templates
      const fallback = vertical
        ? MENU_TEMPLATES.filter(t => t.vertical === vertical)
        : MENU_TEMPLATES;
      this._menuTemplates.set(fallback);
    } finally {
      this._isLoading.set(false);
    }
  }

  async applyMenuTemplate(templateId: string): Promise<void> {
    if (!this.restaurantId) {
      console.warn('[PlatformService] applyMenuTemplate called with no restaurantId');
      return;
    }
    this._isLoading.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/restaurant/${this.restaurantId}/apply-menu-template`,
          { templateId }
        )
      );
    } catch {
      this._error.set('Failed to apply menu template');
    } finally {
      this._isLoading.set(false);
    }
  }

  async completeOnboarding(payload: OnboardingPayload): Promise<OnboardingResult | null> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.post<OnboardingResult>(
          `${this.apiUrl}/onboarding/create`,
          payload
        )
      );
      this.buildProfileFromPayload(payload);
      localStorage.setItem('onboarding-payload', JSON.stringify(payload));
      if (result.deviceId) {
        localStorage.setItem('device_id', result.deviceId);
      }
      return result;
    } catch {
      this._error.set('Failed to complete onboarding. Please check your connection and try again.');
      return null;
    } finally {
      this._isLoading.set(false);
    }
  }

  private buildProfileFromPayload(payload: OnboardingPayload): void {
    const profile: MerchantProfile = {
      ...defaultMerchantProfile(),
      businessName: payload.businessName,
      address: payload.address,
      verticals: payload.verticals,
      primaryVertical: payload.primaryVertical,
      complexity: payload.complexity,
      defaultDeviceMode: payload.defaultDeviceMode,
      taxLocale: payload.taxLocale,
      businessHours: payload.businessHours,
      enabledModules: getModulesForVerticals(payload.verticals),
    };
    this._merchantProfile.set(profile);
    this._currentDeviceMode.set(payload.defaultDeviceMode);
    this.persistProfile(profile);
  }

  async lookupTaxRate(state: string, zip: string): Promise<number | null> {
    try {
      const result = await firstValueFrom(
        this.http.get<{ taxRate: number }>(
          `${this.apiUrl}/platform/tax-rate?state=${encodeURIComponent(state)}&zip=${encodeURIComponent(zip)}`
        )
      );
      return result.taxRate;
    } catch {
      return null;
    }
  }

  clearError(): void {
    this._error.set(null);
  }

  private loadFallbackProfile(): void {
    if (!this.restaurantId) return;

    const raw = localStorage.getItem(`${this.restaurantId}-merchant-profile`);
    if (raw) {
      try {
        const cached = JSON.parse(raw) as MerchantProfile;
        this._merchantProfile.set(cached);
        this._currentDeviceMode.set(
          this.resolveDeviceMode(cached.defaultDeviceMode)
        );
        return;
      } catch {
        // Fall through to default
      }
    }

    // No profile found — use backward-compatible default (food_and_drink + full_service)
    const savedMode = localStorage.getItem(`${this.restaurantId}-device-mode`) as DevicePosMode | null;
    if (savedMode) {
      this._currentDeviceMode.set(savedMode);
    }
    this._merchantProfile.set(defaultMerchantProfile());
  }

  private persistProfile(profile: MerchantProfile): void {
    if (!this.restaurantId) return;
    localStorage.setItem(
      `${this.restaurantId}-merchant-profile`,
      JSON.stringify(profile)
    );
  }
}
