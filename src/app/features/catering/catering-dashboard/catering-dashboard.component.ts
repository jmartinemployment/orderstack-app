import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CateringService } from '@services/catering.service';
import { CateringJob, CateringJobStatus, CATERING_STATUS_CONFIG } from '@models/index';
import { CateringEventCardComponent } from '../catering-event-card/catering-event-card.component';
import { CateringEventFormComponent } from '../catering-event-form/catering-event-form.component';
import { CateringCalendarComponent } from '../catering-calendar/catering-calendar.component';
import { FormsModule } from '@angular/forms';

type CateringTab = 'active' | 'upcoming' | 'past' | 'calendar' | 'capacity';

@Component({
  selector: 'os-catering-dashboard',
  standalone: true,
  imports: [CateringEventCardComponent, CateringEventFormComponent, CateringCalendarComponent, FormsModule],
  templateUrl: './catering-dashboard.component.html',
  styleUrl: './catering-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CateringDashboardComponent implements OnInit {
  readonly cateringService = inject(CateringService);
  private readonly router = inject(Router);

  readonly activeTab = signal<CateringTab>('active');
  readonly showForm = signal(false);
  readonly editingEvent = signal<CateringJob | null>(null);
  readonly searchQuery = signal('');
  readonly selectedIds = signal<Set<string>>(new Set());
  readonly statusFilter = signal<CateringJobStatus | 'all'>('all');

  // Capacity local signals
  readonly capMaxEvents = signal(3);
  readonly capMaxHeadcount = signal(200);
  readonly capConflictAlerts = signal(true);
  readonly capSaving = signal(false);

  readonly statusOptions = Object.entries(CATERING_STATUS_CONFIG).map(
    ([value, config]) => ({ value: value as CateringJobStatus, label: config.label })
  );

  // Filtered jobs based on search and status filter
  private filterJobs(jobs: CateringJob[]): CateringJob[] {
    const q = this.searchQuery().toLowerCase().trim();
    const status = this.statusFilter();
    return jobs.filter(j => {
      if (status !== 'all' && j.status !== status) return false;
      if (q && !j.title.toLowerCase().includes(q)
        && !j.clientName.toLowerCase().includes(q)
        && !j.eventType.toLowerCase().includes(q)
        && !(j.companyName ?? '').toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }

  readonly filteredActiveJobs = computed(() => this.filterJobs(this.cateringService.activeEvents()));
  readonly filteredUpcomingJobs = computed(() => this.filterJobs(this.cateringService.upcomingEvents()));
  readonly filteredPastJobs = computed(() => this.filterJobs(this.cateringService.pastEvents()));

  // KPIs
  readonly conflictDaysCount = computed(() => this.cateringService.conflictDays().length);
  readonly pendingApprovals = computed(() =>
    this.cateringService.events().filter(e => e.status === 'inquiry' || e.status === 'proposal_sent').length
  );

  // Next event banner
  readonly nextJob = computed(() => this.cateringService.nextUpcomingJob());
  readonly nextJobDaysAway = computed(() => {
    const j = this.nextJob();
    if (!j) return 0;
    const diff = new Date(j.fulfillmentDate).getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  });

  readonly hasJobs = computed(() => this.cateringService.events().length > 0);
  readonly hasSelection = computed(() => this.selectedIds().size > 0);

  ngOnInit(): void {
    // Loading handled by CateringService effect when merchantId is ready
  }

  setTab(tab: CateringTab): void {
    this.activeTab.set(tab);
    this.selectedIds.set(new Set());
    if (tab === 'capacity') {
      this.loadCapacityIntoLocal();
    }
  }

  openNewEvent(): void {
    this.editingEvent.set(null);
    this.showForm.set(true);
  }

  openEditEvent(event: CateringJob): void {
    this.editingEvent.set(event);
    this.showForm.set(true);
  }

  openJobDetail(job: CateringJob): void {
    this.router.navigate(['/app/catering/job', job.id]);
  }

  async advanceStatus(payload: { id: string; status: CateringJobStatus }): Promise<void> {
    await this.cateringService.updateStatus(payload.id, payload.status);
  }

  async cancelEvent(id: string): Promise<void> {
    await this.cateringService.updateStatus(id, 'cancelled');
  }

  async onFormSaved(): Promise<void> {
    this.showForm.set(false);
    this.editingEvent.set(null);
    await this.cateringService.loadEvents();
  }

  onFormCancelled(): void {
    this.showForm.set(false);
    this.editingEvent.set(null);
  }

  formatCents(cents: number): string {
    return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  // Selection
  toggleSelect(id: string): void {
    const set = new Set(this.selectedIds());
    if (set.has(id)) {
      set.delete(id);
    } else {
      set.add(id);
    }
    this.selectedIds.set(set);
  }

  isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  async bulkComplete(): Promise<void> {
    await this.cateringService.bulkUpdateStatus([...this.selectedIds()], 'completed');
    this.selectedIds.set(new Set());
  }

  async bulkCancel(): Promise<void> {
    await this.cateringService.bulkUpdateStatus([...this.selectedIds()], 'cancelled');
    this.selectedIds.set(new Set());
  }

  exportCsv(): void {
    const jobs = this.cateringService.events().filter(j => this.selectedIds().has(j.id));
    const header = 'Title,Client,Event Type,Date,Headcount,Status,Total\n';
    const rows = jobs.map(j =>
      `"${j.title}","${j.clientName}","${j.eventType}","${j.fulfillmentDate}",${j.headcount},"${j.status}",${j.totalCents / 100}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'catering-export.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  private loadCapacityIntoLocal(): void {
    const s = this.cateringService.capacitySettings();
    if (s) {
      this.capMaxEvents.set(s.maxEventsPerDay);
      this.capMaxHeadcount.set(s.maxHeadcountPerDay);
      this.capConflictAlerts.set(s.conflictAlertsEnabled);
    }
  }

  async saveCapacity(): Promise<void> {
    this.capSaving.set(true);
    await this.cateringService.saveCapacitySettings({
      maxEventsPerDay: this.capMaxEvents(),
      maxHeadcountPerDay: this.capMaxHeadcount(),
      conflictAlertsEnabled: this.capConflictAlerts(),
    });
    this.capSaving.set(false);
  }
}
