
"use client";

import type { ReactNode, FC } from 'react';
import React, { createContext, useContext, useEffect, useCallback, useState } from 'react';
// Firebase Auth types and functions - type imports are fine
import { type Auth, type User } from 'firebase/auth';

// Firebase Auth functions will be dynamically imported
interface FirebaseAuthFunctions {
  createUserWithEmailAndPassword: typeof import('firebase/auth').createUserWithEmailAndPassword;
  signInWithEmailAndPassword: typeof import('firebase/auth').signInWithEmailAndPassword;
  signOut: typeof import('firebase/auth').signOut;
  onAuthStateChanged: typeof import('firebase/auth').onAuthStateChanged;
  sendPasswordResetEmail: typeof import('firebase/auth').sendPasswordResetEmail;
}

import { auth as firebaseAppAuthInstance, db } from '@/lib/firebase'; // Renamed imported auth instance
import { doc, getDoc, Timestamp, updateDoc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface SubscriptionInfo {
  status: 'active' | 'inactive' | 'trial' | null;
  expiresAt: Date | null;
}

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  subscription: SubscriptionInfo | null;
  mainBoardId: string | null;
  boardOrder: string[] | null;
  signUp: (email: string, password: string, name: string) => Promise<any>;
  logIn: (email: string, password: string) => Promise<any>;
  logOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseAuth, setFirebaseAuth] = useState<FirebaseAuthFunctions | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [mainBoardId, setMainBoardId] = useState<string | null>(null);
  const [boardOrder, setBoardOrder] = useState<string[] | null>(null);
  const [hasMounted, setHasMounted] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Initierar applikation..."); // New state for loading message
  const router = useRouter();

  useEffect(() => {
    console.log("AuthProvider Mount: Initializing. hasMounted:", hasMounted);
    setHasMounted(true);
    // Dynamically import Firebase Auth functions to potentially mitigate HMR issues.
    // This is where the "module factory is not available" error often occurs with HMR.
    import('firebase/auth').then((authModule) => {
      console.log("AuthProvider Mount: Firebase Auth functions dynamically imported successfully.");
      setFirebaseAuth({
        createUserWithEmailAndPassword: authModule.createUserWithEmailAndPassword,
        signInWithEmailAndPassword: authModule.signInWithEmailAndPassword,
        signOut: authModule.signOut,
        onAuthStateChanged: authModule.onAuthStateChanged,
        sendPasswordResetEmail: authModule.sendPasswordResetEmail,
      });
      // setLoading(false) is handled by the onAuthStateChanged effect after firebaseAuth is set.
    }).catch(err => {
      console.error("AuthProvider Mount: Failed to load Firebase Auth module dynamically:", err);
      setLoading(false); // Ensure loading is false if dynamic import fails, to avoid infinite loader
      setLoadingMessage("Kunde inte ladda autentisering."); // Update message on error
    });
  }, []); // Empty dependency array, runs once on mount

  useEffect(() => {
    // Update loading message after mount based on actual loading state
    if (hasMounted) {
      if (loading && firebaseAuth) { // Only show "Laddar autentisering..." if firebaseAuth is loaded
        setLoadingMessage("Laddar autentisering...");
      } else if (loading && !firebaseAuth) {
        setLoadingMessage("Väntar på autentiseringstjänst...");
      }
    }
  }, [hasMounted, loading, firebaseAuth]);

  const fetchUserData = useCallback(async (user: User | null) => {
    if (user) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          const expiresAtTimestamp = userData.subscriptionExpiresAt as Timestamp | undefined;
          setSubscription({
            status: userData.subscriptionStatus || 'inactive',
            expiresAt: expiresAtTimestamp ? expiresAtTimestamp.toDate() : null,
          });
          setMainBoardId(userData.mainBoardId || null);
          setBoardOrder(userData.boardOrder || null);

          // Sync displayName from Auth to Firestore if needed
          if (user.displayName && (!userData.displayName || userData.displayName !== user.displayName)) {
            await updateDoc(userDocRef, { displayName: user.displayName });
          }
        } else {
          // Create user document if it doesn't exist (e.g., first sign-up)
          await setDoc(userDocRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || '', // Use displayName from Auth if available
            createdAt: Timestamp.now(),
            subscriptionStatus: 'inactive',
            subscriptionExpiresAt: null,
            mainBoardId: null,
            boardOrder: [],
          });
          setSubscription({ status: 'inactive', expiresAt: null });
          setMainBoardId(null);
          setBoardOrder(null);
        }
      } catch (error) {
        console.error("Error fetching or creating user data:", error);
        setSubscription({ status: 'inactive', expiresAt: null }); // Default on error
        setMainBoardId(null);
        setBoardOrder(null);
      }
    } else {
      // No user, clear user-specific data
      setSubscription(null);
      setMainBoardId(null);
      setBoardOrder(null);
    }
  }, [db]); // db should be stable, but included for completeness

  useEffect(() => {
    if (!hasMounted || !firebaseAuth) {
      console.log("AuthProvider onAuthStateChanged: Waiting for mount or Firebase Auth functions. hasMounted:", hasMounted, "firebaseAuth loaded:", !!firebaseAuth);
      // setLoading(true) is initial state. We wait for firebaseAuth to be loaded.
      return;
    }
    console.log("AuthProvider onAuthStateChanged: Setting up listener with imported functions and auth instance:", firebaseAppAuthInstance);
    const unsubscribe = firebaseAuth.onAuthStateChanged(firebaseAppAuthInstance, async (user) => {
      console.log("AuthProvider onAuthStateChanged: User state -", user ? user.uid : null);
      setCurrentUser(user);
      if (user) {
        await fetchUserData(user);
      } else {
        // Clear user-specific states if user is null
        setSubscription(null);
        setMainBoardId(null);
        setBoardOrder(null);
      }
      setLoading(false); // Auth state resolved (either user or null)
    });
    return unsubscribe; // Cleanup on unmount
  }, [fetchUserData, hasMounted, firebaseAuth, firebaseAppAuthInstance]);


  const refreshUserData = useCallback(async () => {
    if (currentUser) {
      setLoading(true); // Indicate data refresh is happening
      await fetchUserData(currentUser);
      setLoading(false);
    }
  }, [currentUser, fetchUserData]);

  const signUp = async (email: string, password: string, name: string) => {
    if (!firebaseAuth) throw new Error("Firebase Auth functions not initialized for signUp");
    // createUserWithEmailAndPassword automatically signs the user in.
    // The onAuthStateChanged listener will then call fetchUserData to create the Firestore doc.
    // We ensure displayName is passed to Auth, which fetchUserData can then sync.
    const userCredential = await firebaseAuth.createUserWithEmailAndPassword(firebaseAppAuthInstance, email, password);
    if (userCredential.user) {
        // Manually update profile here if needed, though Firestore sync in fetchUserData might be enough
        // await firebaseAuth.updateProfile(userCredential.user, { displayName: name });

        // Firestore document creation is handled by fetchUserData via onAuthStateChanged.
        // We can pre-emptively set some data or rely on onAuthStateChanged.
        // For consistency, let's ensure fetchUserData is robust.
        // The main thing is that `name` is available for when fetchUserData runs.
        // One way is to set it on the auth user object immediately.
        // The `updateProfile` from firebase/auth can be used if firebaseAuth is set
        // For now, we assume `userCredential.user` might not have displayName yet,
        // but `fetchUserData` will use `user.displayName` which might be null initially
        // and then try to set it.

        // The critical part is creating the Firestore user document, which fetchUserData does.
        // Let's ensure the displayName is part of the initial Firestore doc if possible.
         const userDocRef = doc(db, 'users', userCredential.user.uid);
         await setDoc(userDocRef, {
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            displayName: name, // Use the provided name
            createdAt: Timestamp.now(),
            subscriptionStatus: 'inactive',
            subscriptionExpiresAt: null,
            mainBoardId: null,
            boardOrder: [],
          }, { merge: true }); // Use merge to be safe if onAuthStateChanged fires fast
    }
    return userCredential;
  };

  const logIn = (email: string, password: string) => {
    if (!firebaseAuth) throw new Error("Firebase Auth functions not initialized for logIn");
    return firebaseAuth.signInWithEmailAndPassword(firebaseAppAuthInstance, email, password);
  };

  const logOut = async () => {
    if (!firebaseAuth) {
      console.error("Firebase Auth functions not initialized for logout. Falling back to instance logout.");
      await firebaseAppAuthInstance.signOut().catch(e => console.error("Fallback signout error:", e));
    } else {
      await firebaseAuth.signOut(firebaseAppAuthInstance).catch(e => {
        console.error("Error logging out with dynamically imported signOut:", e);
        // Fallback to direct instance call if dynamic fails for some reason
        return firebaseAppAuthInstance.signOut();
      });
    }
    // Clear local state immediately for faster UI update
    setCurrentUser(null);
    setSubscription(null);
    setMainBoardId(null);
    setBoardOrder(null);
    router.push('/logga-in');
  };

  const sendPasswordReset = async (email: string) => {
    if (!firebaseAuth) throw new Error("Firebase Auth functions not initialized for sendPasswordReset");
    return firebaseAuth.sendPasswordResetEmail(firebaseAppAuthInstance, email);
  };
  
  // Show loading indicator if not yet mounted OR if firebase auth/user data is still loading
  if (!hasMounted || loading) { 
     return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-2">
          {loadingMessage}
        </p>
      </div>
    );
  }

  const value = {
    currentUser,
    loading,
    subscription,
    mainBoardId,
    boardOrder,
    signUp,
    logIn,
    logOut,
    sendPasswordReset,
    refreshUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

    