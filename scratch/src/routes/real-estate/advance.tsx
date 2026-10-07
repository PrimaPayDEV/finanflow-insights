import { createFileRoute } from '@tanstack/react-router';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const Route = createFileRoute('/real-estate/advance')({
  component: AdvancePage,
});

function AdvancePage() {
  return (
    <AppLayout title="Antecipação de Aluguel">
      <Card>
        <CardHeader>
          <CardTitle>Antecipação de Aluguel</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Módulo em construção.</p>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
