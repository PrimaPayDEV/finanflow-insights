import { createFileRoute } from '@tanstack/react-router';
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Car, Trash2, ShieldCheck, User, Pencil } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { getMembers, upsertMember, addVehicle, deleteMember } from "@/lib/members.functions";
import { getPartners } from "@/lib/partner.functions";
import { translateError } from "@/lib/translateError";

export const Route = createFileRoute("/members")({
  head: () => ({
    meta: [{ title: "Associados | Gestão de Proteção" }],
  }),
  component: MembersPage,
});

function MemberDialog({ member }: { member?: any }) {
  const qc = useQueryClient();
  const { companyId } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(member?.name || "");
  const [document, setDocument] = useState(member?.document || "");
  const [email, setEmail] = useState(member?.email || "");
  const [phone, setPhone] = useState(member?.phone || "");
  const [partnerId, setPartnerId] = useState(member?.partner_id || "");

  const fetchPartners = useServerFn(getPartners);
  const { data: partners } = useQuery({
    queryKey: ["partners", companyId],
    queryFn: () => fetchPartners({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Empresa não identificada");
      const res = await upsertMember({
        data: { id: member?.id, companyId, name, document, email, phone, partner_id: (partnerId && partnerId !== "none") ? partnerId : undefined },
      });
      if (!res.ok) throw new Error("Erro ao salvar associado.");
    },
    onSuccess: () => {
      toast.success(member ? "Associado atualizado!" : "Associado cadastrado com sucesso e sincronizado com Asaas!");
      setOpen(false);
      if (!member) {
        setName("");
        setDocument("");
        setEmail("");
        setPhone("");
        setPartnerId("");
      }
      qc.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (e) => toast.error(translateError(e.message)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {member ? (
          <Button variant="ghost" size="icon">
            <Pencil className="size-4" />
          </Button>
        ) : (
          <Button className="gap-2">
            <Plus className="size-4" /> Novo Associado
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cadastrar Associado</DialogTitle>
          <DialogDescription>O associado será automaticamente criado no Asaas para emissão de faturas.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Nome Completo</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="João da Silva" />
          </div>
          <div className="space-y-2">
            <Label>CPF / CNPJ</Label>
            <Input value={document} onChange={(e) => setDocument(e.target.value)} placeholder="000.000.000-00" />
          </div>
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="joao@email.com" />
          </div>
          <div className="space-y-2">
            <Label>Celular</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
          </div>
          <div className="space-y-2">
            <Label>Parceiro / Consultor</Label>
            <Select value={partnerId} onValueChange={setPartnerId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um parceiro (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {partners?.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => submit.mutate()} disabled={submit.isPending}>
            {submit.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function VehicleDialog({ memberId, memberName }: { memberId: string; memberName: string }) {
  const qc = useQueryClient();
  const { companyId } = useAuth();
  const [open, setOpen] = useState(false);
  const [plate, setPlate] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");

  const submit = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Empresa não identificada");
      await addVehicle({
        data: { companyId, memberId, plate, brand, model, year: parseInt(year) || undefined },
      });
    },
    onSuccess: () => {
      toast.success("Veículo adicionado!");
      setOpen(false);
      setPlate("");
      setBrand("");
      setModel("");
      setYear("");
      qc.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (e) => toast.error(translateError(e.message)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Car className="size-4" /> Adicionar Veículo
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Veículo - {memberName}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Placa</Label>
            <Input value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} placeholder="ABC1234" maxLength={7} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Marca</Label>
              <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Chevrolet" />
            </div>
            <div className="space-y-2">
              <Label>Modelo</Label>
              <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Onix" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Ano</Label>
            <Input value={year} onChange={(e) => setYear(e.target.value)} placeholder="2020" type="number" />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => submit.mutate()} disabled={submit.isPending}>
            {submit.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeleteMemberButton({ memberId }: { memberId: string }) {
  const qc = useQueryClient();
  const { companyId } = useAuth();
  
  const remove = useMutation({
    mutationFn: async () => {
      if (!companyId) return;
      if (!window.confirm("Tem certeza que deseja excluir este associado? Esta ação não pode ser desfeita.")) return;
      
      const res = await deleteMember({ data: { id: memberId, companyId } });
      if (!res.ok) throw new Error("Erro ao excluir");
    },
    onSuccess: (_, variables, context) => {
      // The mutation doesn't return anything if confirmed is false, so we check if it actually ran
      if (qc) {
        toast.success("Associado excluído.");
        qc.invalidateQueries({ queryKey: ["members"] });
      }
    },
    onError: (e) => toast.error(translateError(e.message)),
  });

  return (
    <Button variant="ghost" size="icon" onClick={() => remove.mutate()} disabled={remove.isPending}>
      <Trash2 className="size-4 text-destructive" />
    </Button>
  );
}

function MembersPage() {
  const { companyId } = useAuth();
  const fetchMembers = useServerFn(getMembers);
  const { data: members, isLoading } = useQuery({
    queryKey: ["members", companyId],
    queryFn: () => fetchMembers({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });

  return (
    <AppLayout 
      title="Gestão de Associados" 
      subtitle="Cadastre seus clientes e veículos protegidos"
      actions={<MemberDialog />}
    >
      {isLoading ? (
        <div className="flex justify-center p-8">Carregando associados...</div>
      ) : members?.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
          <User className="size-12 text-muted-foreground" />
          <p className="text-lg font-medium">Nenhum associado cadastrado.</p>
          <p className="text-muted-foreground max-w-sm">
            Comece cadastrando seu primeiro cliente para gerar faturas.
          </p>
          <MemberDialog />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {members?.map((m: any) => (
            <Card key={m.id} className="relative overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2 truncate">
                    <User className="size-4 text-primary" />
                    <span className="truncate">{m.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={m.status === 'active' ? 'default' : 'secondary'}>
                      {m.status === 'active' ? 'Ativo' : m.status}
                    </Badge>
                    <MemberDialog member={m} />
                    <DeleteMemberButton memberId={m.id} />
                  </div>
                </CardTitle>
                <CardDescription>Doc: {m.document}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm space-y-1">
                  {m.phone && <p>📞 {m.phone}</p>}
                  {m.email && <p className="truncate">✉️ {m.email}</p>}
                </div>

                <div className="space-y-2 border-t pt-4">
                  <p className="font-semibold text-sm">Veículos ({m.vehicles?.length || 0})</p>
                  {m.vehicles?.map((v: any) => (
                    <div key={v.id} className="flex justify-between items-center bg-muted/50 p-2 rounded-md text-sm">
                      <div>
                        <p className="font-bold">{v.plate}</p>
                        <p className="text-xs text-muted-foreground">{v.brand} {v.model}</p>
                      </div>
                      <ShieldCheck className="size-4 text-green-600" />
                    </div>
                  ))}
                  <div className="pt-2">
                    <VehicleDialog memberId={m.id} memberName={m.name} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
