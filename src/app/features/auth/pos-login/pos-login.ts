import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  output,
  OnDestroy,
} from '@angular/core';
import { Router } from '@angular/router';
import { LaborService } from '@services/labor';
import { StaffManagementService } from '@services/staff-management';
import { AuthService } from '@services/auth';
import { DeviceService } from '@services/device';
import { PlatformService } from '@services/platform';
import { TeamMember, PosSession, Timecard } from '@models/index';

export interface PosLoginEvent {
  teamMember: TeamMember;
  session: PosSession;
}

type PosLoginState = 'idle' | 'entering-passcode' | 'clock-in-prompt' | 'authenticated';

@Component({
  selector: 'os-pos-login',
  standalone: true,
  imports: [],
  templateUrl: './pos-login.html',
  styleUrl: './pos-login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PosLogin implements OnDestroy {
  private readonly router = inject(Router);
  private readonly laborService = inject(LaborService);
  private readonly staffService = inject(StaffManagementService);
  private readonly authService = inject(AuthService);
  private readonly deviceService = inject(DeviceService);
  private readonly platformService = inject(PlatformService);

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

  constructor() {
    this.loadTeamMembers();
  }

  ngOnDestroy(): void {
    this.clearInactivityTimer();
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

    // Try local PIN validation first (for owner seeded from onboarding)
    const member = this._selectedMember();
    if (member?.passcode && member.passcode === passcode) {
      const localSession: PosSession = {
        token: 'local-session',
        teamMemberId: member.id,
        teamMemberName: member.displayName,
        role: 'owner',
        permissions: {},
        clockedIn: true,
        activeTimecardId: null,
      };
      this._session.set(localSession);
      this._failedAttempts.set(0);
      this._lockoutUntil.set(null);
      this._isValidating.set(false);
      this.completeAuthentication();
      return;
    }

    // Fall back to API validation
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
    this.navigateToLanding();
  }

  private navigateToLanding(): void {
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
    this._state.set('idle');
    this._selectedMember.set(null);
    this._passcodeDigits.set('');
    this._error.set(null);
    this._session.set(null);
    this._activeTimecard.set(null);
    this._selectedJobTitle.set(null);
    this.laborService.clearPosSession();
  }

  // === Helpers ===

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
}
