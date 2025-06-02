
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// HMR Diagnostic Comment - vFINAL_PAGE_TS_ATTEMPT_1 - 2024-08-15T12:00:00Z

export default function HomePage() {
  const router = useRouter();
  const { currentUser, loading } = useAuth();

  useEffect(() => {
    console.log("HomePage useEffect (HMR Check): Auth loading state:", loading, "CurrentUser:", !!currentUser); 
    if (!loading) {
      if (currentUser) {
        router.replace('/dashboard');
      } else {
        router.replace('/logga-in');
      }
    }
  }, [currentUser, loading, router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}
