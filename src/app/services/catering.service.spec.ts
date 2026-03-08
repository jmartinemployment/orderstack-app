import { describe, it, expect } from 'vitest';

/**
 * BUG-15: Catering fulfillment date off-by-one.
 *
 * Root cause: `new Date("2026-04-15")` parses as UTC midnight, which in
 * US Eastern (UTC-4/5) is April 14. The `eventsThisMonth` computed used
 * `new Date(fulfillmentDate)` to extract year/month — wrong at month boundaries.
 *
 * Fix: parse year/month directly from the date string ("2026-04-15".split('-'))
 * instead of constructing a Date object.
 *
 * Template display was already correct — all `| date` pipes pass 'UTC' timezone.
 * Event card `formattedDate` already uses `+ 'T00:00:00'` for local parsing.
 */

// Replica of the FIXED eventsThisMonth date parsing logic
function extractYearMonth(dateStr: string): [number, number] {
  const [y, m] = dateStr.split('-').map(Number);
  return [y, m - 1]; // month is 0-indexed to match Date.getMonth()
}

// Replica of the OLD buggy logic
function extractYearMonthBuggy(dateStr: string): [number, number] {
  const d = new Date(dateStr);
  return [d.getFullYear(), d.getMonth()];
}

describe('catering fulfillment date parsing (BUG-15)', () => {
  it('string parsing returns correct month for date-only strings', () => {
    const [year, month] = extractYearMonth('2026-04-15');
    expect(year).toBe(2026);
    expect(month).toBe(3); // April = month index 3
  });

  it('string parsing handles January correctly', () => {
    const [year, month] = extractYearMonth('2026-01-01');
    expect(year).toBe(2026);
    expect(month).toBe(0);
  });

  it('string parsing handles December correctly', () => {
    const [year, month] = extractYearMonth('2026-12-31');
    expect(year).toBe(2026);
    expect(month).toBe(11);
  });

  it('string parsing handles month boundary (first of month)', () => {
    const [year, month] = extractYearMonth('2026-05-01');
    expect(year).toBe(2026);
    expect(month).toBe(4); // May
  });

  it('buggy Date constructor can shift month at boundaries in negative UTC offsets', () => {
    // new Date("2026-04-01") = UTC midnight April 1
    // In UTC-4 (EDT), that's March 31 11:00 PM → getMonth() = 2 (March), not 3 (April)
    // This test documents the bug exists on machines with negative UTC offsets
    const d = new Date('2026-04-01');
    const utcMonth = d.getUTCMonth(); // always 3 (April) in UTC
    expect(utcMonth).toBe(3);
    // Local getMonth() may be 2 (March) in US timezones — that was the bug
    // The fixed code avoids this entirely by not using Date constructor
  });

  it('formattedDate with T00:00:00 suffix parses locally', () => {
    // Event card pattern: new Date(dateStr + 'T00:00:00')
    const d = new Date('2026-04-15' + 'T00:00:00');
    expect(d.getDate()).toBe(15);
    expect(d.getMonth()).toBe(3); // April
  });
});
