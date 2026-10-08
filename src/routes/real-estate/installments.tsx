import { createFileRoute } from '@tanstack/react-router';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Link as LinkIcon, Copy, Smartphone, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BRL } from '@/lib/format';
import { useQuery } from '@tanstack/react-query';
import { chargesQuery } from '@/lib/real-estate';
import { toast } from 'sonner';

export const Route = createFileRoute('/real-estate/installments')({
  component: InstallmentsPage,
});

function InstallmentsPage() {
  const [open, setOpen] = useState(false);
  const { data: charges = [], isLoading } = useQuery(chargesQuery);
  
  // Apenas cobranças não pagas podem ser parceladas
  const eligibleCharges = charges.filter(c => c.status === 'PENDING' || c.status === 'OVERDUE');

  const [selectedChargeId, setSelectedChargeId] = useState<string>('');
  const [installmentsCount, setInstallmentsCount] = useState('12');

  const selectedCharge = eligibleCharges.find(c => c.id === selectedChargeId);

  const handleGenerateLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChargeId) {
      toast.error('Selecione uma cobrança.');
      return;
    }
    toast.success('Link de pagamento gerado com sucesso!');
    setOpen(false);
    setSelectedChargeId('');
  };

  const copyLink = () => {
    toast.success('Link copiado para a área de transferência!');
  };

  return (
    <AppLayout title="Parcelamento de Aluguel" subtitle="Ofereça flexibilidade no cartão de crédito para seus inquilinos.">
      
      {/* Banner / Hero */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 md:p-8 mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-4 max-w-2xl">
          <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            Reduza a Inadimplência
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Aluguel em até 12x no Cartão
          </h2>
          <p className="text-muted-foreground text-sm md:text-base">
            Envie links de pagamento para o inquilino parcelar o aluguel atrasado ou vigente.
            Ele paga parcelado, e a imobiliária e o proprietário recebem à vista.
          </p>
          <div className="flex flex-wrap gap-3 mt-4">
            <span className="inline-flex items-center text-sm font-medium text-muted-foreground">
              <CheckCircle2 className="mr-1.5 h-4 w-4 text-green-500" /> Sem risco de fraude
            </span>
            <span className="inline-flex items-center text-sm font-medium text-muted-foreground">
              <CheckCircle2 className="mr-1.5 h-4 w-4 text-green-500" /> Repasse garantido
            </span>
            <span className="inline-flex items-center text-sm font-medium text-muted-foreground">
              <CheckCircle2 className="mr-1.5 h-4 w-4 text-green-500" /> Taxas por conta do inquilino
            </span>
          </div>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="shrink-0 bg-primary hover:bg-primary/90">
              <LinkIcon className="mr-2 h-4 w-4" /> Gerar Link de Pagamento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Gerar Link de Parcelamento</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleGenerateLink} className="space-y-4">
              <div className="grid gap-2">
                <Label>Selecione a Cobrança</Label>
                <Select value={selectedChargeId} onValueChange={setSelectedChargeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um boleto pendente ou atrasado" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleCharges.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.tenants?.name} - {BRL(c.gross_amount)} (Venc: {new Date(c.due_date).toLocaleDateString('pt-BR')})
                      </SelectItem>
                    ))}
                    {eligibleCharges.length === 0 && (
                      <SelectItem value="none" disabled>Nenhuma cobrança pendente encontrada</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label>Máximo de Parcelas Permitidas</Label>
                <Select value={installmentsCount} onValueChange={setInstallmentsCount}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">Até 3x</SelectItem>
                    <SelectItem value="6">Até 6x</SelectItem>
                    <SelectItem value="12">Até 12x</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedCharge && (
                <div className="bg-muted p-4 rounded-md space-y-2 mt-4 text-sm text-muted-foreground">
                  O inquilino receberá um link da PrimaPay onde poderá digitar o cartão e escolher o parcelamento. 
                  Os juros do cartão serão acrescidos na parcela dele. A imobiliária e o proprietário não sofrem descontos.
                </div>
              )}

              <Button type="submit" className="w-full" disabled={!selectedCharge}>
                Gerar Link
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader>
            <Smartphone className="h-8 w-8 text-primary mb-2" />
            <CardTitle className="text-base">Praticidade</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Envie o link via WhatsApp ou E-mail. O inquilino paga pelo celular em menos de 1 minuto.
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CreditCard className="h-8 w-8 text-primary mb-2" />
            <CardTitle className="text-base">Flexibilidade</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Aceitamos as principais bandeiras. O inquilino não compromete todo o limite em um pagamento à vista.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <ShieldCheck className="h-8 w-8 text-primary mb-2" />
            <CardTitle className="text-base">Garantia PrimaPay</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Análise anti-fraude robusta inclusa. Se o cartão for aprovado, o valor da imobiliária é 100% garantido.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Histórico */}
      <Card>
        <CardHeader>
          <CardTitle>Links Gerados Recentes</CardTitle>
          <CardDescription>Acompanhe se o inquilino já realizou o pagamento via cartão.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Inquilino</th>
                  <th className="px-4 py-3 font-medium">Imóvel</th>
                  <th className="px-4 py-3 font-medium">Valor Original</th>
                  <th className="px-4 py-3 font-medium">Data do Link</th>
                  <th className="px-4 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhum link de parcelamento ativo.
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
