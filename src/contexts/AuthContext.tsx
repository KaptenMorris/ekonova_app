
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
  
  const [hasMounted, setHasMounted] = useState(false);
  const [loading, setLoading] = useState(true); 
  const [loadingMessage, setLoadingMessage] = useState("Initierar applikation..."); 


  const router = useRouter();

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;

    console.log("AuthProvider Mount: Attempting to dynamically import Firebase Auth functions.");
    // Dynamically import Firebase Auth functions to potentially mitigate HMR issues.
    // This is where the "module factory is not available" error often occurs with HMR.
    import('firebase/auth').then((authModule) => {
      console.log("AuthProvider Mount: Firebase Auth functions dynamically imported successfully.");
      const {
        createUserWithEmailAndPassword,
        signInWithEmailAndPassword,
        signOut,
        onAuthStateChanged,
        sendPasswordResetEmail,
        updateProfile,
      } = authModule; // Destructuring here

      setFirebaseAuth({ // Setting state with destructured functions
        createUserWithEmailAndPassword,
        signInWithEmailAndPassword,
        signOut,
        onAuthStateChanged,
        sendPasswordResetEmail,
        updateProfile,
      });
      setAuthLoadingError(null); // Clear any previous error
    }).catch(err => {
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

  // Effect to update loading message based on current state
   useEffect(() => {
    if (!hasMounted) {
        setLoadingMessage("Initierar applikation...");
        return;
    }
    if (authLoadingError) {
      setLoadingMessage(authLoadingError);
    } else if (!firebaseAuth) {
      setLoadingMessage("Väntar på autentiseringstjänst...");
    } else if (loading && currentUser === undefined) { // currentUser can be null, but undefined means onAuthStateChanged hasn't run yet
      setLoadingMessage("Laddar autentiseringsstatus...");
    } else {
      // If firebaseAuth is loaded and general loading is false (meaning auth state is resolved)
      // or if currentUser is determined (even if null), no specific message needed here for the loading screen.
      // The loading screen itself won't be shown if `loading` is false.
    }
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
          
          const authUserToUpdate = firebaseAppAuthInstance.currentUser; // Get fresh instance
          if (authUserToUpdate) {
            if (authUserToUpdate.displayName && (!userData.displayName || userData.displayName !== authUserToUpdate.displayName)) {
              console.log(`AuthProvider fetchUserData: Syncing displayName. Auth: "${authUserToUpdate.displayName}", Firestore: "${userData.displayName}". Updating Firestore.`);
              await updateDoc(userDocRef, { displayName: authUserToUpdate.displayName });
            } else if (!authUserToUpdate.displayName && userData.displayName && firebaseAuth?.updateProfile) {
              console.log(`AuthProvider fetchUserData: Auth has no displayName, Firestore does ("${userData.displayName}"). Attempting to update Auth profile.`);
              await firebaseAuth.updateProfile(authUserToUpdate, { displayName: userData.displayName });
            }
          }

        } else {
           console.log(`AuthProvider fetchUserData: Creating new user document for UID: ${user.uid}`);
           let finalDisplayName = user.displayName || ''; 

           await setDoc(userDocRef, {
             uid: user.uid,
             email: user.email,
             displayName: finalDisplayName, 
             createdAt: Timestamp.now(),
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
  }, [db, firebaseAuth, firebaseAppAuthInstance]); 


  useEffect(() => {
    if (!hasMounted || !firebaseAuth) { 
        // If firebaseAuth is not yet loaded (dynamic import pending or failed), or not mounted,
        // don't set up the listener yet. setLoading(true) should be the default.
        // setLoading(false) will be called once the listener fires or if dynamic import fails.
      return;
    }

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
  }, [fetchUserData, hasMounted, firebaseAuth, firebaseAppAuthInstance]);

  const signUp = async (email: string, password: string, name: string) => {
    if (!firebaseAuth?.createUserWithEmailAndPassword || !firebaseAuth.updateProfile) {
      throw new Error("Firebase Auth functions not initialized for signUp");
    }
    const userCredential = await firebaseAuth.createUserWithEmailAndPassword(firebaseAppAuthInstance, email, password);
    if (userCredential.user) {
      await firebaseAuth.updateProfile(userCredential.user, { displayName: name });
      const userWithProfile = { 
        ...userCredential.user, 
        displayName: name 
      } as User; 
      
      setCurrentUser(userWithProfile); 
      await fetchUserData(userWithProfile); 
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
      await fetchUserData(currentUser);
    }
  }, [currentUser, fetchUserData]);


  // Render Logic:
  if (!hasMounted) {
    return null; 
  }

  if (loading || !firebaseAuth) { // Added !firebaseAuth check to ensure spinner shows until dynamic import resolves
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

