
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

  // Basic markdown-to-HTML conversion (can be expanded)
  const formatDescription = (text: string) => {
    let html = text;
    // Replace newlines with <br>
    html = html.replace(/\n/g, '<br />');
    // Replace **bold** with <strong>
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Replace *italic* or _italic_ with <em>
    html = html.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');
    // Replace lists
    html = html.replace(/^\s*-\s+(.*)/gm, '<li class="ml-4 list-disc">$1</li>');
    html = html.replace(/<br \/>(<li.*<\/li>)/g, '$1'); // Remove <br> before <li>
    html = html.replace(/(<\/li>)<br \/>/g, '$1'); // Remove <br> after </li>
     // Wrap list items in <ul> if not already done by multiple <li>
    if (html.includes('<li>') && !html.includes('<ul>')) {
        html = html.replace(/(<li.*<\/li>)/gs, '<ul>$1</ul>');
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
