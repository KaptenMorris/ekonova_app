
"use client";

import type { ReactNode, FC } from 'react';
import React, { createContext, useContext, useEffect, useCallback, useState } from 'react';
import { type Auth, type User } from 'firebase/auth'; // Keep type imports

import { auth as firebaseAppAuthInstance, db } from '@/lib/firebase'; // Renamed to avoid conflict
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
    console.log("AuthProvider Mount: Attempting to dynamically import Firebase Auth functions...");
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
      // If dynamic import fails, the app might be stuck.
      // Consider setting an error state or specific handling.
      // For now, onAuthStateChanged effect will also not run if firebaseAuth is null.
    });
  }, []); // Empty dependency array, runs once on mount

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
  }, [db]); // db instance from lib/firebase should be stable

  useEffect(() => {
    if (!hasMounted || !firebaseAuth) {
      // firebaseAuth being null means dynamic import hasn't completed or failed.
      // Keep loading until firebaseAuth is set and onAuthStateChanged can be properly attached.
      setLoading(true); 
      return;
    }
    console.log("AuthProvider: Setting up onAuthStateChanged listener with imported functions.");
    const unsubscribe = firebaseAuth.onAuthStateChanged(firebaseAppAuthInstance, async (user) => {
      console.log("AuthProvider onAuthStateChanged: User state -", user ? user.uid : null);
      setCurrentUser(user);
      if (user) {
        await fetchUserData(user);
      } else {
        // Clear user-specific data if no user
        setSubscription(null);
        setMainBoardId(null);
        setBoardOrder(null);
      }
      setLoading(false); // Auth state resolved, and associated data (or lack thereof) handled.
    });
    return unsubscribe;
  }, [fetchUserData, hasMounted, firebaseAuth, firebaseAppAuthInstance]);

  const refreshUserData = useCallback(async () => {
    if (currentUser) {
      // setLoading(true); // Consider if this intermediate loading state is disruptive or helpful
      await fetchUserData(currentUser);
      // setLoading(false);
    }
  }, [currentUser, fetchUserData]);

  const signUp = async (email: string, password: string, name: string) => {
    if (!firebaseAuth) throw new Error("Firebase Auth functions not initialized for signUp");
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
      // onAuthStateChanged will handle fetching user data and setting current user.
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
        return firebaseAppAuthInstance.signOut(); // Fallback
      });
    }
    // onAuthStateChanged will handle setCurrentUser(null) and other state cleanup.
    router.push('/logga-in');
  };

  const sendPasswordReset = async (email: string) => {
    if (!firebaseAuth) throw new Error("Firebase Auth functions not initialized for sendPasswordReset");
    return firebaseAuth.sendPasswordResetEmail(firebaseAppAuthInstance, email);
  };

  if (!hasMounted) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (loading) { // This loading now covers initial mount, dynamic import, and auth state resolution.
     return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-2">Laddar autentisering...</p>
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
