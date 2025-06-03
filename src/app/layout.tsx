
"use client";

// HMR Nudge Comment - vFINAL_LAYOUT_ATTEMPT_Z_PROVIDER_NEST - 2024-08-15T14:30:00Z
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from "@/components/ui/toaster";
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/contexts/AuthContext';
import React, { useEffect } from 'react';
import { AppVersionInfoProvider } from '@/contexts/AppVersionContext';


const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // console.log(`RootLayout rendering/re-evaluating... (HMR Checkpoint vFINAL - ${new Date().toISOString()})`); // Removed this diagnostic log
  useEffect(() => {
    // Service Worker registration logic
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered with scope:', registration.scope);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.title = 'Ekonova'; // Default title
    }
  }, []);

  return (
    <html lang="sv" suppressHydrationWarning data-app-version="1.0.0-a-final">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Din personliga ekonomi app" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#73A580" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Ekonova" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider>
          <AppVersionInfoProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
              <Toaster />
            </ThemeProvider>
          </AppVersionInfoProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

