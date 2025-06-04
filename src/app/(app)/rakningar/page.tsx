
"use client";

import React, { useState, useEffect, FormEvent, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger, DialogDescription as ShadDialogDescription
} from '@/components/ui/dialog';
import { PlusCircle, Edit3, Trash2, CheckCircle, Circle, Loader2, AlertCircle, Camera, Upload, RefreshCw, Share2 as ShareIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query as firestoreQuery, where, getDocs, writeBatch, serverTimestamp, DocumentData, orderBy, FieldValue, getDoc } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertTitle, AlertDescription as ShadAlertDescriptionComponent } from "@/components/ui/alert";
import Image from 'next/image';
import { parseBill, type ParseBillInput, type ParseBillOutput } from '@/ai/flows/parse-bill-flow';
import SubscriptionPrompt from '@/components/shared/subscription-prompt';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth } from 'date-fns';
import { sv } from 'date-fns/locale';


interface Bill {
  id: string;
  title: string;
  amount: number;
  dueDate: string; // ISO String "YYYY-MM-DD"
  category: string; // Category ID
  notes?: string;
  paid: boolean;
  boardId: string;
  receiptImage?: string;
  createdAt?: any;
  updatedAt?: any;
  paidByUid?: string | null;
  paidByDisplayName?: string | null;
  isSharedCopy?: boolean;
  originalBoardId?: string | null;
  originalBillId?: string | null;
  sharedByUid?: string | null;
  sharedByDisplayName?: string | null;
  createdByUid?: string | null;
  createdByDisplayName?: string | null;
}

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  iconName?: string;
}


interface Board {
  id: string;
  name: string;
  ownerUid?: string;
  members?: string[];
  memberRoles?: { [uid: string]: 'viewer' | 'editor' };
}

type UserRole = 'owner' | 'editor' | 'viewer' | 'none';

const getUserRoleOnBoard = (board: Board | null | undefined, user: ReturnType<typeof useAuth>['currentUser'] | null): UserRole => {
  if (!user || !board) return 'none';
  if (board.ownerUid === user.uid) return 'owner';
  return board.memberRoles?.[user.uid] || (board.members?.includes(user.uid) ? 'viewer' : 'none');
};

interface ShareBillDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  billToShare: Bill | null;
  boards: Board[];
  currentBoardId: string | undefined;
  currentUserUid: string | undefined;
  currentUserDisplayName: string | undefined | null;
  onShareComplete: () => void;
}

const ShareBillDialog: React.FC<ShareBillDialogProps> = ({ isOpen, onOpenChange, billToShare, boards, currentBoardId, currentUserUid, currentUserDisplayName, onShareComplete }) => {
  const { toast } = useToast();
  const [selectedBoardIds, setSelectedBoardIds] = React.useState<Set<string>>(new Set());
  const [isSharing, setIsSharing] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) {
      setSelectedBoardIds(new Set());
    }
  }, [isOpen]);

  const handleToggleBoardSelection = (boardId: string) => {
    setSelectedBoardIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(boardId)) {
        newSet.delete(boardId);
      } else {
        newSet.add(boardId);
      }
      return newSet;
    });
  };

  const handleShare = async () => {
    if (!billToShare || selectedBoardIds.size === 0 || !currentBoardId || !currentUserUid) {
      toast({ title: "Fel", description: "Ingen räkning eller måltavla vald.", variant: "destructive" });
      return;
    }
    setIsSharing(true);
    let sharedCount = 0;
    try {
      const sharePromises = Array.from(selectedBoardIds).map(async (targetBoardId) => {
        const newBillData: Omit<Bill, 'id' | 'createdAt' | 'updatedAt' | 'paid' | 'paidByUid' | 'paidByDisplayName' | 'boardId' > & { boardId: string, paid: boolean, createdAt: any, paidByUid: null, paidByDisplayName: null } = {
          title: billToShare.title,
          amount: billToShare.amount,
          dueDate: billToShare.dueDate,
          category: billToShare.category,
          notes: billToShare.notes,
          receiptImage: billToShare.receiptImage,
          boardId: targetBoardId,
          paid: false,
          paidByUid: null,
          paidByDisplayName: null,
          isSharedCopy: true,
          originalBoardId: currentBoardId,
          originalBillId: billToShare.id,
          sharedByUid: currentUserUid,
          sharedByDisplayName: currentUserDisplayName || "Okänd användare",
          createdByUid: billToShare.createdByUid || currentUserUid,
          createdByDisplayName: billToShare.createdByDisplayName || currentUserDisplayName || "Okänd användare",
          createdAt: serverTimestamp(),
        };
        const targetBillsCollectionRef = collection(db, 'boards', targetBoardId, 'bills');
        await addDoc(targetBillsCollectionRef, newBillData);
        sharedCount++;
      });
      await Promise.all(sharePromises);
      toast({ title: "Räkning Delad", description: `Räkningen "${billToShare.title}" har delats med ${sharedCount} tavla/tavlor.` });
      onShareComplete();
      onOpenChange(false);
    } catch (error) {
      console.error("Error sharing bill:", error);
      toast({ title: "Fel vid Delning", description: "Kunde inte dela räkningen.", variant: "destructive" });
    } finally {
      setIsSharing(false);
    }
  };

  const otherBoards = boards.filter(board => board.id !== currentBoardId);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange} key={billToShare ? `share-dialog-${billToShare.id}` : 'share-dialog-empty'}>
      <DialogContent className="sm:max-w-[90vw] md:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Dela Räkning: {billToShare?.title}</DialogTitle>
          <ShadDialogDescription>
            Välj vilka av dina andra budgettavlor du vill dela (kopiera) denna räkning till. En ny, obetald kopia av räkningen kommer att skapas på de valda tavlorna.
          </ShadDialogDescription>
        </DialogHeader>
        {otherBoards.length > 0 ? (
          <div className="space-y-3 py-4 max-h-[50vh] overflow-y-auto">
            {otherBoards.map(board => (
              <div key={board.id} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-muted/50">
                <Checkbox
                  id={`share-board-${board.id}`}
                  checked={selectedBoardIds.has(board.id)}
                  onCheckedChange={() => handleToggleBoardSelection(board.id)}
                />
                <Label htmlFor={`share-board-${board.id}`} className="flex-1 cursor-pointer">{board.name}</Label>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-4 text-muted-foreground">Du har inga andra tavlor att dela denna räkning med.</p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSharing}>Avbryt</Button>
          <Button type="button" onClick={handleShare} disabled={isSharing || selectedBoardIds.size === 0 || otherBoards.length === 0}>
            {isSharing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Dela Valda"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


export default function BillsPage() {
  const { currentUser, subscription, loading: authLoading, mainBoardId } = useAuth();
  const { toast } = useToast();
  const [bills, setBills] = React.useState<Bill[]>([]);
  const [isLoadingBoards, setIsLoadingBoards] = React.useState(true);
  const [isLoadingPageData, setIsLoadingPageData] = React.useState(false);


  const [boards, setBoards] = React.useState<Board[]>([]);
  const [activeBoardId, setActiveBoardId] = React.useState<string | undefined>(undefined);
  const [activeBoardName, setActiveBoardName] = React.useState<string>("");
  const [pageExpenseCategories, setPageExpenseCategories] = React.useState<Category[]>([]);

  const activeBoardDetails = React.useMemo(() => boards.find(b => b.id === activeBoardId), [boards, activeBoardId]);
  const currentUserRoleOnActiveBoard = React.useMemo(() => getUserRoleOnBoard(activeBoardDetails, currentUser), [activeBoardDetails, currentUser]);
  const canEditActiveBoard = React.useMemo(() => currentUserRoleOnActiveBoard === 'owner' || currentUserRoleOnActiveBoard === 'editor', [currentUserRoleOnActiveBoard]);


  const [isBillDialogOpen, setIsBillDialogOpen] = React.useState(false);
  const [currentBill, setCurrentBill] = React.useState<Partial<Bill> & { id?: string } | null>(null);
  const [billTitle, setBillTitle] = React.useState('');
  const [billAmount, setBillAmount] = React.useState('');
  const [billDueDate, setBillDueDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [billCategory, setBillCategory] = React.useState('');
  const [billNotes, setBillNotes] = React.useState('');
  const [dialogError, setDialogError] = React.useState<string | null>(null);
  const [billReceiptImage, setBillReceiptImage] = React.useState<string | null>(null);

  const [dialogTargetBoardId, setDialogTargetBoardId] = React.useState<string | undefined>(undefined);
  const [dialogExpenseCategories, setDialogExpenseCategories] = React.useState<Category[]>([]);
  const [isLoadingDialogCategories, setIsLoadingDialogCategories] = React.useState(false);


  const [isCameraModalOpen, setIsCameraModalOpen] = React.useState(false);
  const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);
  const [capturedImagePreview, setCapturedImagePreview] = React.useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isParsingBill, setIsParsingBill] = React.useState(false);

  const [isShareBillDialogOpen, setIsShareBillDialogOpen] = React.useState(false);
  const [billToShare, setBillToShare] = React.useState<Bill | null>(null);

  const [selectedMonthDate, setSelectedMonthDate] = useState<Date>(startOfMonth(new Date()));

  const handlePreviousMonth = () => setSelectedMonthDate(prevDate => subMonths(prevDate, 1));
  const handleNextMonth = () => setSelectedMonthDate(prevDate => addMonths(prevDate, 1));
  const isCurrentMonthOrFuture = useMemo(() => {
    const currentMonthStart = startOfMonth(new Date());
    return isSameMonth(selectedMonthDate, currentMonthStart) || selectedMonthDate > currentMonthStart;
  }, [selectedMonthDate]);
  const formattedSelectedMonth = useMemo(() => {
    return format(selectedMonthDate, 'MMMM yyyy', { locale: sv });
  }, [selectedMonthDate]);


  const isSubscribed = React.useMemo(() => {
    return subscription?.status === 'active' && (subscription.expiresAt ? subscription.expiresAt > new Date() : true);
  }, [subscription]);

  // Effect 1: Fetch user's boards
  React.useEffect(() => {
    if (authLoading || !currentUser?.uid || !isSubscribed) {
      setBoards([]);
      setActiveBoardId(undefined);
      setIsLoadingBoards(false);
      return;
    }
    setIsLoadingBoards(true);
    const boardsRef = collection(db, 'boards');
    const q = firestoreQuery(boardsRef, where('members', 'array-contains', currentUser.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      let fetchedBoards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Board));
      fetchedBoards.sort((a,b) => a.name.localeCompare(b.name));
      setBoards(fetchedBoards);
      setIsLoadingBoards(false);
    }, (error: any) => {
      console.error("Error fetching boards for Bills page: ", error);
      let description = "Kunde inte hämta dina budgettavlor. ";
      if (error.code === 'permission-denied' || error.code === 'PERMISSION_DENIED') {
          description += "Kontrollera dina Firestore-säkerhetsregler och att inga webbläsartillägg blockerar Firebase.\n\n**Vanliga Orsaker:**\n1. **Webbläsartillägg:** Reklamblockerare (AdBlock, uBlock) eller integritetsverktyg kan blockera anrop till Firebase. Prova att tillfälligt inaktivera dessa och ladda om sidan.\n2. **Firestore Säkerhetsregler:** Dina regler i Firebase Console tillåter inte denna läsoperation. Säkerställ att en inloggad användare får läsa tavlor där deras UID finns i 'members'-arrayen.\n3. **Nätverksproblem:** Kontrollera din internetanslutning.\n\nDetaljer: " + error.message;
        } else {
          description += "Försök igen senare. Detaljer: " + error.message;
        }
      toast({title: "Fel vid hämtning av tavlor", description, variant: "destructive", duration: 20000});
      setBoards([]);
      setActiveBoardId(undefined);
      setIsLoadingBoards(false);
    });
    return () => unsub();
  }, [currentUser?.uid, isSubscribed, authLoading, toast]);


  // Effect 2: Set activeBoardId based on mainBoardId or first available board
  React.useEffect(() => {
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


  // Update activeBoardName when activeBoardId or boards change
  React.useEffect(() => {
    if (activeBoardId && boards.length > 0) {
        const currentBoard = boards.find(b => b.id === activeBoardId);
        setActiveBoardName(currentBoard ? currentBoard.name : "");
    } else if (!activeBoardId) {
        setActiveBoardName("");
    }
  }, [activeBoardId, boards]);


  // Effect 3: Fetch bills and pageExpenseCategories for the active board and selected month
  React.useEffect(() => {
    if (!currentUser?.uid || !activeBoardId || !isSubscribed || authLoading) {
      setBills([]);
      setPageExpenseCategories([]);
      if (isLoadingPageData) setIsLoadingPageData(false);
      return;
    }
    setIsLoadingPageData(true);
    setBills([]);
    setPageExpenseCategories([]);

    let unsubBills: () => void = () => {};
    let unsubCategories: () => void = () => {};

    const billsRef = collection(db, 'boards', activeBoardId, 'bills');
    const currentMonthStart = format(startOfMonth(selectedMonthDate), 'yyyy-MM-dd');
    const currentMonthEnd = format(endOfMonth(selectedMonthDate), 'yyyy-MM-dd');

    const billsQuery = firestoreQuery(
        billsRef,
        where("dueDate", ">=", currentMonthStart),
        where("dueDate", "<=", currentMonthEnd),
        orderBy("dueDate", "asc")
    );
    unsubBills = onSnapshot(billsQuery, (snapshot) => {
      let fetchedBills = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bill));
      setBills(fetchedBills);
      setIsLoadingPageData(false);
    }, (error) => {
      console.error("Error fetching bills for board", activeBoardId, "and month", formattedSelectedMonth, error);
      toast({ title: "Fel", description: "Kunde inte hämta räkningar för vald månad.", variant: "destructive" });
      setIsLoadingPageData(false);
    });

    const categoriesRef = collection(db, 'boards', activeBoardId, 'categories');
    const categoriesQuery = firestoreQuery(categoriesRef);
    unsubCategories = onSnapshot(categoriesQuery, (snapshot) => {
      let fetchedCategories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      fetchedCategories = fetchedCategories.filter(c => c.type === 'expense').sort((a,b) => a.name.localeCompare(b.name));
      setPageExpenseCategories(fetchedCategories);
    }, (error) => {
      console.error("Error fetching categories for page", activeBoardId, error);
      toast({ title: "Fel", description: "Kunde inte hämta utgiftskategorier.", variant: "destructive" });
    });

    return () => {
      unsubBills();
      unsubCategories();
    }
  }, [currentUser?.uid, activeBoardId, selectedMonthDate, toast, isSubscribed, authLoading, formattedSelectedMonth]);

 // Effect 4: Fetch expense categories for the dialog when dialogTargetBoardId changes (for new bills)
 React.useEffect(() => {
    if (!isBillDialogOpen || !dialogTargetBoardId || !currentUser?.uid || currentBill?.id) {
      if(!currentBill?.id && !dialogTargetBoardId) setDialogExpenseCategories([]);
      return;
    }
    setIsLoadingDialogCategories(true);
    const categoriesRef = collection(db, 'boards', dialogTargetBoardId, 'categories');
    const categoriesQuery = firestoreQuery(categoriesRef);

    getDocs(categoriesQuery)
      .then((snapshot) => {
        let fetchedCategories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
        fetchedCategories = fetchedCategories.filter(c => c.type === 'expense').sort((a,b) => a.name.localeCompare(b.name));
        setDialogExpenseCategories(fetchedCategories);
      })
      .catch((error) => {
        console.error("Error fetching categories for dialog target board", dialogTargetBoardId, error);
        toast({ title: "Fel", description: "Kunde inte hämta kategorier för vald måltavla.", variant: "destructive" });
        setDialogExpenseCategories([]);
      })
      .finally(() => {
        setIsLoadingDialogCategories(false);
      });
  }, [isBillDialogOpen, dialogTargetBoardId, currentUser?.uid, currentBill?.id, toast]);


  React.useEffect(() => {
    const startCamera = async () => {
      if (isCameraModalOpen && !capturedImagePreview) {
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
  }, [isCameraModalOpen, toast, capturedImagePreview]);

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

  const handleUseCapturedImage = async () => {
    if (capturedImagePreview) {
      await processBillImage(capturedImagePreview);
    }
    setCapturedImagePreview(null);
    setIsCameraModalOpen(false);
  };

  const handleImageFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        await processBillImage(reader.result as string);
      };
      reader.readAsDataURL(file);
      if (event.target) event.target.value = "";
    }
  };

  const processBillImage = async (imageDataUri: string) => {
    setBillReceiptImage(imageDataUri);
    setIsParsingBill(true);
    setDialogError(null);
    // Reset form fields for AI parsing
    setBillTitle('');
    setBillAmount('');
    // Set due date to first of selected month when parsing, user can change
    setBillDueDate(format(startOfMonth(selectedMonthDate), 'yyyy-MM-dd'));
    setBillCategory('');
    setBillNotes('');
    setCurrentBill(null);
    // If activeBoardId is set, use it for the dialog target
    if (activeBoardId) {
        setDialogTargetBoardId(activeBoardId);
    }


    try {
      const input: ParseBillInput = { billImageUri: imageDataUri };
      const result: ParseBillOutput = await parseBill(input);

      if (result.title) setBillTitle(result.title);
      if (result.amount !== undefined) setBillAmount(String(result.amount));
      if (result.dueDate) {
         // Ensure parsed due date is valid before setting
        try {
            const parsed = new Date(result.dueDate);
            if (!isNaN(parsed.getTime())) {
                setBillDueDate(result.dueDate);
            } else {
                 toast({ title: "Varning", description: "AI kunde inte tolka ett giltigt förfallodatum. Standarddatum används.", variant: "default" });
            }
        } catch (e) {
            toast({ title: "Varning", description: "AI returnerade ett ogiltigt förfallodatumformat. Standarddatum används.", variant: "default" });
        }
      }


      toast({ title: "Räkningsdata Extraherad", description: "Fälten har fyllts i. Välj måltavla och kategori, granska och spara."});
    } catch (err) {
      console.error("Error parsing bill:", err);
      toast({ title: "Fel vid Ränningstolkning", description: "Kunde inte tolka räkningen automatiskt. Fyll i manuellt.", variant: "destructive" });
      setDialogError("Kunde inte tolka räkningen. Fyll i manuellt.");
    } finally {
      setIsParsingBill(false);
      setIsBillDialogOpen(true);
    }
  };


  const handleOpenNewBillDialog = () => {
    if (!canEditActiveBoard && activeBoardId) {
      toast({ title: "Åtkomst Nekad", description: "Du har inte behörighet att lägga till räkningar på denna tavla.", variant: "destructive" });
      return;
    }
    if (!activeBoardId) {
        toast({ title: "Ingen Tavla Vald", description: "Välj en budgettavla först.", variant: "destructive" });
        return;
    }
    setCurrentBill(null);
    setBillTitle('');
    setBillAmount('');
    // Default due date to first of currently selected month on the page
    setBillDueDate(format(startOfMonth(selectedMonthDate), 'yyyy-MM-dd'));
    setBillCategory('');
    setBillNotes('');
    setBillReceiptImage(null);
    setDialogError(null);
    setDialogTargetBoardId(activeBoardId);
    setDialogExpenseCategories(pageExpenseCategories);
    setIsBillDialogOpen(true);
  };

  const handleSaveBill = async (e: FormEvent) => {
    e.preventDefault();
    setDialogError(null);

    const boardForBill = currentBill?.id ? currentBill.boardId : dialogTargetBoardId;

    if (!currentUser || !currentUser.uid || !boardForBill) {
      setDialogError("Ingen användare eller måltavla vald.");
      return;
    }

    const targetBoardDetails = boards.find(b => b.id === boardForBill);
    const roleOnTargetBoard = getUserRoleOnBoard(targetBoardDetails, currentUser);
    const canEditTargetBoard = roleOnTargetBoard === 'owner' || roleOnTargetBoard === 'editor';

    if (!canEditTargetBoard) {
      toast({ title: "Åtkomst Nekad", description: `Du har inte behörighet att spara räkningar på tavlan "${targetBoardDetails?.name || boardForBill}".`, variant: "destructive" });
      setDialogError(`Du har inte behörighet att spara räkningar på tavlan "${targetBoardDetails?.name || boardForBill}".`);
      return;
    }

    if (!billTitle || !billAmount || !billCategory) {
      setDialogError("Titel, belopp och kategori måste fyllas i.");
      return;
    }
    const numericAmount = parseFloat(billAmount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setDialogError("Ogiltigt belopp.");
      return;
    }

    const billPayload: Partial<Bill> = {
      title: billTitle,
      amount: numericAmount,
      dueDate: billDueDate, // This is crucial for monthly filtering
      category: billCategory,
      notes: billNotes || '',
      boardId: boardForBill,
      receiptImage: billReceiptImage,
      isSharedCopy: currentBill?.isSharedCopy || false,
      originalBillId: currentBill?.originalBillId || null,
      originalBoardId: currentBill?.originalBoardId || null,
      sharedByUid: currentBill?.sharedByUid || null,
      sharedByDisplayName: currentBill?.sharedByDisplayName || null,
    };

    if (!currentBill?.id) {
      billPayload.createdByUid = currentUser.uid;
      billPayload.createdByDisplayName = currentUser.displayName || currentUser.email || "Okänd användare";
      billPayload.paid = false;
      billPayload.paidByUid = null;
      billPayload.paidByDisplayName = null;
    } else {
      billPayload.paid = currentBill.paid;
      billPayload.paidByUid = currentBill.paidByUid;
      billPayload.paidByDisplayName = currentBill.paidByDisplayName;
    }


    try {
      const billsCollectionRef = collection(db, 'boards', boardForBill, 'bills');
      if (currentBill?.id) {
        billPayload.updatedAt = serverTimestamp();
        delete billPayload.createdByUid;
        delete billPayload.createdByDisplayName;
        await updateDoc(doc(billsCollectionRef, currentBill.id), billPayload);
        toast({ title: "Räkning Uppdaterad" });
      } else {
        billPayload.createdAt = serverTimestamp();
        await addDoc(billsCollectionRef, billPayload);
        toast({ title: "Räkning Tillagd" });
      }
      setIsBillDialogOpen(false);
      // Reset form to defaults for next new bill
      setBillTitle('');
      setBillAmount('');
      setBillDueDate(format(startOfMonth(selectedMonthDate), 'yyyy-MM-dd')); // Reset to current viewing month
      setBillNotes('');
      setBillReceiptImage(null);
      setCurrentBill(null);
      setDialogTargetBoardId(activeBoardId); // Reset target to current active board
      setBillCategory('');
    } catch (error) {
      console.error("Error saving bill:", error);
      toast({ title: "Fel", description: "Kunde inte spara räkningen.", variant: "destructive" });
      setDialogError("Ett fel uppstod när räkningen skulle sparas.");
    }
  };

  const toggleBillPaidStatus = async (bill: Bill) => {
    if (!currentUser || !currentUser.uid || !bill.boardId ) return;

    const targetBoardDetails = boards.find(b => b.id === bill.boardId);
    const roleOnTargetBoard = getUserRoleOnBoard(targetBoardDetails, currentUser);
    const canEditTargetBoard = roleOnTargetBoard === 'owner' || roleOnTargetBoard === 'editor';

    if (!canEditTargetBoard) {
       toast({ title: "Åtkomst Nekad", description: `Du har inte behörighet att ändra betalstatus på tavlan "${targetBoardDetails?.name || bill.boardId}".`, variant: "destructive" });
       return;
    }

    const billDocRef = doc(db, 'boards', bill.boardId, 'bills', bill.id);
    const transactionsRef = collection(db, 'boards', bill.boardId, 'transactions');
    const batch = writeBatch(db);

    try {
      if (!bill.paid) {
        batch.update(billDocRef, {
          paid: true,
          paidByUid: currentUser.uid,
          paidByDisplayName: currentUser.displayName || currentUser.email || "Okänd användare"
        });
        const newTransactionRef = doc(transactionsRef);
        batch.set(newTransactionRef, {
          title: `Betalning: ${bill.title}`,
          amount: bill.amount,
          date: new Date().toISOString().split('T')[0], // Transaction date is today
          category: bill.category,
          type: 'expense',
          description: `Automatisk transaktion för betald räkning (ID: ${bill.id}).`,
          linkedBillId: bill.id,
          createdAt: serverTimestamp(),
          boardId: bill.boardId
        });
        await batch.commit();
        toast({title: "Räkning Betald", description: `${bill.title} markerad som betald och transaktion skapad.`});
      } else {
        batch.update(billDocRef, {
          paid: false,
          paidByUid: null,
          paidByDisplayName: null
        });
        const q = firestoreQuery(transactionsRef, where("linkedBillId", "==", bill.id), where("type", "==", "expense"));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((transactionDoc) => {
          batch.delete(transactionDoc.ref);
        });
        await batch.commit();
        toast({title: "Räkning Markerad", description: `${bill.title} markerad som obetald och transaktion borttagen.`});
      }
    } catch (error: any) {
      console.error("Error updating bill status:", error);
      let description = "Kunde inte uppdatera räkningens status.";
      if (error.code === 'permission-denied' || error.code === 'PERMISSION_DENIED') {
        description = "Åtkomst nekad. Kontrollera dina Firestore-säkerhetsregler. Fullständigt fel: " + error.message;
      }
      toast({ title: "Fel", description, variant: "destructive", duration: 10000 });
    }
  };

  const handleDeleteBill = async (billId: string, boardIdOfBill: string) => {
    if (!currentUser || !currentUser.uid || !boardIdOfBill) {
        toast({ title: "Fel", description: "Nödvändig information saknas för att radera.", variant: "destructive" });
        return;
    }

    const targetBoardDetails = boards.find(b => b.id === boardIdOfBill);
    const roleOnTargetBoard = getUserRoleOnBoard(targetBoardDetails, currentUser);

    if (!canEditActiveBoard) {
        toast({ title: "Åtkomst Nekad", description: `Du har inte behörighet att radera räkningar på tavlan "${targetBoardDetails?.name || boardIdOfBill}".`, variant: "destructive" });
        return;
    }

    const billToDelete = bills.find(b => b.id === billId && b.boardId === boardIdOfBill);
    if (!billToDelete) {
        toast({ title: "Fel", description: "Räkningen kunde inte hittas i den lokala listan.", variant: "destructive" });
        return;
    }


    if (!confirm(`Är du säker på att du vill radera räkningen "${billToDelete.title}" från tavlan "${activeBoardName || 'denna tavla'}"?\n${billToDelete.paid ? 'Detta kommer också att ta bort den kopplade betalningstransaktionen på denna tavla.' : ''}`)) {
        return;
    }

    const billDocRef = doc(db, 'boards', boardIdOfBill, 'bills', billId);
    const transactionsRef = collection(db, 'boards', boardIdOfBill, 'transactions');
    const batch = writeBatch(db);

    try {
      batch.delete(billDocRef);

      if (billToDelete.paid) {
        const q = firestoreQuery(transactionsRef, where("linkedBillId", "==", billId), where("type", "==", "expense"));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            querySnapshot.forEach((transactionDoc) => {
              batch.delete(transactionDoc.ref);
            });
        }
      }
      await batch.commit();
      toast({title: "Räkning Raderad", description: `Räkningen "${billToDelete.title}" och eventuell kopplad transaktion har raderats från tavlan "${activeBoardName || 'denna tavla'}".`});
    } catch (error: any) {
      console.error("Error during batch commit or Firestore operation:", error);
      let description = "Kunde inte radera räkningen.";
      if (error.code === 'permission-denied' || error.code === 'PERMISSION_DENIED') {
        description = "Åtkomst nekad. Kontrollera dina Firestore-säkerhetsregler. Fullständigt fel: " + error.message;
      }
      toast({ title: "Fel vid radering av räkning", description, variant: "destructive", duration: 10000 });
    }
  };


  const unpaidBills = React.useMemo(() => bills.filter(b => !b.paid), [bills]);
  const paidBills = React.useMemo(() => bills.filter(b => b.paid), [bills]);

  const categoriesForDialog = currentBill?.id ? pageExpenseCategories : dialogExpenseCategories;


  if (authLoading && !currentUser) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /> Laddar användardata...</div>;
  }
  if (!currentUser && !authLoading) {
    return <div className="text-center p-8">Vänligen logga in för att se dina räkningar.</div>;
  }
  if (!isSubscribed && currentUser) {
    return <SubscriptionPrompt featureName="Räkningar" />;
  }
  if (isLoadingBoards) {
     return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /> Laddar budgettavlor...</div>;
  }
  if (boards.length === 0 && !isLoadingBoards && !authLoading && !isLoadingPageData) {
     return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Inga Budgettavlor Hittades</AlertTitle>
          <ShadAlertDescriptionComponent>Du behöver skapa en budgettavla på Kontrollpanelen först.</ShadAlertDescriptionComponent>
        </Alert>
     );
  }
   if (!isLoadingBoards && !activeBoardId && boards.length > 0 && currentUser && isSubscribed && !isLoadingPageData) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Välj en Tavla</AlertTitle>
        <ShadAlertDescriptionComponent>Välj en budgettavla ovan för att se eller lägga till räkningar.</ShadAlertDescriptionComponent>
      </Alert>
    );
  }


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <h1 className="text-2xl font-semibold">Mina Räkningar {activeBoardName && `(${activeBoardName})`}</h1>
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center w-full sm:w-auto">
          {boards.length > 0 && (
             <Select
               value={activeBoardId}
               onValueChange={(value) => {
                 setActiveBoardId(value);
               }}
               disabled={isLoadingBoards || boards.length === 0 || isLoadingPageData}
             >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={boards.length === 0 ? "Inga tavlor" : "Välj tavla..."} />
              </SelectTrigger>
              <SelectContent>
                {boards.map(board => (
                  <SelectItem key={board.id} value={board.id}>{board.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
             <Button onClick={() => setIsCameraModalOpen(true)} variant="outline" disabled={!activeBoardId || isParsingBill || !canEditActiveBoard || isLoadingPageData} className="flex-1 sm:flex-initial">
                <Camera className="mr-2 h-4 w-4" /> Skanna Räkning {isParsingBill && <Loader2 className="ml-2 h-4 w-4 animate-spin"/>}
            </Button>
            <Input
                id="billUpload"
                type="file"
                className="hidden"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageFileUpload}
                disabled={!activeBoardId || isParsingBill || !canEditActiveBoard || isLoadingPageData}
            />
            <Button onClick={() => fileInputRef.current?.click()} variant="outline" disabled={!activeBoardId || isParsingBill || !canEditActiveBoard || isLoadingPageData} className="flex-1 sm:flex-initial">
                <Upload className="mr-2 h-4 w-4" /> Ladda upp Räkning {isParsingBill && <Loader2 className="ml-2 h-4 w-4 animate-spin"/>}
            </Button>
            <Button onClick={handleOpenNewBillDialog} disabled={!activeBoardId || isParsingBill || !canEditActiveBoard || isLoadingPageData} className="flex-1 sm:flex-initial">
                <PlusCircle className="mr-2 h-4 w-4" /> Lägg till Manuellt
            </Button>
          </div>
        </div>
      </div>

      {activeBoardId && (
        <div className="flex items-center justify-center sm:justify-start gap-4 my-2">
          <Button variant="outline" size="icon" onClick={handlePreviousMonth} disabled={isLoadingPageData}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-lg font-medium w-40 text-center tabular-nums">
            {formattedSelectedMonth}
          </span>
          <Button variant="outline" size="icon" onClick={handleNextMonth} disabled={isLoadingPageData || isCurrentMonthOrFuture}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {(isLoadingPageData && activeBoardId) && <div className="flex justify-center items-center h-32"><Loader2 className="h-8 w-8 animate-spin" /> Laddar räkningar för {formattedSelectedMonth}...</div>}


      {!isLoadingPageData && activeBoardId && (
        <>
          <Card>
            <CardHeader><CardTitle>Obetalda Räkningar ({formattedSelectedMonth})</CardTitle></CardHeader>
            <CardContent>
              {unpaidBills.length > 0 ? (
                <ul className="space-y-3">
                  {unpaidBills.map(bill => (
                    <li key={bill.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-md shadow-sm hover:bg-muted/50 gap-2">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Checkbox id={`bill-${bill.id}`} checked={bill.paid} onCheckedChange={() => toggleBillPaidStatus(bill)} aria-label={`Markera ${bill.title} som ${bill.paid ? 'obetald' : 'betald'}`} disabled={!canEditActiveBoard || isLoadingPageData}/>
                        <div className="min-w-0">
                          <Label htmlFor={`bill-${bill.id}`} className={`font-semibold cursor-pointer truncate block ${!canEditActiveBoard ? 'cursor-default' : ''}`}>{bill.title}</Label>
                          <p className="text-xs text-muted-foreground">Förfaller: {new Date(bill.dueDate + 'T00:00:00').toLocaleDateString('sv-SE')} - {pageExpenseCategories.find(c=>c.id === bill.category)?.name || bill.category}</p>
                          {bill.notes && <p className="text-xs mt-1 break-words">{bill.notes}</p>}
                          {bill.createdByDisplayName && (<p className="text-xs mt-1 text-gray-500 dark:text-gray-400">Skapad av: {bill.createdByDisplayName}</p>)}
                           {bill.isSharedCopy && bill.sharedByDisplayName && (
                            <p className="text-xs mt-1 text-blue-600 dark:text-blue-400">Delad av: {bill.sharedByDisplayName}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end sm:flex-row sm:items-center gap-1 sm:gap-2 mt-2 sm:mt-0 shrink-0 w-full sm:w-auto justify-end">
                         <p className="font-semibold text-base sm:text-sm text-destructive whitespace-nowrap">- {bill.amount.toLocaleString('sv-SE')} kr</p>
                         {canEditActiveBoard && (
                            <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setBillToShare(bill); setIsShareBillDialogOpen(true); }} aria-label={`Dela räkningen ${bill.title}`} disabled={isLoadingPageData}><ShareIcon className="h-4 w-4"/></Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setCurrentBill(bill); setBillTitle(bill.title); setBillAmount(String(bill.amount)); setBillDueDate(bill.dueDate); setBillCategory(bill.category); setBillNotes(bill.notes || ''); setBillReceiptImage(bill.receiptImage || null); setDialogError(null); setDialogTargetBoardId(bill.boardId); setDialogExpenseCategories(pageExpenseCategories); setIsBillDialogOpen(true); }} aria-label={`Redigera räkningen ${bill.title}`} disabled={isLoadingPageData}><Edit3 className="h-4 w-4"/></Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteBill(bill.id, bill.boardId)} aria-label={`Radera räkningen ${bill.title}`} disabled={isLoadingPageData}><Trash2 className="h-4 w-4"/></Button>
                            </div>
                         )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-8"><CheckCircle className="mx-auto h-12 w-12 text-accent" /><h3 className="mt-2 text-lg font-medium">Inga obetalda räkningar för {formattedSelectedMonth}!</h3><p className="mt-1 text-sm text-muted-foreground">Bra jobbat!</p></div>
              )}
            </CardContent>
          </Card>
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle>Betalda Räkningar ({formattedSelectedMonth})</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">Historik över dina betalda räkningar för {formattedSelectedMonth}.</CardDescription>
            </CardHeader>
            <CardContent>
              {paidBills.length > 0 ? (
                <ul className="space-y-3">
                  {paidBills.map(bill => (
                    <li key={bill.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-md bg-muted/30 gap-2">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Checkbox id={`bill-paid-${bill.id}`} checked={bill.paid} onCheckedChange={() => toggleBillPaidStatus(bill)} aria-label={`Markera ${bill.title} som ${bill.paid ? 'obetald' : 'betald'}`} disabled={!canEditActiveBoard || isLoadingPageData}/>
                        <div className="min-w-0">
                          <Label htmlFor={`bill-paid-${bill.id}`} className={`font-semibold cursor-pointer line-through text-muted-foreground truncate block ${!canEditActiveBoard ? 'cursor-default' : ''}`}>{bill.title}</Label>
                          <p className="text-xs text-muted-foreground/80">Förfallodatum: {new Date(bill.dueDate + 'T00:00:00').toLocaleDateString('sv-SE')} - {pageExpenseCategories.find(c=>c.id === bill.category)?.name || bill.category}</p>
                          {bill.paidByDisplayName && <p className="text-xs text-muted-foreground/80">Betald av: {bill.paidByDisplayName}</p>}
                          {bill.createdByDisplayName && (<p className="text-xs mt-1 text-gray-500 dark:text-gray-400">Skapad av: {bill.createdByDisplayName}</p>)}
                          {bill.isSharedCopy && bill.sharedByDisplayName && (
                            <p className="text-xs mt-1 text-blue-600 dark:text-blue-400">Delad av: {bill.sharedByDisplayName}</p>
                          )}
                        </div>
                      </div>
                       <div className="flex flex-col items-end sm:flex-row sm:items-center gap-1 sm:gap-2 mt-2 sm:mt-0 shrink-0 w-full sm:w-auto justify-end">
                        <p className="font-semibold text-muted-foreground line-through text-base sm:text-sm text-destructive whitespace-nowrap">- {bill.amount.toLocaleString('sv-SE')} kr</p>
                         {canEditActiveBoard && (
                            <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setBillToShare(bill); setIsShareBillDialogOpen(true); }} aria-label={`Dela räkningen ${bill.title}`} disabled={isLoadingPageData}><ShareIcon className="h-4 w-4"/></Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setCurrentBill(bill); setBillTitle(bill.title); setBillAmount(String(bill.amount)); setBillDueDate(bill.dueDate); setBillCategory(bill.category); setBillNotes(bill.notes || ''); setBillReceiptImage(bill.receiptImage || null); setDialogError(null); setDialogTargetBoardId(bill.boardId); setDialogExpenseCategories(pageExpenseCategories); setIsBillDialogOpen(true); }} aria-label={`Redigera räkningen ${bill.title}`} disabled={isLoadingPageData}><Edit3 className="h-4 w-4"/></Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteBill(bill.id, bill.boardId)} aria-label={`Radera räkningen ${bill.title}`} disabled={isLoadingPageData}><Trash2 className="h-4 w-4"/></Button>
                            </div>
                         )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (<p className="text-sm text-muted-foreground">Inga betalda räkningar för {formattedSelectedMonth}.</p>)}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={isBillDialogOpen} onOpenChange={(isOpen) => {
        setIsBillDialogOpen(isOpen);
        if (!isOpen) {
          setBillTitle('');
          setBillAmount('');
          setBillDueDate(format(startOfMonth(selectedMonthDate), 'yyyy-MM-dd')); // Reset to current viewing month
          setBillNotes('');
          setBillReceiptImage(null);
          setCurrentBill(null);
          setDialogError(null);
          setDialogTargetBoardId(undefined);
          setBillCategory('');
          setDialogExpenseCategories([]);
          setIsParsingBill(false);
        }
      }}>
        <DialogContent className="sm:max-w-[90vw] md:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{currentBill?.id ? 'Redigera Räkning' : 'Lägg till Ny Räkning'}</DialogTitle>
            <ShadDialogDescription>
              Fyll i detaljer för din räkning. {isParsingBill && "Tolkar räkning..."}
            </ShadDialogDescription>
          </DialogHeader>

          {dialogError && (
            <Alert variant="destructive" className="my-2">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Fel</AlertTitle>
              <ShadAlertDescriptionComponent>{dialogError}</ShadAlertDescriptionComponent>
            </Alert>
          )}
          <form onSubmit={handleSaveBill}>
            <div className="grid gap-4 py-4">
              {!currentBill?.id && boards.length > 0 && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="billTargetBoardDlg" className="text-right">Måltavla</Label>
                  <Select
                    value={dialogTargetBoardId}
                    onValueChange={(value) => {
                      setDialogTargetBoardId(value);
                      setBillCategory('');
                    }}
                    required
                    disabled={isParsingBill || isLoadingDialogCategories}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Välj måltavla för räkningen" />
                    </SelectTrigger>
                    <SelectContent>
                      {boards.map(board => (<SelectItem key={board.id} value={board.id}>{board.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {billReceiptImage && (
                <div className="mb-4">
                  <Label>Räkningsbild:</Label>
                  <div className="relative w-full aspect-[3/2] sm:aspect-[2/1] border rounded-md overflow-hidden group mt-1">
                        <Image src={billReceiptImage} alt="Räkningsbild" layout="fill" objectFit="contain" data-ai-hint="bill image"/>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => setBillReceiptImage(null)}
                          type="button"
                        >
                          <Trash2 className="h-3 w-3"/>
                          <span className="sr-only">Ta bort bild</span>
                        </Button>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="billTitleDlg" className="text-right">Titel</Label>
                <Input id="billTitleDlg" value={billTitle} onChange={e => setBillTitle(e.target.value)} placeholder="Hyra, Elräkning" className="col-span-3" required disabled={isParsingBill} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="billAmountDlg" className="text-right">Belopp (kr)</Label>
                <Input id="billAmountDlg" type="number" value={billAmount} onChange={e => setBillAmount(e.target.value)} placeholder="1500.00" className="col-span-3" required disabled={isParsingBill} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="billDueDateDlg" className="text-right">Förfallodatum</Label>
                <Input id="billDueDateDlg" type="date" value={billDueDate} onChange={e => setBillDueDate(e.target.value)} className="col-span-3" required disabled={isParsingBill}/>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="billCategoryDlg" className="text-right">Kategori</Label>
                <Select
                  value={billCategory}
                  onValueChange={setBillCategory}
                  required
                  disabled={isParsingBill || isLoadingDialogCategories || (!currentBill?.id && !dialogTargetBoardId) || categoriesForDialog.length === 0}
                >
                  <SelectTrigger className="col-span-3"><SelectValue placeholder="Välj en kategori" /></SelectTrigger>
                  <SelectContent>
                    {isLoadingDialogCategories && <div className="p-2 text-sm text-muted-foreground flex items-center"><Loader2 className="h-4 w-4 animate-spin mr-2"/>Laddar kategorier...</div>}
                    {!isLoadingDialogCategories && categoriesForDialog.map(cat => (<SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>))}
                    {!isLoadingDialogCategories && categoriesForDialog.length === 0 && ((!currentBill?.id && dialogTargetBoardId) || currentBill?.id) &&
                      <p className="p-2 text-sm text-muted-foreground">Inga utgiftskategorier på vald tavla.</p>
                    }
                    {!isLoadingDialogCategories && !dialogTargetBoardId && !currentBill?.id &&
                        <p className="p-2 text-sm text-muted-foreground">Välj en måltavla först.</p>
                    }
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="billNotesDlg" className="text-right">Anteckningar</Label>
                <Textarea id="billNotesDlg" value={billNotes} onChange={e => setBillNotes(e.target.value)} placeholder="Frivilliga anteckningar..." className="col-span-3" disabled={isParsingBill}/>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline" disabled={isParsingBill}>Avbryt</Button></DialogClose>
              <Button type="submit" disabled={isParsingBill || (!currentBill?.id && !dialogTargetBoardId) || (!currentBill?.id && !canEditActiveBoard && !!dialogTargetBoardId) || (!!currentBill?.id && !canEditActiveBoard) }>
                {isParsingBill && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {currentBill?.id ? 'Spara Ändringar' : 'Lägg till Räkning'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isCameraModalOpen} onOpenChange={(open) => {
          setIsCameraModalOpen(open);
          if (!open) {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
            setCapturedImagePreview(null);
            setHasCameraPermission(null);
          }
        }}>
        <DialogContent className="sm:max-w-[90vw] md:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Skanna Räkning</DialogTitle>
            <ShadDialogDescription>Använd din kamera för att ta en bild av räkningen. Informationen kommer sedan att försöka tolkas automatiskt.</ShadDialogDescription>
          </DialogHeader>
          <div className="py-4">
            {hasCameraPermission === false && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Kameraåtkomst Nekad</AlertTitle>
                <ShadAlertDescriptionComponent>Tillåt kameraåtkomst i din webbläsare för att använda denna funktion.</ShadAlertDescriptionComponent>
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
                    <Image src={capturedImagePreview} alt="Förhandsvisning av räkning" width={600} height={800} className="rounded-md max-h-[60vh] w-auto mx-auto" data-ai-hint="bill scan"/>
                    <div className="flex justify-center gap-4">
                      <Button onClick={handleRetakeImage} variant="outline"><RefreshCw className="mr-2 h-4 w-4" /> Ta om</Button>
                      <Button onClick={handleUseCapturedImage}><CheckCircle className="mr-2 h-4 w-4" /> Använd Bild</Button>
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
          <DialogFooter><DialogClose asChild><Button variant="ghost">Avbryt</Button></DialogClose></DialogFooter>
        </DialogContent>
      </Dialog>

      <ShareBillDialog
        key={billToShare ? `share-${billToShare.id}` : 'share-dialog-empty'}
        isOpen={isShareBillDialogOpen}
        onOpenChange={(open) => {
          setIsShareBillDialogOpen(open);
          if (!open) {
            setBillToShare(null);
          }
        }}
        billToShare={billToShare}
        boards={boards}
        currentBoardId={activeBoardId}
        currentUserUid={currentUser?.uid}
        currentUserDisplayName={currentUser?.displayName || currentUser?.email}
        onShareComplete={() => {
          setBillToShare(null);
        }}
      />
    </div>
  );
}

