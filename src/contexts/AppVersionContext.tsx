
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
    const versionDocRef = doc(db, 'appVersionInfo', 'latest');
    const userDocRef = doc(db, 'users', user.uid);
    let currentLatestVersion: AppVersion | null = null;

    try {
      // Fetch latest version
      console.log(`[AppVersionContext] Attempting to GET document: appVersionInfo/latest`);
      const versionDocSnap = await getDoc(versionDocRef);
      console.log(`[AppVersionContext] GET appVersionInfo/latest - Exists: ${versionDocSnap.exists()}`);
      if (versionDocSnap.exists()) {
        const data = versionDocSnap.data() as Omit<AppVersion, 'id'>;
        if (data.published) {
          currentLatestVersion = { id: versionDocSnap.id, ...data };
        }
      }
      setLatestVersionInfo(currentLatestVersion);

      // Fetch user's last seen version
      console.log(`[AppVersionContext] Attempting to GET user document for lastSeenAppVersion: users/${user.uid}`);
      const userDocSnap = await getDoc(userDocRef);
      console.log(`[AppVersionContext] GET users/${user.uid} (for lastSeenAppVersion) - Exists: ${userDocSnap.exists()}`);
      let lastSeen: string | null = null;
      if (userDocSnap.exists()) {
        lastSeen = userDocSnap.data()?.lastSeenAppVersion || null;
      }
      setUserLastSeenVersion(lastSeen);

      if (currentLatestVersion && currentLatestVersion.version !== lastSeen) {
        setShowWhatsNewDialog(true);
      } else {
        setShowWhatsNewDialog(false);
      }

    } catch (error: any) {
      console.error("[AppVersionContext] Error in fetchLatestVersionAndUserStatus (Firestore operation):", error);
      if (error.code === 'permission-denied' || error.code === 'PERMISSION_DENIED') {
        // This error could be for 'appVersionInfo/latest' OR 'users/{user.uid}'
        // The console log should help differentiate if we have access to it.
        // The error object itself might contain the path.
        const specificPath = error.customData?.path || `appVersionInfo/latest or users/${user.uid}`;
        console.error(`[AppVersionContext] Firestore permission denied. Specific path (if available from error): ${specificPath}. Check Firestore Security Rules for BOTH paths: 1. Read access to 'appVersionInfo/latest'. 2. Read/write access for 'users/${user.uid}'.`);
      }
      setLatestVersionInfo(null);
      setUserLastSeenVersion(null);
      setShowWhatsNewDialog(false);
    } finally {
      setIsLoadingVersionInfo(false);
    }
  }, []);


  useEffect(() => {
    if (authLoading) {
      if (!currentUser) setIsLoadingVersionInfo(true);
      return;
    }

    if (currentUser) {
      fetchLatestVersionAndUserStatus(currentUser);
    } else {
      setLatestVersionInfo(null);
      setUserLastSeenVersion(null);
      setShowWhatsNewDialog(false);
      setIsLoadingVersionInfo(false);
    }
  }, [authLoading, currentUser, fetchLatestVersionAndUserStatus]);


  const closeWhatsNewDialog = useCallback(async () => {
    setShowWhatsNewDialog(false);
    if (currentUser && latestVersionInfo && latestVersionInfo.version !== userLastSeenVersion) {
      const userDocRef = doc(db, 'users', currentUser.uid);
      try {
        console.log(`[AppVersionContext] Attempting to SET lastSeenAppVersion for users/${currentUser.uid} to: ${latestVersionInfo.version}`);
        await setDoc(userDocRef, { lastSeenAppVersion: latestVersionInfo.version }, { merge: true });
        console.log(`[AppVersionContext] SET lastSeenAppVersion for users/${currentUser.uid} successful.`);
        setUserLastSeenVersion(latestVersionInfo.version);
      } catch (error: any) {
        console.error("[AppVersionContext] Error updating user's lastSeenAppVersion (Firestore operation):", error);
         if (error.code === 'permission-denied' || error.code === 'PERMISSION_DENIED') {
          console.error(`[AppVersionContext] Firestore permission denied when updating lastSeenAppVersion for users/${currentUser.uid}. Path: users/${currentUser.uid}. Check Firestore Security Rules.`);
        }
      }
    }
  }, [currentUser, latestVersionInfo, userLastSeenVersion]);


  return (
    <AppVersionContext.Provider value={{ latestVersionInfo, showWhatsNewDialog, closeWhatsNewDialog, isLoadingVersionInfo }}>
      {children}
    </AppVersionContext.Provider>
  );
};
