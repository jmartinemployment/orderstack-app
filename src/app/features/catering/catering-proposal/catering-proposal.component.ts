import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { CateringService } from '@services/catering.service';
import { CateringJob } from '@models/index';

@Component({
  selector: 'os-catering-proposal',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './catering-proposal.component.html',
  styleUrl: './catering-proposal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CateringProposalComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly cateringService = inject(CateringService);

  readonly job = signal<CateringJob | null>(null);
  readonly isLoading = signal(true);
  readonly isApproving = signal(false);
  readonly approved = signal(false);
  readonly error = signal<string | null>(null);
  readonly selectedPackageId = signal<string | null>(null);
  readonly contractAcknowledged = signal(false);
  readonly approvedPackageName = signal('');
  readonly approvedTotalCents = signal(0);

  private token = '';

  async ngOnInit(): Promise<void> {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    if (!this.token) {
      this.error.set('Invalid proposal link.');
      this.isLoading.set(false);
      return;
    }

    try {
      const result = await this.cateringService.getProposal(this.token);
      if (result) {
        this.job.set(result);
      } else {
        this.error.set('This proposal was not found or has expired.');
      }
    } catch {
      this.error.set('Unable to load the proposal. Please try again later.');
    } finally {
      this.isLoading.set(false);
    }
  }

  selectPackage(packageId: string): void {
    this.selectedPackageId.set(packageId);
  }

  toggleContractAcknowledged(): void {
    this.contractAcknowledged.set(!this.contractAcknowledged());
  }

  canApprove(): boolean {
    const pkg = this.selectedPackageId();
    if (!pkg) return false;
    const j = this.job();
    if (j?.contractUrl && !this.contractAcknowledged()) return false;
    return true;
  }

  async approvePackage(): Promise<void> {
    const packageId = this.selectedPackageId();
    if (!packageId || this.isApproving()) return;

    this.isApproving.set(true);
    this.error.set(null);

    try {
      const result = await this.cateringService.approveProposal(this.token, packageId);
      if (result?.success) {
        this.approved.set(true);
        this.approvedPackageName.set(result.packageName);
        this.approvedTotalCents.set(result.totalCents);
      } else {
        this.error.set('Unable to approve this proposal. It may have already been approved or expired.');
      }
    } catch {
      this.error.set('Something went wrong. Please try again.');
    } finally {
      this.isApproving.set(false);
    }
  }

  formatCents(cents: number): string {
    return (cents / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  }

  getPricingLabel(model: string): string {
    switch (model) {
      case 'per_person': return 'per person';
      case 'per_tray': return 'per tray';
      case 'flat': return 'flat rate';
      default: return model;
    }
  }

  getTierLabel(tier: string): string {
    switch (tier) {
      case 'standard': return 'Standard';
      case 'premium': return 'Premium';
      case 'custom': return 'Custom';
      default: return tier;
    }
  }
}
