
// src/app/(app)/support/page.tsx
"use client";

import React, { useState, FormEvent } from 'react';
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

  const userEmail = currentUser?.email || '';


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!subject.trim() || !message.trim()) {
      setFormError("Vänligen fyll i både ämne och meddelande.");
      return;
    }

    setIsSubmitting(true);

    try {
      const supportTicketsRef = collection(db, 'supportTickets');
      await addDoc(supportTicketsRef, {
        userId: currentUser?.uid || null,
        userName: currentUser?.displayName || null,
        userEmail: userEmail, // Use the email from auth context, or allow user to input if not logged in
        subject: subject,
        message: message,
        status: 'new', // Initial status
        createdAt: serverTimestamp(),
        updatedAt: null,
        adminNotes: null,
      });

      setFormSuccess("Ditt meddelande har skickats! Vi återkommer så snart som möjligt.");
      toast({
        title: "Meddelande Skickat",
        description: "Tack för ditt meddelande. Vi har tagit emot ditt ärende.",
      });
      setSubject('');
      setMessage('');
    } catch (error) {
      console.error("Error submitting support ticket:", error);
      setFormError("Kunde inte skicka meddelandet. Försök igen senare eller kontakta oss direkt på marius83christensen@gmail.com.");
      toast({
        title: "Fel",
        description: "Ett fel uppstod när meddelandet skulle skickas.",
        variant: "destructive",
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
                  value={userEmail}
                  placeholder="din.email@example.com"
                  disabled // E-post från inloggad användare, kan inte ändras här om currentUser finns
                  readOnly={!!currentUser} // Make it truly readonly if user is logged in
                  required={!currentUser} // Required if not logged in
                  onChange={e => !currentUser && setFormError(null) /* Basic handling for non-logged in users if email was editable */}
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
            Vid akuta problem eller om formuläret inte fungerar, kan du också kontakta oss direkt på <a href={`mailto:marius83christensen@gmail.com`} className="underline hover:text-primary">marius83christensen@gmail.com</a>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
