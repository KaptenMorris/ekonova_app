
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminDashboardPage() {
  const { currentUser } = useAuth();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl">Admin Kontrollpanel</CardTitle>
          <CardDescription>Välkommen, {currentUser?.displayName || currentUser?.email || 'Admin'}!</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Detta är din adminpanel. Här kommer du snart att kunna se användarlistor och hantera supportärenden.
          </p>
          {/* Placeholder for future content */}
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Användare</CardTitle>
                <CardDescription>Översikt över registrerade användare.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">(Kommer snart)</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Supportärenden</CardTitle>
                <CardDescription>Hantera inkomna supportförfrågningar.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">(Kommer snart)</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
