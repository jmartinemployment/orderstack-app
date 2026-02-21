import { Component, inject, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { CurrencyPipe, PercentPipe, DatePipe, TitleCasePipe, SlicePipe, DecimalPipe } from '@angular/common';
import { MarketingService } from '@services/marketing';
import { CustomerService } from '@services/customer';
import { AuthService } from '@services/auth';
import { LoadingSpinner } from '@shared/loading-spinner/loading-spinner';
import {
  Campaign,
  CampaignFormData,
  CampaignTemplate,
  CampaignChannel,
  CampaignType,
  CampaignStatus,
  MarketingTab,
  CAMPAIGN_TEMPLATES,
  CustomerSegment,
} from '@models/index';

@Component({
  selector: 'os-campaign-builder',
  imports: [CurrencyPipe, PercentPipe, DatePipe, TitleCasePipe, SlicePipe, DecimalPipe, LoadingSpinner],
  templateUrl: './campaign-builder.html',
  styleUrl: './campaign-builder.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignBuilder {
  private readonly marketingService = inject(MarketingService);
  private readonly customerService = inject(CustomerService);
  private readonly authService = inject(AuthService);

  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly isLoading = this.marketingService.isLoading;
  readonly error = this.marketingService.error;
  readonly campaigns = this.marketingService.campaigns;
  readonly draftCampaigns = this.marketingService.draftCampaigns;
  readonly sentCampaigns = this.marketingService.sentCampaigns;
  readonly scheduledCampaigns = this.marketingService.scheduledCampaigns;
  readonly totalSent = this.marketingService.totalSent;
  readonly avgOpenRate = this.marketingService.avgOpenRate;
  readonly totalRevenue = this.marketingService.totalRevenue;
  readonly templates = CAMPAIGN_TEMPLATES;

  private readonly _activeTab = signal<MarketingTab>('campaigns');
  private readonly _statusFilter = signal<CampaignStatus | 'all'>('all');
  private readonly _showForm = signal(false);
  private readonly _editingCampaign = signal<Campaign | null>(null);
  private readonly _selectedCampaign = signal<Campaign | null>(null);
  private readonly _isSaving = signal(false);
  private readonly _isSending = signal(false);

  // Form fields
  private readonly _formName = signal('');
  private readonly _formType = signal<CampaignType>('promotional');
  private readonly _formChannel = signal<CampaignChannel>('email');
  private readonly _formSubject = signal('');
  private readonly _formBody = signal('');
  private readonly _formSmsBody = signal('');
  private readonly _formSegments = signal<string[]>([]);
  private readonly _formTiers = signal<string[]>([]);
  private readonly _formScheduledAt = signal('');
  private readonly _estimatedRecipients = signal(0);

  readonly activeTab = this._activeTab.asReadonly();
  readonly statusFilter = this._statusFilter.asReadonly();
  readonly showForm = this._showForm.asReadonly();
  readonly editingCampaign = this._editingCampaign.asReadonly();
  readonly selectedCampaign = this._selectedCampaign.asReadonly();
  readonly isSaving = this._isSaving.asReadonly();
  readonly isSending = this._isSending.asReadonly();
  readonly formName = this._formName.asReadonly();
  readonly formType = this._formType.asReadonly();
  readonly formChannel = this._formChannel.asReadonly();
  readonly formSubject = this._formSubject.asReadonly();
  readonly formBody = this._formBody.asReadonly();
  readonly formSmsBody = this._formSmsBody.asReadonly();
  readonly formSegments = this._formSegments.asReadonly();
  readonly formTiers = this._formTiers.asReadonly();
  readonly formScheduledAt = this._formScheduledAt.asReadonly();
  readonly estimatedRecipients = this._estimatedRecipients.asReadonly();

  readonly allSegments: { key: CustomerSegment; label: string }[] = [
    { key: 'vip', label: 'VIP' },
    { key: 'regular', label: 'Regular' },
    { key: 'new', label: 'New' },
    { key: 'at-risk', label: 'At-Risk' },
    { key: 'dormant', label: 'Dormant' },
  ];

  readonly allTiers: { key: string; label: string }[] = [
    { key: 'bronze', label: 'Bronze' },
    { key: 'silver', label: 'Silver' },
    { key: 'gold', label: 'Gold' },
    { key: 'platinum', label: 'Platinum' },
  ];

  readonly campaignTypes: { key: CampaignType; label: string }[] = [
    { key: 'promotional', label: 'Promotional' },
    { key: 'welcome', label: 'Welcome' },
    { key: 'win-back', label: 'Win-Back' },
    { key: 'birthday', label: 'Birthday' },
    { key: 'loyalty-tier', label: 'Loyalty Tier' },
    { key: 'announcement', label: 'Announcement' },
  ];

  readonly filteredCampaigns = computed(() => {
    const filter = this._statusFilter();
    if (filter === 'all') return this.campaigns();
    return this.campaigns().filter(c => c.status === filter);
  });

  readonly canSave = computed(() => {
    const name = this._formName().trim();
    const channel = this._formChannel();
    const hasEmail = channel === 'email' || channel === 'both';
    const hasSms = channel === 'sms' || channel === 'both';
    if (!name) return false;
    if (hasEmail && (!this._formSubject().trim() || !this._formBody().trim())) return false;
    if (hasSms && !this._formSmsBody().trim()) return false;
    return true;
  });

  constructor() {
    effect(() => {
      if (this.isAuthenticated()) {
        this.marketingService.loadCampaigns();
        this.customerService.loadCustomers();
      }
    });
  }

  setTab(tab: MarketingTab): void {
    this._activeTab.set(tab);
  }

  setStatusFilter(status: CampaignStatus | 'all'): void {
    this._statusFilter.set(status);
  }

  openNewCampaign(): void {
    this._editingCampaign.set(null);
    this.resetForm();
    this._showForm.set(true);
  }

  openEditCampaign(campaign: Campaign): void {
    this._editingCampaign.set(campaign);
    this._formName.set(campaign.name);
    this._formType.set(campaign.type);
    this._formChannel.set(campaign.channel);
    this._formSubject.set(campaign.subject);
    this._formBody.set(campaign.body);
    this._formSmsBody.set(campaign.smsBody ?? '');
    this._formSegments.set([...campaign.audience.segments]);
    this._formTiers.set([...campaign.audience.loyaltyTiers]);
    this._formScheduledAt.set(campaign.scheduledAt ?? '');
    this._showForm.set(true);
  }

  closeForm(): void {
    this._showForm.set(false);
    this._editingCampaign.set(null);
  }

  selectCampaign(campaign: Campaign): void {
    this._selectedCampaign.set(campaign);
  }

  closeDetail(): void {
    this._selectedCampaign.set(null);
  }

  applyTemplate(template: CampaignTemplate): void {
    this._formName.set(template.name);
    this._formType.set(template.type);
    this._formSubject.set(template.subject);
    this._formBody.set(template.body);
    this._formSmsBody.set(template.smsBody ?? '');
  }

  onFormField(field: string, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;
    switch (field) {
      case 'name': this._formName.set(value); break;
      case 'type': this._formType.set(value as CampaignType); break;
      case 'channel': this._formChannel.set(value as CampaignChannel); break;
      case 'subject': this._formSubject.set(value); break;
      case 'body': this._formBody.set(value); break;
      case 'smsBody': this._formSmsBody.set(value); break;
      case 'scheduledAt': this._formScheduledAt.set(value); break;
    }
  }

  toggleSegment(segment: string): void {
    this._formSegments.update(list =>
      list.includes(segment) ? list.filter(s => s !== segment) : [...list, segment]
    );
    void this.updateEstimate();
  }

  toggleTier(tier: string): void {
    this._formTiers.update(list =>
      list.includes(tier) ? list.filter(t => t !== tier) : [...list, tier]
    );
    void this.updateEstimate();
  }

  isSegmentSelected(segment: string): boolean {
    return this._formSegments().includes(segment);
  }

  isTierSelected(tier: string): boolean {
    return this._formTiers().includes(tier);
  }

  async saveCampaign(): Promise<void> {
    if (!this.canSave() || this._isSaving()) return;
    this._isSaving.set(true);
    try {
      const data: CampaignFormData = {
        name: this._formName().trim(),
        type: this._formType(),
        channel: this._formChannel(),
        subject: this._formSubject().trim(),
        body: this._formBody().trim(),
        smsBody: this._formSmsBody().trim() || undefined,
        segments: this._formSegments(),
        loyaltyTiers: this._formTiers(),
        scheduledAt: this._formScheduledAt() || undefined,
      };

      const editing = this._editingCampaign();
      if (editing) {
        await this.marketingService.updateCampaign(editing.id, data);
      } else {
        await this.marketingService.createCampaign(data);
      }
      this.closeForm();
    } finally {
      this._isSaving.set(false);
    }
  }

  async sendNow(campaign: Campaign): Promise<void> {
    this._isSending.set(true);
    try {
      await this.marketingService.sendCampaign(campaign.id);
    } finally {
      this._isSending.set(false);
    }
  }

  async deleteCampaign(campaign: Campaign): Promise<void> {
    await this.marketingService.deleteCampaign(campaign.id);
    if (this._selectedCampaign()?.id === campaign.id) {
      this._selectedCampaign.set(null);
    }
  }

  getStatusClass(status: CampaignStatus): string {
    switch (status) {
      case 'draft': return 'bg-secondary';
      case 'scheduled': return 'bg-info';
      case 'sending': return 'bg-warning text-dark';
      case 'sent': return 'bg-success';
      case 'failed': return 'bg-danger';
      default: return 'bg-secondary';
    }
  }

  getTypeLabel(type: CampaignType): string {
    return this.campaignTypes.find(t => t.key === type)?.label ?? type;
  }

  getOpenRate(campaign: Campaign): number {
    const d = campaign.performance.delivered;
    return d > 0 ? Math.round((campaign.performance.opened / d) * 100) : 0;
  }

  getClickRate(campaign: Campaign): number {
    const d = campaign.performance.delivered;
    return d > 0 ? Math.round((campaign.performance.clicked / d) * 100) : 0;
  }

  private resetForm(): void {
    this._formName.set('');
    this._formType.set('promotional');
    this._formChannel.set('email');
    this._formSubject.set('');
    this._formBody.set('');
    this._formSmsBody.set('');
    this._formSegments.set([]);
    this._formTiers.set([]);
    this._formScheduledAt.set('');
    this._estimatedRecipients.set(0);
  }

  private async updateEstimate(): Promise<void> {
    const count = await this.marketingService.getAudienceEstimate(
      this._formSegments(),
      this._formTiers()
    );
    this._estimatedRecipients.set(count);
  }
}
