import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { AuthService } from '@services/auth';
import { RestaurantSettingsService } from '@services/restaurant-settings';
import { PlatformService } from '@services/platform';
import { DeviceHub } from '../device-hub';
import { AiSettings } from '../ai-settings';
import { OnlinePricing } from '../online-pricing';
import { CateringCalendar } from '../catering-calendar';
import { PaymentSettingsComponent } from '../payment-settings';
import { TipManagement } from '../../tip-mgmt/tip-management';
import { LoyaltySettings } from '../loyalty-settings';
import { DeliverySettingsComponent } from '../delivery-settings';
import { GiftCardManagement } from '../gift-card-management';
import { StaffManagement } from '../staff-management';
import { BreakConfig } from '../break-config';
import { AccountBilling } from '../account-billing';
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
  imports: [DeviceHub, AiSettings, OnlinePricing, CateringCalendar, PaymentSettingsComponent, TipManagement, LoyaltySettings, DeliverySettingsComponent, GiftCardManagement, StaffManagement, BreakConfig, AccountBilling],
  templateUrl: './control-panel.html',
  styleUrl: './control-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ControlPanel implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly settingsService = inject(RestaurantSettingsService);
  private readonly platformService = inject(PlatformService);

  readonly isAuthenticated = this.authService.isAuthenticated;

  private readonly _activeTab = signal<ControlPanelTab>('hardware');
  readonly activeTab = this._activeTab.asReadonly();

  private readonly allTabs: TabConfig[] = [
    { key: 'hardware', label: 'Hardware' },
    { key: 'ai-settings', label: 'AI Settings', requiredModule: 'menu_management' },
    { key: 'online-pricing', label: 'Online Pricing', requiredModule: 'online_ordering' },
    { key: 'catering-calendar', label: 'Catering Calendar', requiredModule: 'reservations' },
    { key: 'payments', label: 'Payments' },
    { key: 'tip-management', label: 'Tip Management', requiredFlag: 'enableTipping' },
    { key: 'loyalty', label: 'Loyalty', requiredModule: 'loyalty' },
    { key: 'delivery', label: 'Delivery', requiredModule: 'delivery' },
    { key: 'gift-cards', label: 'Gift Cards', requiredModule: 'gift_cards' },
    { key: 'staff', label: 'Staff', requiredModule: 'staff_scheduling' },
    { key: 'time-clock-config', label: 'Time Clock', requiredModule: 'staff_scheduling' },
    { key: 'account-billing', label: 'Account & Billing' },
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
