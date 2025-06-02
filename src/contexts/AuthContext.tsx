
"use client";

import type { ReactNode, FC } from 'react';
import React, { createContext, useContext, useEffect, useCallback, useState } from 'react';
// Firebase Auth types - type imports are fine
import { type User } from 'firebase/auth';

// Firebase Auth functions will be dynamically imported
// Define a type for the Firebase Auth module after it's imported
type AuthModuleType = typeof import('firebase/auth');


import { auth as firebaseAppAuthInstance, db } from '@/lib/firebase';
import { doc, getDoc, Timestamp, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
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
  const [currentUser, setCurrentUser] = useState<User | null | undefined>(undefined); // Initialize to undefined to distinguish from null (no user)
  const [firebaseAuth, setFirebaseAuth] = useState<AuthModuleType | null>(null);
  const [authLoadingError, setAuthLoadingError] = useState<string | null>(null);
  
  const [hasMounted, setHasMounted] = useState(false);
  // Start with loading true until auth state is resolved or dynamic import fails
  const [loading, setLoading] = useState(true); 
  // Initialize loadingMessage to a default, stable value
  const [loadingMessage, setLoadingMessage] = useState("Laddar applikation..."); 
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [mainBoardId, setMainBoardId] = useState<string | null>(null);
  const [boardOrder, setBoardOrder] = useState<string[] | null>(null);

  const router = useRouter();

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;

    console.log("AuthProvider Mount Effect: Attempting to dynamically import Firebase Auth functions.");
    // Dynamically import Firebase Auth functions to potentially mitigate HMR issues.
    // This is where the "module factory is not available" error often occurs with HMR.
    import('firebase/auth').then((authModule) => {
      console.log("AuthProvider Mount: Firebase Auth functions dynamically imported successfully.");
      setFirebaseAuth(authModule); // Store the entire module
      setAuthLoadingError(null); // Clear any previous error
    })
    .catch(err => {
      console.error("AuthProvider Mount: Failed to load Firebase Auth module dynamically:", err);
      // Enhanced error logging for HMR issues
      try {
        console.error("Dynamic import error object (stringified):", JSON.stringify(err, Object.getOwnPropertyNames(err)));
      } catch (e) {
        console.error("Could not stringify dynamic import error object.");
      }
      if (err && typeof err === 'object' && 'message' in err) {
        console.error("Dynamic import error message:", (err as Error).message);
      }
      if (err && typeof err === 'object' && 'stack' in err) {
        console.error("Dynamic import error stack:", (err as Error).stack);
      }
      setFirebaseAuth(null);
      setAuthLoadingError("Kritiskt fel: Kunde inte ladda autentiseringstjänsten. Försök ladda om sidan.");
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
            let authProfileUpdatePayload: { displayName?: string | null; photoURL?: string | null } = {};


            // Sync displayName: Auth (source) -> Firestore (target) if Firestore is different or missing
            if (authUserToUpdate.displayName && authUserToUpdate.displayName !== userData.displayName) {
                firestoreUpdates.displayName = authUserToUpdate.displayName;
            // Sync displayName: Firestore (source) -> Auth (target) if Auth is missing and Firestore has it
            } else if (!authUserToUpdate.displayName && userData.displayName) {
                authProfileUpdatePayload.displayName = userData.displayName;
                authProfileNeedsUpdate = true; 
            }
            // Sync photoURL: Auth (source) -> Firestore (target) if Firestore is different or missing
            if (authUserToUpdate.photoURL !== undefined && authUserToUpdate.photoURL !== userData.photoURL) {
                 firestoreUpdates.photoURL = authUserToUpdate.photoURL;
            // Sync photoURL: Firestore (source) -> Auth (target) if Auth is missing and Firestore has it
            } else if (authUserToUpdate.photoURL === undefined && userData.photoURL !== undefined) { // Check undefined specifically
                 authProfileUpdatePayload.photoURL = userData.photoURL;
                 authProfileNeedsUpdate = true;
            }


            if (Object.keys(firestoreUpdates).length > 0) {
              await updateDoc(userDocRef, firestoreUpdates);
            }
            if (authProfileNeedsUpdate && Object.keys(authProfileUpdatePayload).length > 0) {
                await firebaseAuth.updateProfile(authUserToUpdate, authProfileUpdatePayload);
                // Note: Refreshing currentUser from Auth might be needed here if not handled by onAuthStateChanged
            }
          }

        } else {
           // This is a new user, create their Firestore document
           const initialDisplayName = user.displayName || ''; // Use provided name or default to empty
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
      // No user logged in
      setSubscription(null);
      setMainBoardId(null);
      setBoardOrder(null);
    }
  }, [db, firebaseAuth, firebaseAppAuthInstance]); 


  useEffect(() => {
    if (!hasMounted || !firebaseAuth?.onAuthStateChanged) { 
      setLoading(true); 
      return;
    }
    // setLoadingMessage("Laddar autentiseringsstatus..."); // Message is set in another useEffect
    console.log("AuthProvider onAuthStateChanged: Setting up listener with auth instance:", firebaseAppAuthInstance);
    const unsubscribe = firebaseAuth.onAuthStateChanged(firebaseAppAuthInstance, async (user) => {
      console.log("AuthProvider onAuthStateChanged: User state -", user ? user.uid : null, "DisplayName:", user?.displayName);
      setCurrentUser(user); 
      if (user) {
        await fetchUserData(user);
      } else {
        // Clear user-specific data if no user
        setSubscription(null);
        setMainBoardId(null);
        setBoardOrder(null);
      }
      setLoading(false); 
    });

    return unsubscribe;
  }, [fetchUserData, hasMounted, firebaseAuth, firebaseAppAuthInstance]);

  // Effect to update loading message based on current state
   useEffect(() => {
    if (!hasMounted) return; // Only run after mount

    if (authLoadingError) {
      setLoadingMessage(authLoadingError);
    } else if (!firebaseAuth && !authLoadingError) { // firebaseAuth is the dynamically imported module
      setLoadingMessage("Väntar på autentiseringstjänst...");
    } else if (loading && currentUser === undefined && !authLoadingError) { // Still loading, no user determined yet
      setLoadingMessage("Laddar autentiseringsstatus...");
    } else if (loading && currentUser === null && !authLoadingError) { // Still loading, but know there's no user (e.g. after logout)
       setLoadingMessage("Kontrollerar inloggningsstatus...");
    } else if (!loading && !authLoadingError) {
      // If no longer loading and no error, no specific loading message is needed
      // or set a generic one if the loading screen might still show briefly
      setLoadingMessage("Applikationen är redo.");
    } else {
      setLoadingMessage("Laddar applikation..."); // Default fallback
    }
  }, [hasMounted, authLoadingError, firebaseAuth, loading, currentUser]);


  const signUp = async (email: string, password: string, name: string) => {
    if (!firebaseAuth?.createUserWithEmailAndPassword || !firebaseAuth.updateProfile) {
      throw new Error("Firebase Auth functions not initialized for signUp");
    }
    const userCredential = await firebaseAuth.createUserWithEmailAndPassword(firebaseAppAuthInstance, email, password);
    if (userCredential.user) {
      await firebaseAuth.updateProfile(userCredential.user, { displayName: name });
      const updatedUser = { ...userCredential.user, displayName: name } as User;
      setCurrentUser(updatedUser); // Optimistic update of local state
      await fetchUserData(updatedUser); // Ensure Firestore doc is created/updated
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
    // setLoadingMessage("Uppdaterar användardata..."); // Handled by the other useEffect
    setLoading(true);
    if (currentUser) { // Check if currentUser is not null or undefined
      await fetchUserData(currentUser);
    } else {
      // If no currentUser, there's no specific user data to refresh.
      // Call fetchUserData with null to reset related states if necessary.
      await fetchUserData(null);
    }
    setLoading(false);
  }, [currentUser, fetchUserData]);


  if (!hasMounted) {
    // Render nothing on the server and during the very first client render pass
    return null;
  }
  
  // This block executes only on the client, after hasMounted is true
  if (loading || !firebaseAuth || authLoadingError) { 
     return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        {/* No Loader2 icon here for now to simplify and address hydration diff */}
        <p className="ml-2 text-lg">
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
