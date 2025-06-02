
"use client";

import type { ReactNode, FC } from 'react';
import React, { createContext, useContext, useEffect, useCallback, useState } from 'react';
// Firebase Auth types - type imports are fine
import { type User } from 'firebase/auth';

// Firebase Auth functions will be dynamically imported
// Define a type for the Firebase Auth module after it's imported
type AuthModuleType = typeof import('firebase/auth');


import { auth as firebaseAppAuthInstance, db } from '@/lib/firebase';
import { doc, getDoc, Timestamp, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore'; // Added serverTimestamp
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
  const [firebaseAuth, setFirebaseAuth] = useState<AuthModuleType | null>(null);
  const [authLoadingError, setAuthLoadingError] = useState<string | null>(null);
  
  const [hasMounted, setHasMounted] = useState(false);
  const [loading, setLoading] = useState(true); 
  const [loadingMessage, setLoadingMessage] = useState("Initierar applikation..."); 
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [mainBoardId, setMainBoardId] = useState<string | null>(null);
  const [boardOrder, setBoardOrder] = useState<string[] | null>(null);

  const router = useRouter();

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;

    console.log("AuthProvider Mount: Attempting to dynamically import Firebase Auth functions.");
    // Dynamically import Firebase Auth functions to potentially mitigate HMR issues.
    // This is where the "module factory is not available" error often occurs with HMR.
    import('firebase/auth')
      .then((authModule) => {
        console.log("AuthProvider Mount: Firebase Auth functions dynamically imported successfully.");
        setFirebaseAuth(authModule); // Store the entire module
        setAuthLoadingError(null); // Clear any previous error
      })
      .catch(err => {
        console.error("AuthProvider Mount: Failed to load Firebase Auth module dynamically:", err);
        // Enhanced error logging for HMR issues
        console.error("Dynamic import error object:", JSON.stringify(err, Object.getOwnPropertyNames(err)));
        if (err && typeof err === 'object' && 'message' in err) {
          console.error("Dynamic import error message:", (err as Error).message);
        }
        if (err && typeof err === 'object' && 'stack' in err) {
          console.error("Dynamic import error stack:", (err as Error).stack);
        }
        setFirebaseAuth(null);
        setAuthLoadingError("Kunde inte ladda autentiseringstjänsten dynamiskt. Försök ladda om sidan.");
        setLoading(false); // Critical error with dynamic import, stop loading.
      });
  }, [hasMounted]);


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
          
          const authUserToUpdate = firebaseAppAuthInstance.currentUser; 
          if (authUserToUpdate && firebaseAuth?.updateProfile) { 
            let firestoreUpdates: any = {};
            let authProfileNeedsUpdate = false;

            // Sync displayName: Auth (source) to Firestore (target) if different or Firestore is missing it
            if (authUserToUpdate.displayName && authUserToUpdate.displayName !== userData.displayName) {
                firestoreUpdates.displayName = authUserToUpdate.displayName;
                console.log(`AuthProvider fetchUserData: Syncing displayName. Auth: "${authUserToUpdate.displayName}", Firestore: "${userData.displayName}". Updating Firestore.`);
            } 
            // Sync displayName: Firestore (source) to Auth (target) if Auth is missing it and Firestore has it
            else if (!authUserToUpdate.displayName && userData.displayName) {
                console.log(`AuthProvider fetchUserData: Auth has no displayName, Firestore does ("${userData.displayName}"). Attempting to update Auth profile.`);
                await firebaseAuth.updateProfile(authUserToUpdate, { displayName: userData.displayName });
                authProfileNeedsUpdate = true; 
            }

            if (Object.keys(firestoreUpdates).length > 0) {
              await updateDoc(userDocRef, firestoreUpdates);
            }
            // if (authProfileNeedsUpdate) await refreshUserData(); // Avoid re-fetching if already in a fetch, could cause loop.
          }

        } else {
           console.log(`AuthProvider fetchUserData: Creating new user document for UID: ${user.uid}`);
           let finalDisplayName = user.displayName || ''; 

           await setDoc(userDocRef, {
             uid: user.uid,
             email: user.email,
             displayName: finalDisplayName, 
             createdAt: serverTimestamp(), // Use serverTimestamp
             subscriptionStatus: 'inactive',
             subscriptionExpiresAt: null,
             mainBoardId: null,
             boardOrder: [],
           });
           setSubscription({ status: 'inactive', expiresAt: null });
           setMainBoardId(null);
           setBoardOrder(null);
           console.log(`AuthProvider fetchUserData: New user document created for ${user.uid} with displayName: "${finalDisplayName}"`);
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
  }, [db, firebaseAuth, firebaseAppAuthInstance]); // Added firebaseAppAuthInstance


  useEffect(() => {
    if (!hasMounted || !firebaseAuth?.onAuthStateChanged) { 
      // If firebaseAuth (the module) is not loaded yet, don't try to use its methods.
      // Also, ensure onAuthStateChanged itself is available on the module.
      setLoading(true); // Keep loading if firebaseAuth or its methods are not ready.
      return;
    }
    setLoadingMessage("Laddar autentiseringsstatus...");
    console.log("AuthProvider onAuthStateChanged: Setting up listener with auth instance:", firebaseAppAuthInstance);
    const unsubscribe = firebaseAuth.onAuthStateChanged(firebaseAppAuthInstance, async (user) => {
      console.log("AuthProvider onAuthStateChanged: User state -", user ? user.uid : null, "DisplayName:", user?.displayName);
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
  }, [fetchUserData, hasMounted, firebaseAuth, firebaseAppAuthInstance]); // Added firebaseAppAuthInstance

  // Effect to update loading message based on current state
   useEffect(() => {
    if (!hasMounted) {
        setLoadingMessage("Initierar applikation...");
    } else if (authLoadingError) {
      setLoadingMessage(authLoadingError);
    } else if (!firebaseAuth) {
      setLoadingMessage("Väntar på autentiseringstjänst...");
    } else if (loading && currentUser === undefined) { // currentUser might be null, check for undefined if it's the initial loading state
      setLoadingMessage("Laddar autentiseringsstatus...");
    } else if (loading && currentUser === null && firebaseAuth?.onAuthStateChanged) { // After auth service loaded, but no user yet
       setLoadingMessage("Kontrollerar inloggningsstatus...");
    }
  }, [hasMounted, firebaseAuth, authLoadingError, loading, currentUser]);


  const signUp = async (email: string, password: string, name: string) => {
    if (!firebaseAuth?.createUserWithEmailAndPassword || !firebaseAuth.updateProfile) {
      throw new Error("Firebase Auth functions not initialized for signUp");
    }
    const userCredential = await firebaseAuth.createUserWithEmailAndPassword(firebaseAppAuthInstance, email, password);
    if (userCredential.user) {
      await firebaseAuth.updateProfile(userCredential.user, { displayName: name });
      // After updating profile, re-fetch or merge local state
      // For simplicity, onAuthStateChanged will handle fetching Firestore data
      // We can update local currentUser immediately for responsiveness
      const updatedUser = { ...userCredential.user, displayName: name } as User;
      setCurrentUser(updatedUser);
      // Manually trigger Firestore document creation as onAuthStateChanged might be too slow or miss this immediate update
      await fetchUserData(updatedUser); 
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
        // Attempt fallback if dynamic import version fails for some reason
        return firebaseAppAuthInstance.signOut(); 
      });
    }
    setCurrentUser(null); // Clear user state immediately
    setSubscription(null);
    setMainBoardId(null);
    setBoardOrder(null);
    // onAuthStateChanged will also trigger, but this ensures quicker UI update
    router.push('/logga-in'); // Redirect after logout
  };

  const sendPasswordReset = async (email: string) => {
    if (!firebaseAuth?.sendPasswordResetEmail) throw new Error("Firebase Auth functions not initialized for sendPasswordReset");
    return firebaseAuth.sendPasswordResetEmail(firebaseAppAuthInstance, email);
  };

  const refreshUserData = useCallback(async () => {
    setLoadingMessage("Uppdaterar användardata...");
    setLoading(true);
    if (currentUser) {
      await fetchUserData(currentUser);
    }
    setLoading(false);
  }, [currentUser, fetchUserData]);


  if (!hasMounted) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        {/* Loader2 icon removed from this initial static block */}
        <p className="ml-2">Initierar applikation...</p>
      </div>
    );
  }
  
  if (loading || !firebaseAuth || authLoadingError) { 
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
