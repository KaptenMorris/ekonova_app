
"use client";

import type { FC, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Coins,
  LayoutDashboard,
  BarChart3,
  CreditCard,
  ShoppingCart,
  Sparkles,
  Settings,
  LogOut,
  UserCircle,
  Loader2,
  HelpCircle,
  LifeBuoy,
  Bot,
} from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import Logo from '@/components/shared/logo';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import WhatsNewDialog from '@/components/shared/whats-new-dialog';
import WelcomeGuideDialog from '@/components/shared/welcome-guide-dialog';
import { useAppVersionInfo, AppVersionInfoProvider } from '@/contexts/AppVersionContext';

interface AppLayoutProps {
  children: ReactNode;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const staticNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Kontrollpanel', icon: LayoutDashboard },
  { href: '/oversikt', label: 'Ekonomisk Översikt', icon: BarChart3 },
  { href: '/rakningar', label: 'Räkningar', icon: CreditCard },
  { href: '/handla', label: 'Handla', icon: ShoppingCart },
  { href: '/ai-budgetradgivare', label: 'AI Budgetrådgivare', icon: Sparkles },
  { href: '/ai-support', label: 'AI Support', icon: Bot },
  { href: '/hjalp', label: 'Hjälp', icon: HelpCircle },
  { href: '/support', label: 'Support', icon: LifeBuoy },
  { href: '/kontoinstallningar', label: 'Kontoinställningar', icon: Settings },
];


const AppLayoutInner: FC<{
  currentUser: User;
  logOut: () => void;
  pathname: string;
  children: ReactNode;
  hasSeenWelcomeGuide: boolean | null;
  markWelcomeGuideAsSeen: () => Promise<void>;
}> = ({ currentUser, logOut, pathname, children, hasSeenWelcomeGuide, markWelcomeGuideAsSeen }) => {
  const { isMobile, setOpenMobile } = useSidebar();
  const { latestVersionInfo, showWhatsNewDialog, closeWhatsNewDialog, isLoadingVersionInfo } = useAppVersionInfo(); 
  const [displayWelcomeDialog, setDisplayWelcomeDialog] = useState(false);

  const userDisplayName = currentUser.displayName || currentUser.email || 'Användare';
  const userEmail = currentUser.email || 'Ingen e-post';
  const userAvatarFallback = (userDisplayName.split(' ').map(n => n[0]).join('') || userEmail[0] || 'A').toUpperCase();

  const navItems = useMemo(() => staticNavItems, []);

  const currentPage = navItems.find(item => pathname.startsWith(item.href));
  const pageTitle = currentPage ? currentPage.label : 'Ekonova';


  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.title = pageTitle;
    }
  }, [pageTitle]);

  useEffect(() => {
    // Show welcome guide if user exists, guide hasn't been seen, and we're not already showing it
    if (currentUser && hasSeenWelcomeGuide === false && !displayWelcomeDialog) {
      setDisplayWelcomeDialog(true);
    }
  }, [currentUser, hasSeenWelcomeGuide, displayWelcomeDialog]);

  const handleCloseWelcomeDialog = async () => {
    setDisplayWelcomeDialog(false);
    await markWelcomeGuideAsSeen();
  };


  return (
    <>
      <Sidebar variant="sidebar" className="border-r">
        <SidebarHeader className="p-4 flex items-center justify-between">
          <Logo />
          <SidebarTrigger className="md:hidden" />
        </SidebarHeader>
        <SidebarContent className="p-2">
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href} passHref legacyBehavior>
                  <SidebarMenuButton
                    isActive={pathname === item.href || (item.href === '/dashboard' && pathname === '/')}
                    tooltip={{ children: item.label, className: "capitalize" }}
                    className="justify-start font-semibold"
                    onClick={() => {
                      if (isMobile) {
                        setOpenMobile(false);
                      }
                    }}
                  >
                    <item.icon className="mr-2 h-5 w-5" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-4 border-t">
          <div className="flex items-center gap-3 mb-4">
            <Avatar>
              <AvatarImage src={currentUser.photoURL || `https://placehold.co/100x100.png?text=${userAvatarFallback}`} alt={userDisplayName} data-ai-hint="profile avatar"/>
              <AvatarFallback>{userAvatarFallback}</AvatarFallback>
            </Avatar>
            <div className="text-sm flex-1 min-w-0">
              <p className="font-semibold text-sidebar-foreground break-words">{userDisplayName}</p>
              <p className="text-xs text-sidebar-foreground/70 break-words">{userEmail}</p>
            </div>
          </div>
          <Separator className="my-2 bg-sidebar-border" />
           <div className="flex items-center justify-between mt-2">
            <ThemeToggle />
          </div>
           <Button
              variant="ghost"
              size="sm"
              className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full justify-start gap-2 mt-2"
              onClick={logOut}
            >
              <LogOut className="h-5 w-5" />
              <span className="group-data-[collapsible=icon]:hidden">Logga ut</span>
            </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-md md:px-6 lg:h-[60px]">
           <SidebarTrigger className="md:hidden h-8 w-8" />
           <SidebarTrigger className="hidden md:flex"/>
           <div className="flex-1">
             <h1 className="text-lg font-semibold text-foreground">
                {pageTitle}
             </h1>
           </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </SidebarInset>
      
      {!isLoadingVersionInfo && (
        <WhatsNewDialog
          isOpen={showWhatsNewDialog}
          onClose={closeWhatsNewDialog}
          versionInfo={latestVersionInfo}
        />
      )}
      
      <WelcomeGuideDialog 
        isOpen={displayWelcomeDialog}
        onClose={handleCloseWelcomeDialog}
        showEnticingText={true} 
      />
    </>
  );
};


const AppLayout: FC<AppLayoutProps> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, loading, logOut, hasSeenWelcomeGuide, markWelcomeGuideAsSeen } = useAuth(); 

  useEffect(() => {
    if (!loading && !currentUser) {
      router.replace('/'); 
    }
  }, [currentUser, loading, router]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.title = 'Ekonova';
    }
  }, []);


  if (loading || !currentUser) { 
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppVersionInfoProvider>
      <SidebarProvider defaultOpen collapsible="icon">
        <AppLayoutInner
          currentUser={currentUser}
          logOut={logOut}
          pathname={pathname}
          hasSeenWelcomeGuide={hasSeenWelcomeGuide}
          markWelcomeGuideAsSeen={markWelcomeGuideAsSeen}
        >
          {children}
        </AppLayoutInner>
      </SidebarProvider>
    </AppVersionInfoProvider>
  );
};

export default AppLayout;
