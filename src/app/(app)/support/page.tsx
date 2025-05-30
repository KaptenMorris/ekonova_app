
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
import { Loader2, Send } from 'lucide-react';

export default function SupportPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userEmail = currentUser?.email || '';
  const supportEmailAddress = "marius83christensen@gmail.com"; // Uppdaterad e-postadress

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast({
        title: "Fel",
        description: "Vänligen fyll i både ämne och meddelande.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    const mailtoLink = `mailto:${supportEmailAddress}` +
      `?subject=${encodeURIComponent("Ekonova Support: " + subject)}` +
      `&body=${encodeURIComponent(
        "Från: " + (userEmail || "Ej specificerad användare") +
        "\nUID: " + (currentUser?.uid || "Ej inloggad") +
        "\n\nMeddelande:\n" + message
      )}`;

    // Försök öppna mailto-länken
    window.location.href = mailtoLink;

    // Ge lite tid för e-postklienten att öppnas
    setTimeout(() => {
      toast({
        title: "Supportförfrågan Skickad (via e-postklient)",
        description: "Ditt standard e-postprogram bör ha öppnats. Om inte, vänligen skicka ditt ärende manuellt till " + supportEmailAddress,
        duration: 10000,
      });
      setSubject('');
      setMessage('');
      setIsSubmitting(false);
    }, 1500);
  };
  
  if (authLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /> Laddar...</div>;
  }

  // Ingen inloggningskoll här, support kan vara tillgängligt för alla
  // men e-post kan vara bra att ha från inloggad användare.

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl">Support & Felanmälan</CardTitle>
          <CardDescription>
            Har du frågor, hittat en bugg, eller har du förslag på förbättringar? Skicka ett meddelande till oss!
            Observera: Denna funktion öppnar din e-postklient.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="email">Din E-post (om du vill ha svar)</Label>
              <Input
                id="email"
                type="email"
                value={userEmail}
                placeholder="din.email@example.com"
                disabled // E-post från inloggad användare, kan inte ändras här
              />
               <p className="text-xs text-muted-foreground mt-1">Detta är din registrerade e-postadress.</p>
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
              Skicka via E-postklient
            </Button>
          </form>
           <p className="text-xs text-muted-foreground mt-4 text-center">
            Om du föredrar, kan du också kontakta oss direkt på <a href={`mailto:${supportEmailAddress}`} className="underline hover:text-primary">{supportEmailAddress}</a>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
