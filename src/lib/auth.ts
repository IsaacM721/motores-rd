'use client';

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  OAuthProvider,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from './firebase/client';
import { User, UserRole } from '@/types';

const googleProvider = new GoogleAuthProvider();
const appleProvider = new OAuthProvider('apple.com');

appleProvider.addScope('email');
appleProvider.addScope('name');

/**
 * Sign in with email and password
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ user: User | null; error: string | null }> {
  const auth = getFirebaseAuth();
  const db = getFirebaseDb();

  if (!auth || !db) {
    return { user: null, error: 'Firebase not configured' };
  }

  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const user = await getUserFromFirestore(result.user.uid);

    // Update last login
    await setDoc(
      doc(db, 'users', result.user.uid),
      { lastLoginAt: serverTimestamp() },
      { merge: true }
    );

    return { user, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed';
    return { user: null, error: message };
  }
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string,
  role: UserRole = 'customer'
): Promise<{ user: User | null; error: string | null }> {
  const auth = getFirebaseAuth();
  const db = getFirebaseDb();

  if (!auth || !db) {
    return { user: null, error: 'Firebase not configured' };
  }

  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);

    // Update display name
    await updateProfile(result.user, { displayName });

    // Create user document in Firestore
    const userData: Omit<User, 'uid'> = {
      email,
      displayName,
      photoURL: null,
      role,
      phone: null,
      businessName: null,
      businessAddress: null,
      businessPhone: null,
      isVerified: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date(),
    };

    await setDoc(doc(db, 'users', result.user.uid), {
      ...userData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    });

    return {
      user: { uid: result.user.uid, ...userData },
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Signup failed';
    return { user: null, error: message };
  }
}

/**
 * Sign in with Google
 */
export async function signInWithGoogle(): Promise<{
  user: User | null;
  error: string | null;
  isNewUser: boolean;
}> {
  const auth = getFirebaseAuth();
  const db = getFirebaseDb();

  if (!auth || !db) {
    return { user: null, error: 'Firebase not configured', isNewUser: false };
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    const { user: firebaseUser } = result;

    // Check if user exists
    const existingUser = await getUserFromFirestore(firebaseUser.uid);

    if (existingUser) {
      // Update last login
      await setDoc(
        doc(db, 'users', firebaseUser.uid),
        { lastLoginAt: serverTimestamp() },
        { merge: true }
      );
      return { user: existingUser, error: null, isNewUser: false };
    }

    // Create new user
    const userData: Omit<User, 'uid'> = {
      email: firebaseUser.email || '',
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
      role: 'customer',
      phone: firebaseUser.phoneNumber,
      businessName: null,
      businessAddress: null,
      businessPhone: null,
      isVerified: firebaseUser.emailVerified,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date(),
    };

    await setDoc(doc(db, 'users', firebaseUser.uid), {
      ...userData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    });

    return {
      user: { uid: firebaseUser.uid, ...userData },
      error: null,
      isNewUser: true,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Google sign-in failed';
    return { user: null, error: message, isNewUser: false };
  }
}

/**
 * Sign in with Apple
 */
export async function signInWithApple(): Promise<{
  user: User | null;
  error: string | null;
  isNewUser: boolean;
}> {
  const auth = getFirebaseAuth();
  const db = getFirebaseDb();

  if (!auth || !db) {
    return { user: null, error: 'Firebase not configured', isNewUser: false };
  }

  try {
    const result = await signInWithPopup(auth, appleProvider);
    const { user: firebaseUser } = result;

    // Check if user exists
    const existingUser = await getUserFromFirestore(firebaseUser.uid);

    if (existingUser) {
      await setDoc(
        doc(db, 'users', firebaseUser.uid),
        { lastLoginAt: serverTimestamp() },
        { merge: true }
      );
      return { user: existingUser, error: null, isNewUser: false };
    }

    // Create new user
    const userData: Omit<User, 'uid'> = {
      email: firebaseUser.email || '',
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
      role: 'customer',
      phone: null,
      businessName: null,
      businessAddress: null,
      businessPhone: null,
      isVerified: firebaseUser.emailVerified,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date(),
    };

    await setDoc(doc(db, 'users', firebaseUser.uid), {
      ...userData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    });

    return {
      user: { uid: firebaseUser.uid, ...userData },
      error: null,
      isNewUser: true,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Apple sign-in failed';
    return { user: null, error: message, isNewUser: false };
  }
}

/**
 * Sign out
 */
export async function signOut(): Promise<{ error: string | null }> {
  const auth = getFirebaseAuth();

  if (!auth) {
    return { error: 'Firebase not configured' };
  }

  try {
    await firebaseSignOut(auth);
    return { error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sign out failed';
    return { error: message };
  }
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string): Promise<{ error: string | null }> {
  const auth = getFirebaseAuth();

  if (!auth) {
    return { error: 'Firebase not configured' };
  }

  try {
    await sendPasswordResetEmail(auth, email);
    return { error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Password reset failed';
    return { error: message };
  }
}

/**
 * Get user data from Firestore
 */
export async function getUserFromFirestore(uid: string): Promise<User | null> {
  const db = getFirebaseDb();

  if (!db) {
    return null;
  }

  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      uid,
      email: data.email || '',
      displayName: data.displayName || null,
      photoURL: data.photoURL || null,
      role: data.role || 'customer',
      phone: data.phone || null,
      businessName: data.businessName || null,
      businessAddress: data.businessAddress || null,
      businessPhone: data.businessPhone || null,
      isVerified: data.isVerified || false,
      isActive: data.isActive !== false,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      lastLoginAt: data.lastLoginAt?.toDate() || null,
    };
  } catch {
    return null;
  }
}

/**
 * Subscribe to auth state changes
 */
export function onAuthChange(
  callback: (user: User | null) => void
): () => void {
  const auth = getFirebaseAuth();

  if (!auth) {
    callback(null);
    return () => {};
  }

  return onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
    if (!firebaseUser) {
      callback(null);
      return;
    }

    const user = await getUserFromFirestore(firebaseUser.uid);
    callback(user);
  });
}

/**
 * Check if user has a specific role
 */
export function hasRole(user: User | null, ...roles: UserRole[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

/**
 * Check if user is admin
 */
export function isAdmin(user: User | null): boolean {
  return hasRole(user, 'admin');
}

/**
 * Check if user is dealer
 */
export function isDealer(user: User | null): boolean {
  return hasRole(user, 'dealer');
}

/**
 * Check if user is dealer or admin
 */
export function isDealerOrAdmin(user: User | null): boolean {
  return hasRole(user, 'dealer', 'admin');
}
