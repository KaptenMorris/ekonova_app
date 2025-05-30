
"use client";

import React, { useState, useEffect, FormEvent, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger, DialogDescription as ShadDialogDescription } from '@/components/ui/dialog';
import { Upload, Camera, Loader2, AlertCircle, RefreshCw, CheckCircle, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, getDocs, query as firestoreQuery, where, onSnapshot, orderBy } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription as ShadAlertDescriptionComponent, AlertTitle } from "@/components/ui/alert";
import Image from 'next/image';
import SubscriptionPrompt from '@/components/shared/subscription-prompt';


interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  iconName?: string;
}

interface Board {
  id: string;
  name: string;
}

export default function PurchasesPage() {
  const { currentUser, subscription, loading: authLoading, mainBoardId } = useAuth();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState('');

  const [boards, setBoards] = useState<Board[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string | undefined>(undefined);
  const [activeBoardName, setActiveBoardName] = useState<string>("");
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);

  const [isLoading, setIsLoading] = useState(false); // For form submission
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoadingBoards, setIsLoadingBoards] = useState(true); 
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);


  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isCameraDialogOpen, setIsCameraDialogOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [capturedImagePreview, setCapturedImagePreview] = useState<string | null>(null);
  const [scannedReceiptImage, setScannedReceiptImage] = useState<string | null>(null);


  const isSubscribed = useMemo(() => {
    return subscription?.status === 'active' && (subscription.expiresAt ? subscription.expiresAt > new Date() : true);
  }, [subscription]);


  // Effect 1: Fetch user's boards
  useEffect(() => {
    if (authLoading || !currentUser?.uid || !isSubscribed) {
      setBoards([]);
      setActiveBoardId(undefined);
      setIsLoadingBoards(false);
      return;
    }
    setIsLoadingBoards(true);
    const boardsRef = collection(db, 'boards');
    const q = firestoreQuery(boardsRef, where("members", "array-contains", currentUser.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let fetchedBoards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Board));
      fetchedBoards.sort((a, b) => a.name.localeCompare(b.name));
      setBoards(fetchedBoards);
      setIsLoadingBoards(false);
    }, (err: any) => {
      console.error("Error fetching boards: ", err);
      let description = "Kunde inte hämta dina budgettavlor. ";
      if (err.code === 'permission-denied' || err.code === 'PERMISSION_DENIED') {
        description += "Kontrollera dina Firestore-säkerhetsregler och att inga webbläsartillägg blockerar Firebase.\n\n**Vanliga Orsaker:**\n1. **Webbläsartillägg:** Reklamblockerare (AdBlock, uBlock) eller integritetsverktyg kan blockera anrop till Firebase. Prova att tillfälligt inaktivera dessa och ladda om sidan.\n2. **Firestore Säkerhetsregler:** Dina regler i Firebase Console tillåter inte denna läsoperation. Säkerställ att en inloggad användare får läsa tavlor där deras UID finns i 'members'-arrayen.\n3. **Nätverksproblem:** Kontrollera din internetanslutning.\n\nDetaljer: " + err.message;
      } else {
        description += "Försök igen senare. Detaljer: " + err.message;
      }
      toast({ title: "Fel vid hämtning av tavlor", description, variant: "destructive", duration: 20000 });
      setFormError("Kunde inte hämta budgettavlor.");
      setBoards([]); 
      setActiveBoardId(undefined); 
      setIsLoadingBoards(false);
    });
    return () => unsubscribe();
  }, [currentUser?.uid, isSubscribed, authLoading, toast]);

  // Effect 2: Set activeBoardId based on mainBoardId or first available board
  useEffect(() => {
    if (authLoading || !currentUser || isLoadingBoards) {
        return;
    }

    let newTargetBoardId: string | undefined = undefined;
    const boardExists = (id: string | undefined): id is string => !!id && boards.some(b => b.id === id);

    if (mainBoardId && boardExists(mainBoardId)) {
        newTargetBoardId = mainBoardId;
    } else if (boards.length > 0) {
        newTargetBoardId = boards[0].id;
    }
    
    setActiveBoardId(prevActiveBoardId => {
        if (prevActiveBoardId !== newTargetBoardId) {
            return newTargetBoardId;
        }
        return prevActiveBoardId;
    });

  }, [boards, mainBoardId, currentUser, authLoading, isLoadingBoards]);


  // Update activeBoardName when activeBoardId changes
  useEffect(() => {
    if (activeBoardId && boards.length > 0) {
      const currentBoard = boards.find(b => b.id === activeBoardId);
      if (currentBoard) {
        setActiveBoardName(currentBoard.name);
      } else {
        setActiveBoardName(""); // Should not happen if activeBoardId is from boards list
      }
    } else {
      setActiveBoardName("");
    }
  }, [activeBoardId, boards]);


  // Effect 3: Fetch categories for the active board
  useEffect(() => {
    if (!currentUser?.uid || !activeBoardId || !isSubscribed || authLoading) {
      setExpenseCategories([]);
      if(isLoadingCategories) setIsLoadingCategories(false);
      return;
    }
    setIsLoadingCategories(true);
    setExpenseCategories([]); // Clear old categories

    const categoriesRef = collection(db, 'boards', activeBoardId, 'categories');
    const q = firestoreQuery(categoriesRef); // Removed orderBy to avoid index need

    const unsubscribeCategories = onSnapshot(q, (snapshot) => {
      let fetchedCategories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      // Filter and sort on client
      fetchedCategories = fetchedCategories.filter(cat => cat.type === 'expense').sort((a,b) => a.name.localeCompare(b.name));
      setExpenseCategories(fetchedCategories);
      setIsLoadingCategories(false);
    }, (err) => {
      console.error("Error fetching categories: ", err);
      toast({ title: "Fel", description: "Kunde inte hämta kategorier för tavlan.", variant: "destructive" });
      setIsLoadingCategories(false);
    });
    return () => unsubscribeCategories();
  }, [currentUser?.uid, activeBoardId, toast, isSubscribed, authLoading]); // Removed isLoadingCategories

  // Camera Logic
  useEffect(() => {
    const startCamera = async () => {
      if (isCameraDialogOpen && !capturedImagePreview) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          setHasCameraPermission(true);
        } catch (error) {
          console.error('Error accessing camera:', error);
          setHasCameraPermission(false);
          toast({
            variant: 'destructive',
            title: 'Kameraåtkomst Nekad',
            description: 'Vänligen tillåt kameraåtkomst i din webbläsare.',
          });
        }
      }
    };

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        if(videoRef.current) videoRef.current.srcObject = null;
      }
    };
  }, [isCameraDialogOpen, toast, capturedImagePreview]);


  const handleCaptureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImagePreview(dataUrl);
         if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
            if(videoRef.current) videoRef.current.srcObject = null;
        }
      }
    }
  };

  const handleRetakeImage = () => {
    setCapturedImagePreview(null);
  };

  const handleUseImage = () => {
    if (capturedImagePreview) {
      setScannedReceiptImage(capturedImagePreview);
    }
    setCapturedImagePreview(null);
    setIsCameraDialogOpen(false);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setScannedReceiptImage(reader.result as string);
      };
      reader.readAsDataURL(file);
      if (event.target) {
        event.target.value = "";
      }
    }
  };


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!currentUser?.uid || !activeBoardId) {
      setFormError("Ingen användare eller aktiv tavla vald.");
      return;
    }
    if (!title || !amount || !selectedCategoryId) {
      setFormError("Fyll i titel, belopp och kategori.");
      return;
    }
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setFormError("Ogiltigt belopp.");
      return;
    }

    setIsLoading(true);
    try {
      const transactionsRef = collection(db, 'boards', activeBoardId, 'transactions');
      await addDoc(transactionsRef, {
        title,
        amount: numericAmount,
        date,
        category: selectedCategoryId,
        type: 'expense',
        description: notes,
        receiptImage: scannedReceiptImage,
        createdAt: new Date().toISOString(),
      });
      toast({ title: "Inköp Registrerat", description: `${title} har lagts till som en utgift.` });
      setTitle(''); setAmount(''); setDate(new Date().toISOString().split('T')[0]); setSelectedCategoryId(undefined); setNotes(''); setScannedReceiptImage(null);
    } catch (err) {
      console.error("Error adding purchase: ", err);
      toast({ title: "Fel", description: "Kunde inte registrera inköpet.", variant: "destructive" });
      setFormError("Ett fel uppstod vid registrering.");
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isLoadingBoards) { 
     return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /> Laddar...</div>;
  }
  if (!currentUser && !authLoading) {
    return <div className="text-center p-8">Vänligen logga in för att registrera inköp.</div>
  }
  if (!isSubscribed && currentUser) {
    return <SubscriptionPrompt featureName="Inköpsregistrering" />;
  }
  if (!isLoadingBoards && boards.length === 0 && currentUser && isSubscribed) { 
     return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Inga Budgettavlor Hittades</AlertTitle>
          <ShadAlertDescriptionComponent>Du behöver skapa en budgettavla på Kontrollpanelen först.</ShadAlertDescriptionComponent>
        </Alert>
     );
  }
  if (!isLoadingBoards && !activeBoardId && boards.length > 0 && currentUser && isSubscribed) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Välj en Tavla</AlertTitle>
        <ShadAlertDescriptionComponent>Välj en budgettavla ovan för att registrera inköp.</ShadAlertDescriptionComponent>
      </Alert>
    );
  }


  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Registrera Nytt Inköp</CardTitle>
        {boards.length > 0 && (
           <div className="grid gap-2 mt-4">
            <Label htmlFor="boardSelect">Välj Budgettavla</Label>
            <Select 
              value={activeBoardId} 
              onValueChange={setActiveBoardId} 
              disabled={isLoadingBoards || boards.length === 0 || isLoadingCategories}
            >
              <SelectTrigger id="boardSelect">
                <SelectValue placeholder={boards.length === 0 ? "Inga tavlor" : "Välj tavla..."} />
              </SelectTrigger>
              <SelectContent>
                {boards.map(board => (
                  <SelectItem key={board.id} value={board.id}>{board.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <CardDescription className="mt-2">
          Lägg till detaljer om ditt senaste inköp. Detta skapar en utgift på tavlan:
          <span className="font-semibold text-primary"> {activeBoardName || "Ingen tavla vald"}</span>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {formError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Fel</AlertTitle>
            <ShadAlertDescriptionComponent>{formError}</ShadAlertDescriptionComponent>
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-2">
            <Label htmlFor="purchaseTitle">Titel / Beskrivning</Label>
            <Input id="purchaseTitle" placeholder="Matvaror från ICA, kläder från H&M" value={title} onChange={e => setTitle(e.target.value)} required disabled={!activeBoardId || isLoadingCategories}/>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="purchaseAmount">Belopp (kr)</Label>
            <Input id="purchaseAmount" type="number" placeholder="349.50" value={amount} onChange={e => setAmount(e.target.value)} required disabled={!activeBoardId || isLoadingCategories}/>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="purchaseDate">Datum</Label>
            <Input id="purchaseDate" type="date" value={date} onChange={e => setDate(e.target.value)} required disabled={!activeBoardId || isLoadingCategories}/>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="purchaseCategory">Kategori</Label>
            <Select 
              value={selectedCategoryId} 
              onValueChange={setSelectedCategoryId} 
              required 
              disabled={!activeBoardId || isLoadingCategories || expenseCategories.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Välj en utgiftskategori" />
              </SelectTrigger>
              <SelectContent>
                {isLoadingCategories && <div className="p-2 text-sm text-muted-foreground flex items-center"><Loader2 className="h-4 w-4 animate-spin mr-2"/>Laddar kategorier...</div>}
                {!isLoadingCategories && expenseCategories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
                 {!isLoadingCategories && expenseCategories.length === 0 && activeBoardId && <p className="p-2 text-sm text-muted-foreground">Inga utgiftskategorier på denna tavla.</p>}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Kvitto</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  id="receiptUpload"
                  type="file"
                  className="hidden"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  disabled={!activeBoardId}
                />
                <Button
                  variant="outline"
                  className="w-full"
                  type="button"
                  disabled={!activeBoardId}
                  onClick={() => fileInputRef.current?.click()}
                >
                    <Upload className="mr-2 h-4 w-4" /> Ladda upp Kvitto (Bild)
                </Button>
                <Dialog open={isCameraDialogOpen} onOpenChange={(open) => {
                  setIsCameraDialogOpen(open);
                  if (!open) {
                    if (streamRef.current) {
                        streamRef.current.getTracks().forEach(track => track.stop());
                        streamRef.current = null;
                    }
                    setCapturedImagePreview(null);
                    setHasCameraPermission(null);
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full" type="button" disabled={!activeBoardId}>
                        <Camera className="mr-2 h-4 w-4" /> Skanna in kvitto med kamera
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[90vw] md:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Skanna Kvitto</DialogTitle>
                      <ShadDialogDescription>Använd din kamera för att ta en bild av kvittot.</ShadDialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      {hasCameraPermission === false && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Kameraåtkomst Nekad</AlertTitle>
                          <ShadAlertDescriptionComponent>
                            Tillåt kameraåtkomst i din webbläsare för att använda denna funktion. Du kan behöva ladda om sidan efter att ha ändrat inställningarna.
                          </ShadAlertDescriptionComponent>
                        </Alert>
                      )}
                      {hasCameraPermission === true && (
                        <>
                          {!capturedImagePreview ? (
                            <div className="relative">
                              <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay playsInline muted />
                              <Button onClick={handleCaptureImage} className="absolute bottom-4 left-1/2 -translate-x-1/2">
                                <Camera className="mr-2 h-4 w-4" /> Ta Bild
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <Image src={capturedImagePreview} alt="Förhandsvisning av kvitto" width={600} height={800} className="rounded-md max-h-[60vh] w-auto mx-auto" data-ai-hint="receipt scan"/>
                              <div className="flex justify-center gap-4">
                                <Button onClick={handleRetakeImage} variant="outline">
                                  <RefreshCw className="mr-2 h-4 w-4" /> Ta om bild
                                </Button>
                                <Button onClick={handleUseImage}>
                                  <CheckCircle className="mr-2 h-4 w-4" /> Använd den här bilden
                                </Button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      {hasCameraPermission === null && !capturedImagePreview && (
                         <div className="flex items-center justify-center h-40">
                            <Loader2 className="h-8 w-8 animate-spin"/> <span className="ml-2">Startar kamera...</span>
                         </div>
                      )}
                    </div>
                    <canvas ref={canvasRef} className="hidden"></canvas>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="ghost">Avbryt</Button></DialogClose>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
            </div>
            {scannedReceiptImage && (
                <div className="mt-4">
                    <Label>Valt Kvitto:</Label>
                    <div className="relative w-32 h-40 border rounded-md overflow-hidden group">
                         <Image src={scannedReceiptImage} alt="Valt kvitto" layout="fill" objectFit="cover" data-ai-hint="receipt thumbnail"/>
                         <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => setScannedReceiptImage(null)}
                            type="button"
                         >
                            <Trash2 className="h-3 w-3"/>
                            <span className="sr-only">Ta bort bild</span>
                         </Button>
                    </div>
                </div>
            )}
             <p className="text-xs text-muted-foreground mt-1">Kvittobilden sparas tillsammans med inköpet. Information måste fortfarande anges manuellt.</p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="purchaseNotes">Anteckningar / Kvittoinformation (Valfritt)</Label>
            <Textarea id="purchaseNotes" placeholder="Fyll i detaljer från det skannade kvittot här, t.ex. specifika varor, garanti-ID..." value={notes} onChange={e => setNotes(e.target.value)} disabled={!activeBoardId || isLoadingCategories}/>
          </div>

          <Button size="lg" className="w-full" type="submit" disabled={isLoading || !activeBoardId || isLoadingBoards || isLoadingCategories}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Registrera Inköp"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

    