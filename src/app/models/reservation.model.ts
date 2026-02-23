export type ReservationStatus = 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no-show';

export interface Reservation {
  id: string;
  restaurantId: string;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  partySize: number;
  reservationTime: string;
  tableNumber: string | null;
  status: ReservationStatus;
  specialRequests: string | null;
  confirmationSent: boolean;
  reminderSent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReservationFormData {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  partySize: number;
  reservationTime: string;
  tableNumber?: string;
  specialRequests?: string;
}

export type ReservationTab = 'upcoming' | 'today' | 'past' | 'waitlist';
export type ReservationViewMode = 'list' | 'timeline';

export type WaitlistStatus = 'waiting' | 'notified' | 'seated' | 'cancelled' | 'no-show';

export interface WaitlistEntry {
  id: string;
  restaurantId: string;
  partyName: string;
  partySize: number;
  phone: string;
  notes: string | null;
  status: WaitlistStatus;
  position: number;
  estimatedWaitMinutes: number;
  quotedWaitMinutes: number;
  notifiedAt: string | null;
  seatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WaitlistFormData {
  partyName: string;
  partySize: number;
  phone: string;
  notes?: string;
}

// --- Booking Widget Types ---

export type BookingStep = 'date' | 'info' | 'confirm';

export type SeatingPreference = 'no_preference' | 'indoor' | 'outdoor' | 'bar' | 'private';

export interface TimeSlot {
  time: string;
  isAvailable: boolean;
  availableCovers: number;
}

export interface DayAvailability {
  date: string;
  slots: TimeSlot[];
}

export interface PublicReservationFormData {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  partySize: number;
  reservationTime: string;
  specialRequests?: string;
  dietaryRestrictions?: string[];
  seatingPreference?: SeatingPreference;
  occasion?: string;
}

export const DIETARY_OPTIONS: string[] = [
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free',
  'Nut-Free', 'Shellfish-Free', 'Halal', 'Kosher',
];

export const OCCASION_OPTIONS: string[] = [
  'Birthday', 'Anniversary', 'Date Night', 'Business Meal',
  'Celebration', 'Holiday', 'Other',
];
