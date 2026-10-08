import { createFileRoute } from '@tanstack/react-router';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { chargesQuery, contractsQuery, propertiesQuery } from '@/lib/real-estate';
import { BRL } from '@/lib/format';
import { FileText, Home, Receipt, AlertCircle, ArrowUpRight, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';

export const Route = createFileRoute('/real-estate/dashboard')({
  component: DashboardPage,
});

function DashboardPage() {
  const { data: charges = [], isLoading: loadingCharges } = useQuery(chargesQuery);
  const { data: contracts = [], isLoading: loadingContracts } = useQuery(contractsQuery);
  const { data: properties = [], isLoading: loadingProps } = useQuery(propertiesQuery);

  const activeContracts = contracts.filter(c => c.status === 'ACTIVE').length;
  const totalProperties = properties.length;
  const availableProperties = properties.filter(p => p.status === 'AVAILABLE').length;

  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  
  // KPI: Receita da Imobiliária (Taxas Administrativas) este mês
  const currentMonthRevenue = charges
    .filter(c => c.status === 'RECEIVED' && c.competence === currentMonth)
    .reduce((acc, c) => acc + Number(c.admin_fee_amount), 0);

  // KPI: Inadimplência Total (Aluguéis em Atraso)
  const totalOverdue = charges
    .filter(c => c.status === 'OVERDUE')
    .reduce((acc, c) => acc + Number(c.gross_amount), 0);

  // KPI: Repasses Pendentes (Pagos, mas sem split ou transferência realizada)
  const pendingSplits = charges
    .filter(c => c.status === 'RECEIVED' && !c.split_id)
    .reduce((acc, c) => acc + Number(c.owner_amount), 0);

  // Chart Data: Últimos 6 meses de receita
  const last6Months = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return d.toISOString().slice(0, 7);
  }).reverse();

  const chartData = last6Months.map(month => {
    const monthCharges = charges.filter(c => c.competence === month);
    const received = monthCharges.filter(c => c.status === 'RECEIVED').reduce((acc, c) => acc + Number(c.admin_fee_amount), 0);
    const expected = monthCharges.filter(c => c.status !== 'CANCELLED').reduce((acc, c) => acc + Number(c.admin_fee_amount), 0);
    return {
      name: month.split('-').reverse().join('/'),
      Recebido: received,
      Pendente: expected - received
    };
  });

  return (
    <AppLayout title="Dashboard Imobiliário" subtitle="Visão geral e indicadores do seu negócio.">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contratos Ativos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeContracts}</div>
            <p className="text-xs text-muted-foreground">
              {availableProperties} imóveis disponíveis
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Admin (Mês)</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{BRL(currentMonthRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              Recebida na competência atual
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inadimplência</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{BRL(totalOverdue)}</div>
            <p className="text-xs text-muted-foreground">
              Boletos atrasados em aberto
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Repasses Pendentes</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{BRL(pendingSplits)}</div>
            <p className="text-xs text-muted-foreground">
              Aluguéis recebidos, aguardando repasse
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="col-span-1 lg:col-span-4">
          <CardHeader>
            <CardTitle>Receita Administrativa</CardTitle>
            <CardDescription>Recebimentos de taxa administrativa nos últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickFormatter={(val) => `R$ ${val}`} />
                <RechartsTooltip cursor={{ fill: 'transparent' }} formatter={(val) => BRL(Number(val))} />
                <Bar dataKey="Recebido" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 4, 4]} />
                <Bar dataKey="Pendente" stackId="a" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1 lg:col-span-3">
          <CardHeader>
            <CardTitle>Próximos Vencimentos</CardTitle>
            <CardDescription>Cobranças emitidas nos próximos 7 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {charges
                .filter(c => c.status === 'PENDING')
                .filter(c => {
                  const days = (new Date(c.due_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
                  return days >= 0 && days <= 7;
                })
                .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
                .slice(0, 5)
                .map(c => (
                  <div key={c.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{c.properties?.internal_id || c.properties?.address}</span>
                      <span className="text-xs text-muted-foreground">{c.tenants?.name}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-bold">{BRL(c.gross_amount)}</span>
                      <span className="text-xs text-orange-500">
                        Vence: {new Date(c.due_date).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                ))}
              {charges.filter(c => c.status === 'PENDING').length === 0 && (
                <div className="text-sm text-center text-muted-foreground py-8">
                  Nenhuma cobrança próxima.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
