'use client';

import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase/client';
import { Availability, AvailabilityCalendar } from '@/types';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isWithinInterval,
  parseISO,
} from 'date-fns';

const AVAILABILITY_COLLECTION = 'availability';
const BOOKINGS_COLLECTION = 'bookings';

/**
 * Check if a motorcycle is available for a date range
 */
export async function checkAvailability(
  motorcycleId: string,
  startDate: Date,
  endDate: Date
): Promise<boolean> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not configured');

  // Check for blocked dates
  const blockedQuery = query(
    collection(db, AVAILABILITY_COLLECTION),
    where('motorcycleId', '==', motorcycleId),
    where('isAvailable', '==', false)
  );

  const blockedSnapshot = await getDocs(blockedQuery);

  for (const doc of blockedSnapshot.docs) {
    const blockedDate = doc.data().date?.toDate?.() || parseISO(doc.data().date);
    if (isWithinInterval(blockedDate, { start: startDate, end: endDate })) {
      return false;
    }
  }

  // Check for existing confirmed bookings
  const bookingsQuery = query(
    collection(db, BOOKINGS_COLLECTION),
    where('motorcycleId', '==', motorcycleId),
    where('status', 'in', ['pending', 'confirmed', 'in_progress'])
  );

  const bookingsSnapshot = await getDocs(bookingsQuery);

  for (const doc of bookingsSnapshot.docs) {
    const booking = doc.data();
    const bookingStart = booking.startDate?.toDate?.() || parseISO(booking.startDate);
    const bookingEnd = booking.endDate?.toDate?.() || parseISO(booking.endDate);

    // Check for overlap
    if (
      isWithinInterval(startDate, { start: bookingStart, end: bookingEnd }) ||
      isWithinInterval(endDate, { start: bookingStart, end: bookingEnd }) ||
      isWithinInterval(bookingStart, { start: startDate, end: endDate })
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Get availability calendar for a motorcycle
 */
export async function getAvailabilityCalendar(
  motorcycleId: string,
  year: number,
  month: number
): Promise<AvailabilityCalendar> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not configured');

  const monthStart = startOfMonth(new Date(year, month - 1));
  const monthEnd = endOfMonth(monthStart);

  // Get blocked dates for this month
  const blockedQuery = query(
    collection(db, AVAILABILITY_COLLECTION),
    where('motorcycleId', '==', motorcycleId),
    where('isAvailable', '==', false)
  );
  const blockedSnapshot = await getDocs(blockedQuery);

  const blockedDates = new Set<string>();
  blockedSnapshot.docs.forEach((doc) => {
    const date = doc.data().date?.toDate?.() || parseISO(doc.data().date);
    if (isWithinInterval(date, { start: monthStart, end: monthEnd })) {
      blockedDates.add(format(date, 'yyyy-MM-dd'));
    }
  });

  // Get bookings for this month
  const bookingsQuery = query(
    collection(db, BOOKINGS_COLLECTION),
    where('motorcycleId', '==', motorcycleId),
    where('status', 'in', ['pending', 'confirmed', 'in_progress'])
  );
  const bookingsSnapshot = await getDocs(bookingsQuery);

  const bookedDates = new Map<string, string>();
  bookingsSnapshot.docs.forEach((doc) => {
    const booking = doc.data();
    const bookingStart = booking.startDate?.toDate?.() || parseISO(booking.startDate);
    const bookingEnd = booking.endDate?.toDate?.() || parseISO(booking.endDate);

    // Add all dates in the booking range
    const bookingDays = eachDayOfInterval({ start: bookingStart, end: bookingEnd });
    bookingDays.forEach((day) => {
      if (isWithinInterval(day, { start: monthStart, end: monthEnd })) {
        bookedDates.set(format(day, 'yyyy-MM-dd'), doc.id);
      }
    });
  });

  // Build calendar days
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd }).map((date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const isBlocked = blockedDates.has(dateStr);
    const bookingId = bookedDates.get(dateStr) || null;

    return {
      date,
      isAvailable: !isBlocked && !bookingId,
      isBooked: !!bookingId,
      bookingId,
    };
  });

  return {
    motorcycleId,
    month,
    year,
    days,
  };
}

/**
 * Block specific dates for a motorcycle
 */
export async function blockDates(
  motorcycleId: string,
  dates: Date[],
  reason?: string
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not configured');

  for (const date of dates) {
    const dateStr = format(date, 'yyyy-MM-dd');
    const docId = `${motorcycleId}_${dateStr}`;

    await setDoc(doc(db, AVAILABILITY_COLLECTION, docId), {
      motorcycleId,
      date,
      isAvailable: false,
      bookingId: null,
      blockedReason: reason || null,
    });
  }
}

/**
 * Unblock specific dates for a motorcycle
 */
export async function unblockDates(
  motorcycleId: string,
  dates: Date[]
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not configured');

  for (const date of dates) {
    const dateStr = format(date, 'yyyy-MM-dd');
    const docId = `${motorcycleId}_${dateStr}`;

    await deleteDoc(doc(db, AVAILABILITY_COLLECTION, docId));
  }
}

/**
 * Get all blocked dates for a motorcycle
 */
export async function getBlockedDates(motorcycleId: string): Promise<Availability[]> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not configured');

  const q = query(
    collection(db, AVAILABILITY_COLLECTION),
    where('motorcycleId', '==', motorcycleId),
    where('isAvailable', '==', false),
    orderBy('date', 'asc')
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      date: data.date?.toDate?.() || parseISO(data.date),
    };
  }) as Availability[];
}

/**
 * Get booked dates for a motorcycle (from confirmed bookings)
 */
export async function getBookedDates(
  motorcycleId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{ date: Date; bookingId: string }[]> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not configured');

  const q = query(
    collection(db, BOOKINGS_COLLECTION),
    where('motorcycleId', '==', motorcycleId),
    where('status', 'in', ['confirmed', 'in_progress'])
  );

  const snapshot = await getDocs(q);
  const bookedDates: { date: Date; bookingId: string }[] = [];

  snapshot.docs.forEach((doc) => {
    const booking = doc.data();
    const bookingStart = booking.startDate?.toDate?.() || parseISO(booking.startDate);
    const bookingEnd = booking.endDate?.toDate?.() || parseISO(booking.endDate);

    const days = eachDayOfInterval({ start: bookingStart, end: bookingEnd });

    days.forEach((day) => {
      if (startDate && endDate) {
        if (isWithinInterval(day, { start: startDate, end: endDate })) {
          bookedDates.push({ date: day, bookingId: doc.id });
        }
      } else {
        bookedDates.push({ date: day, bookingId: doc.id });
      }
    });
  });

  return bookedDates;
}
