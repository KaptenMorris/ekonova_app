
// src/app/(app)/hjalp/page.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useAuth } from '@/contexts/AuthContext';
import SubscriptionPrompt from '@/components/shared/subscription-prompt';
import { Loader2 } from 'lucide-react';

export default function HjalpPage() {
  const { currentUser, loading: authLoading, subscription } = useAuth();

  if (authLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /> Laddar...</div>;
  }

  if (!currentUser) {
    return <div className="text-center p-8">Vänligen logga in för att se hjälpsektionen.</div>;
  }
  
  // Subscription check can be added here if this page becomes premium
  // const isSubscribed = subscription?.status === 'active' && (subscription.expiresAt ? subscription.expiresAt > new Date() : true);
  // if (!isSubscribed) {
  //   return <SubscriptionPrompt featureName="Hjälp & Guider" />;
  // }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl">Hjälp & Information</CardTitle>
          <CardDescription>Här hittar du information om hur du använder Ekonovas funktioner.</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-lg font-semibold">Kontrollpanelen</AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed">
                Kontrollpanelen är din centrala hubb i Ekonova. Här kan du:
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Växla mellan dina olika budgettavlor.</li>
                  <li>Skapa nya budgettavlor för att organisera din ekonomi (t.ex. Hushåll, Företag, Resa).</li>
                  <li>Byta namn på, hantera medlemmar för, och radera tavlor (om du är ägare).</li>
                  <li>Snabbt se en översikt över inkomster och utgifter för den valda tavlan.</li>
                  <li>Lägga till nya transaktioner (inkomster eller utgifter) och kategorisera dem.</li>
                  <li>Skapa nya kategorier för både inkomster och utgifter, och välja en passande ikon för dem.</li>
                  <li>Se en summering av dina utgifter per kategori.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger className="text-lg font-semibold">Ekonomisk Översikt</AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed">
                På sidan för Ekonomisk Översikt får du en djupare inblick i din ekonomi för den valda budgettavlan och månaden:
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Välj vilken budgettavla och vilken månad du vill analysera.</li>
                  <li>Se en sammanfattning av totala inkomster, utgifter och ditt nettosaldo för perioden.</li>
                  <li>Få en överblick över dina totala obetalda räkningar (ej månadsfiltrerat).</li>
                  <li>Visualisera inkomster vs. utgifter i ett stapeldiagram.</li>
                  <li>Analysera din utgiftsfördelning per kategori i ett cirkeldiagram.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger className="text-lg font-semibold">Räkningar</AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed">
                Håll koll på dina räkningar och undvik förseningsavgifter:
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Lägg till nya räkningar manuellt, genom att ladda upp en bild, eller skanna med kameran (AI försöker då fylla i titel, belopp och förfallodatum).</li>
                  <li>Välj vilken budgettavla en ny räkning ska tillhöra.</li>
                  <li>Kategorisera varje räkning.</li>
                  <li>Markera räkningar som betalda. När en räkning betalas skapas automatiskt en utgiftstransaktion på den valda tavlan.</li>
                  <li>Se en lista över obetalda och betalda räkningar.</li>
                  <li>Redigera eller ta bort befintliga räkningar (om du har behörighet på tavlan).</li>
                  <li>Dela en räkning (skapa en kopia) till andra budgettavlor du är medlem i.</li>
                  <li>Se vem som skapade och vem som betalade en specifik räkning.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger className="text-lg font-semibold">Handla (Registrera Inköp)</AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed">
                Registrera dina dagliga inköp och utgifter snabbt och enkelt:
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Välj vilken budgettavla inköpet ska kopplas till.</li>
                  <li>Ange titel, belopp, datum och kategori för inköpet.</li>
                  <li>Lägg till valfria anteckningar.</li>
                  <li>Bifoga en bild på kvittot genom att ladda upp eller skanna med kameran.</li>
                  <li>Varje registrerat inköp skapar en utgiftstransaktion på den valda tavlan.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5">
              <AccordionTrigger className="text-lg font-semibold">AI Budgetrådgivare</AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed">
                Få personliga rekommendationer från vår AI för att optimera din budget:
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Välj en budgettavla för att automatiskt fylla i din inkomst, dina utgifter och utgiftskategorier. Du kan även mata in dessa manuellt.</li>
                  <li>Ange din totala skuld.</li>
                  <li>AI:n analyserar din finansiella data och ger dig skräddarsydda råd på svenska för att förbättra din ekonomi.</li>
                </ul>
                <em>Denna funktion kan kräva en aktiv prenumeration.</em>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-6">
              <AccordionTrigger className="text-lg font-semibold">Dela Tavlor & Hantera Medlemmar</AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed">
                Samarbeta kring din ekonomi genom att dela budgettavlor:
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>På Kontrollpanelen, klicka på menyikonen (tre prickar) vid en tavla och välj "Hantera Medlemmar".</li>
                  <li>Du kan bjuda in andra användare till din tavla genom att ange deras unika Användar-ID (UID). Deras UID hittar de på sin Kontoinställningar-sida.</li>
                  <li>När du bjuder in kan du tilldela dem en roll:
                    <ul className="list-disc pl-6 mt-1">
                      <li><strong>Granskare:</strong> Kan se all data på tavlan men inte göra ändringar.</li>
                      <li><strong>Redaktör:</strong> Kan se all data och göra ändringar (lägga till transaktioner, betala räkningar, etc.).</li>
                    </ul>
                  </li>
                  <li>Du (som ägare eller redaktör) kan ändra en medlems roll eller ta bort en medlem från tavlan när som helst via samma dialogruta.</li>
                  <li>Ägaren av tavlan är den enda som kan radera hela tavlan.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

             <AccordionItem value="item-7">
              <AccordionTrigger className="text-lg font-semibold">Prenumerationer</AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed">
                Vissa avancerade funktioner i Ekonova kan kräva en aktiv prenumeration.
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Du kan starta en (simulerad) prenumeration via "Prenumerera Nu"-knappen som visas om en funktion är låst, eller via din Kontoinställningar-sida.</li>
                  <li>Olika prenumerationsperioder kan erbjudas (t.ex. månadsvis, kvartalsvis, årsvis).</li>
                  <li>Kupongkoder kan ibland finnas tillgängliga för rabatter eller gratisperioder.</li>
                  <li>Du kan se din nuvarande prenumerationsstatus och utgångsdatum på din Kontoinställningar-sida.</li>
                  <li>Du kan avbryta din prenumeration när som helst från Kontoinställningar. Din åtkomst till premiumfunktioner fortsätter då till slutet av den betalda perioden.</li>
                </ul>
                <em>Observera: I denna demonstrationsversion är alla betalningar och prenumerationer simulerade.</em>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
