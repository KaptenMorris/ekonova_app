
// src/app/(app)/support/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Send } from 'lucide-react';

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

    let emailBody = `Hej,

Jag hoppas att detta meddelande når dig väl.

Har du hittat en bugg? : 

Har du synpunkter? : 

Har du förslag på förbättringar för Ekonova? : 

Uppskattar att du tar dig tid att hjälpa till att förbättra Ekonova :)
`;

    let userContactInfo = "";
    if (inputEmail) {
      userContactInfo = inputEmail;
    } else if (currentUser?.email) {
      userContactInfo = currentUser.email;
    }

    if (userContactInfo) {
      emailBody += `\n\n--------------------\nAvsändare: ${userContactInfo}\n--------------------\n`;
    } else {
      emailBody += `\n\n--------------------\nAvsändare: [Vänligen fyll i din e-postadress här]\n--------------------\n`;
    }
    
    emailBody += `\nMed vänliga hälsningar,\nMarius`;

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
            Har du frågor, hittat en bugg, eller har du förslag på förbättringar? Skicka ett mail till oss!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <Label htmlFor="email">Din E-post (för referens i mailet)</Label>
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
            <Button onClick={handleOpenMailClient} className="w-full">
              <Send className="mr-2 h-4 w-4" />
              Skicka Ärende via E-post
            </Button>
          </div>
          <p className="text-xl text-muted-foreground mt-6 text-center">
            För direktkontakt via e-post, använd <a href={`mailto:info@marius-christensen.se`} className="underline hover:text-primary">info@marius-christensen.se</a>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
