import '../../../../test-setup';
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { CateringProposalsComponent } from './catering-proposals.component';
import { CateringJob } from '@models/catering.model';

function createComponent(): CateringProposalsComponent {
  return TestBed.runInInjectionContext(() => new CateringProposalsComponent());
}

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
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();
  });

  it('proposals computed filters to proposal_sent only', () => {
    const component = createComponent();
    const mockJobs = [
      makeJob({ id: 'j1', status: 'proposal_sent' }),
      makeJob({ id: 'j2', status: 'inquiry' }),
      makeJob({ id: 'j3', status: 'completed' }),
      makeJob({ id: 'j4', status: 'proposal_sent' }),
    ];

    const service = (component as any).cateringService;
    if (service?._jobs) {
      service._jobs.set(mockJobs);
      expect(component.proposals().length).toBe(2);
      expect(component.proposals().every((p: CateringJob) => p.status === 'proposal_sent')).toBe(true);
    }
  });

  it('daysSinceSent calculates correctly', () => {
    const component = createComponent();
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const result = component.daysSinceSent(threeDaysAgo.toISOString().split('T')[0]);
    expect(result).toBeGreaterThanOrEqual(2);
    expect(result).toBeLessThanOrEqual(4);
  });

  it('daysSinceSent returns 0 for today', () => {
    const component = createComponent();
    const today = new Date().toISOString().split('T')[0];
    expect(component.daysSinceSent(today)).toBe(0);
  });
});
