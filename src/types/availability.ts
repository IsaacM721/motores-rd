export interface Availability {
  id: string;
  motorcycleId: string;
  date: Date;
  isAvailable: boolean;
  bookingId: string | null;
  blockedReason: string | null;
}

export interface AvailabilityRange {
  motorcycleId: string;
  startDate: Date;
  endDate: Date;
  isAvailable: boolean;
}

export interface AvailabilityCalendar {
  motorcycleId: string;
  month: number;
  year: number;
  days: {
    date: Date;
    isAvailable: boolean;
    isBooked: boolean;
    bookingId: string | null;
  }[];
}
