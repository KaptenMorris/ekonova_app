
"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, ShieldAlert, Trash2, Loader2, AlertCircle, BadgeCheck, ShieldX, XCircle, Copy, ExternalLink } from 'lucide-react'; // Added ExternalLink
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useAuth } from '@/contexts/AuthContext';
import React, { useState, useEffect, FormEvent } from 'react';
import { updateProfile as updateFirebaseAuthProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, updateDoc, getDoc, setDoc, serverTimestamp, Timestamp, deleteDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase'; 
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle as ShadAlertTitle, AlertDescription as ShadAlertDescription } from "@/components/ui/alert";
import SubscriptionPrompt from '@/components/shared/subscription-prompt';
import Link from 'next/link'; // Added Link for "Glömt lösenord"


export default function AccountSettingsPage() {
  const { currentUser, subscription, refreshUserData, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingPassword, setIsLoadingPassword] = useState(false);
  const [isLoadingDelete, setIsLoadingDelete] = useState(false);
  const [isCancellingSubscription, setIsCancellingSubscription] = useState(false);

  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [reauthPasswordForDelete, setReauthPasswordForDelete] = useState('');
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);
  const [isDeleteAlertDialogOpen, setIsDeleteAlertDialogOpen] = useState(false);


  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.displayName || '');
      setEmail(currentUser.email || '');
      const fetchFirestoreDisplayName = async () => {
        if (!currentUser.uid) return;
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists() && userDocSnap.data().displayName) {
          setDisplayName(userDocSnap.data().displayName);
        }
      };
      fetchFirestoreDisplayName();
    }
  }, [currentUser]);

  const handleProfileUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsLoadingProfile(true);
    setProfileError(null);
    try {
      await updateFirebaseAuthProfile(currentUser, { displayName });
      const userDocRef = doc(db, 'users', currentUser.uid);
      await setDoc(userDocRef,
        { displayName, email: currentUser.email, updatedAt: serverTimestamp() },
        { merge: true }
      );
      await currentUser.reload(); 
      await refreshUserData(); 
      toast({ title: "Profil Uppdaterad", description: "Ditt namn har sparats." });
    } catch (error: any) {
      console.error("Profile update error:", error);
      setProfileError(error.message || "Kunde inte uppdatera profilen.");
      toast({ title: "Fel", description: "Kunde inte uppdatera profilen.", variant: "destructive" });
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser || !currentUser.email) {
       setPasswordError("Kunde inte byta lösenord, användarinformation saknas.");
       return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError("Nya lösenorden matchar inte.");
      return;
    }
    if (!currentPassword) {
      setPasswordError("Nuvarande lösenord måste anges för att byta.");
      return;
    }
    setIsLoadingPassword(true);
    setPasswordError(null);
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      toast({ title: "Lösenord Ändrat", description: "Ditt lösenord har uppdaterats." });
      setCurrentPassword(''); setNewPassword(''); setConfirmNewPassword('');
    } catch (error: any) {
      console.error("Password change error:", error);
      let friendlyMessage = "Kunde inte byta lösenord.";
      if (error.code === 'auth/wrong-password') {
        friendlyMessage = "Fel nuvarande lösenord.";
      } else if (error.code === 'auth/weak-password') {
        friendlyMessage = "Det nya lösenordet är för svagt.";
      } else if (error.code === 'auth/too-many-requests') {
        friendlyMessage = "För många försök. Försök igen senare.";
      }
      setPasswordError(friendlyMessage);
      toast({ title: "Fel", description: friendlyMessage, variant: "destructive" });
    } finally {
      setIsLoadingPassword(false);
    }
  };

  const attemptAccountDeletion = async () => {
    if (!currentUser || !currentUser.email || !reauthPasswordForDelete) {
        setDeleteAccountError("Lösenord måste anges för att radera kontot.");
        return;
    }
    setIsLoadingDelete(true);
    setDeleteAccountError(null);
    const uid = currentUser.uid; 

    try {
        const credential = EmailAuthProvider.credential(currentUser.email, reauthPasswordForDelete);
        await reauthenticateWithCredential(currentUser, credential);

        const firestoreBatch = writeBatch(db);

        const userDocRef = doc(db, 'users', uid);
        firestoreBatch.delete(userDocRef);

        const memberBoardsQuery = query(collection(db, 'boards'), where('members', 'array-contains', uid));
        const memberBoardsSnapshot = await getDocs(memberBoardsQuery);
        
        memberBoardsSnapshot.forEach(boardDoc => {
            if (boardDoc.data().ownerUid === uid) {
                firestoreBatch.delete(boardDoc.ref);
            }
        });
        
        await firestoreBatch.commit();
        console.log("User document and owned board documents (main only) deleted from Firestore.");

        await auth.currentUser?.delete();

        toast({
            title: "Konto Raderat",
            description: "Ditt konto, användardokument och budgettavlor du äger har raderats. Data inuti budgettavlor (transaktioner etc.) och tavlor du är medlem i men inte äger kan finnas kvar.",
            duration: 10000,
        });
        setIsDeleteAlertDialogOpen(false);
    } catch (error: any) {
        console.error("Account deletion error:", error);
        let friendlyMessage = "Kunde inte radera kontot.";
        if (error.code === 'auth/wrong-password') {
            friendlyMessage = "Fel lösenord. Försök igen.";
        } else if (error.code === 'auth/too-many-requests') {
            friendlyMessage = "För många misslyckade försök. Försök igen senare.";
        } else if (error.code === 'auth/requires-recent-login') {
            friendlyMessage = "En ny inloggning krävs. Logga ut och in igen, försök sedan på nytt.";
        } else if (error.message && error.message.includes("firestore")) {
            friendlyMessage = "Kunde inte radera all data i databasen. Autentiseringskontot kan dock vara raderat."
        } else if (error.code === 'permission-denied' || error.code === 'PERMISSION_DENIED') {
            friendlyMessage = "Behörighet saknas för att radera data i databasen. Kontrollera Firestore-reglerna.";
        }
        setDeleteAccountError(friendlyMessage);
    } finally {
        if (auth.currentUser && auth.currentUser.uid === uid) {
           setIsLoadingDelete(false);
        } else if (!auth.currentUser && isDeleteAlertDialogOpen) { 
           setIsLoadingDelete(false);
        } else if (isDeleteAlertDialogOpen) { 
           setIsLoadingDelete(false);
        }
    }
};

  const handleCancelSubscription = async () => {
    if (!currentUser || !currentUser.uid) return;
    setIsCancellingSubscription(true);
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        subscriptionStatus: 'inactive',
        subscriptionExpiresAt: Timestamp.fromDate(new Date()), 
        subscriptionCancelledAt: serverTimestamp()
      });
      await refreshUserData();
      toast({ title: "Prenumeration Avbruten", description: "Din prenumeration har avbrutits." });
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      toast({ title: "Fel", description: "Kunde inte avbryta prenumerationen.", variant: "destructive" });
    } finally {
      setIsCancellingSubscription(false);
    }
  };

  const handleCopyUid = () => {
    if (currentUser?.uid) {
      navigator.clipboard.writeText(currentUser.uid)
        .then(() => {
          toast({ title: "Användar-ID Kopierat!", description: "Ditt UID har kopierats till urklipp." });
        })
        .catch(err => {
          console.error('Kunde inte kopiera UID: ', err);
          toast({ title: "Fel", description: "Kunde inte kopiera UID.", variant: "destructive" });
        });
    }
  };

  if (authLoading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /> Laddar användardata...</div>;
  }

  if (!currentUser) {
    return <div className="text-center p-8">Vänligen logga in för att se dina kontoinställningar.</div>;
  }

  const userAvatarFallback = (displayName?.split(' ').map(n => n[0]).join('') || email?.[0] || 'A').toUpperCase();
  const isSubscribed = subscription?.status === 'active' && (subscription.expiresAt ? subscription.expiresAt > new Date() : true);
  const hasHadSubscription = !!subscription?.expiresAt;
  const subscriptionIsCancelledButStillValid = subscription?.status === 'inactive' && subscription.expiresAt && subscription.expiresAt > new Date();
  const subscriptionTrulyExpired = subscription?.status === 'inactive' && subscription.expiresAt && subscription.expiresAt <= new Date();


  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-xl md:text-2xl">Profilinformation</CardTitle>
          <CardDescription>Uppdatera din profilbild, namn och e-postadress.</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0 space-y-6">
          {profileError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <ShadAlertTitle>Profilfel</ShadAlertTitle>
              <ShadAlertDescription>{profileError}</ShadAlertDescription>
            </Alert>
          )}
          <form onSubmit={handleProfileUpdate} className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={currentUser.photoURL || `https://placehold.co/150x150.png?text=${userAvatarFallback}`} alt={displayName || "Användare"} data-ai-hint="profile avatar large"/>
                <AvatarFallback>{userAvatarFallback}</AvatarFallback>
              </Avatar>
              <Button variant="outline" type="button" className="w-full sm:w-auto" disabled>
                <Upload className="mr-2 h-4 w-4" /> Ladda upp ny bild (ej implementerat)
              </Button>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name">Namn</Label>
              <Input id="name" value={displayName} onChange={e => setDisplayName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">E-postadress</Label>
              <Input id="email" type="email" value={email || ''} disabled />
              <p className="text-xs text-muted-foreground">E-poständring hanteras inte här.</p>
            </div>
            <Button type="submit" disabled={isLoadingProfile} className="w-full sm:w-auto">
              {isLoadingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Spara ändringar
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

       <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-xl md:text-2xl">Användar-ID (UID)</CardTitle>
          <CardDescription>Detta är ditt unika ID som kan användas för att bjuda in dig till budgettavlor.</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0 space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 p-3 border rounded-md bg-muted">
            <Input type="text" value={currentUser.uid} readOnly className="flex-1 font-mono text-sm" />
            <Button variant="outline" size="icon" onClick={handleCopyUid} aria-label="Kopiera UID">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Dela detta ID med andra användare om de vill bjuda in dig till en av deras budgettavlor.</p>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-xl md:text-2xl">Prenumeration</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0 space-y-4">
          {isSubscribed ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0 p-4 bg-accent/10 border border-accent rounded-lg">
                <div className="flex items-center space-x-3">
                    <BadgeCheck className="h-8 w-8 text-accent flex-shrink-0" />
                    <div>
                        <p className="font-semibold text-accent">Premium Aktiv</p>
                        <p className="text-sm text-muted-foreground">
                        Din prenumeration är aktiv till: {subscription?.expiresAt ? subscription.expiresAt.toLocaleDateString('sv-SE') : 'Obestämd tid'}.
                        </p>
                    </div>
                </div>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="w-full sm:w-auto" disabled={isCancellingSubscription}>
                            {isCancellingSubscription ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                            Avbryt Prenumeration
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Avbryt Prenumeration?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Är du säker på att du vill avbryta din prenumeration? Din åtkomst till premiumfunktioner kommer att upphöra omedelbart. Denna åtgärd kan inte ångras.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel disabled={isCancellingSubscription}>Nej, behåll</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleCancelSubscription}
                            disabled={isCancellingSubscription}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isCancellingSubscription ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Ja, avbryt"}
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
           ) : subscriptionIsCancelledButStillValid ? (
            <div className="flex items-center space-x-3 p-4 bg-yellow-500/10 border border-yellow-500 rounded-lg">
                <AlertCircle className="h-8 w-8 text-yellow-600 flex-shrink-0" />
                <div>
                    <p className="font-semibold text-yellow-700">Prenumeration Avbruten</p>
                    <p className="text-sm text-muted-foreground">
                    Din prenumeration är avbruten men fortfarande giltig till: {subscription?.expiresAt?.toLocaleDateString('sv-SE')}.
                    Efter detta datum förlorar du åtkomst till premiumfunktioner.
                    </p>
                </div>
            </div>
           ) : hasHadSubscription && subscriptionTrulyExpired ? (
             <div className="flex items-center space-x-3 p-4 bg-destructive/10 border border-destructive rounded-lg">
                <ShieldX className="h-8 w-8 text-destructive flex-shrink-0" />
                <div>
                    <p className="font-semibold text-destructive">Prenumeration Utgången</p>
                    <p className="text-sm text-muted-foreground">
                    Din prenumeration har löpt ut. Förnya för att återfå tillgång till premiumfunktioner.
                    </p>
                </div>
            </div>
          ) : (
             <div className="flex items-center space-x-3 p-4 bg-destructive/10 border border-destructive rounded-lg">
                <ShieldX className="h-8 w-8 text-destructive flex-shrink-0" />
                <div>
                    <p className="font-semibold text-destructive">Ingen Aktiv Prenumeration</p>
                    <p className="text-sm text-muted-foreground">
                    Uppgradera för att få tillgång till alla premiumfunktioner.
                    </p>
                </div>
            </div>
          )}
           {(!isSubscribed && (!subscriptionIsCancelledButStillValid || subscriptionTrulyExpired)) && <SubscriptionPrompt />}
           <p className="text-xs text-muted-foreground">Hantering av prenumeration (t.ex. byta plan) sker via den externa betaltjänsten och är inte implementerad här.</p>
        </CardContent>
      </Card>


      <Separator />

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-xl md:text-2xl">Lösenord</CardTitle>
          <CardDescription>Ändra ditt lösenord för ökad säkerhet.</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0 space-y-4">
          {passwordError && (
             <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <ShadAlertTitle>Lösenordsfel</ShadAlertTitle>
              <ShadAlertDescription>{passwordError}</ShadAlertDescription>
            </Alert>
          )}
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="currentPassword">Nuvarande lösenord</Label>
              <Input id="currentPassword" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required/>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newPassword">Nytt lösenord</Label>
              <Input id="newPassword" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required/>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmNewPassword">Bekräfta nytt lösenord</Label>
              <Input id="confirmNewPassword" type="password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} required/>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <Button type="submit" disabled={isLoadingPassword} className="w-full sm:w-auto">
                {isLoadingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Byt lösenord
                </Button>
                <Link href="/aterstall-losenord" className="text-sm text-muted-foreground hover:text-primary hover:underline text-center sm:text-right">
                    Glömt lösenord? <ExternalLink className="inline h-3 w-3 ml-0.5"/>
                </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <Separator />

      <Card className="border-destructive">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-destructive flex items-center text-xl md:text-2xl"><ShieldAlert className="mr-2 h-5 w-5" /> Farozon</CardTitle>
          <CardDescription>Hantering av ditt konto. Var försiktig med dessa åtgärder.</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0 space-y-4">
          <AlertDialog open={isDeleteAlertDialogOpen} onOpenChange={(open) => {
            setIsDeleteAlertDialogOpen(open);
            if (!open) {
              setReauthPasswordForDelete('');
              setDeleteAccountError(null);
            }
          }}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full sm:w-auto" onClick={() => setIsDeleteAlertDialogOpen(true)}>
                 <Trash2 className="mr-2 h-4 w-4" /> Radera konto
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Bekräfta radering av konto</AlertDialogTitle>
                <AlertDialogDescription>
                  Denna åtgärd kan inte ångras. Detta kommer permanent att radera ditt autentiseringskonto.
                  Ditt användardokument och budgettavlor du äger kommer också att raderas från databasen.
                  <br />
                  **Viktigt:** Data inuti dina budgettavlor (transaktioner, kategorier, räkningar) och tavlor du är medlem i men inte äger kommer **inte** automatiskt att raderas av denna åtgärd. För fullständig databorttagning, kontakta support eller använd en server-side funktion (ej implementerat).
                  <br />
                  För att bekräfta, vänligen ange ditt nuvarande lösenord.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="space-y-2 py-2">
                <Label htmlFor="reauthPasswordForDeleteInput">Nuvarande lösenord</Label>
                <Input
                  id="reauthPasswordForDeleteInput"
                  type="password"
                  value={reauthPasswordForDelete}
                  onChange={(e) => {
                    setReauthPasswordForDelete(e.target.value);
                    if (deleteAccountError) setDeleteAccountError(null);
                  }}
                  placeholder="••••••••"
                  className={deleteAccountError ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {deleteAccountError && (
                  <p className="text-sm text-destructive">{deleteAccountError}</p>
                )}
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel
                  disabled={isLoadingDelete}
                >
                  Avbryt
                </AlertDialogCancel>
                <AlertDialogAction
                 onClick={async (event) => {
                    event.preventDefault(); 
                    await attemptAccountDeletion();
                  }}
                 disabled={isLoadingDelete || !reauthPasswordForDelete}
                 className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isLoadingDelete ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Ja, radera mitt konto"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <p className="text-sm text-muted-foreground">
           Om du raderar ditt konto kommer ditt användardokument och budgettavlor du äger att tas bort permanent. Data inuti tavlorna (transaktioner, etc.) och tavlor du är medlem i men inte äger kommer inte att raderas automatiskt.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
