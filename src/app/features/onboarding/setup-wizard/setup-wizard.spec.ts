import { describe, it, expect } from 'vitest';
import type { BusinessCategory, BusinessVertical, DevicePosMode } from '@models/index';
import { BUSINESS_CATEGORIES, REVENUE_RANGES } from '@models/index';

// --- Replicate SetupWizard pure logic for testing ---

const BUSINESS_TYPE_MODE_MAP: Record<string, DevicePosMode> = {
  'Caterer': 'catering',
  'Full Service Restaurant': 'full_service',
};

function autoDetectMode(businessType: BusinessCategory | null): DevicePosMode {
  if (businessType) {
    const mapped = BUSINESS_TYPE_MODE_MAP[businessType.name];
    if (mapped) return mapped;
  }
  return 'standard';
}

function filteredBusinessTypes(): BusinessCategory[] {
  const allowed = new Set(['Caterer', 'Full Service Restaurant']);
  return BUSINESS_CATEGORIES.filter(c => allowed.has(c.name));
}

function canProceed(step: number, businessName: string, selectedType: BusinessCategory | null, isSubmitting: boolean, homeValid: boolean, bizValid: boolean): boolean {
  switch (step) {
    case 1: return businessName.trim().length > 0 && homeValid && bizValid;
    case 2: return selectedType !== null;
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
  it('maps Caterer to catering', () => {
    expect(autoDetectMode(makeBizType('Caterer'))).toBe('catering');
  });

  it('maps Full Service Restaurant to full_service', () => {
    expect(autoDetectMode(makeBizType('Full Service Restaurant'))).toBe('full_service');
  });

  it('returns standard for null business type', () => {
    expect(autoDetectMode(null)).toBe('standard');
  });

  it('returns standard for unmapped business type', () => {
    expect(autoDetectMode(makeBizType('Some Unknown Type'))).toBe('standard');
  });
});

describe('SetupWizard — Business Type Filtering', () => {
  it('returns exactly 2 business types', () => {
    const types = filteredBusinessTypes();
    expect(types).toHaveLength(2);
  });

  it('includes Caterer', () => {
    const types = filteredBusinessTypes();
    expect(types.some(t => t.name === 'Caterer')).toBe(true);
  });

  it('includes Full Service Restaurant', () => {
    const types = filteredBusinessTypes();
    expect(types.some(t => t.name === 'Full Service Restaurant')).toBe(true);
  });

  it('BUSINESS_CATEGORIES still contains both entries', () => {
    expect(BUSINESS_CATEGORIES.some(c => c.name === 'Caterer')).toBe(true);
    expect(BUSINESS_CATEGORIES.some(c => c.name === 'Full Service Restaurant')).toBe(true);
  });
});

describe('SetupWizard — Step Validation', () => {
  it('step 1 requires non-empty business name and valid addresses', () => {
    expect(canProceed(1, '', null, false, true, true)).toBe(false);
    expect(canProceed(1, '   ', null, false, true, true)).toBe(false);
    expect(canProceed(1, 'My Business', null, false, true, true)).toBe(true);
  });

  it('step 1 requires valid home address', () => {
    expect(canProceed(1, 'My Business', null, false, false, true)).toBe(false);
  });

  it('step 1 requires valid business address', () => {
    expect(canProceed(1, 'My Business', null, false, true, false)).toBe(false);
  });

  it('step 2 requires selected business type', () => {
    expect(canProceed(2, 'Name', null, false, true, true)).toBe(false);
    expect(canProceed(2, 'Name', makeBizType('Caterer'), false, true, true)).toBe(true);
  });

  it('unknown step returns false', () => {
    expect(canProceed(99, 'Name', makeBizType('Caterer'), false, true, true)).toBe(false);
  });
});

describe('SetupWizard — Progress', () => {
  it('step 1 of 3 = 33%', () => {
    expect(progressPercent(1, 3)).toBe(33);
  });

  it('step 2 of 3 = 67%', () => {
    expect(progressPercent(2, 3)).toBe(67);
  });

  it('step 3 of 3 = 100%', () => {
    expect(progressPercent(3, 3)).toBe(100);
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
