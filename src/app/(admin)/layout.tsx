// src/app/(admin)/layout.tsx
"use client";

import type { ReactNode, FC } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { LogOut, Shield, LayoutDashboard } from 'lucide-react';
import Logo from '@/components/shared/logo';
import { ThemeProvider } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/toaster';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout: FC<AdminLayoutProps> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Define paths that should bypass the main admin shell (like the login page)
  const publicAdminPaths = ['/admin-login']; // Adjusted path

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const adminAuthStatus = localStorage.getItem('isAdminAuthenticated');
      if (adminAuthStatus === 'true') {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        // Only redirect if not on a public admin path
        if (!publicAdminPaths.includes(pathname)) {
          router.replace('/admin-login'); // Adjusted path
        }
      }
      // Set document title based on current admin page
      if (pathname.includes('/admin-login')) {
        document.title = 'Admin Login - Ekonova';
      } else if (pathname.includes('/admin-dashboard')) {
        document.title = 'Admin Dashboard - Ekonova';
      } else {
        document.title = 'Admin - Ekonova';
      }
    }
    setIsCheckingAuth(false);
  }, [router, pathname]);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('isAdminAuthenticated');
    }
    setIsAuthenticated(false);
    router.replace('/admin-login'); // Adjusted path
  };

  if (isCheckingAuth) {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <div className="flex h-screen w-full items-center justify-center bg-background">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-4">Kontrollerar adminstatus...</p>
        </div>
        <Toaster />
      </ThemeProvider>
    );
  }

  // If on a public admin path (like login) and not yet authenticated, or if auth check is done and not authenticated on a public path
  if (publicAdminPaths.includes(pathname)) {
     // The login page will have its own simple layout, so this main layout passes through
     // or you can provide a minimal wrapper if needed.
     // For now, ThemeProvider might be good to ensure consistency.
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        {children}
        <Toaster />
      </ThemeProvider>
    );
  }

  // If not authenticated and not on a public admin path, show loader or redirect (useEffect handles redirect)
  if (!isAuthenticated) {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <div className="flex h-screen w-full items-center justify-center bg-background">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-4">Omdirigerar...</p>
        </div>
        <Toaster />
      </ThemeProvider>
    );
  }

  // Authenticated: Render the main admin shell
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <div className="flex min-h-screen bg-background">
        <aside className="w-64 border-r bg-muted/40 p-4 flex flex-col">
          <div className="mb-6">
            <Logo />
            <p className="text-sm text-muted-foreground">Adminportal</p>
          </div>
          <nav className="flex-1 space-y-2">
            <Link href="/admin-dashboard" passHref legacyBehavior>
              <Button variant={pathname === "/admin-dashboard" ? "secondary" : "ghost"} className="w-full justify-start">
                <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
              </Button>
            </Link>
            {/* Add more admin navigation links here as needed */}
          </nav>
          <Separator className="my-4" />
          <Button variant="ghost" onClick={handleLogout} className="w-full justify-start">
            <LogOut className="mr-2 h-4 w-4" /> Logga ut Admin
          </Button>
        </aside>
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
      <Toaster />
    </ThemeProvider>
  );
};

export default AdminLayout;