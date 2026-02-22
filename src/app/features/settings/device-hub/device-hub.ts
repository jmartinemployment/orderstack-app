import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DeviceService } from '@services/device';
import { PlatformService } from '@services/platform';
import { PrinterService } from '@services/printer';
import { PrinterSettings } from '../printer-settings';
import { StationSettings } from '../station-settings';
import {
  DeviceHubTab,
  DeviceType,
  DeviceFormData,
  DeviceMode,
  DeviceModeFormData,
  DeviceModeSettings,
  PrinterProfile,
  PrinterProfileFormData,
  PrintJobType,
  PrintRoutingRule,
  PeripheralType,
  PeripheralConnectionType,
  PeripheralDevice,
  KioskProfileFormData,
  defaultModeSettings,
  defaultModeSettingsForPosMode,
} from '@models/index';
import type { DevicePosMode } from '@models/index';

const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  pos_terminal: 'POS Terminal',
  kds_station: 'KDS Station',
  kiosk: 'Kiosk',
  order_pad: 'Order Pad',
  printer_station: 'Printer Station',
};

const DEVICE_TYPE_ICONS: Record<DeviceType, string> = {
  pos_terminal: 'bi-tv',
  kds_station: 'bi-display',
  kiosk: 'bi-phone',
  order_pad: 'bi-tablet',
  printer_station: 'bi-printer',
};

const PRINT_JOB_LABELS: Record<PrintJobType, string> = {
  customer_receipt: 'Customer Receipt',
  kitchen_ticket: 'Kitchen Ticket',
  bar_ticket: 'Bar Ticket',
  expo_ticket: 'Expo Ticket',
  order_summary: 'Order Summary',
  close_of_day: 'Close of Day',
};

const PERIPHERAL_TYPE_LABELS: Record<PeripheralType, string> = {
  cash_drawer: 'Cash Drawer',
  barcode_scanner: 'Barcode Scanner',
  card_reader: 'Card Reader',
  customer_display: 'Customer Display',
  scale: 'Scale',
};

@Component({
  selector: 'os-device-hub',
  standalone: true,
  imports: [DatePipe, TitleCasePipe, FormsModule, PrinterSettings, StationSettings],
  templateUrl: './device-hub.html',
  styleUrl: './device-hub.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeviceHub implements OnInit {
  private readonly deviceService = inject(DeviceService);
  private readonly platformService = inject(PlatformService);
  private readonly printerService = inject(PrinterService);

  // --- Tab state ---
  readonly activeTab = signal<DeviceHubTab>('devices');

  // --- Data from services ---
  readonly devices = this.deviceService.devices;
  readonly modes = this.deviceService.modes;
  readonly printerProfiles = this.deviceService.printerProfiles;
  readonly peripherals = this.deviceService.peripherals;
  readonly kioskProfiles = this.deviceService.kioskProfiles;
  readonly printers = this.printerService.printers;
  readonly isLoading = this.deviceService.isLoading;
  readonly error = this.deviceService.error;

  // --- Computed ---
  readonly activeDevices = this.deviceService.activeDevices;
  readonly pendingDevices = this.deviceService.pendingDevices;

  readonly showKioskTab = computed(() => {
    const profile = this.platformService.merchantProfile();
    if (!profile) return true;
    return profile.verticals.some(v => v === 'food_and_drink' || v === 'retail');
  });

  readonly tabs = computed<{ key: DeviceHubTab; label: string; icon: string }[]>(() => {
    const base: { key: DeviceHubTab; label: string; icon: string }[] = [
      { key: 'devices', label: 'Devices', icon: 'bi-cpu' },
      { key: 'modes', label: 'Modes', icon: 'bi-sliders' },
      { key: 'printer-profiles', label: 'Printer Profiles', icon: 'bi-printer' },
      { key: 'peripherals', label: 'Peripherals', icon: 'bi-usb-drive' },
    ];
    if (this.showKioskTab()) {
      base.push({ key: 'kiosk-profiles', label: 'Kiosk Profiles', icon: 'bi-phone' });
    }
    return base;
  });

  // --- Device code generation ---
  readonly showCodeForm = signal(false);
  readonly newDeviceName = signal('');
  readonly newDeviceType = signal<DeviceType>('pos_terminal');
  readonly generatedCode = signal<string | null>(null);
  readonly codeExpiry = signal<string | null>(null);

  // --- Mode editing ---
  readonly showModeForm = signal(false);
  readonly editingMode = signal<DeviceMode | null>(null);
  readonly modeFormName = signal('');
  readonly modeFormType = signal<DeviceType>('pos_terminal');
  readonly modeFormSettings = signal<DeviceModeSettings>(defaultModeSettings());
  readonly modeFormPosMode = signal<DevicePosMode>('full_service');

  // --- Printer profile editing ---
  readonly showProfileForm = signal(false);
  readonly editingProfile = signal<PrinterProfile | null>(null);
  readonly profileFormName = signal('');
  readonly profileFormRules = signal<PrintRoutingRule[]>([]);

  // --- Peripheral registration ---
  readonly showPeripheralForm = signal(false);
  readonly peripheralParentDevice = signal('');
  readonly peripheralType = signal<PeripheralType>('cash_drawer');
  readonly peripheralName = signal('');
  readonly peripheralConnection = signal<PeripheralConnectionType>('usb');

  // --- Kiosk profile editing ---
  readonly showKioskForm = signal(false);
  readonly kioskFormName = signal('');
  readonly kioskFormWelcome = signal('Welcome! Place your order here.');
  readonly kioskFormShowImages = signal(true);
  readonly kioskFormRequireName = signal(false);
  readonly kioskFormTimeout = signal(120);
  readonly kioskFormAccessibility = signal(false);

  // --- Confirm dialogs ---
  readonly confirmRevokeId = signal<string | null>(null);
  readonly confirmDeleteModeId = signal<string | null>(null);

  // --- Labels ---
  readonly deviceTypeLabels = DEVICE_TYPE_LABELS;
  readonly deviceTypeIcons = DEVICE_TYPE_ICONS;
  readonly printJobLabels = PRINT_JOB_LABELS;
  readonly peripheralTypeLabels = PERIPHERAL_TYPE_LABELS;
  readonly deviceTypes: DeviceType[] = ['pos_terminal', 'kds_station', 'kiosk', 'order_pad', 'printer_station'];
  readonly printJobTypes: PrintJobType[] = ['customer_receipt', 'kitchen_ticket', 'bar_ticket', 'expo_ticket', 'order_summary', 'close_of_day'];
  readonly peripheralTypes: PeripheralType[] = ['cash_drawer', 'barcode_scanner', 'card_reader', 'customer_display', 'scale'];
  readonly connectionTypes: PeripheralConnectionType[] = ['usb', 'bluetooth', 'network'];
  readonly availableModes = this.platformService.availableModes;

  ngOnInit(): void {
    this.deviceService.loadDevices();
    this.deviceService.loadModes();
    this.deviceService.loadPrinterProfiles();
    this.deviceService.loadPeripherals();
    this.deviceService.loadKioskProfiles();
  }

  setTab(tab: DeviceHubTab): void {
    this.activeTab.set(tab);
  }

  // === Device Code Generation ===

  openCodeForm(): void {
    this.showCodeForm.set(true);
    this.newDeviceName.set('');
    this.newDeviceType.set('pos_terminal');
    this.generatedCode.set(null);
    this.codeExpiry.set(null);
  }

  closeCodeForm(): void {
    this.showCodeForm.set(false);
  }

  async generateCode(): Promise<void> {
    const data: DeviceFormData = {
      deviceName: this.newDeviceName() || 'New Device',
      deviceType: this.newDeviceType(),
    };
    const device = await this.deviceService.generateDeviceCode(data);
    if (device) {
      this.generatedCode.set(device.deviceCode);
      this.codeExpiry.set(device.expiresAt);
    }
  }

  copyCode(): void {
    const code = this.generatedCode();
    if (code) {
      navigator.clipboard.writeText(code);
    }
  }

  // === Device Actions ===

  confirmRevoke(id: string): void {
    this.confirmRevokeId.set(id);
  }

  cancelRevoke(): void {
    this.confirmRevokeId.set(null);
  }

  async revokeDevice(): Promise<void> {
    const id = this.confirmRevokeId();
    if (!id) return;
    await this.deviceService.revokeDevice(id);
    this.confirmRevokeId.set(null);
  }

  // === Mode CRUD ===

  openModeForm(mode?: DeviceMode): void {
    this.showModeForm.set(true);
    if (mode) {
      this.editingMode.set(mode);
      this.modeFormName.set(mode.name);
      this.modeFormType.set(mode.deviceType);
      this.modeFormSettings.set(structuredClone(mode.settings));
    } else {
      this.editingMode.set(null);
      this.modeFormName.set('');
      this.modeFormType.set('pos_terminal');
      this.modeFormSettings.set(defaultModeSettings());
    }
  }

  closeModeForm(): void {
    this.showModeForm.set(false);
    this.editingMode.set(null);
  }

  onPosModeChange(posMode: DevicePosMode): void {
    this.modeFormPosMode.set(posMode);
    this.modeFormSettings.set(defaultModeSettingsForPosMode(posMode));
  }

  async saveMode(): Promise<void> {
    const data: DeviceModeFormData = {
      name: this.modeFormName(),
      deviceType: this.modeFormType(),
      settings: this.modeFormSettings(),
    };

    const existing = this.editingMode();
    if (existing) {
      await this.deviceService.updateMode(existing.id, data);
    } else {
      await this.deviceService.createMode(data);
    }
    this.closeModeForm();
  }

  confirmDeleteMode(id: string): void {
    this.confirmDeleteModeId.set(id);
  }

  cancelDeleteMode(): void {
    this.confirmDeleteModeId.set(null);
  }

  async deleteMode(): Promise<void> {
    const id = this.confirmDeleteModeId();
    if (!id) return;
    await this.deviceService.deleteMode(id);
    this.confirmDeleteModeId.set(null);
  }

  // === Printer Profile CRUD ===

  openProfileForm(profile?: PrinterProfile): void {
    this.showProfileForm.set(true);
    if (profile) {
      this.editingProfile.set(profile);
      this.profileFormName.set(profile.name);
      this.profileFormRules.set(structuredClone(profile.routingRules));
    } else {
      this.editingProfile.set(null);
      this.profileFormName.set('');
      this.profileFormRules.set(
        this.printJobTypes.map(jobType => ({
          jobType,
          printerId: '',
          copies: 1,
          enabled: false,
        }))
      );
    }
  }

  closeProfileForm(): void {
    this.showProfileForm.set(false);
    this.editingProfile.set(null);
  }

  updateRule(index: number, field: keyof PrintRoutingRule, value: unknown): void {
    this.profileFormRules.update(rules => {
      const updated = [...rules];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  async saveProfile(): Promise<void> {
    const data: PrinterProfileFormData = {
      name: this.profileFormName(),
      routingRules: this.profileFormRules(),
    };

    const existing = this.editingProfile();
    if (existing) {
      await this.deviceService.updatePrinterProfile(existing.id, data);
    } else {
      await this.deviceService.createPrinterProfile(data);
    }
    this.closeProfileForm();
  }

  async deleteProfile(id: string): Promise<void> {
    await this.deviceService.deletePrinterProfile(id);
  }

  // === Peripheral Registration ===

  openPeripheralForm(): void {
    this.showPeripheralForm.set(true);
    this.peripheralParentDevice.set('');
    this.peripheralType.set('cash_drawer');
    this.peripheralName.set('');
    this.peripheralConnection.set('usb');
  }

  closePeripheralForm(): void {
    this.showPeripheralForm.set(false);
  }

  async registerPeripheral(): Promise<void> {
    await this.deviceService.registerPeripheral({
      parentDeviceId: this.peripheralParentDevice(),
      type: this.peripheralType(),
      name: this.peripheralName() || this.peripheralTypeLabels[this.peripheralType()],
      connectionType: this.peripheralConnection(),
    });
    this.closePeripheralForm();
  }

  async removePeripheral(id: string): Promise<void> {
    await this.deviceService.removePeripheral(id);
  }

  // === Kiosk Profile CRUD ===

  openKioskForm(): void {
    this.showKioskForm.set(true);
    this.kioskFormName.set('');
    this.kioskFormWelcome.set('Welcome! Place your order here.');
    this.kioskFormShowImages.set(true);
    this.kioskFormRequireName.set(false);
    this.kioskFormTimeout.set(120);
    this.kioskFormAccessibility.set(false);
  }

  closeKioskForm(): void {
    this.showKioskForm.set(false);
  }

  async saveKioskProfile(): Promise<void> {
    const data: KioskProfileFormData = {
      name: this.kioskFormName(),
      welcomeMessage: this.kioskFormWelcome(),
      showImages: this.kioskFormShowImages(),
      requireNameForOrder: this.kioskFormRequireName(),
      maxIdleSeconds: this.kioskFormTimeout(),
      enableAccessibility: this.kioskFormAccessibility(),
    };
    await this.deviceService.createKioskProfile(data);
    this.closeKioskForm();
  }

  async deleteKioskProfile(id: string): Promise<void> {
    await this.deviceService.deleteKioskProfile(id);
  }

  // === Helpers ===

  hasPeripherals(deviceId: string): boolean {
    return this.peripherals().some(p => p.parentDeviceId === deviceId);
  }

  getPeripheralsForDevice(deviceId: string): PeripheralDevice[] {
    return this.peripherals().filter(p => p.parentDeviceId === deviceId);
  }

  updateCheckoutSetting(key: string, value: unknown): void {
    this.modeFormSettings.update(s => ({
      ...s,
      checkout: { ...s.checkout, [key]: value },
    }));
  }

  updateReceiptSetting(key: string, value: unknown): void {
    this.modeFormSettings.update(s => ({
      ...s,
      receipt: { ...s.receipt, [key]: value },
    }));
  }

  updateSecuritySetting(key: string, value: unknown): void {
    this.modeFormSettings.update(s => ({
      ...s,
      security: { ...s.security, [key]: value },
    }));
  }

  updateDisplaySetting(key: string, value: unknown): void {
    this.modeFormSettings.update(s => ({
      ...s,
      display: { ...s.display, [key]: value },
    }));
  }

  getModeName(modeId: string | null): string {
    if (!modeId) return 'None';
    return this.modes().find(m => m.id === modeId)?.name ?? 'Unknown';
  }

  getDeviceName(deviceId: string): string {
    return this.devices().find(d => d.id === deviceId)?.deviceName ?? 'Unknown';
  }

  clearError(): void {
    this.deviceService.clearError();
  }
}
