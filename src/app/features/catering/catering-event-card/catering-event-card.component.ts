import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, computed, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { CateringEvent, CateringEventStatus } from '@models/index';

@Component({
  selector: 'os-catering-event-card',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './catering-event-card.component.html',
  styleUrl: './catering-event-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CateringEventCardComponent {
  @Input({ required: true }) event!: CateringEvent;

  @Output() statusAdvanced = new EventEmitter<{ id: string; status: CateringEventStatus }>();
  @Output() editRequested = new EventEmitter<CateringEvent>();
  @Output() cancelRequested = new EventEmitter<string>();

  get statusBadgeClass(): string {
    const map: Record<CateringEventStatus, string> = {
      inquiry: 'bg-secondary',
      proposal_sent: 'bg-warning text-dark',
      confirmed: 'bg-success',
      completed: 'bg-primary',
      cancelled: 'bg-danger',
    };
    return map[this.event.status] ?? 'bg-secondary';
  }

  get statusLabel(): string {
    const map: Record<CateringEventStatus, string> = {
      inquiry: 'Inquiry',
      proposal_sent: 'Proposal Sent',
      confirmed: 'Confirmed',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };
    return map[this.event.status] ?? this.event.status;
  }

  get eventTypeLabel(): string {
    return this.event.eventType.charAt(0).toUpperCase() + this.event.eventType.slice(1);
  }

  get formattedDate(): string {
    const d = new Date(this.event.eventDate + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }

  get formattedTimeRange(): string {
    return `${this.formatTime(this.event.startTime)} – ${this.formatTime(this.event.endTime)}`;
  }

  get locationLabel(): string {
    return this.event.locationType === 'on_site' ? 'On-Site' : 'Off-Site';
  }

  get canAdvance(): boolean {
    return this.event.status === 'inquiry' || this.event.status === 'proposal_sent' || this.event.status === 'confirmed';
  }

  get advanceLabel(): string {
    const map: Record<string, string> = {
      inquiry: 'Send Proposal',
      proposal_sent: 'Confirm Event',
      confirmed: 'Mark Complete',
    };
    return map[this.event.status] ?? '';
  }

  get nextStatus(): CateringEventStatus {
    const map: Record<string, CateringEventStatus> = {
      inquiry: 'proposal_sent',
      proposal_sent: 'confirmed',
      confirmed: 'completed',
    };
    return map[this.event.status] ?? this.event.status;
  }

  get canCancel(): boolean {
    return this.event.status !== 'completed' && this.event.status !== 'cancelled';
  }

  advanceStatus(): void {
    this.statusAdvanced.emit({ id: this.event.id, status: this.nextStatus });
  }

  edit(): void {
    this.editRequested.emit(this.event);
  }

  cancel(): void {
    this.cancelRequested.emit(this.event.id);
  }

  private formatTime(time: string): string {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${period}`;
  }
}
