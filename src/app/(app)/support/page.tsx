
// src/app/(app)/support/page.tsx
"use client";

import React, { useState, FormEvent, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Alert, AlertTitle, AlertDescription as ShadAlertDescription } from "@/components/ui/alert";


export default function SupportPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!subject.trim() || !message.trim()) {
      setFormError("Vänligen fyll i både ämne och meddelande.");
      return;
    }

    const emailToSend = currentUser ? (currentUser.email || '') : inputEmail.trim();

    if (!emailToSend) {
        setFormError("E-postadress måste anges.");
        return;
    }

    setIsSubmitting(true);

    try {
      await addDoc(collection(db, "supportTickets"), {
        userEmail: emailToSend,
        userId: currentUser?.uid || null,
        subject: subject,
        message: message,
        status: "new",
        createdAt: serverTimestamp()
      });

      setFormSuccess("Ditt meddelande har skickats till supporten! Vi återkommer så snart som möjligt.");
      toast({
        title: "Meddelande Skickat!",
        description: "Tack för ditt meddelande.",
      });
      setSubject('');
      setMessage('');
      if (!currentUser) {
        setInputEmail('');
      }
    } catch (error: any) {
      console.error("Error sending support ticket:", error);
      let detailedErrorMessage = "Kunde inte skicka ditt meddelande. Försök igen senare eller kontakta oss direkt via e-post.";
      if (error.code) {
        detailedErrorMessage += ` (Felkod: ${error.code})`;
      }
      // Undvik att logga hela error.message i consolen om det är ett vanligt permission-denied, då koden redan visas.
      if (error.message && error.code !== 'permission-denied' && error.code !== 'PERMISSION_DENIED') {
        console.error("Firebase error message details:", error.message);
      }
      setFormError(detailedErrorMessage);
      toast({
        title: "Fel vid skickande",
        description: detailedErrorMessage,
        variant: "destructive",
        duration: 10000, // Längre tid för att hinna se felkoden
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
          {formError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Fel vid skickande</AlertTitle>
              <ShadAlertDescription>{formError}</ShadAlertDescription>
            </Alert>
          )}
          {formSuccess && (
            <Alert variant="default" className="mb-4 border-green-500 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700 [&>svg]:text-green-600 dark:[&>svg]:text-green-500">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Meddelande Skickat!</AlertTitle>
              <ShadAlertDescription>{formSuccess}</ShadAlertDescription>
            </Alert>
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
                  disabled={!!currentUser} 
                  readOnly={!!currentUser} 
                  required={!currentUser}
                  onChange={e => {
                    if (!currentUser) {
                      setInputEmail(e.target.value);
                    }
                    if (formError) setFormError(null); // Rensa felmeddelande vid ändring
                  }}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {currentUser ? "Detta är din registrerade e-postadress." : "Ange din e-postadress så vi kan kontakta dig."}
                </p>
              </div>
              <div>
                <Label htmlFor="subject">Ämne</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Kort beskrivning av ditt ärende"
                  required
                />
              </div>
              <div>
                <Label htmlFor="message">Meddelande</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Beskriv ditt ärende, din fråga eller bugg så detaljerat som möjligt."
                  rows={6}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Skicka Meddelande
              </Button>
            </form>
          )}
           <p className="text-xs text-muted-foreground mt-4 text-center">
            Meddelanden sparas internt. För direktkontakt via e-post, använd <a href={`mailto:info@marius-christensen.se`} className="underline hover:text-primary">info@marius-christensen.se</a>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
