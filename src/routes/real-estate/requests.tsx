import { createFileRoute } from '@tanstack/react-router';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Plus, AlertCircle, CheckCircle2, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export const Route = createFileRoute('/real-estate/requests')({
  component: RequestsPage,
});

function RequestsPage() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('MAINTENANCE');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }
    toast.success('Solicitação registrada com sucesso!');
    setOpen(false);
    setTitle('');
    setDescription('');
  };

  return (
    <AppLayout title="Solicitações e Atendimentos" subtitle="Gerencie chamados de manutenção, negociações e dúvidas de inquilinos e proprietários.">
      
      {/* KPIs */}
      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <Card className="border-l-4 border-l-destructive">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abertas</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">
              Aguardando primeira resposta
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">
              Chamados em tratativa
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concluídas (Mês)</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">
              Resolvidas nos últimos 30 dias
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>Painel de Solicitações</CardTitle>
            <CardDescription>Acompanhe todos os tickets registrados na imobiliária.</CardDescription>
          </div>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="size-4 mr-2" /> Novo Chamado</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Solicitação</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-2">
                  <Label>Tipo de Solicitação</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MAINTENANCE">Manutenção no Imóvel</SelectItem>
                      <SelectItem value="NEGOTIATION">Negociação de Atraso</SelectItem>
                      <SelectItem value="TERMINATION">Rescisão de Contrato</SelectItem>
                      <SelectItem value="DOUBT">Dúvidas / Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <Label>Título / Assunto</Label>
                  <Input 
                    placeholder="Ex: Vazamento no banheiro" 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Descrição Detalhada</Label>
                  <Textarea 
                    placeholder="Descreva o problema ou solicitação relatada..." 
                    rows={4}
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                  />
                </div>

                <Button type="submit" className="w-full">
                  Salvar Chamado
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
                  <th className="px-4 py-3 font-medium">Protocolo</th>
                  <th className="px-4 py-3 font-medium">Assunto</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Data Abertura</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {/* Aqui seria um map dos dados reais. Como não há tabela no BD ainda, exibimos empty state ou mock */}
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground flex-col items-center justify-center">
                    <div className="flex justify-center mb-3">
                      <MessageSquare className="h-8 w-8 opacity-20" />
                    </div>
                    Nenhuma solicitação aberta no momento.
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
