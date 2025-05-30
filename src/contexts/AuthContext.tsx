
"use client";

import type { ReactNode, FC } from 'react';
// Changed import: Explicitly import React for React.useState
import React, { createContext, useContext, useEffect, useCallback } from 'react';
import {
  Auth,
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, Timestamp, updateDoc, setDoc } from 'firebase/firestore'; // Added setDoc
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface SubscriptionInfo {
  status: 'active' | 'inactive' | 'trial' | null;
  expiresAt: Date | null;
}

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  // isAdmin: boolean | null; // Removed isAdmin
  subscription: SubscriptionInfo | null;
  mainBoardId: string | null;
  boardOrder: string[] | null;
  signUp: (email: string, password: string, name: string) => Promise<any>; // Added name to signUp
  logIn: (email: string, password: string) => Promise<any>;
  logOut: () => Promise<void>;
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
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  // const [isAdmin, setIsAdmin] = React.useState<boolean | null>(null); // Removed isAdmin state
  const [subscription, setSubscription] = React.useState<SubscriptionInfo | null>(null);
  const [mainBoardId, setMainBoardId] = React.useState<string | null>(null);
  const [boardOrder, setBoardOrder] = React.useState<string[] | null>(null);
  const [hasMounted, setHasMounted] = React.useState(false);
  const router = useRouter();

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const fetchUserData = useCallback(async (user: User | null) => {
    if (user) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          // setIsAdmin(userData.isAdmin === true); // Removed isAdmin
          const expiresAtTimestamp = userData.subscriptionExpiresAt as Timestamp | undefined;
          setSubscription({
            status: userData.subscriptionStatus || 'inactive',
            expiresAt: expiresAtTimestamp ? expiresAtTimestamp.toDate() : null,
          });
          setMainBoardId(userData.mainBoardId || null);
          setBoardOrder(userData.boardOrder || null);

          // Ensure displayName is in Firestore if not already set from auth profile update
          if (user.displayName && (!userData.displayName || userData.displayName !== user.displayName)) {
            await updateDoc(userDocRef, { displayName: user.displayName });
          }
        } else {
          // If user doc doesn't exist, create it
          await setDoc(userDocRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || '',
            createdAt: Timestamp.now(),
            // isAdmin: false, // Removed isAdmin
            subscriptionStatus: 'inactive',
            subscriptionExpiresAt: null,
            mainBoardId: null,
            boardOrder: [],
          });
          // setIsAdmin(false); // Removed isAdmin
          setSubscription({ status: 'inactive', expiresAt: null });
          setMainBoardId(null);
          setBoardOrder(null);
        }
      } catch (error) {
        console.error("Error fetching or creating user data:", error);
        // setIsAdmin(false); // Removed isAdmin
        setSubscription({ status: 'inactive', expiresAt: null });
        setMainBoardId(null);
        setBoardOrder(null);
      }
    } else {
      // setIsAdmin(null); // Removed isAdmin
      setSubscription(null);
      setMainBoardId(null);
      setBoardOrder(null);
    }
  }, []);

  useEffect(() => {
    if (!hasMounted) {
      return; // Don't run onAuthStateChanged until the component has mounted.
    }
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchUserData(user);
      } else {
        // setIsAdmin(null); // Removed isAdmin
        setSubscription(null);
        setMainBoardId(null);
        setBoardOrder(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [fetchUserData, hasMounted, auth]);

  const refreshUserData = useCallback(async () => {
    if (currentUser) {
      setLoading(true);
      await fetchUserData(currentUser);
      setLoading(false);
    }
  }, [currentUser, fetchUserData]);

  const signUp = async (email: string, password: string, name: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (userCredential.user) {
      // User created in Auth, now create corresponding Firestore document
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      await setDoc(userDocRef, {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: name,
        createdAt: Timestamp.now(),
        // isAdmin: false, // Removed isAdmin
        subscriptionStatus: 'inactive',
        subscriptionExpiresAt: null,
        mainBoardId: null,
        boardOrder: [],
      });
      await refreshUserData(); 
    }
    return userCredential;
  };

  const logIn = (email: string, password: string) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logOut = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null); 
      // setIsAdmin(null); // Removed isAdmin    
      router.push('/logga-in');
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };


  if (!hasMounted) {
    // On the server, and on the client before the first useEffect for hasMounted runs
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (loading) { 
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const value = {
    currentUser,
    loading,
    // isAdmin, // Removed isAdmin
    subscription,
    mainBoardId,
    boardOrder,
    signUp,
    logIn,
    logOut,
    refreshUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

