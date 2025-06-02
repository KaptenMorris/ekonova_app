
"use client";

// HMR Nudge Comment - vFINAL_AUTH_CTX_ATTEMPT_Y - 2024-08-15T14:20:00Z
// Firebase Auth functions are now imported from @/lib/firebase
import {
  type User,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  auth, // auth instance is also exported from @/lib/firebase
} from '@/lib/firebase';
import type { ReactNode, FC } from 'react';
import React, { createContext, useContext, useEffect, useCallback, useState } from 'react';
import { db } from '@/lib/firebase'; // db is fine as is
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
  const [currentUser, setCurrentUser] = useState<User | null | undefined>(undefined); // undefined means initial state, null means no user
  const [hasMounted, setHasMounted] = useState(false);
  const [initialAuthCheckDone, setInitialAuthCheckDone] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Laddar applikation...");

  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [mainBoardId, setMainBoardId] = useState<string | null>(null);
  const [boardOrder, setBoardOrder] = useState<string[] | null>(null);

  const router = useRouter();

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const fetchUserData = useCallback(async (user: User | null) => {
    if (user) {
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

          // Sync Firebase Auth profile if Firestore has a more "canonical" name/photoURL, or vice-versa
          const authUserToUpdate = auth.currentUser; // Use imported auth instance
          if (authUserToUpdate) {
            let firestoreUpdates: any = {};
            let authProfileNeedsUpdate = false;
            let authProfileUpdatePayload: { displayName?: string | null; photoURL?: string | null } = {};

            // Sync display name
            const firestoreDisplayName = userData.displayName || '';
            const authDisplayName = authUserToUpdate.displayName || '';

            if (firestoreDisplayName && firestoreDisplayName !== authDisplayName) {
              authProfileUpdatePayload.displayName = firestoreDisplayName;
              authProfileNeedsUpdate = true;
            } else if (authDisplayName && authDisplayName !== firestoreDisplayName) {
              firestoreUpdates.displayName = authDisplayName;
            }

            // Sync photo URL
            const firestorePhotoURL = userData.photoURL || null;
            const authPhotoURL = authUserToUpdate.photoURL || null;

            if (firestorePhotoURL && firestorePhotoURL !== authPhotoURL) {
              authProfileUpdatePayload.photoURL = firestorePhotoURL;
              authProfileNeedsUpdate = true;
            } else if (authPhotoURL && authPhotoURL !== firestorePhotoURL) {
              firestoreUpdates.photoURL = authPhotoURL;
            }
            
            if (Object.keys(firestoreUpdates).length > 0) {
               firestoreUpdates.updatedAt = serverTimestamp(); // Ensure updatedAt is set for any Firestore update
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
            createdAt: serverTimestamp(), // Corrected usage
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
    // HMR Diagnostic Comment for useEffect - v202408151420
    if (!hasMounted) return;

    setLoadingMessage("Sätter upp autentiseringslyssnare...");
    console.log("AuthProvider: Setting up onAuthStateChanged listener (HMR Test - Main Effect).");
    const unsubscribe = onAuthStateChanged(auth, async (user) => { // Use imported auth instance
      console.log("AuthProvider onAuthStateChanged: User state -", user ? `${user.uid} (${user.displayName || user.email})` : null);
      setCurrentUser(user);
      if (user) {
        await fetchUserData(user);
      } else {
        // Clear user-specific data when logged out
        setSubscription(null);
        setMainBoardId(null);
        setBoardOrder(null);
      }
      setInitialAuthCheckDone(true);
      setLoadingMessage("Autentisering klar.");
    }, (error) => {
        console.error("AuthProvider onAuthStateChanged error:", error);
        setCurrentUser(null); // Ensure currentUser is null on error
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
  }, [hasMounted, fetchUserData]);


  const signUp = async (email: string, password: string, name: string) => {
    setLoadingMessage("Registrerar konto...");
    const userCredential = await createUserWithEmailAndPassword(auth, email, password); // Use imported auth instance
    if (userCredential.user) {
      // Update Firebase Auth profile immediately
      await updateProfile(userCredential.user, { displayName: name });
      // fetchUserData will be called by onAuthStateChanged, which will handle Firestore doc creation
    }
    setLoadingMessage("Konto skapat, loggar in...");
    return userCredential;
  };

  const logIn = async (email: string, password: string) => {
    setLoadingMessage("Loggar in...");
    return signInWithEmailAndPassword(auth, email, password); // Use imported auth instance
  };

  const logOut = async () => {
    setLoadingMessage("Loggar ut...");
    await signOut(auth); // Use imported auth instance
    // onAuthStateChanged will handle setting currentUser to null and clearing user data
    router.push('/logga-in'); // Navigate after sign out
    setLoadingMessage("Utloggad.");
  };

  const sendPasswordReset = async (email: string) => {
    console.log(`AuthContext: Attempting to send password reset for ${email}.`);
    return sendPasswordResetEmail(auth, email); // Use imported auth instance
  };

  const refreshUserData = useCallback(async () => {
    if (auth.currentUser) { // Use imported auth instance
      setLoadingMessage("Uppdaterar användardata...");
      await fetchUserData(auth.currentUser);
      setLoadingMessage("Användardata uppdaterad.");
    } else {
      setLoadingMessage("Ingen användare inloggad för uppdatering.");
      await fetchUserData(null); // This will clear local user data if user is somehow null
    }
  }, [fetchUserData]); // fetchUserData is stable due to useCallback

  // loading should be true until initial auth check is done AND hasMounted is true.
  const loading = !hasMounted || !initialAuthCheckDone;

  // Render null on the server and during initial client mount until `hasMounted` is true.
  // This helps prevent hydration mismatches for the initial loading UI.
  if (!hasMounted) {
    return null;
  }

  // Show loading indicator if authentication is still processing after mount.
  if (loading) {
     return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        {/* Icon removed to simplify initial render after mount, to combat hydration errors */}
        <p className="ml-2">{loadingMessage}</p>
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
