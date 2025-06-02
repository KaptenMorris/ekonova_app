
import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from "firebase/app"; // Added FirebaseApp type
import { getAuth } from "firebase/auth";
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

let app: FirebaseApp; // Explicitly type the app instance

console.log("Firebase module (src/lib/firebase.ts) evaluating..."); // Diagnostic log

if (!getApps().length) {
  console.log("Initializing new Firebase app...");
  app = initializeApp(firebaseConfig);
} else {
  console.log("Getting existing Firebase app...");
  app = getApp();
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

export { app, authInstance as auth, dbInstance as db, storageInstance as storage, analyticsInstance as analytics };
