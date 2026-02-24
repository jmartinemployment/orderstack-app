import { describe, it, expect } from 'vitest';
import type { BusinessCategory, BusinessVertical, DevicePosMode } from '@models/index';
import { BUSINESS_CATEGORIES, REVENUE_RANGES } from '@models/index';

// --- Replicate SetupWizard pure logic for testing ---

const BUSINESS_TYPE_MODE_MAP: Record<string, DevicePosMode> = {
  'Fine Dining': 'full_service',
  'Casual Dining': 'full_service',
  'Club / Lounge': 'full_service',
  'Fast Food Restaurant': 'quick_service',
  'Counter Service Restaurant': 'quick_service',
  'Food Truck / Cart': 'quick_service',
  'Ghost / Virtual Kitchen': 'quick_service',
  'Bakery / Pastry Shop': 'quick_service',
  'Coffee / Tea Cafe': 'quick_service',
  'Caterer': 'quick_service',
  'Bar': 'bar',
  'Brewery': 'bar',
  'Specialty Shop': 'retail',
  'Electronics': 'retail',
  'Clothing and Accessories': 'retail',
  'Grocery / Market': 'retail',
  'Pet Store': 'retail',
  'Hair Salon': 'bookings',
  'Nail Salon': 'bookings',
  'Day Spa': 'bookings',
  'Barber Shop': 'bookings',
  'Yoga Studio': 'bookings',
  'Gym / Health Club': 'bookings',
  'Dentistry': 'services',
  'Chiropractor': 'services',
  'Consulting': 'services',
  'Accounting': 'services',
  'Plumbing': 'services',
  'Cleaning': 'services',
  'Other': 'standard',
};

function autoDetectMode(businessType: BusinessCategory | null): DevicePosMode {
  if (businessType) {
    const mapped = BUSINESS_TYPE_MODE_MAP[businessType.name];
    if (mapped) return mapped;
  }
  return 'standard';
}

function filterBusinessTypes(search: string): BusinessCategory[] {
  const q = search.toLowerCase().trim();
  if (!q) return BUSINESS_CATEGORIES;
  return BUSINESS_CATEGORIES.filter(c => c.name.toLowerCase().includes(q));
}

function canProceed(step: number, businessName: string, selectedType: BusinessCategory | null, selectedRevenue: string | null, isSubmitting: boolean): boolean {
  switch (step) {
    case 1: return businessName.trim().length > 0;
    case 2: return selectedType !== null;
    case 3: return selectedRevenue !== null;
    case 4: return true;
    case 5: return !isSubmitting;
    default: return false;
  }
}

function progressPercent(step: number, totalSteps: number): number {
  return Math.round((step / totalSteps) * 100);
}

function makeBizType(name: string, vertical: BusinessVertical = 'food_and_drink'): BusinessCategory {
  return { name, vertical } as BusinessCategory;
}

// --- Tests ---

describe('SetupWizard — Mode Auto-Detection', () => {
  it('maps Fine Dining to full_service', () => {
    expect(autoDetectMode(makeBizType('Fine Dining'))).toBe('full_service');
  });

  it('maps Casual Dining to full_service', () => {
    expect(autoDetectMode(makeBizType('Casual Dining'))).toBe('full_service');
  });

  it('maps Fast Food Restaurant to quick_service', () => {
    expect(autoDetectMode(makeBizType('Fast Food Restaurant'))).toBe('quick_service');
  });

  it('maps Bar to bar', () => {
    expect(autoDetectMode(makeBizType('Bar'))).toBe('bar');
  });

  it('maps Brewery to bar', () => {
    expect(autoDetectMode(makeBizType('Brewery'))).toBe('bar');
  });

  it('maps Specialty Shop to retail', () => {
    expect(autoDetectMode(makeBizType('Specialty Shop', 'retail'))).toBe('retail');
  });

  it('maps Electronics to retail', () => {
    expect(autoDetectMode(makeBizType('Electronics', 'retail'))).toBe('retail');
  });

  it('maps Clothing and Accessories to retail', () => {
    expect(autoDetectMode(makeBizType('Clothing and Accessories', 'retail'))).toBe('retail');
  });

  it('maps Hair Salon to bookings', () => {
    expect(autoDetectMode(makeBizType('Hair Salon', 'beauty_wellness'))).toBe('bookings');
  });

  it('maps Yoga Studio to bookings', () => {
    expect(autoDetectMode(makeBizType('Yoga Studio', 'sports_fitness'))).toBe('bookings');
  });

  it('maps Consulting to services', () => {
    expect(autoDetectMode(makeBizType('Consulting', 'professional_services'))).toBe('services');
  });

  it('maps Plumbing to services', () => {
    expect(autoDetectMode(makeBizType('Plumbing', 'home_repair'))).toBe('services');
  });

  it('maps Dentistry to services', () => {
    expect(autoDetectMode(makeBizType('Dentistry', 'healthcare'))).toBe('services');
  });

  it('maps Other to standard', () => {
    expect(autoDetectMode(makeBizType('Other'))).toBe('standard');
  });

  it('returns standard for null business type', () => {
    expect(autoDetectMode(null)).toBe('standard');
  });

  it('returns standard for unmapped business type', () => {
    expect(autoDetectMode(makeBizType('Some Unknown Type'))).toBe('standard');
  });
});

describe('SetupWizard — Business Type Filtering', () => {
  it('returns all categories when search is empty', () => {
    expect(filterBusinessTypes('')).toBe(BUSINESS_CATEGORIES);
  });

  it('returns all categories when search is whitespace', () => {
    expect(filterBusinessTypes('   ')).toBe(BUSINESS_CATEGORIES);
  });

  it('filters by name case-insensitively', () => {
    const results = filterBusinessTypes('salon');
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.name.toLowerCase()).toContain('salon');
    }
  });

  it('returns empty for no-match search', () => {
    const results = filterBusinessTypes('zzzzzzzznonexistent');
    expect(results).toHaveLength(0);
  });

  it('finds specific business types', () => {
    const results = filterBusinessTypes('fine dining');
    expect(results.some(r => r.name === 'Fine Dining')).toBe(true);
  });

  it('BUSINESS_CATEGORIES contains all verticals', () => {
    const verticals = new Set(BUSINESS_CATEGORIES.map(c => c.vertical));
    expect(verticals.has('food_and_drink')).toBe(true);
    expect(verticals.has('retail')).toBe(true);
    expect(verticals.has('beauty_wellness')).toBe(true);
    expect(verticals.has('healthcare')).toBe(true);
    expect(verticals.has('professional_services')).toBe(true);
  });
});

describe('SetupWizard — Step Validation', () => {
  it('step 1 requires non-empty business name', () => {
    expect(canProceed(1, '', null, null, false)).toBe(false);
    expect(canProceed(1, '   ', null, null, false)).toBe(false);
    expect(canProceed(1, 'My Business', null, null, false)).toBe(true);
  });

  it('step 2 requires selected business type', () => {
    expect(canProceed(2, 'Name', null, null, false)).toBe(false);
    expect(canProceed(2, 'Name', makeBizType('Bar'), null, false)).toBe(true);
  });

  it('step 3 requires selected revenue', () => {
    expect(canProceed(3, 'Name', makeBizType('Bar'), null, false)).toBe(false);
    expect(canProceed(3, 'Name', makeBizType('Bar'), 'rev-1', false)).toBe(true);
  });

  it('step 4 always allows proceed', () => {
    expect(canProceed(4, '', null, null, false)).toBe(true);
  });

  it('step 5 blocks while submitting', () => {
    expect(canProceed(5, '', null, null, true)).toBe(false);
    expect(canProceed(5, '', null, null, false)).toBe(true);
  });

  it('unknown step returns false', () => {
    expect(canProceed(99, 'Name', makeBizType('Bar'), 'rev-1', false)).toBe(false);
  });
});

describe('SetupWizard — Progress', () => {
  it('step 1 of 5 = 20%', () => {
    expect(progressPercent(1, 5)).toBe(20);
  });

  it('step 3 of 5 = 60%', () => {
    expect(progressPercent(3, 5)).toBe(60);
  });

  it('step 5 of 5 = 100%', () => {
    expect(progressPercent(5, 5)).toBe(100);
  });
});

describe('SetupWizard — Revenue Ranges', () => {
  it('REVENUE_RANGES has entries', () => {
    expect(REVENUE_RANGES.length).toBeGreaterThan(0);
  });

  it('each revenue range has id, label, description', () => {
    for (const range of REVENUE_RANGES) {
      expect(range.id).toBeTruthy();
      expect(range.label).toBeTruthy();
      expect(range.description).toBeTruthy();
    }
  });
});
