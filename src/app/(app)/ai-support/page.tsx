
// src/app/(app)/ai-support/page.tsx
"use client";

import React, { useState, FormEvent, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Send, User, Bot } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { askAppFaq, type AppFaqInput, type AppFaqOutput } from '@/ai/flows/app-faq-flow';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

export default function AiSupportPage() {
  const { currentUser, loading: authLoading, subscription } = useAuth();
  const [question, setQuestion] = useState('');
  const [conversation, setConversation] = useState<Message[]>([]);
  const [isLoadingAiResponse, setIsLoadingAiResponse] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const userDisplayName = currentUser?.displayName || currentUser?.email || 'Användare';
  const userAvatarFallback = (userDisplayName.split(' ').map(n => n[0]).join('') || 'A').toUpperCase();


  useEffect(() => {
    // Scroll to bottom when conversation updates
    if (scrollAreaRef.current) {
      const scrollableViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollableViewport) {
        scrollableViewport.scrollTop = scrollableViewport.scrollHeight;
      }
    }
  }, [conversation]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isLoadingAiResponse) return;

    const userMessage: Message = {
      id: Date.now().toString() + '-user',
      sender: 'user',
      text: question,
      timestamp: new Date(),
    };
    setConversation(prev => [...prev, userMessage]);
    setQuestion('');
    setIsLoadingAiResponse(true);

    try {
      const input: AppFaqInput = { question: userMessage.text };
      const result: AppFaqOutput = await askAppFaq(input);
      const aiMessage: Message = {
        id: Date.now().toString() + '-ai',
        sender: 'ai',
        text: result.answer,
        timestamp: new Date(),
      };
      setConversation(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error fetching AI FAQ response:", error);
      const errorMessage: Message = {
        id: Date.now().toString() + '-error',
        sender: 'ai',
        text: "Ursäkta, jag kunde inte behandla din fråga just nu. Försök igen senare eller kontakta vår manuella support.",
        timestamp: new Date(),
      };
      setConversation(prev => [...prev, errorMessage]);
    } finally {
      setIsLoadingAiResponse(false);
    }
  };
  
  if (authLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /> Laddar...</div>;
  }
  if (!currentUser && !authLoading) {
     return <div className="text-center p-8">Vänligen logga in för att använda AI Supporten.</div>
  }
  // Add subscription check if this becomes a premium feature
  // const isSubscribed = subscription?.status === 'active' && (subscription.expiresAt ? subscription.expiresAt > new Date() : true);
  // if (!isSubscribed) {
  //   return <SubscriptionPrompt featureName="AI Support" />;
  // }

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.28)-theme(spacing.14))] md:h-[calc(100vh-theme(spacing.32)-theme(spacing.14))]">
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="border-b">
          <CardTitle>AI Support för Ekonova</CardTitle>
          <CardDescription>Ställ dina frågor om hur Ekonova fungerar så försöker jag svara!</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full p-4 sm:p-6" ref={scrollAreaRef}>
            <div className="space-y-4">
              {conversation.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex items-end gap-2 max-w-[85%] sm:max-w-[75%]",
                    msg.sender === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                  )}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={msg.sender === 'user' ? (currentUser?.photoURL || `https://placehold.co/100x100.png?text=${userAvatarFallback}`) : `https://placehold.co/100x100.png?text=AI`} data-ai-hint={msg.sender === 'user' ? "profile avatar" : "ai avatar"}/>
                    <AvatarFallback>{msg.sender === 'user' ? userAvatarFallback : "AI"}</AvatarFallback>
                  </Avatar>
                  <div
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm shadow-sm",
                      msg.sender === 'user'
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    <p className="text-xs mt-1 opacity-70 text-right">
                      {msg.timestamp.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              {isLoadingAiResponse && (
                <div className="flex items-end gap-2 max-w-[85%] sm:max-w-[75%] mr-auto">
                   <Avatar className="h-8 w-8">
                    <AvatarImage src={`https://placehold.co/100x100.png?text=AI`} data-ai-hint="ai avatar"/>
                    <AvatarFallback>AI</AvatarFallback>
                  </Avatar>
                   <div className="rounded-lg px-3 py-2 text-sm shadow-sm bg-muted flex items-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
        <CardFooter className="border-t pt-4">
          <form onSubmit={handleSubmit} className="flex w-full items-center space-x-2">
            <Input
              id="aiQuestion"
              placeholder="Skriv din fråga här..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="flex-1"
              autoComplete="off"
              disabled={isLoadingAiResponse}
            />
            <Button type="submit" size="icon" disabled={isLoadingAiResponse || !question.trim()}>
              {isLoadingAiResponse ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span className="sr-only">Skicka</span>
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
