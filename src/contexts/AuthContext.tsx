
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
  updateProfile: typeof import('firebase/auth').updateProfile; // Added updateProfile
}

import { auth as firebaseAppAuthInstance, db } from '@/lib/firebase'; // Renamed imported auth to firebaseAppAuthInstance
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
  const [loading, setLoading] = useState(true); // Master loading state for the provider
  const [hasMounted, setHasMounted] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Initierar applikation..."); // Default initial message

  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [mainBoardId, setMainBoardId] = useState<string | null>(null);
  const [boardOrder, setBoardOrder] = useState<string[] | null>(null);

  const router = useRouter();

  useEffect(() => {
    setHasMounted(true);
    console.log("AuthProvider Mount: Attempting to dynamically import Firebase Auth functions.");
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
      setAuthLoadingError(null);
    }).catch(err => {
      console.error("AuthProvider Mount: Failed to load Firebase Auth module dynamically:", err);
      setFirebaseAuth(null);
      setAuthLoadingError("Kunde inte ladda autentiseringstjänsten.");
    });
  }, []);

  // Effect to update loading message based on current state, only runs client-side
   useEffect(() => {
    if (!hasMounted) return; // Only run client-side

    if (authLoadingError) {
      setLoadingMessage(authLoadingError);
      setLoading(false); // Error means we stop general loading
    } else if (!firebaseAuth && !authLoadingError) {
      setLoadingMessage("Väntar på autentiseringstjänst...");
      setLoading(true); // Still loading if auth service isn't ready
    } else if (firebaseAuth && loading && currentUser === undefined) { // Refined condition
      setLoadingMessage("Laddar autentiseringsstatus...");
      setLoading(true); // Still loading as onAuthStateChanged hasn't fired yet or user is undefined
    }
    // setLoading(false) is primarily handled by onAuthStateChanged or if firebaseAuth loading fails
  }, [hasMounted, firebaseAuth, authLoadingError, loading, currentUser]);


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
           console.log(`AuthProvider: Creating new user document for UID: ${user.uid}`);
           const currentAuthUser = firebaseAppAuthInstance.currentUser;
           let authDisplayName = user.displayName;

           if (currentAuthUser && !currentAuthUser.displayName && user.displayName && firebaseAuth?.updateProfile) {
             try {
               await firebaseAuth.updateProfile(currentAuthUser, { displayName: user.displayName });
               authDisplayName = user.displayName;
               console.log(`AuthProvider: Updated Firebase Auth profile displayName for ${user.uid} to ${authDisplayName}`);
             } catch (profileError) {
               console.warn("Could not update Firebase Auth profile displayName during initial doc creation:", profileError);
             }
           } else if (currentAuthUser?.displayName) {
            authDisplayName = currentAuthUser.displayName;
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
           console.log(`AuthProvider: New user document created for ${user.uid}`);
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
  }, [db, firebaseAuth, firebaseAppAuthInstance]);

  useEffect(() => {
    if (!hasMounted || !firebaseAuth) {
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
      setLoading(false); // Auth state resolved, main loading finished
    });

    return unsubscribe;
  }, [fetchUserData, hasMounted, firebaseAuth, firebaseAppAuthInstance, authLoadingError]);

  const signUp = async (email: string, password: string, name: string) => {
    if (!firebaseAuth?.createUserWithEmailAndPassword || !firebaseAuth.updateProfile) {
      throw new Error("Firebase Auth functions not initialized for signUp");
    }
    const userCredential = await firebaseAuth.createUserWithEmailAndPassword(firebaseAppAuthInstance, email, password);
    if (userCredential.user) {
      await firebaseAuth.updateProfile(userCredential.user, { displayName: name });
      const userWithProfile = { ...userCredential.user, displayName: name };
      setCurrentUser(userWithProfile as User);
      await fetchUserData(userWithProfile as User);
    }
    return userCredential;
  };

  const logIn = (email: string, password: string) => {
    if (!firebaseAuth?.signInWithEmailAndPassword) throw new Error("Firebase Auth functions not initialized for logIn");
    return firebaseAuth.signInWithEmailAndPassword(firebaseAppAuthInstance, email, password);
  };

  const logOut = async () => {
    if (!firebaseAuth?.signOut) {
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
    if (!firebaseAuth?.sendPasswordResetEmail) throw new Error("Firebase Auth functions not initialized for sendPasswordReset");
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
  // Case 1: Initial render (server or very first client render before `hasMounted` is true).
  // Render null to avoid hydration mismatches. The parent layout will handle the basic page structure.
  if (!hasMounted) {
    return null;
  }

  // Case 2: Client-side, component has mounted.
  // Now check the main loading state.
  if (loading) {
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
