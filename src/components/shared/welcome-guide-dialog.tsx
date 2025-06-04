
"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Rocket, Coins, Tag, FileText, BotIcon, HelpCircle } from 'lucide-react'; // Using BotIcon as Bot doesn't exist in lucide-react

interface WelcomeGuideDialogProps {
  isOpen: boolean;
  onClose: () => void;
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

const WelcomeGuideDialog: React.FC<WelcomeGuideDialogProps> = ({ isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg md:max-w-xl max-h-[85vh] flex flex-col">
        <DialogHeader className="text-center sm:text-left">
          <DialogTitle className="text-2xl font-bold">Välkommen till Ekonova!</DialogTitle>
          <DialogDescription className="text-md">
            Kom igång snabbt med dessa enkla steg för att bemästra din ekonomi.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-6 -mr-6 my-4">
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
           <div className="mt-6 p-3 bg-primary/10 rounded-lg flex items-center">
            <HelpCircle className="h-5 w-5 text-primary mr-3 shrink-0" />
            <p className="text-sm text-primary-foreground">
              Du kan alltid hitta mer detaljerad information och guider på <strong className="font-semibold">Hjälp</strong>-sidan i menyn.
            </p>
          </div>
        </ScrollArea>
        <DialogFooter className="mt-2">
          <Button onClick={onClose} size="lg" className="w-full sm:w-auto">Kom igång!</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeGuideDialog;
