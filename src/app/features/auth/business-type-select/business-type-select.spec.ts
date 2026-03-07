import { describe, it, expect } from 'vitest';
import type { DevicePosMode } from '@models/index';

// --- Replicate BusinessTypeSelect pure logic for testing ---

type BusinessTypeOption = 'catering' | 'full_service';

const ZIP_REGEX = /^\d{5}(-\d{4})?$/;

function isValidAddress(
  address: string,
  city: string,
  state: string,
  zip: string,
): boolean {
  const street = address.trim();
  if (street.length < 5) return false;
  if (/\d/.exec(street) === null || /[a-zA-Z]/.exec(street) === null) return false;
  if (city.trim().length === 0) return false;
  if (state.trim().length === 0) return false;
  if (ZIP_REGEX.exec(zip.trim()) === null) return false;
  return true;
}

function canProceed(
  selected: BusinessTypeOption | null,
  businessName: string,
  email: string,
  address: string,
  city: string,
  state: string,
  zip: string,
  isSubmitting: boolean,
): boolean {
  if (isSubmitting) return false;
  if (!selected) return false;
  if (businessName.trim().length === 0) return false;
  if (email.trim().length === 0) return false;
  if (!isValidAddress(address, city, state, zip)) return false;
  return true;
}

function resolveBusinessCategory(type: BusinessTypeOption): string {
  return type === 'catering' ? 'Caterer' : 'Full Service Restaurant';
}

function resolveDefaultDeviceMode(type: BusinessTypeOption): DevicePosMode {
  return type === 'catering' ? 'catering' : 'full_service';
}

// --- Tests ---

describe('BusinessTypeSelect — canProceed validation', () => {
  const valid = {
    selected: 'catering' as BusinessTypeOption,
    name: 'My Catering Co',
    email: 'owner@example.com',
    address: '123 Main St',
    city: 'Miami',
    state: 'FL',
    zip: '33101',
  };

  it('returns true when all fields are valid', () => {
    expect(canProceed(
      valid.selected, valid.name, valid.email,
      valid.address, valid.city, valid.state, valid.zip, false,
    )).toBe(true);
  });

  it('returns false when no business type selected', () => {
    expect(canProceed(
      null, valid.name, valid.email,
      valid.address, valid.city, valid.state, valid.zip, false,
    )).toBe(false);
  });

  it('returns false when business name is empty', () => {
    expect(canProceed(
      valid.selected, '', valid.email,
      valid.address, valid.city, valid.state, valid.zip, false,
    )).toBe(false);
  });

  it('returns false when business name is whitespace', () => {
    expect(canProceed(
      valid.selected, '   ', valid.email,
      valid.address, valid.city, valid.state, valid.zip, false,
    )).toBe(false);
  });

  it('returns false when email is empty', () => {
    expect(canProceed(
      valid.selected, valid.name, '',
      valid.address, valid.city, valid.state, valid.zip, false,
    )).toBe(false);
  });

  it('returns false when address is too short', () => {
    expect(canProceed(
      valid.selected, valid.name, valid.email,
      '1 A', valid.city, valid.state, valid.zip, false,
    )).toBe(false);
  });

  it('returns false when address has no digits', () => {
    expect(canProceed(
      valid.selected, valid.name, valid.email,
      'Main Street', valid.city, valid.state, valid.zip, false,
    )).toBe(false);
  });

  it('returns false when address has no letters', () => {
    expect(canProceed(
      valid.selected, valid.name, valid.email,
      '12345', valid.city, valid.state, valid.zip, false,
    )).toBe(false);
  });

  it('returns false when city is empty', () => {
    expect(canProceed(
      valid.selected, valid.name, valid.email,
      valid.address, '', valid.state, valid.zip, false,
    )).toBe(false);
  });

  it('returns false when state is empty', () => {
    expect(canProceed(
      valid.selected, valid.name, valid.email,
      valid.address, valid.city, '', valid.zip, false,
    )).toBe(false);
  });

  it('returns false when zip is invalid', () => {
    expect(canProceed(
      valid.selected, valid.name, valid.email,
      valid.address, valid.city, valid.state, '123', false,
    )).toBe(false);
  });

  it('returns false when submitting', () => {
    expect(canProceed(
      valid.selected, valid.name, valid.email,
      valid.address, valid.city, valid.state, valid.zip, true,
    )).toBe(false);
  });

  it('accepts full_service business type', () => {
    expect(canProceed(
      'full_service', valid.name, valid.email,
      valid.address, valid.city, valid.state, valid.zip, false,
    )).toBe(true);
  });
});

describe('BusinessTypeSelect — isValidAddress', () => {
  it('accepts standard US address', () => {
    expect(isValidAddress('123 Main St', 'Miami', 'FL', '33101')).toBe(true);
  });

  it('accepts ZIP+4 format', () => {
    expect(isValidAddress('456 Oak Ave', 'Tampa', 'FL', '33601-1234')).toBe(true);
  });

  it('rejects address shorter than 5 characters', () => {
    expect(isValidAddress('1 A', 'Miami', 'FL', '33101')).toBe(false);
  });

  it('rejects address without digits', () => {
    expect(isValidAddress('Main Street', 'Miami', 'FL', '33101')).toBe(false);
  });

  it('rejects address without letters', () => {
    expect(isValidAddress('12345', 'Miami', 'FL', '33101')).toBe(false);
  });

  it('rejects empty city', () => {
    expect(isValidAddress('123 Main St', '', 'FL', '33101')).toBe(false);
  });

  it('rejects empty state', () => {
    expect(isValidAddress('123 Main St', 'Miami', '', '33101')).toBe(false);
  });

  it('rejects invalid zip', () => {
    expect(isValidAddress('123 Main St', 'Miami', 'FL', 'abc')).toBe(false);
  });

  it('rejects zip with too few digits', () => {
    expect(isValidAddress('123 Main St', 'Miami', 'FL', '331')).toBe(false);
  });

  it('rejects zip with too many digits', () => {
    expect(isValidAddress('123 Main St', 'Miami', 'FL', '331011')).toBe(false);
  });
});

describe('BusinessTypeSelect — business type mapping', () => {
  it('catering maps to Caterer category', () => {
    expect(resolveBusinessCategory('catering')).toBe('Caterer');
  });

  it('full_service maps to Full Service Restaurant category', () => {
    expect(resolveBusinessCategory('full_service')).toBe('Full Service Restaurant');
  });

  it('catering maps to catering device mode', () => {
    expect(resolveDefaultDeviceMode('catering')).toBe('catering');
  });

  it('full_service maps to full_service device mode', () => {
    expect(resolveDefaultDeviceMode('full_service')).toBe('full_service');
  });
});
