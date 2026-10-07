import { createFileRoute } from '@tanstack/react-router';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const Route = createFileRoute('/real-estate/charges')({
  component: ChargesPage,
});

function ChargesPage() {
  return (
    <AppLayout title="Cobranças">
      <Card>
        <CardHeader>
          <CardTitle>Cobranças</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Módulo em construção.</p>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
