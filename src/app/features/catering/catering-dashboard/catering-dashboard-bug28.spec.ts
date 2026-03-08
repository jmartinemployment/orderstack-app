import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * BUG-28: Catering dashboard status filter <select> missing label.
 *
 * Root cause: The status filter dropdown had no aria-label, id+for pairing,
 * or associated <label> element. Screen readers could not identify its purpose.
 *
 * Fix: Added aria-label="Filter by status" to the <select> element.
 */

const templateSource = readFileSync(
  resolve(__dirname, 'catering-dashboard.component.html'),
  'utf-8',
);

describe('catering-dashboard template — status filter accessibility (BUG-28)', () => {
  it('status filter select has aria-label attribute', () => {
    expect(templateSource).toContain('aria-label="Filter by status"');
  });

  it('aria-label is on the same select element as statusFilter binding', () => {
    // Find the select element that has the statusFilter binding
    const selectMatch = templateSource.match(/<select[^>]*statusFilter[^>]*>/s);
    expect(selectMatch).not.toBeNull();
    expect(selectMatch![0]).toContain('aria-label="Filter by status"');
  });

  it('select element has form-select class for Bootstrap styling', () => {
    const selectMatch = templateSource.match(/<select[^>]*statusFilter[^>]*>/s);
    expect(selectMatch).not.toBeNull();
    expect(selectMatch![0]).toContain('class="form-select"');
  });

  it('search input has placeholder for accessibility', () => {
    expect(templateSource).toContain('placeholder="Search jobs..."');
  });

  it('all select elements in the template have an aria-label', () => {
    const selectTags = templateSource.match(/<select[^>]*>/g) ?? [];
    for (const tag of selectTags) {
      expect(tag, `select element missing aria-label: ${tag}`).toContain('aria-label');
    }
  });

  it('capacity form inputs have associated labels', () => {
    expect(templateSource).toContain('<label class="form-label">Max Events / Day</label>');
    expect(templateSource).toContain('<label class="form-label">Max Headcount / Day</label>');
  });

  it('conflict alerts checkbox has an associated label with for attribute', () => {
    expect(templateSource).toContain('id="conflictAlerts"');
    expect(templateSource).toContain('for="conflictAlerts"');
  });
});
