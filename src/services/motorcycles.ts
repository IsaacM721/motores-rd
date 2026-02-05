'use client';

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  DocumentSnapshot,
  QueryConstraint,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { getFirebaseDb, getFirebaseStorage } from '@/lib/firebase/client';
import { Motorcycle, MotorcycleFilters, MotorcycleImage, Brand, Make } from '@/types';
import { slugify } from '@/lib/slug';

const MOTORCYCLES_COLLECTION = 'motorcycles';
const BRANDS_COLLECTION = 'brands';
const MAKES_COLLECTION = 'makes';

/**
 * Get all motorcycles with optional filtering
 */
export async function getMotorcycles(
  filters?: MotorcycleFilters,
  pageSize: number = 20,
  lastDoc?: DocumentSnapshot
): Promise<{ motorcycles: Motorcycle[]; lastDoc: DocumentSnapshot | null }> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not configured');

  const constraints: QueryConstraint[] = [];

  // Apply filters
  if (filters?.brand) {
    constraints.push(where('make', '==', filters.brand));
  }
  if (filters?.category) {
    constraints.push(where('category', '==', filters.category));
  }
  if (filters?.minEngineCC) {
    constraints.push(where('engineCC', '>=', filters.minEngineCC));
  }
  if (filters?.maxEngineCC) {
    constraints.push(where('engineCC', '<=', filters.maxEngineCC));
  }
  if (filters?.minPrice) {
    constraints.push(where('dailyPrice', '>=', filters.minPrice));
  }
  if (filters?.maxPrice) {
    constraints.push(where('dailyPrice', '<=', filters.maxPrice));
  }

  // Always filter for available motorcycles in public view
  constraints.push(where('available', '==', true));

  // Order by creation date
  constraints.push(orderBy('createdAt', 'desc'));

  // Pagination
  constraints.push(limit(pageSize));
  if (lastDoc) {
    constraints.push(startAfter(lastDoc));
  }

  const q = query(collection(db, MOTORCYCLES_COLLECTION), ...constraints);
  const snapshot = await getDocs(q);

  const motorcycles: Motorcycle[] = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  })) as Motorcycle[];

  const newLastDoc = snapshot.docs[snapshot.docs.length - 1] || null;

  return { motorcycles, lastDoc: newLastDoc };
}

/**
 * Get a single motorcycle by ID
 */
export async function getMotorcycleById(id: string): Promise<Motorcycle | null> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not configured');

  const docRef = doc(db, MOTORCYCLES_COLLECTION, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  return {
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: docSnap.data().createdAt?.toDate() || new Date(),
    updatedAt: docSnap.data().updatedAt?.toDate() || new Date(),
  } as Motorcycle;
}

/**
 * Get a motorcycle by slug
 */
export async function getMotorcycleBySlug(slug: string): Promise<Motorcycle | null> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not configured');

  const q = query(
    collection(db, MOTORCYCLES_COLLECTION),
    where('slug', '==', slug),
    limit(1)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  } as Motorcycle;
}

/**
 * Get motorcycles by owner (dealer)
 */
export async function getMotorcyclesByOwner(ownerId: string): Promise<Motorcycle[]> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not configured');

  const q = query(
    collection(db, MOTORCYCLES_COLLECTION),
    where('ownerId', '==', ownerId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  })) as Motorcycle[];
}

/**
 * Create a new motorcycle listing
 */
export async function createMotorcycle(
  data: Omit<Motorcycle, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not configured');

  const docRef = await addDoc(collection(db, MOTORCYCLES_COLLECTION), {
    ...data,
    slug: data.slug || slugify(`${data.make}-${data.model}`),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Update a motorcycle listing
 */
export async function updateMotorcycle(
  id: string,
  data: Partial<Motorcycle>
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not configured');

  const docRef = doc(db, MOTORCYCLES_COLLECTION, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a motorcycle listing
 */
export async function deleteMotorcycle(id: string): Promise<void> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not configured');

  await deleteDoc(doc(db, MOTORCYCLES_COLLECTION, id));
}

/**
 * Upload motorcycle image
 */
export async function uploadMotorcycleImage(
  motorcycleId: string,
  file: File,
  color: string
): Promise<MotorcycleImage> {
  const storage = getFirebaseStorage();
  if (!storage) throw new Error('Firebase Storage not configured');

  const colorSlug = slugify(color);
  const timestamp = Date.now();
  const extension = file.name.split('.').pop();
  const filename = `${motorcycleId}-${colorSlug}-${timestamp}.${extension}`;
  const path = `motorcycles/${motorcycleId}/${colorSlug}/${filename}`;

  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  return {
    url,
    color,
    colorSlug,
    isPrimary: false,
  };
}

/**
 * Delete motorcycle image
 */
export async function deleteMotorcycleImage(imageUrl: string): Promise<void> {
  const storage = getFirebaseStorage();
  if (!storage) throw new Error('Firebase Storage not configured');

  const storageRef = ref(storage, imageUrl);
  await deleteObject(storageRef);
}

/**
 * Get all brands
 */
export async function getBrands(): Promise<Brand[]> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not configured');

  const q = query(collection(db, BRANDS_COLLECTION), orderBy('name', 'asc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Brand[];
}

/**
 * Get makes by brand
 */
export async function getMakesByBrand(brandId: string): Promise<Make[]> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not configured');

  const q = query(
    collection(db, MAKES_COLLECTION),
    where('brandId', '==', brandId),
    orderBy('name', 'asc')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Make[];
}

/**
 * Get highlighted motorcycles for homepage
 */
export async function getHighlightedMotorcycles(count: number = 6): Promise<Motorcycle[]> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not configured');

  const q = query(
    collection(db, MOTORCYCLES_COLLECTION),
    where('available', '==', true),
    where('isHighlighted', '==', true),
    orderBy('createdAt', 'desc'),
    limit(count)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  })) as Motorcycle[];
}
