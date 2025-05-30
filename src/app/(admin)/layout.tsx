// src/app/(admin)/layout.tsx
"use client";

import type { ReactNode, FC } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useState, useMemo } from 'react';
import { LogOut, LayoutDashboard } from 'lucide-react';
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
  console.log("AdminLayout rendering/re-evaluating... (Cache Buster v6 - Final Attempt)"); // Distinct Cache buster
  const router = useRouter();
  const pathname = usePathname();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const publicAdminPaths = useMemo(() => ['/admin-login'], []);

  useEffect(() => {
    let title = 'Admin - Ekonova';
    if (typeof window !== 'undefined') {
      const adminAuthStatus = localStorage.getItem('isAdminAuthenticated');
      if (adminAuthStatus === 'true') {
        setIsAuthenticated(true);
        if (publicAdminPaths.includes(pathname)) {
          router.replace('/admin-dashboard');
        }
      } else {
        setIsAuthenticated(false);
        if (!publicAdminPaths.includes(pathname)) {
          router.replace('/admin-login');
        }
      }
      
      if (pathname.includes('/admin-login')) {
        title = 'Admin Login - Ekonova';
      } else if (pathname.includes('/admin-dashboard')) {
        title = 'Admin Dashboard - Ekonova';
      }
      document.title = title;
    }
    setIsCheckingAuth(false);
  }, [router, pathname, publicAdminPaths]);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('isAdminAuthenticated');
    }
    setIsAuthenticated(false);
    router.replace('/admin-login');
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

  if (publicAdminPaths.includes(pathname)) {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        {children}
        <Toaster />
      </ThemeProvider>
    );
  }

  if (!isAuthenticated) {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <div className="flex h-screen w-full items-center justify-center bg-background">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-4">Omdirigerar till inloggning...</p>
        </div>
        <Toaster />
      </ThemeProvider>
    );
  }

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
