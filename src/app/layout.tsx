
import './globals.css';
import { Inter } from 'next/font/google';
import React from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from "@/components/ui/toaster";
// import { AppVersionInfoProvider } from '@/contexts/AppVersionContext';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Ekonova - Din partner för en smartare ekonomi" />
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
        <title>Ekonova</title>
      </head>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {/* <AppVersionInfoProvider> */}
              {children}
              <Toaster />
            {/* </AppVersionInfoProvider> */}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

