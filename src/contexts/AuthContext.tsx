
"use client";

import type { ReactNode, FC } from 'react';
import React, { createContext, useContext, useEffect, useCallback, useState } from 'react';
import {
  auth, // Directly import the initialized auth instance
  db,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  type User,
  type Auth // Changed from FirebaseAuthType
} from '@/lib/firebase';
import { doc, getDoc, Timestamp, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';


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
  hasSeenWelcomeGuide: boolean | null;
  signUp: (email: string, password: string, name: string) => Promise<any>;
  logIn: (email: string, password: string) => Promise<any>;
  logOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  refreshUserData: () => Promise<void>;
  markWelcomeGuideAsSeen: () => Promise<void>;
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

  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [mainBoardId, setMainBoardId] = useState<string | null>(null);
  const [boardOrder, setBoardOrder] = useState<string[] | null>(null);
  const [hasSeenWelcomeGuide, setHasSeenWelcomeGuide] = useState<boolean | null>(null);

  const router = useRouter();

  const fetchUserData = useCallback(async (user: User | null) => {
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      try {
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
          setHasSeenWelcomeGuide(userData.hasSeenWelcomeGuide === true); // Default to false if undefined

          const authUserToUpdate = auth.currentUser;
          if (authUserToUpdate) {
            let firestoreUpdates: any = {};
            let authProfileNeedsUpdate = false;
            let authProfileUpdatePayload: { displayName?: string | null; photoURL?: string | null } = {};

            const firestoreDisplayName = userData.displayName || '';
            const authDisplayName = authUserToUpdate.displayName || '';
            if (firestoreDisplayName && firestoreDisplayName !== authDisplayName) {
              authProfileUpdatePayload.displayName = firestoreDisplayName;
              authProfileNeedsUpdate = true;
            } else if (authDisplayName && authDisplayName !== firestoreDisplayName) {
              firestoreUpdates.displayName = authDisplayName;
            }

            const firestorePhotoURL = userData.photoURL || null;
            const authPhotoURL = authUserToUpdate.photoURL || null;
            if (firestorePhotoURL && firestorePhotoURL !== authPhotoURL) {
              authProfileUpdatePayload.photoURL = firestorePhotoURL;
              authProfileNeedsUpdate = true;
            } else if (authPhotoURL && authPhotoURL !== firestorePhotoURL) {
              firestoreUpdates.photoURL = authPhotoURL;
            }

            if (Object.keys(firestoreUpdates).length > 0) {
              firestoreUpdates.updatedAt = serverTimestamp();
              await updateDoc(userDocRef, firestoreUpdates);
            }
            if (authProfileNeedsUpdate && Object.keys(authProfileUpdatePayload).length > 0) {
              await updateProfile(authUserToUpdate, authProfileUpdatePayload);
            }
          }
        } else {
          const initialDisplayName = user.displayName || '';
          const newUserDocData = {
            uid: user.uid,
            email: user.email,
            displayName: initialDisplayName,
            photoURL: user.photoURL || null,
            createdAt: serverTimestamp(),
            subscriptionStatus: 'inactive',
            subscriptionExpiresAt: null,
            mainBoardId: null,
            boardOrder: [],
            isAdmin: false,
            hasSeenWelcomeGuide: false, // Initialize for new user
          };
          await setDoc(userDocRef, newUserDocData);
          setSubscription({ status: 'inactive', expiresAt: null });
          setMainBoardId(null);
          setBoardOrder(null);
          setHasSeenWelcomeGuide(false);
        }
      } catch (error: any) {
        console.error("[AuthContext] Error in fetchUserData (Firestore operation):", error);
        const path = `users/${user.uid}`;
        if (error.code === 'permission-denied' || error.code === 'PERMISSION_DENIED') {
          console.error(`[AuthContext] Firestore permission denied for UID: ${user.uid}. Path: ${path}. Check Firestore Security Rules.`);
          alert(`Kritiskt fel: Åtkomst nekad till Firestore för användardata (${path}).\n\nSe till att dina säkerhetsregler i Firebase Console tillåter läsning och skrivning för den autentiserade användaren till sitt eget dokument under /users/{userId}.\n\nExempelregel:\nmatch /users/{userId} {\n  allow read, write: if request.auth != null && request.auth.uid == userId;\n}\n\nAppen kan inte fungera korrekt.`);
        }
        setSubscription({ status: 'inactive', expiresAt: null });
        setMainBoardId(null);
        setBoardOrder(null);
        setHasSeenWelcomeGuide(null); // Error state
      }
    } else {
      setSubscription(null);
      setMainBoardId(null);
      setBoardOrder(null);
      setHasSeenWelcomeGuide(null);
    }
  }, []);


  useEffect(() => {
    setHasMounted(true);
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchUserData(user);
      } else {
        setSubscription(null);
        setMainBoardId(null);
        setBoardOrder(null);
        setHasSeenWelcomeGuide(null);
      }
      setInitialAuthCheckDone(true);
    }, (error) => {
        console.error("AuthProvider onAuthStateChanged error:", error);
        setCurrentUser(null);
        setSubscription(null);
        setMainBoardId(null);
        setBoardOrder(null);
        setHasSeenWelcomeGuide(null);
        setInitialAuthCheckDone(true);
    });

    return () => {
      unsubscribe();
    };
  }, [fetchUserData]);


  const signUp = async (email: string, password: string, name: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (userCredential.user) {
      await updateProfile(userCredential.user, { displayName: name });
      // Firestore document creation, including hasSeenWelcomeGuide: false, is handled by fetchUserData
    }
    return userCredential;
  };

  const logIn = async (email: string, password: string) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logOut = async () => {
    await signOut(auth);
    setCurrentUser(null); // Explicitly set currentUser to null on logout
    setSubscription(null);
    setMainBoardId(null);
    setBoardOrder(null);
    setHasSeenWelcomeGuide(null);
    router.push('/');
  };

  const sendPasswordReset = async (email: string) => {
    return sendPasswordResetEmail(auth, email);
  };

  const refreshUserData = useCallback(async () => {
    const currentAuthUser = auth.currentUser;
    if (currentAuthUser) {
      await fetchUserData(currentAuthUser);
    } else {
      await fetchUserData(null); // This will clear states if no user
    }
  }, [fetchUserData]);

  const markWelcomeGuideAsSeen = async () => {
    if (currentUser) {
      const userDocRef = doc(db, 'users', currentUser.uid);
      try {
        await updateDoc(userDocRef, { hasSeenWelcomeGuide: true });
        setHasSeenWelcomeGuide(true);
      } catch (error) {
        console.error("Error marking welcome guide as seen:", error);
      }
    }
  };

  const loading = !hasMounted || !initialAuthCheckDone;


  const value = {
    currentUser,
    loading,
    subscription,
    mainBoardId,
    boardOrder,
    hasSeenWelcomeGuide,
    signUp,
    logIn,
    logOut,
    sendPasswordReset,
    refreshUserData,
    markWelcomeGuideAsSeen,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

