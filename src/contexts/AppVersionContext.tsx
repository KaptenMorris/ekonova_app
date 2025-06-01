
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { doc, getDoc, updateDoc, Timestamp, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './AuthContext'; // Assuming AuthContext provides currentUser

export interface AppVersion {
  id: string;
  version: string;
  title: string;
  description: string;
  releaseDate: Timestamp;
  published: boolean;
}

interface AppVersionContextType {
  latestVersionInfo: AppVersion | null;
  showWhatsNewDialog: boolean;
  closeWhatsNewDialog: () => void;
  isLoadingVersionInfo: boolean;
}

const AppVersionContext = createContext<AppVersionContextType | undefined>(undefined);

export const useAppVersionInfo = (): AppVersionContextType => {
  const context = useContext(AppVersionContext);
  if (!context) {
    throw new Error('useAppVersionInfo must be used within an AppVersionInfoProvider');
  }
  return context;
};

interface AppVersionInfoProviderProps {
  children: ReactNode;
}

export const AppVersionInfoProvider: React.FC<AppVersionInfoProviderProps> = ({ children }) => {
  const { currentUser, loading: authLoading } = useAuth();
  const [latestVersionInfo, setLatestVersionInfo] = useState<AppVersion | null>(null);
  const [showWhatsNewDialog, setShowWhatsNewDialog] = useState(false);
  const [isLoadingVersionInfo, setIsLoadingVersionInfo] = useState(true);
  const [userLastSeenVersion, setUserLastSeenVersion] = useState<string | null>(null);

  const fetchLatestVersion = useCallback(async () => {
    setIsLoadingVersionInfo(true);
    try {
      const versionDocRef = doc(db, 'appVersionInfo', 'latest');
      const versionDocSnap = await getDoc(versionDocRef);
      if (versionDocSnap.exists()) {
        const data = versionDocSnap.data() as Omit<AppVersion, 'id'>;
        if (data.published) {
          setLatestVersionInfo({ id: versionDocSnap.id, ...data });
        } else {
          setLatestVersionInfo(null); // Don't set if not published
        }
      } else {
        setLatestVersionInfo(null);
        console.log("No 'latest' app version document found.");
      }
    } catch (error) {
      console.error("Error fetching latest app version info:", error);
      setLatestVersionInfo(null);
    }
    setIsLoadingVersionInfo(false);
  }, []);

  const fetchUserLastSeenVersion = useCallback(async () => {
    if (currentUser) {
      setIsLoadingVersionInfo(true); // Indicate loading while fetching user-specific version
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setUserLastSeenVersion(userDocSnap.data()?.lastSeenAppVersion || null);
        } else {
          setUserLastSeenVersion(null); // User document might not exist yet
        }
      } catch (error) {
        console.error("Error fetching user's last seen app version:", error);
        setUserLastSeenVersion(null);
      }
      // setIsLoadingVersionInfo(false); // This might be set by fetchLatestVersion too
    }
  }, [currentUser]);

  useEffect(() => {
    // Fetch general app version info only after auth state is somewhat resolved
    if (!authLoading) {
        fetchLatestVersion();
    }
  }, [authLoading, fetchLatestVersion]);

  useEffect(() => {
    // Fetch user-specific data once currentUser is available and auth is not loading
    if (!authLoading && currentUser) {
      fetchUserLastSeenVersion();
    } else if (!authLoading && !currentUser) {
      // If user is not logged in, reset user-specific version state
      setUserLastSeenVersion(null);
    }
  }, [authLoading, currentUser, fetchUserLastSeenVersion]);


  useEffect(() => {
    // Determine if dialog should be shown
    // This effect should run after both latestVersionInfo and userLastSeenVersion (and auth state) are settled
    if (!isLoadingVersionInfo && !authLoading && currentUser && latestVersionInfo) {
      if (latestVersionInfo.version !== userLastSeenVersion) {
        setShowWhatsNewDialog(true);
      } else {
        setShowWhatsNewDialog(false);
      }
    } else {
      // Default to not showing if data is loading, or no user/version info
      setShowWhatsNewDialog(false);
    }
  }, [isLoadingVersionInfo, authLoading, currentUser, latestVersionInfo, userLastSeenVersion]);

  const closeWhatsNewDialog = useCallback(async () => {
    setShowWhatsNewDialog(false);
    if (currentUser && latestVersionInfo && latestVersionInfo.version !== userLastSeenVersion) {
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        // Use setDoc with merge:true to create/update the field robustly
        await setDoc(userDocRef, { lastSeenAppVersion: latestVersionInfo.version }, { merge: true });
        setUserLastSeenVersion(latestVersionInfo.version); // Update local state
      } catch (error) {
        console.error("Error updating user's lastSeenAppVersion:", error);
        // Optionally, show a toast to the user if this fails, though it's a background task.
      }
    }
  }, [currentUser, latestVersionInfo, userLastSeenVersion]);


  return (
    <AppVersionContext.Provider value={{ latestVersionInfo, showWhatsNewDialog, closeWhatsNewDialog, isLoadingVersionInfo }}>
      {children}
    </AppVersionContext.Provider>
  );
};
