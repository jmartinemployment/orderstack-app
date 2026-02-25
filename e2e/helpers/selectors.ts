/** Centralized selectors for E2E tests. Update here when templates change. */
export const SEL = {
  // Auth - Login
  loginHeading: 'h2.card-title:has-text("Sign in")',
  signupHeading: 'h1.signup-heading',
  emailInput: 'input[formcontrolname="email"]',
  passwordInput: 'input[formcontrolname="password"]',
  firstNameInput: 'input[formcontrolname="firstName"]',
  lastNameInput: 'input[formcontrolname="lastName"]',
  submitBtn: 'button[type="submit"]',
  switchToSignIn: 'button.link-btn:has-text("Sign in")',
  switchToSignUp: 'button.link-btn:has-text("Sign up")',
  loginError: 'os-error-display',
  validationError: '.invalid-feedback.d-block',
  termsCheckbox: '#terms',

  // Restaurant Select
  restaurantItem: 'button.restaurant-item',
  restaurantName: '.restaurant-name',
  signOutBtn: 'button:has-text("Sign Out")',

  // Main Layout
  sidebar: '.os-sidebar',
  pageHeader: '.os-page-header',
  pageContent: '.os-page-content',

  // POS Terminal
  posTerminal: '.pos-terminal',
  newOrderBtn: '.btn-new-order',
  tableRow: 'button.table-row',
  tabRow: 'button.tab-row',

  // KDS
  kdsDisplay: '.kds-display',
  kdsHeader: '.kds-header',
  orderCard: 'os-order-card',
  stationSelect: '.station-select',
  kdsStats: '.kds-stats',

  // Menu Management
  menuTabs: '.os-tabs',
  menuTab: '.os-tab',
  categoryManagement: 'os-category-management',
  itemManagement: 'os-item-management',
  modifierManagement: 'os-modifier-management',
  scheduleManagement: 'os-schedule-management',

  // Shared
  loadingSpinner: 'os-loading-spinner, .spinner-border',
  errorDisplay: 'os-error-display',
  connectionStatus: 'os-connection-status',
  tabs: '.os-tabs .os-tab',
} as const;
