import { createFileRoute } from '@tanstack/react-router';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contractsQuery, propertiesQuery, ownersQuery, tenantsQuery, type RealEstateContract } from '@/lib/real-estate';
import { Button } from '@/components/ui/button';
import { Plus, Pencil } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrencyInput } from '@/lib/format';
import { BRL } from '@/lib/format';

export const Route = createFileRoute('/real-estate/contracts')({
  component: ContractsPage,
});

function ContractsPage() {
  const { data: contracts = [], isLoading } = useQuery(contractsQuery);
  const [editing, setEditing] = useState<RealEstateContract | null>(null);

  return (
    <AppLayout title="Contratos de Locação">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Meus Contratos</CardTitle>
          <ContractDialog contract={editing} onClose={() => setEditing(null)} />
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Imóvel</TableHead>
                  <TableHead>Partes</TableHead>
                  <TableHead>Valor / Adm</TableHead>
                  <TableHead>Vigência / Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center">Carregando...</TableCell></TableRow>
                ) : contracts.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhum contrato cadastrado.</TableCell></TableRow>
                ) : contracts.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      {c.properties?.address}, {c.properties?.number}
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">Locador: {c.owners?.name}</div>
                      <div className="text-xs">Locatário: {c.tenants?.name}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold">{BRL(c.rent_amount)}</div>
                      <div className="text-xs text-muted-foreground">
                        Adm: {c.admin_fee_type === 'PERCENTAGE' ? `${c.admin_fee_value}%` : BRL(c.admin_fee_value)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">{c.start_date.split('-').reverse().join('/')} até {c.end_date.split('-').reverse().join('/')}</div>
                      <div className="text-xs text-muted-foreground">Dia {c.due_day}</div>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        c.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                        c.status === 'DRAFT' ? 'bg-gray-100 text-gray-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {c.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(c)}><Pencil className="size-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}

function ContractDialog({ contract, onClose }: { contract: RealEstateContract | null, onClose: () => void }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const { companyId } = useAuth();
  
  const { data: properties = [] } = useQuery(propertiesQuery);
  const { data: owners = [] } = useQuery(ownersQuery);
  const { data: tenants = [] } = useQuery(tenantsQuery);

  const isEditing = !!contract;
  const show = isEditing || open;

  const handleClose = (v: boolean) => {
    if (!v) {
      setOpen(false);
      onClose();
    } else {
      setOpen(true);
    }
  };

  const save = useMutation({
    mutationFn: async (fd: FormData) => {
      const property_id = fd.get('property_id') as string;
      const owner_id = fd.get('owner_id') as string;
      const tenant_id = fd.get('tenant_id') as string;

      if (!property_id) throw new Error("Selecione um imóvel.");
      if (!owner_id) throw new Error("Selecione o proprietário.");
      if (!tenant_id) throw new Error("Selecione o inquilino.");

      const data = {
        company_id: companyId!,
        property_id,
        owner_id,
        tenant_id,
        rent_amount: Number(String(fd.get('rent_amount')).replace(/[^0-9,-]/g, "").replace(",", ".")),
        due_day: Number(fd.get('due_day')),
        start_date: fd.get('start_date') as string,
        end_date: fd.get('end_date') as string,
        admin_fee_type: fd.get('admin_fee_type') as string,
        admin_fee_value: Number(String(fd.get('admin_fee_value')).replace(/[^0-9,-]/g, "").replace(",", ".")),
        status: fd.get('status') as string,
      };

      if (isEditing) {
        const { error } = await supabase.from('real_estate_contracts').update(data).eq('id', contract.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from('real_estate_contracts').insert([data]);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      toast.success(isEditing ? "Contrato atualizado" : "Contrato criado");
      qc.invalidateQueries({ queryKey: ['real_estate_contracts'] });
      handleClose(false);
    },
    onError: (e: Error) => toast.error("Erro: " + e.message)
  });

  return (
    <Dialog open={show} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="size-4 mr-2"/> Novo Contrato</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Contrato" : "Novo Contrato de Locação"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={e => { e.preventDefault(); save.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label>Imóvel</Label>
              <Select name="property_id" defaultValue={contract?.property_id}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {properties.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.address}, {p.number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Proprietário (Locador)</Label>
              <Select name="owner_id" defaultValue={contract?.owner_id}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {owners.map(o => (
                    <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Inquilino (Locatário)</Label>
              <Select name="tenant_id" defaultValue={contract?.tenant_id}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {tenants.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t pt-4">
             <div className="grid gap-2">
                <Label>Valor do Aluguel</Label>
                <Input name="rent_amount" defaultValue={contract?.rent_amount} placeholder="R$ 0,00" required onChange={e => { e.target.value = formatCurrencyInput(e.target.value); }} />
             </div>
             <div className="grid gap-2">
                <Label>Dia de Vencimento</Label>
                <Input type="number" name="due_day" min="1" max="31" defaultValue={contract?.due_day || 10} required />
             </div>
             <div className="grid gap-2">
                <Label>Início do Contrato</Label>
                <Input type="date" name="start_date" defaultValue={contract?.start_date} required />
             </div>
             <div className="grid gap-2">
                <Label>Fim do Contrato</Label>
                <Input type="date" name="end_date" defaultValue={contract?.end_date} required />
             </div>
          </div>

          <div className="grid grid-cols-3 gap-4 border-t pt-4">
             <div className="grid gap-2">
                <Label>Tipo de Taxa Adm</Label>
                <Select name="admin_fee_type" defaultValue={contract?.admin_fee_type || 'PERCENTAGE'}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE">Percentual (%)</SelectItem>
                    <SelectItem value="FIXED">Valor Fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
             </div>
             <div className="grid gap-2">
                <Label>Valor da Taxa Adm</Label>
                <Input name="admin_fee_value" defaultValue={contract?.admin_fee_value || 10} placeholder="Ex: 10 ou 100,00" required />
             </div>
             <div className="grid gap-2">
                <Label>Status</Label>
                <Select name="status" defaultValue={contract?.status || 'DRAFT'}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Rascunho</SelectItem>
                    <SelectItem value="ACTIVE">Ativo</SelectItem>
                    <SelectItem value="DEFAULTED">Inadimplente</SelectItem>
                    <SelectItem value="FINISHED">Encerrado</SelectItem>
                    <SelectItem value="CANCELLED">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
             </div>
          </div>

          <Button type="submit" className="w-full mt-4" disabled={save.isPending}>
            {save.isPending ? "Salvando..." : "Salvar Contrato"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
