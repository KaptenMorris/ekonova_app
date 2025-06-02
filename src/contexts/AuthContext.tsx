
"use client";

// HMR Nudge Comment - vFINAL_AUTH_CTX_ATTEMPT_Z_INSTANCE_REFACTOR - 2024-08-15T15:00:00Z
// Firebase Auth import moved to the top (previous attempt, kept for structure)
// Auth functions are now imported from @/lib/firebase, which re-exports them
// The initialized `auth` instance is now also fetched via a function from @/lib/firebase
import {
  type User,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  getFirebaseAuthInstance, // Import the function to get the auth instance
  db, // Keep db import
  type Auth // Import Auth type
} from '@/lib/firebase';
import type { ReactNode, FC } from 'react';
import React, { createContext, useContext, useEffect, useCallback, useState } from 'react';
import { doc, getDoc, Timestamp, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';


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
  const [currentUser, setCurrentUser] = useState<User | null | undefined>(undefined);
  const [hasMounted, setHasMounted] = useState(false);
  const [initialAuthCheckDone, setInitialAuthCheckDone] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Laddar applikation...");

  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [mainBoardId, setMainBoardId] = useState<string | null>(null);
  const [boardOrder, setBoardOrder] = useState<string[] | null>(null);

  const router = useRouter();
  
  // Get the auth instance once when the provider mounts, or as needed
  // This approach ensures we are using the instance managed by lib/firebase.ts
  const [auth, setAuth] = useState<Auth | null>(null);

  useEffect(() => {
    setHasMounted(true);
    // Initialize auth instance when component mounts
    // This should only run once
    if (!auth) {
      console.log("AuthProvider: Fetching Firebase Auth instance...");
      setAuth(getFirebaseAuthInstance());
    }
  }, [auth]); // Effect depends on auth to run once after initial setAuth(null)

  const fetchUserData = useCallback(async (user: User | null, currentAuth: Auth | null) => {
    if (user && currentAuth) { // Check if currentAuth is available
      try {
        setLoadingMessage("Hämtar användardata...");
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

          const authUserToUpdate = currentAuth.currentUser;
          if (authUserToUpdate) {
            let firestoreUpdates: any = {};
            let authProfileNeedsUpdate = false;
            let authProfileUpdatePayload: { displayName?: string | null; photoURL?: string | null } = {};

            const firestoreDisplayName = userData.displayName || '';
            const authDisplayName = authUserToUpdate.displayName || '';
            if (firestoreDisplayName && firestoreDisplayName !== authDisplayName) {
              authProfileUpdatePayload.displayName = firestoreDisplayName;
              authProfileNeedsUpdate = true;
            } else if (authDisplayName && authDisplayName !== firestoreDisplayName) {
              firestoreUpdates.displayName = authDisplayName;
            }

            const firestorePhotoURL = userData.photoURL || null;
            const authPhotoURL = authUserToUpdate.photoURL || null;
            if (firestorePhotoURL && firestorePhotoURL !== authPhotoURL) {
              authProfileUpdatePayload.photoURL = firestorePhotoURL;
              authProfileNeedsUpdate = true;
            } else if (authPhotoURL && authPhotoURL !== firestorePhotoURL) {
              firestoreUpdates.photoURL = authPhotoURL;
            }
            
            if (Object.keys(firestoreUpdates).length > 0) {
               firestoreUpdates.updatedAt = serverTimestamp();
              await updateDoc(userDocRef, firestoreUpdates);
            }
            if (authProfileNeedsUpdate && Object.keys(authProfileUpdatePayload).length > 0) {
              await updateProfile(authUserToUpdate, authProfileUpdatePayload);
            }
          }
        } else {
          setLoadingMessage("Skapar användarprofil...");
          const initialDisplayName = user.displayName || '';
          await setDoc(userDocRef, {
            uid: user.uid,
            email: user.email,
            displayName: initialDisplayName,
            photoURL: user.photoURL || null,
            createdAt: serverTimestamp(),
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
        console.error("Error fetching or creating user data in fetchUserData:", error);
        setSubscription({ status: 'inactive', expiresAt: null });
        setMainBoardId(null);
        setBoardOrder(null);
      }
    } else {
      setSubscription(null);
      setMainBoardId(null);
      setBoardOrder(null);
    }
  }, []);


  useEffect(() => {
    if (!hasMounted || !auth) { // Wait for both mount and auth instance
        if (hasMounted && !auth) console.log("AuthProvider onAuthStateChanged: Waiting for auth instance to be set...");
        return;
    }

    setLoadingMessage("Sätter upp autentiseringslyssnare...");
    console.log("AuthProvider: Setting up onAuthStateChanged listener with auth instance.");
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("AuthProvider onAuthStateChanged: User state -", user ? `${user.uid} (${user.displayName || user.email})` : null);
      setCurrentUser(user);
      if (user) {
        await fetchUserData(user, auth); // Pass the auth instance
      } else {
        setSubscription(null);
        setMainBoardId(null);
        setBoardOrder(null);
      }
      setInitialAuthCheckDone(true);
      setLoadingMessage("Autentisering klar.");
    }, (error) => {
        console.error("AuthProvider onAuthStateChanged error:", error);
        setCurrentUser(null);
        setSubscription(null);
        setMainBoardId(null);
        setBoardOrder(null);
        setInitialAuthCheckDone(true);
        setLoadingMessage("Autentiseringsfel.");
    });

    return () => {
      console.log("AuthProvider: Cleaning up onAuthStateChanged listener.");
      unsubscribe();
    };
  }, [hasMounted, fetchUserData, auth]); // Depend on auth instance


  const signUp = async (email: string, password: string, name: string) => {
    if (!auth) throw new Error("Firebase Auth instance not initialized for signUp.");
    setLoadingMessage("Registrerar konto...");
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (userCredential.user) {
      await updateProfile(userCredential.user, { displayName: name });
    }
    setLoadingMessage("Konto skapat, loggar in...");
    return userCredential;
  };

  const logIn = async (email: string, password: string) => {
    if (!auth) throw new Error("Firebase Auth instance not initialized for logIn.");
    setLoadingMessage("Loggar in...");
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logOut = async () => {
    if (!auth) {
        console.warn("Firebase Auth instance not available for logOut, but proceeding with UI changes.");
        // Proceed to clear local state and redirect even if auth instance is somehow missing
        // to avoid getting stuck.
        setCurrentUser(null);
        setSubscription(null);
        setMainBoardId(null);
        setBoardOrder(null);
        router.push('/logga-in');
        setLoadingMessage("Utloggad (auth instance var null).");
        return;
    }
    setLoadingMessage("Loggar ut...");
    await signOut(auth);
    router.push('/logga-in');
    setLoadingMessage("Utloggad.");
  };

  const sendPasswordReset = async (email: string) => {
    if (!auth) throw new Error("Firebase Auth instance not initialized for sendPasswordReset.");
    console.log(`AuthContext: Attempting to send password reset for ${email}. (HMR Test Comment V_INSTANCE_REFACTOR)`);
    return sendPasswordResetEmail(auth, email);
  };

  const refreshUserData = useCallback(async () => {
    if (!auth) {
        console.warn("Firebase Auth instance not available for refreshUserData.");
        setLoadingMessage("Kunde inte uppdatera: auth-instans saknas.");
        return;
    }
    const currentAuthUser = auth.currentUser;
    if (currentAuthUser) {
      setLoadingMessage("Uppdaterar användardata...");
      await fetchUserData(currentAuthUser, auth); // Pass auth instance
      setLoadingMessage("Användardata uppdaterad.");
    } else {
      setLoadingMessage("Ingen användare inloggad för uppdatering.");
      await fetchUserData(null, auth); // Pass auth instance
    }
  }, [fetchUserData, auth]);

  const loading = !hasMounted || !initialAuthCheckDone || !auth; // Also consider auth instance loading

  if (!hasMounted) {
    return null;
  }

  if (loading) {
     return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <p className="ml-2">{loadingMessage || "Initierar applikation..."}</p>
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
