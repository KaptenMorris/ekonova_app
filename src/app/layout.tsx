
import './globals.css';
import { Inter } from 'next/font/google';
import React from 'react';

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
        <meta name="description" content="Ekonova - Debug Mode" />
        {/* Manifest link temporarily removed to reduce failure points if missing */}
        {/* <link rel="manifest" href="/manifest.json" /> */}
        <meta name="theme-color" content="#FFFFFF" />
        <title>Ekonova - Debug</title>
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <main style={{ padding: '20px', border: '2px dashed blue', margin: '10px' }}>
          <h1 style={{color: 'blue', fontSize: '24px'}}>Simplified Layout Loaded</h1>
          <p>If you see this, the basic layout is rendering.</p>
          <div style={{ border: '1px solid green', padding: '10px', marginTop: '10px' }}>
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
