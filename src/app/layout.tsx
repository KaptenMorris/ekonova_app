
"use client";

// import type { Metadata } from 'next'; // Borttagen oanvänd import
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from "@/components/ui/toaster";
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/contexts/AuthContext';
import React, { useEffect } from 'react';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

// HMR Nudge Comment - vFINAL_LAYOUT_ATTEMPT_Y - 2024-08-15T10:00:00Z
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
    // Another HMR diagnostic comment - v6
    if (typeof window !== 'undefined') {
      document.title = 'Ekonova'; // Default title
    }
  }, []);

  return (
    <html lang="sv" suppressHydrationWarning data-app-version="1.0.0-a">
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
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

