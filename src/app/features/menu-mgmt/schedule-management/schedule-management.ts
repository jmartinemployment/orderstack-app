import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { MenuService } from '@services/menu';
import {
  MenuSchedule,
  Daypart,
  getDaypartLabel,
  isDaypartActive,
} from '@models/index';

interface DaypartFormRow {
  name: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  isActive: boolean;
  displayOrder: number;
}

@Component({
  selector: 'os-schedule-management',
  imports: [],
  templateUrl: './schedule-management.html',
  styleUrl: './schedule-management.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleManagement implements OnInit {
  readonly menuService = inject(MenuService);

  private readonly _showForm = signal(false);
  private readonly _editingScheduleId = signal<string | null>(null);
  private readonly _formName = signal('');
  private readonly _formIsDefault = signal(false);
  private readonly _formDayparts = signal<DaypartFormRow[]>([]);

  readonly showForm = this._showForm.asReadonly();
  readonly editingScheduleId = this._editingScheduleId.asReadonly();
  readonly formName = this._formName.asReadonly();
  readonly formIsDefault = this._formIsDefault.asReadonly();
  readonly formDayparts = this._formDayparts.asReadonly();

  readonly schedules = this.menuService.menuSchedules;
  readonly activeScheduleId = this.menuService.activeScheduleId;

  readonly allDays: number[] = [0, 1, 2, 3, 4, 5, 6];

  readonly canSave = computed(() => {
    const name = this._formName().trim();
    const dayparts = this._formDayparts();
    return name.length > 0 && dayparts.length > 0 && dayparts.every(dp => dp.name.trim().length > 0);
  });

  readonly timelineHours = Array.from({ length: 24 }, (_, i) => i);

  ngOnInit(): void {
    this.menuService.loadMenuSchedules();
  }

  getDayLabel(day: number): string {
    return getDaypartLabel(day);
  }

  isDaypartCurrentlyActive(daypart: Daypart): boolean {
    return isDaypartActive(daypart);
  }

  formatTime(time: string): string {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
  }

  getTimelineWidth(dp: DaypartFormRow | Daypart): number {
    const [startH, startM] = dp.startTime.split(':').map(Number);
    const [endH, endM] = dp.endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const duration = endMinutes > startMinutes ? endMinutes - startMinutes : 0;
    return (duration / 1440) * 100;
  }

  getTimelineLeft(dp: DaypartFormRow | Daypart): number {
    const [h, m] = dp.startTime.split(':').map(Number);
    return ((h * 60 + m) / 1440) * 100;
  }

  // --- Form methods ---

  openNewForm(): void {
    this._editingScheduleId.set(null);
    this._formName.set('');
    this._formIsDefault.set(this.schedules().length === 0);
    this._formDayparts.set([
      { name: 'Breakfast', startTime: '06:00', endTime: '11:00', daysOfWeek: [0, 1, 2, 3, 4, 5, 6], isActive: true, displayOrder: 0 },
      { name: 'Lunch', startTime: '11:00', endTime: '16:00', daysOfWeek: [0, 1, 2, 3, 4, 5, 6], isActive: true, displayOrder: 1 },
      { name: 'Dinner', startTime: '16:00', endTime: '23:00', daysOfWeek: [0, 1, 2, 3, 4, 5, 6], isActive: true, displayOrder: 2 },
    ]);
    this._showForm.set(true);
  }

  openEditForm(schedule: MenuSchedule): void {
    this._editingScheduleId.set(schedule.id);
    this._formName.set(schedule.name);
    this._formIsDefault.set(schedule.isDefault);
    this._formDayparts.set(schedule.dayparts.map(dp => ({
      name: dp.name,
      startTime: dp.startTime,
      endTime: dp.endTime,
      daysOfWeek: [...dp.daysOfWeek],
      isActive: dp.isActive,
      displayOrder: dp.displayOrder,
    })));
    this._showForm.set(true);
  }

  closeForm(): void {
    this._showForm.set(false);
    this._editingScheduleId.set(null);
  }

  setFormName(val: string): void {
    this._formName.set(val);
  }

  setFormIsDefault(val: boolean): void {
    this._formIsDefault.set(val);
  }

  addDaypart(): void {
    const dayparts = this._formDayparts();
    this._formDayparts.set([...dayparts, {
      name: '',
      startTime: '00:00',
      endTime: '23:59',
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      isActive: true,
      displayOrder: dayparts.length,
    }]);
  }

  removeDaypart(index: number): void {
    this._formDayparts.update(dps => dps.filter((_, i) => i !== index));
  }

  setDaypartName(index: number, val: string): void {
    this._formDayparts.update(dps => dps.map((dp, i) => i === index ? { ...dp, name: val } : dp));
  }

  setDaypartStartTime(index: number, val: string): void {
    this._formDayparts.update(dps => dps.map((dp, i) => i === index ? { ...dp, startTime: val } : dp));
  }

  setDaypartEndTime(index: number, val: string): void {
    this._formDayparts.update(dps => dps.map((dp, i) => i === index ? { ...dp, endTime: val } : dp));
  }

  toggleDaypartDay(index: number, day: number): void {
    this._formDayparts.update(dps => dps.map((dp, i) => {
      if (i !== index) return dp;
      const days = dp.daysOfWeek.includes(day)
        ? dp.daysOfWeek.filter(d => d !== day)
        : [...dp.daysOfWeek, day].sort();
      return { ...dp, daysOfWeek: days };
    }));
  }

  toggleDaypartActive(index: number): void {
    this._formDayparts.update(dps => dps.map((dp, i) => i === index ? { ...dp, isActive: !dp.isActive } : dp));
  }

  async saveSchedule(): Promise<void> {
    const name = this._formName().trim();
    const dayparts = this._formDayparts();
    if (!name || dayparts.length === 0) return;

    const data = {
      name,
      isDefault: this._formIsDefault(),
      dayparts: dayparts.map((dp, i) => ({
        name: dp.name.trim(),
        startTime: dp.startTime,
        endTime: dp.endTime,
        daysOfWeek: dp.daysOfWeek,
        isActive: dp.isActive,
        displayOrder: i,
      })),
    };

    const editId = this._editingScheduleId();
    if (editId) {
      await this.menuService.updateMenuSchedule(editId, data);
    } else {
      await this.menuService.createMenuSchedule(data);
    }

    this.closeForm();
  }

  async deleteSchedule(schedule: MenuSchedule): Promise<void> {
    await this.menuService.deleteMenuSchedule(schedule.id);
  }

  setActiveSchedule(scheduleId: string | null): void {
    this.menuService.setActiveSchedule(scheduleId);
  }
}
