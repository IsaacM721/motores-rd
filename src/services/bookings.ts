'use client';

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase/client';
import { Booking, BookingFormData, BookingStatus, BookingWithDetails } from '@/types';
import { differenceInDays } from 'date-fns';

const BOOKINGS_COLLECTION = 'bookings';
const MOTORCYCLES_COLLECTION = 'motorcycles';
const USERS_COLLECTION = 'users';

/**
 * Create a new booking
 */
export async function createBooking(
  data: BookingFormData,
  userId: string,
  dailyRate: number,
  ownerId: string
): Promise<string> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not configured');

  const totalDays = differenceInDays(data.endDate, data.startDate) + 1;
  const totalPrice = totalDays * dailyRate;

  const bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'> = {
    motorcycleId: data.motorcycleId,
    userId,
    ownerId,
    startDate: data.startDate,
    endDate: data.endDate,
    totalDays,
    dailyRate,
    totalPrice,
    deposit: null,
    status: 'pending',
    customerName: data.customerName,
    customerEmail: data.customerEmail,
    customerPhone: data.customerPhone,
    pickupLocation: data.pickupLocation || null,
    dropoffLocation: data.dropoffLocation || null,
    notes: data.notes || null,
    confirmedAt: null,
    cancelledAt: null,
    cancellationReason: null,
  };

  const docRef = await addDoc(collection(db, BOOKINGS_COLLECTION), {
    ...bookingData,
    startDate: data.startDate,
    endDate: data.endDate,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Get a booking by ID
 */
export async function getBookingById(id: string): Promise<Booking | null> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not configured');

  const docRef = doc(db, BOOKINGS_COLLECTION, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    startDate: data.startDate?.toDate() || new Date(),
    endDate: data.endDate?.toDate() || new Date(),
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    confirmedAt: data.confirmedAt?.toDate() || null,
    cancelledAt: data.cancelledAt?.toDate() || null,
  } as Booking;
}

/**
 * Get bookings by user (customer)
 */
export async function getBookingsByUser(userId: string): Promise<Booking[]> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not configured');

  const q = query(
    collection(db, BOOKINGS_COLLECTION),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      startDate: data.startDate?.toDate() || new Date(),
      endDate: data.endDate?.toDate() || new Date(),
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      confirmedAt: data.confirmedAt?.toDate() || null,
      cancelledAt: data.cancelledAt?.toDate() || null,
    };
  }) as Booking[];
}

/**
 * Get bookings by owner (dealer)
 */
export async function getBookingsByOwner(ownerId: string): Promise<Booking[]> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not configured');

  const q = query(
    collection(db, BOOKINGS_COLLECTION),
    where('ownerId', '==', ownerId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      startDate: data.startDate?.toDate() || new Date(),
      endDate: data.endDate?.toDate() || new Date(),
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      confirmedAt: data.confirmedAt?.toDate() || null,
      cancelledAt: data.cancelledAt?.toDate() || null,
    };
  }) as Booking[];
}

/**
 * Get bookings for a motorcycle
 */
export async function getBookingsByMotorcycle(motorcycleId: string): Promise<Booking[]> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not configured');

  const q = query(
    collection(db, BOOKINGS_COLLECTION),
    where('motorcycleId', '==', motorcycleId),
    orderBy('startDate', 'asc')
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      startDate: data.startDate?.toDate() || new Date(),
      endDate: data.endDate?.toDate() || new Date(),
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      confirmedAt: data.confirmedAt?.toDate() || null,
      cancelledAt: data.cancelledAt?.toDate() || null,
    };
  }) as Booking[];
}

/**
 * Get booking with full details (motorcycle and owner info)
 */
export async function getBookingWithDetails(id: string): Promise<BookingWithDetails | null> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not configured');

  const booking = await getBookingById(id);
  if (!booking) return null;

  // Get motorcycle
  const motorcycleDoc = await getDoc(doc(db, MOTORCYCLES_COLLECTION, booking.motorcycleId));
  const motorcycleData = motorcycleDoc.exists() ? motorcycleDoc.data() : null;

  // Get owner
  const ownerDoc = await getDoc(doc(db, USERS_COLLECTION, booking.ownerId));
  const ownerData = ownerDoc.exists() ? ownerDoc.data() : null;

  return {
    ...booking,
    motorcycle: {
      id: booking.motorcycleId,
      make: motorcycleData?.make || 'Unknown',
      model: motorcycleData?.model || 'Unknown',
      slug: motorcycleData?.slug || '',
      images: motorcycleData?.images || [],
    },
    owner: {
      id: booking.ownerId,
      businessName: ownerData?.businessName || null,
      phone: ownerData?.phone || ownerData?.businessPhone || null,
    },
  };
}

/**
 * Update booking status
 */
export async function updateBookingStatus(
  id: string,
  status: BookingStatus,
  reason?: string
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not configured');

  const updateData: Record<string, unknown> = {
    status,
    updatedAt: serverTimestamp(),
  };

  if (status === 'confirmed') {
    updateData.confirmedAt = serverTimestamp();
  }

  if (status === 'cancelled' || status === 'rejected') {
    updateData.cancelledAt = serverTimestamp();
    if (reason) {
      updateData.cancellationReason = reason;
    }
  }

  await updateDoc(doc(db, BOOKINGS_COLLECTION, id), updateData);
}

/**
 * Confirm a booking
 */
export async function confirmBooking(id: string): Promise<void> {
  await updateBookingStatus(id, 'confirmed');
}

/**
 * Cancel a booking
 */
export async function cancelBooking(id: string, reason?: string): Promise<void> {
  await updateBookingStatus(id, 'cancelled', reason);
}

/**
 * Reject a booking
 */
export async function rejectBooking(id: string, reason?: string): Promise<void> {
  await updateBookingStatus(id, 'rejected', reason);
}

/**
 * Mark booking as in progress
 */
export async function startBooking(id: string): Promise<void> {
  await updateBookingStatus(id, 'in_progress');
}

/**
 * Complete a booking
 */
export async function completeBooking(id: string): Promise<void> {
  await updateBookingStatus(id, 'completed');
}

/**
 * Get all bookings (admin only)
 */
export async function getAllBookings(): Promise<Booking[]> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not configured');

  const q = query(
    collection(db, BOOKINGS_COLLECTION),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      startDate: data.startDate?.toDate() || new Date(),
      endDate: data.endDate?.toDate() || new Date(),
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      confirmedAt: data.confirmedAt?.toDate() || null,
      cancelledAt: data.cancelledAt?.toDate() || null,
    };
  }) as Booking[];
}
