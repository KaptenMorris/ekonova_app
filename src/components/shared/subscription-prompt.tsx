
"use client";

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle, ShieldCheck, Ticket } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, setDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle as ShadAlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface SubscriptionPromptProps {
  featureName?: string;
}

interface SubscriptionPlan {
  id: 'monthly' | 'quarterly' | 'biannual' | 'annual';
  name: string;
  price: number;
  durationMonths: number;
  pricePerMonth?: number;
}

const subscriptionPlans: SubscriptionPlan[] = [
  { id: 'monthly', name: '1 Månad', price: 29, durationMonths: 1 },
  { id: 'quarterly', name: '3 Månader', price: 79, durationMonths: 3, pricePerMonth: 26.33 },
  { id: 'biannual', name: '6 Månader', price: 149, durationMonths: 6, pricePerMonth: 24.83 },
  { id: 'annual', name: '12 Månader', price: 249, durationMonths: 12, pricePerMonth: 20.75 },
];

export default function SubscriptionPrompt({ featureName }: SubscriptionPromptProps) {
  const { currentUser, refreshUserData } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState<SubscriptionPlan['id']>('monthly');

  const validCoupon = "FREEFORME";

  const selectedPlan = useMemo(() => {
    return subscriptionPlans.find(plan => plan.id === selectedPlanId) || subscriptionPlans[0];
  }, [selectedPlanId]);

  const handleSimulateSubscription = async () => {
    if (!currentUser) {
      setError("Du måste vara inloggad för att prenumerera.");
      return;
    }
    setIsLoading(true);
    setError(null);

    const trimmedCoupon = couponCodeInput.trim().toUpperCase();
    const isCouponAttempted = couponCodeInput.trim() !== '';
    const isCouponValid = trimmedCoupon === validCoupon;

    if (isCouponAttempted && !isCouponValid) {
      toast({
        title: "Ogiltig Kupongkod",
        description: "Kupongkoden du angav är inte giltig. Vänligen försök igen eller fortsätt utan kod.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const expiryDate = new Date();
      
      // If coupon is valid, it grants a 1-month subscription regardless of selected plan for simplicity here.
      // Otherwise, use the selected plan's duration.
      const durationToAdd = isCouponValid ? 1 : selectedPlan.durationMonths;
      expiryDate.setMonth(expiryDate.getMonth() + durationToAdd);


      await setDoc(userDocRef, {
        email: currentUser.email,
        subscriptionStatus: 'active',
        subscriptionExpiresAt: Timestamp.fromDate(expiryDate),
        lastSubscribedAt: serverTimestamp(),
        currentPlanId: isCouponValid ? 'coupon_monthly' : selectedPlan.id, // Store plan or coupon type
        ...(isCouponValid && { usedCoupon: trimmedCoupon })
      }, { merge: true });

      if (isCouponValid) {
        toast({
          title: "Kupong Tillämpad!",
          description: `Din prenumeration har aktiverats med kupongen '${trimmedCoupon}' för 1 månad.`,
        });
      } else {
        toast({
          title: "Prenumeration Simulerad!",
          description: `Du har nu "tillgång" i ${selectedPlan.durationMonths} månad(er).`,
        });
      }
      setCouponCodeInput(''); 
      await refreshUserData();
    } catch (err: any) {
      console.error("Error simulating subscription:", err);
      setError("Kunde inte simulera prenumeration. Försök igen.");
      toast({
        title: "Fel",
        description: "Kunde inte simulera prenumeration.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] p-4 text-center">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="mx-auto bg-primary/10 text-primary p-3 rounded-full mb-4 w-fit">
            <ShieldCheck className="h-10 w-10" />
          </div>
          <CardTitle className="text-2xl">
            {featureName ? `Lås upp ${featureName}` : "Uppgradera till Premium"}
          </CardTitle>
          <CardDescription>
            Få full tillgång till alla funktioner, inklusive {featureName || "avancerad budgetanalys, räkningshantering och AI-rådgivning"}, genom att prenumerera eller använda en giltig kupongkod.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <ShadAlertTitle>Fel</ShadAlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <RadioGroup value={selectedPlanId} onValueChange={(value) => setSelectedPlanId(value as SubscriptionPlan['id'])} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {subscriptionPlans.map((plan) => (
              <Label
                key={plan.id}
                htmlFor={plan.id}
                className={`flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent/50 hover:text-accent-foreground cursor-pointer ${selectedPlanId === plan.id ? "border-primary ring-2 ring-primary" : ""}`}
              >
                <RadioGroupItem value={plan.id} id={plan.id} className="sr-only" />
                <span className="mb-2 text-lg font-semibold">{plan.name}</span>
                <span className="text-2xl font-bold">{plan.price} kr</span>
                {plan.pricePerMonth && <span className="text-xs text-muted-foreground">(ca {plan.pricePerMonth.toFixed(2)} kr/mån)</span>}
              </Label>
            ))}
          </RadioGroup>
          
          <div className="space-y-2 pt-4">
            <Label htmlFor="couponCode" className="flex items-center justify-center text-sm font-medium text-muted-foreground">
              <Ticket className="mr-2 h-4 w-4" /> Har du en kupongkod?
            </Label>
            <Input 
              id="couponCode" 
              placeholder="Ange kupongkod (t.ex. 20%OFF)" 
              value={couponCodeInput}
              onChange={(e) => setCouponCodeInput(e.target.value)}
              className="text-center"
            />
          </div>

          <Button onClick={handleSimulateSubscription} className="w-full" size="lg" disabled={isLoading}>
            {isLoading 
              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
              : couponCodeInput.trim().toUpperCase() === validCoupon 
                ? `Använd Kupong & Aktivera (1 Månad)` 
                : `Prenumerera Nu (${selectedPlan.price} kr)`
            }
          </Button>
          
        </CardContent>
        <CardFooter className="flex flex-col gap-2 pt-4">
           <Alert variant="default" className="text-left">
            <AlertCircle className="h-4 w-4" />
            <ShadAlertTitle>Viktig Information</ShadAlertTitle>
            <AlertDescription>
              Detta är en **simulerad** prenumerationsprocess. Ingen riktig betalning kommer att genomföras.
              För en verklig applikation behöver du integrera en betaltjänst (t.ex. Stripe, PayPal).
              Admin kan manuellt justera prenumerationsstatus i Firestore-databasen.
            </AlertDescription>
          </Alert>
          <p className="text-xs text-muted-foreground mt-2">Du kan hantera eller avbryta din prenumeration när som helst från dina kontoinställningar.</p>
        </CardFooter>
      </Card>
    </div>
  );
}

