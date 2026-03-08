import { TEST_PASSWORDS } from './credentials';

export const CREDENTIALS = {
  owner: { email: 'owner@taipa.com', password: TEST_PASSWORDS.owner },
  manager: { email: 'manager@taipa.com', password: TEST_PASSWORDS.manager },
  staff: { email: 'staff@taipa.com', password: TEST_PASSWORDS.staff },
  admin: { email: 'admin@orderstack.com', password: TEST_PASSWORDS.admin },
};

export const RESTAURANT_ID = 'f2cfe8dd-48f3-4596-ab1e-22a28b23ad38';

export const ROUTES = {
  login: '/login',
  signup: '/signup',
  selectRestaurant: '/select-restaurant',
  setup: '/setup',
  home: '/home',
  pos: '/pos',
  orderPad: '/order-pad',
  kds: '/kds',
  sos: '/sos',
  menu: '/menu',
  combos: '/combos',
  floorPlan: '/floor-plan',
  bookings: '/bookings',
  orders: '/orders',
  orderHistory: '/order-history',
  scheduling: '/scheduling',
  closeOfDay: '/close-of-day',
  reports: '/reports',
  sales: '/sales',
  settings: '/settings',
  customers: '/customers',
  marketing: '/marketing',
  cashDrawer: '/cash-drawer',
  inventory: '/inventory',
  invoicing: '/invoicing',
  multiLocation: '/multi-location',
} as const;
