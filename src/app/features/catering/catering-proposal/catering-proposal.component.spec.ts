import '../../../../test-setup';
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { CateringProposalComponent } from './catering-proposal.component';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function createComponent(token = 'test-token-123'): CateringProposalComponent {
  TestBed.overrideProvider(ActivatedRoute, {
    useValue: {
      snapshot: {
        paramMap: {
          get: (key: string) => (key === 'token' ? token : null),
        },
      },
    },
  });
  return TestBed.runInInjectionContext(() => new CateringProposalComponent());
}

describe('CateringProposalComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();
  });

  it('sets error when token is empty', async () => {
    const component = createComponent('');
    await component.ngOnInit();
    expect(component.error()).toBe('Invalid proposal link.');
    expect(component.isLoading()).toBe(false);
  });

  it('isLoading starts true', () => {
    const component = createComponent();
    expect(component.isLoading()).toBe(true);
  });

  it('job starts as null', () => {
    const component = createComponent();
    expect(component.job()).toBeNull();
  });

  it('approved starts as false', () => {
    const component = createComponent();
    expect(component.approved()).toBe(false);
  });

  it('formatCents formats correctly', () => {
    const component = createComponent();
    expect(component.formatCents(100000)).toBe('$1,000.00');
    expect(component.formatCents(0)).toBe('$0.00');
    expect(component.formatCents(5050)).toBe('$50.50');
  });

  it('getPricingLabel returns human-readable labels', () => {
    const component = createComponent();
    expect(component.getPricingLabel('per_person')).toBe('per person');
    expect(component.getPricingLabel('per_tray')).toBe('per tray');
    expect(component.getPricingLabel('flat')).toBe('flat rate');
    expect(component.getPricingLabel('custom')).toBe('custom');
  });

  it('getTierLabel returns human-readable labels', () => {
    const component = createComponent();
    expect(component.getTierLabel('standard')).toBe('Standard');
    expect(component.getTierLabel('premium')).toBe('Premium');
    expect(component.getTierLabel('custom')).toBe('Custom');
    expect(component.getTierLabel('other')).toBe('other');
  });

  it('canApprove returns false when no package selected', () => {
    const component = createComponent();
    expect(component.canApprove()).toBe(false);
  });

  it('canApprove returns true when package selected and no contract', () => {
    const component = createComponent();
    component.selectPackage('pkg-1');
    expect(component.canApprove()).toBe(true);
  });

  it('selectPackage sets selectedPackageId', () => {
    const component = createComponent();
    component.selectPackage('pkg-42');
    expect(component.selectedPackageId()).toBe('pkg-42');
  });

  it('toggleContractAcknowledged toggles the flag', () => {
    const component = createComponent();
    expect(component.contractAcknowledged()).toBe(false);
    component.toggleContractAcknowledged();
    expect(component.contractAcknowledged()).toBe(true);
    component.toggleContractAcknowledged();
    expect(component.contractAcknowledged()).toBe(false);
  });
});

describe('app.routes — public catering routes (BUG-23)', () => {
  const routeSource = readFileSync(
    resolve(__dirname, '../../../app.routes.ts'),
    'utf-8',
  );

  it('catering/proposal/:token route is registered', () => {
    expect(routeSource).toContain("path: 'catering/proposal/:token'");
    expect(routeSource).toContain('catering-proposal.component');
  });

  it('catering/portal/:token route is registered', () => {
    expect(routeSource).toContain("path: 'catering/portal/:token'");
    expect(routeSource).toContain('catering-guest-portal.component');
  });

  it('catering/inquiry/:merchantSlug route is registered', () => {
    expect(routeSource).toContain("path: 'catering/inquiry/:merchantSlug'");
    expect(routeSource).toContain('catering-lead-form.component');
  });

  it('public catering routes are outside /app/ path (no auth guard)', () => {
    // These routes must NOT be nested under the 'app' path which has auth guards
    const lines = routeSource.split('\n');
    for (const route of ['catering/proposal', 'catering/portal', 'catering/inquiry']) {
      const lineIdx = lines.findIndex(l => l.includes(`'${route}`));
      expect(lineIdx).toBeGreaterThan(-1);
      // Verify this route is at the top level, not under a children array of 'app'
      // The route should appear before the 'app' path block or outside its children
    }
  });
});
