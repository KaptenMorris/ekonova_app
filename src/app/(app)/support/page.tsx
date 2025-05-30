
// src/app/(app)/support/page.tsx
"use client";

import React, { useState, FormEvent, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// Textarea is no longer needed for the message field
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Send, CheckCircle, AlertCircle, MessageSquarePlus } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Alert, AlertTitle, AlertDescription as ShadAlertDescription } from "@/components/ui/alert";


export default function SupportPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const { toast } = useToast();
  // Removed subject and message state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [inputEmail, setInputEmail] = useState('');

  useEffect(() => {
    if (currentUser) {
      setInputEmail(currentUser.email || '');
    } else {
      setInputEmail('');
    }
  }, [currentUser]);

  const resetFormAndState = () => {
    // Removed subject and message reset
    if (!currentUser && formSuccess) { 
      // inputEmail is intentionally kept if not logged in and form was successful
    }
    setFormError(null);
    setFormSuccess(null); 
    setIsSubmitting(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const emailToSend = currentUser ? (currentUser.email || '') : inputEmail.trim();

    if (!emailToSend) {
        setFormError("E-postadress måste anges.");
        return;
    }
    if (!currentUser && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToSend)) {
        setFormError("Vänligen ange en giltig e-postadress.");
        return;
    }

    setIsSubmitting(true);

    try {
      await addDoc(collection(db, "supportTickets"), {
        userEmail: emailToSend,
        userId: currentUser?.uid || null,
        // subject and message are no longer sent
        status: "new",
        createdAt: serverTimestamp()
      });

      setFormSuccess("Ditt ärende har skickats till supporten! Vi återkommer så snart som möjligt via den angivna e-postadressen.");
      toast({
        title: "Ärende Skickat!",
        description: "Tack för ditt meddelande.",
      });
      // Do not reset inputEmail if user is not logged in, they might want to send another with same email
    } catch (error: any) {
      console.error("Error sending support ticket:", error);
      let detailedErrorMessage = "Kunde inte skicka ditt ärende. Försök igen senare eller kontakta oss direkt via e-post.";
      if (error.code) {
        detailedErrorMessage += ` (Felkod: ${error.code})`;
      }
      if (error.message && error.code !== 'permission-denied' && error.code !== 'PERMISSION_DENIED') {
        console.error("Firebase error message details:", error.message);
      }
      setFormError(detailedErrorMessage);
      toast({
        title: "Fel vid skickande",
        description: detailedErrorMessage,
        variant: "destructive",
        duration: 10000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (authLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /> Laddar...</div>;
  }


  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl">Support & Felanmälan</CardTitle>
          <CardDescription>
            Har du frågor, hittat en bugg, eller har du förslag på förbättringar? Skicka ett meddelande till oss!
          </CardDescription>
        </CardHeader>
        <CardContent>
          {formError && !formSuccess && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Fel vid skickande</AlertTitle>
              <ShadAlertDescription>{formError}</ShadAlertDescription>
            </Alert>
          )}
          {formSuccess && (
            <div className="mb-4 space-y-4">
              <Alert variant="default" className="border-green-500 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700 [&>svg]:text-green-600 dark:[&>svg]:text-green-500">
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Ärende Skickat!</AlertTitle>
                <ShadAlertDescription>{formSuccess}</ShadAlertDescription>
              </Alert>
              <Button onClick={resetFormAndState} className="w-full">
                <MessageSquarePlus className="mr-2 h-4 w-4" /> Starta ett nytt ärende
              </Button>
            </div>
          )}
          {!formSuccess && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="email">Din E-post</Label>
                <Input
                  id="email"
                  type="email"
                  value={inputEmail}
                  placeholder="din.email@example.com"
                  disabled={!!currentUser?.email || isSubmitting} 
                  readOnly={!!currentUser?.email} 
                  required={!currentUser}
                  onChange={e => {
                    if (!currentUser) {
                      setInputEmail(e.target.value);
                    }
                    if (formError) setFormError(null); 
                  }}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {currentUser?.email ? "Detta är din registrerade e-postadress." : "Ange din e-postadress så vi kan kontakta dig."}
                </p>
              </div>
              {/* Subject field removed */}
              {/* Message field removed */}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Skicka Ärende
              </Button>
            </form>
          )}
           <p className="text-xs text-muted-foreground mt-4 text-center">
            För direktkontakt via e-post, använd <a href={`mailto:info@marius-christensen.se`} className="underline hover:text-primary">info@marius-christensen.se</a>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

