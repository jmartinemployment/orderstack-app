import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { onboardingGuard } from './guards/onboarding.guard';
import { deviceModeRedirectGuard } from './guards/device-mode.guard';
import { deviceInitResolver } from './resolvers/device-init.resolver';
import { MainLayoutComponent } from './layouts/main-layout.component';
import { AuthLayoutComponent } from './layouts/auth-layout.component';

export const routes: Routes = [
  // Public routes (no auth)
  {
    path: 'login',
    component: AuthLayoutComponent,
    children: [
      { path: '', loadComponent: () => import('./features/auth/login/login').then(m => m.Login) },
    ],
  },
  {
    path: 'setup',
    canActivate: [authGuard],
    loadComponent: () => import('./features/onboarding/setup-wizard/setup-wizard').then(m => m.SetupWizard),
  },
  {
    path: 'device-setup',
    canActivate: [authGuard],
    loadComponent: () => import('./features/onboarding/device-setup/device-setup').then(m => m.DeviceSetup),
  },
  {
    path: 'pos-login',
    canActivate: [authGuard],
    loadComponent: () => import('./features/auth/pos-login/pos-login').then(m => m.PosLogin),
  },
  {
    path: 'order/:restaurantSlug',
    loadComponent: () => import('./features/online-ordering/online-order-portal/online-order-portal').then(m => m.OnlineOrderPortal),
  },
  {
    path: 'kiosk/:restaurantSlug',
    loadComponent: () => import('./features/kiosk/kiosk-terminal/kiosk-terminal').then(m => m.KioskTerminal),
  },
  {
    path: 'staff',
    loadComponent: () => import('./features/staff/staff-portal/staff-portal').then(m => m.StaffPortal),
  },
  {
    path: 'select-restaurant',
    canActivate: [authGuard],
    loadComponent: () => import('./features/auth/restaurant-select/restaurant-select').then(m => m.RestaurantSelect),
  },

  // Authenticated routes
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard, onboardingGuard],
    resolve: { deviceInit: deviceInitResolver },
    children: [

      // Orders
      { path: 'orders', loadComponent: () => import('./features/orders/pending-orders/pending-orders').then(m => m.PendingOrders) },
      { path: 'order-history', loadComponent: () => import('./features/orders/order-history/order-history').then(m => m.OrderHistory) },
      { path: 'order-pad', loadComponent: () => import('./features/pos/order-pad/order-pad').then(m => m.OrderPad) },
      { path: 'pos', loadComponent: () => import('./features/pos/server-pos-terminal/server-pos-terminal').then(m => m.ServerPosTerminal) },

      // Kitchen
      { path: 'kds', loadComponent: () => import('./features/kds/kds-display/kds-display').then(m => m.KdsDisplay) },

      // SOS
      { path: 'sos', loadComponent: () => import('./features/sos/sos-terminal/sos-terminal').then(m => m.SosTerminal) },

      // Front of House
      { path: 'floor-plan', loadComponent: () => import('./features/table-mgmt/floor-plan/floor-plan').then(m => m.FloorPlan) },
      { path: 'reservations', loadComponent: () => import('./features/reservations/reservation-manager/reservation-manager').then(m => m.ReservationManager) },

      // Menu
      { path: 'menu', loadComponent: () => import('./features/menu-mgmt/menu-management').then(m => m.MenuManagement) },
      { path: 'combos', loadComponent: () => import('./features/menu-mgmt/combo-management/combo-management').then(m => m.ComboManagement) },

      // Inventory
      { path: 'inventory', loadComponent: () => import('./features/inventory/inventory-dashboard/inventory-dashboard').then(m => m.InventoryDashboard) },

      // Analytics
      { path: 'command-center', loadComponent: () => import('./features/analytics/command-center/command-center').then(m => m.CommandCenter) },
      { path: 'sales', loadComponent: () => import('./features/analytics/sales-dashboard/sales-dashboard').then(m => m.SalesDashboard) },
      { path: 'menu-engineering', loadComponent: () => import('./features/analytics/menu-engineering-dashboard/menu-engineering-dashboard').then(m => m.MenuEngineeringDashboard) },
      { path: 'close-of-day', loadComponent: () => import('./features/reports/close-of-day/close-of-day').then(m => m.CloseOfDay) },

      // Customers
      { path: 'customers', loadComponent: () => import('./features/crm/customer-dashboard/customer-dashboard').then(m => m.CustomerDashboard) },
      { path: 'marketing', loadComponent: () => import('./features/marketing/campaign-builder/campaign-builder').then(m => m.CampaignBuilder) },

      // Operations
      { path: 'food-cost', loadComponent: () => import('./features/food-cost/food-cost-dashboard/food-cost-dashboard').then(m => m.FoodCostDashboard) },
      { path: 'scheduling', loadComponent: () => import('./features/labor/staff-scheduling/staff-scheduling').then(m => m.StaffScheduling) },
      { path: 'invoicing', loadComponent: () => import('./features/invoicing/invoice-manager/invoice-manager').then(m => m.InvoiceManager) },
      { path: 'cash-drawer', loadComponent: () => import('./features/pos/cash-drawer/cash-drawer').then(m => m.CashDrawer) },
      { path: 'monitoring', loadComponent: () => import('./features/monitoring/monitoring-agent/monitoring-agent').then(m => m.MonitoringAgent) },

      // AI Tools
      { path: 'ai-chat', loadComponent: () => import('./features/ai-chat/chat-assistant/chat-assistant').then(m => m.ChatAssistant) },
      { path: 'voice-order', loadComponent: () => import('./features/voice-ordering/voice-order/voice-order').then(m => m.VoiceOrder) },
      { path: 'dynamic-pricing', loadComponent: () => import('./features/pricing/dynamic-pricing/dynamic-pricing').then(m => m.DynamicPricing) },
      { path: 'waste-tracker', loadComponent: () => import('./features/waste/waste-tracker/waste-tracker').then(m => m.WasteTracker) },
      { path: 'sentiment', loadComponent: () => import('./features/sentiment/sentiment-dashboard/sentiment-dashboard').then(m => m.SentimentDashboard) },

      // Admin
      { path: 'multi-location', loadComponent: () => import('./features/multi-location/multi-location-dashboard/multi-location-dashboard').then(m => m.MultiLocationDashboard) },
      { path: 'settings', loadComponent: () => import('./features/settings/control-panel/control-panel').then(m => m.ControlPanel) },

      // Default — mode-aware redirect
      { path: '', canActivate: [deviceModeRedirectGuard], children: [] },
    ],
  },

  // Wildcard
  { path: '**', redirectTo: 'login' },
];
