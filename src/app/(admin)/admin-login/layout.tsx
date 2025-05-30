// src/app/(admin)/admin-login/layout.tsx
import type { ReactNode, FC } from 'react';
import Logo from '@/components/shared/logo';
import { ThemeProvider } from '@/components/theme-provider'; // Keep this if ThemeProvider is used on login
import { Toaster } from "@/components/ui/toaster"; // Keep this if Toaster is used

interface AdminAuthLayoutProps {
  children: ReactNode;
}

const AdminAuthLayout: FC<AdminAuthLayoutProps> = ({ children }) => {
  return (
    // ThemeProvider is moved to the root AdminLayout or individual page if needed
    // For simplicity, if login page doesn't need its own ThemeProvider distinct from root, remove this.
    // Assuming admin-login pages might want their own theme context for now.
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange // Important for nested providers if any
    >
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <div className="mb-8">
          <Logo iconSize={48} textSize="text-4xl" />
          <p className="text-center text-muted-foreground mt-2">Adminportal</p>        
        </div>
        <div className="w-full max-w-md">
          {children}
        </div>
        <Toaster /> {/* Ensures toasts can appear on the login page */}
      </div>
    </ThemeProvider>
  );
};

export default AdminAuthLayout;
