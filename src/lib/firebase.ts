
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getAuth, browserLocalPersistence, indexedDBLocalPersistence, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // If you plan to use Firebase Storage
import { getAnalytics } from "firebase/analytics"; // Added for Firebase Analytics

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Added for Analytics
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Prefer indexedDB for persistence if available, otherwise use localStorage.
// This is to avoid issues with some browser environments where localStorage is not available.
let auth;
if (typeof window !== "undefined") {
  try {
    auth = initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence]
    });
  } catch (error) {
    console.warn("Failed to initialize auth with IndexedDB, falling back to local persistence:", error);
    auth = getAuth(app); // Fallback if initializeAuth fails
  }
} else {
  // For server-side rendering or environments where window is not defined
  auth = getAuth(app);
}


const db = getFirestore(app);
const storage = getStorage(app); // If using storage
let analytics;
if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
  analytics = getAnalytics(app);
}

export { app, auth, db, storage, analytics };
