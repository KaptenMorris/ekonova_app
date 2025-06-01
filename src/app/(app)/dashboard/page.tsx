
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
  PlusCircle, Edit3, Trash2, MoreHorizontal, Home, Car, ShoppingCart, Clapperboard, Tag, Briefcase, HandCoins, Shapes, Zap, Wifi, Shield, Gift, PiggyBank, CreditCard, DollarSign, Receipt, Utensils, Plane, Palette, BookOpen, Heart, ShoppingBag, Shirt, Bike, Bus, Train, Fuel as FuelIcon, Camera, Music, Film, Gamepad2, Dog, Cat, PawPrint, GraduationCap, Landmark, Wrench, Phone, Computer, Loader2, Activity, Anchor, Award, Banknote, Bitcoin, Bone, Bookmark, Brain, Calculator, CalendarDays, Candy, Castle, CheckCheck, ChevronDown, ChevronUp, Church, CircleDollarSign, ClipboardList, Clock, Cloud, Code, Coffee, Coins, Compass, Contact, CookingPot, Crop, Crown, CupSoda, DoorOpen, Download, Drama, Dribbble, Droplet, Drumstick, Dumbbell, Ear, Egg, FileText, Fish, Flag, Flame, Flashlight, FlaskConical, Flower, Footprints, Gauge, Gem, Globe, Grape, Grid, Hammer, Headphones, HelpCircle, IceCream, Image, IndianRupee, Infinity, Key, Laptop, Laugh, Layers, Leaf, Library, LifeBuoy, Lightbulb, Link, List, Lock, LogIn, LogOut, Mail, Map as MapIcon, MapPin, Martini, Medal, Megaphone, Menu, Mic, Minus, Monitor, Moon, MousePointer, Move, Navigation, Newspaper, Nut, Option, Package, PaintBucket, Paperclip, ParkingCircle, PenTool, Pencil, Percent, PersonStanding, PictureInPicture, Pin, Pizza, Play, Plug, Pocket, Podcast, Power, Printer, Puzzle, Quote, Recycle, RefreshCcw, Reply, Rocket, RotateCcw, Rss, Ruler, Save, Scale, ScanLine, School, Scissors, ScreenShare, Search, Send, Settings, Share2, Siren, Slice, Smartphone, Smile, Speaker, Star, Store, Sun, Sunrise, Sunset, Table, Tablet, Target, Tent, ThumbsDown, ThumbsUp, Ticket, Timer, ToggleLeft, Trash, TrendingUp, Trophy, Truck, Tv, Umbrella, Upload, User, Verified, Video, Volume2, Wallet, Watch, Waves, Wind, Wine, Youtube, ZoomIn, UserPlus, ArrowUp, ArrowDown, Copy,
} from 'lucide-react';
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
  const [activeBoardData, setActiveBoardData] = useState<{
    transactions: Transaction[];
    categories: Category[];
  } | null>(null);

  const [isLoadingBoards, setIsLoadingBoards] = useState(true);
  const [isLoadingBoardData, setIsLoadingBoardData] = useState(false);
  const [isDeletingBoardId, setIsDeletingBoardId] = useState<string | null>(null);
  const [isUpdatingBoardOrder, setIsUpdatingBoardOrder] = useState(false);


  const [newBoardName, setNewBoardName] = useState('');

  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [newTransactionTitle, setNewTransactionTitle] = useState('');
  const [newTransactionAmount, setNewTransactionAmount] = useState<string | number>('');
  const [newTransactionDate, setNewTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTransactionCategory, setNewTransactionCategory] = useState<string | undefined>(undefined);
  const [newTransactionDescription, setNewTransactionDescription] = useState('');
  const [isSavingTransaction, setIsSavingTransaction] = useState(false);


  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<'income' | 'expense' | undefined>(undefined);
  const [newCategoryIconName, setNewCategoryIconName] = useState<string | undefined>(iconOptions.find(opt => opt.value === 'Shapes')?.value);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);


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
        setActiveBoardData(null);
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
        setActiveBoardData(null);
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
      setActiveBoardData(null);
    });
    return () => unsubscribe();
  }, [currentUser?.uid, toast, mainBoardId, userBoardOrderFromContext]);


  useEffect(() => {
    if (!currentUser?.uid || !activeBoardId) {
      setActiveBoardData(null);
      setIsLoadingBoardData(false);
      return;
    }
    setIsLoadingBoardData(true);

    const transactionsPath = `boards/${activeBoardId}/transactions`;
    const categoriesPath = `boards/${activeBoardId}/categories`;

    const transactionsRef = collection(db, transactionsPath);
    const categoriesRef = collection(db, categoriesPath);

    let unsubTransactions: () => void;
    let unsubCategories: () => void;

    const fetchData = async () => {
      try {
        unsubTransactions = onSnapshot(query(transactionsRef, orderBy("date", "desc")), (snapshot) => {
          let boardTransactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
          setActiveBoardData(prev => ({ ...(prev || {categories: []}), transactions: boardTransactions }));
        }, (error) => {
          console.error("Error fetching transactions:", error);
          toast({ title: "Fel", description: "Kunde inte hämta transaktioner.", variant: "destructive" });
        });

        unsubCategories = onSnapshot(query(categoriesRef, orderBy("name")), (snapshot) => {
          let boardCategories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
          setActiveBoardData(prev => ({ ...(prev || {transactions: []}), categories: boardCategories }));
        }, (error) => {
          console.error("Error fetching categories:", error);
          toast({ title: "Fel", description: "Kunde inte hämta kategorier.", variant: "destructive" });
        });

      } catch (error) {
        console.error("Error fetching initial board data:", error);
        toast({ title: "Fel", description: "Kunde inte hämta all data för tavlan.", variant: "destructive" });
      } finally {
        setTimeout(() => setIsLoadingBoardData(false), 300);
      }
    };

    fetchData();

    return () => {
      if (unsubTransactions) unsubTransactions();
      if (unsubCategories) unsubCategories();
    };
  }, [currentUser?.uid, activeBoardId, toast]);


  const categoryTotals = useMemo(() => {
    if (!activeBoardData?.transactions || !activeBoardData?.categories) return {};
    const totals: Record<string, { total: number, type: 'income' | 'expense' }> = {};
    activeBoardData.categories.forEach(cat => { totals[cat.id] = { total: 0, type: cat.type }; });
    activeBoardData.transactions.forEach(t => {
      if (totals[t.category] !== undefined) {
        totals[t.category].total += t.amount;
      }
    });
    return totals;
  }, [activeBoardData]);


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
    if (!currentUser?.uid || !activeBoardId || !activeBoardData || !canEditActiveBoard) {
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
    setNewTransactionDate(new Date().toISOString().split('T')[0]);
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
    if (!currentUser?.uid || !activeBoardId || !activeBoardData?.categories || !canEditActiveBoard) {
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
    const selectedCategoryDetails = activeBoardData.categories.find(cat => cat.id === newTransactionCategory);
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


  const getTotal = useCallback((type: 'income' | 'expense') => {
    if (!activeBoardData?.transactions) return 0;
    return activeBoardData.transactions.filter(t => t.type === type).reduce((sum, t) => sum + t.amount, 0);
  }, [activeBoardData?.transactions]);

  const incomeTransactions = useMemo(() => activeBoardData?.transactions.filter(t => t.type === 'income') || [], [activeBoardData?.transactions]);
  const expenseTransactions = useMemo(() => activeBoardData?.transactions.filter(t => t.type === 'expense') || [], [activeBoardData?.transactions]);


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
              variant={activeBoardId === board.id ? 'default' : 'outline'}
              onClick={() => {
                setActiveBoardId(board.id);
                setActiveBoardName(board.name);
              }}
              className="relative group shrink-0"
              asChild
            >
              <div className="flex items-center cursor-pointer p-2">
                <span className="truncate">{board.name}</span>
                {board.id === mainBoardId && <Star className="h-4 w-4 text-yellow-500 ml-2 shrink-0" />}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-2 h-6 w-6 opacity-50 group-hover:opacity-100 shrink-0"
                      onClick={(e) => e.stopPropagation()} 
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2">
                    { (getUserRole(board) === 'owner' || getUserRole(board) === 'editor') && (
                      <Dialog>
                        <DialogTrigger asChild><Button variant="ghost" className="w-full justify-start text-sm p-2"><Edit3 className="mr-2 h-4 w-4" /> Ändra namn</Button></DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Ändra namn på tavla</DialogTitle>
                            <DialogDescription>Ange ett nytt namn för tavlan "{board.name}".</DialogDescription>
                          </DialogHeader>
                          <Input
                            defaultValue={board.name}
                            onBlur={(e) => { if (e.target.value.trim() !== board.name && e.target.value.trim() !== '') handleRenameBoard(board.id, e.target.value); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') { const target = e.target as HTMLInputElement; if (target.value.trim() !== board.name && target.value.trim() !== '') { handleRenameBoard(board.id, target.value); (e.target as HTMLElement).closest('div[role="dialog"]')?.querySelector('button[aria-label="Close"]')?.click();}}}}
                          />
                          <DialogFooter><DialogClose asChild><Button variant="outline">Avbryt</Button></DialogClose></DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                     <Dialog open={isMemberManagementDialogOpen && boardToManageMembersFor?.id === board.id} onOpenChange={(open) => {
                            if (!open) { 
                                setBoardToManageMembersFor(null); 
                                setInviteUserUidInput(''); 
                                setInviteUserRoleInput('viewer'); 
                                setListedMembers([]); 
                                setIsLoadingMembers(false); 
                            }
                            setIsMemberManagementDialogOpen(open);
                        }}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" className="w-full justify-start text-sm p-2" onClick={() => {setBoardToManageMembersFor(board); fetchBoardMemberDetails(board.id); setIsMemberManagementDialogOpen(true);}}>
                            <UserPlus className="mr-2 h-4 w-4" /> Hantera Medlemmar
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px]">
                            <DialogHeader>
                                <DialogTitle>Hantera Medlemmar för '{boardToManageMembersFor?.name || board.name}'</DialogTitle>
                                 <DialogDescription>
                                    Bjud in nya användare med deras UID eller hantera roller och ta bort befintliga medlemmar. En användares UID hittas på deras Kontoinställningar-sida.
                                </DialogDescription>
                            </DialogHeader>

                            <h4 className="font-semibold mb-2 text-md sticky top-0 bg-background py-1">Nuvarande Medlemmar</h4>
                            <ScrollArea className="my-4 max-h-[200px] sm:max-h-[250px] pr-3">
                              {isLoadingMembers ? (
                                <div className="flex justify-center items-center h-20">
                                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                  <span className="ml-2 text-sm text-muted-foreground">Laddar medlemmar...</span>
                                </div>
                              ) : listedMembers.length > 0 ? (
                                <div className="space-y-3">
                                  {listedMembers.map(member => (
                                    <div key={member.uid} className="flex items-center justify-between p-2 border rounded-md gap-2">
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate" title={member.displayName}>{member.displayName}</p>
                                        <p className="text-xs text-muted-foreground truncate" title={member.uid}>UID: {member.uid}</p>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Select
                                          value={member.role}
                                          onValueChange={(newRole) => handleUpdateListedMemberRole(board.id, member.uid, newRole as 'viewer' | 'editor')}
                                          disabled={isProcessingMemberAction || getUserRole(boardToManageMembersFor) !== 'owner' && getUserRole(boardToManageMembersFor) !== 'editor'}
                                        >
                                          <SelectTrigger className="h-8 w-[110px] text-xs">
                                            <SelectValue placeholder="Välj roll" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="viewer" className="text-xs">Granskare</SelectItem>
                                            <SelectItem value="editor" className="text-xs">Redaktör</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-destructive hover:text-destructive"
                                          onClick={() => {
                                            if (boardToManageMembersFor) { 
                                                handleRemoveListedMember(boardToManageMembersFor.id, member.uid, member.displayName);
                                            }
                                          }}
                                          disabled={isProcessingMemberAction || getUserRole(boardToManageMembersFor) !== 'owner' && getUserRole(boardToManageMembersFor) !== 'editor'}
                                          aria-label={`Ta bort medlem ${member.displayName}`}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">Inga andra medlemmar på denna tavla.</p>
                              )}
                            </ScrollArea>

                            <Separator className="my-4" />

                            <div>
                              <h4 className="font-semibold mb-2 text-md">Bjud in Ny Medlem / Uppdatera Roll</h4>
                              <DialogDescription className="text-sm text-muted-foreground mb-3">
                                Ange UID och välj en roll för att bjuda in en ny medlem eller uppdatera en befintlig medlems roll på denna tavla.
                              </DialogDescription>
                              <div className="space-y-3">
                                  <div>
                                      <Label htmlFor="inviteUserUidInput" className="text-xs">Användar-ID (UID)</Label>
                                      <Input id="inviteUserUidInput" placeholder="Klistra in användarens UID här" value={inviteUserUidInput} onChange={e => setInviteUserUidInput(e.target.value)} className="h-9"/>
                                  </div>
                                  <div>
                                      <Label htmlFor="inviteUserRoleSelect" className="text-xs">Roll för Användare</Label>
                                      <Select value={inviteUserRoleInput} onValueChange={(value) => setInviteUserRoleInput(value as 'viewer' | 'editor')}
                                        disabled={getUserRole(boardToManageMembersFor) !== 'owner' && getUserRole(boardToManageMembersFor) !== 'editor'}
                                      >
                                          <SelectTrigger id="inviteUserRoleSelect" className="h-9">
                                              <SelectValue placeholder="Välj roll" />
                                          </SelectTrigger>
                                          <SelectContent>
                                              <SelectItem value="viewer">Granskare (kan se)</SelectItem>
                                              <SelectItem value="editor">Redaktör (kan se och ändra)</SelectItem>
                                          </SelectContent>
                                      </Select>
                                  </div>
                                  <Button onClick={handleAddOrUpdateMemberByUid}
                                    disabled={isProcessingMemberAction || !inviteUserUidInput.trim() || (getUserRole(boardToManageMembersFor) !== 'owner' && getUserRole(boardToManageMembersFor) !== 'editor')}
                                    className="w-full sm:w-auto"
                                  >
                                      {isProcessingMemberAction && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                      Spara ändringar
                                  </Button>
                              </div>
                            </div>

                            <DialogFooter className="mt-6">
                            <Button variant="outline" onClick={() => {setIsMemberManagementDialogOpen(false); setBoardToManageMembersFor(null); setInviteUserUidInput(''); setInviteUserRoleInput('viewer'); setListedMembers([]); setIsLoadingMembers(false);}}>Stäng</Button>
                            </DialogFooter>
                        </DialogContent>
                        </Dialog>
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-sm p-2"
                        onClick={() => handleSetMainBoard(board.id)}
                        disabled={board.id === mainBoardId || isSettingMainBoard}
                    >
                        {isSettingMainBoard && board.id === activeBoardId ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Star className="mr-2 h-4 w-4" />}
                        {board.id === mainBoardId ? 'Detta är Huvudtavla' : 'Ange som Huvudtavla'}
                    </Button>


                    { boards.length > 1 && (
                        <>
                           <Button
                                variant="ghost"
                                className="w-full justify-start text-sm p-2"
                                onClick={() => handleMoveBoard(board.id, 'up')}
                                disabled={isUpdatingBoardOrder || index === 0}
                            >
                                <ArrowUp className="mr-2 h-4 w-4" /> Flytta Uppåt
                            </Button>
                            <Button
                                variant="ghost"
                                className="w-full justify-start text-sm p-2"
                                onClick={() => handleMoveBoard(board.id, 'down')}
                                disabled={isUpdatingBoardOrder || index === boards.length - 1}
                            >
                                <ArrowDown className="mr-2 h-4 w-4" /> Flytta Nedåt
                            </Button>
                        </>
                    )}

                    {currentUser?.uid === board.ownerUid && (
                        <Button
                            variant="ghost"
                            className="w-full justify-start text-sm p-2 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteBoard(board.id)}
                            disabled={isDeletingBoardId === board.id}
                        >
                            {isDeletingBoardId === board.id ?
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> :
                                <Trash2 className="mr-2 h-4 w-4" />
                            }
                            Radera
                        </Button>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </Button>
          ))}
        </div>
        <Dialog>
          <DialogTrigger asChild><Button variant="outline" className="shrink-0 w-full sm:w-auto"><PlusCircle className="mr-2 h-4 w-4" /> Skapa ny tavla</Button></DialogTrigger>
          <DialogContent data-testid="dialog-add-board">
            <DialogHeader>
                <DialogTitle>Skapa ny tavla</DialogTitle>
                <DialogDescription>Ange ett namn för din nya budgettavla.</DialogDescription>
            </DialogHeader>
            <Input placeholder="Tavlans namn" value={newBoardName} onChange={(e) => setNewBoardName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAddBoard(); }}/>
            <DialogFooter>
              <DialogClose asChild data-testid="dialog-close-add-board"><Button variant="ghost">Avbryt</Button></DialogClose>
              <Button onClick={handleAddBoard}>Skapa</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 pr-1 pb-2">
        {isLoadingBoardData && activeBoardId && (
           <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /> Laddar tavlans data...</div>
        )}
        {!isLoadingBoardData && activeBoard && activeBoardData ? (
          <>
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="flex flex-col">
                <CardHeader><CardTitle className="text-lg">Inkomster</CardTitle></CardHeader>
                <CardContent className="flex-1 space-y-4 overflow-y-auto p-4 max-h-[240px] md:max-h-[300px] lg:max-h-[calc(100vh-550px)] xl:max-h-[calc(100vh-500px)]">
                  {incomeTransactions.map(transaction => (
                    <Card key={transaction.id} className="p-3 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold truncate">{transaction.title}</h4>
                          <p className="text-xs text-muted-foreground">{new Date(transaction.date).toLocaleDateString('sv-SE')} - {activeBoardData.categories.find(c=>c.id === transaction.category)?.name}</p>
                          {transaction.description && <p className="text-xs mt-1 break-words">{transaction.description}</p>}
                        </div>
                        <div className="flex flex-col items-end sm:items-center gap-1 mt-2 sm:mt-0 w-full sm:w-auto">
                           <p className="font-semibold text-accent whitespace-nowrap text-right sm:text-left w-full sm:w-auto">+ {transaction.amount.toLocaleString('sv-SE')} kr</p>
                          {canEditActiveBoard && (
                            <div className="flex justify-end sm:justify-start w-full sm:w-auto">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleOpenEditTransactionDialog(transaction)}><Edit3 className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => handleDeleteTransaction(transaction)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                  {incomeTransactions.length === 0 && <p className="text-sm text-muted-foreground">Inga inkomsttransaktioner än.</p>}
                </CardContent>
                <CardFooter className="border-t p-4"><div className="flex justify-between w-full font-semibold"><span className="text-accent">Total Inkomst:</span><span className="text-accent">+ {getTotal('income').toLocaleString('sv-SE')} kr</span></div></CardFooter>
              </Card>

              <Card className="flex flex-col">
                <CardHeader><CardTitle className="text-lg">Utgifter</CardTitle></CardHeader>
                <CardContent className="flex-1 space-y-4 overflow-y-auto p-4 max-h-[240px] md:max-h-[300px] lg:max-h-[calc(100vh-550px)] xl:max-h-[calc(100vh-500px)]">
                  {expenseTransactions.map(transaction => (
                    <Card key={transaction.id} className="p-3 shadow-sm">
                       <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold truncate">{transaction.title}</h4>
                          <p className="text-xs text-muted-foreground">{new Date(transaction.date).toLocaleDateString('sv-SE')} - {activeBoardData.categories.find(c=>c.id === transaction.category)?.name}</p>
                          {transaction.description && <p className="text-xs mt-1 break-words">{transaction.description}</p>}
                        </div>
                        <div className="flex flex-col items-end sm:items-center gap-1 mt-2 sm:mt-0 w-full sm:w-auto">
                           <p className="font-semibold text-destructive whitespace-nowrap text-right sm:text-left w-full sm:w-auto">- {transaction.amount.toLocaleString('sv-SE')} kr</p>
                           {canEditActiveBoard && (
                            <div className="flex justify-end sm:justify-start w-full sm:w-auto">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleOpenEditTransactionDialog(transaction)}><Edit3 className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => handleDeleteTransaction(transaction)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                           )}
                        </div>
                      </div>
                    </Card>
                  ))}
                  {expenseTransactions.length === 0 && <p className="text-sm text-muted-foreground">Inga utgiftstransaktioner än.</p>}
                </CardContent>
                <CardFooter className="border-t p-4"><div className="flex justify-between w-full font-semibold"><span className="text-destructive">Total Utgift:</span><span className="text-destructive">- {getTotal('expense').toLocaleString('sv-SE')} kr</span></div></CardFooter>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Kategoriöversikt</CardTitle>
                <CardDescription>Summering av transaktioner per kategori för {activeBoardName || ''}.</CardDescription>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 max-h-[300px] md:max-h-[400px] lg:max-h-[calc(100vh-600px)] overflow-y-auto">
                <div>
                  <h3 className="text-md font-semibold mb-3 border-b pb-2 sticky top-0 bg-card z-10">Inkomstkategorier</h3>
                  {activeBoardData.categories.filter(cat => cat.type === 'income').length > 0 ? (
                    <ul className="space-y-3">
                      {activeBoardData.categories.filter(cat => cat.type === 'income').map(cat => (
                        <li key={cat.id} className="flex items-center justify-between text-sm p-3 border rounded-md shadow-sm hover:bg-muted/50 transition-colors">
                          <div className="flex items-center min-w-0 mr-2">{getCategoryIcon(cat.name, cat.type, cat.iconName)}<span className="truncate">{cat.name}</span></div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="font-semibold text-accent">+ {(categoryTotals[cat.id]?.total || 0).toLocaleString('sv-SE')} kr</span>
                            {canEditActiveBoard && (
                              <>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleOpenCategoryDialog(cat)} aria-label={`Redigera kategori ${cat.name}`}><Edit3 className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => handleDeleteCategory(cat.id, cat.name)} aria-label={`Radera kategori ${cat.name}`}><Trash2 className="h-4 w-4" /></Button>
                              </>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (<p className="text-sm text-muted-foreground">Inga inkomstkategorier än.</p>)}
                </div>
                <div>
                  <h3 className="text-md font-semibold mb-3 border-b pb-2 sticky top-0 bg-card z-10">Utgiftskategorier</h3>
                  {activeBoardData.categories.filter(cat => cat.type === 'expense').length > 0 ? (
                    <ul className="space-y-3">
                      {activeBoardData.categories.filter(cat => cat.type === 'expense').map(cat => (
                        <li key={cat.id} className="flex items-center justify-between text-sm p-3 border rounded-md shadow-sm hover:bg-muted/50 transition-colors">
                           <div className="flex items-center min-w-0 mr-2">{getCategoryIcon(cat.name, cat.type, cat.iconName)}<span className="truncate">{cat.name}</span></div>
                           <div className="flex items-center gap-1 shrink-0">
                            <span className="font-semibold text-destructive">- {(categoryTotals[cat.id]?.total || 0).toLocaleString('sv-SE')} kr</span>
                            {canEditActiveBoard && (
                              <>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleOpenCategoryDialog(cat)} aria-label={`Redigera kategori ${cat.name}`}><Edit3 className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => handleDeleteCategory(cat.id, cat.name)} aria-label={`Radera kategori ${cat.name}`}><Trash2 className="h-4 w-4" /></Button>
                              </>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (<p className="text-sm text-muted-foreground">Inga utgiftskategorier än.</p>)}
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-xl text-muted-foreground text-center">
              {boards.length === 0 && !isLoadingBoards ? 'Skapa din första budgettavla!' : 'Välj en tavla för att se dess data.'}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-auto sticky bottom-0 bg-background py-4 border-t px-2 sm:px-0">
        <Button
          className="flex-1"
          disabled={!activeBoardId || isLoadingBoardData || isSavingTransaction || !canEditActiveBoard}
          onClick={handleOpenNewTransactionDialog}
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Lägg till Ny Transaktion
        </Button>

        <Dialog open={isCategoryDialogOpen} onOpenChange={(isOpen) => {
            setIsCategoryDialogOpen(isOpen);
            if (!isOpen) resetCategoryForm();
          }}
        >
          <DialogTrigger asChild>
            <Button variant="outline" className="flex-1" disabled={!activeBoardId  || isLoadingBoardData || !canEditActiveBoard} onClick={() => handleOpenCategoryDialog()}>
              <PlusCircle className="mr-2 h-4 w-4" /> {editingCategory ? 'Redigera Kategori' : 'Ny Kategori'}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCategory ? 'Redigera Kategori' : 'Skapa Ny Kategori'}</DialogTitle>
              <DialogDescription>
                {editingCategory ? `Redigera namn och ikon för kategorin "${editingCategory.name}". Typen kan inte ändras.` : 'Ange namn, typ och ikon för din nya kategori.'}
              </DialogDescription>
            </DialogHeader>
             <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="catName" className="text-right">Namn</Label><Input id="catName" placeholder="T.ex. Lön, Matvaror" className="col-span-3" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} /></div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="catType" className="text-right">Typ</Label>
                 <Select 
                    value={newCategoryType} 
                    onValueChange={(value) => setNewCategoryType(value as 'income' | 'expense')}
                    disabled={!!editingCategory} 
                  >
                  <SelectTrigger className="col-span-3"><SelectValue placeholder="Välj typ..." /></SelectTrigger>
                  <SelectContent><SelectItem value="income">Inkomst</SelectItem><SelectItem value="expense">Utgift</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="catIcon" className="text-right">Ikon</Label>
                 <Select value={newCategoryIconName} onValueChange={setNewCategoryIconName}>
                  <SelectTrigger className="col-span-3"><SelectValue placeholder="Välj ikon..." /></SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {iconOptions.map(({ value, label, Icon }) => (<SelectItem key={value} value={value}><div className="flex items-center"><Icon className="mr-2 h-4 w-4" />{label}</div></SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsCategoryDialogOpen(false); resetCategoryForm();}}>Avbryt</Button>
              <Button onClick={handleSaveCategory}>{editingCategory ? 'Spara ändringar' : 'Skapa Kategori'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={isTransactionDialogOpen} onOpenChange={(isOpen) => {
          setIsTransactionDialogOpen(isOpen);
          if (!isOpen) {
            resetTransactionForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTransaction ? 'Redigera Transaktion' : 'Lägg till Ny Transaktion'}</DialogTitle>
            <DialogDescription>Fyll i detaljerna för din transaktion.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">Titel</Label>
              <Input id="title" placeholder="T.ex. Lön, Matinköp" className="col-span-3" value={newTransactionTitle} onChange={e => setNewTransactionTitle(e.target.value)} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">Belopp</Label>
              <Input id="amount" type="number" placeholder="50.00" className="col-span-3" value={newTransactionAmount} onChange={e => setNewTransactionAmount(e.target.value)} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">Datum</Label>
              <Input id="date" type="date" className="col-span-3" value={newTransactionDate} onChange={e => setNewTransactionDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right">Kategori</Label>
              <Select value={newTransactionCategory} onValueChange={setNewTransactionCategory}>
                <SelectTrigger className="col-span-3"><SelectValue placeholder="Välj kategori..." /></SelectTrigger>
                <SelectContent>
                  {activeBoardData?.categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center">{getCategoryIcon(cat.name, cat.type, cat.iconName)}<span className="ml-2">{cat.name} ({cat.type === 'income' ? 'Inkomst' : 'Utgift'})</span></div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">Beskrivning</Label>
              <Textarea id="description" placeholder="Frivillig beskrivning..." className="col-span-3" value={newTransactionDescription} onChange={e => setNewTransactionDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTransactionDialogOpen(false)} disabled={isSavingTransaction}>Avbryt</Button>
            <Button onClick={handleSaveTransaction} disabled={isSavingTransaction}>
              {isSavingTransaction ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingTransaction ? 'Spara' : 'Lägg till')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

