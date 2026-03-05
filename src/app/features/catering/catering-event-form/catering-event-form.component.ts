import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, inject, signal, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CateringEvent, CateringEventStatus, CateringEventType, CateringLocationType } from '@models/index';
import { CateringService } from '@services/catering.service';

@Component({
  selector: 'os-catering-event-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './catering-event-form.component.html',
  styleUrl: './catering-event-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CateringEventFormComponent implements OnChanges {
  @Input() event: CateringEvent | null = null;
  @Input() visible = false;

  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly cateringService = inject(CateringService);

  readonly isSaving = signal(false);
  readonly validationErrors = signal<string[]>([]);

  title = '';
  eventType: CateringEventType = 'corporate';
  status: CateringEventStatus = 'inquiry';
  eventDate = '';
  startTime = '';
  endTime = '';
  headcount = 1;
  locationType: CateringLocationType = 'on_site';
  locationAddress = '';
  contactName = '';
  contactPhone = '';
  contactEmail = '';
  notes = '';

  readonly eventTypes: { value: CateringEventType; label: string }[] = [
    { value: 'corporate', label: 'Corporate' },
    { value: 'wedding', label: 'Wedding' },
    { value: 'birthday', label: 'Birthday' },
    { value: 'social', label: 'Social' },
    { value: 'fundraiser', label: 'Fundraiser' },
    { value: 'other', label: 'Other' },
  ];

  readonly statuses: { value: CateringEventStatus; label: string }[] = [
    { value: 'inquiry', label: 'Inquiry' },
    { value: 'proposal_sent', label: 'Proposal Sent' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  get isEditMode(): boolean {
    return this.event !== null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.resetForm();
    }
  }

  private resetForm(): void {
    this.validationErrors.set([]);
    if (this.event) {
      this.title = this.event.title;
      this.eventType = this.event.eventType;
      this.status = this.event.status;
      this.eventDate = this.event.eventDate.split('T')[0];
      this.startTime = this.event.startTime;
      this.endTime = this.event.endTime;
      this.headcount = this.event.headcount;
      this.locationType = this.event.locationType;
      this.locationAddress = this.event.locationAddress ?? '';
      this.contactName = this.event.contactName;
      this.contactPhone = this.event.contactPhone;
      this.contactEmail = this.event.contactEmail;
      this.notes = this.event.notes ?? '';
    } else {
      this.title = '';
      this.eventType = 'corporate';
      this.status = 'inquiry';
      this.eventDate = '';
      this.startTime = '';
      this.endTime = '';
      this.headcount = 1;
      this.locationType = 'on_site';
      this.locationAddress = '';
      this.contactName = '';
      this.contactPhone = '';
      this.contactEmail = '';
      this.notes = '';
    }
  }

  private validate(): string[] {
    const errors: string[] = [];
    if (!this.title.trim()) errors.push('Event title is required.');
    if (!this.eventDate) errors.push('Event date is required.');
    if (!this.startTime) errors.push('Start time is required.');
    if (!this.endTime) errors.push('End time is required.');
    if (this.headcount < 1) errors.push('Headcount must be at least 1.');
    if (this.locationType === 'off_site' && !this.locationAddress.trim()) {
      errors.push('Location address is required for off-site events.');
    }
    if (!this.contactName.trim()) errors.push('Contact name is required.');
    if (!this.contactPhone.trim()) errors.push('Contact phone is required.');
    if (!this.contactEmail.trim()) errors.push('Contact email is required.');
    return errors;
  }

  async save(): Promise<void> {
    const errors = this.validate();
    if (errors.length > 0) {
      this.validationErrors.set(errors);
      return;
    }

    this.validationErrors.set([]);
    this.isSaving.set(true);

    const data = {
      restaurantId: '',
      title: this.title.trim(),
      eventType: this.eventType,
      status: this.status,
      eventDate: this.eventDate,
      startTime: this.startTime,
      endTime: this.endTime,
      headcount: this.headcount,
      locationType: this.locationType,
      locationAddress: this.locationType === 'off_site' ? this.locationAddress.trim() : undefined,
      contactName: this.contactName.trim(),
      contactPhone: this.contactPhone.trim(),
      contactEmail: this.contactEmail.trim(),
      notes: this.notes.trim() || undefined,
    };

    if (this.event) {
      await this.cateringService.updateEvent(this.event.id, data);
    } else {
      await this.cateringService.createEvent(data as Omit<CateringEvent, 'id' | 'createdAt' | 'updatedAt'>);
    }

    this.isSaving.set(false);
    this.saved.emit();
  }

  close(): void {
    this.cancelled.emit();
  }
}
