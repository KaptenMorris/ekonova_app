
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

export default function RegisterPage() {
  const [name, setName] = useState(''); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signUp, currentUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (currentUser) {
      router.replace('/dashboard');
    }
  }, [currentUser, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Lösenorden matchar inte.");
      return;
    }
    if (!name.trim()) {
      setError("Namn måste anges.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await signUp(email, password, name); // Pass name to signUp
      // User will be redirected by onAuthStateChanged or fetchUserData in AuthContext
      // which now also creates the Firestore document.
      // router.push('/dashboard'); // This might be premature if Firestore doc creation is async
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError("E-postadressen används redan av ett annat konto.");
      } else if (err.code === 'auth/weak-password') {
        setError("Lösenordet är för svagt. Det måste vara minst 6 tecken.");
      } else if (err.code === 'auth/invalid-email') {
        setError("E-postadressen är ogiltig.");
      }
       else {
        setError('Kunde inte skapa konto. Försök igen.');
      }
      console.error("Registration error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.title = 'Skapa konto - Ekonova';
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
        <CardTitle className="text-2xl">Skapa konto</CardTitle>
        <CardDescription>Ange dina uppgifter för att skapa ett nytt konto.</CardDescription>
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
            <Label htmlFor="name">Namn</Label>
            <Input id="name" type="text" placeholder="Ditt Namn" required value={name} onChange={e => setName(e.target.value)}/>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">E-post</Label>
            <Input id="email" type="email" placeholder="namn@exempel.com" required value={email} onChange={e => setEmail(e.target.value)}/>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Lösenord</Label>
            <Input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)}/>
          </div>
           <div className="grid gap-2">
            <Label htmlFor="confirm-password">Bekräfta Lösenord</Label>
            <Input id="confirm-password" type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}/>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Registrera'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-2 text-center">
        <p className="text-sm text-muted-foreground">
          Har du redan ett konto?{' '}
          <Link href="/logga-in" className="underline hover:text-primary">
            Logga in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
