import { describe, it, expect } from 'vitest';
import { CateringMilestonesComponent } from './catering-milestones.component';

describe('CateringMilestonesComponent', () => {
  it('filter defaults to all', () => {
    const component = new CateringMilestonesComponent();
    expect(component._filter()).toBe('all');
  });

  it('setFilter updates filter signal', () => {
    const component = new CateringMilestonesComponent();
    component.setFilter('overdue');
    expect(component._filter()).toBe('overdue');
  });

  it('getStatusBadge returns Paid for paid milestone', () => {
    const component = new CateringMilestonesComponent();
    const badge = component.getStatusBadge({
      id: 'm1', jobId: 'j1', jobTitle: 'Test', clientName: 'Client',
      label: 'Deposit', percent: 50, amountCents: 10000,
      paidAt: '2026-03-01T00:00:00Z',
    });
    expect(badge.label).toBe('Paid');
    expect(badge.cssClass).toBe('badge-paid');
  });

  it('getStatusBadge returns Overdue for past-due unpaid milestone', () => {
    const component = new CateringMilestonesComponent();
    const badge = component.getStatusBadge({
      id: 'm1', jobId: 'j1', jobTitle: 'Test', clientName: 'Client',
      label: 'Deposit', percent: 50, amountCents: 10000,
      dueDate: '2020-01-01',
    });
    expect(badge.label).toBe('Overdue');
    expect(badge.cssClass).toBe('badge-overdue');
  });

  it('getStatusBadge returns Pending for future unpaid milestone', () => {
    const component = new CateringMilestonesComponent();
    const badge = component.getStatusBadge({
      id: 'm1', jobId: 'j1', jobTitle: 'Test', clientName: 'Client',
      label: 'Final', percent: 50, amountCents: 10000,
      dueDate: '2030-12-31',
    });
    expect(badge.label).toBe('Pending');
    expect(badge.cssClass).toBe('badge-pending');
  });
});
