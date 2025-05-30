
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
import { doc, getDoc, Timestamp, updateDoc } from 'firebase/firestore'; // Added updateDoc
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
  mainBoardId: string | null; // Added mainBoardId
  boardOrder: string[] | null; // Added boardOrder
  signUp: (email: string, password: string) => Promise<any>;
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
  const [subscription, setSubscription] = React.useState<SubscriptionInfo | null>(null);
  const [mainBoardId, setMainBoardId] = React.useState<string | null>(null); // Added mainBoardId state
  const [boardOrder, setBoardOrder] = React.useState<string[] | null>(null); // Added boardOrder state
  const router = useRouter();

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
          setMainBoardId(userData.mainBoardId || null); // Fetch mainBoardId
          setBoardOrder(userData.boardOrder || null); // Fetch boardOrder
        } else {
          setSubscription({ status: 'inactive', expiresAt: null });
          setMainBoardId(null);
          setBoardOrder(null);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
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
  }, [fetchUserData]); 

  const refreshUserData = useCallback(async () => {
    if (currentUser) {
      setLoading(true); // Keep loading true while refreshing
      await fetchUserData(currentUser);
      // currentUser object itself might need to be reloaded if Firebase Auth profile changed
      // but for Firestore data like subscription/mainBoardId, fetchUserData is enough.
      // To ensure components react to currentUser changes if only sub-properties changed:
      // setCurrentUser(prevUser => prevUser ? ({ ...prevUser }) : null); // This can cause infinite loops if not careful
      setLoading(false);
    }
  }, [currentUser, fetchUserData]);

  const signUp = (email: string, password: string) => {
    return createUserWithEmailAndPassword(auth, email, password);
  };

  const logIn = (email: string, password: string) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logOut = async () => {
    try {
      await signOut(auth);
      router.push('/logga-in');
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  if (loading && !currentUser) { 
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
    mainBoardId, // Provide mainBoardId
    boardOrder, // Provide boardOrder
    signUp,
    logIn,
    logOut,
    refreshUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
