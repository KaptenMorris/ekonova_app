
"use client";

import type { ReactNode, FC } from 'react';
import React, { createContext, useContext, useEffect, useCallback, useState } from 'react';
import { type Auth, type User } from 'firebase/auth'; // Keep type imports
import * as firebaseAuthFunctions from 'firebase/auth'; // Namespace import for functions

import { auth, db } from '@/lib/firebase';
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
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [mainBoardId, setMainBoardId] = useState<string | null>(null);
  const [boardOrder, setBoardOrder] = useState<string[] | null>(null);
  const [hasMounted, setHasMounted] = useState(false);
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
  }, [auth]); // Added auth to dependency array

  useEffect(() => {
    if (!hasMounted) {
      return; 
    }
    const unsubscribe = firebaseAuthFunctions.onAuthStateChanged(auth, async (user) => {
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
  }, [fetchUserData, hasMounted, auth]); // Added auth to dependency array

  const refreshUserData = useCallback(async () => {
    if (currentUser) {
      setLoading(true);
      await fetchUserData(currentUser);
      setLoading(false);
    }
  }, [currentUser, fetchUserData]);

  const signUp = async (email: string, password: string, name: string) => {
    const userCredential = await firebaseAuthFunctions.createUserWithEmailAndPassword(auth, email, password);
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
      await refreshUserData(); 
    }
    return userCredential;
  };

  const logIn = (email: string, password: string) => {
    return firebaseAuthFunctions.signInWithEmailAndPassword(auth, email, password);
  };

  const logOut = async () => {
    try {
      await firebaseAuthFunctions.signOut(auth);
      setCurrentUser(null); 
      router.push('/logga-in');
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const sendPasswordReset = async (email: string) => {
    return firebaseAuthFunctions.sendPasswordResetEmail(auth, email);
  };

  if (!hasMounted) {
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
