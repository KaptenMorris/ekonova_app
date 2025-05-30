
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, FormEvent, useEffect } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription as ShadAlertDescription, AlertTitle as ShadAlertTitle } from "@/components/ui/alert";
// Removed: import { useTranslation } from '@/hooks/useTranslation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { logIn, currentUser } = useAuth();
  const router = useRouter();
  // Removed: const { t } = useTranslation();

  useEffect(() => {
    if (currentUser) {
      router.replace('/dashboard');
    }
  }, [currentUser, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await logIn(email, password);
      router.push('/dashboard'); 
    } catch (err: any) {
      console.error("Login error details:", err); 
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-email') {
        setError('Felaktig e-postadress eller lösenord. Kontrollera dina uppgifter och försök igen.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('För många inloggningsförsök. Återställ ditt lösenord eller försök igen senare.');
      } else if (err.code === 'auth/user-disabled') {
        setError('Detta användarkonto har inaktiverats.');
      }
      else {
        setError('Ett oväntat fel inträffade vid inloggning. Försök igen senare.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.title = 'Logga in - Ekonova'; // Reverted
    }
  }, []);

  if (currentUser) { 
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl">Logga in</CardTitle>
        <CardDescription>Ange din e-postadress och lösenord för att komma åt ditt konto.</CardDescription>
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
            <Input id="email" type="email" placeholder="namn@exempel.com" required value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Lösenord</Label>
            <Input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <div className="flex items-center">
            <Link href="#" className="ml-auto inline-block text-sm underline text-muted-foreground hover:text-primary">
              Glömt lösenord?
            </Link>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Logga in'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-2 text-center">
        <p className="text-sm text-muted-foreground">
          Har du inget konto?{' '}
          <Link href="/registrera" className="underline hover:text-primary">
            Registrera dig
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
