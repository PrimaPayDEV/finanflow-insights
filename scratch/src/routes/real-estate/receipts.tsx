import { createFileRoute } from '@tanstack/react-router';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const Route = createFileRoute('/real-estate/receipts')({
  component: ReceiptsPage,
});

function ReceiptsPage() {
  return (
    <AppLayout title="Recebimentos">
      <Card>
        <CardHeader>
          <CardTitle>Recebimentos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Módulo em construção.</p>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
