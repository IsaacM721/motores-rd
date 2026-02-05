export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'rejected';

export interface Booking {
  id: string;
  motorcycleId: string;
  userId: string;
  ownerId: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  dailyRate: number;
  totalPrice: number;
  deposit: number | null;
  status: BookingStatus;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  pickupLocation: string | null;
  dropoffLocation: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  confirmedAt: Date | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
}

export interface BookingFormData {
  motorcycleId: string;
  startDate: Date;
  endDate: Date;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  notes?: string;
}

export interface BookingWithDetails extends Booking {
  motorcycle: {
    id: string;
    make: string;
    model: string;
    slug: string;
    images: { url: string }[];
  };
  owner: {
    id: string;
    businessName: string | null;
    phone: string | null;
  };
}
