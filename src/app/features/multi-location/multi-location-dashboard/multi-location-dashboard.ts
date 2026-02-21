import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { CurrencyPipe, DecimalPipe, DatePipe, PercentPipe } from '@angular/common';
import { MultiLocationService } from '@services/multi-location';
import { AuthService } from '@services/auth';
import {
  MultiLocationTab,
  LocationGroup,
  LocationGroupFormData,
  LocationGroupMember,
  LocationKpi,
  MenuSyncResult,
  UserRestaurant,
} from '@models/index';

@Component({
  selector: 'os-multi-location',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe, DatePipe, PercentPipe],
  templateUrl: './multi-location-dashboard.html',
  styleUrl: './multi-location-dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MultiLocationDashboard implements OnInit {
  private readonly mlService = inject(MultiLocationService);
  private readonly authService = inject(AuthService);

  readonly activeTab = signal<MultiLocationTab>('overview');
  readonly groups = this.mlService.groups;
  readonly groupMembers = this.mlService.groupMembers;
  readonly crossLocationReport = this.mlService.crossLocationReport;
  readonly syncPreview = this.mlService.syncPreview;
  readonly syncHistory = this.mlService.syncHistory;
  readonly isLoading = this.mlService.isLoading;
  readonly isSyncing = this.mlService.isSyncing;
  readonly isPropagating = this.mlService.isPropagating;
  readonly error = this.mlService.error;

  readonly restaurants = this.authService.restaurants;
  readonly currentRestaurantId = this.authService.selectedRestaurantId;
  readonly currentRestaurantName = this.authService.selectedRestaurantName;

  // Report period
  readonly reportDays = signal(30);

  // Group form
  readonly showGroupForm = signal(false);
  readonly editingGroup = signal<LocationGroup | null>(null);
  readonly groupName = signal('');
  readonly groupDescription = signal('');
  readonly selectedMemberIds = signal<Set<string>>(new Set());
  readonly isSavingGroup = signal(false);

  // Group detail
  readonly expandedGroupId = signal<string | null>(null);

  // Menu sync
  readonly syncSourceId = signal('');
  readonly syncTargetIds = signal<Set<string>>(new Set());
  readonly showSyncConfirm = signal(false);

  // Settings propagation
  readonly propagateType = signal<string>('');
  readonly propagateSourceId = signal('');
  readonly propagateTargetIds = signal<Set<string>>(new Set());
  readonly propagateOverride = signal(false);

  // Sorted location KPIs
  readonly sortField = signal<string>('revenue');
  readonly sortAsc = signal(false);

  readonly sortedLocations = computed(() => {
    const report = this.crossLocationReport();
    if (!report) return [];
    const field = this.sortField();
    const asc = this.sortAsc();
    return [...report.locations].sort((a, b) => {
      const av = (a as unknown as Record<string, number>)[field];
      const bv = (b as unknown as Record<string, number>)[field];
      return asc ? av - bv : bv - av;
    });
  });

  // Best/worst performers
  readonly topPerformer = computed(() => {
    const locs = this.sortedLocations();
    return locs.length > 0 ? locs[0] : null;
  });

  readonly bottomPerformer = computed(() => {
    const locs = this.sortedLocations();
    return locs.length > 1 ? locs.at(-1) ?? null : null;
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.mlService.loadGroups(),
      this.mlService.loadCrossLocationReport(this.reportDays()),
      this.mlService.loadSyncHistory(),
    ]);
  }

  setTab(tab: MultiLocationTab): void {
    this.activeTab.set(tab);
  }

  dismissError(): void {
    this.mlService.clearError();
  }

  // ── Report ──

  async changeReportDays(days: number): Promise<void> {
    this.reportDays.set(days);
    await this.mlService.loadCrossLocationReport(days);
  }

  toggleSort(field: string): void {
    if (this.sortField() === field) {
      this.sortAsc.update(v => !v);
    } else {
      this.sortField.set(field);
      this.sortAsc.set(false);
    }
  }

  getSortIcon(field: string): string {
    if (this.sortField() !== field) return 'bi-arrow-down-up';
    return this.sortAsc() ? 'bi-sort-up' : 'bi-sort-down';
  }

  getKpiClass(value: number, type: 'revenue' | 'cost'): string {
    if (type === 'revenue') return value > 0 ? 'kpi-positive' : 'kpi-neutral';
    if (value <= 28) return 'kpi-good';
    if (value <= 35) return 'kpi-warning';
    return 'kpi-danger';
  }

  // ── Groups ──

  openGroupForm(group?: LocationGroup): void {
    if (group) {
      this.editingGroup.set(group);
      this.groupName.set(group.name);
      this.groupDescription.set(group.description ?? '');
      const members = this.groupMembers().get(group.id) ?? [];
      this.selectedMemberIds.set(new Set(members.map(m => m.restaurantId)));
    } else {
      this.editingGroup.set(null);
      this.groupName.set('');
      this.groupDescription.set('');
      this.selectedMemberIds.set(new Set());
    }
    this.showGroupForm.set(true);
  }

  closeGroupForm(): void {
    this.showGroupForm.set(false);
    this.editingGroup.set(null);
  }

  toggleMemberId(id: string): void {
    this.selectedMemberIds.update(set => {
      const updated = new Set(set);
      if (updated.has(id)) updated.delete(id);
      else updated.add(id);
      return updated;
    });
  }

  isMemberSelected(id: string): boolean {
    return this.selectedMemberIds().has(id);
  }

  async saveGroup(): Promise<void> {
    if (!this.groupName()) return;
    this.isSavingGroup.set(true);
    const data: LocationGroupFormData = {
      name: this.groupName(),
      description: this.groupDescription() || undefined,
      restaurantIds: [...this.selectedMemberIds()],
    };

    const editing = this.editingGroup();
    if (editing) {
      await this.mlService.updateGroup(editing.id, data);
    } else {
      await this.mlService.createGroup(data);
    }
    this.isSavingGroup.set(false);
    this.closeGroupForm();
  }

  async deleteGroup(group: LocationGroup): Promise<void> {
    await this.mlService.deleteGroup(group.id);
  }

  toggleGroupExpand(groupId: string): void {
    if (this.expandedGroupId() === groupId) {
      this.expandedGroupId.set(null);
    } else {
      this.expandedGroupId.set(groupId);
      this.mlService.loadGroupMembers(groupId);
    }
  }

  getGroupMembers(groupId: string): LocationGroupMember[] {
    return this.groupMembers().get(groupId) ?? [];
  }

  async removeGroupMember(groupId: string, memberId: string): Promise<void> {
    await this.mlService.removeMember(groupId, memberId);
  }

  // ── Menu Sync ──

  toggleSyncTarget(id: string): void {
    this.syncTargetIds.update(set => {
      const updated = new Set(set);
      if (updated.has(id)) updated.delete(id);
      else updated.add(id);
      return updated;
    });
  }

  isSyncTarget(id: string): boolean {
    return this.syncTargetIds().has(id);
  }

  get canPreviewSync(): boolean {
    return !!this.syncSourceId() && this.syncTargetIds().size > 0;
  }

  async previewSync(): Promise<void> {
    if (!this.canPreviewSync) return;
    await this.mlService.previewMenuSync(
      this.syncSourceId(),
      [...this.syncTargetIds()]
    );
  }

  cancelSync(): void {
    this.mlService.clearSyncPreview();
    this.showSyncConfirm.set(false);
  }

  async executeSync(): Promise<void> {
    const result = await this.mlService.executeMenuSync(
      this.syncSourceId(),
      [...this.syncTargetIds()]
    );
    if (result) {
      this.syncSourceId.set('');
      this.syncTargetIds.set(new Set());
      this.showSyncConfirm.set(false);
    }
  }

  getRestaurantName(id: string): string {
    return this.restaurants().find(r => r.id === id)?.name ?? 'Unknown';
  }

  getSyncTargetRestaurants(): UserRestaurant[] {
    const sourceId = this.syncSourceId();
    return this.restaurants().filter(r => r.id !== sourceId);
  }

  // ── Settings Propagation ──

  togglePropagateTarget(id: string): void {
    this.propagateTargetIds.update(set => {
      const updated = new Set(set);
      if (updated.has(id)) updated.delete(id);
      else updated.add(id);
      return updated;
    });
  }

  isPropagateTarget(id: string): boolean {
    return this.propagateTargetIds().has(id);
  }

  getPropagateTargetRestaurants(): UserRestaurant[] {
    const sourceId = this.propagateSourceId();
    return this.restaurants().filter(r => r.id !== sourceId);
  }

  get canPropagate(): boolean {
    return !!this.propagateType() && !!this.propagateSourceId() && this.propagateTargetIds().size > 0;
  }

  async propagateSettings(): Promise<void> {
    if (!this.canPropagate) return;
    await this.mlService.propagateSettings({
      settingType: this.propagateType() as 'ai' | 'pricing' | 'loyalty' | 'delivery' | 'payment',
      sourceRestaurantId: this.propagateSourceId(),
      targetRestaurantIds: [...this.propagateTargetIds()],
      overrideExisting: this.propagateOverride(),
    });
    this.propagateType.set('');
    this.propagateSourceId.set('');
    this.propagateTargetIds.set(new Set());
    this.propagateOverride.set(false);
  }

  getSettingTypeLabel(type: string): string {
    switch (type) {
      case 'ai': return 'AI Settings';
      case 'pricing': return 'Pricing Rules';
      case 'loyalty': return 'Loyalty Config';
      case 'delivery': return 'Delivery Settings';
      case 'payment': return 'Payment Settings';
      default: return type;
    }
  }
}
