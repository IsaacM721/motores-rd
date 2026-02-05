export type UserRole = 'admin' | 'dealer' | 'customer';

export interface User {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  phone: string | null;
  businessName: string | null;
  businessAddress: string | null;
  businessPhone: string | null;
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}

export interface DealerProfile extends User {
  role: 'dealer';
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  motorcycleCount: number;
  activeBookingsCount: number;
  totalRevenue: number;
}

export interface UserFormData {
  email: string;
  displayName: string;
  phone?: string;
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}
