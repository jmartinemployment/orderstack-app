import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CateringService } from '@services/catering.service';
import { CateringEvent } from '@models/index';

interface CalendarDay {
  date: string;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CateringEvent[];
}

@Component({
  selector: 'os-catering-calendar',
  standalone: true,
  templateUrl: './catering-calendar.component.html',
  styleUrl: './catering-calendar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CateringCalendarComponent {
  private readonly cateringService = inject(CateringService);

  readonly currentYear = signal(new Date().getFullYear());
  readonly currentMonth = signal(new Date().getMonth());
  readonly selectedDay = signal<string | null>(null);

  readonly monthLabel = computed(() => {
    const date = new Date(this.currentYear(), this.currentMonth(), 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  });

  readonly weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  readonly calendarDays = computed<CalendarDay[]>(() => {
    const year = this.currentYear();
    const month = this.currentMonth();
    const events = this.cateringService.events();
    const today = new Date().toISOString().split('T')[0];

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay();
    const days: CalendarDay[] = [];

    // Previous month padding
    const prevLast = new Date(year, month, 0);
    for (let i = startPad - 1; i >= 0; i--) {
      const d = prevLast.getDate() - i;
      const date = this.formatDate(new Date(year, month - 1, d));
      days.push({
        date,
        dayOfMonth: d,
        isCurrentMonth: false,
        isToday: date === today,
        events: events.filter(e => e.eventDate.startsWith(date)),
      });
    }

    // Current month days
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = this.formatDate(new Date(year, month, d));
      days.push({
        date,
        dayOfMonth: d,
        isCurrentMonth: true,
        isToday: date === today,
        events: events.filter(e => e.eventDate.startsWith(date)),
      });
    }

    // Next month padding (fill to 42 cells for 6 rows)
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const date = this.formatDate(new Date(year, month + 1, d));
      days.push({
        date,
        dayOfMonth: d,
        isCurrentMonth: false,
        isToday: date === today,
        events: events.filter(e => e.eventDate.startsWith(date)),
      });
    }

    return days;
  });

  readonly selectedDayEvents = computed(() => {
    const day = this.selectedDay();
    if (!day) return [];
    return this.cateringService.events().filter(e => e.eventDate.startsWith(day));
  });

  prevMonth(): void {
    const m = this.currentMonth();
    if (m === 0) {
      this.currentYear.update(y => y - 1);
      this.currentMonth.set(11);
    } else {
      this.currentMonth.set(m - 1);
    }
    this.selectedDay.set(null);
  }

  nextMonth(): void {
    const m = this.currentMonth();
    if (m === 11) {
      this.currentYear.update(y => y + 1);
      this.currentMonth.set(0);
    } else {
      this.currentMonth.set(m + 1);
    }
    this.selectedDay.set(null);
  }

  selectDay(day: CalendarDay): void {
    if (day.events.length > 0) {
      this.selectedDay.set(this.selectedDay() === day.date ? null : day.date);
    }
  }

  getDotClass(day: CalendarDay): string {
    if (day.events.length === 0) return '';
    const hasConfirmed = day.events.some(e => e.status === 'confirmed');
    if (hasConfirmed) return 'dot-confirmed';
    return 'dot-pending';
  }

  getStatusBadgeClass(status: string): string {
    const map: Record<string, string> = {
      inquiry: 'bg-secondary',
      proposal_sent: 'bg-warning text-dark',
      confirmed: 'bg-success',
      completed: 'bg-primary',
      cancelled: 'bg-danger',
    };
    return map[status] ?? 'bg-secondary';
  }

  private formatDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
