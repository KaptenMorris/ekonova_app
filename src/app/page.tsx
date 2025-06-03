
"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import Logo from '@/components/shared/logo';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

// Diagnostic comment for HMR stability test - v2024-08-16-E
// Further diagnostic for Firestore permission issues.
// Attempting to pinpoint source of persistent "Missing or insufficient permissions"
// Diagnostic HMR/Restart Nudge - 2024-08-16 - Ensure dev server is restarted after rule changes.
export default function HomePage() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p>Laddar...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted/30 p-4">
      <Card className="w-full max-w-md text-center shadow-2xl">
        <CardHeader className="pb-4">
          <div className="flex justify-center mb-6">
            <Logo iconSize={64} textSize="text-5xl" />
          </div>
          <CardTitle className="text-4xl font-bold tracking-tight">Välkommen till Ekonova</CardTitle>
          <CardDescription className="text-lg text-muted-foreground pt-2">
            Din intelligenta partner för en sundare ekonomi.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            Ta kontroll över dina finanser, sätt upp budgetar, spåra utgifter och få smarta insikter med hjälp av AI.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {currentUser ? (
              <Button asChild size="lg" className="flex-1">
                <Link href="/dashboard">Gå till Kontrollpanelen</Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg" className="flex-1">
                  <Link href="/logga-in">Logga In</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="flex-1">
                  <Link href="/registrera">Skapa Konto</Link>
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Ekonova. Alla rättigheter förbehållna.</p>
        <p className="mt-1">
          <Link href="/admin-login" className="hover:underline">Adminportal</Link>
        </p>
      </footer>
    </div>
  );
}
