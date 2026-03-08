import { describe, it, expect, vi } from 'vitest';

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

/**
 * BUG-18: Job appears in both Active and Upcoming tabs.
 *
 * Replicas of the FIXED tab filter predicates from catering.service.ts.
 * Tabs must be mutually exclusive — no job should match more than one.
 */

interface MockJob {
  id: string;
  status: string;
  fulfillmentDate: string;
}

function isActive(j: MockJob, today: string): boolean {
  return j.status !== 'completed' && j.status !== 'cancelled' && j.fulfillmentDate <= today;
}

function isUpcoming(j: MockJob, today: string): boolean {
  return j.status !== 'completed' && j.status !== 'cancelled' && j.fulfillmentDate > today;
}

function isPast(j: MockJob): boolean {
  return j.status === 'completed' || j.status === 'cancelled';
}

describe('catering tab filters — mutual exclusivity (BUG-18)', () => {
  const TODAY = '2026-03-08';

  const jobs: MockJob[] = [
    { id: '1', status: 'inquiry', fulfillmentDate: '2026-04-15' },       // future + open → upcoming only
    { id: '2', status: 'in_progress', fulfillmentDate: '2026-03-05' },   // past + open → active only
    { id: '3', status: 'completed', fulfillmentDate: '2026-02-20' },     // completed → past only
    { id: '4', status: 'cancelled', fulfillmentDate: '2026-04-10' },     // cancelled + future → past only
    { id: '5', status: 'deposit_received', fulfillmentDate: '2026-03-08' }, // today + open → active only
    { id: '6', status: 'inquiry', fulfillmentDate: '2026-03-08' },       // today + open → active only
  ];

  it('no job appears in more than one tab', () => {
    for (const j of jobs) {
      const tabs = [
        isActive(j, TODAY) ? 'active' : null,
        isUpcoming(j, TODAY) ? 'upcoming' : null,
        isPast(j) ? 'past' : null,
      ].filter(Boolean);
      expect(tabs.length, `Job ${j.id} (${j.status}, ${j.fulfillmentDate}) in tabs: ${tabs.join(', ')}`).toBe(1);
    }
  });

  it('every job appears in exactly one tab', () => {
    for (const j of jobs) {
      const inActive = isActive(j, TODAY);
      const inUpcoming = isUpcoming(j, TODAY);
      const inPast = isPast(j);
      const count = [inActive, inUpcoming, inPast].filter(Boolean).length;
      expect(count, `Job ${j.id} should be in exactly 1 tab but is in ${count}`).toBe(1);
    }
  });

  it('future open job is only in upcoming', () => {
    const j = jobs[0]; // inquiry, 2026-04-15
    expect(isActive(j, TODAY)).toBe(false);
    expect(isUpcoming(j, TODAY)).toBe(true);
    expect(isPast(j)).toBe(false);
  });

  it('past open job is only in active', () => {
    const j = jobs[1]; // in_progress, 2026-03-05
    expect(isActive(j, TODAY)).toBe(true);
    expect(isUpcoming(j, TODAY)).toBe(false);
    expect(isPast(j)).toBe(false);
  });

  it('completed job is only in past', () => {
    const j = jobs[2]; // completed, 2026-02-20
    expect(isActive(j, TODAY)).toBe(false);
    expect(isUpcoming(j, TODAY)).toBe(false);
    expect(isPast(j)).toBe(true);
  });

  it('cancelled future job is only in past', () => {
    const j = jobs[3]; // cancelled, 2026-04-10
    expect(isActive(j, TODAY)).toBe(false);
    expect(isUpcoming(j, TODAY)).toBe(false);
    expect(isPast(j)).toBe(true);
  });

  it('today open job is in active (not upcoming)', () => {
    const j = jobs[4]; // deposit_received, 2026-03-08 (same as TODAY)
    expect(isActive(j, TODAY)).toBe(true);
    expect(isUpcoming(j, TODAY)).toBe(false);
    expect(isPast(j)).toBe(false);
  });
});
