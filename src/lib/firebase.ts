
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

// Enhanced Debug log for all config keys
console.log(
  '[Firebase Debug] Firebase configuration being used by the app:',
  Object.fromEntries(
    Object.entries(firebaseConfig).map(([key, value]) => [
      key,
      key === 'apiKey' && value ? `******${String(value).slice(-4)}` : value || 'NOT SET or EMPTY',
    ])
  )
);

// Stricter check for API Key, including common placeholder values
if (
  !firebaseConfig.apiKey ||
  firebaseConfig.apiKey.trim() === "" ||
  firebaseConfig.apiKey === "YOUR_API_KEY_HERE" || // Common placeholder from .env example
  firebaseConfig.apiKey.includes("PLACEHOLDER") || // Other potential placeholders
  firebaseConfig.apiKey.startsWith("NEXT_PUBLIC_") // If the env variable name itself was copied
) {
  const errorMessage = `
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
CRITICAL FIREBASE CONFIG ERROR: NEXT_PUBLIC_FIREBASE_API_KEY is missing, empty,
or still set to a placeholder value in your .env file.
Current problematic value (masked if long): ${firebaseConfig.apiKey ? firebaseConfig.apiKey.substring(0,10) + '...' : 'MISSING/EMPTY'}

Firebase WILL NOT INITIALIZE.

Please ensure this and other NEXT_PUBLIC_FIREBASE_... variables are correctly
set in your .env file with actual values from your Firebase project settings,
and then FULLY RESTART your Next.js server (e.g., stop and 'npm run dev').
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  `;
  console.error(errorMessage);
  // To make it super obvious on the server side and prevent app from trying to run with bad config:
  if (typeof window === 'undefined') { // Server-side check
    // This will crash the server build/startup if apiKey is bad, making it obvious.
    throw new Error("FATAL: Firebase API Key is not configured correctly. Check server logs and .env file. Server startup halted.");
  }
}


const requiredConfigKeys: Array<keyof FirebaseOptions> = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const missingConfigValues = requiredConfigKeys.filter(key => {
  const value = firebaseConfig[key];
  return !value || (typeof value === 'string' && value.trim() === '');
});

if (missingConfigValues.length > 0) {
  console.error(
    "CRITICAL FIREBASE CONFIG ERROR: The following Firebase configuration values are missing or empty in your environment variables (e.g., .env file) or derived firebaseConfig object: " +
    missingConfigValues.join(', ') +
    ". Please ensure all NEXT_PUBLIC_FIREBASE_... variables are correctly set with values from your Firebase project settings. " +
    "Firebase services will NOT work correctly until this is resolved. You may need to restart your Next.js server after updating .env."
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
  console.error("CRITICAL_FIREBASE_INIT_FAILURE in src/lib/firebase.ts during Firebase SDK initialization:", error);
  // This error will propagate and should be visible in the browser console or Next.js output
  throw new Error(`Critical Firebase Init Failure: ${(error as Error).message || String(error)}`);
}

export {
  app,
  auth,
  db,
  storage,
  analytics,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  type User,
  type FirebaseAuthType as Auth
};
