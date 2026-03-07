import { describe, it, expect } from 'vitest';
import { CateringRevenueReportComponent } from './catering-revenue-report.component';

describe('CateringRevenueReportComponent', () => {
  it('loading defaults to false', () => {
    const component = new CateringRevenueReportComponent();
    expect(component._loading()).toBe(false);
  });

  it('report defaults to null', () => {
    const component = new CateringRevenueReportComponent();
    expect(component._report()).toBeNull();
  });

  it('barWidth calculates percentage correctly', () => {
    const component = new CateringRevenueReportComponent();
    expect(component.barWidth(500, 1000)).toBe('50%');
    expect(component.barWidth(1000, 1000)).toBe('100%');
    expect(component.barWidth(0, 0)).toBe('0%');
  });

  it('dismissError clears error signal', () => {
    const component = new CateringRevenueReportComponent();
    component._error.set('some error');
    component.dismissError();
    expect(component._error()).toBeNull();
  });
});
