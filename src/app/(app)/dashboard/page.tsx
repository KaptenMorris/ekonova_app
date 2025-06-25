
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
  PlusCircle, Edit3, Trash2, MoreHorizontal, Home, Car, ShoppingCart, Clapperboard, Tag, Briefcase, HandCoins, Shapes, Zap, Wifi, Shield, Gift, PiggyBank, CreditCard, DollarSign, Receipt, Utensils, Plane, Palette, BookOpen, Heart, ShoppingBag, Shirt, Bike, Bus, Train, Fuel as FuelIcon, Camera, Music, Film, Gamepad2, Dog, Cat, PawPrint, GraduationCap, Landmark, Wrench, Phone, Computer, Loader2, Activity, Anchor, Award, Banknote, Bitcoin, Bone, Bookmark, Brain, Calculator, CalendarDays, Candy, Castle, CheckCheck, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Church, CircleDollarSign, ClipboardList, Clock, Cloud, Code, Coffee, Coins, Compass, Contact, CookingPot, Crop, Crown, CupSoda, DoorOpen, Download, Drama, Dribbble, Droplet, Drumstick, Dumbbell, Ear, Egg, FileText, Fish, Flag, Flame, Flashlight, FlaskConical, Flower, Footprints, Gauge, Gem, Globe, Grape, Grid, Hammer, Headphones, HelpCircle, IceCream, Image, IndianRupee, Infinity, Key, Laptop, Laugh, Layers, Leaf, Library, LifeBuoy, Lightbulb, Link, List, Lock, LogIn, LogOut, Mail, Map as MapIcon, MapPin, Martini, Medal, Megaphone, Menu, Mic, Minus, Monitor, Moon, MousePointer, Move, Navigation, Newspaper, Nut, Option, Package, PaintBucket, Paperclip, ParkingCircle, PenTool, Pencil, Percent, PersonStanding, PictureInPicture, Pin, Pizza, Play, Plug, Pocket, Podcast, Power, Printer, Puzzle, Quote, Recycle, RefreshCcw, Reply, Rocket, RotateCcw, Rss, Ruler, Save, Scale, ScanLine, School, Scissors, ScreenShare, Search, Send, Settings, Share2, Siren, Slice, Smartphone, Smile, Speaker, Star, Store, Sun, Sunrise, Sunset, Table, Tablet, Target, Tent, ThumbsDown, ThumbsUp, Ticket, Timer, ToggleLeft, Trash, TrendingUp, Trophy, Truck, Tv, Umbrella, Upload, User, Verified, Video, Volume2, Wallet, Watch, Waves, Wind, Wine, Youtube, ZoomIn, UserPlus, Copy } from 'lucide-react';
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
  type FieldValue,
  limit,
} from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth, parseISO } from 'date-fns';
import { sv } from 'date-fns/locale';
import WelcomeGuideDialog from '@/components/shared/welcome-guide-dialog';


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

interface DefaultCategoryEntry {
  name: string;
  type: 'income' | 'expense';
  iconName: string;
}

const defaultExpenseCategories: DefaultCategoryEntry[] = [
  { name: 'Boende', type: 'expense', iconName: 'Home' }, { name: 'Transport', type: 'expense', iconName: 'Car' }, { name: 'Matvaror', type: 'expense', iconName: 'ShoppingCart' }, { name: 'Fritid', type: 'expense', iconName: 'Clapperboard' }, { name: 'El', type: 'expense', iconName: 'Zap' }, { name: 'Internet', type: 'expense', iconName: 'Wifi' }, { name: 'Försäkring', type: 'expense', iconName: 'Shield' }, { name: 'Kläder', type: 'expense', iconName: 'Shirt'}, { name: 'Hälsa & Skönhet', type: 'expense', iconName: 'Heart'}, { name: 'Restaurang & Nöje', type: 'expense', iconName: 'Utensils'}, { name: 'Övrigt', type: 'expense', iconName: 'Tag' },
];

const defaultIncomeCategories: DefaultCategoryEntry[] = [
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
    // colorClass = "text-destructive"; // Keeping it neutral for now to avoid too much red
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
  const [newTransactionDate, setNewTransactionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
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

  const [selectedMonthDate, setSelectedMonthDate] = useState<Date>(startOfMonth(new Date()));
  const [isGuideDialogOpen, setIsGuideDialogOpen] = useState(false);


  const handlePreviousMonth = () => setSelectedMonthDate(prevDate => subMonths(prevDate, 1));
  const handleNextMonth = () => setSelectedMonthDate(prevDate => addMonths(prevDate, 1));

  const isCurrentMonthOrFuture = useMemo(() => {
    const currentMonthStart = startOfMonth(new Date());
    return isSameMonth(selectedMonthDate, currentMonthStart) || selectedMonthDate > currentMonthStart;
  }, [selectedMonthDate]);

  const formattedSelectedMonth = useMemo(() => {
    return format(selectedMonthDate, 'MMMM yyyy', { locale: sv });
  }, [selectedMonthDate]);


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

  useEffect(() => {
    if (!currentUser?.uid || !activeBoardId) {
      setTransactions([]);
      setIsLoadingTransactions(false);
      return;
    }
    setIsLoadingTransactions(true);

    const transactionsRef = collection(db, `boards/${activeBoardId}/transactions`);

    const currentMonthStart = format(startOfMonth(selectedMonthDate), 'yyyy-MM-dd');
    const currentMonthEnd = format(endOfMonth(selectedMonthDate), 'yyyy-MM-dd');

    const transactionsQuery = query(
      transactionsRef,
      where("date", ">=", currentMonthStart),
      where("date", "<=", currentMonthEnd),
      orderBy("date", "desc")
    );

    const unsubTransactions = onSnapshot(transactionsQuery, (snapshot) => {
      const monthTransactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(monthTransactions);
      setIsLoadingTransactions(false);
    }, (error) => {
      console.error("Error fetching transactions:", error);
      toast({ title: "Fel", description: "Kunde inte hämta transaktioner för den valda månaden.", variant: "destructive" });
      setIsLoadingTransactions(false);
    });

    return () => unsubTransactions();
  }, [currentUser?.uid, activeBoardId, selectedMonthDate, toast]);


  const categoryTotals = useMemo(() => {
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
      const boardSnap = await getDoc(boardDocRef);
      if (boardSnap.exists()) {
          const boardData = boardSnap.data() as Board;
          const updatedMemberRoles = {...boardData.memberRoles};
          delete updatedMemberRoles[memberUid];
          await updateDoc(boardDocRef, {
              members: arrayRemove(memberUid),
              memberRoles: updatedMemberRoles
          });
      } else {
          throw new Error("Board not found during member removal update.");
      }


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
      setNewCategoryType(undefined); // Ensure type is cleared for new category
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
        // For editing, we don't change the type.
        const updatePayload = { name: newCategoryName.trim(), iconName: newCategoryIconName };
        await updateDoc(doc(categoriesCollectionRef, editingCategory.id), updatePayload);
        toast({ title: "Kategori Uppdaterad", description: `Kategorin "${newCategoryName}" har uppdaterats.` });
      } else {
        if (!newCategoryType) { // This check should be redundant due to earlier check, but good for safety
          toast({ title: "Fel", description: "Kategorityp måste anges för ny kategori.", variant: "destructive" });
          return;
        }
        categoryPayload.type = newCategoryType; // Set type only for new categories
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
    setNewTransactionDate(format(selectedMonthDate, 'yyyy-MM-dd')); // Use selectedMonthDate
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
    setNewTransactionDate(transaction.date); // The original date of the transaction
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
      linkedBillId: editingTransaction?.linkedBillId || null,
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

  const calculateTotalByType = useCallback((type: 'income' | 'expense') => {
    if (!transactions) return 0;
    return transactions.filter(t => t.type === type).reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const totalIncomeForMonth = useMemo(() => calculateTotalByType('income'), [calculateTotalByType]);
  const totalExpensesForMonth = useMemo(() => calculateTotalByType('expense'), [calculateTotalByType]);

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
    <div className="flex flex-col h-full gap-6">
       <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {boards.map((board, index) => (
            <Button
              key={board.id}
              variant={activeBoardId === board.id ? "secondary" : "outline"}
              onClick={() => setActiveBoardId(board.id)}
              className={cn(
                "shrink-0",
                activeBoardId === board.id && "ring-2 ring-primary ring-offset-background ring-offset-2"
              )}
              disabled={isLoadingPageData}
            >
              {board.name}
              {board.id === mainBoardId && <Home className="ml-2 h-3 w-3 text-primary/80" />}
            </Button>
          ))}

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" disabled={isLoadingBoards}><PlusCircle className="h-5 w-5" /></Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Skapa Ny Tavla</DialogTitle></DialogHeader>
              <Input value={newBoardName} onChange={(e) => setNewBoardName(e.target.value)} placeholder="Tavlans Namn" />
              <DialogFooter>
                <DialogClose asChild><Button variant="ghost" data-testid="dialog-close-add-board">Avbryt</Button></DialogClose>
                <Button onClick={handleAddBoard}>Skapa Tavla</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center gap-2">
          {activeBoard && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0" disabled={isLoadingPageData}>
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56">
                <div className="space-y-1">
                  <Button variant="ghost" className="w-full justify-start text-sm" onClick={() => {
                    const newName = prompt("Ange nytt namn för tavlan:", activeBoard.name);
                    if (newName) handleRenameBoard(activeBoard.id, newName);
                  }} disabled={!canEditActiveBoard || isDeletingBoardId === activeBoard.id || isSettingMainBoard}>
                    <Edit3 className="mr-2 h-4 w-4" /> Byt namn på Tavla
                  </Button>
                  <Button variant="ghost" className="w-full justify-start text-sm" onClick={() => { setBoardToManageMembersFor(activeBoard); fetchBoardMemberDetails(activeBoard.id); setIsMemberManagementDialogOpen(true); }} disabled={currentUserRoleOnActiveBoard !== 'owner' && currentUserRoleOnActiveBoard !== 'editor' || isDeletingBoardId === activeBoard.id}>
                    <UserPlus className="mr-2 h-4 w-4" /> Hantera Medlemmar
                  </Button>
                  {activeBoard.id !== mainBoardId && (
                    <Button variant="ghost" className="w-full justify-start text-sm" onClick={() => handleSetMainBoard(activeBoard.id)} disabled={isDeletingBoardId === activeBoard.id || isSettingMainBoard}>
                      <Home className="mr-2 h-4 w-4" /> Ange som Huvudtavla
                    </Button>
                  )}
                  <Separator />
                  <Button variant="ghost" className="w-full justify-start text-sm text-destructive hover:text-destructive" onClick={() => handleDeleteBoard(activeBoard.id)} disabled={currentUserRoleOnActiveBoard !== 'owner' || isDeletingBoardId === activeBoard.id}>
                    {isDeletingBoardId === activeBoard.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />} Radera Tavla
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}
           <Button
            variant="outline"
            size="icon"
            onClick={() => setIsGuideDialogOpen(true)}
            aria-label="Öppna snabbguide"
            className="shrink-0"
            disabled={isLoadingPageData || isLoadingBoards}
          >
            <HelpCircle className="h-5 w-5" />
          </Button>
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


      {isLoadingPageData && activeBoardId && (
         <div className="flex justify-center items-center h-64 col-span-full"><Loader2 className="h-12 w-12 animate-spin text-primary" /> Laddar data för {formattedSelectedMonth}...</div>
      )}

      {!isLoadingPageData && activeBoardId && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 overflow-auto">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Översikt för {formattedSelectedMonth}</CardTitle>
              <CardDescription>på tavlan "{activeBoardName}"</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-accent">Totala Inkomster</h3>
                <p className="text-2xl font-bold">{totalIncomeForMonth.toLocaleString('sv-SE')} kr</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-destructive">Totala Utgifter</h3>
                <p className="text-2xl font-bold">{totalExpensesForMonth.toLocaleString('sv-SE')} kr</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Nettosaldo</h3>
                <p className={`text-2xl font-bold ${(totalIncomeForMonth - totalExpensesForMonth) >= 0 ? 'text-accent' : 'text-destructive'}`}>
                  {(totalIncomeForMonth - totalExpensesForMonth).toLocaleString('sv-SE')} kr
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={handleOpenNewTransactionDialog} disabled={!canEditActiveBoard}>
                <PlusCircle className="mr-2 h-4 w-4" /> Lägg till Ny Transaktion
              </Button>
            </CardFooter>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Transaktioner för {formattedSelectedMonth}</CardTitle>
              <div className="flex justify-end">
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[300px] md:h-[400px]">
                <div className="divide-y divide-border">
                  {(incomeTransactions.length === 0 && expenseTransactions.length === 0) && (
                     <p className="p-4 text-center text-muted-foreground">Inga transaktioner för {formattedSelectedMonth}.</p>
                  )}
                  {incomeTransactions.length > 0 && (
                    <>
                      <h4 className="text-sm font-semibold p-3 bg-muted/50">Inkomster</h4>
                      {incomeTransactions.map(t => (
                        <div key={t.id} className="p-3 hover:bg-muted/30 flex justify-between items-center">
                          <div>
                            <p className="font-medium">{t.title}</p>
                            <p className="text-xs text-muted-foreground">{new Date(t.date + 'T00:00:00').toLocaleDateString('sv-SE')} - {categories.find(c => c.id === t.category)?.name || 'Okategoriserad'}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-accent">+ {t.amount.toLocaleString('sv-SE')} kr</p>
                            {canEditActiveBoard && (
                              <div className="flex gap-1 justify-end mt-1">
                                 <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleOpenEditTransactionDialog(t)}><Edit3 className="h-3 w-3" /></Button>
                                 <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => handleDeleteTransaction(t)}><Trash2 className="h-3 w-3" /></Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  {expenseTransactions.length > 0 && (
                     <>
                      <h4 className="text-sm font-semibold p-3 bg-muted/50">Utgifter</h4>
                      {expenseTransactions.map(t => (
                         <div key={t.id} className="p-3 hover:bg-muted/30 flex justify-between items-center">
                          <div>
                            <p className="font-medium">{t.title}</p>
                            <p className="text-xs text-muted-foreground">{new Date(t.date + 'T00:00:00').toLocaleDateString('sv-SE')} - {categories.find(c => c.id === t.category)?.name || 'Okategoriserad'}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-destructive">- {t.amount.toLocaleString('sv-SE')} kr</p>
                             {canEditActiveBoard && (
                              <div className="flex gap-1 justify-end mt-1">
                                 <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleOpenEditTransactionDialog(t)}><Edit3 className="h-3 w-3" /></Button>
                                 <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => handleDeleteTransaction(t)}><Trash2 className="h-3 w-3" /></Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="md:col-span-3">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle>Kategoriöversikt för {formattedSelectedMonth}</CardTitle>
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="category-edit-mode" className="text-sm shrink-0">Redigera lista</Label>
                    <Switch
                      id="category-edit-mode"
                      checked={isCategoryEditMode}
                      onCheckedChange={setIsCategoryEditMode}
                      disabled={!canEditActiveBoard || isLoadingCategories}
                      aria-label="Växla redigeringsläge för kategorilistan"
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleOpenCategoryDialog()} disabled={!canEditActiveBoard || isLoadingCategories}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Hantera Kategorier
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-md font-semibold mb-2 text-accent">Inkomstkategorier</h4>
                  {categories.filter(cat => cat.type === 'income').length > 0 ? (
                    <ScrollArea className="h-[150px] md:h-auto pr-2">
                      <ul className="space-y-2">
                        {categories.filter(cat => cat.type === 'income').map(category => {
                            const categoryTotalData = categoryTotals[category.id];
                            const total = categoryTotalData ? categoryTotalData.total : 0;
                            return (
                              <li key={category.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/30">
                                <div className="flex items-center flex-grow min-w-0">
                                  {getCategoryIcon(category.name, category.type, category.iconName)}
                                  <span className="font-medium truncate" title={category.name}>{category.name}</span>
                                </div>
                                <div className="flex items-center shrink-0 gap-2">
                                  <span className="font-semibold text-accent">
                                    {total.toLocaleString('sv-SE')} kr
                                  </span>
                                  {isCategoryEditMode && canEditActiveBoard && (
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => handleOpenCategoryDialog(category)}
                                        aria-label={`Redigera ${category.name}`}
                                      >
                                        <Edit3 className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-destructive hover:text-destructive"
                                        onClick={() => handleDeleteCategory(category.id, category.name)}
                                        aria-label={`Radera ${category.name}`}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </li>
                            );
                        })}
                      </ul>
                    </ScrollArea>
                  ) : (
                    <p className="text-sm text-muted-foreground py-4">Inga inkomstkategorier definierade för denna tavla.</p>
                  )}
                </div>
                <div>
                  <h4 className="text-md font-semibold mb-2 text-destructive">Utgiftskategorier</h4>
                   {categories.filter(cat => cat.type === 'expense').length > 0 ? (
                    <ScrollArea className="h-[150px] md:h-auto pr-2">
                      <ul className="space-y-2">
                        {categories.filter(cat => cat.type === 'expense').map(category => {
                            const categoryTotalData = categoryTotals[category.id];
                            const total = categoryTotalData ? categoryTotalData.total : 0;
                            return (
                              <li key={category.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/30">
                                <div className="flex items-center flex-grow min-w-0">
                                  {getCategoryIcon(category.name, category.type, category.iconName)}
                                  <span className="font-medium truncate" title={category.name}>{category.name}</span>
                                </div>
                                <div className="flex items-center shrink-0 gap-2">
                                  <span className="font-semibold text-destructive">
                                    {total.toLocaleString('sv-SE')} kr
                                  </span>
                                  {isCategoryEditMode && canEditActiveBoard && (
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => handleOpenCategoryDialog(category)}
                                        aria-label={`Redigera ${category.name}`}
                                      >
                                        <Edit3 className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-destructive hover:text-destructive"
                                        onClick={() => handleDeleteCategory(category.id, category.name)}
                                        aria-label={`Radera ${category.name}`}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </li>
                            );
                        })}
                      </ul>
                    </ScrollArea>
                  ) : (
                    <p className="text-sm text-muted-foreground py-4">Inga utgiftskategorier definierade för denna tavla.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!activeBoardId && !isLoadingBoards && (
        <div className="flex flex-col items-center justify-center h-full text-center col-span-full">
            <Shapes className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold">Välj eller Skapa en Tavla</h2>
            <p className="text-muted-foreground">För att börja, välj en befintlig budgettavla ovan eller skapa en ny.</p>

            <Dialog>
                <DialogTrigger asChild>
                    <Button className="mt-4"><PlusCircle className="mr-2 h-4 w-4" /> Skapa Ny Tavla</Button>
                </DialogTrigger>
                 <DialogContent>
                    <DialogHeader><DialogTitle>Skapa Ny Tavla</DialogTitle></DialogHeader>
                    <Input value={newBoardName} onChange={(e) => setNewBoardName(e.target.value)} placeholder="Tavlans Namn" />
                    <DialogFooter>
                        <DialogClose asChild><Button variant="ghost" data-testid="dialog-close-add-board-empty">Avbryt</Button></DialogClose>
                        <Button onClick={handleAddBoard}>Skapa Tavla</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
      )}


      <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTransaction ? 'Redigera Transaktion' : 'Lägg till Ny Transaktion'}</DialogTitle>
            <DialogDescription>Fyll i detaljerna för din {editingTransaction ? 'transaktion' : (categories.find(c=>c.id === newTransactionCategory)?.type === 'income' ? 'inkomst' : 'utgift')}.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleSaveTransaction(); }} className="space-y-4">
            <div>
              <Label htmlFor="transactionTitle">Titel</Label>
              <Input id="transactionTitle" value={newTransactionTitle} onChange={e => setNewTransactionTitle(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="transactionAmount">Belopp (kr)</Label>
              <Input id="transactionAmount" type="number" value={newTransactionAmount} onChange={e => setNewTransactionAmount(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="transactionDate">Datum</Label>
              <Input id="transactionDate" type="date" value={newTransactionDate} onChange={e => setNewTransactionDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="transactionCategory">Kategori</Label>
              <Select value={newTransactionCategory} onValueChange={setNewTransactionCategory}>
                <SelectTrigger><SelectValue placeholder="Välj kategori" /></SelectTrigger>
                <SelectContent>
                  {categories.filter(cat => (editingTransaction ? cat.type === editingTransaction.type : true)).map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name} ({cat.type === 'income' ? 'Inkomst' : 'Utgift'})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="transactionDescription">Beskrivning (Valfritt)</Label>
              <Textarea id="transactionDescription" value={newTransactionDescription} onChange={e => setNewTransactionDescription(e.target.value)} />
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Avbryt</Button></DialogClose>
              <Button type="submit" disabled={isSavingTransaction || !canEditActiveBoard}>
                {isSavingTransaction ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingTransaction ? 'Spara Ändringar' : 'Lägg till')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>


      <Dialog open={isCategoryDialogOpen} onOpenChange={(open) => {
        setIsCategoryDialogOpen(open);
        if (!open) resetCategoryForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Redigera Kategori' : 'Skapa Ny Kategori'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleSaveCategory(); }} className="space-y-4">
             <div>
              <Label htmlFor="categoryName">Namn</Label>
              <Input id="categoryName" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
            </div>
            {!editingCategory && (
              <div>
                <Label htmlFor="categoryType">Typ</Label>
                <Select value={newCategoryType} onValueChange={(value) => setNewCategoryType(value as 'income' | 'expense')}>
                  <SelectTrigger><SelectValue placeholder="Välj typ" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Inkomst</SelectItem>
                    <SelectItem value="expense">Utgift</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
                <Label htmlFor="categoryIcon">Ikon</Label>
                <Select value={newCategoryIconName} onValueChange={setNewCategoryIconName}>
                    <SelectTrigger><SelectValue placeholder="Välj ikon" /></SelectTrigger>
                    <SelectContent className="max-h-60">
                        {iconOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                                <div className="flex items-center">
                                    <opt.Icon className="mr-2 h-5 w-5" /> {opt.label}
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            {editingCategory && (
              <Button variant="destructive" type="button" onClick={() => { handleDeleteCategory(editingCategory.id, editingCategory.name); setIsCategoryDialogOpen(false); }} className="w-full justify-start" disabled={!canEditActiveBoard}>
                <Trash2 className="mr-2 h-4 w-4" /> Radera Kategori (från dialog)
              </Button>
            )}
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Avbryt</Button></DialogClose>
              <Button type="submit" disabled={!canEditActiveBoard}>{editingCategory ? 'Spara Ändringar' : 'Skapa Kategori'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>


       <Dialog open={isMemberManagementDialogOpen} onOpenChange={(open) => {
          if (!open) { setBoardToManageMembersFor(null); setListedMembers([]); setInviteUserUidInput(''); }
          setIsMemberManagementDialogOpen(open);
        }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Hantera Medlemmar för "{boardToManageMembersFor?.name}"</DialogTitle>
            <DialogDescription>Bjud in nya medlemmar eller ändra befintligas roller.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="inviteUserUid">Bjud in via Användar-ID (UID)</Label>
              <div className="flex gap-2">
                <Input id="inviteUserUid" placeholder="Användarens UID" value={inviteUserUidInput} onChange={e => setInviteUserUidInput(e.target.value)} className="flex-1"/>
                 <Select value={inviteUserRoleInput} onValueChange={(value) => setInviteUserRoleInput(value as 'viewer' | 'editor')}>
                    <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="viewer">Granskare</SelectItem>
                        <SelectItem value="editor">Redaktör</SelectItem>
                    </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddOrUpdateMemberByUid} disabled={isProcessingMemberAction || !inviteUserUidInput.trim()} className="w-full">
                {isProcessingMemberAction ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Bjud in / Uppdatera Roll"}
              </Button>
            </div>
            <Separator />
            <h4 className="text-sm font-medium">Befintliga Medlemmar (exkl. ägare)</h4>
            {isLoadingMembers ? (<div className="text-center"><Loader2 className="h-6 w-6 animate-spin" /></div>) :
              listedMembers.length > 0 ? (
              <ScrollArea className="h-[150px]">
                <ul className="space-y-2">
                  {listedMembers.map(member => (
                    <li key={member.uid} className="flex items-center justify-between p-2 border rounded-md">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" title={member.displayName}>{member.displayName}</p>
                        <p className="text-xs text-muted-foreground">UID: {member.uid.substring(0,6)}...</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Select value={member.role} onValueChange={(newRole) => handleUpdateListedMemberRole(boardToManageMembersFor!.id, member.uid, newRole as 'viewer' | 'editor')} disabled={isProcessingMemberAction}>
                            <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="viewer">Granskare</SelectItem>
                                <SelectItem value="editor">Redaktör</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleRemoveListedMember(boardToManageMembersFor!.id, member.uid, member.displayName)} disabled={isProcessingMemberAction}><Trash2 className="h-4 w-4"/></Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            ) : (<p className="text-sm text-muted-foreground text-center">Inga andra medlemmar än ägaren.</p>)}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Stäng</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <WelcomeGuideDialog
        isOpen={isGuideDialogOpen}
        onClose={() => setIsGuideDialogOpen(false)}
        showEnticingText={true} 
      />
    </div>
  );
}


