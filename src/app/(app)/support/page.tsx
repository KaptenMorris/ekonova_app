
// src/app/(app)/support/page.tsx
"use client";

import React, { useState, useEffect, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Send, Info, CheckCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle as ShadAlertTitle } from "@/components/ui/alert";

type IssueType = "bug" | "suggestion" | "question" | "other";

interface FormData {
  issueType: IssueType | "";
  userEmail: string;
  message: string;
}

export default function SupportPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    issueType: "",
    userEmail: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (currentUser) {
      setFormData(prev => ({ ...prev, userEmail: currentUser.email || "" }));
    } else {
      setFormData(prev => ({ ...prev, userEmail: "" }));
    }
  }, [currentUser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, issueType: value as IssueType }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.issueType || !formData.userEmail.trim() || !formData.message.trim()) {
      setSubmitStatus({ type: 'error', message: 'Vänligen fyll i alla obligatoriska fält.' });
      return;
    }
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const response = await fetch('/api/support-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        setSubmitStatus({ type: 'success', message: result.message || 'Ditt meddelande har skickats! Vi återkommer så snart som möjligt.' });
        setFormData({
          issueType: "",
          userEmail: currentUser?.email || "",
          message: "",
        });
      } else {
        setSubmitStatus({ type: 'error', message: result.error || 'Kunde inte skicka meddelandet. Försök igen senare.' });
      }
    } catch (error) {
      console.error("Support form submission error:", error);
      setSubmitStatus({ type: 'error', message: 'Ett nätverksfel uppstod. Kontrollera din anslutning och försök igen.' });
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
          <CardTitle className="text-2xl md:text-3xl">Kontakta Support</CardTitle>
          <CardDescription>
            Har du frågor, hittat en bugg, eller har du förslag på förbättringar? Fyll i formuläret nedan så återkommer vi till dig.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {submitStatus && (
            <Alert variant={submitStatus.type === 'error' ? 'destructive' : 'default'} className={submitStatus.type === 'success' ? 'border-green-500 bg-green-50 dark:bg-green-900/30 dark:border-green-700' : ''}>
              {submitStatus.type === 'success' ? <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" /> : <AlertCircle className="h-4 w-4" />}
              <ShadAlertTitle className={submitStatus.type === 'success' ? 'text-green-700 dark:text-green-300' : ''}>
                {submitStatus.type === 'success' ? 'Skickat!' : 'Fel'}
              </ShadAlertTitle>
              <AlertDescription className={submitStatus.type === 'success' ? 'text-green-600 dark:text-green-400' : ''}>
                {submitStatus.message}
              </AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="issueType">Ärendetyp <span className="text-destructive">*</span></Label>
              <Select name="issueType" value={formData.issueType} onValueChange={handleSelectChange} required>
                <SelectTrigger id="issueType">
                  <SelectValue placeholder="Välj typ av ärende" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bug">Buggrapport</SelectItem>
                  <SelectItem value="suggestion">Funktionsförslag</SelectItem>
                  <SelectItem value="question">Allmän Fråga</SelectItem>
                  <SelectItem value="other">Annat</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="userEmail">Din e-postadress (för svar) <span className="text-destructive">*</span></Label>
              <Input
                id="userEmail"
                name="userEmail"
                type="email"
                value={formData.userEmail}
                onChange={handleChange}
                placeholder="din.email@example.com"
                required
              />
            </div>

            <div>
              <Label htmlFor="message">Ditt meddelande <span className="text-destructive">*</span></Label>
              <Textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="Beskriv ditt ärende här. Om det är en bugg, inkludera gärna steg för att återskapa problemet."
                rows={6}
                required
              />
            </div>
            
            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Skicka Meddelande
            </Button>
          </form>

          <Alert variant="default" className="mt-6">
            <Info className="h-4 w-4" />
            <ShadAlertTitle className="font-semibold">Vad kan du kontakta oss om?</ShadAlertTitle>
            <AlertDescription>
              <p className="mb-2">Använd detta formulär för att nå oss angående:</p>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li><strong>Buggrapporter:</strong> Om du hittar något som inte fungerar som förväntat. Beskriv gärna stegen för att återskapa felet.</li>
                <li><strong>Funktionsförslag:</strong> Har du idéer på hur Ekonova kan bli ännu bättre? Vi lyssnar gärna!</li>
                <li><strong>Allmänna frågor:</strong> Om du undrar över någon funktion eller behöver hjälp att komma igång.</li>
                <li><strong>Övrigt:</strong> Andra synpunkter eller funderingar du har.</li>
              </ul>
              <p className="mt-3">Vi strävar efter att svara så snart som möjligt. Ditt meddelande skickas till <strong>info@marius-christensen.se</strong>.</p>
              <p className="text-xs mt-2"><em>Notera: E-postutskick från servern är under utveckling och simuleras just nu om SMTP-uppgifter inte är fullständigt konfigurerade.</em></p>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
