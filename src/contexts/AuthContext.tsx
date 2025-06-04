
"use client";

// HMR Nudge Comment - vFINAL_AUTH_CTX_ATTEMPT_Z_INSTANCE_REFACTOR - 2024-08-15T15:00:00Z
// HMR Nudge Comment - vFINAL_AUTH_CTX_ATTEMPT_Z_PERSISTENT_HMR_RETRY - 2024-08-15T16:01:00Z
// HMR Nudge Comment - vFINAL_AUTH_CTX_ATTEMPT_Z_PERSISTENT_HMR_RETRY_V2 - 2024-08-15T16:15:00Z
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
  type FirebaseAuthType // Import the Auth type
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
  const [loadingMessage, setLoadingMessage] = useState("Laddar applikation...");

  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [mainBoardId, setMainBoardId] = useState<string | null>(null);
  const [boardOrder, setBoardOrder] = useState<string[] | null>(null);

  const router = useRouter();

  const fetchUserData = useCallback(async (user: User | null) => {
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      try {
        setLoadingMessage("Hämtar användardata...");
        console.log(`[AuthContext] Attempting to GET user document: users/${user.uid}`);
        const userDocSnap = await getDoc(userDocRef);
        console.log(`[AuthContext] GET users/${user.uid} - Exists: ${userDocSnap.exists()}`);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          console.log(`[AuthContext] User data for users/${user.uid}:`, userData);
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
              console.log(`[AuthContext] Attempting to UPDATE user document users/${user.uid} with:`, firestoreUpdates);
              await updateDoc(userDocRef, firestoreUpdates);
              console.log(`[AuthContext] UPDATE users/${user.uid} successful.`);
            }
            if (authProfileNeedsUpdate && Object.keys(authProfileUpdatePayload).length > 0) {
              console.log(`[AuthContext] Attempting to UPDATE Firebase Auth profile for UID ${user.uid} with:`, authProfileUpdatePayload);
              await updateProfile(authUserToUpdate, authProfileUpdatePayload);
              console.log(`[AuthContext] UPDATE Firebase Auth profile for UID ${user.uid} successful.`);
            }
          }
        } else {
          setLoadingMessage("Skapar användarprofil...");
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
            isAdmin: false, // Default isAdmin to false
          };
          console.log(`[AuthContext] Attempting to SET user document users/${user.uid} with:`, newUserDocData);
          await setDoc(userDocRef, newUserDocData);
          console.log(`[AuthContext] SET users/${user.uid} successful.`);
          setSubscription({ status: 'inactive', expiresAt: null });
          setMainBoardId(null);
          setBoardOrder(null);
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
      }
    } else {
      setSubscription(null);
      setMainBoardId(null);
      setBoardOrder(null);
    }
  }, []);


  useEffect(() => {
    setHasMounted(true);
    
    setLoadingMessage("Sätter upp autentiseringslyssnare...");
    console.log("AuthProvider: Setting up onAuthStateChanged listener with directly imported auth instance.");
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("AuthProvider onAuthStateChanged: User state -", user ? `${user.uid} (${user.displayName || user.email})` : null);
      setCurrentUser(user);
      if (user) {
        await fetchUserData(user);
      } else {
        setSubscription(null);
        setMainBoardId(null);
        setBoardOrder(null);
      }
      setInitialAuthCheckDone(true);
      setLoadingMessage("Autentisering klar.");
    }, (error) => {
        console.error("AuthProvider onAuthStateChanged error:", error);
        setCurrentUser(null);
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
  }, [fetchUserData]);


  const signUp = async (email: string, password: string, name: string) => {
    setLoadingMessage("Registrerar konto...");
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (userCredential.user) {
      await updateProfile(userCredential.user, { displayName: name });
      // Firestore document creation is now handled by fetchUserData on new user login
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
    router.push('/'); // Changed from /logga-in
    setLoadingMessage("Utloggad.");
  };

  const sendPasswordReset = async (email: string) => {
    console.log(`AuthContext: Attempting to send password reset for ${email} using imported auth. (HMR Test Comment V_DIRECT_AUTH_IMPORT)`);
    return sendPasswordResetEmail(auth, email);
  };

  const refreshUserData = useCallback(async () => {
    const currentAuthUser = auth.currentUser;
    if (currentAuthUser) {
      setLoadingMessage("Uppdaterar användardata...");
      await fetchUserData(currentAuthUser);
      setLoadingMessage("Användardata uppdaterad.");
    } else {
      setLoadingMessage("Ingen användare inloggad för uppdatering.");
      await fetchUserData(null);
    }
  }, [fetchUserData]);

  const loading = !hasMounted || !initialAuthCheckDone;

  if (!hasMounted) {
    return null; 
  }

  // Removed the global loading screen from AuthProvider itself
  // if (loading) {
  //    return (
  //     <div className="flex h-screen w-full items-center justify-center bg-background">
  //       <p className="ml-2">{loadingMessage || "Initierar applikation..."}</p>
  //     </div>
  //   );
  // }

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
