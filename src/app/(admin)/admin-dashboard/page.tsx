// src/app/(admin)/admin-dashboard/page.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Shield } from 'lucide-react';

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Shield className="h-8 w-8 text-primary" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Välkommen till Adminportalen!</CardTitle>
          <CardDescription>
            Här kan du hantera applikationens inställningar, användare och annat administrativt innehåll.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Detta är en platshållarsida för admin-dashboarden.</p>
          <p className="mt-4 text-sm text-destructive font-semibold">
            Viktigt: Den nuvarande admin-verifieringen (e-post = "admin@ekonova.se") är en platshållare och inte säker.
            För en produktionsmiljö, byt ut detta mot en säker metod som att kontrollera en Firestore-roll
            (t.ex. ett `isAdmin: true`-fält på användardokumentet) eller ett Firebase Custom Claim.
          </p>
        </CardContent>
      </Card>
      {/* Framtida admin-komponenter och data kan visas här */}
    </div>
  );
}
