
// HMR Nudge Comment - vFINAL_LIB_ATTEMPT_X - 2024-08-15T12:00:00Z
// HMR Nudge Comment - vFINAL_LIB_ATTEMPT_Y_SINGLETON_REFINED - 2024-08-15T14:00:00Z
import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  type User,
  type Auth
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";


const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Log a warning if essential Firebase config values are missing
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.warn(
    "Firebase configuration is missing essential values (apiKey or projectId). " +
    "Please ensure your .env file is set up correctly with NEXT_PUBLIC_FIREBASE_API_KEY and NEXT_PUBLIC_FIREBASE_PROJECT_ID. " +
    "Using placeholder/missing values will likely cause Firebase services to fail."
  );
}


let app: FirebaseApp;
let initializedAuthInstance: Auth | null = null;

console.log(`Firebase module (src/lib/firebase.ts) evaluating (HMR Checkpoint - Add Config Warning - ${new Date().toISOString()})`);

if (!getApps().length) {
  console.log("src/lib/firebase.ts: Initializing new Firebase app instance...");
  app = initializeApp(firebaseConfig);
} else {
  console.log("src/lib/firebase.ts: Getting existing Firebase app instance...");
  app = getApp(); // Default app
}

function getFirebaseAuthInstance(): Auth {
  if (!initializedAuthInstance) {
    console.log("src/lib/firebase.ts: Initializing Firebase Auth instance for the first time via getFirebaseAuthInstance...");
    initializedAuthInstance = getAuth(app);
  }
  return initializedAuthInstance;
}


const dbInstance = getFirestore(app);
const storageInstance = getStorage(app);
let analyticsInstance: Analytics | undefined;

if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported && firebaseConfig.measurementId) {
      console.log("Firebase Analytics is supported, initializing...");
      analyticsInstance = getAnalytics(app);
    }
  }).catch(err => {
    console.error("Error checking Firebase Analytics support:", err);
  });
}

export {
  app,
  getFirebaseAuthInstance,
  dbInstance as db,
  storageInstance as storage,
  analyticsInstance as analytics,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  type User,
  type Auth
};
