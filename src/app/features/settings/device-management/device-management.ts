import { Component, inject, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { StaffManagementService } from '@services/staff-management';
import { AuthService } from '@services/auth';
import { DeviceRegistration, DeviceRegistrationFormData } from '@models/staff-management.model';

@Component({
  selector: 'os-device-management',
  imports: [DatePipe],
  templateUrl: './device-management.html',
  styleUrl: './device-management.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeviceManagement {
  private readonly staffService = inject(StaffManagementService);
  private readonly authService = inject(AuthService);

  readonly devices = this.staffService.devices;
  readonly isLoading = this.staffService.isLoading;
  readonly error = this.staffService.error;

  private readonly _showGenerateForm = signal(false);
  private readonly _deviceName = signal('');
  private readonly _generatedDevice = signal<DeviceRegistration | null>(null);
  private readonly _isSaving = signal(false);
  private readonly _confirmRevoke = signal<string | null>(null);
  private readonly _successMessage = signal<string | null>(null);

  readonly showGenerateForm = this._showGenerateForm.asReadonly();
  readonly deviceName = this._deviceName.asReadonly();
  readonly generatedDevice = this._generatedDevice.asReadonly();
  readonly isSaving = this._isSaving.asReadonly();
  readonly confirmRevoke = this._confirmRevoke.asReadonly();
  readonly successMessage = this._successMessage.asReadonly();

  readonly activeDevices = computed(() => this.devices().filter(d => d.status === 'active'));
  readonly pendingDevices = computed(() => this.devices().filter(d => d.status === 'pending'));
  readonly revokedDevices = computed(() => this.devices().filter(d => d.status === 'revoked'));

  private readonly _loaded = signal(false);

  constructor() {
    effect(() => {
      if (this.authService.selectedRestaurantId() && !this._loaded()) {
        this._loaded.set(true);
        this.staffService.loadDevices();
      }
    });
  }

  openGenerateForm(): void {
    this._deviceName.set('');
    this._generatedDevice.set(null);
    this._showGenerateForm.set(true);
  }

  closeGenerateForm(): void {
    this._showGenerateForm.set(false);
    this._generatedDevice.set(null);
  }

  setDeviceName(name: string): void {
    this._deviceName.set(name);
  }

  async generateCode(): Promise<void> {
    const name = this._deviceName().trim();
    if (!name || this._isSaving()) return;

    this._isSaving.set(true);
    const result = await this.staffService.generateDeviceCode({ deviceName: name });
    this._isSaving.set(false);

    if (result) {
      this._generatedDevice.set(result);
      this.showSuccess('Device code generated');
    }
  }

  confirmRevokeDevice(id: string): void {
    this._confirmRevoke.set(id);
  }

  cancelRevoke(): void {
    this._confirmRevoke.set(null);
  }

  async revokeDevice(id: string): Promise<void> {
    this._isSaving.set(true);
    const success = await this.staffService.revokeDevice(id);
    this._isSaving.set(false);
    this._confirmRevoke.set(null);
    if (success) this.showSuccess('Device revoked');
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'active': return 'status-active';
      case 'pending': return 'status-pending';
      case 'revoked': return 'status-revoked';
      default: return '';
    }
  }

  isExpired(device: DeviceRegistration): boolean {
    return device.status === 'pending' && new Date(device.expiresAt) < new Date();
  }

  private showSuccess(message: string): void {
    this._successMessage.set(message);
    setTimeout(() => this._successMessage.set(null), 3000);
  }

  clearError(): void {
    this.staffService.clearError();
  }
}
