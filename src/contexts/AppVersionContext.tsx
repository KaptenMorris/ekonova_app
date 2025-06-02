
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { doc, getDoc, updateDoc, Timestamp, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './AuthContext'; // Assuming AuthContext provides currentUser
import type { User } from 'firebase/auth'; // Import User type

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

  const fetchLatestVersionAndUserStatus = useCallback(async (user: User) => {
    setIsLoadingVersionInfo(true);
    try {
      // Fetch latest version
      const versionDocRef = doc(db, 'appVersionInfo', 'latest');
      const versionDocSnap = await getDoc(versionDocRef);
      let currentLatestVersion: AppVersion | null = null;
      if (versionDocSnap.exists()) {
        const data = versionDocSnap.data() as Omit<AppVersion, 'id'>;
        if (data.published) {
          currentLatestVersion = { id: versionDocSnap.id, ...data };
        }
      }
      setLatestVersionInfo(currentLatestVersion);

      // Fetch user's last seen version
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      let lastSeen: string | null = null;
      if (userDocSnap.exists()) {
        lastSeen = userDocSnap.data()?.lastSeenAppVersion || null;
      }
      setUserLastSeenVersion(lastSeen);

      // Determine if dialog should be shown
      if (currentLatestVersion && currentLatestVersion.version !== lastSeen) {
        setShowWhatsNewDialog(true);
      } else {
        setShowWhatsNewDialog(false);
      }

    } catch (error) {
      console.error("Error fetching latest app version or user's last seen version:", error);
      setLatestVersionInfo(null);
      setUserLastSeenVersion(null);
      setShowWhatsNewDialog(false);
    } finally {
      setIsLoadingVersionInfo(false);
    }
  }, []);


  useEffect(() => {
    if (authLoading) {
      // If auth is still loading, we wait. isLoadingVersionInfo should remain true or be managed by subsequent states.
      // Ensure isLoadingVersionInfo is true if we haven't determined user status yet.
      if (!currentUser) setIsLoadingVersionInfo(true);
      return;
    }

    if (currentUser) {
      fetchLatestVersionAndUserStatus(currentUser);
    } else {
      // No user, reset version-related states and indicate loading is done
      setLatestVersionInfo(null);
      setUserLastSeenVersion(null);
      setShowWhatsNewDialog(false);
      setIsLoadingVersionInfo(false);
    }
  }, [authLoading, currentUser, fetchLatestVersionAndUserStatus]);


  const closeWhatsNewDialog = useCallback(async () => {
    setShowWhatsNewDialog(false);
    if (currentUser && latestVersionInfo && latestVersionInfo.version !== userLastSeenVersion) {
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        // Use setDoc with merge:true to create or update
        await setDoc(userDocRef, { lastSeenAppVersion: latestVersionInfo.version }, { merge: true });
        setUserLastSeenVersion(latestVersionInfo.version);
      } catch (error) {
        console.error("Error updating user's lastSeenAppVersion:", error);
      }
    }
  }, [currentUser, latestVersionInfo, userLastSeenVersion]);


  return (
    <AppVersionContext.Provider value={{ latestVersionInfo, showWhatsNewDialog, closeWhatsNewDialog, isLoadingVersionInfo }}>
      {children}
    </AppVersionContext.Provider>
  );
};
