
"use client";

import type { ReactNode, FC } from 'react';
import React, { createContext, useContext, useEffect, useCallback, useState } from 'react';
import { type User, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, updateProfile } from 'firebase/auth';
import { auth, db } from '@/lib/firebase'; // auth is the initialized Auth instance
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
  const [currentUser, setCurrentUser] = useState<User | null | undefined>(undefined);
  const [hasMounted, setHasMounted] = useState(false);
  const [initialAuthCheckDone, setInitialAuthCheckDone] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Initierar autentisering...");

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
          
          const authUserToUpdate = auth.currentUser; 
          if (authUserToUpdate) { 
            let firestoreUpdates: any = {};
            let authProfileNeedsUpdate = false;
            let authProfileUpdatePayload: { displayName?: string | null; photoURL?: string | null } = {};

            if ((authUserToUpdate.displayName || "") !== (userData.displayName || "")) {
                if(authUserToUpdate.displayName){
                    firestoreUpdates.displayName = authUserToUpdate.displayName;
                } else if (userData.displayName) {
                    authProfileUpdatePayload.displayName = userData.displayName;
                    authProfileNeedsUpdate = true;
                }
            }
            
            if ((authUserToUpdate.photoURL || null) !== (userData.photoURL || null)) {
                 if(authUserToUpdate.photoURL) {
                    firestoreUpdates.photoURL = authUserToUpdate.photoURL;
                 } else if (userData.photoURL) {
                    authProfileUpdatePayload.photoURL = userData.photoURL;
                    authProfileNeedsUpdate = true;
                 }
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

    console.log("AuthProvider: Setting up onAuthStateChanged listener.");
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("AuthProvider onAuthStateChanged: User state -", user ? `${user.uid} (${user.displayName || user.email})` : null);
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
        console.error("AuthProvider onAuthStateChanged error:", error);
        setCurrentUser(null); // Ensure user is cleared on auth error
        setSubscription(null);
        setMainBoardId(null);
        setBoardOrder(null);
        setInitialAuthCheckDone(true); 
        setLoadingMessage("Autentiseringsfel.");
    });

    return () => {
      console.log("AuthProvider: Cleaning up onAuthStateChanged listener.");
      unsubscribe();
    };
  }, [hasMounted, fetchUserData]);


  const signUp = async (email: string, password: string, name: string) => {
    setLoadingMessage("Registrerar konto...");
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (userCredential.user) {
      await updateProfile(userCredential.user, { displayName: name });
      // Firestore document creation is now handled by fetchUserData triggered by onAuthStateChanged
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
    console.log(`AuthContext: Attempting to send password reset for ${email}`); // Diagnostic log
    return sendPasswordResetEmail(auth, email);
  };

  const refreshUserData = useCallback(async () => {
    if (auth.currentUser) { // Use auth.currentUser directly from the imported instance
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
    return null; // Render nothing on the server or first client render pass
  }
  
  if (loading) { 
     return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        {/* Loader2 icon removed from this dynamic loading block to simplify hydration for now */}
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
