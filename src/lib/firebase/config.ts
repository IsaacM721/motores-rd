// Firebase configuration
// Replace these values with your Firebase project settings
// Get these from Firebase Console > Project Settings > Your Apps > Web App

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
};

// Validate that required config values are present
export function validateFirebaseConfig(): boolean {
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'appId'];

  for (const field of requiredFields) {
    if (!firebaseConfig[field as keyof typeof firebaseConfig]) {
      console.warn(`Firebase config missing: ${field}`);
      return false;
    }
  }

  return true;
}
