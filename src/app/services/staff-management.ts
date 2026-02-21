import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  StaffUser,
  StaffPinRecord,
  StaffUserFormData,
  StaffPinFormData,
  ChangePasswordData,
  TeamMember,
  TeamMemberFormData,
  TeamMemberJobFormData,
  PermissionSet,
  PermissionSetFormData,
  DeviceRegistration,
  DeviceRegistrationFormData,
} from '../models/staff-management.model';
import { AuthService } from './auth';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root',
})
export class StaffManagementService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  private readonly _users = signal<StaffUser[]>([]);
  private readonly _pins = signal<StaffPinRecord[]>([]);
  private readonly _teamMembers = signal<TeamMember[]>([]);
  private readonly _permissionSets = signal<PermissionSet[]>([]);
  private readonly _devices = signal<DeviceRegistration[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly users = this._users.asReadonly();
  readonly pins = this._pins.asReadonly();
  readonly teamMembers = this._teamMembers.asReadonly();
  readonly permissionSets = this._permissionSets.asReadonly();
  readonly devices = this._devices.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly canManageUsers = computed(() => {
    const user = this.authService.user();
    return user?.role === 'super_admin' || user?.role === 'owner';
  });

  readonly canManagePins = computed(() => {
    const user = this.authService.user();
    return user?.role === 'super_admin' || user?.role === 'owner' || user?.role === 'manager';
  });

  private get restaurantId(): string | null {
    return this.authService.selectedRestaurantId();
  }

  async loadUsers(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);
    try {
      const users = await firstValueFrom(
        this.http.get<StaffUser[]>(`${this.apiUrl}/auth/users`)
      );
      this._users.set(users);
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      this._isLoading.set(false);
    }
  }

  async createUser(data: StaffUserFormData): Promise<boolean> {
    this._error.set(null);
    try {
      const user = await firstValueFrom(
        this.http.post<StaffUser>(`${this.apiUrl}/auth/users`, {
          email: data.email,
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role,
        })
      );

      // Grant restaurant access for each selected restaurant
      for (const restaurantId of data.restaurantIds) {
        await firstValueFrom(
          this.http.post(`${this.apiUrl}/auth/users/${user.id}/restaurants/${restaurantId}`, {
            role: data.role,
          })
        );
      }

      await this.loadUsers();
      return true;
    } catch (err: any) {
      this._error.set(err?.error?.error ?? 'Failed to create user');
      return false;
    }
  }

  async updateUser(userId: string, data: Partial<{ firstName: string; lastName: string; role: string; isActive: boolean }>): Promise<boolean> {
    this._error.set(null);
    try {
      await firstValueFrom(
        this.http.patch(`${this.apiUrl}/auth/users/${userId}`, data)
      );
      await this.loadUsers();
      return true;
    } catch (err: any) {
      this._error.set(err?.error?.error ?? 'Failed to update user');
      return false;
    }
  }

  async deactivateUser(userId: string): Promise<boolean> {
    return this.updateUser(userId, { isActive: false });
  }

  async reactivateUser(userId: string): Promise<boolean> {
    return this.updateUser(userId, { isActive: true });
  }

  async changePassword(data: ChangePasswordData): Promise<boolean> {
    this._error.set(null);
    try {
      await firstValueFrom(
        this.http.post(`${this.apiUrl}/auth/change-password`, data)
      );
      return true;
    } catch (err: any) {
      this._error.set(err?.error?.error ?? 'Failed to change password');
      return false;
    }
  }

  // ============ Staff PINs ============

  async loadPins(): Promise<void> {
    if (!this.restaurantId) return;
    this._isLoading.set(true);
    this._error.set(null);
    try {
      const pins = await firstValueFrom(
        this.http.get<StaffPinRecord[]>(`${this.apiUrl}/auth/${this.restaurantId}/pins`)
      );
      this._pins.set(pins);
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to load staff PINs');
    } finally {
      this._isLoading.set(false);
    }
  }

  async createPin(data: StaffPinFormData): Promise<boolean> {
    if (!this.restaurantId) return false;
    this._error.set(null);
    try {
      await firstValueFrom(
        this.http.post(`${this.apiUrl}/auth/${this.restaurantId}/pins`, data)
      );
      await this.loadPins();
      return true;
    } catch (err: any) {
      this._error.set(err?.error?.error ?? 'Failed to create PIN');
      return false;
    }
  }

  async updatePin(pinId: string, data: Partial<{ name: string; role: string; isActive: boolean; newPin: string }>): Promise<boolean> {
    if (!this.restaurantId) return false;
    this._error.set(null);
    try {
      await firstValueFrom(
        this.http.patch(`${this.apiUrl}/auth/${this.restaurantId}/pins/${pinId}`, data)
      );
      await this.loadPins();
      return true;
    } catch (err: any) {
      this._error.set(err?.error?.error ?? 'Failed to update PIN');
      return false;
    }
  }

  async deactivatePin(pinId: string): Promise<boolean> {
    if (!this.restaurantId) return false;
    this._error.set(null);
    try {
      await firstValueFrom(
        this.http.delete(`${this.apiUrl}/auth/${this.restaurantId}/pins/${pinId}`)
      );
      await this.loadPins();
      return true;
    } catch (err: any) {
      this._error.set(err?.error?.error ?? 'Failed to deactivate PIN');
      return false;
    }
  }

  clearError(): void {
    this._error.set(null);
  }

  // ============ Team Members ============

  async loadTeamMembers(): Promise<void> {
    if (!this.restaurantId) return;
    this._isLoading.set(true);
    this._error.set(null);
    try {
      const data = await firstValueFrom(
        this.http.get<TeamMember[]>(`${this.apiUrl}/restaurant/${this.restaurantId}/team-members`)
      );
      this._teamMembers.set(data);
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to load team members');
    } finally {
      this._isLoading.set(false);
    }
  }

  async createTeamMember(data: TeamMemberFormData): Promise<boolean> {
    if (!this.restaurantId) return false;
    this._error.set(null);
    try {
      await firstValueFrom(
        this.http.post(`${this.apiUrl}/restaurant/${this.restaurantId}/team-members`, data)
      );
      await this.loadTeamMembers();
      return true;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to create team member');
      return false;
    }
  }

  async updateTeamMember(id: string, data: Partial<TeamMemberFormData>): Promise<boolean> {
    if (!this.restaurantId) return false;
    this._error.set(null);
    try {
      await firstValueFrom(
        this.http.patch(`${this.apiUrl}/restaurant/${this.restaurantId}/team-members/${id}`, data)
      );
      await this.loadTeamMembers();
      return true;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to update team member');
      return false;
    }
  }

  async deactivateTeamMember(id: string): Promise<boolean> {
    if (!this.restaurantId) return false;
    this._error.set(null);
    try {
      await firstValueFrom(
        this.http.delete(`${this.apiUrl}/restaurant/${this.restaurantId}/team-members/${id}`)
      );
      await this.loadTeamMembers();
      return true;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to deactivate team member');
      return false;
    }
  }

  async addJob(memberId: string, job: TeamMemberJobFormData): Promise<boolean> {
    if (!this.restaurantId) return false;
    this._error.set(null);
    try {
      await firstValueFrom(
        this.http.post(`${this.apiUrl}/restaurant/${this.restaurantId}/team-members/${memberId}/jobs`, job)
      );
      await this.loadTeamMembers();
      return true;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to add job');
      return false;
    }
  }

  async updateJob(memberId: string, jobId: string, data: Partial<TeamMemberJobFormData>): Promise<boolean> {
    if (!this.restaurantId) return false;
    this._error.set(null);
    try {
      await firstValueFrom(
        this.http.patch(`${this.apiUrl}/restaurant/${this.restaurantId}/team-members/${memberId}/jobs/${jobId}`, data)
      );
      await this.loadTeamMembers();
      return true;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to update job');
      return false;
    }
  }

  // ============ Permission Sets ============

  async loadPermissionSets(): Promise<void> {
    if (!this.restaurantId) return;
    this._isLoading.set(true);
    this._error.set(null);
    try {
      const data = await firstValueFrom(
        this.http.get<PermissionSet[]>(`${this.apiUrl}/restaurant/${this.restaurantId}/permission-sets`)
      );
      this._permissionSets.set(data);
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to load permission sets');
    } finally {
      this._isLoading.set(false);
    }
  }

  async createPermissionSet(data: PermissionSetFormData): Promise<boolean> {
    if (!this.restaurantId) return false;
    this._error.set(null);
    try {
      await firstValueFrom(
        this.http.post(`${this.apiUrl}/restaurant/${this.restaurantId}/permission-sets`, data)
      );
      await this.loadPermissionSets();
      return true;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to create permission set');
      return false;
    }
  }

  async updatePermissionSet(id: string, data: Partial<PermissionSetFormData>): Promise<boolean> {
    if (!this.restaurantId) return false;
    this._error.set(null);
    try {
      await firstValueFrom(
        this.http.patch(`${this.apiUrl}/restaurant/${this.restaurantId}/permission-sets/${id}`, data)
      );
      await this.loadPermissionSets();
      return true;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to update permission set');
      return false;
    }
  }

  async deletePermissionSet(id: string): Promise<boolean> {
    if (!this.restaurantId) return false;
    this._error.set(null);
    try {
      await firstValueFrom(
        this.http.delete(`${this.apiUrl}/restaurant/${this.restaurantId}/permission-sets/${id}`)
      );
      await this.loadPermissionSets();
      return true;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to delete permission set');
      return false;
    }
  }

  // ============ Device Registration ============

  async loadDevices(): Promise<void> {
    if (!this.restaurantId) return;
    this._isLoading.set(true);
    this._error.set(null);
    try {
      const data = await firstValueFrom(
        this.http.get<DeviceRegistration[]>(`${this.apiUrl}/restaurant/${this.restaurantId}/devices`)
      );
      this._devices.set(data);
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to load devices');
    } finally {
      this._isLoading.set(false);
    }
  }

  async generateDeviceCode(data: DeviceRegistrationFormData): Promise<DeviceRegistration | null> {
    if (!this.restaurantId) return null;
    this._error.set(null);
    try {
      const result = await firstValueFrom(
        this.http.post<DeviceRegistration>(`${this.apiUrl}/restaurant/${this.restaurantId}/devices`, data)
      );
      this._devices.update(d => [...d, result]);
      return result;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to generate device code');
      return null;
    }
  }

  async pairDevice(deviceCode: string): Promise<boolean> {
    if (!this.restaurantId) return false;
    this._error.set(null);
    try {
      await firstValueFrom(
        this.http.post(`${this.apiUrl}/restaurant/${this.restaurantId}/devices/pair`, { deviceCode })
      );
      await this.loadDevices();
      return true;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to pair device');
      return false;
    }
  }

  async revokeDevice(deviceId: string): Promise<boolean> {
    if (!this.restaurantId) return false;
    this._error.set(null);
    try {
      await firstValueFrom(
        this.http.delete(`${this.apiUrl}/restaurant/${this.restaurantId}/devices/${deviceId}`)
      );
      this._devices.update(d => d.filter(dev => dev.id !== deviceId));
      return true;
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'Failed to revoke device');
      return false;
    }
  }
}
