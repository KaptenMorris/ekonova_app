
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
  const [hasMounted, setHasMounted] = React.useState(false); // New state for hydration fix
  const router = useRouter();

  useEffect(() => {
    setHasMounted(true); // Will only run on the client after initial render
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
    if (!hasMounted) { // Don't run Firebase logic until client has mounted
      return;
    }
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
  }, [fetchUserData, hasMounted]); // Depend on hasMounted

  const refreshUserData = useCallback(async () => {
    if (currentUser) {
      setLoading(true);
      await fetchUserData(currentUser);
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

  // Conditional rendering logic updated
  if (!hasMounted) {
    // On the server, and on the client before the first useEffect for hasMounted runs
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (loading && !currentUser) {
    // After client has mounted, but Firebase auth is still loading and no user is yet available
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
    refreshUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
