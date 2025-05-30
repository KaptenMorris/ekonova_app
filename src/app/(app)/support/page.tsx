
// src/app/(app)/support/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Send } from 'lucide-react';
// Removed: import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
// Removed: import { db } from '@/lib/firebase';
// Removed: import { Alert, AlertTitle, AlertDescription as ShadAlertDescription } from "@/components/ui/alert";
// Removed: import { AlertCircle, CheckCircle } from 'lucide-react';
// Removed: import { useToast } from '@/hooks/use-toast';


export default function SupportPage() {
  const { currentUser, loading: authLoading } = useAuth();
  // Removed: const { toast } = useToast();
  // Removed: const [isSubmitting, setIsSubmitting] = useState(false);
  // Removed: const [formError, setFormError] = useState<string | null>(null);
  // Removed: const [formSuccess, setFormSuccess] = useState<string | null>(null);
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
    const subject = "Supportärende från Ekonova";
    let body = `Kontakta mig angående ett supportärende.`;
    if (inputEmail) {
      body += `\n\nMin e-postadress: ${inputEmail}`;
    } else if (currentUser?.email) {
       body += `\n\nMin e-postadress: ${currentUser.email}`;
    } else {
       body += `\n\nVar vänlig ange din e-postadress i detta mail så vi kan svara dig.`
    }

    const mailtoLink = `mailto:${emailTo}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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
          {/* Removed formSuccess and formError alerts */}
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
                {currentUser?.email ? "Detta är din registrerade e-postadress. Den kommer inkluderas i mailet." : "Ange din e-postadress så den kan inkluderas i mailet."}
              </p>
            </div>
            <Button onClick={handleOpenMailClient} className="w-full">
              <Send className="mr-2 h-4 w-4" />
              Skicka Ärende via E-post
            </Button>
          </div>
          <p className="text-lg text-muted-foreground mt-6 text-center">
            För direktkontakt via e-post, använd <a href={`mailto:info@marius-christensen.se`} className="underline hover:text-primary">info@marius-christensen.se</a>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
