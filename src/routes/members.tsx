import { createFileRoute } from '@tanstack/react-router';
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { getMembers, upsertMember, addVehicle, deleteMember } from "@/lib/members.functions";
import { getPartners } from "@/lib/partner.functions";
import { translateError } from "@/lib/translateError";
import { formatCpfCnpj, formatPhone } from "@/lib/format";

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
  
  // Associado state
  const [name, setName] = useState(member?.name || "");
  const [document, setDocument] = useState(member?.document || "");
  const [email, setEmail] = useState(member?.email || "");
  const [phone, setPhone] = useState(member?.phone || "");
  const [partnerId, setPartnerId] = useState(member?.partner_id || "");

  // Veículo state
  const firstVehicle = member?.vehicles?.[0];
  const [vehicleId, setVehicleId] = useState(firstVehicle?.id || "");
  const [plate, setPlate] = useState(firstVehicle?.plate || "");
  const [brandName, setBrandName] = useState(firstVehicle?.brand || "");
  const [modelName, setModelName] = useState(firstVehicle?.model || "");
  const [year, setYear] = useState(firstVehicle?.year?.toString() || "");
  const [brandCode, setBrandCode] = useState("");

  const fetchPartners = useServerFn(getPartners);
  const { data: partners } = useQuery({
    queryKey: ["partners", companyId],
    queryFn: () => fetchPartners({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });

  // FIPE API integration
  const { data: fipeBrands } = useQuery({
    queryKey: ["fipe-brands"],
    queryFn: async () => {
      const res = await fetch("https://parallelum.com.br/fipe/api/v1/carros/marcas");
      return (await res.json()) as Array<{ codigo: string; nome: string }>;
    },
    staleTime: Infinity,
  });

  useEffect(() => {
    if (fipeBrands && brandName && !brandCode) {
      const b = fipeBrands.find((x) => x.nome === brandName);
      if (b) setBrandCode(b.codigo);
    }
  }, [fipeBrands, brandName, brandCode]);

  const { data: fipeModels } = useQuery({
    queryKey: ["fipe-models", brandCode],
    queryFn: async () => {
      const res = await fetch(`https://parallelum.com.br/fipe/api/v1/carros/marcas/${brandCode}/modelos`);
      const data = await res.json();
      return data.modelos as Array<{ codigo: string; nome: string }>;
    },
    enabled: !!brandCode,
    staleTime: Infinity,
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Empresa não identificada");
      const res = await upsertMember({
        data: { 
          id: member?.id, 
          companyId, 
          name, 
          document, 
          email, 
          phone, 
          partner_id: (partnerId && partnerId !== "none") ? partnerId : undefined,
          vehicle: {
            id: vehicleId || undefined,
            plate,
            brand: brandName,
            model: modelName,
            year: year ? parseInt(year) : undefined
          }
        },
      });
      if (!res.ok) throw new Error("Erro ao salvar associado.");
    },
    onSuccess: () => {
      toast.success(member ? "Associado atualizado!" : "Associado cadastrado com sucesso e sincronizado com Asaas!");
      setOpen(false);
      if (!member) {
        setName(""); setDocument(""); setEmail(""); setPhone(""); setPartnerId("");
        setVehicleId(""); setPlate(""); setBrandName(""); setModelName(""); setYear(""); setBrandCode("");
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{member ? "Editar Associado" : "Cadastrar Associado e Veículo"}</DialogTitle>
          <DialogDescription>O associado será automaticamente criado no Asaas para emissão de faturas.</DialogDescription>
        </DialogHeader>
        
        <div className="grid md:grid-cols-2 gap-8 py-4">
          {/* Lado Esquerdo: Associado */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Informações do Associado</h3>
            
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="João da Silva" />
            </div>
            <div className="space-y-2">
              <Label>CPF / CNPJ</Label>
              <Input value={document} onChange={(e) => setDocument(formatCpfCnpj(e.target.value))} placeholder="000.000.000-00" maxLength={18} />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="joao@email.com" />
            </div>
            <div className="space-y-2">
              <Label>Celular</Label>
              <Input value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="(00) 00000-0000" maxLength={15} />
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

          {/* Lado Direito: Veículo Principal */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Informações do Veículo</h3>
            
            <div className="space-y-2">
              <Label>Placa</Label>
              <Input value={plate} onChange={(e) => setPlate(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())} placeholder="ABC1234" maxLength={7} />
            </div>
            <div className="space-y-2">
              <Label>Marca</Label>
              <Select 
                value={brandCode} 
                onValueChange={(val) => {
                  setBrandCode(val);
                  const b = fipeBrands?.find(x => x.codigo === val);
                  setBrandName(b?.nome || "");
                  setModelName(""); // reseta modelo ao trocar marca
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a marca" />
                </SelectTrigger>
                <SelectContent>
                  {fipeBrands?.map((b) => (
                    <SelectItem key={b.codigo} value={b.codigo}>{b.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Modelo</Label>
              <Select 
                value={modelName} 
                onValueChange={setModelName} 
                disabled={!brandCode || !fipeModels}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!brandCode ? "Selecione a marca primeiro" : "Selecione o modelo"} />
                </SelectTrigger>
                <SelectContent>
                  {fipeModels?.map((m) => (
                    <SelectItem key={m.codigo} value={m.nome}>{m.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ano de Fabricação</Label>
              <Input value={year} onChange={(e) => setYear(e.target.value)} placeholder="2020" type="number" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t pt-4">
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
            <Input value={plate} onChange={(e) => setPlate(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())} placeholder="ABC1234" maxLength={7} />
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
      const res = await deleteMember({ data: { id: memberId, companyId } });
      if (!res.ok) throw new Error("Erro ao excluir");
    },
    onSuccess: () => {
      toast.success("Associado excluído.");
      qc.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (e) => toast.error(translateError(e.message)),
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
          <Trash2 className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Associado</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir este associado? Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={() => remove.mutate()} 
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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
        <div className="flex flex-col items-center justify-center p-12 text-center space-y-4 rounded-2xl border border-dashed border-border/80 bg-card">
          <div className="size-12 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground">
            <User className="size-6" />
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">Nenhum associado cadastrado</p>
            <p className="text-sm text-muted-foreground max-w-sm mt-1">
              Comece cadastrando seu primeiro cliente para gerar faturas e proteger veículos.
            </p>
          </div>
          <MemberDialog />
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {members?.map((m: any) => (
            <Card key={m.id} className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden hover:border-primary/40 transition-all flex flex-col justify-between">
              <div>
                <CardHeader className="p-5 pb-3 border-b border-border/60">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <User className="size-4" />
                      </div>
                      <div className="truncate">
                        <CardTitle className="text-base font-semibold truncate">{m.name}</CardTitle>
                        <CardDescription className="text-xs">Doc: {m.document}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant={m.status === 'active' ? 'default' : 'secondary'} className="rounded-full text-xs font-semibold px-2.5">
                        {m.status === 'active' ? 'Ativo' : m.status}
                      </Badge>
                      <MemberDialog member={m} />
                      <DeleteMemberButton memberId={m.id} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div className="text-sm space-y-1.5 text-muted-foreground bg-muted/20 p-3 rounded-xl border border-border/40">
                    {m.phone && <p className="flex items-center gap-2">📞 <span className="font-mono text-xs text-foreground">{m.phone}</span></p>}
                    {m.email && <p className="flex items-center gap-2 truncate">✉️ <span className="text-foreground truncate">{m.email}</span></p>}
                  </div>

                  <div className="space-y-2.5 pt-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Veículos ({m.vehicles?.length || 0})</p>
                    </div>
                    {m.vehicles?.map((v: any) => (
                      <div key={v.id} className="flex justify-between items-center bg-muted/40 p-2.5 rounded-xl border border-border/40 text-sm">
                        <div>
                          <p className="font-mono font-bold text-xs text-foreground tracking-wide">{v.plate}</p>
                          <p className="text-xs text-muted-foreground">{v.brand} {v.model}</p>
                        </div>
                        <ShieldCheck className="size-4 text-emerald-600" />
                      </div>
                    ))}
                    <div className="pt-1">
                      <VehicleDialog memberId={m.id} memberName={m.name} />
                    </div>
                  </div>
                </CardContent>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
