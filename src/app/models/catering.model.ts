export type CateringEventStatus =
  | 'inquiry'
  | 'proposal_sent'
  | 'confirmed'
  | 'completed'
  | 'cancelled';

export type CateringEventType =
  | 'corporate'
  | 'wedding'
  | 'birthday'
  | 'social'
  | 'fundraiser'
  | 'other';

export type CateringLocationType = 'on_site' | 'off_site';

export interface CateringEvent {
  id: string;
  restaurantId: string;
  title: string;
  eventType: CateringEventType;
  status: CateringEventStatus;
  eventDate: string;
  startTime: string;
  endTime: string;
  headcount: number;
  locationType: CateringLocationType;
  locationAddress?: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CateringCapacitySettings {
  maxEventsPerDay: number;
  maxHeadcountPerDay: number;
  conflictAlertsEnabled: boolean;
}
