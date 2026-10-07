import { createFileRoute } from '@tanstack/react-router';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const Route = createFileRoute('/real-estate/contracts')({
  component: ContractsPage,
});

function ContractsPage() {
  return (
    <AppLayout title="Contratos de Locação">
      <Card>
        <CardHeader>
          <CardTitle>Contratos de Locação</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Módulo em construção.</p>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
