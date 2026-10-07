import { createFileRoute } from '@tanstack/react-router';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const Route = createFileRoute('/real-estate/dashboard')({
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <AppLayout title="Dashboard Imobiliário">
      <Card>
        <CardHeader>
          <CardTitle>Dashboard Imobiliário</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Módulo em construção.</p>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
