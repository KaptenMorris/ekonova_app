
"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { AppVersion } from '@/contexts/AppVersionContext'; // Ensure this type is correctly defined

interface WhatsNewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  versionInfo: AppVersion | null;
}

const WhatsNewDialog: React.FC<WhatsNewDialogProps> = ({ isOpen, onClose, versionInfo }) => {
  if (!versionInfo) {
    return null;
  }

  // Återställd till en enklare version för felsökning
  const formatDescription = (text: string) => {
    let html = text.replace(/\n/g, '<br />');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>'); // Enkel kursiv stil
    // För listor, en enkel ersättning (kan behöva mer avancerad logik om detta inte räcker)
    html = html.replace(/^- (.*?)(<br \/>|$)/gm, '<li>$1</li>');
    if (html.includes('<li>')) {
      html = `<ul>${html.replace(/<br \/>(\s*<li>)/g, '$1')}</ul>`; // Omslut listelement med ul
    }
    return { __html: html };
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md md:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">Nytt i Ekonova - Version {versionInfo.version}</DialogTitle>
          {versionInfo.title && <DialogDescription className="text-lg">{versionInfo.title}</DialogDescription>}
        </DialogHeader>
        <ScrollArea className="flex-1 pr-6 -mr-6">
          <div className="text-sm text-muted-foreground prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={formatDescription(versionInfo.description)} />
          <p className="text-xs text-muted-foreground mt-4">
            Publiceringsdatum: {versionInfo.releaseDate ? new Date(versionInfo.releaseDate.seconds * 1000).toLocaleDateString('sv-SE') : 'Okänt datum'}
          </p>
        </ScrollArea>
        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button onClick={onClose}>Stäng</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WhatsNewDialog;
