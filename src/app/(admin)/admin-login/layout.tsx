// src/app/(admin)/admin-login/layout.tsx
import type { ReactNode, FC } from 'react';
import Logo from '@/components/shared/logo';
import { ThemeProvider } from '@/components/theme-provider'; 
import { Toaster } from "@/components/ui/toaster";

interface AdminAuthLayoutProps {
  children: ReactNode;
}

const AdminAuthLayout: FC<AdminAuthLayoutProps> = ({ children }) => {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange 
    >
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <div className="mb-8">
          <Logo iconSize={48} textSize="text-4xl" />
          <p className="text-center text-muted-foreground mt-2">Adminportal</p>        
        </div>
        <div className="w-full max-w-md">
          {children}
        </div>
        <Toaster /> 
      </div>
    </ThemeProvider>
  );
};

export default AdminAuthLayout;
