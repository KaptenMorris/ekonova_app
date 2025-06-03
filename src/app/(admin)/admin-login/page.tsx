// src/app/(admin)/admin-login/page.tsx
"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, FormEvent, useEffect } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription as ShadAlertDescription, AlertTitle as ShadAlertTitle } from "@/components/ui/alert";
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase'; // Added db
import { doc, getDoc } from 'firebase/firestore'; // Added doc and getDoc
import { useToast } from '@/hooks/use-toast';

// Removed: const ADMIN_EMAIL = "admin@ekonova.se"; 

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined') {
        document.title = 'Admin Inloggning - Ekonova';
    }
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (user && user.uid) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists() && userDocSnap.data()?.isAdmin === true) {
          if (typeof window !== 'undefined') {
            localStorage.setItem('isAdminAuthenticated', 'true');
          }
          toast({ title: "Admin Inloggning Lyckades", description: "Välkommen till adminportalen." });
          router.push('/admin-dashboard');
        } else {
          // Not an admin or document doesn't exist/isAdmin field missing
          if (auth.currentUser) { // Ensure we sign out the user that just attempted login
              await auth.signOut(); 
          }
          setError('Åtkomst nekad. Endast auktoriserade administratörer med isAdmin-flaggan satt.');
          toast({ title: "Admin Inloggning Misslyckades", description: "Åtkomst nekad. Användaren är inte administratör.", variant: "destructive" });
        }
      } else {
        // Should not happen if signInWithEmailAndPassword was successful, but as a fallback
        if (auth.currentUser) {
            await auth.signOut();
        }
        setError('Ett oväntat fel inträffade vid verifiering av användarstatus.');
        toast({ title: "Admin Inloggning Misslyckades", description: "Kunde inte verifiera användarstatus.", variant: "destructive" });
      }
    } catch (err: any) {
      console.error("Admin login error:", err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-disabled' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-email') {
        setError('Felaktig e-postadress eller lösenord.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('För många inloggningsförsök. Försök igen senare.');
      } else {
        setError('Ett oväntat fel inträffade vid inloggning. Försök igen senare.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl">Admin Inloggning</CardTitle>
        <CardDescription>Logga in med ditt Ekonova-konto för att komma åt adminportalen.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <ShadAlertTitle>Fel</ShadAlertTitle>
            <ShadAlertDescription>{error}</ShadAlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">E-post</Label>
            <Input id="email" type="email" placeholder="din.email@example.com" required value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Lösenord</Label>
            <Input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Logga in som Admin'}
          </Button>
        </form>
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">Logga in med ditt vanliga Ekonova-konto. Adminstatus verifieras via databasen.</p>
      </CardFooter>
    </Card>
  );
}
