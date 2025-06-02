
"use client";

import type { ReactNode, FC } from 'react';
import React, { createContext, useContext, useEffect, useCallback, useState } from 'react';
import { type Auth, type User } from 'firebase/auth'; // Keep type imports

import { auth as firebaseAppAuthInstance, db } from '@/lib/firebase'; // Renamed to avoid conflict with local 'auth' state
import { doc, getDoc, Timestamp, updateDoc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// Define the shape of the dynamically imported Firebase Auth functions
interface FirebaseAuthFunctions {
  createUserWithEmailAndPassword: typeof import('firebase/auth').createUserWithEmailAndPassword;
  signInWithEmailAndPassword: typeof import('firebase/auth').signInWithEmailAndPassword;
  signOut: typeof import('firebase/auth').signOut;
  onAuthStateChanged: typeof import('firebase/auth').onAuthStateChanged;
  sendPasswordResetEmail: typeof import('firebase/auth').sendPasswordResetEmail;
}

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
  const router = useRouter();

  useEffect(() => {
    setHasMounted(true);
    // Dynamically import Firebase Auth functions to potentially mitigate HMR issues.
    import('firebase/auth').then((authModule) => {
      setFirebaseAuth({
        createUserWithEmailAndPassword: authModule.createUserWithEmailAndPassword,
        signInWithEmailAndPassword: authModule.signInWithEmailAndPassword,
        signOut: authModule.signOut,
        onAuthStateChanged: authModule.onAuthStateChanged,
        sendPasswordResetEmail: authModule.sendPasswordResetEmail,
      });
    }).catch(err => {
      console.error("Failed to load Firebase Auth module dynamically:", err);
      // Handle the error appropriately, e.g., show a message to the user
      setLoading(false); // Stop loading if module fails to load
    });
  }, []);

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
          await setDoc(userDocRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || '',
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
    if (!hasMounted || !firebaseAuth) {
      // Wait for mount and for Firebase Auth functions to be loaded
      setLoading(true); // Keep loading until firebaseAuth is ready
      return;
    }
    console.log("AuthProvider: Setting up onAuthStateChanged listener.");
    const unsubscribe = firebaseAuth.onAuthStateChanged(firebaseAppAuthInstance, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchUserData(user);
      } else {
        setSubscription(null);
        setMainBoardId(null);
        setBoardOrder(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [fetchUserData, hasMounted, firebaseAuth, firebaseAppAuthInstance]);

  const refreshUserData = useCallback(async () => {
    if (currentUser) {
      setLoading(true);
      await fetchUserData(currentUser);
      setLoading(false);
    }
  }, [currentUser, fetchUserData]);

  const signUp = async (email: string, password: string, name: string) => {
    if (!firebaseAuth) throw new Error("Firebase Auth not initialized");
    const userCredential = await firebaseAuth.createUserWithEmailAndPassword(firebaseAppAuthInstance, email, password);
    if (userCredential.user) {
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      await setDoc(userDocRef, {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: name,
        createdAt: Timestamp.now(),
        subscriptionStatus: 'inactive',
        subscriptionExpiresAt: null,
        mainBoardId: null,
        boardOrder: [],
      });
      await refreshUserData(); // Use the AuthContext's refreshUserData
    }
    return userCredential;
  };

  const logIn = (email: string, password: string) => {
    if (!firebaseAuth) throw new Error("Firebase Auth not initialized");
    return firebaseAuth.signInWithEmailAndPassword(firebaseAppAuthInstance, email, password);
  };

  const logOut = async () => {
    if (!firebaseAuth) {
      console.error("Firebase Auth not initialized for logout");
      // Attempt to sign out with the main instance as a fallback, though it might not be ideal
      await firebaseAppAuthInstance.signOut().catch(e => console.error("Fallback signout error:", e));
      setCurrentUser(null);
      router.push('/logga-in');
      return;
    }
    try {
      await firebaseAuth.signOut(firebaseAppAuthInstance);
      setCurrentUser(null);
      router.push('/logga-in');
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const sendPasswordReset = async (email: string) => {
    if (!firebaseAuth) throw new Error("Firebase Auth not initialized");
    return firebaseAuth.sendPasswordResetEmail(firebaseAppAuthInstance, email);
  };

  if (!hasMounted || !firebaseAuth) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
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
