
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
  // Master loading state, true until Firebase auth functions are loaded AND onAuthStateChanged has fired at least once.
  const [loading, setLoading] = useState(true); 
  const [loadingMessage, setLoadingMessage] = useState("Initierar applikation..."); 


  const router = useRouter();

  useEffect(() => {
    setHasMounted(true);
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
      } = authModule;

      setFirebaseAuth({
        createUserWithEmailAndPassword,
        signInWithEmailAndPassword,
        signOut,
        onAuthStateChanged,
        sendPasswordResetEmail,
        updateProfile,
      });
      setAuthLoadingError(null);
    }).catch(err => {
      console.error("AuthProvider Mount: Failed to load Firebase Auth module dynamically:", err);
      setFirebaseAuth(null);
      setAuthLoadingError("Kunde inte ladda autentiseringstjänsten. Försök ladda om sidan.");
      setLoading(false); // Critical error, stop loading.
    });
  }, []);

  // Effect to update loading message based on current state, only runs client-side
   useEffect(() => {
    if (!hasMounted) return;

    if (authLoadingError) {
      setLoadingMessage(authLoadingError);
      // setLoading(false) is handled in the dynamic import's catch block for this case
    } else if (!firebaseAuth) {
      setLoadingMessage("Väntar på autentiseringstjänst...");
      setLoading(true); 
    } else if (firebaseAuth && loading && currentUser === undefined ) { 
      setLoadingMessage("Laddar autentiseringsstatus...");
      setLoading(true);
    } else if (firebaseAuth && !loading) {
      // If firebaseAuth is loaded and general loading is false (meaning auth state is resolved)
      // we don't need a specific message here, the content will render.
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
          // Sync Firebase Auth displayName with Firestore if Firestore has one and Auth doesn't, or if they differ
          // This primarily handles cases where displayName was set during signUp but might not have propagated to Auth state yet
          // or if it was updated directly in Auth but not Firestore.
          if (user.displayName && (!userData.displayName || userData.displayName !== user.displayName)) {
             console.log(`AuthProvider fetchUserData: Syncing displayName. Auth: "${user.displayName}", Firestore: "${userData.displayName}". Updating Firestore.`);
            await updateDoc(userDocRef, { displayName: user.displayName });
          } else if (!user.displayName && userData.displayName && firebaseAuth?.updateProfile) {
            // If Auth has no displayName but Firestore does, update Auth.
            // This situation is less common if signUp correctly sets it.
            console.log(`AuthProvider fetchUserData: Auth has no displayName, Firestore does ("${userData.displayName}"). Attempting to update Auth profile.`);
            const authUserToUpdate = firebaseAppAuthInstance.currentUser;
            if (authUserToUpdate) {
              await firebaseAuth.updateProfile(authUserToUpdate, { displayName: userData.displayName });
              // No need to call setCurrentUser here as onAuthStateChanged handles the React state for currentUser
            }
          }

        } else {
           console.log(`AuthProvider fetchUserData: Creating new user document for UID: ${user.uid}`);
           let finalDisplayName = user.displayName || ''; // Start with Auth's displayName

           // If Auth displayName is empty, but we somehow got a name (e.g. from signUp's `name` param before it's reflected in user object)
           // This part is more robustly handled if `signUp` ensures `updateProfile` completes.
           // For this specific function, rely on `user.displayName` from the auth state.
           // The `signUp` function is now responsible for calling `updateProfile`.

           await setDoc(userDocRef, {
             uid: user.uid,
             email: user.email,
             displayName: finalDisplayName, // Use the displayName from the User object
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
  }, [db, firebaseAuth, firebaseAppAuthInstance]); // Added firebaseAppAuthInstance dependency


  useEffect(() => {
    if (!hasMounted || !firebaseAuth) { 
      // If firebaseAuth is null (still loading or failed), and no error, keep loading true.
      // This is implicitly handled by setLoading(false) only being called inside onAuthStateChanged or if authLoadingError.
      return;
    }

    console.log("AuthProvider onAuthStateChanged: Setting up listener with auth instance:", firebaseAppAuthInstance);
    const unsubscribe = firebaseAuth.onAuthStateChanged(firebaseAppAuthInstance, async (user) => {
      console.log("AuthProvider onAuthStateChanged: User state -", user ? user.uid : null, "DisplayName:", user?.displayName);
      setCurrentUser(user); // Update React state for currentUser
      if (user) {
        await fetchUserData(user);
      } else {
        // Clear user-specific data if user is null
        setSubscription(null);
        setMainBoardId(null);
        setBoardOrder(null);
      }
      // This check is important: ensure firebaseAuth itself hasn't become null due to an HMR issue
      // just before this callback fires, though unlikely.
      if (firebaseAuth) { 
          setLoading(false); // Auth state resolved, main loading finished
      }
    });

    return unsubscribe;
  }, [fetchUserData, hasMounted, firebaseAuth, firebaseAppAuthInstance, authLoadingError]);

  const signUp = async (email: string, password: string, name: string) => {
    if (!firebaseAuth?.createUserWithEmailAndPassword || !firebaseAuth.updateProfile) {
      throw new Error("Firebase Auth functions not initialized for signUp");
    }
    const userCredential = await firebaseAuth.createUserWithEmailAndPassword(firebaseAppAuthInstance, email, password);
    if (userCredential.user) {
      // Update Firebase Auth profile immediately
      await firebaseAuth.updateProfile(userCredential.user, { displayName: name });
      // Create a new user object that includes the displayName for local state and fetchUserData
      const userWithProfile = { 
        ...userCredential.user, 
        displayName: name 
      } as User; // Cast to User type
      
      setCurrentUser(userWithProfile); // Update local state immediately
      await fetchUserData(userWithProfile); // Create/update Firestore doc
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
        // Fallback to direct instance call if dynamic fails, though this path shouldn't be hit if firebaseAuth is set.
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
      // setLoading(true); // Optionally set loading state if refresh is lengthy
      await fetchUserData(currentUser);
      // setLoading(false);
    }
  }, [currentUser, fetchUserData]);


  // Render Logic:
  if (!hasMounted) {
    // Render nothing on the server and on the very first client render pass.
    // This helps prevent hydration errors for this provider.
    return null;
  }

  if (loading) {
    // This block is for client-side rendering only, after hasMounted is true.
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        {/* Loader2 icon removed from this initial static block to prevent hydration mismatch if server rendered it differently */}
        {/* The dynamic loading message is now handled by the loadingMessage state */}
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-2">
          {loadingMessage}
        </p>
      </div>
    );
  }

  // Client-side, mounted, and all loading is complete.
  const value = {
    currentUser,
    loading, // This 'loading' is the master loading state from AuthProvider
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
