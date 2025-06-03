
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { doc, getDoc, updateDoc, Timestamp, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './AuthContext'; // Assuming AuthContext provides currentUser
import type { User } from 'firebase/auth'; // Import User type

// HMR Nudge - AppVersionContext - Aug 16 - Log Refine 2
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
    console.log(`[AppVersionContext] Called fetchLatestVersionAndUserStatus for user: ${user.uid}`);
    const versionDocRef = doc(db, 'appVersionInfo', 'latest');
    const userDocRef = doc(db, 'users', user.uid);
    let currentLatestVersion: AppVersion | null = null;

    try {
      // Fetch latest version
      console.log(`[AppVersionContext] Attempting to GET document: ${versionDocRef.path}`);
      const versionDocSnap = await getDoc(versionDocRef);
      console.log(`[AppVersionContext] GET ${versionDocRef.path} - Exists: ${versionDocSnap.exists()}`);
      if (versionDocSnap.exists()) {
        const data = versionDocSnap.data() as Omit<AppVersion, 'id'>;
        if (data.published) {
          currentLatestVersion = { id: versionDocSnap.id, ...data };
          console.log(`[AppVersionContext] Latest published version found: ${currentLatestVersion.version}`);
        } else {
          console.log(`[AppVersionContext] Latest version document found but not published.`);
        }
      } else {
         console.log(`[AppVersionContext] Document ${versionDocRef.path} does not exist.`);
      }
      setLatestVersionInfo(currentLatestVersion);

      // Fetch user's last seen version
      console.log(`[AppVersionContext] Attempting to GET user document for lastSeenAppVersion: ${userDocRef.path}`);
      const userDocSnap = await getDoc(userDocRef);
      console.log(`[AppVersionContext] GET ${userDocRef.path} (for lastSeenAppVersion) - Exists: ${userDocSnap.exists()}`);
      let lastSeen: string | null = null;
      if (userDocSnap.exists()) {
        lastSeen = userDocSnap.data()?.lastSeenAppVersion || null;
        console.log(`[AppVersionContext] User's lastSeenAppVersion: ${lastSeen}`);
      } else {
         console.log(`[AppVersionContext] User document ${userDocRef.path} does not exist (for lastSeenAppVersion).`);
      }
      setUserLastSeenVersion(lastSeen);

      if (currentLatestVersion && currentLatestVersion.version !== lastSeen) {
        console.log(`[AppVersionContext] New version detected. Latest: ${currentLatestVersion.version}, User saw: ${lastSeen}. Showing dialog.`);
        setShowWhatsNewDialog(true);
      } else {
        console.log(`[AppVersionContext] User has seen latest version or no new version. Dialog not shown. Latest: ${currentLatestVersion?.version}, User saw: ${lastSeen}`);
        setShowWhatsNewDialog(false);
      }

    } catch (error: any) {
      console.error("[AppVersionContext] Error in fetchLatestVersionAndUserStatus (Firestore operation):", error);
      if (error.code === 'permission-denied' || error.code === 'PERMISSION_DENIED') {
        // The error object itself might contain the path.
        const specificPath = error.customData?.path || `appVersionInfo/latest or users/${user.uid}`;
        console.error(`[AppVersionContext] Firestore permission denied. Specific path (if available from error): ${specificPath}. Check Firestore Security Rules for BOTH paths: 1. Read access to 'appVersionInfo/latest'. 2. Read/write access for 'users/${user.uid}'. Essential rules: \nmatch /appVersionInfo/latest { allow read: if request.auth != null; } \nmatch /users/{userId} { allow read, write: if request.auth.uid == userId; }`);
      }
      setLatestVersionInfo(null);
      setUserLastSeenVersion(null);
      setShowWhatsNewDialog(false);
    } finally {
      setIsLoadingVersionInfo(false);
      console.log("[AppVersionContext] fetchLatestVersionAndUserStatus finished.");
    }
  }, []);


  useEffect(() => {
    if (authLoading) {
      if (!currentUser) {
        console.log("[AppVersionContext] Auth is loading, currentUser not yet available. Setting isLoadingVersionInfo to true.");
        setIsLoadingVersionInfo(true);
      }
      return;
    }

    if (currentUser) {
      console.log("[AppVersionContext] currentUser available, calling fetchLatestVersionAndUserStatus.");
      fetchLatestVersionAndUserStatus(currentUser);
    } else {
      console.log("[AppVersionContext] No currentUser. Resetting version info.");
      setLatestVersionInfo(null);
      setUserLastSeenVersion(null);
      setShowWhatsNewDialog(false);
      setIsLoadingVersionInfo(false);
    }
  }, [authLoading, currentUser, fetchLatestVersionAndUserStatus]);


  const closeWhatsNewDialog = useCallback(async () => {
    setShowWhatsNewDialog(false);
    console.log("[AppVersionContext] closeWhatsNewDialog called.");
    if (currentUser && latestVersionInfo && latestVersionInfo.version !== userLastSeenVersion) {
      const userDocRef = doc(db, 'users', currentUser.uid);
      try {
        console.log(`[AppVersionContext] Attempting to SET lastSeenAppVersion for ${userDocRef.path} to: ${latestVersionInfo.version}`);
        await setDoc(userDocRef, { lastSeenAppVersion: latestVersionInfo.version }, { merge: true });
        console.log(`[AppVersionContext] SET lastSeenAppVersion for ${userDocRef.path} successful.`);
        setUserLastSeenVersion(latestVersionInfo.version);
      } catch (error: any) {
        console.error("[AppVersionContext] Error updating user's lastSeenAppVersion (Firestore operation):", error);
         if (error.code === 'permission-denied' || error.code === 'PERMISSION_DENIED') {
          console.error(`[AppVersionContext] Firestore permission denied when updating lastSeenAppVersion for ${userDocRef.path}. Path: ${userDocRef.path}. Check Firestore Security Rules.`);
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

