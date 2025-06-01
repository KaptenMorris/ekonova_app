
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, FormEvent, useEffect } from 'react';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription as ShadAlertDescription, AlertTitle as ShadAlertTitle } from "@/components/ui/alert";
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { sendPasswordReset, currentUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.title = 'Återställ Lösenord - Ekonova';
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      // Om användaren redan är inloggad, omdirigera till dashboard.
      // Detta kan hända om de navigerar hit manuellt.
      router.replace('/dashboard');
    }
  }, [currentUser, router]);


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await sendPasswordReset(email);
      setSuccessMessage('Om ett konto existerar för denna e-postadress har ett e-postmeddelande för återställning skickats. Kontrollera din inkorg (och skräppost).');
      setEmail(''); // Rensa fältet efter lyckat försök
    } catch (err: any) {
      console.error("Password reset error details:", err);
      if (err.code === 'auth/invalid-email') {
        setError('E-postadressen är ogiltig.');
      } else if (err.code === 'auth/user-not-found') {
        // Vi vill inte avslöja om en e-post existerar eller inte av säkerhetsskäl,
        // så vi visar samma meddelande som vid lyckat försök.
        setSuccessMessage('Om ett konto existerar för denna e-postadress har ett e-postmeddelande för återställning skickats. Kontrollera din inkorg (och skräppost).');
      } else if (err.code === 'auth/too-many-requests'){
        setError('För många försök att återställa lösenordet från den här enheten. Försök igen senare.');
      }
       else {
        setError('Ett oväntat fel inträffade. Försök igen senare.');
      }
    } finally {
      setIsLoading(false);
    }
  };

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
        <CardTitle className="text-2xl">Återställ Lösenord</CardTitle>
        <CardDescription>Ange din e-postadress så skickar vi en länk för att återställa ditt lösenord.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <ShadAlertTitle>Fel</ShadAlertTitle>
            <ShadAlertDescription>{error}</ShadAlertDescription>
          </Alert>
        )}
        {successMessage && (
          <Alert variant="default" className="border-green-500 bg-green-50 dark:bg-green-900/30 dark:border-green-700">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <ShadAlertTitle className="text-green-700 dark:text-green-300">E-post Skickad</ShadAlertTitle>
            <ShadAlertDescription className="text-green-600 dark:text-green-400">{successMessage}</ShadAlertDescription>
          </Alert>
        )}
        {!successMessage && (
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">E-post</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="namn@exempel.com" 
                required 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Skicka återställningslänk'}
            </Button>
          </form>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-2 text-center">
        <p className="text-sm text-muted-foreground">
          Kommer du ihåg ditt lösenord?{' '}
          <Link href="/logga-in" className="underline hover:text-primary">
            Logga in här
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
