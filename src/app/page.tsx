
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function HomePage() {
  const router = useRouter();
  const { currentUser, loading } = useAuth();

  useEffect(() => {
    console.log("HomePage useEffect: Auth loading state:", loading, "CurrentUser:", !!currentUser); // Added for HMR diagnostics
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
