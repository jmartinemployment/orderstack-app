import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CateringService } from '@services/catering.service';
import { CateringEvent, CateringEventStatus } from '@models/index';
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

  readonly activeTab = signal<CateringTab>('active');
  readonly showForm = signal(false);
  readonly editingEvent = signal<CateringEvent | null>(null);

  // Capacity local signals
  readonly capMaxEvents = signal(3);
  readonly capMaxHeadcount = signal(200);
  readonly capConflictAlerts = signal(true);
  readonly capSaving = signal(false);

  // Stats
  readonly upcomingCount = computed(() => this.cateringService.upcomingEvents().length);
  readonly totalHeadcount = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this.cateringService.events()
      .filter(e => e.status === 'confirmed' && e.eventDate >= today)
      .reduce((sum, e) => sum + e.headcount, 0);
  });
  readonly conflictDaysCount = computed(() => this.cateringService.conflictDays().length);
  readonly pendingApprovals = computed(() =>
    this.cateringService.events().filter(e => e.status === 'inquiry' || e.status === 'proposal_sent').length
  );

  ngOnInit(): void {
    this.cateringService.loadEvents();
    this.cateringService.loadCapacitySettings();
  }

  setTab(tab: CateringTab): void {
    this.activeTab.set(tab);
    if (tab === 'capacity') {
      this.loadCapacityIntoLocal();
    }
  }

  openNewEvent(): void {
    this.editingEvent.set(null);
    this.showForm.set(true);
  }

  openEditEvent(event: CateringEvent): void {
    this.editingEvent.set(event);
    this.showForm.set(true);
  }

  async advanceStatus(payload: { id: string; status: CateringEventStatus }): Promise<void> {
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
