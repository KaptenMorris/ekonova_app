
// src/app/(app)/support/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Send, Info } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function SupportPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const [inputEmail, setInputEmail] = useState('');

  useEffect(() => {
    if (currentUser) {
      setInputEmail(currentUser.email || '');
    } else {
      setInputEmail('');
    }
  }, [currentUser]);

  const handleOpenMailClient = () => {
    const emailTo = "info@marius-christensen.se";
    const subjectLine = "Återkoppling för Ekonova";

    let emailBody = `Hej Ekonova Team,

Jag kontaktar er angående Ekonova-appen.

----------------------------------------
ÄRENDETYP: (Vänligen specificera: t.ex. Bugg, Förslag, Fråga, Allmän feedback)
----------------------------------------
*   


----------------------------------------
BESKRIVNING AV DITT ÄRENDE:
----------------------------------------
*   
   (Om det är en bugg, inkludera gärna:
    - Vad du försökte göra.
    - Vad som hände.
    - Vad du förväntade dig skulle hända.
    - Eventuella felmeddelanden.
    - Steg för att återskapa problemet, om möjligt.)


----------------------------------------
EV. YTTERLIGARE INFORMATION SOM KAN VARA TILL HJÄLP:
----------------------------------------
*   


Tack för att ni hjälper till att göra Ekonova bättre!
`;

    let userContactInfo = "";
    if (inputEmail) {
      userContactInfo = inputEmail;
    } else if (currentUser?.email) {
      userContactInfo = currentUser.email;
    }

    if (userContactInfo) {
      emailBody += `\n\n--------------------\nFrån Ekonova-användare: ${userContactInfo}\nAnvändar-ID (om känt och relevant): [Fyll i ditt UID från Kontoinställningar om det hjälper]\n--------------------\n`;
    } else {
      emailBody += `\n\n--------------------\nFrån Ekonova-användare: [Vänligen fyll i din e-postadress här för svar]\nAnvändar-ID (om känt och relevant): [Fyll i ditt UID från Kontoinställningar om det hjälper]\n--------------------\n`;
    }
    
    emailBody += `\nMed vänliga hälsningar,\nTeamet bakom Ekonova`;

    const mailtoLink = `mailto:${emailTo}?subject=${encodeURIComponent(subjectLine)}&body=${encodeURIComponent(emailBody)}`;
    window.location.href = mailtoLink;
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
            Har du frågor, hittat en bugg, eller har du förslag på förbättringar? Skicka ett mail till oss! Ditt ärende öppnas i din vanliga e-postklient.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="email">Din E-post (förifylls i mailet som referens)</Label>
            <Input
              id="email"
              type="email"
              value={inputEmail}
              placeholder="din.email@example.com"
              disabled={!!currentUser?.email} 
              readOnly={!!currentUser?.email} 
              onChange={e => {
                if (!currentUser) {
                  setInputEmail(e.target.value);
                }
              }}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {currentUser?.email ? "Detta är din registrerade e-postadress." : "Ange din e-postadress."}
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="subject-tips">
              <AccordionTrigger className="text-sm font-semibold">Tips för en bra ämnesrad (Rubrik)</AccordionTrigger>
              <AccordionContent className="text-sm">
                <Alert variant="default" className="mb-3">
                  <Info className="h-4 w-4" />
                  <AlertTitle className="text-sm">Standardämne</AlertTitle>
                  <AlertDescription>
                    När du klickar på knappen nedan kommer ämnet "Återkoppling för Ekonova" att förifyllas. Du kan ändra det i din e-postklient om du vill vara mer specifik.
                  </AlertDescription>
                </Alert>
                <p className="mb-2">För att hjälpa oss hantera ditt ärende snabbare, överväg en mer specifik ämnesrad:</p>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  <li><strong>Allmänt:</strong> "Feedback angående Ekonova-appen", "Fråga om Ekonova"</li>
                  <li><strong>Buggrapport:</strong> "Buggrapport: [Kort beskrivning av buggen] - Ekonova" (t.ex. "Buggrapport: Kan inte spara transaktion - Ekonova")</li>
                  <li><strong>Problem:</strong> "Problem med [Funktionens namn] i Ekonova" (t.ex. "Problem med Räkningar i Ekonova")</li>
                  <li><strong>Förslag:</strong> "Förslag till Ekonova: [Kort om förslaget]" (t.ex. "Förslag till Ekonova: Månadsrapporter")</li>
                  <li><strong>Synpunkt:</strong> "Synpunkter på Ekonova", "Tankar kring Ekonova-appen"</li>
                </ul>
                <p className="mt-3"><strong>Kom ihåg:</strong> Var specifik, håll det kort och inkludera "Ekonova"!</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <Button onClick={handleOpenMailClient} className="w-full" size="lg">
            <Send className="mr-2 h-4 w-4" />
            Öppna E-postklient för att Skicka Ärende
          </Button>

          <p className="text-sm text-muted-foreground mt-6 text-center">
            För direktkontakt via e-post, använd <a href={`mailto:info@marius-christensen.se`} className="underline hover:text-primary">info@marius-christensen.se</a>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

