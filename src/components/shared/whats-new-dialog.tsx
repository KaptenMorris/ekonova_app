
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

  const formatDescription = (text: string) => {
    let processedText = text;

    // 1. Handle Headings (H2, H3)
    // Ensure headings are on their own lines and processed before paragraphs
    processedText = processedText.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    processedText = processedText.replace(/^## (.*$)/gim, '<h2>$1</h2>');

    // 2. Handle Lists (unordered with - or *)
    // This regex finds blocks of list items and wraps them in <ul><li>...</li></ul>
    processedText = processedText.replace(
      /^\s*([-*])\s+(.*(?:(?:\n^\s*[-*]\s+.*)|(?:\n\s+(?![-*]).*))*)/gm,
      (match) => {
        // Split the match into lines. Each line starting with - or * is an item.
        // Subsequent lines not starting with - or * but indented could be part of the same item (multiline).
        // For simplicity here, we'll treat each line starting with -/* as a new <li>.
        const items = match.split('\n').map(itemLine => {
          // Remove the list marker and trim
          return itemLine.replace(/^\s*[-*]\s+/, '').trim();
        }).filter(item => item.length > 0); // Filter out empty items from potential trailing newlines

        return `<ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>`;
      }
    );

    // 3. Handle Paragraphs and Line Breaks after block elements are processed
    // Split by double newlines to form paragraphs.
    // For blocks that are not already H2, H3, or UL, wrap in <p>
    // And convert single newlines within those to <br />.
    let htmlOutput = processedText.split(/\n\s*\n/).map(block => {
      const trimmedBlock = block.trim();
      if (trimmedBlock.startsWith('<h2>') || trimmedBlock.startsWith('<h3>') || trimmedBlock.startsWith('<ul>')) {
        // These blocks are already formatted, pass them through.
        // Bold/italic will be applied globally later.
        return trimmedBlock;
      }
      if (trimmedBlock) {
        // For remaining text blocks, treat as a paragraph.
        // Convert single newlines within this block to <br />.
        return `<p>${trimmedBlock.replace(/\n/g, '<br />')}</p>`;
      }
      return '';
    }).join('');

    // 4. Apply Bold and Italic formatting globally to the generated HTML structure
    htmlOutput = htmlOutput.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Ensure that the italic regex doesn't conflict with the bold one if applied sequentially.
    // The use of \1 for the closing * or _ makes it specific.
    htmlOutput = htmlOutput.replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, '<em>$1</em>'); // *italic*
    htmlOutput = htmlOutput.replace(/_(.*?)_/g, '<em>$1</em>'); // _italic_


    // Cleanup: Remove <br /> tags that are immediately after </ul> or </h3> or </h2>
    htmlOutput = htmlOutput.replace(/(<\/(ul|h2|h3)>)<br \/>/gi, '$1');
    // Cleanup: Remove <p><br \/><\/p> or empty <p></p>
    htmlOutput = htmlOutput.replace(/<p>\s*(<br \/>)?\s*<\/p>/gi, '');


    return { __html: htmlOutput };
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

