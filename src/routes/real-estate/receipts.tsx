import { createFileRoute } from '@tanstack/react-router';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { chargesQuery } from '@/lib/real-estate';
import { BRL } from '@/lib/format';
import { CircleDollarSign, ArrowUpRight, ArrowDownRight, FileCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const Route = createFileRoute('/real-estate/receipts')({
  component: ReceiptsPage,
});

function ReceiptsPage() {
  const { data: charges = [], isLoading } = useQuery(chargesQuery);

  // Consideramos recebimentos apenas as cobranças que foram pagas (RECEIVED)
  const receipts = charges.filter(c => c.status === 'RECEIVED');

  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  const currentMonthReceipts = receipts.filter(c => c.competence === currentMonth);

  const totalGross = currentMonthReceipts.reduce((acc, c) => acc + Number(c.gross_amount), 0);
  const totalAdminFee = currentMonthReceipts.reduce((acc, c) => acc + Number(c.admin_fee_amount), 0);
  const totalOwnerAmount = currentMonthReceipts.reduce((acc, c) => acc + Number(c.owner_amount), 0);
  const pendingSplits = receipts.filter(c => !c.split_id).reduce((acc, c) => acc + Number(c.owner_amount), 0);

  return (
    <AppLayout title="Recebimentos" subtitle="Gestão de aluguéis pagos e repasses aos proprietários.">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Volume Recebido (Mês)</CardTitle>
            <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{BRL(totalGross)}</div>
            <p className="text-xs text-muted-foreground">
              Soma total dos aluguéis recebidos
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sua Receita (Mês)</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{BRL(totalAdminFee)}</div>
            <p className="text-xs text-muted-foreground">
              Taxa administrativa retida
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Repassado (Mês)</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{BRL(totalOwnerAmount)}</div>
            <p className="text-xs text-muted-foreground">
              Destinado aos proprietários
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Repasses Pendentes</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{BRL(pendingSplits)}</div>
            <p className="text-xs text-muted-foreground">
              Geral (sem split via plataforma)
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Recebimentos</CardTitle>
          <CardDescription>Lista de todos os aluguéis e taxas que já foram liquidados.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Data Receb.</th>
                  <th className="px-4 py-3 font-medium">Imóvel</th>
                  <th className="px-4 py-3 font-medium">Inquilino</th>
                  <th className="px-4 py-3 font-medium">Valor Total</th>
                  <th className="px-4 py-3 font-medium text-green-600">Sua Receita</th>
                  <th className="px-4 py-3 font-medium text-orange-600">Repasse</th>
                  <th className="px-4 py-3 font-medium">Status do Repasse</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {receipts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhum recebimento registrado ainda.
                    </td>
                  </tr>
                )}
                {receipts.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {new Date(c.updated_at || c.due_date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {c.properties?.internal_id || c.properties?.address}
                    </td>
                    <td className="px-4 py-3">{c.tenants?.name}</td>
                    <td className="px-4 py-3 font-bold">{BRL(c.gross_amount)}</td>
                    <td className="px-4 py-3 text-green-600">{BRL(c.admin_fee_amount)}</td>
                    <td className="px-4 py-3 text-orange-600">{BRL(c.owner_amount)}</td>
                    <td className="px-4 py-3">
                      {c.split_id ? (
                        <Badge variant="default" className="bg-green-600">
                          Realizado (Split)
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">
                          Pendente
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
