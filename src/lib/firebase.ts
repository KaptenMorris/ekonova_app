
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getAuth, browserLocalPersistence, indexedDBLocalPersistence, initializeAuth } from "firebase/auth"; // Added initializeAuth and persistence types
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // If you plan to use Firebase Storage
import { getAnalytics, isSupported } from "firebase/analytics"; // Added isSupported

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Explicitly initialize Auth, this might help with HMR in some edge cases or provide more control.
// Using default persistence order: indexedDB, then browserLocalPersistence.
const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence]
});

const db = getFirestore(app);
const storage = getStorage(app); // If using storage

let analytics;
// Conditionally initialize Analytics only on client and if supported
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported && firebaseConfig.measurementId) {
      analytics = getAnalytics(app);
    }
  }).catch(err => {
    console.error("Error checking Firebase Analytics support:", err);
  });
}

export { app, auth, db, storage, analytics };

