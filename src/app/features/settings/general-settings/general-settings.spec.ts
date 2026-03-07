import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MerchantProfile, BusinessAddress, BusinessHoursDay } from '@models/index';

// --- Pure function replica of GeneralSettings.loadFromProfile ---

const DAYS: BusinessHoursDay['day'][] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
];

interface FormState {
  businessName: string;
  street: string;
  street2: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  timezone: string;
  businessHours: BusinessHoursDay[];
}

function loadFromProfile(profile: MerchantProfile | null): FormState | null {
  if (!profile) return null;

  return {
    businessName: profile.businessName,
    street: profile.address?.street ?? '',
    street2: profile.address?.street2 ?? '',
    city: profile.address?.city ?? '',
    state: profile.address?.state ?? '',
    zip: profile.address?.zip ?? '',
    phone: profile.address?.phone ?? '',
    timezone: profile.address?.timezone ?? 'America/New_York',
    businessHours:
      (profile.businessHours ?? []).length > 0
        ? structuredClone(profile.businessHours)
        : DAYS.map(day => ({ day, open: '09:00', close: '22:00', closed: false })),
  };
}

// --- Fixtures ---

function makeProfile(overrides: Partial<MerchantProfile> = {}): MerchantProfile {
  return {
    id: 'mp-1',
    businessName: 'Test Restaurant',
    address: {
      street: '123 Main St',
      street2: null,
      city: 'Miami',
      state: 'FL',
      zip: '33101',
      country: 'US',
      timezone: 'America/New_York',
      phone: '305-555-1234',
      lat: null,
      lng: null,
    },
    verticals: ['food_and_drink'],
    primaryVertical: 'food_and_drink',
    complexity: 'full',
    enabledModules: [],
    defaultDeviceMode: 'full_service',
    taxLocale: { taxRate: 7, taxInclusive: false, currency: 'USD', defaultLanguage: 'en' },
    businessHours: [],
    onboardingComplete: true,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  } as MerchantProfile;
}

// --- Tests ---

describe('GeneralSettings — loadFromProfile', () => {
  it('does not throw when address is null', () => {
    const profile = makeProfile({ address: null as unknown as BusinessAddress });

    let result: FormState | null = null;
    expect(() => {
      result = loadFromProfile(profile);
    }).not.toThrow();

    expect(result).not.toBeNull();
    expect(result!.street).toBe('');
    expect(result!.city).toBe('');
    expect(result!.state).toBe('');
    expect(result!.zip).toBe('');
  });

  it('does not throw when address is undefined', () => {
    const profile = makeProfile({ address: undefined as unknown as BusinessAddress });

    let result: FormState | null = null;
    expect(() => {
      result = loadFromProfile(profile);
    }).not.toThrow();

    expect(result).not.toBeNull();
    expect(result!.street).toBe('');
    expect(result!.city).toBe('');
    expect(result!.state).toBe('');
    expect(result!.zip).toBe('');
  });

  it('populates address fields when address is present', () => {
    const profile = makeProfile({
      address: {
        street: '456 Oak Ave',
        street2: 'Suite 200',
        city: 'Fort Lauderdale',
        state: 'FL',
        zip: '33301',
        country: 'US',
        timezone: 'America/New_York',
        phone: '954-555-9999',
        lat: null,
        lng: null,
      },
    });

    const result = loadFromProfile(profile)!;

    expect(result.street).toBe('456 Oak Ave');
    expect(result.street2).toBe('Suite 200');
    expect(result.city).toBe('Fort Lauderdale');
    expect(result.state).toBe('FL');
    expect(result.zip).toBe('33301');
    expect(result.phone).toBe('954-555-9999');
    expect(result.timezone).toBe('America/New_York');
  });

  it('populates non-address fields even when address is null', () => {
    const profile = makeProfile({
      businessName: 'Null Address Bistro',
      address: null as unknown as BusinessAddress,
    });

    const result = loadFromProfile(profile)!;

    expect(result.businessName).toBe('Null Address Bistro');
    expect(result.timezone).toBe('America/New_York');
    expect(result.street).toBe('');
    expect(result.city).toBe('');
  });

  it('handles partially populated address', () => {
    const profile = makeProfile({
      address: {
        street: '789 Elm Blvd',
        street2: null,
        city: undefined as unknown as string,
        state: null as unknown as string,
        zip: '',
        country: 'US',
        timezone: 'America/Chicago',
        phone: null,
        lat: null,
        lng: null,
      },
    });

    const result = loadFromProfile(profile)!;

    expect(result.street).toBe('789 Elm Blvd');
    expect(result.street2).toBe('');
    expect(result.city).toBe('');
    expect(result.state).toBe('');
    expect(result.zip).toBe('');
    expect(result.phone).toBe('');
    expect(result.timezone).toBe('America/Chicago');
  });
});
