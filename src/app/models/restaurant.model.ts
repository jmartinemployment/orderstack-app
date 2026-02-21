import type { MerchantProfile } from './platform.model';

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  description?: string;
  address: string;
  phone?: string;
  email?: string;
  logo?: string;
  timezone: string;
  currency: string;
  taxRate: number;
  isActive: boolean;
  settings: RestaurantSettings;
  merchantProfile?: MerchantProfile;
  createdAt: string;
  updatedAt: string;
}

export interface RestaurantSettings {
  orderTypes: {
    pickup: boolean;
    delivery: boolean;
    dineIn: boolean;
  };
  paymentMethods: {
    cash: boolean;
    card: boolean;
    online: boolean;
  };
  notifications: {
    newOrderSound: boolean;
    readyOrderSound: boolean;
  };
}

export interface Device {
  id: string;
  restaurantId: string;
  deviceId: string;
  name: string;
  type: 'sos' | 'kds' | 'online';
  isActive: boolean;
  lastSeenAt: string;
  createdAt: string;
}
