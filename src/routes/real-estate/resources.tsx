import { createFileRoute } from '@tanstack/react-router';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PiggyBank, Landmark, ShieldCheck, BadgeDollarSign, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { BRL } from '@/lib/format';
import { toast } from 'sonner';

export const Route = createFileRoute('/real-estate/resources')({
  component: ResourcesPage,
});

function ResourcesPage() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('50000');
  const [installments, setInstallments] = useState('12');

  const parsedAmount = Number(amount) || 0;
  const parsedInstallments = Number(installments) || 1;
  const rate = 0.0199; // 1.99% a.m.
  const monthlyInstallment = (parsedAmount * Math.pow((1 + rate), parsedInstallments)) / parsedInstallments;

  const handleSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedAmount < 5000) {
      toast.error('O valor mínimo para solicitação é de R$ 5.000,00');
      return;
    }
    toast.success('Solicitação enviada! Nossa equipe analisará seu perfil em até 24 horas.');
    setOpen(false);
  };

  return (
    <AppLayout title="Recursos para Imobiliária" subtitle="Soluções de crédito e capital de giro exclusivas para o seu negócio.">
      
      {/* Banner / Hero */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 md:p-8 mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-4 max-w-2xl">
          <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            Crédito Pré-Aprovado
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Expanda sua operação com nosso Capital de Giro
          </h2>
          <p className="text-muted-foreground text-sm md:text-base">
            Use seus recebíveis futuros como garantia e obtenha taxas a partir de 1,99% a.m. 
            Crédito rápido, sem burocracia, direto na sua conta bancária.
          </p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="shrink-0">
              Solicitar Crédito <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Simular Empréstimo</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSimulate} className="space-y-4">
              <div className="grid gap-2">
                <Label>Qual valor você precisa?</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground">R$</span>
                  <Input 
                    type="number" 
                    className="pl-9"
                    value={amount} 
                    onChange={e => setAmount(e.target.value)}
                    min={5000}
                    step={1000}
                  />
                </div>
                <span className="text-xs text-muted-foreground">Mínimo de R$ 5.000,00</span>
              </div>
              
              <div className="grid gap-2">
                <Label>Em quantas vezes deseja pagar?</Label>
                <Select value={installments} onValueChange={setInstallments}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6">6 parcelas</SelectItem>
                    <SelectItem value="12">12 parcelas</SelectItem>
                    <SelectItem value="24">24 parcelas</SelectItem>
                    <SelectItem value="36">36 parcelas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-muted p-4 rounded-md space-y-3 mt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taxa de Juros</span>
                  <span className="font-medium">1,99% a.m.</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Valor Solicitado</span>
                  <span className="font-medium">{BRL(parsedAmount)}</span>
                </div>
                <div className="border-t border-border pt-3 mt-1 flex justify-between font-bold">
                  <span>Valor da Parcela</span>
                  <span className="text-primary">{installments}x de {BRL(monthlyInstallment)}</span>
                </div>
              </div>

              <Button type="submit" className="w-full">
                Enviar para Análise
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Linhas de Crédito */}
      <h3 className="text-lg font-semibold mb-4">Linhas Disponíveis</h3>
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader>
            <Landmark className="h-8 w-8 text-primary mb-2" />
            <CardTitle className="text-base">Capital de Giro</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Dinheiro livre para investir em marketing, contratar corretores ou modernizar sua infraestrutura.
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <BadgeDollarSign className="h-8 w-8 text-primary mb-2" />
            <CardTitle className="text-base">Garantia de Aluguel</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Fundo garantidor para que você possa pagar os proprietários em dia mesmo se o inquilino atrasar.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <ShieldCheck className="h-8 w-8 text-primary mb-2" />
            <CardTitle className="text-base">Financiamento de Reformas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Crédito específico para reparos em imóveis desocupados, valorizando a locação rápida.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Histórico */}
      <Card>
        <CardHeader>
          <CardTitle>Meus Empréstimos</CardTitle>
          <CardDescription>Acompanhe seus contratos de crédito ativos.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Contrato</th>
                  <th className="px-4 py-3 font-medium">Linha</th>
                  <th className="px-4 py-3 font-medium">Valor Total</th>
                  <th className="px-4 py-3 font-medium">Parcelas</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Você ainda não possui nenhum empréstimo ativo.
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
