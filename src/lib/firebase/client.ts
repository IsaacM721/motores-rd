'use client';

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { firebaseConfig, validateFirebaseConfig } from './config';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

function initializeFirebase() {
  if (typeof window === 'undefined') {
    return { app: null, auth: null, db: null, storage: null };
  }

  if (!validateFirebaseConfig()) {
    console.warn('Firebase not configured. Add environment variables.');
    return { app: null, auth: null, db: null, storage: null };
  }

  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }

  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);

  return { app, auth, db, storage };
}

// Initialize on import
const firebase = initializeFirebase();

export { firebase };
export const getFirebaseAuth = () => firebase.auth;
export const getFirebaseDb = () => firebase.db;
export const getFirebaseStorage = () => firebase.storage;
