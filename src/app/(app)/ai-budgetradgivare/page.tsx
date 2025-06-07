
"use client";

import React, { useState, useEffect, useMemo, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles, AlertCircle, History } from 'lucide-react';
import { getBudgetRecommendations, type BudgetRecommendationsInput, type BudgetRecommendationsOutput } from '@/ai/flows/budget-advisor';
import { Alert, AlertDescription as ShadAlertDescription, AlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, query as firestoreQuery, where, onSnapshot, addDoc, serverTimestamp, Timestamp, orderBy, limit } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import SubscriptionPrompt from '@/components/shared/subscription-prompt';

interface BoardOption {
  id: string;
  name: string;
}

interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
}
interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
}

interface SavedAdvice extends BudgetRecommendationsOutput {
  id: string;
  inputData: BudgetRecommendationsInput;
  createdAt: Timestamp; // Firestore Timestamp
  userId: string;
  // boardId is implicitly part of the Firestore path but can be stored for denormalization
}


export default function AiBudgetAdvisorPage() {
  const { currentUser, subscription, loading: authLoading, mainBoardId } = useAuth();
  const { toast } = useToast();

  const [boards, setBoards] = useState<BoardOption[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string | undefined>(undefined);

  const [income, setIncome] = useState<number | string>('');
  const [expenses, setExpenses] = useState<number | string>('');
  const [debt, setDebt] = useState<number | string>('');
  const [expenseCategoriesInput, setExpenseCategoriesInput] = useState<string>('');

  const [recommendations, setRecommendations] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false); // For AI request
  const [error, setError] = useState<string | null>(null);
  
  const [isLoadingBoards, setIsLoadingBoards] = useState(true);
  const [isFetchingBoardData, setIsFetchingBoardData] = useState(false);

  const [savedAdvices, setSavedAdvices] = useState<SavedAdvice[]>([]);
  const [isLoadingSavedAdvices, setIsLoadingSavedAdvices] = useState(false);


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
    const q = firestoreQuery(boardsRef, where("members", "array-contains", currentUser.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let fetchedBoards = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name } as BoardOption));
      fetchedBoards.sort((a, b) => a.name.localeCompare(b.name));
      setBoards(fetchedBoards);
      setIsLoadingBoards(false); 
    }, (err: any) => {
      console.error("Error fetching boards for AI advisor:", err);
      let description = "Kunde inte hämta dina budgettavlor. ";
      if (err.code === 'permission-denied' || err.code === 'PERMISSION_DENIED') {
        description += "Kontrollera dina Firestore-säkerhetsregler och att inga webbläsartillägg blockerar Firebase.";
      } else {
        description += "Försök igen senare.";
      }
      toast({ title: "Fel vid hämtning av tavlor", description, variant: "destructive" });
      setBoards([]);
      setSelectedBoardId(undefined);
      setIsLoadingBoards(false);
    });
    return () => unsubscribe();
  }, [currentUser?.uid, isSubscribed, authLoading, toast]);

  // Effect 2: Set selectedBoardId
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
    
    setSelectedBoardId(prevSelectedBoardId => {
        if (prevSelectedBoardId !== newTargetBoardId) {
            return newTargetBoardId;
        }
        return prevSelectedBoardId;
    });
  }, [boards, mainBoardId, currentUser, authLoading, isLoadingBoards]);


  // Effect 3: Fetch data for the selected board (for pre-filling form)
  useEffect(() => {
    if (!currentUser?.uid || !selectedBoardId || !isSubscribed || authLoading) {
      setIncome('');
      setExpenses('');
      setExpenseCategoriesInput('');
      if (isFetchingBoardData) setIsFetchingBoardData(false);
      return;
    }

    setIsFetchingBoardData(true);
    setError(null);
    setIncome(''); 
    setExpenses('');
    setExpenseCategoriesInput('');

    const transactionsRef = collection(db, 'boards', selectedBoardId, 'transactions');
    const categoriesRef = collection(db, 'boards', selectedBoardId, 'categories');

    Promise.all([getDocs(transactionsRef), getDocs(categoriesRef)])
      .then(([transactionsSnapshot, categoriesSnapshot]) => {
        const boardTransactions = transactionsSnapshot.docs.map(doc => doc.data() as Omit<Transaction, 'id'>);
        const boardCategories = categoriesSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as Category));

        const totalIncome = boardTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const totalExpenses = boardTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

        const expenseCategoriesMap: Record<string, number> = {};
        boardTransactions.filter(t => t.type === 'expense').forEach(t => {
          const categoryDoc = boardCategories.find(c => c.id === t.category);
          const categoryName = categoryDoc ? categoryDoc.name : 'Okänd Kategori';
          expenseCategoriesMap[categoryName] = (expenseCategoriesMap[categoryName] || 0) + t.amount;
        });

        setIncome(totalIncome);
        setExpenses(totalExpenses);
        setExpenseCategoriesInput(
          Object.entries(expenseCategoriesMap)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n')
        );
      })
      .catch(err => {
        console.error("Error fetching data for selected board:", err);
        setError("Kunde inte hämta data för den valda tavlan.");
        toast({ title: "Fel", description: "Kunde inte hämta data för den valda tavlan.", variant: "destructive" });
      })
      .finally(() => setIsFetchingBoardData(false));

  }, [currentUser?.uid, selectedBoardId, toast, isSubscribed, authLoading]);

  // Effect 4: Fetch saved budget advices for the selected board
  useEffect(() => {
    if (!currentUser?.uid || !selectedBoardId || !isSubscribed || authLoading) {
      setSavedAdvices([]);
      return;
    }

    setIsLoadingSavedAdvices(true);
    const advicesRef = collection(db, 'boards', selectedBoardId, 'budgetAdvices');
    const q = firestoreQuery(advicesRef, orderBy('createdAt', 'desc'), limit(5));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedAdvices = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          recommendations: data.recommendations,
          inputData: data.inputData,
          createdAt: data.createdAt,
          userId: data.userId,
        } as SavedAdvice;
      });
      setSavedAdvices(fetchedAdvices);
      setIsLoadingSavedAdvices(false);
    }, (err) => {
      console.error("Error fetching saved budget advices:", err);
      toast({ title: "Fel", description: "Kunde inte hämta historik för budgetråd.", variant: "destructive" });
      setIsLoadingSavedAdvices(false);
    });

    return () => unsubscribe();
  }, [currentUser?.uid, selectedBoardId, isSubscribed, authLoading, toast]);


  const parseExpenseCategories = (input: string): Record<string, number> => {
    const categories: Record<string, number> = {};
    input.split('\n').forEach(line => {
      const parts = line.split(':');
      if (parts.length === 2) {
        const key = parts[0].trim();
        const value = parseFloat(parts[1].trim());
        if (key && !isNaN(value)) {
          categories[key] = value;
        }
      }
    });
    return categories;
  };

  const saveGeneratedAdvice = async (
    userId: string,
    boardId: string,
    recommendationsText: string,
    adviceInput: BudgetRecommendationsInput
  ) => {
    if (!boardId) {
      console.warn("Cannot save advice without a selected board ID.");
      return;
    }
    try {
      const adviceCollectionRef = collection(db, 'boards', boardId, 'budgetAdvices');
      await addDoc(adviceCollectionRef, {
        userId,
        boardId, // Storing boardId directly in document can be useful for some queries
        recommendations: recommendationsText,
        inputData: adviceInput,
        createdAt: serverTimestamp(),
      });
      toast({
        title: "Budgetråd Sparat",
        description: "Dina personliga rekommendationer har sparats under den aktuella tavlan.",
      });
    } catch (saveError) {
      console.error("Error saving budget advice:", saveError);
      toast({
        title: "Fel vid Sparande",
        description: "Kunde inte spara budgetrådet. Försök generera det igen.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setRecommendations(null);

    const parsedIncome = parseFloat(income as string);
    const parsedExpenses = parseFloat(expenses as string);
    const parsedDebt = parseFloat(debt as string); 
    const parsedCategories = parseExpenseCategories(expenseCategoriesInput);

    if (isNaN(parsedIncome) || isNaN(parsedExpenses) || isNaN(parsedDebt)) {
      setError("Var vänlig fyll i Inkomst, Utgifter och Skuld med siffror.");
      setIsLoading(false);
      return;
    }
    if (Object.keys(parsedCategories).length === 0 && parsedExpenses > 0) {
       setError("Utgiftskategorier måste anges om totala utgifter är större än noll. Format: 'Kategori: Belopp', en per rad.");
       setIsLoading(false);
       return;
    }

    const inputData: BudgetRecommendationsInput = {
      income: parsedIncome,
      expenses: parsedExpenses,
      debt: parsedDebt,
      expenseCategories: parsedCategories,
    };

    try {
      const result: BudgetRecommendationsOutput = await getBudgetRecommendations(inputData);
      setRecommendations(result.recommendations);

      if (currentUser?.uid && selectedBoardId && result.recommendations) {
        await saveGeneratedAdvice(currentUser.uid, selectedBoardId, result.recommendations, inputData);
      }

    } catch (err) {
      console.error(err);
      setError('Ett fel uppstod när råd skulle hämtas. Försök igen senare.');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isLoadingBoards) { 
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /> Laddar...</div>;
  }
  if (!currentUser && !authLoading) {
     return <div className="text-center p-8">Vänligen logga in för att använda AI Budgetrådgivaren.</div>
  }
  if (!isSubscribed && currentUser) {
    return <SubscriptionPrompt featureName="AI Budgetrådgivare" />;
  }
  if (!isLoadingBoards && boards.length === 0 && currentUser && isSubscribed) { 
     return (
        <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Inga Budgettavlor Hittades</AlertTitle>
            <ShadAlertDescription>Du behöver skapa en budgettavla på Kontrollpanelen först.</ShadAlertDescription>
        </Alert>
     );
  }
   if (!isLoadingBoards && !selectedBoardId && boards.length > 0 && currentUser && isSubscribed) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Välj en Tavla</AlertTitle>
        <ShadAlertDescription>Välj en budgettavla ovan för att använda AI Budgetrådgivaren.</ShadAlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>AI Budgetrådgivare</CardTitle>
            <CardDescription>
              Få personliga förslag för att optimera din budget. Välj en tavla för att auto-fylla data, eller fyll i manuellt. Genererade råd sparas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="boardSelect">Välj Tavla (Valfritt, auto-fyller data)</Label>
                <Select 
                  value={selectedBoardId} 
                  onValueChange={setSelectedBoardId} 
                  disabled={isLoadingBoards || isFetchingBoardData || boards.length === 0}
                >
                  <SelectTrigger id="boardSelect">
                    <SelectValue placeholder={boards.length === 0 ? "Inga tavlor hittades" : "Välj en tavla..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {boards.map(board => (
                      <SelectItem key={board.id} value={board.id}>{board.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isFetchingBoardData && <p className="text-xs text-muted-foreground mt-1 flex items-center"><Loader2 className="h-3 w-3 animate-spin mr-1"/>Hämtar data för tavla...</p>}
              </div>

              <div>
                <Label htmlFor="income">Total Inkomst (kr)</Label>
                <Input id="income" type="number" value={income} onChange={e => setIncome(e.target.value)} placeholder="30000" required disabled={isFetchingBoardData}/>
              </div>
              <div>
                <Label htmlFor="expenses">Totala Utgifter (kr)</Label>
                <Input id="expenses" type="number" value={expenses} onChange={e => setExpenses(e.target.value)} placeholder="25000" required disabled={isFetchingBoardData}/>
              </div>
              <div>
                <Label htmlFor="debt">Total Skuld (kr)</Label>
                <Input id="debt" type="number" value={debt} onChange={e => setDebt(e.target.value)} placeholder="10000" required disabled={isFetchingBoardData}/>
              </div>
              <div>
                <Label htmlFor="expenseCategories">Utgiftskategorier (en per rad, t.ex. Boende: 10000)</Label>
                <Textarea
                  id="expenseCategories"
                  value={expenseCategoriesInput}
                  onChange={e => setExpenseCategoriesInput(e.target.value)}
                  placeholder="Boende: 10000\nMat: 5000\nTransport: 2000"
                  rows={5}
                  disabled={isFetchingBoardData}
                />
                <p className="text-xs text-muted-foreground mt-1">Detta fält krävs om totala utgifter är mer än 0.</p>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading || isFetchingBoardData || (!selectedBoardId && !expenseCategoriesInput && !income && !expenses && !debt )}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><Sparkles className="mr-2 h-4 w-4" /> Få Budgetråd</>}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Dina Personliga Rekommendationer</CardTitle>
          </CardHeader>
          <CardContent className="min-h-[300px]">
            {isLoading && (
              <div className="flex flex-col items-center justify-center h-full">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Hämtar dina rekommendationer...</p>
              </div>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Fel</AlertTitle>
                <ShadAlertDescription>{error}</ShadAlertDescription>
              </Alert>
            )}
            {recommendations && !isLoading && (
              <div className="prose dark:prose-invert max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-sm bg-muted p-4 rounded-md">{recommendations}</pre>
              </div>
            )}
            {!isLoading && !recommendations && !error && (
              <p className="text-muted-foreground">Dina rekommendationer kommer att visas här. När de visas sparas de också automatiskt.</p>
            )}
          </CardContent>
        </Card>
      </div>
      
      {selectedBoardId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <History className="mr-2 h-5 w-5 text-primary" />
              Historik över Budgetråd
            </CardTitle>
            <CardDescription>
              Senaste 5 sparade råden för tavlan "{boards.find(b => b.id === selectedBoardId)?.name || 'denna tavla'}".
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingSavedAdvices && (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Laddar historik...
              </div>
            )}
            {!isLoadingSavedAdvices && savedAdvices.length === 0 && (
              <p className="text-muted-foreground text-center p-4">
                Inga tidigare budgetråd sparade för denna tavla. Generera ett nytt råd för att se det här.
              </p>
            )}
            {!isLoadingSavedAdvices && savedAdvices.length > 0 && (
              <Accordion type="single" collapsible className="w-full">
                {savedAdvices.map((advice) => (
                  <AccordionItem value={advice.id} key={advice.id}>
                    <AccordionTrigger>
                      Råd från {advice.createdAt?.toDate().toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) || 'Okänt datum'}
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-semibold mb-1">Rekommendationer:</h4>
                          <pre className="whitespace-pre-wrap font-sans text-sm bg-muted/50 p-3 rounded-md">{advice.recommendations}</pre>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-1">Indata som användes:</h4>
                          <div className="text-xs bg-muted/50 p-3 rounded-md space-y-1">
                            <p><strong>Inkomst:</strong> {advice.inputData.income.toLocaleString('sv-SE')} kr</p>
                            <p><strong>Utgifter:</strong> {advice.inputData.expenses.toLocaleString('sv-SE')} kr</p>
                            <p><strong>Skuld:</strong> {advice.inputData.debt.toLocaleString('sv-SE')} kr</p>
                            {Object.keys(advice.inputData.expenseCategories).length > 0 && (
                              <div>
                                <p><strong>Utgiftskategorier:</strong></p>
                                <ul className="list-disc list-inside pl-2">
                                  {Object.entries(advice.inputData.expenseCategories).map(([key, value]) => (
                                    <li key={key}>{key}: {value.toLocaleString('sv-SE')} kr</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
