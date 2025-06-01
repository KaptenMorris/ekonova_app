
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
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
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setUserLastSeenVersion(userDocSnap.data()?.lastSeenAppVersion || null);
        }
      } catch (error) {
        console.error("Error fetching user's last seen app version:", error);
      }
    }
  }, [currentUser]);

  useEffect(() => {
    fetchLatestVersion();
  }, [fetchLatestVersion]);

  useEffect(() => {
    if (!authLoading && currentUser) {
      fetchUserLastSeenVersion();
    }
  }, [authLoading, currentUser, fetchUserLastSeenVersion]);


  useEffect(() => {
    if (!isLoadingVersionInfo && !authLoading && currentUser && latestVersionInfo) {
      if (latestVersionInfo.version !== userLastSeenVersion) {
        setShowWhatsNewDialog(true);
      } else {
        setShowWhatsNewDialog(false); // Explicitly set to false if versions match
      }
    } else {
      setShowWhatsNewDialog(false); // Explicitly set to false if conditions not met
    }
  }, [isLoadingVersionInfo, authLoading, currentUser, latestVersionInfo, userLastSeenVersion]);

  const closeWhatsNewDialog = useCallback(async () => {
    setShowWhatsNewDialog(false);
    if (currentUser && latestVersionInfo && latestVersionInfo.version !== userLastSeenVersion) {
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userDocRef, {
          lastSeenAppVersion: latestVersionInfo.version,
        });
        setUserLastSeenVersion(latestVersionInfo.version); // Update local state
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
