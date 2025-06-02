
"use client";

// Firebase Auth import changed to come from @/lib/firebase
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
  const [currentUser, setCurrentUser] = useState<User | null | undefined>(undefined);
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

          const authUserToUpdate = auth.currentUser; // Use the imported auth instance
          if (authUserToUpdate) {
            let firestoreUpdates: any = {};
            let authProfileNeedsUpdate = false;
            let authProfileUpdatePayload: { displayName?: string | null; photoURL?: string | null } = {};

            if (authUserToUpdate.displayName && authUserToUpdate.displayName !== (userData.displayName || '')) {
              firestoreUpdates.displayName = authUserToUpdate.displayName;
            } else if (userData.displayName && userData.displayName !== (authUserToUpdate.displayName || '')) {
              authProfileUpdatePayload.displayName = userData.displayName;
              authProfileNeedsUpdate = true;
            }

            if (authUserToUpdate.photoURL && authUserToUpdate.photoURL !== (userData.photoURL || null)) {
              firestoreUpdates.photoURL = authUserToUpdate.photoURL;
            } else if (userData.photoURL && userData.photoURL !== (authUserToUpdate.photoURL || null)) {
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
    if (!hasMounted) return;

    setLoadingMessage("Sätter upp autentiseringslyssnare...");
    console.log("AuthProvider: Setting up onAuthStateChanged listener using re-exported functions.");
    const unsubscribe = onAuthStateChanged(auth, async (user) => { // Use imported auth instance
      console.log("AuthProvider onAuthStateChanged (re-exported): User state -", user ? `${user.uid} (${user.displayName || user.email})` : null);
      setCurrentUser(user);
      if (user) {
        await fetchUserData(user);
      } else {
        setSubscription(null);
        setMainBoardId(null);
        setBoardOrder(null);
      }
      setInitialAuthCheckDone(true);
      setLoadingMessage("Autentisering klar.");
    }, (error) => {
        console.error("AuthProvider onAuthStateChanged error (re-exported):", error);
        setCurrentUser(null);
        setSubscription(null);
        setMainBoardId(null);
        setBoardOrder(null);
        setInitialAuthCheckDone(true);
        setLoadingMessage("Autentiseringsfel.");
    });

    return () => {
      console.log("AuthProvider: Cleaning up onAuthStateChanged listener (re-exported).");
      unsubscribe();
    };
  }, [hasMounted, fetchUserData]);


  const signUp = async (email: string, password: string, name: string) => {
    setLoadingMessage("Registrerar konto...");
    const userCredential = await createUserWithEmailAndPassword(auth, email, password); // Use imported auth instance
    if (userCredential.user) {
      await updateProfile(userCredential.user, { displayName: name });
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
    router.push('/logga-in');
    setLoadingMessage("Utloggad.");
  };

  const sendPasswordReset = async (email: string) => {
    console.log(`AuthContext: Attempting to send password reset for ${email} using re-exported function.`);
    return sendPasswordResetEmail(auth, email); // Use imported auth instance
  };

  const refreshUserData = useCallback(async () => {
    if (auth.currentUser) { // Use imported auth instance
      setLoadingMessage("Uppdaterar användardata...");
      await fetchUserData(auth.currentUser);
      setLoadingMessage("Användardata uppdaterad.");
    } else {
      setLoadingMessage("Ingen användare inloggad för uppdatering.");
      await fetchUserData(null);
    }
  }, [fetchUserData]);

  const loading = !hasMounted || !initialAuthCheckDone;

  if (!hasMounted) {
    return null;
  }

  if (loading) {
     return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
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
