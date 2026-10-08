import { createFileRoute } from '@tanstack/react-router';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ownersQuery, type RealEstateOwner } from '@/lib/real-estate';
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

export const Route = createFileRoute('/real-estate/owners')({
  component: OwnersPage,
});

function OwnersPage() {
  const { data: owners = [], isLoading } = useQuery(ownersQuery);
  const [editing, setEditing] = useState<RealEstateOwner | null>(null);
  const qc = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('real_estate_owners').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Proprietário excluído com sucesso');
      qc.invalidateQueries({ queryKey: ['real_estate_owners'] });
    },
    onError: () => toast.error('Erro ao excluir proprietário. Ele pode estar vinculado a um contrato ou imóvel.')
  });

  return (
    <AppLayout title="Proprietários">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Meus Proprietários</CardTitle>
          <OwnerDialog owner={editing} onClose={() => setEditing(null)} />
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
                ) : owners.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum proprietário cadastrado.</TableCell></TableRow>
                ) : owners.map(o => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.name}</TableCell>
                    <TableCell>{o.document}</TableCell>
                    <TableCell>
                      <div className="text-xs">{o.email}</div>
                      <div className="text-xs text-muted-foreground">{o.phone}</div>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded-full ${o.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {o.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(o)}><Pencil className="size-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => {
                        if (confirm('Tem certeza que deseja excluir este proprietário?')) {
                          deleteMutation.mutate(o.id);
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

function OwnerDialog({ owner, onClose }: { owner: RealEstateOwner | null, onClose: () => void }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const { companyId } = useAuth();

  const isEditing = !!owner;
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
        const { error } = await supabase.from('real_estate_owners').update(data).eq('id', owner.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from('real_estate_owners').insert([data]);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      toast.success(isEditing ? "Atualizado com sucesso" : "Cadastrado com sucesso");
      qc.invalidateQueries({ queryKey: ['real_estate_owners'] });
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
          <DialogTitle>{isEditing ? "Editar Proprietário" : "Novo Proprietário"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={e => { e.preventDefault(); save.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
          <div className="grid gap-2">
            <Label>Nome / Razão Social</Label>
            <Input name="name" defaultValue={owner?.name} required />
          </div>
          <div className="grid gap-2">
            <Label>CPF / CNPJ</Label>
            <Input name="document" defaultValue={owner?.document} required onChange={e => { e.target.value = formatCpfCnpj(e.target.value); }} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>E-mail</Label>
              <Input name="email" type="email" defaultValue={owner?.email} />
            </div>
            <div className="grid gap-2">
              <Label>Telefone</Label>
              <Input name="phone" defaultValue={owner?.phone} onChange={e => { e.target.value = formatPhone(e.target.value); }} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select name="status" defaultValue={owner?.status || 'ACTIVE'}>
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
