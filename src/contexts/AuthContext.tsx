
"use client";

// Firebase Auth import moved to the top
import { type User, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, updateProfile } from 'firebase/auth';
import type { ReactNode, FC } from 'react';
import React, { createContext, useContext, useEffect, useCallback, useState } from 'react';
import { auth, db } from '@/lib/firebase'; // auth is the initialized Auth instance
import { doc, getDoc, Timestamp, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
// Loader2 icon removed from this file as it was causing hydration issues in loading state
// import { Loader2 } from 'lucide-react'; 

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
  const [currentUser, setCurrentUser] = useState<User | null | undefined>(undefined); // undefined initially to distinguish from null (no user)
  const [hasMounted, setHasMounted] = useState(false);
  const [initialAuthCheckDone, setInitialAuthCheckDone] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Laddar applikation..."); // Simplified initial message

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

          // Sync Auth profile with Firestore if necessary
          const authUserToUpdate = auth.currentUser;
          if (authUserToUpdate) {
            let firestoreUpdates: any = {};
            let authProfileNeedsUpdate = false;
            let authProfileUpdatePayload: { displayName?: string | null; photoURL?: string | null } = {};

            // Scenario 1: Auth has displayName, Firestore doesn't or differs -> Update Firestore
            if (authUserToUpdate.displayName && authUserToUpdate.displayName !== (userData.displayName || '')) {
              firestoreUpdates.displayName = authUserToUpdate.displayName;
            }
            // Scenario 2: Firestore has displayName, Auth doesn't or differs -> Update Auth
            else if (userData.displayName && userData.displayName !== (authUserToUpdate.displayName || '')) {
              authProfileUpdatePayload.displayName = userData.displayName;
              authProfileNeedsUpdate = true;
            }

            // Scenario 1: Auth has photoURL, Firestore doesn't or differs -> Update Firestore
            if (authUserToUpdate.photoURL && authUserToUpdate.photoURL !== (userData.photoURL || null)) {
              firestoreUpdates.photoURL = authUserToUpdate.photoURL;
            }
            // Scenario 2: Firestore has photoURL, Auth doesn't or differs -> Update Auth
            else if (userData.photoURL && userData.photoURL !== (authUserToUpdate.photoURL || null)) {
              authProfileUpdatePayload.photoURL = userData.photoURL;
              authProfileNeedsUpdate = true;
            }
            
            if (Object.keys(firestoreUpdates).length > 0) {
              await updateDoc(userDocRef, firestoreUpdates);
            }
            if (authProfileNeedsUpdate && Object.keys(authProfileUpdatePayload).length > 0) {
              await updateProfile(authUserToUpdate, authProfileUpdatePayload);
            }
          }
        } else {
          // User exists in Auth but not Firestore, create Firestore document
          setLoadingMessage("Skapar användarprofil...");
          const initialDisplayName = user.displayName || ''; // Use name from Auth if available
          await setDoc(userDocRef, {
            uid: user.uid,
            email: user.email,
            displayName: initialDisplayName,
            photoURL: user.photoURL || null,
            createdAt: serverTimestamp(), // Use serverTimestamp
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
      // No user, clear all user-specific data
      setSubscription(null);
      setMainBoardId(null);
      setBoardOrder(null);
    }
  }, []);


  useEffect(() => {
    if (!hasMounted) return; // Ensure this runs only on client and after initial mount

    setLoadingMessage("Sätter upp autentiseringslyssnare...");
    console.log("AuthProvider: Setting up onAuthStateChanged listener with static imports.");
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("AuthProvider onAuthStateChanged (static): User state -", user ? `${user.uid} (${user.displayName || user.email})` : null);
      setCurrentUser(user);
      if (user) {
        await fetchUserData(user);
      } else {
        // Clear user-specific data if no user is logged in
        setSubscription(null);
        setMainBoardId(null);
        setBoardOrder(null);
      }
      setInitialAuthCheckDone(true);
      setLoadingMessage("Autentisering klar.");
    }, (error) => {
        console.error("AuthProvider onAuthStateChanged error (static):", error);
        setCurrentUser(null); // Ensure user is cleared on auth error
        setSubscription(null);
        setMainBoardId(null);
        setBoardOrder(null);
        setInitialAuthCheckDone(true);
        setLoadingMessage("Autentiseringsfel.");
    });

    return () => {
      console.log("AuthProvider: Cleaning up onAuthStateChanged listener (static).");
      unsubscribe();
    };
  }, [hasMounted, fetchUserData]); // Added fetchUserData to dependency array


  const signUp = async (email: string, password: string, name: string) => {
    setLoadingMessage("Registrerar konto...");
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (userCredential.user) {
      // Update Firebase Auth profile immediately
      await updateProfile(userCredential.user, { displayName: name });
      // Firestore document creation will be handled by fetchUserData triggered by onAuthStateChanged
      // This ensures displayName from Auth is available when creating the Firestore doc
    }
    setLoadingMessage("Konto skapat, loggar in...");
    return userCredential;
  };

  const logIn = async (email: string, password: string) => {
    setLoadingMessage("Loggar in...");
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logOut = async () => {
    setLoadingMessage("Loggar ut...");
    await signOut(auth);
    // State updates (currentUser, subscription etc.) will be handled by onAuthStateChanged
    router.push('/logga-in');
    setLoadingMessage("Utloggad.");
  };

  const sendPasswordReset = async (email: string) => {
    console.log(`AuthContext: Attempting to send password reset for ${email} using static import.`);
    return sendPasswordResetEmail(auth, email);
  };

  const refreshUserData = useCallback(async () => {
    if (auth.currentUser) {
      setLoadingMessage("Uppdaterar användardata...");
      await fetchUserData(auth.currentUser);
      setLoadingMessage("Användardata uppdaterad.");
    } else {
      setLoadingMessage("Ingen användare inloggad för uppdatering.");
      await fetchUserData(null); // Ensure local state is cleared if no user
    }
  }, [fetchUserData]);

  // Overall loading state for the provider
  const loading = !hasMounted || !initialAuthCheckDone;

  if (!hasMounted) {
    // On the server, or first client render pass before useEffect runs, render nothing or a minimal placeholder.
    // This avoids hydration mismatches for client-specific loading states.
    return null;
  }

  // Overall loading state for the provider, shown after mount but before initial auth check is done.
  if (loading) {
     return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        {/* Loader2 icon removed from this initial static block to ensure it doesn't cause hydration error based on previous diffs */}
        <p className="ml-2">{loadingMessage}</p>
      </div>
    );
  }

  const value = {
    currentUser,
    loading, // This refers to the overall provider loading state
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
