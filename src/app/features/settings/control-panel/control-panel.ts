import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { AuthService } from '@services/auth';
import { RestaurantSettingsService } from '@services/restaurant-settings';
import { PlatformService } from '@services/platform';
import { PrinterSettings } from '../printer-settings';
import { AiSettings } from '../ai-settings';
import { OnlinePricing } from '../online-pricing';
import { CateringCalendar } from '../catering-calendar';
import { PaymentSettingsComponent } from '../payment-settings';
import { TipManagement } from '../../tip-mgmt/tip-management';
import { LoyaltySettings } from '../loyalty-settings';
import { DeliverySettingsComponent } from '../delivery-settings';
import { StationSettings } from '../station-settings';
import { GiftCardManagement } from '../gift-card-management';
import { StaffManagement } from '../staff-management';
import { DeviceManagement } from '../device-management';
import { BreakConfig } from '../break-config';
import { ControlPanelTab, PlatformModule } from '@models/index';
import type { ModeFeatureFlags } from '@models/index';

interface TabConfig {
  key: ControlPanelTab;
  label: string;
  requiredModule?: PlatformModule;
  requiredFlag?: keyof ModeFeatureFlags;
}

@Component({
  selector: 'os-control-panel',
  imports: [PrinterSettings, AiSettings, OnlinePricing, CateringCalendar, PaymentSettingsComponent, TipManagement, LoyaltySettings, DeliverySettingsComponent, StationSettings, GiftCardManagement, StaffManagement, DeviceManagement, BreakConfig],
  templateUrl: './control-panel.html',
  styleUrl: './control-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ControlPanel implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly settingsService = inject(RestaurantSettingsService);
  private readonly platformService = inject(PlatformService);

  readonly isAuthenticated = this.authService.isAuthenticated;

  private readonly _activeTab = signal<ControlPanelTab>('printers');
  readonly activeTab = this._activeTab.asReadonly();

  private readonly allTabs: TabConfig[] = [
    { key: 'printers', label: 'Printers' },
    { key: 'ai-settings', label: 'AI Settings', requiredModule: 'menu_management' },
    { key: 'online-pricing', label: 'Online Pricing', requiredModule: 'online_ordering' },
    { key: 'catering-calendar', label: 'Catering Calendar', requiredModule: 'reservations' },
    { key: 'payments', label: 'Payments' },
    { key: 'tip-management', label: 'Tip Management', requiredFlag: 'enableTipping' },
    { key: 'loyalty', label: 'Loyalty', requiredModule: 'loyalty' },
    { key: 'delivery', label: 'Delivery', requiredModule: 'delivery' },
    { key: 'stations', label: 'Stations', requiredFlag: 'enableKds' },
    { key: 'gift-cards', label: 'Gift Cards', requiredModule: 'gift_cards' },
    { key: 'staff', label: 'Staff', requiredModule: 'staff_scheduling' },
    { key: 'devices', label: 'Devices' },
    { key: 'time-clock-config', label: 'Time Clock', requiredModule: 'staff_scheduling' },
  ];

  readonly visibleTabs = computed(() => {
    const flags = this.platformService.featureFlags();
    return this.allTabs.filter(tab => {
      if (tab.requiredModule && !this.platformService.isModuleEnabled(tab.requiredModule)) {
        return false;
      }
      if (tab.requiredFlag && !flags[tab.requiredFlag]) {
        return false;
      }
      return true;
    });
  });

  ngOnInit(): void {
    this.settingsService.loadSettings();
    this.platformService.loadMerchantProfile();
  }

  setTab(tab: ControlPanelTab): void {
    this._activeTab.set(tab);
  }
}
