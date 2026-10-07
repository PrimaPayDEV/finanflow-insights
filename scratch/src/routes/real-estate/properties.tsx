import { createFileRoute } from '@tanstack/react-router';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const Route = createFileRoute('/real-estate/properties')({
  component: PropertiesPage,
});

function PropertiesPage() {
  return (
    <AppLayout title="Imóveis">
      <Card>
        <CardHeader>
          <CardTitle>Imóveis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Módulo em construção.</p>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
