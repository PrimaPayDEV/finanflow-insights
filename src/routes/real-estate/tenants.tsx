import { createFileRoute } from '@tanstack/react-router';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantsQuery, type RealEstateTenant } from '@/lib/real-estate';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatCpfCnpj, formatPhone } from '@/lib/format';
import { useAuth } from '@/contexts/AuthContext';

export const Route = createFileRoute('/real-estate/tenants')({
  component: TenantsPage,
});

function TenantsPage() {
  const { data: tenants = [], isLoading } = useQuery(tenantsQuery);
  const [editing, setEditing] = useState<RealEstateTenant | null>(null);
  const qc = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('real_estate_tenants').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Inquilino excluído com sucesso');
      qc.invalidateQueries({ queryKey: ['real_estate_tenants'] });
    },
    onError: () => toast.error('Erro ao excluir inquilino. Ele pode estar vinculado a um contrato.')
  });

  return (
    <AppLayout title="Inquilinos">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Meus Inquilinos</CardTitle>
          <TenantDialog tenant={editing} onClose={() => setEditing(null)} />
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center">Carregando...</TableCell></TableRow>
                ) : tenants.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum inquilino cadastrado.</TableCell></TableRow>
                ) : tenants.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>{t.document}</TableCell>
                    <TableCell>
                      <div className="text-xs">{t.email}</div>
                      <div className="text-xs text-muted-foreground">{t.phone}</div>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded-full ${t.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {t.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(t)}><Pencil className="size-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => {
                        if (confirm('Tem certeza que deseja excluir este inquilino?')) {
                          deleteMutation.mutate(t.id);
                        }
                      }}>
                        <Trash2 className="size-4" />
                      </Button>
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

function TenantDialog({ tenant, onClose }: { tenant: RealEstateTenant | null, onClose: () => void }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const { companyId } = useAuth();

  const isEditing = !!tenant;
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
      const data = {
        company_id: companyId!,
        name: fd.get('name') as string,
        document: fd.get('document') as string,
        email: fd.get('email') as string,
        phone: fd.get('phone') as string,
        status: fd.get('status') as any,
      };

      if (isEditing) {
        const { error } = await supabase.from('real_estate_tenants').update(data).eq('id', tenant.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from('real_estate_tenants').insert([data]);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      toast.success(isEditing ? "Atualizado com sucesso" : "Cadastrado com sucesso");
      qc.invalidateQueries({ queryKey: ['real_estate_tenants'] });
      handleClose(false);
    },
    onError: (e: Error) => toast.error("Erro: " + e.message)
  });

  return (
    <Dialog open={show} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="size-4 mr-2"/> Cadastrar</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Inquilino" : "Novo Inquilino"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={e => { e.preventDefault(); save.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
          <div className="grid gap-2">
            <Label>Nome / Razão Social</Label>
            <Input name="name" defaultValue={tenant?.name} required />
          </div>
          <div className="grid gap-2">
            <Label>CPF / CNPJ</Label>
            <Input name="document" defaultValue={tenant?.document} required onChange={e => { e.target.value = formatCpfCnpj(e.target.value); }} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>E-mail</Label>
              <Input name="email" type="email" defaultValue={tenant?.email} />
            </div>
            <div className="grid gap-2">
              <Label>Telefone</Label>
              <Input name="phone" defaultValue={tenant?.phone} onChange={e => { e.target.value = formatPhone(e.target.value); }} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Status</Label>
            <Select name="status" defaultValue={tenant?.status || 'ACTIVE'}>
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Ativo</SelectItem>
                <SelectItem value="INACTIVE">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={save.isPending}>
            {save.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
