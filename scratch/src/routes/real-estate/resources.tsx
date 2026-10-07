import { createFileRoute } from '@tanstack/react-router';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const Route = createFileRoute('/real-estate/resources')({
  component: ResourcesPage,
});

function ResourcesPage() {
  return (
    <AppLayout title="Recursos para Imobiliária">
      <Card>
        <CardHeader>
          <CardTitle>Recursos para Imobiliária</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Módulo em construção.</p>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
