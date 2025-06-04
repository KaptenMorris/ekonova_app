
"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Rocket, Coins, Tag, FileText, BotIcon, HelpCircle, Info, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface WelcomeGuideDialogProps {
  isOpen: boolean;
  onClose: () => void;
  showEnticingText?: boolean; // New prop to control introductory text
}

const guidePoints = [
  {
    icon: <Rocket className="h-5 w-5 text-primary mr-3 shrink-0" />,
    title: "Skapa din första Budgettavla",
    text: "Gå till Kontrollpanelen. En budgettavla är din centrala plats för att hantera en specifik ekonomi (t.ex. hushåll, projekt)."
  },
  {
    icon: <Coins className="h-5 w-5 text-primary mr-3 shrink-0" />,
    title: "Lägg till Transaktioner",
    text: "När du har en tavla, börja lägga till dina inkomster och utgifter för att få översikt."
  },
  {
    icon: <Tag className="h-5 w-5 text-primary mr-3 shrink-0" />,
    title: "Kategorisera Mera",
    text: "Skapa egna kategorier för både inkomster och utgifter. Välj en passande ikon för varje!"
  },
  {
    icon: <FileText className="h-5 w-5 text-primary mr-3 shrink-0" />,
    title: "Håll koll på Räkningar",
    text: "Lägg in dina räkningar på sidan Räkningar. Markera dem som betalda för att automatiskt skapa utgiftstransaktioner."
  },
  {
    icon: <BotIcon className="h-5 w-5 text-primary mr-3 shrink-0" />,
    title: "Utforska AI-Funktioner",
    text: "Få personliga budgetråd från AI Budgetrådgivaren eller ställ frågor till AI Supporten om appen."
  },
];

const WelcomeGuideDialog: React.FC<WelcomeGuideDialogProps> = ({ isOpen, onClose, showEnticingText = false }) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg md:max-w-xl max-h-[85vh] flex flex-col">
        <DialogHeader className="text-center sm:text-left">
          <DialogTitle className="text-2xl font-bold">
            {showEnticingText ? "Upptäck Ekonova - Din Guide till Smartare Ekonomi" : "Välkommen till Ekonova!"}
          </DialogTitle>
          <DialogDescription className="text-md">
            {showEnticingText 
              ? "Börja din resa mot enklare och mer insiktsfull ekonomihantering."
              : "Kom igång snabbt med dessa enkla steg för att bemästra din ekonomi."
            }
          </DialogDescription>
        </DialogHeader>

        {showEnticingText && (
          <div className="my-4 p-4 bg-primary/5 border border-primary/20 rounded-lg text-center">
            <p className="text-base text-foreground">
              Trött på ekonomiskt krångel? Ekonova är din personliga vägvisare till en klarare och starkare ekonomi. Vi kombinerar smart teknik med användarvänlig design för att ge dig full kontroll, insikter som gör skillnad, och verktygen du behöver för att nå dina finansiella mål. Ta steget mot en tryggare ekonomisk framtid – det är enklare än du tror!
            </p>
          </div>
        )}

        <ScrollArea className="flex-1 pr-6 -mr-6 my-2">
          <h3 className="text-lg font-semibold mb-3 text-center sm:text-left">Kom igång snabbt:</h3>
          <ul className="space-y-4">
            {guidePoints.map((point, index) => (
              <li key={index} className="flex items-start p-3 bg-muted/50 rounded-lg">
                {point.icon}
                <div>
                  <h4 className="font-semibold text-md">{point.title}</h4>
                  <p className="text-sm text-muted-foreground">{point.text}</p>
                </div>
              </li>
            ))}
          </ul>
           <div className="mt-6 p-3 bg-accent/10 rounded-lg flex items-center text-accent-foreground">
            <Info className="h-5 w-5 text-accent mr-3 shrink-0" />
            <p className="text-sm ">
              Detta är en snabbguide. För en fullständig genomgång av alla funktioner, besök vår <strong className="font-semibold">Hjälpsida</strong>.
            </p>
          </div>
        </ScrollArea>
        <DialogFooter className="mt-2 flex flex-col sm:flex-row sm:justify-between items-center gap-2">
          <Link href="/hjalp" passHref legacyBehavior>
            <Button variant="outline" onClick={onClose} className="w-full sm:w-auto order-2 sm:order-1">
              <HelpCircle className="mr-2 h-4 w-4" /> Läs Detaljerad Hjälp
            </Button>
          </Link>
          <Button onClick={onClose} size="lg" className="w-full sm:w-auto order-1 sm:order-2">
            {showEnticingText ? "Utforska Nu!" : "Kom igång!"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeGuideDialog;
