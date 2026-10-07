const fs = require('fs');
const path = require('path');

const routes = [
  { name: 'dashboard', title: 'Dashboard Imobiliário' },
  { name: 'properties', title: 'Imóveis' },
  { name: 'owners', title: 'Proprietários' },
  { name: 'tenants', title: 'Inquilinos' },
  { name: 'contracts', title: 'Contratos de Locação' },
  { name: 'charges', title: 'Cobranças' },
  { name: 'receipts', title: 'Recebimentos' },
  { name: 'advance', title: 'Antecipação de Aluguel' },
  { name: 'resources', title: 'Recursos para Imobiliária' },
  { name: 'installments', title: 'Parcelamento de Aluguel' },
  { name: 'requests', title: 'Solicitações' },
];

const dir = path.join(__dirname, 'src/routes/real-estate');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

routes.forEach(r => {
  const content = `import { createFileRoute } from '@tanstack/react-router';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const Route = createFileRoute('/real-estate/${r.name}')({
  component: ${r.name.charAt(0).toUpperCase() + r.name.slice(1)}Page,
});

function ${r.name.charAt(0).toUpperCase() + r.name.slice(1)}Page() {
  return (
    <AppLayout title="${r.title}">
      <Card>
        <CardHeader>
          <CardTitle>${r.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Módulo em construção.</p>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
`;
  fs.writeFileSync(path.join(dir, `${r.name}.tsx`), content);
});

console.log('Routes created!');
