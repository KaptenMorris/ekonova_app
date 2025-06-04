
// HMR Nudge Comment - vFINAL_LIB_ATTEMPT_X - 2024-08-15T12:00:00Z
// HMR Nudge Comment - vFINAL_LIB_ATTEMPT_Y_SINGLETON_REFINED - 2024-08-15T14:00:00Z
// HMR Nudge Comment - vFINAL_LIB_ATTEMPT_Z_CONSOLE_LOG - 2024-08-15T15:30:00Z
// HMR Nudge Comment - vFINAL_LIB_ATTEMPT_Z_PERSISTENT_HMR_RETRY - 2024-08-15T16:00:00Z
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
  type Auth as FirebaseAuthType // Import original Auth type
} from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
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

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.warn(
    "src/lib/firebase.ts: Firebase configuration is missing essential values (apiKey or projectId). " +
    "Using placeholder/missing values will likely cause Firebase services to fail. " +
    "Update your .env file with correct NEXT_PUBLIC_FIREBASE_ values."
  );
}

let app: FirebaseApp;
let auth: FirebaseAuthType;
let db: Firestore;
let storage: FirebaseStorage;
let analytics: Analytics | undefined;


try {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }

  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);

  if (typeof window !== 'undefined') {
    isSupported().then((supported) => {
      if (supported && firebaseConfig.measurementId) {
        analytics = getAnalytics(app);
      }
    }).catch(error => {
      console.error("src/lib/firebase.ts: Error initializing Firebase Analytics", error);
    });
  }
} catch (error) {
  console.error("CRITICAL_FIREBASE_INIT_FAILURE in src/lib/firebase.ts:", error);
  // This error will propagate and should be visible in the browser console or Next.js output
  throw new Error(`Critical Firebase Init Failure: ${(error as Error).message || error}`);
}

export {
  app,
  auth, // Export the initialized auth instance directly
  db,
  storage,
  analytics,
  // Re-export functions from 'firebase/auth' that are used by AuthContext or other parts of the app
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  type User,
  type FirebaseAuthType as Auth // Re-export the Auth type, aliased if needed
};
