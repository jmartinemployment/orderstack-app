import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  output,
  DestroyRef,
} from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { LaborService } from '@services/labor';
import { StaffManagementService } from '@services/staff-management';
import { AuthService } from '@services/auth';
import { DeviceService } from '@services/device';
import { PlatformService } from '@services/platform';
import { RestaurantSettingsService } from '@services/restaurant-settings';
import { TeamMember, PosSession, Timecard, BreakType, Shift } from '@models/index';

export interface PosLoginEvent {
  teamMember: TeamMember;
  session: PosSession;
}

type PosLoginState = 'idle' | 'entering-passcode' | 'clock-in-prompt' | 'authenticated';

@Component({
  selector: 'os-pos-login',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe],
  templateUrl: './pos-login.html',
  styleUrl: './pos-login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PosLogin {
  private readonly router = inject(Router);
  private readonly laborService = inject(LaborService);
  private readonly staffService = inject(StaffManagementService);
  private readonly authService = inject(AuthService);
  private readonly deviceService = inject(DeviceService);
  private readonly platformService = inject(PlatformService);
  private readonly settingsService = inject(RestaurantSettingsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly teamMemberAuthenticated = output<PosLoginEvent>();

  // --- State ---
  private readonly _state = signal<PosLoginState>('idle');
  private readonly _teamMembers = signal<TeamMember[]>([]);
  private readonly _selectedMember = signal<TeamMember | null>(null);
  private readonly _passcodeDigits = signal('');
  private readonly _error = signal<string | null>(null);
  private readonly _isValidating = signal(false);
  private readonly _failedAttempts = signal(0);
  private readonly _lockoutUntil = signal<number | null>(null);
  private readonly _session = signal<PosSession | null>(null);
  private readonly _activeTimecard = signal<Timecard | null>(null);
  private readonly _selectedJobTitle = signal<string | null>(null);
  private readonly _isClockingIn = signal(false);
  private _inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000;
  private readonly MAX_ATTEMPTS = 5;
  private readonly LOCKOUT_MS = 30 * 1000;

  // --- Clock-out, break, job-switch state ---
  private readonly _breakTypes = signal<BreakType[]>([]);
  private readonly _showClockOutModal = signal(false);
  private readonly _declaredTips = signal<number | null>(null);
  private readonly _isClockAction = signal(false);
  private readonly _showJobSwitcher = signal(false);
  private readonly _switchJobTitle = signal<string | null>(null);

  // --- Schedule enforcement ---
  private readonly _scheduleWarning = signal<string | null>(null);
  private readonly _showManagerOverride = signal(false);
  private readonly _managerOverridePin = signal('');
  private readonly _todayShifts = signal<Shift[]>([]);

  // --- Auto clock-out timer ---
  private autoClockOutTimer: ReturnType<typeof setTimeout> | null = null;

  readonly state = this._state.asReadonly();
  readonly teamMembers = this._teamMembers.asReadonly();
  readonly selectedMember = this._selectedMember.asReadonly();
  readonly passcodeDigits = this._passcodeDigits.asReadonly();
  readonly error = this._error.asReadonly();
  readonly isValidating = this._isValidating.asReadonly();
  readonly session = this._session.asReadonly();
  readonly activeTimecard = this._activeTimecard.asReadonly();
  readonly selectedJobTitle = this._selectedJobTitle.asReadonly();
  readonly isClockingIn = this._isClockingIn.asReadonly();
  readonly breakTypes = this._breakTypes.asReadonly();
  readonly showClockOutModal = this._showClockOutModal.asReadonly();
  readonly declaredTips = this._declaredTips.asReadonly();
  readonly isClockAction = this._isClockAction.asReadonly();
  readonly showJobSwitcher = this._showJobSwitcher.asReadonly();
  readonly switchJobTitle = this._switchJobTitle.asReadonly();
  readonly scheduleWarning = this._scheduleWarning.asReadonly();
  readonly showManagerOverride = this._showManagerOverride.asReadonly();
  readonly managerOverridePin = this._managerOverridePin.asReadonly();

  readonly isLocked = computed(() => {
    const until = this._lockoutUntil();
    return until !== null && Date.now() < until;
  });

  readonly lockoutSecondsRemaining = computed(() => {
    const until = this._lockoutUntil();
    if (until === null) return 0;
    return Math.max(0, Math.ceil((until - Date.now()) / 1000));
  });

  readonly passcodeLength = computed(() => {
    const member = this._selectedMember();
    return member?.passcode?.length ?? 6;
  });

  readonly passcodeDots = computed(() => {
    const len = this._passcodeDigits().length;
    return Array.from({ length: this.passcodeLength() }, (_, i) => i < len);
  });

  readonly activeTeamMembers = computed(() =>
    this._teamMembers().filter(m => m.status === 'active')
  );

  readonly memberJobs = computed(() => {
    const member = this._selectedMember();
    return member?.jobs ?? [];
  });

  readonly needsJobSelection = computed(() => this.memberJobs().length > 1);

  // --- Clock-out / break computeds ---

  readonly isClockedIn = computed(() => this._activeTimecard() !== null);

  readonly activeBreak = computed(() => {
    const tc = this._activeTimecard();
    if (!tc) return null;
    return tc.breaks.find(b => b.endAt === null) ?? null;
  });

  readonly isOnBreak = computed(() => this.activeBreak() !== null);

  readonly clockedInDuration = computed(() => {
    const tc = this._activeTimecard();
    if (!tc) return '';
    const start = new Date(tc.clockInAt);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const hours = Math.floor(diffMs / 3600000);
    const mins = Math.floor((diffMs % 3600000) / 60000);
    return `${hours}h ${mins}m`;
  });

  readonly breakElapsedMinutes = computed(() => {
    const brk = this.activeBreak();
    if (!brk) return 0;
    const start = new Date(brk.startAt);
    const now = new Date();
    return Math.floor((now.getTime() - start.getTime()) / 60000);
  });

  readonly shiftSummary = computed(() => {
    const tc = this._activeTimecard();
    if (!tc) return null;

    const clockIn = new Date(tc.clockInAt);
    const now = new Date();
    const totalMs = now.getTime() - clockIn.getTime();
    const totalMinutes = Math.floor(totalMs / 60000);
    const totalHours = totalMinutes / 60;

    const breakMinutes = tc.breaks.reduce((sum, b) => {
      if (b.endAt) {
        return sum + (b.actualMinutes ?? Math.floor((new Date(b.endAt).getTime() - new Date(b.startAt).getTime()) / 60000));
      }
      return sum;
    }, 0);

    const paidBreakMinutes = tc.breaks.filter(b => b.isPaid && b.endAt).reduce((sum, b) => {
      return sum + (b.actualMinutes ?? Math.floor((new Date(b.endAt!).getTime() - new Date(b.startAt).getTime()) / 60000));
    }, 0);

    const unpaidBreakMinutes = breakMinutes - paidBreakMinutes;
    const netPaidMinutes = totalMinutes - unpaidBreakMinutes;
    const netPaidHours = netPaidMinutes / 60;

    return {
      clockInTime: this.formatTimecardTime(tc.clockInAt),
      clockOutTime: this.formatTimecardTime(now.toISOString()),
      totalHours,
      breakMinutes,
      paidBreakMinutes,
      unpaidBreakMinutes,
      netPaidHours,
      breaks: tc.breaks.filter(b => b.endAt !== null),
      jobTitle: tc.jobTitle,
      hourlyRate: tc.hourlyRate,
      isTipEligible: tc.isTipEligible,
      estimatedPay: netPaidHours * (tc.hourlyRate / 100),
    };
  });

  readonly canSwitchJob = computed(() => {
    const member = this._selectedMember();
    return (member?.jobs?.length ?? 0) > 1 && this.isClockedIn();
  });

  readonly activeBreakTypes = computed(() =>
    this._breakTypes().filter(bt => bt.isActive)
  );

  constructor() {
    this.loadTeamMembers();

    this.destroyRef.onDestroy(() => {
      this.clearInactivityTimer();
      this.clearAutoClockOutTimer();
    });
  }

  private async loadTeamMembers(): Promise<void> {
    await this.staffService.loadTeamMembers();
    const members = this.staffService.teamMembers();

    if (members.length > 0) {
      this._teamMembers.set(members);
      return;
    }

    // No team members from API — seed owner from onboarding data
    const raw = localStorage.getItem('onboarding-payload');
    if (raw) {
      try {
        const payload = JSON.parse(raw) as { ownerPin?: { displayName: string; pin: string; role: string }; ownerEmail?: string };
        if (payload.ownerPin) {
          const ownerMember: TeamMember = {
            id: 'owner-local',
            restaurantId: this.authService.selectedRestaurantId() ?? '',
            displayName: payload.ownerPin.displayName,
            email: payload.ownerEmail ?? null,
            phone: null,
            passcode: payload.ownerPin.pin,
            firstName: null,
            lastName: null,
            role: 'owner',
            isActive: true,
            lastLoginAt: null,
            jobs: [{
              id: 'owner-job',
              teamMemberId: 'owner-local',
              jobTitle: 'Owner',
              hourlyRate: 0,
              isTipEligible: false,
              isPrimary: true,
              overtimeEligible: false,
            }],
            permissionSetId: null,
            permissionSetName: null,
            assignedLocationIds: [],
            avatarUrl: null,
            hireDate: null,
            status: 'active',
            createdAt: new Date().toISOString(),
            staffPinId: null,
          };
          this._teamMembers.set([ownerMember]);
        }
      } catch {
        // Corrupt onboarding data
      }
    }
  }

  // === Team Member Selection ===

  selectMember(member: TeamMember): void {
    if (this.isLocked()) return;

    this._selectedMember.set(member);
    this._passcodeDigits.set('');
    this._error.set(null);
    this._state.set('entering-passcode');
  }

  backToGrid(): void {
    this._selectedMember.set(null);
    this._passcodeDigits.set('');
    this._error.set(null);
    this._state.set('idle');
  }

  // === Passcode Entry ===

  onDigit(digit: string): void {
    if (this.isLocked() || this._isValidating()) return;

    const maxLen = this.passcodeLength();
    const current = this._passcodeDigits();
    if (current.length >= maxLen) return;

    const updated = current + digit;
    this._passcodeDigits.set(updated);
    this._error.set(null);

    if (updated.length === maxLen) {
      this.attemptLogin(updated);
    }
  }

  onBackspace(): void {
    this._passcodeDigits.update(d => d.slice(0, -1));
    this._error.set(null);
  }

  onClear(): void {
    this._passcodeDigits.set('');
    this._error.set(null);
  }

  private async attemptLogin(passcode: string): Promise<void> {
    this._isValidating.set(true);
    this._error.set(null);

    const session = await this.laborService.posLogin(passcode);

    if (session) {
      this._session.set(session);
      this._failedAttempts.set(0);
      this._lockoutUntil.set(null);

      if (session.clockedIn && session.activeTimecardId) {
        const timecard = await this.laborService.getTimecard(session.activeTimecardId);
        this._activeTimecard.set(timecard);
        this.completeAuthentication();
      } else {
        this._state.set('clock-in-prompt');
      }
    } else {
      const attempts = this._failedAttempts() + 1;
      this._failedAttempts.set(attempts);

      if (attempts >= this.MAX_ATTEMPTS) {
        this._lockoutUntil.set(Date.now() + this.LOCKOUT_MS);
        this._error.set(`Too many attempts. Locked for ${this.LOCKOUT_MS / 1000}s.`);
        this._state.set('idle');
        this._selectedMember.set(null);

        setTimeout(() => {
          this._lockoutUntil.set(null);
          this._failedAttempts.set(0);
          this._error.set(null);
        }, this.LOCKOUT_MS);
      } else {
        this._error.set(`Invalid passcode (${this.MAX_ATTEMPTS - attempts} attempts remaining)`);
      }

      this._passcodeDigits.set('');
    }

    this._isValidating.set(false);
  }

  // === Clock-In Flow ===

  selectJob(jobTitle: string): void {
    this._selectedJobTitle.set(jobTitle);
  }

  async clockInAndProceed(): Promise<void> {
    const session = this._session();
    if (!session) return;

    // Schedule enforcement check
    const tcSettings = this.settingsService.timeclockSettings();
    if (tcSettings.scheduleEnforcementEnabled) {
      await this.loadTodayShifts();
      const blockReason = this.checkScheduleEnforcement(tcSettings.earlyClockInGraceMinutes);
      if (blockReason) {
        if (tcSettings.allowManagerOverride) {
          this._scheduleWarning.set(blockReason);
          this._showManagerOverride.set(true);
          return;
        }
        this._error.set(blockReason);
        return;
      }
    }

    await this.executeClockIn();
  }

  private async executeClockIn(): Promise<void> {
    const session = this._session();
    if (!session) return;

    this._isClockingIn.set(true);
    this._error.set(null);

    const jobTitle = this._selectedJobTitle() ?? this.memberJobs()[0]?.jobTitle;
    const timecard = await this.laborService.clockInWithJob(session.teamMemberId, jobTitle);

    if (timecard) {
      this._activeTimecard.set(timecard);
      this.completeAuthentication();
    } else {
      this._error.set('Failed to clock in. Please try again.');
    }

    this._isClockingIn.set(false);
  }

  skipClockIn(): void {
    this.completeAuthentication();
  }

  private completeAuthentication(): void {
    const member = this._selectedMember();
    const session = this._session();
    if (!member || !session) return;

    this._state.set('authenticated');
    this.teamMemberAuthenticated.emit({ teamMember: member, session });
    this.resetInactivityTimer();
    this.loadBreakTypes();
    this.startAutoClockOutTimer();
    this.navigateToLanding();
  }

  private async loadBreakTypes(): Promise<void> {
    await this.laborService.loadBreakTypes();
    this._breakTypes.set(this.laborService.breakTypes());
  }

  private navigateToLanding(): void {
    // Device type takes priority — paired devices route to their dedicated screen
    const device = this.deviceService.currentDevice();
    if (device?.deviceType) {
      switch (device.deviceType) {
        case 'kds':
          this.router.navigate(['/kds']);
          return;
        case 'kiosk':
          this.router.navigate(['/kiosk']);
          return;
        case 'printer':
          this.router.navigate(['/administration']);
          return;
        case 'register':
        case 'terminal':
          break; // Fall through to posMode logic
      }
    }

    // Fall back to posMode-based routing
    const posMode = this.platformService.currentDeviceMode();

    switch (posMode) {
      case 'full_service':
        this.router.navigate(['/floor-plan']);
        break;
      case 'quick_service':
        this.router.navigate(['/order-pad']);
        break;
      case 'bar':
        this.router.navigate(['/pos']);
        break;
      case 'bookings':
        this.router.navigate(['/reservations']);
        break;
      case 'services':
        this.router.navigate(['/invoicing']);
        break;
      default:
        this.router.navigate(['/orders']);
        break;
    }
  }

  // === Schedule Enforcement ===

  private async loadTodayShifts(): Promise<void> {
    const member = this._selectedMember();
    if (!member) return;

    const today = this.formatDate(new Date());
    const shifts = await this.laborService.loadStaffShifts(member.id, today, today);
    this._todayShifts.set(shifts);
  }

  private checkScheduleEnforcement(graceMinutes: number): string | null {
    const todayShifts = this._todayShifts();

    if (todayShifts.length === 0) {
      return 'No scheduled shift found for today. Clock-in requires a scheduled shift.';
    }

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const hasUpcoming = todayShifts.some(s => {
      const [h, m] = s.startTime.split(':').map(Number);
      const shiftStart = h * 60 + m;
      return nowMinutes >= (shiftStart - graceMinutes);
    });

    if (!hasUpcoming) {
      return `Too early to clock in. Your shift doesn't start for more than ${graceMinutes} minutes.`;
    }

    return null;
  }

  setManagerOverridePin(pin: string): void {
    this._managerOverridePin.set(pin);
  }

  async submitManagerOverride(): Promise<void> {
    const pin = this._managerOverridePin();
    if (pin.length < 4) return;

    this._isClockingIn.set(true);
    const staff = await this.laborService.validateStaffPin(pin);

    if (staff && staff.permissions?.['team.manage'] === true) {
      this._showManagerOverride.set(false);
      this._scheduleWarning.set(null);
      this._managerOverridePin.set('');
      await this.executeClockIn();
    } else {
      this._error.set('Invalid manager PIN');
      this._managerOverridePin.set('');
    }

    this._isClockingIn.set(false);
  }

  cancelManagerOverride(): void {
    this._showManagerOverride.set(false);
    this._scheduleWarning.set(null);
    this._managerOverridePin.set('');
  }

  // === Auto Clock-Out Timer ===

  private startAutoClockOutTimer(): void {
    this.clearAutoClockOutTimer();

    const tcSettings = this.settingsService.timeclockSettings();
    if (tcSettings.autoClockOutMode === 'never') return;

    const tc = this._activeTimecard();
    if (!tc) return;

    let targetMs: number;

    if (tcSettings.autoClockOutMode === 'after_shift_end') {
      const todayShifts = this._todayShifts();
      const todayShift = todayShifts.length > 0 ? todayShifts[0] : null;
      if (!todayShift) return;

      const [endH, endM] = todayShift.endTime.split(':').map(Number);
      const shiftEnd = new Date();
      shiftEnd.setHours(endH, endM, 0, 0);
      targetMs = shiftEnd.getTime() + (tcSettings.autoClockOutDelayMinutes * 60000) - Date.now();
    } else {
      // business_day_cutoff
      const [cutH, cutM] = tcSettings.businessDayCutoffTime.split(':').map(Number);
      const cutoff = new Date();
      cutoff.setHours(cutH, cutM, 0, 0);
      if (cutoff.getTime() <= Date.now()) {
        cutoff.setDate(cutoff.getDate() + 1);
      }
      targetMs = cutoff.getTime() - Date.now();
    }

    if (targetMs > 0) {
      this.autoClockOutTimer = setTimeout(() => {
        this.doClockOut();
      }, targetMs);
    }
  }

  private clearAutoClockOutTimer(): void {
    if (this.autoClockOutTimer !== null) {
      clearTimeout(this.autoClockOutTimer);
      this.autoClockOutTimer = null;
    }
  }

  // === Clock-Out Flow ===

  openClockOutModal(): void {
    this._declaredTips.set(null);
    this._showClockOutModal.set(true);
  }

  cancelClockOut(): void {
    this._showClockOutModal.set(false);
  }

  setDeclaredTips(amount: number | null): void {
    this._declaredTips.set(amount);
  }

  async doClockOut(): Promise<void> {
    const tc = this._activeTimecard();
    if (!tc || this._isClockAction()) return;

    this._isClockAction.set(true);
    this._error.set(null);

    const tips = this._declaredTips() ?? undefined;
    const success = await this.laborService.clockOutWithTips(tc.id, tips);

    if (success) {
      this._activeTimecard.set(null);
      this._showClockOutModal.set(false);
      this.clearAutoClockOutTimer();
      this.switchUser();
    } else {
      this._error.set('Failed to clock out');
    }

    this._isClockAction.set(false);
  }

  // === Break Management ===

  async doStartBreak(breakTypeId: string): Promise<void> {
    const tc = this._activeTimecard();
    if (!tc || this._isClockAction()) return;

    this._isClockAction.set(true);
    this._error.set(null);

    const result = await this.laborService.startBreak(tc.id, breakTypeId);

    if (result) {
      this._activeTimecard.update(t => {
        if (!t) return t;
        return { ...t, breaks: [...t.breaks, result] };
      });
    } else {
      this._error.set('Failed to start break');
    }

    this._isClockAction.set(false);
  }

  async doEndBreak(): Promise<void> {
    const tc = this._activeTimecard();
    const brk = this.activeBreak();
    if (!tc || !brk || this._isClockAction()) return;

    this._isClockAction.set(true);
    this._error.set(null);

    const success = await this.laborService.endBreak(tc.id, brk.id);

    if (success) {
      this._activeTimecard.update(t => {
        if (!t) return t;
        return {
          ...t,
          breaks: t.breaks.map(b => b.id === brk.id ? { ...b, endAt: new Date().toISOString() } : b),
        };
      });
    } else {
      this._error.set('Failed to end break');
    }

    this._isClockAction.set(false);
  }

  // === Job Switching ===

  openJobSwitcher(): void {
    this._switchJobTitle.set(null);
    this._showJobSwitcher.set(true);
  }

  cancelJobSwitch(): void {
    this._showJobSwitcher.set(false);
    this._switchJobTitle.set(null);
  }

  selectSwitchJob(jobTitle: string): void {
    this._switchJobTitle.set(jobTitle);
  }

  async confirmSwitchJob(): Promise<void> {
    const tc = this._activeTimecard();
    const member = this._selectedMember();
    const session = this._session();
    const newJob = this._switchJobTitle();
    if (!tc || !member || !session || !newJob || this._isClockAction()) return;

    // Don't switch to same job
    if (newJob === tc.jobTitle) {
      this._showJobSwitcher.set(false);
      return;
    }

    this._isClockAction.set(true);
    this._error.set(null);

    // Clock out current timecard (no tips on job switch)
    const clockedOut = await this.laborService.clockOutWithTips(tc.id);

    if (!clockedOut) {
      this._error.set('Failed to close current timecard');
      this._isClockAction.set(false);
      return;
    }

    // Clock in with new job
    const newTimecard = await this.laborService.clockInWithJob(session.teamMemberId, newJob);

    if (newTimecard) {
      this._activeTimecard.set(newTimecard);
      this._showJobSwitcher.set(false);
      this._switchJobTitle.set(null);
    } else {
      this._error.set('Clocked out but failed to clock in with new job');
    }

    this._isClockAction.set(false);
  }

  // === Inactivity Management ===

  resetInactivityTimer(): void {
    this.clearInactivityTimer();
    this._inactivityTimer = setTimeout(() => {
      this.switchUser();
    }, this.INACTIVITY_TIMEOUT_MS);
  }

  private clearInactivityTimer(): void {
    if (this._inactivityTimer) {
      clearTimeout(this._inactivityTimer);
      this._inactivityTimer = null;
    }
  }

  // === Switch User / Logout ===

  switchUser(): void {
    this.clearInactivityTimer();
    this.clearAutoClockOutTimer();
    this._state.set('idle');
    this._selectedMember.set(null);
    this._passcodeDigits.set('');
    this._error.set(null);
    this._session.set(null);
    this._activeTimecard.set(null);
    this._selectedJobTitle.set(null);
    this._showClockOutModal.set(false);
    this._showJobSwitcher.set(false);
    this._breakTypes.set([]);
    this._scheduleWarning.set(null);
    this._showManagerOverride.set(false);
    this._managerOverridePin.set('');
    this._todayShifts.set([]);
    this.laborService.clearPosSession();
  }

  // === Helpers ===

  dismissError(): void {
    this._error.set(null);
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getAvatarColor(name: string): string {
    const colors = ['#7c5cfc', '#e74c3c', '#2ecc71', '#f39c12', '#3498db', '#9b59b6', '#1abc9c', '#e67e22'];
    let hash = 0;
    for (const char of name) {
      hash = char.charCodeAt(0) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  formatTimecardTime(isoString: string): string {
    const d = new Date(isoString);
    const h = d.getHours();
    const m = d.getMinutes();
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
