import { createFileRoute } from '@tanstack/react-router';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { propertiesQuery, ownersQuery, type RealEstateProperty } from '@/lib/real-estate';
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

export const Route = createFileRoute('/real-estate/properties')({
  component: PropertiesPage,
});

function PropertiesPage() {
  const { data: properties = [], isLoading } = useQuery(propertiesQuery);
  const [editing, setEditing] = useState<RealEstateProperty | null>(null);

  return (
    <AppLayout title="Imóveis">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Meus Imóveis</CardTitle>
          <PropertyDialog property={editing} onClose={() => setEditing(null)} />
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Endereço</TableHead>
                  <TableHead>Proprietário</TableHead>
                  <TableHead>Identificação</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center">Carregando...</TableCell></TableRow>
                ) : properties.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum imóvel cadastrado.</TableCell></TableRow>
                ) : properties.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.address}, {p.number} {p.complement ? ` - ${p.complement}` : ''}
                      <div className="text-xs text-muted-foreground">{p.neighborhood}, {p.city} - {p.state}</div>
                    </TableCell>
                    <TableCell>
                      {p.owners ? (
                        <>
                          <div className="text-sm">{p.owners.name}</div>
                          <div className="text-xs text-muted-foreground">{p.owners.document}</div>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">Não vinculado</span>
                      )}
                    </TableCell>
                    <TableCell>{p.internal_id || '-'}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        p.status === 'AVAILABLE' ? 'bg-blue-100 text-blue-700' :
                        p.status === 'RENTED' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {p.status === 'AVAILABLE' ? 'Disponível' : p.status === 'RENTED' ? 'Alugado' : 'Inativo'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(p)}><Pencil className="size-4" /></Button>
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

function PropertyDialog({ property, onClose }: { property: RealEstateProperty | null, onClose: () => void }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const { companyId } = useAuth();
  const { data: owners = [] } = useQuery(ownersQuery);

  const isEditing = !!property;
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
        company_id: companyId,
        address: fd.get('address') as string,
        number: fd.get('number') as string,
        complement: fd.get('complement') as string,
        neighborhood: fd.get('neighborhood') as string,
        city: fd.get('city') as string,
        state: fd.get('state') as string,
        zip_code: fd.get('zip_code') as string,
        internal_id: fd.get('internal_id') as string,
        owner_id: fd.get('owner_id') as string || null,
        status: fd.get('status') as any,
      };

      if (isEditing) {
        const { error } = await supabase.from('real_estate_properties').update(data).eq('id', property.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from('real_estate_properties').insert([data]);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      toast.success(isEditing ? "Imóvel atualizado" : "Imóvel cadastrado");
      qc.invalidateQueries({ queryKey: ['real_estate_properties'] });
      handleClose(false);
    },
    onError: (e: Error) => toast.error("Erro: " + e.message)
  });

  return (
    <Dialog open={show} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="size-4 mr-2"/> Cadastrar</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Imóvel" : "Novo Imóvel"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={e => { e.preventDefault(); save.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
          
          <div className="grid grid-cols-2 gap-4">
             <div className="grid gap-2">
                <Label>Identificação Interna (Opcional)</Label>
                <Input name="internal_id" defaultValue={property?.internal_id} placeholder="Ex: AP-101" />
             </div>
             <div className="grid gap-2">
                <Label>Status</Label>
                <Select name="status" defaultValue={property?.status || 'AVAILABLE'}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AVAILABLE">Disponível</SelectItem>
                    <SelectItem value="RENTED">Alugado</SelectItem>
                    <SelectItem value="INACTIVE">Inativo</SelectItem>
                  </SelectContent>
                </Select>
             </div>
          </div>

          <div className="grid gap-2">
            <Label>Proprietário</Label>
            <Select name="owner_id" defaultValue={property?.owner_id || ''}>
              <SelectTrigger><SelectValue placeholder="Selecione um proprietário" /></SelectTrigger>
              <SelectContent>
                {owners.map(o => (
                  <SelectItem key={o.id} value={o.id}>{o.name} ({o.document})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 gap-4 border-t pt-4">
             <div className="col-span-4 grid gap-2">
               <Label>Endereço</Label>
               <Input name="address" defaultValue={property?.address} required />
             </div>
             <div className="col-span-1 grid gap-2">
               <Label>Número</Label>
               <Input name="number" defaultValue={property?.number} required />
             </div>
             <div className="col-span-3 grid gap-2">
               <Label>Complemento</Label>
               <Input name="complement" defaultValue={property?.complement} />
             </div>
             <div className="col-span-2 grid gap-2">
               <Label>Bairro</Label>
               <Input name="neighborhood" defaultValue={property?.neighborhood} required />
             </div>
             <div className="col-span-2 grid gap-2">
               <Label>CEP</Label>
               <Input name="zip_code" defaultValue={property?.zip_code} required />
             </div>
             <div className="col-span-3 grid gap-2">
               <Label>Cidade</Label>
               <Input name="city" defaultValue={property?.city} required />
             </div>
             <div className="col-span-1 grid gap-2">
               <Label>UF</Label>
               <Input name="state" defaultValue={property?.state} required maxLength={2} />
             </div>
          </div>

          <Button type="submit" className="w-full mt-4" disabled={save.isPending}>
            {save.isPending ? "Salvando..." : "Salvar Imóvel"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
