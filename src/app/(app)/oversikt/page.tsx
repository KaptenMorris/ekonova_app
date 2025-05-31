
"use client";

import React, { useState, useEffect, useMemo, FormEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, PieChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Bar, Pie, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, onSnapshot, query as firestoreQuery, where, orderBy, addDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose, DialogDescription as ShadDialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Loader2, AlertCircle, PiggyBank, Edit3, Trash2, PlusCircle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription as ShadAlertDescriptionComponent } from "@/components/ui/alert";
import { useIsMobile } from '@/hooks/use-mobile';
import SubscriptionPrompt from '@/components/shared/subscription-prompt';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth } from 'date-fns';
import { sv } from 'date-fns/locale';
import { useToast } from "@/hooks/use-toast";

interface Board {
  id: string;
  name: string;
  ownerUid?: string;
  members?: string[];
  memberRoles?: { [uid: string]: 'viewer' | 'editor' };
}

interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category: string; // Category ID
  date: string; // Stored as YYYY-MM-DD
}

interface Bill {
  id: string;
  amount: number;
  paid: boolean;
  dueDate: string;
}

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
}

interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  boardId: string;
  createdAt?: Timestamp;
}

const defaultChartColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
];

type UserRole = 'owner' | 'editor' | 'viewer' | 'none';

export default function OverviewPage() {
  const { currentUser, subscription, loading: authLoading, mainBoardId } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string | undefined>(undefined);
  const [selectedMonthDate, setSelectedMonthDate] = useState<Date>(startOfMonth(new Date()));

  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [unpaidBillsTotal, setUnpaidBillsTotal] = useState(0);

  const [rawTransactions, setRawTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenseDistributionData, setExpenseDistributionData] = useState<any[]>([]);

  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [isLoadingSavingsGoals, setIsLoadingSavingsGoals] = useState(false);
  const [isSavingsGoalDialogOpen, setIsSavingsGoalDialogOpen] = useState(false);
  const [editingSavingsGoal, setEditingSavingsGoal] = useState<SavingsGoal | null>(null);
  const [goalName, setGoalName] = useState('');
  const [goalTargetAmount, setGoalTargetAmount] = useState('');
  const [goalCurrentAmount, setGoalCurrentAmount] = useState('');
  const [savingsGoalDialogError, setSavingsGoalDialogError] = useState<string | null>(null);
  
  const [isAddFundsDialogOpen, setIsAddFundsDialogOpen] = useState(false);
  const [goalToAddFundsTo, setGoalToAddFundsTo] = useState<SavingsGoal | null>(null);
  const [depositAmountInput, setDepositAmountInput] = useState('');
  const [addFundsDialogError, setAddFundsDialogError] = useState<string | null>(null);


  const [isLoadingBoards, setIsLoadingBoards] = useState(true);
  const [isLoadingPageData, setIsLoadingPageData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSubscribed = useMemo(() => {
    return subscription?.status === 'active' && (subscription.expiresAt ? subscription.expiresAt > new Date() : true);
  }, [subscription]);

  // Effect 1: Fetch user's boards (now fetches full board data)
  useEffect(() => {
    if (authLoading || !currentUser?.uid || !isSubscribed) {
      setBoards([]);
      setSelectedBoardId(undefined);
      setIsLoadingBoards(false);
      return;
    }
    setIsLoadingBoards(true);
    const boardsRef = collection(db, 'boards');
    const q = firestoreQuery(boardsRef, where('members', 'array-contains', currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let fetchedBoards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Board));
      fetchedBoards.sort((a,b) => a.name.localeCompare(b.name));
      setBoards(fetchedBoards);
      setIsLoadingBoards(false);
    }, (err: any) => {
      console.error("Error fetching boards for overview:", err);
      let description = "Kunde inte hämta dina budgettavlor. ";
      if (err.code === 'permission-denied' || err.code === 'PERMISSION_DENIED') {
        description += "Kontrollera dina Firestore-säkerhetsregler och att inga webbläsartillägg blockerar Firebase.";
      } else {
        description += "Försök igen senare.";
      }
      setError(description);
      toast({ title: "Fel vid hämtning av tavlor", description, variant: "destructive" });
      setBoards([]);
      setSelectedBoardId(undefined);
      setIsLoadingBoards(false);
    });
    return () => unsubscribe();
  }, [currentUser?.uid, isSubscribed, authLoading, toast]);

  // Effect 2: Initialize selectedBoardId or validate existing one
  useEffect(() => {
    if (authLoading || isLoadingBoards || !currentUser || !isSubscribed) {
      return;
    }

    if (boards.length === 0 && !isLoadingBoards) {
      setSelectedBoardId(undefined);
      return;
    }
    
    const boardExists = (id: string | undefined): id is string => !!id && boards.some(b => b.id === id);

    if (selectedBoardId && boardExists(selectedBoardId)) {
      // Current selection is valid, do nothing to override user's choice
      return;
    }

    // If no valid board is selected, try to set one
    let newTargetBoardId: string | undefined = undefined;
    if (mainBoardId && boardExists(mainBoardId)) {
      newTargetBoardId = mainBoardId;
    } else if (boards.length > 0) {
      newTargetBoardId = boards[0].id;
    }
    setSelectedBoardId(newTargetBoardId);

  }, [boards, mainBoardId, currentUser, authLoading, isLoadingBoards, isSubscribed]);


  const activeBoardDetails = useMemo(() => boards.find(b => b.id === selectedBoardId), [boards, selectedBoardId]);

  const currentUserRoleOnActiveBoard = useMemo((): UserRole => {
      if (!currentUser || !activeBoardDetails) return 'none';
      if (activeBoardDetails.ownerUid === currentUser.uid) return 'owner';
      return activeBoardDetails.memberRoles?.[currentUser.uid] || (activeBoardDetails.members?.includes(currentUser.uid) ? 'viewer' : 'none');
  }, [currentUser, activeBoardDetails]);

  const canEditActiveBoard = useMemo(() => {
      return currentUserRoleOnActiveBoard === 'owner' || currentUserRoleOnActiveBoard === 'editor';
  }, [currentUserRoleOnActiveBoard]);

  // Effect 3: Fetch page data (transactions, bills, categories) for the selected board and month
  useEffect(() => {
    if (!currentUser?.uid || !selectedBoardId || !isSubscribed || authLoading) {
      setTotalIncome(0);
      setTotalExpenses(0);
      setUnpaidBillsTotal(0); 
      setRawTransactions([]);
      setCategories([]);
      if (isLoadingPageData) setIsLoadingPageData(false); 
      return;
    }

    setIsLoadingPageData(true);
    setError(null);
    setTotalIncome(0);
    setTotalExpenses(0);
    setRawTransactions([]);
    setCategories([]);

    const boardPath = `boards/${selectedBoardId}`;
    const transactionsRef = collection(db, boardPath, 'transactions');
    const billsRef = collection(db, boardPath, 'bills');
    const categoriesRef = collection(db, boardPath, 'categories');

    const monthStart = format(startOfMonth(selectedMonthDate), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(selectedMonthDate), 'yyyy-MM-dd');

    let unsubTransactions: () => void = () => {};
    let unsubBills: () => void = () => {};
    let unsubCategories: () => void = () => {};

    let transactionsLoaded = false;
    let categoriesLoaded = false;
    let billsLoaded = false;

    const checkAllDataLoaded = () => {
      if (transactionsLoaded && categoriesLoaded && billsLoaded) {
        setIsLoadingPageData(false);
      }
    };
    
    unsubTransactions = onSnapshot(
      firestoreQuery(transactionsRef, where("date", ">=", monthStart), where("date", "<=", monthEnd)),
      (snapshot) => {
        let boardTransData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
        boardTransData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); 
        setRawTransactions(boardTransData);

        const currentIncome = boardTransData.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const currentExpenses = boardTransData.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        setTotalIncome(currentIncome);
        setTotalExpenses(currentExpenses);
        transactionsLoaded = true;
        checkAllDataLoaded();
      }, (err) => {
        console.error(`Error fetching transactions for board ${selectedBoardId}:`, err);
        setError("Kunde inte hämta transaktioner för den valda månaden.");
        transactionsLoaded = true; // Still mark as loaded to potentially unblock loading state
        checkAllDataLoaded();
        setIsLoadingPageData(false); // Explicitly set loading to false on error
      });

    unsubBills = onSnapshot(firestoreQuery(billsRef, where('paid', '==', false)), (snapshot) => {
      const currentUnpaidTotal = snapshot.docs.reduce((sum, doc) => sum + (doc.data() as Bill).amount, 0);
      setUnpaidBillsTotal(currentUnpaidTotal);
      billsLoaded = true;
      checkAllDataLoaded();
    }, (err) => {
      console.error(`Error fetching bills for board ${selectedBoardId}:`, err);
      billsLoaded = true;
      checkAllDataLoaded();
    });

    unsubCategories = onSnapshot(firestoreQuery(categoriesRef), (snapshot) => {
      let fetchedCats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      fetchedCats.sort((a,b) => a.name.localeCompare(b.name));
      setCategories(fetchedCats);
      categoriesLoaded = true;
      checkAllDataLoaded();
    }, (err) => {
      console.error(`Error fetching categories for board ${selectedBoardId}:`, err);
      categoriesLoaded = true;
      checkAllDataLoaded();
    });
    
    return () => {
      unsubTransactions();
      unsubBills();
      unsubCategories();
    };
  }, [currentUser?.uid, selectedBoardId, selectedMonthDate, isSubscribed, authLoading, toast]);


  // Effect for calculating expenseDistributionData (derived state)
  useEffect(() => {
    if (categories.length > 0 && rawTransactions.some(t => t.type === 'expense')) {
      const expensesByCategory: Record<string, number> = {};
      rawTransactions.filter(t => t.type === 'expense').forEach(t => {
        const categoryDoc = categories.find(c => c.id === t.category);
        const categoryName = categoryDoc ? categoryDoc.name : 'Okänd Kategori';
        expensesByCategory[categoryName] = (expensesByCategory[categoryName] || 0) + t.amount;
      });

      const chartData = Object.entries(expensesByCategory)
        .filter(([, value]) => value > 0)
        .map(([name, value], index) => ({
          name,
          value,
          fill: defaultChartColors[index % defaultChartColors.length],
        }));
      setExpenseDistributionData(chartData);
    } else {
      setExpenseDistributionData([]);
    }
  }, [rawTransactions, categories]);

  // Effect for fetching savings goals
  useEffect(() => {
    if (!currentUser?.uid || !selectedBoardId || !isSubscribed || authLoading) {
      setSavingsGoals([]);
      if (isLoadingSavingsGoals) setIsLoadingSavingsGoals(false);
      return;
    }
    setIsLoadingSavingsGoals(true);
    const goalsRef = collection(db, 'boards', selectedBoardId, 'savingsGoals');
    const q = firestoreQuery(goalsRef, orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedGoals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavingsGoal));
      setSavingsGoals(fetchedGoals);
      setIsLoadingSavingsGoals(false);
    }, (err) => {
      console.error("Error fetching savings goals:", err);
      toast({ title: "Fel", description: "Kunde inte hämta sparmål.", variant: "destructive" });
      setIsLoadingSavingsGoals(false);
    });
    return () => unsubscribe();
  }, [currentUser?.uid, selectedBoardId, isSubscribed, authLoading, toast]);


  const netBalance = totalIncome - totalExpenses;

  const incomeExpenseChartData = useMemo(() => [
    { name: 'Inkomst', value: totalIncome, fill: "hsl(var(--accent))" },
    { name: 'Utgifter', value: totalExpenses, fill: "hsl(var(--destructive))" },
  ], [totalIncome, totalExpenses]);

  const chartConfigIncomeExpense = {
    value: { label: "Belopp (kr)" },
    Inkomst: { label: "Inkomst", color: "hsl(var(--accent))" },
    Utgifter: { label: "Utgifter", color: "hsl(var(--destructive))" },
  };

  const chartConfigExpenseDistribution = useMemo(() => {
    const config: any = { value: { label: "Belopp (kr)" } };
    expenseDistributionData.forEach(item => {
      config[item.name] = { label: item.name, color: item.fill };
    });
    return config;
  }, [expenseDistributionData]);

  const handlePreviousMonth = () => {
    setSelectedMonthDate(prevDate => subMonths(prevDate, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonthDate(prevDate => addMonths(prevDate, 1));
  };

  const isCurrentMonthOrFuture = isSameMonth(selectedMonthDate, new Date()) || selectedMonthDate > new Date();

  const tooltipFormatter = (value: number, name: string, item: any) => {
    const percentage = item.percent; 
    const formattedValue = value.toLocaleString('sv-SE');
    const formattedPercentage = (percentage !== undefined && percentage !== null)
      ? `(${(percentage * 100).toFixed(0)}%)`
      : '';
  
    return (
      <div className="flex w-full items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
            style={{ backgroundColor: item.color || item.payload.fill }}
          />
          <span className="text-muted-foreground">{item.name}</span>
        </div>
        <span className="font-semibold">{formattedValue} kr {formattedPercentage}</span>
      </div>
    );
  };

  // Savings Goal Functions
  const resetSavingsGoalForm = () => {
    setGoalName('');
    setGoalTargetAmount('');
    setGoalCurrentAmount('');
    setEditingSavingsGoal(null);
    setSavingsGoalDialogError(null);
  };

  const handleOpenSavingsGoalDialog = (goal?: SavingsGoal) => {
    if (!canEditActiveBoard) {
      toast({ title: "Åtkomst Nekad", description: "Du har inte behörighet att hantera sparmål på denna tavla.", variant: "destructive" });
      return;
    }
    if (goal) {
      setEditingSavingsGoal(goal);
      setGoalName(goal.name);
      setGoalTargetAmount(String(goal.targetAmount));
      setGoalCurrentAmount(String(goal.currentAmount));
    } else {
      resetSavingsGoalForm();
    }
    setIsSavingsGoalDialogOpen(true);
  };

  const handleSaveSavingsGoal = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedBoardId || !canEditActiveBoard) {
      setSavingsGoalDialogError("Ingen tavla vald eller otillräcklig behörighet.");
      return;
    }
    const target = parseFloat(goalTargetAmount);
    let current = parseFloat(goalCurrentAmount);

    if (goalName.trim() === '' || isNaN(target) || target <= 0 || isNaN(current) || current < 0) {
      setSavingsGoalDialogError("Fyll i namn och giltiga belopp (målbelopp > 0, nuvarande belopp >= 0).");
      return;
    }
    if (current > target) {
      setSavingsGoalDialogError("Nuvarande belopp kan inte överstiga målbeloppet.");
      return;
    }

    setSavingsGoalDialogError(null);

    const goalPayload: Omit<SavingsGoal, 'id' | 'createdAt'> & { createdAt?: any, boardId: string } = {
      name: goalName.trim(),
      targetAmount: target,
      currentAmount: current,
      boardId: selectedBoardId,
    };

    try {
      const goalsCollectionRef = collection(db, 'boards', selectedBoardId, 'savingsGoals');
      if (editingSavingsGoal) {
        await updateDoc(doc(goalsCollectionRef, editingSavingsGoal.id), goalPayload);
        toast({ title: "Sparmål Uppdaterat!" });
      } else {
        goalPayload.createdAt = serverTimestamp();
        await addDoc(goalsCollectionRef, goalPayload);
        toast({ title: "Sparmål Skapat!" });
      }
      setIsSavingsGoalDialogOpen(false);
      resetSavingsGoalForm();
    } catch (err) {
      console.error("Error saving savings goal:", err);
      toast({ title: "Fel", description: "Kunde inte spara sparmålet.", variant: "destructive" });
      setSavingsGoalDialogError("Ett fel uppstod när sparmålet skulle sparas.");
    }
  };

  const handleDeleteSavingsGoal = async (goalId: string) => {
    if (!selectedBoardId || !canEditActiveBoard) {
      toast({ title: "Åtkomst Nekad", description: "Du har inte behörighet att radera sparmål.", variant: "destructive" });
      return;
    }
    if (!confirm("Är du säker på att du vill radera detta sparmål?")) return;

    try {
      await deleteDoc(doc(db, 'boards', selectedBoardId, 'savingsGoals', goalId));
      toast({ title: "Sparmål Raderat" });
    } catch (err) {
      console.error("Error deleting savings goal:", err);
      toast({ title: "Fel", description: "Kunde inte radera sparmålet.", variant: "destructive" });
    }
  };

  const handleOpenAddFundsDialog = (goal: SavingsGoal) => {
    if (!canEditActiveBoard) {
      toast({ title: "Åtkomst Nekad", description: "Du har inte behörighet att fylla på detta sparmål.", variant: "destructive" });
      return;
    }
    setGoalToAddFundsTo(goal);
    setDepositAmountInput('');
    setAddFundsDialogError(null);
    setIsAddFundsDialogOpen(true);
  };

  const handleSaveDeposit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedBoardId || !canEditActiveBoard || !goalToAddFundsTo) {
      setAddFundsDialogError("Ingen tavla vald, otillräcklig behörighet eller inget sparmål valt.");
      return;
    }
    const deposit = parseFloat(depositAmountInput);
    if (isNaN(deposit) || deposit <= 0) {
      setAddFundsDialogError("Ange ett giltigt positivt belopp att sätta in.");
      return;
    }

    setAddFundsDialogError(null);
    const newCurrentAmount = Math.min(goalToAddFundsTo.currentAmount + deposit, goalToAddFundsTo.targetAmount);

    try {
      const goalDocRef = doc(db, 'boards', selectedBoardId, 'savingsGoals', goalToAddFundsTo.id);
      await updateDoc(goalDocRef, { currentAmount: newCurrentAmount });
      toast({ title: "Påfyllning Sparad!", description: `${deposit.toLocaleString('sv-SE')} kr har lagts till på "${goalToAddFundsTo.name}".` });
      setIsAddFundsDialogOpen(false);
      setGoalToAddFundsTo(null);
      setDepositAmountInput('');
    } catch (err) {
      console.error("Error saving deposit:", err);
      toast({ title: "Fel", description: "Kunde inte spara insättningen.", variant: "destructive" });
      setAddFundsDialogError("Ett fel uppstod när insättningen skulle sparas.");
    }
  };


  if (authLoading && !currentUser) { 
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /> Laddar användardata...</div>;
  }
  if (!currentUser && !authLoading) { 
    return <div className="text-center p-8">Vänligen logga in för att se din ekonomiska översikt.</div>
  }
  if (!isSubscribed && currentUser) { 
    return <SubscriptionPrompt featureName="Ekonomisk Översikt" />;
  }
  if (isLoadingBoards) {
     return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /> Laddar budgettavlor...</div>;
  }
  if (boards.length === 0 && !error && !authLoading && !isLoadingBoards) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Inga Budgettavlor Hittades</AlertTitle>
        <ShadAlertDescriptionComponent>Du behöver skapa en budgettavla på Kontrollpanelen först för att se en översikt.</ShadAlertDescriptionComponent>
      </Alert>
    );
  }
  if (isLoadingPageData && selectedBoardId && !isLoadingBoards) { 
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /> Laddar översiktsdata för vald tavla...</div>;
  }
  if (!selectedBoardId && !isLoadingBoards && !isLoadingPageData && boards.length > 0) {
     return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Välj en Tavla</AlertTitle>
        <ShadAlertDescriptionComponent>Välj en budgettavla ovan för att visa dess ekonomiska översikt.</ShadAlertDescriptionComponent>
      </Alert>
    );
  }


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Ekonomisk Översikt</h1>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          {boards.length > 0 && (
            <Select 
              value={selectedBoardId} 
              onValueChange={setSelectedBoardId} 
              disabled={isLoadingBoards || boards.length === 0 || isLoadingPageData}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder={boards.length === 0 ? "Inga tavlor" : "Välj budgettavla..."} />
              </SelectTrigger>
              <SelectContent>
                {boards.map(board => (
                  <SelectItem key={board.id} value={board.id}>{board.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {selectedBoardId && (
        <div className="flex items-center justify-center sm:justify-start gap-4 my-4">
          <Button variant="outline" size="icon" onClick={handlePreviousMonth} disabled={isLoadingPageData}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-lg font-medium w-40 text-center">
            {format(selectedMonthDate, 'MMMM yyyy', { locale: sv })}
          </span>
          <Button variant="outline" size="icon" onClick={handleNextMonth} disabled={isLoadingPageData || isCurrentMonthOrFuture}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Fel</AlertTitle>
          <ShadAlertDescriptionComponent>{error}</ShadAlertDescriptionComponent>
        </Alert>
      )}

      {!isLoadingPageData && selectedBoardId && !error && (
        <>
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-xl md:text-2xl">Kontosammanfattning</CardTitle>
              <CardDescription>För {boards.find(b => b.id === selectedBoardId)?.name || ""} ({format(selectedMonthDate, 'MMMM yyyy', { locale: sv })})</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0 space-y-2">
              <div className="flex justify-between"><span>Total Inkomst:</span> <span className="font-semibold text-accent">+ {totalIncome.toLocaleString('sv-SE')} kr</span></div>
              <div className="flex justify-between"><span>Totala Utgifter:</span> <span className="font-semibold text-destructive">- {totalExpenses.toLocaleString('sv-SE')} kr</span></div>
              <div className="flex justify-between"><span>Nettosaldo:</span> <span className={`font-semibold ${netBalance >= 0 ? 'text-accent' : 'text-destructive'}`}>{netBalance >= 0 ? '+ ' : '- '}{Math.abs(netBalance).toLocaleString('sv-SE')} kr</span></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-xl md:text-2xl">Obetalda Räkningar</CardTitle>
              <CardDescription>Totalt för {boards.find(b => b.id === selectedBoardId)?.name || ""} (ej månadsfiltrerat)</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <div className="flex justify-between"><span>Totalt Obetalt:</span> <span className="font-semibold text-destructive">- {unpaidBillsTotal.toLocaleString('sv-SE')} kr</span></div>
            </CardContent>
          </Card>

          <Card className="sm:col-span-2 lg:col-span-1">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-xl md:text-2xl">Inkomster vs. Utgifter</CardTitle>
              <CardDescription>För {format(selectedMonthDate, 'MMMM yyyy', { locale: sv })}</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0 h-[200px] sm:h-[250px] md:h-[200px] lg:h-[250px]">
              {totalIncome > 0 || totalExpenses > 0 ? (
                <ChartContainer config={chartConfigIncomeExpense} className="h-full w-full">
                  <BarChart accessibilityLayer data={incomeExpenseChartData} layout="vertical" margin={{ left: isMobile ? 50 : 60, right: 10, top: 5, bottom: 5 }}>
                    <XAxis type="number" dataKey="value" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => chartConfigIncomeExpense[value as keyof typeof chartConfigIncomeExpense]?.label || value}
                      width={isMobile ? 50 : 60}
                    />
                    <ChartTooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent hideLabel />} />
                    <Bar dataKey="value" radius={5} barSize={35}>
                      {incomeExpenseChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-10">Ingen inkomst- eller utgiftsdata att visa för {format(selectedMonthDate, 'MMMM yyyy', { locale: sv })}.</p>
              )}
            </CardContent>
          </Card>

          <Card className="col-span-1 sm:col-span-2 lg:col-span-3">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-xl md:text-2xl">Utgiftsfördelning</CardTitle>
              <CardDescription>Fördelning av dina utgifter per kategori för {format(selectedMonthDate, 'MMMM yyyy', { locale: sv })}.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0 flex items-center justify-center min-h-[250px] sm:h-[300px] md:h-[250px] lg:h-[300px]">
              {expenseDistributionData.length > 0 ? (
                <ChartContainer config={chartConfigExpenseDistribution} className="h-full w-full max-w-lg">
                  <PieChart>
                    <ChartTooltip 
                      cursor={{ fill: 'hsl(var(--muted))' }} 
                      content={<ChartTooltipContent formatter={tooltipFormatter} />} 
                    />
                    <Pie
                      data={expenseDistributionData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={isMobile ? 60 : 100} 
                      labelLine={false}
                    >
                      {expenseDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                  </PieChart>
                </ChartContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center">Ingen utgiftsdata att visa fördelning för {format(selectedMonthDate, 'MMMM yyyy', { locale: sv })}.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Savings Goals Section */}
        <Card className="col-span-1 sm:col-span-2 lg:col-span-3">
            <CardHeader className="p-4 sm:p-6 flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-xl md:text-2xl">Sparmål</CardTitle>
                    <CardDescription>Hantera och följ dina sparmål för {boards.find(b => b.id === selectedBoardId)?.name || ""}.</CardDescription>
                </div>
                {canEditActiveBoard && (
                    <Dialog open={isSavingsGoalDialogOpen} onOpenChange={(isOpen) => {
                        setIsSavingsGoalDialogOpen(isOpen);
                        if (!isOpen) resetSavingsGoalForm();
                    }}>
                        <DialogTrigger asChild>
                            <Button size="sm" onClick={() => handleOpenSavingsGoalDialog()}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Lägg till Sparmål
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{editingSavingsGoal ? "Redigera Sparmål" : "Skapa Nytt Sparmål"}</DialogTitle>
                                {savingsGoalDialogError && (
                                    <Alert variant="destructive" className="mt-2">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertTitle>Fel</AlertTitle>
                                        <ShadAlertDescriptionComponent>{savingsGoalDialogError}</ShadAlertDescriptionComponent>
                                    </Alert>
                                )}
                            </DialogHeader>
                            <form onSubmit={handleSaveSavingsGoal} className="space-y-4 py-4">
                                <div>
                                    <Label htmlFor="goalName">Namn på sparmål</Label>
                                    <Input id="goalName" value={goalName} onChange={e => setGoalName(e.target.value)} placeholder="T.ex. Resa till Japan, Ny Dator" />
                                </div>
                                <div>
                                    <Label htmlFor="goalTargetAmount">Målbelopp (kr)</Label>
                                    <Input id="goalTargetAmount" type="number" value={goalTargetAmount} onChange={e => setGoalTargetAmount(e.target.value)} placeholder="50000" />
                                </div>
                                <div>
                                    <Label htmlFor="goalCurrentAmount">Nuvarande sparat belopp (kr)</Label>
                                    <Input id="goalCurrentAmount" type="number" value={goalCurrentAmount} onChange={e => setGoalCurrentAmount(e.target.value)} placeholder="15000" />
                                </div>
                                
                                <DialogFooter>
                                    <DialogClose asChild><Button type="button" variant="outline">Avbryt</Button></DialogClose>
                                    <Button type="submit">
                                      {editingSavingsGoal ? "Spara ändringar" : "Skapa Sparmål"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0 space-y-4">
                {isLoadingSavingsGoals ? (
                    <div className="flex justify-center items-center py-8"><Loader2 className="h-6 w-6 animate-spin" /> Laddar sparmål...</div>
                ) : savingsGoals.length > 0 ? (
                    savingsGoals.map(goal => {
                        const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
                        const remaining = goal.targetAmount - goal.currentAmount;
                        return (
                            <Card key={goal.id} className="p-4 shadow-sm">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-lg font-semibold truncate">{goal.name}</h4>
                                        <Progress value={progress} className="h-3 my-2" />
                                        <div className="text-xs text-muted-foreground flex flex-wrap justify-between gap-x-4 gap-y-1">
                                            <span>Sparat: {goal.currentAmount.toLocaleString('sv-SE')} kr / {goal.targetAmount.toLocaleString('sv-SE')} kr ({progress.toFixed(0)}%)</span>
                                            <span className={remaining <=0 ? 'text-accent font-semibold': ''}>
                                                {remaining > 0 ? `Kvar: ${remaining.toLocaleString('sv-SE')} kr` : "Mål uppnått!"}
                                            </span>
                                        </div>
                                    </div>
                                    {canEditActiveBoard && (
                                        <div className="flex gap-1 sm:gap-2 mt-2 sm:mt-0 shrink-0">
                                            <Button variant="outline" size="sm" className="h-8 px-2 sm:px-3" onClick={() => handleOpenAddFundsDialog(goal)}><PiggyBank className="mr-0 sm:mr-2 h-4 w-4" /><span className="hidden sm:inline">Fyll på</span></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenSavingsGoalDialog(goal)}><Edit3 className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteSavingsGoal(goal.id)}><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        );
                    })
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">Inga sparmål skapade för denna tavla än. {canEditActiveBoard ? "Klicka på 'Lägg till Sparmål' för att börja!" : ""}</p>
                )}
            </CardContent>
        </Card>
        </>
      )}

      {/* Add Funds Dialog */}
      <Dialog open={isAddFundsDialogOpen} onOpenChange={(isOpen) => {
          setIsAddFundsDialogOpen(isOpen);
          if (!isOpen) {
              setGoalToAddFundsTo(null);
              setDepositAmountInput('');
              setAddFundsDialogError(null);
          }
      }}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Fyll på Sparmål: {goalToAddFundsTo?.name}</DialogTitle>
                  <ShadDialogDescription>
                      Ange beloppet du vill sätta in på detta sparmål.
                  </ShadDialogDescription>
                  {addFundsDialogError && (
                      <Alert variant="destructive" className="mt-2">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Fel</AlertTitle>
                          <ShadAlertDescriptionComponent>{addFundsDialogError}</ShadAlertDescriptionComponent>
                      </Alert>
                  )}
              </DialogHeader>
              <form onSubmit={handleSaveDeposit} className="space-y-4 py-4">
                  <div>
                      <Label htmlFor="depositAmount">Belopp att sätta in (kr)</Label>
                      <Input 
                        id="depositAmount" 
                        type="number" 
                        value={depositAmountInput} 
                        onChange={e => setDepositAmountInput(e.target.value)} 
                        placeholder="1000" 
                        autoFocus
                      />
                  </div>
                  <DialogFooter>
                      <DialogClose asChild><Button type="button" variant="outline">Avbryt</Button></DialogClose>
                      <Button type="submit">Spara Insättning</Button>
                  </DialogFooter>
              </form>
          </DialogContent>
      </Dialog>
    </div>
  );
}

    
