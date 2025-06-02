
import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  type User
} from "firebase/auth"; // Added specific auth function imports
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

// HMR Nudge Comment - vFINAL_LIB - 2024-08-14T12:34:56Z

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp;

console.log(`Firebase module (src/lib/firebase.ts) evaluating (HMR Checkpoint - vFINAL - ${new Date().toISOString()})`);

if (!getApps().length) {
  console.log("Initializing new Firebase app instance...");
  app = initializeApp(firebaseConfig);
} else {
  console.log("Getting existing Firebase app instance...");
  app = getApp() as FirebaseApp; // Type assertion
}

const authInstance = getAuth(app);
const dbInstance = getFirestore(app);
const storageInstance = getStorage(app);
let analyticsInstance: Analytics | undefined;

if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported && firebaseConfig.measurementId) {
      console.log("Firebase Analytics is supported, initializing...");
      analyticsInstance = getAnalytics(app);
    } else {
      console.log("Firebase Analytics not supported or no measurementId.");
    }
  }).catch(err => {
    console.error("Error checking Firebase Analytics support:", err);
  });
}

export {
  app,
  authInstance as auth, // Keep existing auth instance export
  dbInstance as db,
  storageInstance as storage,
  analyticsInstance as analytics,
  // Re-export auth functions and User type
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  type User
};
