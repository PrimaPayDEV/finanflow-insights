import { createFileRoute } from '@tanstack/react-router';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FastForward, Calculator, CheckCircle2, Clock } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BRL } from '@/lib/format';
import { useQuery } from '@tanstack/react-query';
import { contractsQuery } from '@/lib/real-estate';
import { toast } from 'sonner';

export const Route = createFileRoute('/real-estate/advance')({
  component: AdvancePage,
});

function AdvancePage() {
  const [open, setOpen] = useState(false);
  const { data: contracts = [], isLoading } = useQuery(contractsQuery);
  const activeContracts = contracts.filter(c => c.status === 'ACTIVE');

  const [selectedContractId, setSelectedContractId] = useState<string>('');
  const [monthsToAdvance, setMonthsToAdvance] = useState('1');

  const selectedContract = activeContracts.find(c => c.id === selectedContractId);

  // Simulação Mock
  const grossRent = selectedContract ? Number(selectedContract.rent_amount) : 0;
  const totalGross = grossRent * Number(monthsToAdvance);
  const anticipationFee = 0.035; // 3.5% a.m
  const feeAmount = totalGross * anticipationFee * Number(monthsToAdvance);
  const netAmount = totalGross - feeAmount;

  const handleSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContractId) {
      toast.error('Selecione um contrato para simular.');
      return;
    }
    toast.success('Solicitação de antecipação enviada para análise!');
    setOpen(false);
    setSelectedContractId('');
    setMonthsToAdvance('1');
  };

  return (
    <AppLayout title="Antecipação de Aluguel" subtitle="Transforme recebíveis futuros em dinheiro na conta hoje.">
      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Limite Pré-Aprovado</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">R$ 50.000,00</div>
            <p className="text-xs text-muted-foreground mt-1">
              Baseado no volume de contratos ativos
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Antecipado em Aberto</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ 0,00</div>
            <p className="text-xs text-muted-foreground mt-1">
              Soma de antecipações ativas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa Média</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3,50% <span className="text-sm font-normal text-muted-foreground">a.m.</span></div>
            <p className="text-xs text-muted-foreground mt-1">
              Taxa de desconto aplicada
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>Histórico de Antecipações</CardTitle>
            <CardDescription>Acompanhe suas solicitações e liquidações.</CardDescription>
          </div>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><FastForward className="size-4 mr-2" /> Simular Antecipação</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Simular Antecipação</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSimulate} className="space-y-4">
                <div className="grid gap-2">
                  <Label>Selecione o Contrato</Label>
                  <Select value={selectedContractId} onValueChange={setSelectedContractId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha um contrato ativo" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeContracts.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.properties?.internal_id || `${c.properties?.address}, ${c.properties?.number}`} - {c.tenants?.name}
                        </SelectItem>
                      ))}
                      {activeContracts.length === 0 && (
                        <SelectItem value="none" disabled>Nenhum contrato ativo encontrado</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <Label>Quantidade de Meses a Antecipar</Label>
                  <Select value={monthsToAdvance} onValueChange={setMonthsToAdvance}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Mês (Próximo Vencimento)</SelectItem>
                      <SelectItem value="2">2 Meses</SelectItem>
                      <SelectItem value="3">3 Meses</SelectItem>
                      <SelectItem value="6">6 Meses</SelectItem>
                      <SelectItem value="12">12 Meses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedContract && (
                  <div className="bg-muted p-4 rounded-md space-y-2 mt-4">
                    <div className="flex justify-between text-sm">
                      <span>Valor Bruto (Aluguel x {monthsToAdvance})</span>
                      <span className="font-medium">{BRL(totalGross)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-destructive">
                      <span>Desconto (Taxa Antecipação)</span>
                      <span>- {BRL(feeAmount)}</span>
                    </div>
                    <div className="border-t pt-2 mt-2 flex justify-between font-bold text-primary">
                      <span>Valor Líquido a Receber</span>
                      <span>{BRL(netAmount)}</span>
                    </div>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={!selectedContract}>
                  Confirmar Solicitação
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Data Solicitação</th>
                  <th className="px-4 py-3 font-medium">Contrato</th>
                  <th className="px-4 py-3 font-medium">Meses</th>
                  <th className="px-4 py-3 font-medium">Valor Líquido</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhuma antecipação realizada.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
