
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
  updateProfile: typeof import('firebase/auth').updateProfile; // Added for completeness
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
  const [authLoadingError, setAuthLoadingError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); // True initially: waiting for mount, then auth functions, then auth state
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [mainBoardId, setMainBoardId] = useState<string | null>(null);
  const [boardOrder, setBoardOrder] = useState<string[] | null>(null);
  const [hasMounted, setHasMounted] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Initierar applikation...");
  const router = useRouter();


  useEffect(() => {
    console.log("AuthProvider Mount: Initializing. Current hasMounted:", hasMounted);
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
        updateProfile: authModule.updateProfile,
      });
      setAuthLoadingError(null); // Clear any previous error
    }).catch(err => {
      console.error("AuthProvider Mount: Failed to load Firebase Auth module dynamically:", err);
      setFirebaseAuth(null); // Explicitly set to null on error
      setAuthLoadingError("Kunde inte ladda autentiseringstjänsten.");
      setLoading(false); // Stop loading if auth module fails, app might be partly functional or show error
    });
  }, []); // Empty dependency array, runs once on mount

  useEffect(() => {
    // This effect updates the loading message based on the current state,
    // but only after the component has mounted.
    if (hasMounted && loading) { // Only set client-side messages when mounted and loading
      if (authLoadingError) {
        setLoadingMessage(authLoadingError);
      } else if (firebaseAuth) {
        setLoadingMessage("Laddar autentisering..."); // Auth functions loaded, now waiting for user state
      } else { // Still waiting for firebaseAuth dynamic import, no error yet
        setLoadingMessage("Väntar på autentiseringstjänst...");
      }
    }
    // If !hasMounted, the initial message "Initierar applikation..." is used (see render logic).
    // If !loading, the spinner isn't shown, so this message isn't visible.
  }, [hasMounted, loading, firebaseAuth, authLoadingError]);


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

          if (user.displayName && (!userData.displayName || userData.displayName !== user.displayName)) {
            await updateDoc(userDocRef, { displayName: user.displayName });
          }
        } else {
          if (firebaseAuth) { // Ensure firebaseAuth is loaded before trying to update profile
             // Ensure user has displayName set in Auth, then create Firestore doc
            const currentAuthUser = firebaseAppAuthInstance.currentUser; // Get fresh auth user
            let authDisplayName = user.displayName;

            if (currentAuthUser && !currentAuthUser.displayName && user.displayName /* from initial user object */) {
                 // This scenario is less likely if signUp already sets it, but as a fallback
                try {
                    await firebaseAuth.updateProfile(currentAuthUser, { displayName: user.displayName });
                    authDisplayName = user.displayName; // Confirm it's set
                } catch (profileError) {
                    console.warn("Could not update Firebase Auth profile displayName during initial doc creation:", profileError);
                }
            }

            await setDoc(userDocRef, {
              uid: user.uid,
              email: user.email,
              displayName: authDisplayName || '', // Use the (potentially updated) authDisplayName
              createdAt: Timestamp.now(),
              subscriptionStatus: 'inactive',
              subscriptionExpiresAt: null,
              mainBoardId: null,
              boardOrder: [],
            });
            setSubscription({ status: 'inactive', expiresAt: null });
            setMainBoardId(null);
            setBoardOrder(null);
          } else {
            console.warn("fetchUserData: firebaseAuth not loaded, cannot ensure displayName for new user doc.");
             // Fallback to creating doc without definite displayName sync, onAuthStateChanged will re-run
            await setDoc(userDocRef, {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || '', // Best effort
              createdAt: Timestamp.now(),
              // ... other default fields
            });
          }
        }
      } catch (error) {
        console.error("Error fetching or creating user data:", error);
        setSubscription({ status: 'inactive', expiresAt: null });
        setMainBoardId(null);
        setBoardOrder(null);
      }
    } else {
      setSubscription(null);
      setMainBoardId(null);
      setBoardOrder(null);
    }
  }, [db, firebaseAuth, firebaseAppAuthInstance]); // Added firebaseAppAuthInstance

  useEffect(() => {
    // This effect sets up the onAuthStateChanged listener.
    // It waits for both `hasMounted` and `firebaseAuth` (dynamic import) to be ready.
    if (!hasMounted || !firebaseAuth) {
      console.log("AuthProvider onAuthStateChanged: Waiting for mount or Firebase Auth functions. hasMounted:", hasMounted, "firebaseAuth loaded:", !!firebaseAuth);
      if (hasMounted && authLoadingError) { // If mount is done but auth functions failed to load
        setLoading(false); // Stop overall loading, error message will be shown by loadingMessage
      } else if (hasMounted && !firebaseAuth) {
        // Mounted, but dynamic import not yet finished (and no error yet)
        // `loading` remains true, message is "Väntar på autentiseringstjänst..."
      } else {
        // Not mounted yet, `loading` remains true, message is "Initierar applikation..."
      }
      return;
    }
    console.log("AuthProvider onAuthStateChanged: Setting up listener with imported functions and auth instance:", firebaseAppAuthInstance);
    const unsubscribe = firebaseAuth.onAuthStateChanged(firebaseAppAuthInstance, async (user) => {
      console.log("AuthProvider onAuthStateChanged: User state -", user ? user.uid : null);
      setCurrentUser(user);
      if (user) {
        await fetchUserData(user);
      } else {
        setSubscription(null);
        setMainBoardId(null);
        setBoardOrder(null);
      }
      setLoading(false); // Auth state resolved (user or null), and Firebase Auth functions are loaded
    });
    return unsubscribe;
  }, [fetchUserData, hasMounted, firebaseAuth, firebaseAppAuthInstance, authLoadingError]);


  const refreshUserData = useCallback(async () => {
    if (currentUser) {
      setLoading(true);
      await fetchUserData(currentUser);
      setLoading(false);
    }
  }, [currentUser, fetchUserData]);

  const signUp = async (email: string, password: string, name: string) => {
    if (!firebaseAuth) throw new Error("Firebase Auth functions not initialized for signUp");
    const userCredential = await firebaseAuth.createUserWithEmailAndPassword(firebaseAppAuthInstance, email, password);
    if (userCredential.user) {
      await firebaseAuth.updateProfile(userCredential.user, { displayName: name });
      // Firestore document creation is handled by fetchUserData via onAuthStateChanged.
      // To ensure displayName is available for fetchUserData, we update the auth profile first.
      // Then, we can call fetchUserData directly or let onAuthStateChanged handle it.
      // For immediate effect if onAuthStateChanged is slow:
      const userWithProfile = { ...userCredential.user, displayName: name };
      await fetchUserData(userWithProfile as User); // Cast because displayName might not be on type yet
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
        return firebaseAppAuthInstance.signOut();
      });
    }
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

  // --- Render Logic ---

  // Case 1: Server-side rendering OR very first client render before `hasMounted` effect runs.
  // Message is hardcoded to match server.
  if (!hasMounted) {
     return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-2">Initierar applikation...</p>
      </div>
    );
  }

  // Case 2: Client-side, component has mounted (`hasMounted` is true), but still loading
  // (either waiting for dynamic import of firebaseAuth, or waiting for onAuthStateChanged).
  // Message comes from `loadingMessage` state, which is updated by `useEffect`.
  if (loading) { // `loading` is true if dynamic import in progress OR onAuthStateChanged pending
     return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-2">{loadingMessage}</p>
      </div>
    );
  }

  // Case 3: Client-side, mounted, and all loading is complete.
  const value = {
    currentUser,
    loading, // This will be false here
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
