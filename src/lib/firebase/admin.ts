import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage, Storage } from 'firebase-admin/storage';

let adminApp: App | null = null;
let adminAuth: Auth | null = null;
let adminDb: Firestore | null = null;
let adminStorage: Storage | null = null;

function initializeAdminFirebase() {
  if (getApps().length > 0) {
    adminApp = getApps()[0];
  } else {
    // For local development, use service account JSON
    // In production, use environment variables or Application Default Credentials
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
      : undefined;

    if (serviceAccount) {
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // Use ADC (Application Default Credentials)
      adminApp = initializeApp({
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
    } else {
      console.warn('Firebase Admin SDK not configured. Set FIREBASE_SERVICE_ACCOUNT_KEY or GOOGLE_APPLICATION_CREDENTIALS.');
      return { adminApp: null, adminAuth: null, adminDb: null, adminStorage: null };
    }
  }

  adminAuth = getAuth(adminApp);
  adminDb = getFirestore(adminApp);
  adminStorage = getStorage(adminApp);

  return { adminApp, adminAuth, adminDb, adminStorage };
}

// Initialize on import (server-side only)
const admin = typeof window === 'undefined' ? initializeAdminFirebase() : {
  adminApp: null,
  adminAuth: null,
  adminDb: null,
  adminStorage: null,
};

export { admin };
export const getAdminAuth = () => admin.adminAuth;
export const getAdminDb = () => admin.adminDb;
export const getAdminStorage = () => admin.adminStorage;
