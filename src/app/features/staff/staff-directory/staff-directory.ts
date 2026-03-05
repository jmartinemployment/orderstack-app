import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StaffManagementService } from '@services/staff-management';
import { LaborService } from '@services/labor';
import {
  TeamMember,
  TeamMemberFormData,
  TeamMemberJobFormData,
  OnboardingChecklist,
  OnboardingStep,
} from '@models/index';
import { LoadingSpinner } from '@shared/loading-spinner/loading-spinner';

type ViewMode = 'list' | 'add' | 'edit';

interface JobRow {
  jobTitle: string;
  hourlyRate: number;
  isTipEligible: boolean;
  isPrimary: boolean;
  overtimeEligible: boolean;
}

const EMPTY_JOB: JobRow = {
  jobTitle: '',
  hourlyRate: 0,
  isTipEligible: false,
  isPrimary: true,
  overtimeEligible: true,
};

@Component({
  selector: 'os-staff-directory',
  imports: [CurrencyPipe, DatePipe, FormsModule, LoadingSpinner],
  templateUrl: './staff-directory.html',
  styleUrl: './staff-directory.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffDirectory implements OnInit {
  private readonly staffService = inject(StaffManagementService);
  private readonly laborService = inject(LaborService);

  readonly isLoading = this.staffService.isLoading;
  readonly error = this.staffService.error;
  readonly teamMembers = this.staffService.teamMembers;

  // Clock status: set of teamMemberIds currently clocked in
  private readonly _clockedInIds = signal<Set<string>>(new Set());

  // Onboarding checklists keyed by teamMemberId
  private readonly _checklists = signal<Map<string, OnboardingChecklist>>(new Map());
  private readonly _expandedOnboardingId = signal<string | null>(null);

  readonly expandedOnboardingId = this._expandedOnboardingId.asReadonly();

  // Search / filter
  private readonly _searchQuery = signal('');
  readonly searchQuery = this._searchQuery.asReadonly();

  private readonly _statusFilter = signal<'all' | 'active' | 'inactive'>('all');
  readonly statusFilter = this._statusFilter.asReadonly();

  readonly filteredMembers = computed(() => {
    let members = this.teamMembers();
    const status = this._statusFilter();
    if (status === 'active') members = members.filter(m => m.isActive);
    if (status === 'inactive') members = members.filter(m => !m.isActive);

    const q = this._searchQuery().toLowerCase().trim();
    if (q) {
      members = members.filter(m =>
        m.displayName.toLowerCase().includes(q) ||
        (m.email?.toLowerCase().includes(q) ?? false) ||
        (m.phone?.includes(q) ?? false) ||
        m.role.toLowerCase().includes(q) ||
        m.jobs.some(j => j.jobTitle.toLowerCase().includes(q))
      );
    }
    return members;
  });

  readonly activeCount = computed(() => this.teamMembers().filter(m => m.isActive).length);
  readonly clockedInCount = computed(() => this._clockedInIds().size);

  // View mode
  private readonly _viewMode = signal<ViewMode>('list');
  readonly viewMode = this._viewMode.asReadonly();

  // Form state
  private readonly _editingMemberId = signal<string | null>(null);
  readonly editingMemberId = this._editingMemberId.asReadonly();

  private readonly _formName = signal('');
  private readonly _formEmail = signal('');
  private readonly _formPhone = signal('');
  private readonly _formPasscode = signal('');
  private readonly _formHireDate = signal('');
  private readonly _formJobs = signal<JobRow[]>([{ ...EMPTY_JOB }]);
  private readonly _isSaving = signal(false);
  private readonly _formError = signal<string | null>(null);

  readonly formName = this._formName.asReadonly();
  readonly formEmail = this._formEmail.asReadonly();
  readonly formPhone = this._formPhone.asReadonly();
  readonly formPasscode = this._formPasscode.asReadonly();
  readonly formHireDate = this._formHireDate.asReadonly();
  readonly formJobs = this._formJobs.asReadonly();
  readonly isSaving = this._isSaving.asReadonly();
  readonly formError = this._formError.asReadonly();

  // Toast
  readonly toastMessage = signal<string | null>(null);

  // Delete confirmation
  private readonly _confirmDeleteId = signal<string | null>(null);
  readonly confirmDeleteId = this._confirmDeleteId.asReadonly();

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.staffService.loadTeamMembers(),
      this.loadClockStatus(),
    ]);
  }

  // --- Clock status ---

  private async loadClockStatus(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    await this.laborService.loadTimecards({ status: 'OPEN', startDate: today, endDate: today });
    const openTimecards = this.laborService.timecards();
    this._clockedInIds.set(new Set(openTimecards.filter(tc => tc.status === 'OPEN').map(tc => tc.teamMemberId)));
  }

  isClockedIn(memberId: string): boolean {
    return this._clockedInIds().has(memberId);
  }

  // --- Search / filter ---

  onSearchChange(query: string): void {
    this._searchQuery.set(query);
  }

  setStatusFilter(filter: 'all' | 'active' | 'inactive'): void {
    this._statusFilter.set(filter);
  }

  // --- Onboarding ---

  toggleOnboarding(memberId: string): void {
    if (this._expandedOnboardingId() === memberId) {
      this._expandedOnboardingId.set(null);
      return;
    }
    this._expandedOnboardingId.set(memberId);

    if (!this._checklists().has(memberId)) {
      this.staffService.loadOnboardingChecklist(memberId).then(checklist => {
        if (checklist) {
          this._checklists.update(m => {
            const updated = new Map(m);
            updated.set(memberId, checklist);
            return updated;
          });
        }
      });
    }
  }

  getChecklist(memberId: string): OnboardingChecklist | null {
    return this._checklists().get(memberId) ?? null;
  }

  async toggleOnboardingStep(memberId: string, step: OnboardingStep, isComplete: boolean): Promise<void> {
    const success = await this.staffService.updateOnboardingStep(memberId, step, isComplete);
    if (success) {
      const checklist = await this.staffService.loadOnboardingChecklist(memberId);
      if (checklist) {
        this._checklists.update(m => {
          const updated = new Map(m);
          updated.set(memberId, checklist);
          return updated;
        });
      }
    }
  }

  async sendOnboardingLink(memberId: string): Promise<void> {
    const success = await this.staffService.sendOnboardingLink(memberId);
    if (success) {
      this.showToast('Onboarding link sent');
    }
  }

  getOnboardingBadgeClass(status: string): string {
    if (status === 'complete') return 'badge-success';
    if (status === 'in_progress') return 'badge-warning';
    return 'badge-secondary';
  }

  getOnboardingLabel(status: string): string {
    if (status === 'complete') return 'Complete';
    if (status === 'in_progress') return 'In Progress';
    return 'Not Started';
  }

  // --- Form ---

  openAddForm(): void {
    this._editingMemberId.set(null);
    this._formName.set('');
    this._formEmail.set('');
    this._formPhone.set('');
    this._formPasscode.set('');
    this._formHireDate.set('');
    this._formJobs.set([{ ...EMPTY_JOB }]);
    this._formError.set(null);
    this._viewMode.set('add');
  }

  openEditForm(member: TeamMember): void {
    this._editingMemberId.set(member.id);
    this._formName.set(member.displayName);
    this._formEmail.set(member.email ?? '');
    this._formPhone.set(member.phone ?? '');
    this._formPasscode.set('');
    this._formHireDate.set(member.hireDate ?? '');
    this._formJobs.set(
      member.jobs.length > 0
        ? member.jobs.map(j => ({
            jobTitle: j.jobTitle,
            hourlyRate: j.hourlyRate / 100,
            isTipEligible: j.isTipEligible,
            isPrimary: j.isPrimary,
            overtimeEligible: j.overtimeEligible,
          }))
        : [{ ...EMPTY_JOB }]
    );
    this._formError.set(null);
    this._viewMode.set('edit');
  }

  cancelForm(): void {
    this._viewMode.set('list');
    this._formError.set(null);
  }

  setFormName(v: string): void { this._formName.set(v); }
  setFormEmail(v: string): void { this._formEmail.set(v); }
  setFormPhone(v: string): void { this._formPhone.set(v); }
  setFormPasscode(v: string): void { this._formPasscode.set(v); }
  setFormHireDate(v: string): void { this._formHireDate.set(v); }

  updateJobField(index: number, field: keyof JobRow, value: string | number | boolean): void {
    this._formJobs.update(jobs => {
      const updated = [...jobs];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  addJobRow(): void {
    this._formJobs.update(jobs => [...jobs, { ...EMPTY_JOB, isPrimary: false }]);
  }

  removeJobRow(index: number): void {
    this._formJobs.update(jobs => {
      if (jobs.length <= 1) return jobs;
      return jobs.filter((_, i) => i !== index);
    });
  }

  async submitForm(): Promise<void> {
    const name = this._formName().trim();
    if (!name) {
      this._formError.set('Display name is required');
      return;
    }

    const jobs: TeamMemberJobFormData[] = this._formJobs()
      .filter(j => j.jobTitle.trim())
      .map(j => ({
        jobTitle: j.jobTitle.trim(),
        hourlyRate: Math.round(j.hourlyRate * 100),
        isTipEligible: j.isTipEligible,
        isPrimary: j.isPrimary,
        overtimeEligible: j.overtimeEligible,
      }));

    if (jobs.length === 0) {
      this._formError.set('At least one job with a title is required');
      return;
    }

    this._isSaving.set(true);
    this._formError.set(null);

    const data: TeamMemberFormData = {
      displayName: name,
      email: this._formEmail().trim() || undefined,
      phone: this._formPhone().trim() || undefined,
      passcode: this._formPasscode().trim() || undefined,
      hireDate: this._formHireDate() || undefined,
      jobs,
    };

    let success: boolean;
    const editId = this._editingMemberId();

    if (editId) {
      success = await this.staffService.updateTeamMember(editId, data);
    } else {
      success = await this.staffService.createTeamMember(data);
    }

    this._isSaving.set(false);

    if (success) {
      this._viewMode.set('list');
      this.showToast(editId ? 'Staff member updated' : 'Staff member added');
    } else {
      this._formError.set(this.staffService.error() ?? 'Failed to save');
    }
  }

  // --- Delete ---

  confirmDelete(memberId: string): void {
    this._confirmDeleteId.set(memberId);
  }

  cancelDelete(): void {
    this._confirmDeleteId.set(null);
  }

  async executeDelete(): Promise<void> {
    const id = this._confirmDeleteId();
    if (!id) return;

    this._confirmDeleteId.set(null);
    const success = await this.staffService.deactivateTeamMember(id);
    if (success) {
      this.showToast('Staff member deactivated');
    }
  }

  // --- Helpers ---

  getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      owner: 'Owner',
      manager: 'Manager',
      staff: 'Staff',
      super_admin: 'Admin',
    };
    return labels[role] ?? role;
  }

  getRoleBadgeClass(role: string): string {
    if (role === 'owner' || role === 'super_admin') return 'badge-purple';
    if (role === 'manager') return 'badge-blue';
    return 'badge-gray';
  }

  getPrimaryJobTitle(member: TeamMember): string {
    const primary = member.jobs.find(j => j.isPrimary);
    return primary?.jobTitle ?? member.jobs[0]?.jobTitle ?? '—';
  }

  getPrimaryHourlyRate(member: TeamMember): number {
    const primary = member.jobs.find(j => j.isPrimary);
    return (primary?.hourlyRate ?? member.jobs[0]?.hourlyRate ?? 0) / 100;
  }

  private showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => this.toastMessage.set(null), 2500);
  }

  dismissError(): void {
    this.staffService.clearError();
    this._formError.set(null);
  }
}
