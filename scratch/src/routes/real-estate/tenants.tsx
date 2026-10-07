import { createFileRoute } from '@tanstack/react-router';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const Route = createFileRoute('/real-estate/tenants')({
  component: TenantsPage,
});

function TenantsPage() {
  return (
    <AppLayout title="Inquilinos">
      <Card>
        <CardHeader>
          <CardTitle>Inquilinos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Módulo em construção.</p>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
