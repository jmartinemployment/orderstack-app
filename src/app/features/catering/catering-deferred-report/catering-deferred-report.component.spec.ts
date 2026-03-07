import { describe, it, expect } from 'vitest';
import { CateringDeferredReportComponent } from './catering-deferred-report.component';

describe('CateringDeferredReportComponent', () => {
  it('loading defaults to false', () => {
    const component = new CateringDeferredReportComponent();
    expect(component._loading()).toBe(false);
  });

  it('entries defaults to empty', () => {
    const component = new CateringDeferredReportComponent();
    expect(component._entries()).toEqual([]);
  });

  it('totals compute correctly', () => {
    const component = new CateringDeferredReportComponent();
    component._entries.set([
      { jobId: 'j1', title: 'Job 1', fulfillmentDate: '2026-04-01', totalCents: 100000, paidCents: 50000, recognizedCents: 30000, deferredCents: 20000 },
      { jobId: 'j2', title: 'Job 2', fulfillmentDate: '2026-05-01', totalCents: 200000, paidCents: 100000, recognizedCents: 60000, deferredCents: 40000 },
    ]);
    expect(component.totalBooked()).toBe(300000);
    expect(component.totalCollected()).toBe(150000);
    expect(component.totalRecognized()).toBe(90000);
    expect(component.totalDeferred()).toBe(60000);
  });

  it('totals are zero when entries empty', () => {
    const component = new CateringDeferredReportComponent();
    expect(component.totalBooked()).toBe(0);
    expect(component.totalDeferred()).toBe(0);
  });
});
