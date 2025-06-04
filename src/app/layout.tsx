
import './globals.css';
import { Inter } from 'next/font/google';
import React from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from "@/components/ui/toaster";
import { AppVersionInfoProvider } from '@/contexts/AppVersionContext';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  console.log(`RootLayout rendering/re-evaluating... (Reintroducing Providers - ${new Date().toISOString()})`);
  return (
    <html lang="sv" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Ekonova - Din partner för en smartare ekonomi" />
        <link rel="icon" href="/favicon.png" type="image/png" />
        <title>Ekonova</title>
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <AppVersionInfoProvider> {/* Added AppVersionInfoProvider back as it's part of standard setup */}
              {children}
              <Toaster />
            </AppVersionInfoProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
