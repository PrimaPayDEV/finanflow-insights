import { createFileRoute } from '@tanstack/react-router';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const Route = createFileRoute('/real-estate/installments')({
  component: InstallmentsPage,
});

function InstallmentsPage() {
  return (
    <AppLayout title="Parcelamento de Aluguel">
      <Card>
        <CardHeader>
          <CardTitle>Parcelamento de Aluguel</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Módulo em construção.</p>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
