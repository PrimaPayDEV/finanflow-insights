import { createFileRoute } from '@tanstack/react-router';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const Route = createFileRoute('/real-estate/owners')({
  component: OwnersPage,
});

function OwnersPage() {
  return (
    <AppLayout title="Proprietários">
      <Card>
        <CardHeader>
          <CardTitle>Proprietários</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Módulo em construção.</p>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
