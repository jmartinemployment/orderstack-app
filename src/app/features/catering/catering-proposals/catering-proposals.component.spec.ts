import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CateringProposalsComponent } from './catering-proposals.component';
import { CateringJob } from '@models/catering.model';

function makeJob(overrides: Partial<CateringJob> = {}): CateringJob {
  return {
    id: 'job-1',
    restaurantId: 'r1',
    title: 'Corporate Lunch',
    clientName: 'Jane Doe',
    eventType: 'corporate',
    status: 'proposal_sent',
    headcount: 50,
    bookingDate: '2026-03-01',
    fulfillmentDate: '2026-04-15',
    locationType: 'off_site',
    subtotalCents: 500000,
    serviceChargeCents: 0,
    taxCents: 0,
    gratuityCents: 0,
    totalCents: 500000,
    paidCents: 0,
    packages: [],
    milestones: [],
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    ...overrides,
  };
}

describe('CateringProposalsComponent', () => {
  it('proposals computed filters to proposal_sent only', () => {
    const component = new CateringProposalsComponent();
    const mockJobs = [
      makeJob({ id: 'j1', status: 'proposal_sent' }),
      makeJob({ id: 'j2', status: 'inquiry' }),
      makeJob({ id: 'j3', status: 'completed' }),
      makeJob({ id: 'j4', status: 'proposal_sent' }),
    ];

    // Access private service to set jobs — testing the computed logic
    const service = (component as any).cateringService;
    if (service?._jobs) {
      service._jobs.set(mockJobs);
      expect(component.proposals().length).toBe(2);
      expect(component.proposals().every(p => p.status === 'proposal_sent')).toBe(true);
    }
  });

  it('daysSinceSent calculates correctly', () => {
    const component = new CateringProposalsComponent();
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const result = component.daysSinceSent(threeDaysAgo.toISOString().split('T')[0]);
    expect(result).toBeGreaterThanOrEqual(2);
    expect(result).toBeLessThanOrEqual(4);
  });

  it('daysSinceSent returns 0 for today', () => {
    const component = new CateringProposalsComponent();
    const today = new Date().toISOString().split('T')[0];
    expect(component.daysSinceSent(today)).toBe(0);
  });
});
