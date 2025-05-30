
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, PieChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Bar, Pie, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, onSnapshot, query as firestoreQuery, where, orderBy } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription as ShadAlertDescription } from "@/components/ui/alert";
import { useIsMobile } from '@/hooks/use-mobile';
import SubscriptionPrompt from '@/components/shared/subscription-prompt';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth, parseISO } from 'date-fns';
import { sv } from 'date-fns/locale';
import { useToast } from "@/hooks/use-toast";

interface Board {
  id: string;
  name: string;
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

const defaultChartColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
];


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

  const [isLoadingBoards, setIsLoadingBoards] = useState(true);
  const [isLoadingPageData, setIsLoadingPageData] = useState(false); // Changed from isLoadingBoardData
  const [error, setError] = useState<string | null>(null);

  const isSubscribed = useMemo(() => {
    return subscription?.status === 'active' && (subscription.expiresAt ? subscription.expiresAt > new Date() : true);
  }, [subscription]);

  // Effect 1: Fetch user's boards
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
      let fetchedBoards = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name } as Board));
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

  // Effect 2: Set selectedBoardId based on mainBoardId or first available board
  useEffect(() => {
    if (authLoading || isLoadingBoards || !currentUser || !isSubscribed) {
      return;
    }

    let newTargetBoardId: string | undefined = undefined;
    const boardExists = (id: string | undefined): id is string => !!id && boards.some(b => b.id === id);

    if (mainBoardId && boardExists(mainBoardId)) {
      newTargetBoardId = mainBoardId;
    } else if (boards.length > 0) {
      newTargetBoardId = boards[0].id;
    }
    
    if (selectedBoardId !== newTargetBoardId) {
      setSelectedBoardId(newTargetBoardId);
    }

  }, [boards, mainBoardId, currentUser, authLoading, isLoadingBoards, isSubscribed, selectedBoardId]);


  // Effect 3: Fetch page data (transactions, bills, categories) for the selected board and month
  useEffect(() => {
    console.log(`[OV_PAGE] Data fetching useEffect. selectedBoardId: ${selectedBoardId}, currentUser: !!${currentUser?.uid}, sub: ${isSubscribed}, authLoad: ${authLoading}`);
    if (!currentUser?.uid || !selectedBoardId || !isSubscribed || authLoading) {
      console.log(`[OV_PAGE] Conditions NOT met for data fetching. selectedBoardId: ${selectedBoardId}. Clearing data.`);
      setTotalIncome(0);
      setTotalExpenses(0);
      setUnpaidBillsTotal(0); // This might be board-specific, so clear
      setRawTransactions([]);
      setCategories([]);
      if (isLoadingPageData) setIsLoadingPageData(false); // Ensure loading state is reset
      return;
    }

    console.log(`[OV_PAGE] Fetching data FOR board: ${selectedBoardId}. Setting isLoadingPageData = true.`);
    setIsLoadingPageData(true);
    setError(null);
    setTotalIncome(0);
    setTotalExpenses(0);
    // setUnpaidBillsTotal(0); // Potentially keep if it's global, or reset
    setRawTransactions([]);
    setCategories([]);

    const boardPath = `boards/${selectedBoardId}`;
    const transactionsRef = collection(db, boardPath, 'transactions');
    const billsRef = collection(db, boardPath, 'bills');
    const categoriesRef = collection(db, boardPath, 'categories');

    const monthStart = format(startOfMonth(selectedMonthDate), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(selectedMonthDate), 'yyyy-MM-dd');

    console.log(`[OV_PAGE] Fetching data for board ${selectedBoardId}, month: ${monthStart} to ${monthEnd}`);

    let unsubTransactions: () => void = () => {};
    let unsubBills: () => void = () => {};
    let unsubCategories: () => void = () => {};

    let transactionsLoaded = false;
    let categoriesLoaded = false;
    let billsLoaded = false; // Added for bills

    const checkAllDataLoaded = () => {
      if (transactionsLoaded && categoriesLoaded && billsLoaded) { // Check all relevant data sources
        console.log(`[OV_PAGE] All main data loaded for board ${selectedBoardId}. Setting isLoadingPageData = false.`);
        setIsLoadingPageData(false);
      }
    };
    
    unsubTransactions = onSnapshot(
      firestoreQuery(transactionsRef, where("date", ">=", monthStart), where("date", "<=", monthEnd)),
      (snapshot) => {
        console.log(`[OV_PAGE] Transactions snapshot for board ${selectedBoardId}. Docs: ${snapshot.docs.length}`);
        let boardTransData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
        boardTransData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Sort by date
        setRawTransactions(boardTransData);

        const currentIncome = boardTransData.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const currentExpenses = boardTransData.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        setTotalIncome(currentIncome);
        setTotalExpenses(currentExpenses);
        transactionsLoaded = true;
        checkAllDataLoaded();
      }, (err) => {
        console.error(`[OV_PAGE] Error fetching transactions for board ${selectedBoardId}:`, err);
        setError("Kunde inte hämta transaktioner för den valda månaden.");
        setIsLoadingPageData(false); 
      });

    unsubBills = onSnapshot(firestoreQuery(billsRef, where('paid', '==', false)), (snapshot) => {
      console.log(`[OV_PAGE] Bills snapshot for board ${selectedBoardId}. Docs: ${snapshot.docs.length}`);
      const currentUnpaidTotal = snapshot.docs.reduce((sum, doc) => sum + (doc.data() as Bill).amount, 0);
      setUnpaidBillsTotal(currentUnpaidTotal);
      billsLoaded = true; // Mark bills as loaded
      checkAllDataLoaded();
    }, (err) => {
      console.error(`[OV_PAGE] Error fetching bills for board ${selectedBoardId}:`, err);
      // setError("Kunde inte hämta räkningar."); 
      billsLoaded = true; // Still mark as loaded to not hang indefinitely
      checkAllDataLoaded();
    });

    unsubCategories = onSnapshot(firestoreQuery(categoriesRef), (snapshot) => {
      console.log(`[OV_PAGE] Categories snapshot for board ${selectedBoardId}. Docs: ${snapshot.docs.length}`);
      let fetchedCats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      fetchedCats.sort((a,b) => a.name.localeCompare(b.name));
      setCategories(fetchedCats);
      categoriesLoaded = true;
      checkAllDataLoaded();
    }, (err) => {
      console.error(`[OV_PAGE] Error fetching categories for board ${selectedBoardId}:`, err);
      // setError("Kunde inte hämta kategorier.");
      categoriesLoaded = true; // Still mark as loaded
      checkAllDataLoaded();
    });
    
    return () => {
      console.log(`[OV_PAGE] Cleaning up Firestore listeners for board: ${selectedBoardId}`);
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
    // item is the specific entry from the Recharts payload array.
    // It should contain 'name', 'value', 'color', and 'percent'.
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
        <ShadAlertDescription>Du behöver skapa en budgettavla på Kontrollpanelen först för att se en översikt.</ShadAlertDescription>
      </Alert>
    );
  }

  if (isLoadingPageData && selectedBoardId && !isLoadingBoards) { 
    console.log(`[OV_PAGE] Rendering loading state for page data. selectedBoardId: ${selectedBoardId}`);
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /> Laddar översiktsdata för vald tavla...</div>;
  }
  
  if (!selectedBoardId && !isLoadingBoards && !isLoadingPageData && boards.length > 0) {
     return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Välj en Tavla</AlertTitle>
        <ShadAlertDescription>Välj en budgettavla ovan för att visa dess ekonomiska översikt.</ShadAlertDescription>
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
          <ShadAlertDescription>{error}</ShadAlertDescription>
        </Alert>
      )}

      {!isLoadingPageData && selectedBoardId && !error && (
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
                      outerRadius={isMobile ? 60 : 100} // Increased outerRadius for non-mobile
                      labelLine={false}
                      // label prop removed to hide labels inside pie segments
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
      )}
    </div>
  );
}

    
