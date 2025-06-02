
"use client";

import type { ReactNode, FC } from 'react';
import React, { createContext, useContext, useEffect, useCallback, useState } from 'react';
// Firebase Auth types - type imports are fine
import { type User } from 'firebase/auth';

// Firebase Auth functions will be dynamically imported
interface FirebaseAuthFunctions {
  createUserWithEmailAndPassword: typeof import('firebase/auth').createUserWithEmailAndPassword;
  signInWithEmailAndPassword: typeof import('firebase/auth').signInWithEmailAndPassword;
  signOut: typeof import('firebase/auth').signOut;
  onAuthStateChanged: typeof import('firebase/auth').onAuthStateChanged;
  sendPasswordResetEmail: typeof import('firebase/auth').sendPasswordResetEmail;
  updateProfile: typeof import('firebase/auth').updateProfile;
}

import { auth as firebaseAppAuthInstance, db } from '@/lib/firebase';
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
  const [loading, setLoading] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Initierar applikation...");

  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [mainBoardId, setMainBoardId] = useState<string | null>(null);
  const [boardOrder, setBoardOrder] = useState<string[] | null>(null);

  const router = useRouter();

  useEffect(() => {
    setHasMounted(true);
    console.log("AuthProvider Mount: Attempting to dynamically import Firebase Auth functions.");
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
      setAuthLoadingError(null);
    }).catch(err => {
      console.error("AuthProvider Mount: Failed to load Firebase Auth module dynamically:", err);
      setFirebaseAuth(null);
      setAuthLoadingError("Kunde inte ladda autentiseringstjänsten.");
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (hasMounted && loading) {
      if (authLoadingError) {
        setLoadingMessage(authLoadingError);
      } else if (firebaseAuth) {
        setLoadingMessage("Laddar autentisering...");
      } else {
        setLoadingMessage("Väntar på autentiseringstjänst...");
      }
    }
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
          if (firebaseAuth) {
            const currentAuthUser = firebaseAppAuthInstance.currentUser;
            let authDisplayName = user.displayName;
            if (currentAuthUser && !currentAuthUser.displayName && user.displayName) {
              try {
                await firebaseAuth.updateProfile(currentAuthUser, { displayName: user.displayName });
                authDisplayName = user.displayName;
              } catch (profileError) {
                console.warn("Could not update Firebase Auth profile displayName during initial doc creation:", profileError);
              }
            }
            await setDoc(userDocRef, {
              uid: user.uid,
              email: user.email,
              displayName: authDisplayName || '',
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
            await setDoc(userDocRef, {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || '',
              createdAt: Timestamp.now(),
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
  }, [db, firebaseAuth, firebaseAppAuthInstance]);

  useEffect(() => {
    if (!hasMounted || !firebaseAuth) {
      console.log("AuthProvider onAuthStateChanged: Waiting for mount or Firebase Auth functions. hasMounted:", hasMounted, "firebaseAuth loaded:", !!firebaseAuth);
      if (hasMounted && authLoadingError) {
        setLoading(false);
      }
      return;
    }
    console.log("AuthProvider onAuthStateChanged: Setting up listener with auth instance:", firebaseAppAuthInstance);
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
      setLoading(false);
    });
    return unsubscribe;
  }, [fetchUserData, hasMounted, firebaseAuth, firebaseAppAuthInstance, authLoadingError]);

  const signUp = async (email: string, password: string, name: string) => {
    if (!firebaseAuth) throw new Error("Firebase Auth functions not initialized for signUp");
    const userCredential = await firebaseAuth.createUserWithEmailAndPassword(firebaseAppAuthInstance, email, password);
    if (userCredential.user) {
      await firebaseAuth.updateProfile(userCredential.user, { displayName: name });
      const userWithProfile = { ...userCredential.user, displayName: name };
      await fetchUserData(userWithProfile as User);
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

  const refreshUserData = useCallback(async () => {
    if (currentUser) {
      setLoading(true);
      await fetchUserData(currentUser);
      setLoading(false);
    }
  }, [currentUser, fetchUserData]);

  // Render Logic:

  // Case 1: Server-side rendering OR very first client render before `hasMounted` effect runs.
  // This block ensures the initial HTML is consistent for hydration.
  // The Loader2 icon is removed here to simplify the initial static render,
  // as SVG rendering (especially with animations) can sometimes contribute to hydration mismatches.
  if (!hasMounted) {
     return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        {/* Loader2 icon removed from this initial static block */}
        <p className="ml-2">Initierar applikation...</p>
      </div>
    );
  }

  // Case 2: Client-side, component has mounted, but still loading
  // (either waiting for dynamic import of firebaseAuth, or waiting for onAuthStateChanged).
  // Now we can safely render the Loader2 icon.
  if (hasMounted && loading) {
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
