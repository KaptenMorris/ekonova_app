
"use client";

import { useState, useEffect, useMemo, useCallback, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import {
  PlusCircle, Edit3, Trash2, MoreHorizontal, Home, Car, ShoppingCart, Clapperboard, Tag, Briefcase, HandCoins, Shapes, Zap, Wifi, Shield, Gift, PiggyBank, CreditCard, DollarSign, Receipt, Utensils, Plane, Palette, BookOpen, Heart, ShoppingBag, Shirt, Bike, Bus, Train, Fuel as FuelIcon, Camera, Music, Film, Gamepad2, Dog, Cat, PawPrint, GraduationCap, Landmark, Wrench, Phone, Computer, Loader2, Activity, Anchor, Award, Banknote, Bitcoin, Bone, Bookmark, Brain, Calculator, CalendarDays, Candy, Castle, CheckCheck, ChevronDown, ChevronUp, Church, CircleDollarSign, ClipboardList, Clock, Cloud, Code, Coffee, Coins, Compass, Contact, CookingPot, Crop, Crown, CupSoda, DoorOpen, Download, Drama, Dribbble, Droplet, Drumstick, Dumbbell, Ear, Egg, FileText, Fish, Flag, Flame, Flashlight, FlaskConical, Flower, Footprints, Gauge, Gem, Globe, Grape, Grid, Hammer, Headphones, HelpCircle, IceCream, Image, IndianRupee, Infinity, Key, Laptop, Laugh, Layers, Leaf, Library, LifeBuoy, Lightbulb, Link, List, Lock, LogIn, LogOut, Mail, Map as MapIcon, MapPin, Martini, Medal, Megaphone, Menu, Mic, Minus, Monitor, Moon, MousePointer, Move, Navigation, Newspaper, Nut, Option, Package, PaintBucket, Paperclip, ParkingCircle, PenTool, Pencil, Percent, PersonStanding, PictureInPicture, Pin, Pizza, Play, Plug, Pocket, Podcast, Power, Printer, Puzzle, Quote, Recycle, RefreshCcw, Reply, Rocket, RotateCcw, Rss, Ruler, Save, Scale, ScanLine, School, Scissors, ScreenShare, Search, Send, Settings, Share2, Siren, Slice, Smartphone, Smile, Speaker, Star, Store, Sun, Sunrise, Sunset, Table, Tablet, Target, Tent, ThumbsDown, ThumbsUp, Ticket, Timer, ToggleLeft, Trash, TrendingUp, Trophy, Truck, Tv, Umbrella, Upload, User, Verified, Video, Volume2, Wallet, Watch, Waves, Wind, Wine, Youtube, ZoomIn, UserPlus, ArrowUp, ArrowDown, Copy } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  writeBatch,
  getDocs,
  getDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  setDoc,
  FieldValue,
  limit,
} from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
// Removed format and parseISO from date-fns as monthly filtering is temporarily removed


// Lucide icons map for dynamic rendering
const iconComponents: { [key: string]: React.ElementType } = {
  Home, Car, ShoppingCart, Clapperboard, Tag, Briefcase, HandCoins, Shapes, Zap, Wifi, Shield, PlusCircle, Activity, Anchor, Award, Banknote, Bike, Bitcoin, Bone, BookOpen, Bookmark, Brain, Bus, Calculator, CalendarDays, Camera, Candy, Castle, Cat, CheckCheck, ChevronDown, ChevronUp, Church, CircleDollarSign, ClipboardList, Clock, Cloud, Code, Coffee, Coins, Compass, Computer, Contact, CookingPot, CreditCard, Crop, Crown, CupSoda, Dog, DollarSign, DoorOpen, Download, Drama, Dribbble, Droplet, Drumstick, Dumbbell, Ear, Egg, FileText, Film, Fish, Flag, Flame, Flashlight, FlaskConical, Flower, Footprints, Fuel: FuelIcon, Gamepad2, Gauge, Gem, Gift, Globe, GraduationCap, Grape, Grid, Hammer, Headphones, Heart, HelpCircle, IceCream, Image, IndianRupee, Infinity, Key, Laptop, Laugh, Layers, Leaf, Library, LifeBuoy, Lightbulb, Link, List, Lock, LogIn, LogOut, Mail, MapIcon, MapPin, Martini, Medal, Megaphone, Menu, Mic, Minus, Monitor, Moon, MousePointer, Move, Music, Navigation, Newspaper, Nut, Option, Package, PaintBucket, Palette, Paperclip, ParkingCircle, PawPrint, PenTool, Pencil, Percent, PersonStanding, Phone, PictureInPicture, PiggyBank, Pin, Pizza, Plane, Play, Plug, Pocket, Podcast, Power, Printer, Puzzle, Quote, Receipt, Recycle, RefreshCcw, Reply, Rocket, RotateCcw, Rss, Ruler, Save, Scale, ScanLine, School, Scissors, ScreenShare, Search, Send, Settings, Share2, Shirt, ShoppingBag, Siren, Slice, Smartphone, Smile, Speaker, Star, Store, Sun, Sunrise, Sunset, Table, Tablet, Target, Tent, ThumbsDown, ThumbsUp, Ticket, Timer, ToggleLeft, Train, Trash, TrendingUp, Trophy, Truck, Tv, Umbrella, Upload, User, Utensils, Verified, Video, Volume2, Wallet, Watch, Waves, Wind, Wine, Wrench, Youtube, ZoomIn, UserPlus, Copy,
};

const iconOptions: { value: string; label: string; Icon: React.ElementType }[] = [
  { value: 'Home', label: 'Hus', Icon: Home }, { value: 'Car', label: 'Bil', Icon: Car }, { value: 'ShoppingCart', label: 'Kundvagn', Icon: ShoppingCart }, { value: 'Clapperboard', label: 'Fritid', Icon: Clapperboard }, { value: 'Briefcase', label: 'Portfölj', Icon: Briefcase }, { value: 'HandCoins', label: 'Mynt i Hand', Icon: HandCoins }, { value: 'Zap', label: 'Blixt (El)', Icon: Zap }, { value: 'Wifi', label: 'WiFi (Internet)', Icon: Wifi }, { value: 'Shield', label: 'Sköld (Försäkring)', Icon: Shield }, { value: 'Gift', label: 'Gåva', Icon: Gift }, { value: 'PiggyBank', label: 'Spargris', Icon: PiggyBank }, { value: 'CreditCard', label: 'Kreditkort', Icon: CreditCard }, { value: 'DollarSign', label: 'Dollar', Icon: DollarSign }, { value: 'Receipt', label: 'Kvitto', Icon: Receipt }, { value: 'Utensils', label: 'Restaurang', Icon: Utensils }, { value: 'Plane', label: 'Flygplan (Resa)', Icon: Plane }, { value: 'Palette', label: 'Palett (Hobby)', Icon: Palette }, { value: 'BookOpen', label: 'Bok (Utbildning)', Icon: BookOpen }, { value: 'Heart', label: 'Hjärta (Hälsa)', Icon: Heart }, { value: 'ShoppingBag', label: 'Shoppingkasse', Icon: ShoppingBag }, { value: 'Shirt', label: 'Kläder', Icon: Shirt }, { value: 'Bike', label: 'Cykel', Icon: Bike }, { value: 'Bus', label: 'Buss', Icon: Bus }, { value: 'Train', label: 'Tåg', Icon: Train }, { value: 'Fuel', label: 'Bränsle', Icon: FuelIcon }, { value: 'Camera', label: 'Kamera', Icon: Camera }, { value: 'Music', label: 'Musik', Icon: Music }, { value: 'Film', label: 'Film', Icon: Film }, { value: 'Gamepad2', label: 'Spelkontroll', Icon: Gamepad2 }, { value: 'Dog', label: 'Hund (Husdjur)', Icon: Dog }, { value: 'Cat', label: 'Katt (Husdjur)', Icon: Cat }, { value: 'PawPrint', label: 'Tassavtryck (Husdjur)', Icon: PawPrint }, { value: 'GraduationCap', label: 'Examenshatt (Utbildning)', Icon: GraduationCap }, { value: 'Landmark', label: 'Bank/Byggnad', Icon: Landmark }, { value: 'Wrench', label: 'Skiftnyckel (Reparation)', Icon: Wrench }, { value: 'Phone', label: 'Telefon', Icon: Phone }, { value: 'Computer', label: 'Dator', Icon: Computer }, { value: 'Tag', label: 'Etikett (Övrigt)', Icon: Tag }, { value: 'Shapes', label: 'Former (Annat)', Icon: Shapes }, { value: 'Youtube', label: 'YouTube', Icon: Youtube }, { value: 'MapPin', label: 'Kartnål', Icon: MapPin}, {value: 'MapIcon', label: 'Karta', Icon: MapIcon},
];

interface Transaction {
  id: string;
  title: string;
  amount: number;
  date: string;
  category: string;
  description?: string;
  type: 'income' | 'expense';
  linkedBillId?: string | null;
  createdAt?: any;
  updatedAt?: any;
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
  ownerUid: string;
  members: string[];
  memberRoles?: { [uid: string]: 'viewer' | 'editor' };
  createdAt?: any;
}

interface ListedMember {
  uid: string;
  displayName: string;
  role: 'viewer' | 'editor';
}

const defaultExpenseCategories: Omit<Category, 'id' | 'iconName'> & { iconName: string }[] = [
  { name: 'Boende', type: 'expense', iconName: 'Home' }, { name: 'Transport', type: 'expense', iconName: 'Car' }, { name: 'Matvaror', type: 'expense', iconName: 'ShoppingCart' }, { name: 'Fritid', type: 'expense', iconName: 'Clapperboard' }, { name: 'El', type: 'expense', iconName: 'Zap' }, { name: 'Internet', type: 'expense', iconName: 'Wifi' }, { name: 'Försäkring', type: 'expense', iconName: 'Shield' }, { name: 'Kläder', type: 'expense', iconName: 'Shirt'}, { name: 'Hälsa & Skönhet', type: 'expense', iconName: 'Heart'}, { name: 'Restaurang & Nöje', type: 'expense', iconName: 'Utensils'}, { name: 'Övrigt', type: 'expense', iconName: 'Tag' },
];

const defaultIncomeCategories: Omit<Category, 'id'| 'iconName'> & { iconName: string }[] = [
   { name: 'Lön', type: 'income', iconName: 'Briefcase'}, { name: 'Bidrag', type: 'income', iconName: 'HandCoins'}, { name: 'Gåvor', type: 'income', iconName: 'Gift'}, { name: 'Övrig Inkomst', type: 'income', iconName: 'DollarSign'},
];


const getCategoryIcon = (categoryName: string, categoryType: 'income' | 'expense', customIconName?: string) => {
  const iconProps = { className: "mr-2 h-5 w-5 flex-shrink-0" };
  let IconComponent: React.ElementType | undefined;

  if (customIconName && iconComponents[customIconName]) {
    IconComponent = iconComponents[customIconName];
  } else {
    const defaultCat = categoryType === 'income'
      ? defaultIncomeCategories.find(c => c.name === categoryName)
      : defaultExpenseCategories.find(c => c.name === categoryName);
    if (defaultCat?.iconName && iconComponents[defaultCat.iconName]) {
      IconComponent = iconComponents[defaultCat.iconName];
    }
  }
   if (!IconComponent) IconComponent = categoryType === 'income' ? PlusCircle : Shapes;


  let colorClass = "text-muted-foreground";
  if (categoryType === 'income') {
    colorClass = "text-accent";
  } else if (categoryType === 'expense') {
    // No specific color for expense icons here, they'll use the default
  }
  return <IconComponent {...iconProps} className={`${iconProps.className} ${colorClass}`} />;
};

type UserRole = 'owner' | 'editor' | 'viewer' | 'none';


export default function DashboardPage() {
  const { toast } = useToast();
  const { currentUser, mainBoardId, refreshUserData, boardOrder: userBoardOrderFromContext } = useAuth();

  const [boards, setBoards] = useState<Board[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [activeBoardName, setActiveBoardName] = useState<string>("");

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [isLoadingBoards, setIsLoadingBoards] = useState(true);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isDeletingBoardId, setIsDeletingBoardId] = useState<string | null>(null);
  const [isUpdatingBoardOrder, setIsUpdatingBoardOrder] = useState(false);


  const [newBoardName, setNewBoardName] = useState('');

  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [newTransactionTitle, setNewTransactionTitle] = useState('');
  const [newTransactionAmount, setNewTransactionAmount] = useState<string | number>('');
  const [newTransactionDate, setNewTransactionDate] = useState(new Date().toISOString().split('T')[0]); // Default to current date for simplified version
  const [newTransactionCategory, setNewTransactionCategory] = useState<string | undefined>(undefined);
  const [newTransactionDescription, setNewTransactionDescription] = useState('');
  const [isSavingTransaction, setIsSavingTransaction] = useState(false);


  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<'income' | 'expense' | undefined>(undefined);
  const [newCategoryIconName, setNewCategoryIconName] = useState<string | undefined>(iconOptions.find(opt => opt.value === 'Shapes')?.value);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isCategoryEditMode, setIsCategoryEditMode] = useState(false);


  const [isMemberManagementDialogOpen, setIsMemberManagementDialogOpen] = useState(false);
  const [boardToManageMembersFor, setBoardToManageMembersFor] = useState<Board | null>(null);
  const [inviteUserUidInput, setInviteUserUidInput] = useState('');
  const [inviteUserRoleInput, setInviteUserRoleInput] = useState<'viewer' | 'editor'>('viewer');
  const [isProcessingMemberAction, setIsProcessingMemberAction] = useState(false);
  const [listedMembers, setListedMembers] = useState<ListedMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);


  const [isSettingMainBoard, setIsSettingMainBoard] = useState(false);


  const getUserRole = useCallback((board: Board | null | undefined): UserRole => {
    if (!currentUser || !board) return 'none';
    if (board.ownerUid === currentUser.uid) return 'owner';
    return board.memberRoles?.[currentUser.uid] || (board.members?.includes(currentUser.uid) ? 'viewer' : 'none');
  }, [currentUser]);

  const activeBoard = useMemo(() => boards.find(b => b.id === activeBoardId), [boards, activeBoardId]);
  const currentUserRoleOnActiveBoard = useMemo(() => getUserRole(activeBoard), [getUserRole, activeBoard]);
  const canEditActiveBoard = useMemo(() => currentUserRoleOnActiveBoard === 'owner' || currentUserRoleOnActiveBoard === 'editor', [currentUserRoleOnActiveBoard]);


  useEffect(() => {
    if (!currentUser?.uid) {
        setIsLoadingBoards(false);
        setBoards([]);
        setActiveBoardId(null);
        setActiveBoardName("");
        setTransactions([]);
        setCategories([]);
        return;
    }
    setIsLoadingBoards(true);
    const boardsCollectionRef = collection(db, 'boards');
    let q = query(boardsCollectionRef, where('members', 'array-contains', currentUser.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let fetchedBoards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Board));

      const userBoardOrder = userBoardOrderFromContext || [];
      const orderedBoards: Board[] = [];
      const unorderedBoards: Board[] = [];

      const fetchedBoardsMap = new Map(fetchedBoards.map(b => [b.id, b]));

      userBoardOrder.forEach(boardId => {
        if (fetchedBoardsMap.has(boardId)) {
          orderedBoards.push(fetchedBoardsMap.get(boardId)!);
          fetchedBoardsMap.delete(boardId);
        }
      });

      unorderedBoards.push(...Array.from(fetchedBoardsMap.values()));
      unorderedBoards.sort((a, b) => a.name.localeCompare(b.name));


      const finalSortedBoards = [...orderedBoards, ...unorderedBoards];
      setBoards(finalSortedBoards);

      if (finalSortedBoards.length > 0) {
        if (!activeBoardId || !finalSortedBoards.some(b => b.id === activeBoardId)) {
          const mainBoardInList = mainBoardId && finalSortedBoards.find(b => b.id === mainBoardId);
          if (mainBoardInList) {
            setActiveBoardId(mainBoardInList.id);
            setActiveBoardName(mainBoardInList.name);
          } else {
            setActiveBoardId(finalSortedBoards[0].id);
            setActiveBoardName(finalSortedBoards[0].name);
          }
        } else {
          const currentActiveBoard = finalSortedBoards.find(b => b.id === activeBoardId);
          if (currentActiveBoard) setActiveBoardName(currentActiveBoard.name);
        }
      } else {
        setActiveBoardId(null);
        setActiveBoardName("");
        setTransactions([]);
        setCategories([]);
      }
      setIsLoadingBoards(false);
    }, (error: any) => {
      console.error(`[DASHBOARD_EFFECT] Error fetching boards for UID: ${currentUser?.uid}. Full error:`, error);

      let description = "Kunde inte hämta dina budgettavlor.";
      if (error.code === 'permission-denied' || error.code === 'PERMISSION_DENIED' || (error.message && error.message.toLowerCase().includes("missing or insufficient permissions"))) {
        description = "**Åtkomst Nekad vid hämtning av tavlor!** Detta kan bero på felaktiga Firestore-säkerhetsregler eller att webbläsartillägg (t.ex. reklamblockerare) blockerar anrop till Firebase. Kontrollera konsolen för mer information och säkerställ att dina Firestore-regler tillåter läsning av tavlor där du är medlem. Detaljer: " + error.message;
      } else if (error.message && error.message.toLowerCase().includes("the query requires an index")) {
        description = "Firestore-frågan kräver ett index som inte har skapats. Felmeddelandet i webbläsarkonsolen bör innehålla en länk för att skapa detta index i Firebase Console. Detaljer: " + error.message;
      }
      toast({
        title: "Fel",
        description: description,
        variant: "destructive",
        duration: 30000
      });
      setIsLoadingBoards(false);
      setBoards([]);
      setActiveBoardId(null);
      setActiveBoardName("");
      setTransactions([]);
      setCategories([]);
    });
    return () => unsubscribe();
  }, [currentUser?.uid, toast, mainBoardId, userBoardOrderFromContext, activeBoardId]);


  // useEffect for categories (depends on activeBoardId)
  useEffect(() => {
    if (!currentUser?.uid || !activeBoardId) {
      setCategories([]);
      setIsLoadingCategories(false);
      return;
    }
    setIsLoadingCategories(true);

    const categoriesRef = collection(db, `boards/${activeBoardId}/categories`);
    const unsubCategories = onSnapshot(query(categoriesRef, orderBy("name")), (snapshot) => {
      const boardCategories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      setCategories(boardCategories);
      setIsLoadingCategories(false);
    }, (error) => {
      console.error("Error fetching categories:", error);
      toast({ title: "Fel", description: "Kunde inte hämta kategorier.", variant: "destructive" });
      setIsLoadingCategories(false);
    });

    return () => unsubCategories();
  }, [currentUser?.uid, activeBoardId, toast]);

  // useEffect for transactions (NOW FETCHES ALL TRANSACTIONS FOR THE BOARD, NOT MONTH-FILTERED)
  useEffect(() => {
    if (!currentUser?.uid || !activeBoardId) {
      setTransactions([]);
      setIsLoadingTransactions(false);
      return;
    }
    setIsLoadingTransactions(true);

    const transactionsRef = collection(db, `boards/${activeBoardId}/transactions`);
    // Removed month filtering from query
    const transactionsQuery = query(
      transactionsRef,
      orderBy("date", "desc")
    );

    const unsubTransactions = onSnapshot(transactionsQuery, (snapshot) => {
      const allTransactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(allTransactions);
      setIsLoadingTransactions(false);
    }, (error) => {
      console.error("Error fetching transactions:", error);
      toast({ title: "Fel", description: "Kunde inte hämta transaktioner för tavlan.", variant: "destructive" });
      setIsLoadingTransactions(false);
    });

    return () => unsubTransactions();
  }, [currentUser?.uid, activeBoardId, toast]);


  const categoryTotals = useMemo(() => {
    // Now calculates totals based on ALL transactions for the board
    if (!transactions || !categories) return {};
    const totals: Record<string, { total: number, type: 'income' | 'expense' }> = {};
    categories.forEach(cat => { totals[cat.id] = { total: 0, type: cat.type }; });
    transactions.forEach(t => {
      if (totals[t.category] !== undefined) {
        totals[t.category].total += t.amount;
      }
    });
    return totals;
  }, [transactions, categories]);

/*
  const handleAddBoard = async () => {
    if (!currentUser || !currentUser.uid || newBoardName.trim() === '') {
      toast({ title: "Fel", description: "Tavlans namn får inte vara tomt.", variant: "destructive" });
      return;
    }

    const newBoardDocRef = doc(collection(db, 'boards'));
    const boardData: Omit<Board, 'id'> = {
      name: newBoardName,
      ownerUid: currentUser.uid,
      members: [currentUser.uid],
      memberRoles: {},
      createdAt: serverTimestamp()
    };

    try {
      await setDoc(newBoardDocRef, boardData);

      const categoriesBatch = writeBatch(db);
      [...defaultIncomeCategories, ...defaultExpenseCategories].forEach(catData => {
        const catDocRef = doc(collection(db, 'boards', newBoardDocRef.id, 'categories'));
        categoriesBatch.set(catDocRef, catData);
      });
      await categoriesBatch.commit();

      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
          boardOrder: arrayUnion(newBoardDocRef.id)
      });
      await refreshUserData();

      toast({ title: "Tavla Skapad!", description: `Tavlan "${newBoardName}" har skapats med standardkategorier.` });
      setNewBoardName('');
      setActiveBoardId(newBoardDocRef.id);

      const closeButton = document.querySelector('button[data-testid="dialog-close-add-board"]') as HTMLElement;
      closeButton?.click();

    } catch (error: any) {
      console.error("Error adding board:", error);
      let description = "Kunde inte skapa tavlan.";
      if (error.code === 'permission-denied' || error.code === 'PERMISSION_DENIED') {
        description = "Åtkomst nekad när tavla skulle skapas. Kontrollera dina Firestore-säkerhetsregler. Fullständigt fel: " + error.message;
      } else {
        description = `Kunde inte skapa tavlan. Fel: ${error.message}`;
      }
      toast({ title: "Fel vid skapande av tavla", description, variant: "destructive", duration: 10000 });
    }
  };

  /* // handleDeleteBoard was previously commented out like this. Keep it JS-commented for now.
  const handleDeleteBoard = async (boardId: string) => {
    if (!currentUser?.uid) {
      toast({ title: "Fel", description: "Ingen användare inloggad.", variant: "destructive" });
      return;
    }
    const boardToDelete = boards.find(b => b.id === boardId);
    if (!boardToDelete) {
      toast({ title: "Fel", description: "Tavlan kunde inte hittas.", variant: "destructive" });
      return;
    }
    if (boardToDelete.ownerUid !== currentUser.uid) {
        toast({ title: "Åtkomst Nekad", description: "Endast ägaren kan radera denna tavla.", variant: "destructive" });
        return;
    }
    const confirmMessage = `Är du säker på att du vill radera tavlan "${boardToDelete.name}"? Viktigt: Data inuti tavlan (transaktioner, kategorier, räkningar) raderas INTE automatiskt av denna åtgärd och blir kvar i databasen. För fullständig radering krävs en Firebase Function.`;
    if (!confirm(confirmMessage)) return;

    setIsDeletingBoardId(boardId);
    try {
      await deleteDoc(doc(db, 'boards', boardId));
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
          boardOrder: arrayRemove(boardId),
          ...(mainBoardId === boardId && { mainBoardId: null })
      });
      await refreshUserData();
      toast({ title: "Tavla Raderad", description: `Tavlan "${boardToDelete.name}" har raderats. Observera: Data inuti tavlan (transaktioner, kategorier, räkningar) har INTE raderats automatiskt och blir kvar i databasen. Detta kräver en Firebase Function.`, duration: 10000 });
      if (activeBoardId === boardId) setActiveBoardId(null);
    } catch (error: any) {
      console.error("[BOARD_DELETE] Error deleting board:", error);
      let description = "Kunde inte radera tavlan. Försök igen.";
      if (error.code === 'permission-denied' || error.code === 'PERMISSION_DENIED') {
        description = "Åtkomst nekad. Du har inte behörighet att radera denna tavla, eller så är säkerhetsreglerna felkonfigurerade. Fullständigt fel: " + error.message;
      }
      toast({ title: "Fel vid radering", description, variant: "destructive", duration: 10000 });
    } finally {
      setIsDeletingBoardId(null);
    }
  };
  */
/*
  const handleRenameBoard = async (boardId: string, newName: string) => {
    if (!currentUser || newName.trim() === '') {
      toast({ title: "Fel", description: "Tavlans namn får inte vara tomt.", variant: "destructive" });
      return;
    }
    const boardToRename = boards.find(b => b.id === boardId);
    if (!boardToRename || (getUserRole(boardToRename) !== 'owner' && getUserRole(boardToRename) !== 'editor')) {
      toast({ title: "Åtkomst Nekad", description: "Du har inte behörighet att byta namn på denna tavla.", variant: "destructive" });
      return;
    }

    try {
      await updateDoc(doc(db, 'boards', boardId), { name: newName });
      toast({ title: "Tavla Omdöpt", description: `Tavlan har döpts om till "${newName}".` });
    } catch (error: any) {
      console.error("Error renaming board:", error);
      let description = "Kunde inte döpa om tavlan.";
      if (error.code === 'permission-denied' || error.code === 'PERMISSION_DENIED') {
        description = "Åtkomst nekad när tavla skulle döpas om. Kontrollera dina Firestore-säkerhetsregler. Fullständigt fel: " + error.message;
      }
      toast({ title: "Fel vid omdöpning", description, variant: "destructive", duration: 10000 });
    }
  };

  const fetchBoardMemberDetails = async (boardId: string) => {
    if (!boardId || !currentUser) return;
    const currentBoard = boards.find(b => b.id === boardId);
    if (!currentBoard) {
        setIsLoadingMembers(false);
        setListedMembers([]);
        return;
    }
    setIsLoadingMembers(true);

    const memberUidsToFetch = currentBoard.members.filter(uid => uid !== currentBoard.ownerUid);
    if (memberUidsToFetch.length === 0) {
        setListedMembers([]);
        setIsLoadingMembers(false);
        return;
    }

    const memberDetailsPromises = memberUidsToFetch.map(async (uid) => {
        let displayName = `Användare (UID: ${uid.substring(0, 6)}...)`;
        const role = currentBoard.memberRoles?.[uid] || 'viewer';
        try {
            const userDocRef = doc(db, 'users', uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                displayName = userData.displayName || userData.email || displayName;
            }
        } catch (error) {
             console.warn(`[MEMBER_MGMT] Kunde inte hämta visningsnamn för UID ${uid} (troligen behörighetsproblem). Använder platshållare. Fel:`, error);
        }
        return { uid, displayName, role };
    });

    try {
        const resolvedMemberDetails = await Promise.all(memberDetailsPromises);
        setListedMembers(resolvedMemberDetails);
    } catch (error) {
        console.error("[MEMBER_MGMT] Error resolving member details:", error);
        setListedMembers([]);
        toast({ title: "Fel", description: "Kunde inte hämta all medlemsinformation.", variant: "destructive" });
    } finally {
        setIsLoadingMembers(false);
    }
};


  const handleAddOrUpdateMemberByUid = async () => {
    if (!currentUser || !boardToManageMembersFor || !inviteUserUidInput.trim()) {
      toast({ title: "Fel", description: "Tavla och användar-ID måste anges.", variant: "destructive" });
      return;
    }
    const targetUid = inviteUserUidInput.trim();
    if (targetUid === boardToManageMembersFor.ownerUid) {
      toast({ title: "Info", description: "Ägaren har redan fulla rättigheter och kan inte få sin roll ändrad eller bjudas in igen.", variant: "default" });
      return;
    }

    setIsProcessingMemberAction(true);
    try {
      const boardDocRef = doc(db, 'boards', boardToManageMembersFor.id);
      const boardSnapshot = await getDoc(boardDocRef);
      if (!boardSnapshot.exists()) {
        toast({ title: "Fel", description: "Tavlan kunde inte hittas.", variant: "destructive" });
        setIsProcessingMemberAction(false);
        return;
      }
      const boardData = boardSnapshot.data() as Board;
      const isExistingMember = boardData.members.includes(targetUid);
      const updates: any = {};
      const roleText = inviteUserRoleInput === 'editor' ? 'Redaktör' : 'Granskare';

      if (isExistingMember) {
        updates[`memberRoles.${targetUid}`] = inviteUserRoleInput;
        await updateDoc(boardDocRef, updates);
        toast({ title: "Roll Uppdaterad", description: `Rollen för användare ${targetUid.substring(0,6)}... har uppdaterats till ${roleText}.` });
      } else {
        updates.members = arrayUnion(targetUid);
        updates[`memberRoles.${targetUid}`] = inviteUserRoleInput;
        await updateDoc(boardDocRef, updates);
        toast({ title: "Användare Inbjuden", description: `Användare ${targetUid.substring(0,6)}... har lagts till med rollen ${roleText}.` });
      }

      const updatedBoardSnap = await getDoc(boardDocRef);
      if (updatedBoardSnap.exists()) {
        const updatedBoardData = updatedBoardSnap.data() as Board;
        setBoardToManageMembersFor(updatedBoardData);
        await fetchBoardMemberDetails(updatedBoardData.id);
      }
      setInviteUserUidInput('');
    } catch (error: any) {
      console.error("[MEMBER_MGMT] Error inviting/updating user role via UID:", error);
      let description = "Kunde inte bjuda in användaren eller uppdatera rollen.";
      if (error.code === 'permission-denied' || error.code === 'PERMISSION_DENIED') {
        description = "Åtkomst nekad. Kontrollera dina Firestore-säkerhetsregler. Fullständigt fel: " + error.message;
      }
      toast({ title: "Fel vid Hantering av Medlem", description, variant: "destructive", duration: 10000 });
    } finally {
      setIsProcessingMemberAction(false);
    }
  };

  const handleUpdateListedMemberRole = async (boardId: string, memberUid: string, newRole: 'viewer' | 'editor') => {
    if (!boardId || !memberUid) return;
    setIsProcessingMemberAction(true);
    try {
      const boardDocRef = doc(db, 'boards', boardId);
      const updates: any = {};
      updates[`memberRoles.${memberUid}`] = newRole;
      await updateDoc(boardDocRef, updates);

      const memberDisplayName = listedMembers.find(m => m.uid === memberUid)?.displayName || `användare ${memberUid.substring(0,6)}...`;
      const roleText = newRole === 'editor' ? 'Redaktör' : 'Granskare';
      toast({ title: "Roll Uppdaterad", description: `Rollen för ${memberDisplayName} har ändrats till ${roleText}.`});

      setListedMembers(prevMembers => prevMembers.map(m => m.uid === memberUid ? {...m, role: newRole} : m));

      if (boardToManageMembersFor && boardToManageMembersFor.id === boardId) {
        setBoardToManageMembersFor(prevBoard => {
          if (!prevBoard) return null;
          const newMemberRoles = { ...prevBoard.memberRoles, [memberUid]: newRole };
          return { ...prevBoard, memberRoles: newMemberRoles };
        });
      }

    } catch (error: any) {
      console.error("[MEMBER_MGMT] Error updating listed member role:", error);
      toast({ title: "Fel", description: "Kunde inte uppdatera medlemmens roll.", variant: "destructive" });
    } finally {
      setIsProcessingMemberAction(false);
    }
  };

  const handleRemoveListedMember = async (boardId: string, memberUid: string, memberDisplayName: string) => {
    if (!currentUser || !currentUser.uid || !boardId || !memberUid) {
        toast({ title: "Fel", description: "Nödvändig information saknas för att ta bort medlem.", variant: "destructive"});
        return;
    }

    const currentBoardForAction = boards.find(b => b.id === boardId);
    if (!currentBoardForAction) {
        toast({ title: "Fel", description: "Tavlan kunde inte hittas i den lokala listan.", variant: "destructive"});
        return;
    }

    const userRoleOnThisBoard = getUserRole(currentBoardForAction);
    if (userRoleOnThisBoard !== 'owner' && userRoleOnThisBoard !== 'editor') {
        toast({ title: "Åtkomst Nekad", description: "Du har inte behörighet att ta bort medlemmar från denna tavla.", variant: "destructive" });
        return;
    }

    const confirmMessage = `Är du säker på att du vill ta bort ${memberDisplayName} från tavlan "${currentBoardForAction?.name}"?`;
    if (!confirm(confirmMessage)) return;

    setIsProcessingMemberAction(true);
    try {
      const boardDocRef = doc(db, 'boards', boardId);
      const updates: any = {
        members: arrayRemove(memberUid),
        [`memberRoles.${memberUid}`]: FieldValue.delete()
      };
      await updateDoc(boardDocRef, updates);
      toast({ title: "Medlem Borttagen", description: `${memberDisplayName} har tagits bort från tavlan.`});
      setListedMembers(prevMembers => prevMembers.filter(m => m.uid !== memberUid));
      if (boardToManageMembersFor && boardToManageMembersFor.id === boardId) {
           const updatedBoardSnap = await getDoc(boardDocRef);
            if (updatedBoardSnap.exists()) {
                const updatedBoardData = updatedBoardSnap.data() as Board;
                setBoardToManageMembersFor(updatedBoardData);
                await fetchBoardMemberDetails(updatedBoardData.id);
            } else {
                setIsMemberManagementDialogOpen(false);
                setBoardToManageMembersFor(null);
            }
      }
    } catch (error: any) {
      console.error(`[MEMBER_MGMT] Fel vid borttagning av medlem ${memberUid} från tavla ${boardId}:`, error, "Error Code:", error.code, "Error Message:", error.message);
      let description = "Kunde inte ta bort medlemmen.";
       if (error.code === 'permission-denied' || error.code === 'PERMISSION_DENIED') {
        description = `Åtkomst nekad av Firestore. Kontrollera dina Firestore-säkerhetsregler (du måste vara ägare eller redaktör för tavlan) och att webbläsartillägg inte blockerar anrop. Fullständigt fel: ${error.message}`;
      } else {
        description = `Ett oväntat fel uppstod när medlem skulle tas bort: ${error.message}`;
      }
      toast({ title: "Fel vid borttagning av medlem", description, variant: "destructive", duration: 20000 });
    } finally {
      setIsProcessingMemberAction(false);
    }
  };

  const resetCategoryForm = () => {
    setNewCategoryName('');
    setNewCategoryType(undefined);
    setNewCategoryIconName(iconOptions.find(opt => opt.value === 'Shapes')?.value);
    setEditingCategory(null);
  };

  const handleOpenCategoryDialog = (category?: Category) => {
    if (!canEditActiveBoard) {
      toast({ title: "Åtkomst Nekad", description: "Du har inte behörighet att hantera kategorier på denna tavla.", variant: "destructive" });
      return;
    }
    if (category) {
      setEditingCategory(category);
      setNewCategoryName(category.name);
      setNewCategoryType(category.type);
      setNewCategoryIconName(category.iconName || iconOptions.find(opt => opt.value === 'Shapes')?.value);
    } else {
      resetCategoryForm();
    }
    setIsCategoryDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!currentUser?.uid || !activeBoardId || !categories || !canEditActiveBoard) {
      toast({ title: "Fel", description: "Ingen aktiv tavla vald eller otillräcklig behörighet.", variant: "destructive" });
      return;
    }
    if (newCategoryName.trim() === '' || !newCategoryIconName || (!editingCategory && !newCategoryType)) {
      toast({ title: "Fel", description: "Kategorinamn, typ (för ny) och ikon måste anges.", variant: "destructive" });
      return;
    }

    const categoryPayload: Partial<Omit<Category, 'id'>> & { type?: 'income' | 'expense' } = {
      name: newCategoryName.trim(),
      iconName: newCategoryIconName,
    };

    try {
      const categoriesCollectionRef = collection(db, 'boards', activeBoardId, 'categories');
      if (editingCategory) {
        // Type is not changed on edit
        await updateDoc(doc(categoriesCollectionRef, editingCategory.id), categoryPayload);
        toast({ title: "Kategori Uppdaterad", description: `Kategorin "${newCategoryName}" har uppdaterats.` });
      } else {
        if (!newCategoryType) { // Should be caught by earlier check, but for safety
          toast({ title: "Fel", description: "Kategorityp måste anges för ny kategori.", variant: "destructive" });
          return;
        }
        categoryPayload.type = newCategoryType;
        await addDoc(categoriesCollectionRef, categoryPayload);
        toast({ title: "Kategori Skapad", description: `Kategorin "${newCategoryName}" har lagts till.` });
      }
      resetCategoryForm();
      setIsCategoryDialogOpen(false);
    } catch (error: any) {
      console.error("Error saving category:", error);
      let description = editingCategory ? "Kunde inte uppdatera kategorin." : "Kunde inte skapa kategorin.";
      if (error.code === 'permission-denied' || error.code === 'PERMISSION_DENIED') {
        description = "Åtkomst nekad. Kontrollera dina Firestore-säkerhetsregler.";
      }
      toast({ title: editingCategory ? "Fel vid Uppdatering" : "Fel vid Skapande", description, variant: "destructive" });
    }
  };

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    if (!currentUser?.uid || !activeBoardId || !canEditActiveBoard) {
      toast({ title: "Åtkomst Nekad", description: "Du har inte behörighet att radera kategorier på denna tavla.", variant: "destructive" });
      return;
    }

    const transactionsRef = collection(db, 'boards', activeBoardId, 'transactions');
    const transQuery = query(transactionsRef, where("category", "==", categoryId), limit(1));
    const transSnapshot = await getDocs(transQuery);

    if (!transSnapshot.empty) {
      toast({
        title: "Kan inte Radera Kategori",
        description: `Kategorin "${categoryName}" används av en eller flera transaktioner. Ändra eller ta bort dessa transaktioner först.`,
        variant: "destructive",
        duration: 7000,
      });
      return;
    }

    const billsRef = collection(db, 'boards', activeBoardId, 'bills');
    const billsQuery = query(billsRef, where("category", "==", categoryId), limit(1));
    const billsSnapshot = await getDocs(billsQuery);

    if (!billsSnapshot.empty) {
      toast({
          title: "Kan inte Radera Kategori",
          description: `Kategorin "${categoryName}" används av en eller flera räkningar. Ändra eller ta bort kategorin från dessa räkningar först.`,
          variant: "destructive",
          duration: 7000,
      });
      return;
    }

    const confirmDelete = confirm(`Är du säker på att du vill radera kategorin "${categoryName}"? Detta kan inte ångras.`);
    if (!confirmDelete) return;

    try {
      const categoryDocRef = doc(db, 'boards', activeBoardId, 'categories', categoryId);
      await deleteDoc(categoryDocRef);
      toast({ title: "Kategori Raderad", description: `Kategorin "${categoryName}" har raderats.` });
    } catch (error: any) {
      console.error("Error deleting category:", error);
      let description = "Kunde inte radera kategorin.";
      if (error.code === 'permission-denied') {
        description = "Åtkomst nekad. Kontrollera dina Firestore-säkerhetsregler.";
      }
      toast({ title: "Fel vid Radering", description, variant: "destructive" });
    }
  };


  const resetTransactionForm = () => {
    setNewTransactionTitle('');
    setNewTransactionAmount('');
    setNewTransactionDate(new Date().toISOString().split('T')[0]); // Default to current date for simplified version
    setNewTransactionCategory(undefined);
    setNewTransactionDescription('');
    setEditingTransaction(null);
  };

  const handleOpenNewTransactionDialog = () => {
    if (!canEditActiveBoard) {
      toast({ title: "Åtkomst Nekad", description: "Du har inte behörighet att lägga till transaktioner på denna tavla.", variant: "destructive" });
      return;
    }
    resetTransactionForm();
    setIsTransactionDialogOpen(true);
  };

  const handleOpenEditTransactionDialog = (transaction: Transaction) => {
     if (!canEditActiveBoard) {
      toast({ title: "Åtkomst Nekad", description: "Du har inte behörighet att redigera transaktioner på denna tavla.", variant: "destructive" });
      return;
    }
    setEditingTransaction(transaction);
    setNewTransactionTitle(transaction.title);
    setNewTransactionAmount(String(transaction.amount));
    setNewTransactionDate(transaction.date);
    setNewTransactionCategory(transaction.category);
    setNewTransactionDescription(transaction.description || '');
    setIsTransactionDialogOpen(true);
  };

  const handleSaveTransaction = async () => {
    if (!currentUser?.uid || !activeBoardId || !categories || !canEditActiveBoard) {
      toast({ title: "Fel", description: "Ingen aktiv tavla, kategorier laddade eller otillräcklig behörighet.", variant: "destructive" });
      return;
    }
    if (newTransactionTitle.trim() === '' || !newTransactionAmount || !newTransactionCategory) {
      toast({ title: "Fel", description: "Titel, belopp och kategori måste anges.", variant: "destructive" });
      return;
    }
    const amount = parseFloat(newTransactionAmount as string);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Fel", description: "Ogiltigt belopp.", variant: "destructive" });
      return;
    }
    const selectedCategoryDetails = categories.find(cat => cat.id === newTransactionCategory);
    if (!selectedCategoryDetails) {
      toast({ title: "Fel", description: "Ogiltig kategori vald.", variant: "destructive" });
      return;
    }

    setIsSavingTransaction(true);

    const transactionPayload: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> & { createdAt?: any, updatedAt?: any } = {
      title: newTransactionTitle,
      amount: amount,
      date: newTransactionDate,
      category: newTransactionCategory,
      description: newTransactionDescription,
      type: selectedCategoryDetails.type,
      linkedBillId: editingTransaction ? editingTransaction.linkedBillId : null,
    };

    try {
      const transactionsCollectionRef = collection(db, 'boards', activeBoardId, 'transactions');
      if (editingTransaction && editingTransaction.id) {
        const transactionDocRef = doc(transactionsCollectionRef, editingTransaction.id);
        transactionPayload.updatedAt = serverTimestamp();
        delete (transactionPayload as any).createdAt;
        await updateDoc(transactionDocRef, transactionPayload as any);
        toast({ title: "Transaktion Uppdaterad", description: `Transaktionen "${newTransactionTitle}" har uppdaterats.` });
      } else {
        transactionPayload.createdAt = serverTimestamp();
        await addDoc(transactionsCollectionRef, transactionPayload);
        toast({ title: "Transaktion Tillagd", description: `Transaktionen "${newTransactionTitle}" har lagts till.` });
      }
      resetTransactionForm();
      setIsTransactionDialogOpen(false);
    } catch (error: any) {
      console.error("Error saving transaction:", error);
      let description = "Kunde inte spara transaktionen.";
      if (error.code === 'permission-denied' || error.code === 'PERMISSION_DENIED') {
        description = "Åtkomst nekad när transaktion skulle sparas. Kontrollera dina Firestore-säkerhetsregler. Fullständigt fel: " + error.message;
      }
      toast({ title: "Fel vid sparande av transaktion", description, variant: "destructive", duration: 10000 });
    } finally {
      setIsSavingTransaction(false);
    }
  };

  const handleDeleteTransaction = async (transactionToDelete: Transaction) => {
    if (!currentUser?.uid || !activeBoardId || !canEditActiveBoard) {
        toast({ title: "Åtkomst Nekad", description: "Du har inte behörighet att radera transaktioner på denna tavla.", variant: "destructive" });
        return;
    }

    const confirmMessage = transactionToDelete.linkedBillId
      ? `Är du säker på att du vill radera transaktionen "${transactionToDelete.title}"?\nDetta kommer också att markera den kopplade räkningen som obetald.`
      : `Är du säker på att du vill radera transaktionen "${transactionToDelete.title}"?`;


    if (!confirm(confirmMessage)) return;

    try {
      const batch = writeBatch(db);
      const transactionDocRef = doc(db, 'boards', activeBoardId, 'transactions', transactionToDelete.id);
      batch.delete(transactionDocRef);

      if (transactionToDelete.linkedBillId) {
        const billDocRef = doc(db, 'boards', activeBoardId, 'bills', transactionToDelete.linkedBillId);
        const billSnap = await getDoc(billDocRef);
        if (billSnap.exists()) {
          batch.update(billDocRef, { paid: false, paidByUid: null, paidByDisplayName: null });
        } else {
          console.warn(`Bill with id ${transactionToDelete.linkedBillId} not found when trying to unpay.`);
        }
      }
      await batch.commit();
      toast({ title: "Transaktion Raderad", description: `Transaktionen "${transactionToDelete.title}" har raderats.` });
    } catch (error: any)
      {
      console.error("Error deleting transaction:", error);
      let description = "Kunde inte radera transaktionen.";
      if (error.code === 'permission-denied' || error.code === 'PERMISSION_DENIED') {
        description = "Åtkomst nekad när transaktion skulle raderas. Kontrollera dina Firestore-säkerhetsregler. Fullständigt fel: " + error.message;
      }
      toast({ title: "Fel vid radering av transaktion", description, variant: "destructive", duration: 10000 });
    }
  };

  const handleSetMainBoard = async (boardId: string) => {
    if (!currentUser?.uid) return;
    setIsSettingMainBoard(true);
    try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        let currentOrder = [...(userBoardOrderFromContext || boards.map(b => b.id))];
        currentOrder = currentOrder.filter(id => id !== boardId);
        const newBoardOrder = [boardId, ...currentOrder];

        await updateDoc(userDocRef, {
            mainBoardId: boardId,
            boardOrder: newBoardOrder
        });

        await refreshUserData();
        toast({ title: "Huvudtavla Sparad", description: "Vald tavla har angetts som din huvudtavla och flyttats först." });
    } catch (error) {
        console.error("Error setting main board:", error);
        toast({ title: "Fel", description: "Kunde inte ange huvudtavla.", variant: "destructive" });
    } finally {
        setIsSettingMainBoard(false);
    }
  };
*/
  /*
  const handleMoveBoard = async (boardId: string, direction: 'up' | 'down') => {
    if (!currentUser?.uid || !userBoardOrderFromContext || isUpdatingBoardOrder) return;

    setIsUpdatingBoardOrder(true);
    let currentOrder = [...(userBoardOrderFromContext || [])];
    const boardIndex = currentOrder.indexOf(boardId);

    if (boardIndex === -1) {
        toast({ title: "Fel", description: "Tavlan finns inte i din nuvarande ordning.", variant: "destructive" });
        setIsUpdatingBoardOrder(false);
        return;
    }

    if (direction === 'up' && boardIndex > 0) {
        [currentOrder[boardIndex - 1], currentOrder[boardIndex]] = [currentOrder[boardIndex], currentOrder[boardIndex - 1]];
    } else if (direction === 'down' && boardIndex < currentOrder.length - 1) {
        [currentOrder[boardIndex + 1], currentOrder[boardIndex]] = [currentOrder[boardIndex], currentOrder[boardIndex + 1]];
    } else {
        setIsUpdatingBoardOrder(false);
        return;
    }

    try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userDocRef, { boardOrder: currentOrder });
        await refreshUserData();
        toast({ title: "Ordning Uppdaterad", description: "Tavlornas ordning har sparats." });
    } catch (error: any) {
        console.error("Error updating board order:", error);
        toast({ title: "Fel", description: "Kunde inte uppdatera tavlornas ordning.", variant: "destructive" });
    } finally {
        setIsUpdatingBoardOrder(false);
    }
  };
  */


  const getTotal = useCallback((type: 'income' | 'expense') => {
    // Now calculates totals based on ALL transactions for the board
    if (!transactions) return 0;
    return transactions.filter(t => t.type === type).reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const incomeTransactions = useMemo(() => transactions.filter(t => t.type === 'income'), [transactions]);
  const expenseTransactions = useMemo(() => transactions.filter(t => t.type === 'expense'), [transactions]);

  const isLoadingPageData = isLoadingTransactions || isLoadingCategories;


  if (isLoadingBoards && !currentUser) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-12 w-12 animate-spin text-primary" /> Laddar...</div>;
  }
  if (!currentUser && !isLoadingBoards) {
      return <div className="text-center p-8">Vänligen logga in för att komma åt kontrollpanelen.</div>;
  }
  if (isLoadingBoards && currentUser) {
      return <div className="flex justify-center items-center h-full"><Loader2 className="h-12 w-12 animate-spin text-primary" /> LADDAR TAVLOR...</div>;
  }

  return (
    <div>Dashboard Test Content</div>
  );
}
        
    
