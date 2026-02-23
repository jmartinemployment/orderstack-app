import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe, DecimalPipe, UpperCasePipe } from '@angular/common';
import { RestaurantSettingsService } from '@services/restaurant-settings';
import { AuthService } from '@services/auth';
import { CoursePacingMode, AIFeatureKey, AIAdminConfig, AIUsageSummary, AI_FEATURE_CATALOG, defaultAiFeatures } from '@models/index';

@Component({
  selector: 'os-ai-settings',
  imports: [FormsModule, CurrencyPipe, DecimalPipe, UpperCasePipe],
  templateUrl: './ai-settings.html',
  styleUrl: './ai-settings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiSettings implements OnInit {
  private readonly settingsService = inject(RestaurantSettingsService);
  private readonly authService = inject(AuthService);

  readonly isLoading = this.settingsService.isLoading;
  readonly isSaving = this.settingsService.isSaving;

  // Local form signals (copy from service on load)
  private readonly _approvalEnabled = signal(true);
  private readonly _timeThresholdHours = signal(12);
  private readonly _valueThresholdDollars = signal(200);
  private readonly _quantityThreshold = signal(20);
  private readonly _coursePacingMode = signal<CoursePacingMode>('disabled');
  private readonly _targetCourseServeGapSeconds = signal(1200);
  private readonly _defaultCourseNames = signal<string[]>(['Appetizer', 'Entree', 'Dessert']);
  private readonly _autoFireFirstCourse = signal(true);
  private readonly _newCourseName = signal('');
  private readonly _orderThrottlingEnabled = signal(false);
  private readonly _maxActiveOrders = signal(18);
  private readonly _maxOverdueOrders = signal(6);
  private readonly _releaseActiveOrders = signal(14);
  private readonly _releaseOverdueOrders = signal(3);
  private readonly _maxHoldMinutes = signal(20);
  private readonly _allowRushThrottle = signal(false);
  private readonly _expoStationEnabled = signal(false);
  private readonly _approvalTimeoutHours = signal(24);
  private readonly _hasUnsavedChanges = signal(false);
  private readonly _showSaveSuccess = signal(false);

  readonly approvalEnabled = this._approvalEnabled.asReadonly();
  readonly timeThresholdHours = this._timeThresholdHours.asReadonly();
  readonly valueThresholdDollars = this._valueThresholdDollars.asReadonly();
  readonly quantityThreshold = this._quantityThreshold.asReadonly();
  readonly coursePacingMode = this._coursePacingMode.asReadonly();
  readonly targetCourseServeGapSeconds = this._targetCourseServeGapSeconds.asReadonly();
  readonly defaultCourseNames = this._defaultCourseNames.asReadonly();
  readonly autoFireFirstCourse = this._autoFireFirstCourse.asReadonly();
  readonly newCourseName = this._newCourseName.asReadonly();
  readonly orderThrottlingEnabled = this._orderThrottlingEnabled.asReadonly();
  readonly maxActiveOrders = this._maxActiveOrders.asReadonly();
  readonly maxOverdueOrders = this._maxOverdueOrders.asReadonly();
  readonly releaseActiveOrders = this._releaseActiveOrders.asReadonly();
  readonly releaseOverdueOrders = this._releaseOverdueOrders.asReadonly();
  readonly maxHoldMinutes = this._maxHoldMinutes.asReadonly();
  readonly allowRushThrottle = this._allowRushThrottle.asReadonly();
  readonly expoStationEnabled = this._expoStationEnabled.asReadonly();
  readonly approvalTimeoutHours = this._approvalTimeoutHours.asReadonly();
  readonly hasUnsavedChanges = this._hasUnsavedChanges.asReadonly();

  readonly coursePacingEnabled = computed(() => this._coursePacingMode() !== 'disabled');

  readonly pacingModeOptions: { value: CoursePacingMode; label: string; description: string }[] = [
    { value: 'disabled', label: 'Disabled', description: 'All items fire immediately when sent to kitchen.' },
    { value: 'server_fires', label: 'Server Fires', description: 'Server manually fires each course from their device.' },
    { value: 'auto_fire_timed', label: 'Auto-Fire Timed', description: 'Next course fires automatically after a delay when the previous course completes.' },
  ];

  readonly currentModeDescription = computed(() =>
    this.pacingModeOptions.find(o => o.value === this._coursePacingMode())?.description ?? ''
  );
  readonly targetCourseServeGapMinutes = computed(() =>
    Math.round(this._targetCourseServeGapSeconds() / 60)
  );
  readonly targetCourseGapDescription = computed(() => {
    const minutes = this.targetCourseServeGapMinutes();
    return `Target gap between completed course and next course landing: ~${minutes} minute${minutes !== 1 ? 's' : ''}.`;
  });
  readonly throttlingDescription = computed(() => {
    if (!this._orderThrottlingEnabled()) {
      return 'Throttling is disabled. New tickets flow immediately to the kitchen queue.';
    }
    return `Auto-hold triggers at ${this._maxActiveOrders()} active or ${this._maxOverdueOrders()} overdue tickets, and resumes below ${this._releaseActiveOrders()} active / ${this._releaseOverdueOrders()} overdue.`;
  });

  readonly timeoutDescription = computed(() => {
    const hours = this._approvalTimeoutHours();
    return `Catering orders awaiting approval will be auto-rejected after ${hours} hour${hours !== 1 ? 's' : ''}.`;
  });
  readonly showSaveSuccess = this._showSaveSuccess.asReadonly();

  readonly isManagerOrAbove = computed(() => {
    const role = this.authService.user()?.role;
    return role === 'owner' || role === 'manager' || role === 'super_admin';
  });

  readonly thresholdDescription = computed(() => {
    const hours = this._timeThresholdHours();
    const dollars = this._valueThresholdDollars();
    const qty = this._quantityThreshold();
    return `Orders scheduled more than ${hours} hours out, over $${dollars}, or with more than ${qty} items will require AI review.`;
  });

  // --- AI Admin (API Key, Feature Toggles, Usage) ---
  readonly featureCatalog = AI_FEATURE_CATALOG;
  readonly aiAdminConfig = this.settingsService.aiAdminConfig;

  private readonly _apiKeyInput = signal('');
  private readonly _showApiKeyModal = signal(false);
  private readonly _showDeleteConfirm = signal(false);
  private readonly _aiAdminLoading = signal(false);
  private readonly _aiAdminSaveSuccess = signal(false);
  private readonly _usageSummary = signal<AIUsageSummary | null>(null);

  readonly apiKeyInput = this._apiKeyInput.asReadonly();
  readonly showApiKeyModal = this._showApiKeyModal.asReadonly();
  readonly showDeleteConfirm = this._showDeleteConfirm.asReadonly();
  readonly aiAdminLoading = this._aiAdminLoading.asReadonly();
  readonly aiAdminSaveSuccess = this._aiAdminSaveSuccess.asReadonly();
  readonly usageSummary = this._usageSummary.asReadonly();

  readonly isOwnerOrAdmin = computed(() => {
    const role = this.authService.user()?.role;
    return role === 'owner' || role === 'super_admin';
  });

  readonly keyStatusClass = computed(() => {
    const config = this.aiAdminConfig();
    if (!config?.apiKeyConfigured) return 'status-red';
    return config.apiKeyValid ? 'status-green' : 'status-yellow';
  });

  readonly keyStatusLabel = computed(() => {
    const config = this.aiAdminConfig();
    if (!config?.apiKeyConfigured) return 'Not configured';
    return config.apiKeyValid ? 'Valid' : 'Unvalidated';
  });

  readonly maskedKey = computed(() => {
    const config = this.aiAdminConfig();
    if (!config?.apiKeyConfigured || !config.apiKeyLastFour) return '';
    return `sk-ant-...${config.apiKeyLastFour}`;
  });

  readonly enabledFeatureCount = computed(() => {
    const config = this.aiAdminConfig();
    if (!config) return 0;
    return Object.values(config.features).filter(Boolean).length;
  });

  readonly totalUsageDollars = computed(() => {
    const usage = this._usageSummary();
    if (!usage) return 0;
    return usage.totalCostCents / 100;
  });

  readonly totalUsageCalls = computed(() => {
    const usage = this._usageSummary();
    if (!usage) return 0;
    return Object.values(usage.byFeature).reduce((sum, f) => sum + (f?.calls ?? 0), 0);
  });

  ngOnInit(): void {
    this.loadFromService();
    this.loadAiAdmin();
  }

  private async loadAiAdmin(): Promise<void> {
    this._aiAdminLoading.set(true);
    await this.settingsService.loadAiAdminConfig();
    const usage = await this.settingsService.loadAiUsage();
    this._usageSummary.set(usage);
    this._aiAdminLoading.set(false);
  }

  private loadFromService(): void {
    const s = this.settingsService.aiSettings();
    this._approvalEnabled.set(s.aiOrderApprovalEnabled);
    this._timeThresholdHours.set(s.timeThresholdHours);
    this._valueThresholdDollars.set(s.valueThresholdDollars);
    this._quantityThreshold.set(s.quantityThreshold);
    this._coursePacingMode.set(s.coursePacingMode);
    this._targetCourseServeGapSeconds.set(this.normalizeTargetCourseServeGapSeconds(s.targetCourseServeGapSeconds));
    this._defaultCourseNames.set(s.defaultCourseNames?.length > 0 ? [...s.defaultCourseNames] : ['Appetizer', 'Entree', 'Dessert']);
    this._autoFireFirstCourse.set(s.autoFireFirstCourse ?? true);
    this._orderThrottlingEnabled.set(s.orderThrottlingEnabled);
    this._maxActiveOrders.set(this.normalizeMaxActiveOrders(s.maxActiveOrders));
    this._maxOverdueOrders.set(this.normalizeMaxOverdueOrders(s.maxOverdueOrders));
    this._releaseActiveOrders.set(this.normalizeReleaseActiveOrders(s.releaseActiveOrders, s.maxActiveOrders));
    this._releaseOverdueOrders.set(this.normalizeReleaseOverdueOrders(s.releaseOverdueOrders, s.maxOverdueOrders));
    this._maxHoldMinutes.set(this.normalizeMaxHoldMinutes(s.maxHoldMinutes));
    this._allowRushThrottle.set(s.allowRushThrottle);
    this._expoStationEnabled.set(s.expoStationEnabled);
    this._approvalTimeoutHours.set(s.approvalTimeoutHours);
    this._hasUnsavedChanges.set(false);
  }

  onApprovalToggle(event: Event): void {
    this._approvalEnabled.set((event.target as HTMLInputElement).checked);
    this._hasUnsavedChanges.set(true);
  }

  onTimeThreshold(event: Event): void {
    this._timeThresholdHours.set(Number.parseInt((event.target as HTMLInputElement).value, 10) || 12);
    this._hasUnsavedChanges.set(true);
  }

  onValueThreshold(event: Event): void {
    this._valueThresholdDollars.set(Number.parseInt((event.target as HTMLInputElement).value, 10) || 200);
    this._hasUnsavedChanges.set(true);
  }

  onQuantityThreshold(event: Event): void {
    this._quantityThreshold.set(Number.parseInt((event.target as HTMLInputElement).value, 10) || 20);
    this._hasUnsavedChanges.set(true);
  }

  onCoursePacingModeChange(value: CoursePacingMode): void {
    this._coursePacingMode.set(value);
    this._hasUnsavedChanges.set(true);
  }

  onTargetCourseServeGapMinutesChange(event: Event): void {
    const rawMinutes = Number.parseInt((event.target as HTMLInputElement).value, 10);
    const minutes = Number.isFinite(rawMinutes) ? rawMinutes : 20;
    this._targetCourseServeGapSeconds.set(this.normalizeTargetCourseServeGapSeconds(minutes * 60));
    this._hasUnsavedChanges.set(true);
  }

  // --- Default Course Names ---

  onNewCourseNameInput(event: Event): void {
    this._newCourseName.set((event.target as HTMLInputElement).value);
  }

  addCourseName(): void {
    const name = this._newCourseName().trim();
    if (!name) return;
    const current = this._defaultCourseNames();
    if (current.some(n => n.toLowerCase() === name.toLowerCase())) return;
    this._defaultCourseNames.set([...current, name]);
    this._newCourseName.set('');
    this._hasUnsavedChanges.set(true);
  }

  removeCourseName(index: number): void {
    this._defaultCourseNames.update(names => names.filter((_, i) => i !== index));
    this._hasUnsavedChanges.set(true);
  }

  moveCourseUp(index: number): void {
    if (index <= 0) return;
    this._defaultCourseNames.update(names => {
      const updated = [...names];
      [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
      return updated;
    });
    this._hasUnsavedChanges.set(true);
  }

  moveCourseDown(index: number): void {
    const names = this._defaultCourseNames();
    if (index >= names.length - 1) return;
    this._defaultCourseNames.update(n => {
      const updated = [...n];
      [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
      return updated;
    });
    this._hasUnsavedChanges.set(true);
  }

  onAutoFireFirstCourseToggle(event: Event): void {
    this._autoFireFirstCourse.set((event.target as HTMLInputElement).checked);
    this._hasUnsavedChanges.set(true);
  }

  onOrderThrottlingToggle(event: Event): void {
    this._orderThrottlingEnabled.set((event.target as HTMLInputElement).checked);
    this._hasUnsavedChanges.set(true);
  }

  onMaxActiveOrdersChange(event: Event): void {
    const value = Number.parseInt((event.target as HTMLInputElement).value, 10);
    const normalized = this.normalizeMaxActiveOrders(value);
    this._maxActiveOrders.set(normalized);
    this._releaseActiveOrders.set(this.normalizeReleaseActiveOrders(this._releaseActiveOrders(), normalized));
    this._hasUnsavedChanges.set(true);
  }

  onMaxOverdueOrdersChange(event: Event): void {
    const value = Number.parseInt((event.target as HTMLInputElement).value, 10);
    const normalized = this.normalizeMaxOverdueOrders(value);
    this._maxOverdueOrders.set(normalized);
    this._releaseOverdueOrders.set(this.normalizeReleaseOverdueOrders(this._releaseOverdueOrders(), normalized));
    this._hasUnsavedChanges.set(true);
  }

  onReleaseActiveOrdersChange(event: Event): void {
    const value = Number.parseInt((event.target as HTMLInputElement).value, 10);
    this._releaseActiveOrders.set(this.normalizeReleaseActiveOrders(value, this._maxActiveOrders()));
    this._hasUnsavedChanges.set(true);
  }

  onReleaseOverdueOrdersChange(event: Event): void {
    const value = Number.parseInt((event.target as HTMLInputElement).value, 10);
    this._releaseOverdueOrders.set(this.normalizeReleaseOverdueOrders(value, this._maxOverdueOrders()));
    this._hasUnsavedChanges.set(true);
  }

  onMaxHoldMinutesChange(event: Event): void {
    const value = Number.parseInt((event.target as HTMLInputElement).value, 10);
    this._maxHoldMinutes.set(this.normalizeMaxHoldMinutes(value));
    this._hasUnsavedChanges.set(true);
  }

  onAllowRushThrottleToggle(event: Event): void {
    this._allowRushThrottle.set((event.target as HTMLInputElement).checked);
    this._hasUnsavedChanges.set(true);
  }

  onApprovalTimeoutChange(event: Event): void {
    const val = Number.parseInt((event.target as HTMLInputElement).value, 10) || 24;
    this._approvalTimeoutHours.set(val);
    this._hasUnsavedChanges.set(true);
  }

  onExpoStationToggle(event: Event): void {
    this._expoStationEnabled.set((event.target as HTMLInputElement).checked);
    this._hasUnsavedChanges.set(true);
  }

  async save(): Promise<void> {
    await this.settingsService.saveAISettings({
      aiOrderApprovalEnabled: this._approvalEnabled(),
      timeThresholdHours: this._timeThresholdHours(),
      valueThresholdDollars: this._valueThresholdDollars(),
      quantityThreshold: this._quantityThreshold(),
      coursePacingMode: this._coursePacingMode(),
      targetCourseServeGapSeconds: this._targetCourseServeGapSeconds(),
      defaultCourseNames: this._defaultCourseNames(),
      autoFireFirstCourse: this._autoFireFirstCourse(),
      orderThrottlingEnabled: this._orderThrottlingEnabled(),
      maxActiveOrders: this._maxActiveOrders(),
      maxOverdueOrders: this._maxOverdueOrders(),
      releaseActiveOrders: this._releaseActiveOrders(),
      releaseOverdueOrders: this._releaseOverdueOrders(),
      maxHoldMinutes: this._maxHoldMinutes(),
      allowRushThrottle: this._allowRushThrottle(),
      expoStationEnabled: this._expoStationEnabled(),
      approvalTimeoutHours: this._approvalTimeoutHours(),
    });
    this._hasUnsavedChanges.set(false);
    this._showSaveSuccess.set(true);
    setTimeout(() => this._showSaveSuccess.set(false), 3000);
  }

  discard(): void {
    this.loadFromService();
  }

  // --- AI Admin actions ---

  openApiKeyModal(): void {
    this._apiKeyInput.set('');
    this._showApiKeyModal.set(true);
  }

  closeApiKeyModal(): void {
    this._showApiKeyModal.set(false);
    this._apiKeyInput.set('');
  }

  onApiKeyInput(event: Event): void {
    this._apiKeyInput.set((event.target as HTMLInputElement).value);
  }

  async submitApiKey(): Promise<void> {
    const key = this._apiKeyInput();
    if (key.length < 10) return;
    await this.settingsService.saveApiKey(key);
    this._showApiKeyModal.set(false);
    this._apiKeyInput.set('');
    this.flashAdminSuccess();
  }

  openDeleteConfirm(): void {
    this._showDeleteConfirm.set(true);
  }

  closeDeleteConfirm(): void {
    this._showDeleteConfirm.set(false);
  }

  async confirmDeleteApiKey(): Promise<void> {
    await this.settingsService.deleteApiKey();
    this._showDeleteConfirm.set(false);
    this.flashAdminSuccess();
  }

  async onFeatureToggle(featureKey: AIFeatureKey, event: Event): Promise<void> {
    const enabled = (event.target as HTMLInputElement).checked;
    await this.settingsService.saveAiFeatures({ [featureKey]: enabled });
    this.flashAdminSuccess();
  }

  async enableAllFeatures(): Promise<void> {
    await this.settingsService.saveAiFeatures(defaultAiFeatures());
    this.flashAdminSuccess();
  }

  async disableAllFeatures(): Promise<void> {
    const allOff: Record<AIFeatureKey, boolean> = {
      aiCostEstimation: false,
      menuEngineering: false,
      salesInsights: false,
      laborOptimization: false,
      inventoryPredictions: false,
      taxEstimation: false,
    };
    await this.settingsService.saveAiFeatures(allOff);
    this.flashAdminSuccess();
  }

  isFeatureEnabled(key: AIFeatureKey): boolean {
    return this.aiAdminConfig()?.features[key] ?? true;
  }

  getCostTierClass(tier: 'high' | 'medium' | 'low'): string {
    switch (tier) {
      case 'high': return 'badge-cost-high';
      case 'medium': return 'badge-cost-medium';
      case 'low': return 'badge-cost-low';
    }
  }

  getFeatureUsage(key: AIFeatureKey): { calls: number; inputTokens: number; outputTokens: number; estimatedCostCents: number } | null {
    const usage = this._usageSummary();
    if (!usage) return null;
    return usage.byFeature[key] ?? null;
  }

  private flashAdminSuccess(): void {
    this._aiAdminSaveSuccess.set(true);
    setTimeout(() => this._aiAdminSaveSuccess.set(false), 3000);
  }

  private normalizeTargetCourseServeGapSeconds(value: number): number {
    const rounded = Math.round(value);
    return Math.max(300, Math.min(3600, rounded));
  }

  private normalizeMaxActiveOrders(value: number): number {
    return Math.max(2, Math.min(120, Math.round(value || 18)));
  }

  private normalizeMaxOverdueOrders(value: number): number {
    return Math.max(1, Math.min(50, Math.round(value || 6)));
  }

  private normalizeReleaseActiveOrders(value: number, maxActiveOrders: number): number {
    const cappedMax = Math.max(1, maxActiveOrders - 1);
    return Math.max(0, Math.min(cappedMax, Math.round(value || 14)));
  }

  private normalizeReleaseOverdueOrders(value: number, maxOverdueOrders: number): number {
    const cappedMax = Math.max(0, maxOverdueOrders - 1);
    return Math.max(0, Math.min(cappedMax, Math.round(value || 3)));
  }

  private normalizeMaxHoldMinutes(value: number): number {
    return Math.max(1, Math.min(180, Math.round(value || 20)));
  }
}
