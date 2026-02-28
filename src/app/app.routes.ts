import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';
import { onboardingGuard } from './guards/onboarding.guard';
import { deviceModeRedirectGuard } from './guards/device-mode.guard';
import { administrationGuard } from './guards/administration.guard';
import { deviceInitResolver } from './resolvers/device-init.resolver';
import { MainLayoutComponent } from './layouts/main-layout.component';
import { AuthLayoutComponent } from './layouts/auth-layout.component';

export const routes: Routes = [
  // Public routes (redirect authenticated users away)
  {
    path: 'signup',
    canActivate: [guestGuard],
    component: AuthLayoutComponent,
    children: [
      { path: '', loadComponent: () => import('./features/auth/login/login').then(m => m.Login) },
    ],
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    component: AuthLayoutComponent,
    children: [
      { path: '', loadComponent: () => import('./features/auth/login/login').then(m => m.Login) },
    ],
  },
  {
    path: 'pair',
    component: AuthLayoutComponent,
    children: [
      { path: '', loadComponent: () => import('./features/auth/pair-device').then(m => m.PairDevice) },
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
    path: 'staff',
    loadComponent: () => import('./features/staff/staff-portal/staff-portal').then(m => m.StaffPortal),
  },
  {
    path: 'guest-check',
    loadComponent: () => import('./features/online-ordering/guest-check/guest-check').then(m => m.GuestCheck),
  },
  {
    path: 'account/:restaurantSlug',
    loadComponent: () => import('./features/online-ordering/customer-portal/customer-portal').then(m => m.CustomerPortal),
  },
  {
    path: 'pay/:checkToken',
    loadComponent: () => import('./features/online-ordering/scan-to-pay/scan-to-pay').then(m => m.ScanToPay),
  },
  {
    path: 'customer-display',
    loadComponent: () => import('./features/pos/customer-display/customer-display').then(m => m.CustomerDisplay),
  },
  {
    path: 'shop/:storeSlug',
    loadComponent: () => import('./features/retail/ecommerce/product-list/product-list').then(m => m.ProductList),
  },
  {
    path: 'shop/:storeSlug/product/:productId',
    loadComponent: () => import('./features/retail/ecommerce/product-detail/product-detail').then(m => m.ProductDetail),
  },
  {
    path: 'shop/:storeSlug/checkout',
    loadComponent: () => import('./features/retail/ecommerce/retail-checkout/retail-checkout').then(m => m.RetailCheckout),
  },
  {
    path: 'select-restaurant',
    canActivate: [authGuard],
    loadComponent: () => import('./features/auth/restaurant-select/restaurant-select').then(m => m.RestaurantSelect),
  },
  {
    path: 'onboarding-checklist',
    canActivate: [authGuard],
    component: AuthLayoutComponent,
    children: [
      { path: '', loadComponent: () => import('./features/onboarding/team-onboarding/team-onboarding').then(m => m.TeamOnboarding) },
    ],
  },
  {
    path: 'onboarding',
    redirectTo: 'onboarding-checklist',
    pathMatch: 'full',
  },

  // Dedicated device routes — full-screen, no sidebar
  {
    path: 'kiosk',
    canActivate: [authGuard, onboardingGuard],
    resolve: { deviceInit: deviceInitResolver },
    loadComponent: () => import('./features/kiosk/kiosk-terminal/kiosk-terminal').then(m => m.KioskTerminal),
  },
  {
    path: 'kds',
    canActivate: [authGuard, onboardingGuard],
    resolve: { deviceInit: deviceInitResolver },
    loadComponent: () => import('./features/kds/kds-display/kds-display').then(m => m.KdsDisplay),
  },

  // Authenticated routes
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard, onboardingGuard],
    resolve: { deviceInit: deviceInitResolver },
    children: [

      // Home / Administration
      { path: 'home', loadComponent: () => import('./features/home/home-dashboard/home-dashboard').then(m => m.HomeDashboard) },
      { path: 'administration', canActivate: [administrationGuard], loadComponent: () => import('./features/home/home-dashboard/home-dashboard').then(m => m.HomeDashboard) },
      { path: 'hardware-guide', loadComponent: () => import('./features/home/hardware-guide/hardware-guide').then(m => m.HardwareGuide) },

      // Orders
      { path: 'orders', loadComponent: () => import('./features/orders/pending-orders/pending-orders').then(m => m.PendingOrders) },
      { path: 'order-history', loadComponent: () => import('./features/orders/order-history/order-history').then(m => m.OrderHistory) },
      { path: 'order-pad', redirectTo: 'pos', pathMatch: 'full' },
      { path: 'pos', loadComponent: () => import('./features/pos/server-pos-terminal/server-pos-terminal').then(m => m.ServerPosTerminal) },

      // SOS redirects to kiosk (consolidated)
      { path: 'sos', redirectTo: '/kiosk', pathMatch: 'full' },

      // Front of House
      { path: 'floor-plan', loadComponent: () => import('./features/table-mgmt/floor-plan/floor-plan').then(m => m.FloorPlan) },
      { path: 'tables', redirectTo: 'floor-plan', pathMatch: 'full' },
      { path: 'reservations', loadComponent: () => import('./features/reservations/reservation-manager/reservation-manager').then(m => m.ReservationManager) },

      // Menu
      { path: 'menu', loadComponent: () => import('./features/menu-mgmt/menu-management').then(m => m.MenuManagement) },
      { path: 'combos', loadComponent: () => import('./features/menu-mgmt/combo-management/combo-management').then(m => m.ComboManagement) },

      // Inventory
      { path: 'inventory', loadComponent: () => import('./features/inventory/inventory-dashboard/inventory-dashboard').then(m => m.InventoryDashboard) },
      { path: 'suppliers', loadComponent: () => import('./features/suppliers/supplier-management').then(m => m.SupplierManagement) },

      // Analytics
      { path: 'command-center', loadComponent: () => import('./features/analytics/command-center/command-center').then(m => m.CommandCenter) },
      { path: 'sales', loadComponent: () => import('./features/analytics/sales-dashboard/sales-dashboard').then(m => m.SalesDashboard) },
      { path: 'analytics/sales', redirectTo: 'sales', pathMatch: 'full' },
      { path: 'menu-engineering', loadComponent: () => import('./features/analytics/menu-engineering-dashboard/menu-engineering-dashboard').then(m => m.MenuEngineeringDashboard) },
      { path: 'close-of-day', loadComponent: () => import('./features/reports/close-of-day/close-of-day').then(m => m.CloseOfDay) },
      { path: 'reports', loadComponent: () => import('./features/reports/report-dashboard/report-dashboard').then(m => m.ReportDashboard) },

      // Customers
      { path: 'customers', loadComponent: () => import('./features/crm/customer-dashboard/customer-dashboard').then(m => m.CustomerDashboard) },
      { path: 'crm', redirectTo: 'customers', pathMatch: 'full' },
      { path: 'marketing', loadComponent: () => import('./features/marketing/campaign-builder/campaign-builder').then(m => m.CampaignBuilder) },

      // Operations
      { path: 'food-cost', loadComponent: () => import('./features/food-cost/food-cost-dashboard/food-cost-dashboard').then(m => m.FoodCostDashboard) },
      { path: 'scheduling', loadComponent: () => import('./features/labor/staff-scheduling/staff-scheduling').then(m => m.StaffScheduling) },
      { path: 'labor', redirectTo: 'scheduling', pathMatch: 'full' },
      { path: 'invoicing', loadComponent: () => import('./features/invoicing/invoice-manager/invoice-manager').then(m => m.InvoiceManager) },
      { path: 'cash-drawer', loadComponent: () => import('./features/pos/cash-drawer/cash-drawer').then(m => m.CashDrawer) },
      { path: 'monitoring', loadComponent: () => import('./features/monitoring/monitoring-agent/monitoring-agent').then(m => m.MonitoringAgent) },

      // AI Tools
      { path: 'ai-chat', loadComponent: () => import('./features/ai-chat/chat-assistant/chat-assistant').then(m => m.ChatAssistant) },
      { path: 'voice-order', loadComponent: () => import('./features/voice-ordering/voice-order/voice-order').then(m => m.VoiceOrder) },
      { path: 'voice-ordering', redirectTo: 'voice-order', pathMatch: 'full' },
      { path: 'dynamic-pricing', loadComponent: () => import('./features/pricing/dynamic-pricing/dynamic-pricing').then(m => m.DynamicPricing) },
      { path: 'pricing', redirectTo: 'dynamic-pricing', pathMatch: 'full' },
      { path: 'waste-tracker', loadComponent: () => import('./features/waste/waste-tracker/waste-tracker').then(m => m.WasteTracker) },
      { path: 'waste', redirectTo: 'waste-tracker', pathMatch: 'full' },
      { path: 'sentiment', loadComponent: () => import('./features/sentiment/sentiment-dashboard/sentiment-dashboard').then(m => m.SentimentDashboard) },

      // Retail
      { path: 'retail/catalog', loadComponent: () => import('./features/retail/catalog-management/catalog-management').then(m => m.CatalogManagement) },
      { path: 'retail/variations', loadComponent: () => import('./features/retail/variation-editor/variation-editor').then(m => m.VariationEditor) },
      { path: 'retail/inventory', loadComponent: () => import('./features/retail/inventory/retail-inventory/retail-inventory').then(m => m.RetailInventory) },
      { path: 'retail/pos', loadComponent: () => import('./features/retail/retail-pos/retail-pos').then(m => m.RetailPos) },
      { path: 'retail/returns', loadComponent: () => import('./features/retail/returns/returns').then(m => m.ReturnProcessing) },
      { path: 'retail/vendors', loadComponent: () => import('./features/retail/vendor-management/vendor-management').then(m => m.RetailVendorManagement) },
      { path: 'retail/purchase-orders', loadComponent: () => import('./features/retail/purchase-orders/purchase-orders').then(m => m.RetailPurchaseOrders) },
      { path: 'retail/reports', loadComponent: () => import('./features/retail/reports/retail-reports').then(m => m.RetailReports) },
      { path: 'retail/fulfillment', loadComponent: () => import('./features/retail/fulfillment/fulfillment-dashboard').then(m => m.FulfillmentDashboard) },
      { path: 'retail/ecommerce', loadComponent: () => import('./features/retail/fulfillment/fulfillment-dashboard').then(m => m.FulfillmentDashboard) },

      // Tip Management
      { path: 'tip-management', loadComponent: () => import('./features/tip-mgmt/tip-management/tip-management').then(m => m.TipManagement) },
      { path: 'tips', redirectTo: 'tip-management', pathMatch: 'full' },

      // Reports
      { path: 'report-builder', loadComponent: () => import('./features/reports/report-builder/report-builder').then(m => m.ReportBuilder) },

      // Online Ordering (admin management — public portal is at /order/:slug)
      { path: 'online-ordering', loadComponent: () => import('./features/online-ordering/online-order-portal/online-order-portal').then(m => m.OnlineOrderPortal) },

      // Admin
      { path: 'multi-location', loadComponent: () => import('./features/multi-location/multi-location-dashboard/multi-location-dashboard').then(m => m.MultiLocationDashboard) },
      { path: 'settings', loadComponent: () => import('./features/settings/control-panel/control-panel').then(m => m.ControlPanel) },

      // Default — redirect to home
      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ],
  },

];
