
"use client";

import type { ReactNode, FC } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Logo from '@/components/shared/logo';
import { Button } from '@/components/ui/button';
import { Loader2, Home, LayoutDashboard, ShieldAlert } from 'lucide-react';
import { ThemeToggle } from '@/components/shared/theme-toggle';

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout: FC<AdminLayoutProps> = ({ children }) => {
  const { currentUser, isAdmin, loading, logOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!currentUser) {
        router.replace('/logga-in?redirect=/admin/dashboard');
      } else if (isAdmin === false) {
        // If isAdmin is explicitly false (not null/loading)
        router.replace('/dashboard'); // Or an "access denied" page
      }
    }
  }, [currentUser, isAdmin, loading, router]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.title = 'Admin - Ekonova';
    }
  }, []);

  if (loading || isAdmin === null) { // Show loader while isAdmin status is being determined or user loading
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Laddar Admin...</p>
      </div>
    );
  }

  if (!currentUser || isAdmin === false) {
    // This case should ideally be caught by useEffect redirect, but as a fallback:
    return (
       <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-4">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Åtkomst Nekad</h1>
        <p className="text-muted-foreground mb-6">Du har inte behörighet att visa denna sida.</p>
        <Button onClick={() => router.push('/dashboard')}>Till Kontrollpanelen</Button>
      </div>
    );
  }

  // If we reach here, user is admin
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 shadow-sm backdrop-blur-md sm:px-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <Logo iconSize={28} textSize="text-2xl" />
            <span className="ml-2 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              ADMIN
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button variant="outline" size="sm" onClick={() => router.push('/dashboard')}>
            <Home className="mr-2 h-4 w-4" /> Till Appen
          </Button>
          <Button variant="ghost" size="sm" onClick={logOut}>
            Logga ut
          </Button>
        </div>
      </header>
      <main className="flex-1 p-4 sm:p-6">
        {/* Placeholder for potential admin-specific navigation, e.g., tabs or a sub-sidebar */}
        {/* For now, just render children directly */}
        {children}
      </main>
       <footer className="border-t p-4 text-center text-xs text-muted-foreground">
        Ekonova Adminpanel
      </footer>
    </div>
  );
};

export default AdminLayout;
