import { createFileRoute } from '@tanstack/react-router';
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Plus, Car, Trash2, ShieldCheck, User, Pencil, Phone, Mail, MessageCircle, Search, Filter, Users } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { AsaasFormSeal } from "@/components/AsaasBaasSeal";
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
import { VehicleCategorySelector, VehicleCategoryBadge } from "@/components/VehicleCategorySelector";

export const Route = createFileRoute("/members")({
  head: () => ({
    meta: [{ title: "Associados | Gestão de Proteção" }],
  }),
  component: MembersPage,
});

function MemberDialog({
  member,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  member?: any;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const { companyId } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (controlledOnOpenChange || (() => {})) : setInternalOpen;
  
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
  const [category, setCategory] = useState<string>(firstVehicle?.category || "Leves e utilitários");
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
    if (member) {
      setName(member.name || "");
      setDocument(member.document || "");
      setEmail(member.email || "");
      setPhone(member.phone || "");
      setPartnerId(member.partner_id || "");
      const fv = member.vehicles?.[0];
      setVehicleId(fv?.id || "");
      setPlate(fv?.plate || "");
      setBrandName(fv?.brand || "");
      setModelName(fv?.model || "");
      setYear(fv?.year?.toString() || "");
      setCategory(fv?.category || "Leves e utilitários");
    } else {
      setName("");
      setDocument("");
      setEmail("");
      setPhone("");
      setPartnerId("");
      setVehicleId("");
      setPlate("");
      setBrandName("");
      setModelName("");
      setYear("");
      setBrandCode("");
      setCategory("Leves e utilitários");
    }
  }, [member, open]);

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
            year: year ? parseInt(year) : undefined,
            category,
          }
        },
      });
      if (!res.ok) throw new Error("Erro ao salvar associado.");
    },
    onSuccess: () => {
      toast.success(member ? "Associado atualizado!" : "Associado cadastrado com sucesso e sincronizado com Asaas!");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (e) => toast.error(translateError(e.message)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] sm:max-h-[86vh] flex flex-col p-0 gap-0 border-border bg-card shadow-2xl rounded-2xl sm:rounded-3xl overflow-hidden">
        <DialogHeader className="p-4 sm:p-5 pb-2.5 border-b border-border/60 shrink-0">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <User className="size-4 text-primary" />
            {member ? "Editar Associado" : "Cadastrar Associado e Veículo"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Dados cadastrais do associado e veículo sincronizados com a cobrança Asaas.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-5">
          <div className="grid md:grid-cols-2 gap-4">
          {/* Lado Esquerdo: Associado */}
          <div className="space-y-2.5">
            <h3 className="font-bold text-xs uppercase tracking-wider text-primary border-b border-border/50 pb-1 flex items-center gap-1.5">
              <User className="size-3.5" /> Informações do Associado
            </h3>
            
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nome Completo *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do associado"
                className="h-8.5 rounded-xl text-xs bg-background"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">CPF / CNPJ *</Label>
                <Input
                  value={document}
                  onChange={(e) => setDocument(formatCpfCnpj(e.target.value))}
                  placeholder="000.000.000-00"
                  maxLength={18}
                  className="h-8.5 rounded-xl text-xs font-mono bg-background"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Celular / WhatsApp</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                  className="h-8.5 rounded-xl text-xs font-mono bg-background"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">E-mail</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  className="h-8.5 rounded-xl text-xs bg-background"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Consultor / Parceiro</Label>
                <Select value={partnerId} onValueChange={setPartnerId}>
                  <SelectTrigger className="h-8.5 rounded-xl text-xs bg-background">
                    <SelectValue placeholder="Nenhum (Direto)" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="none">Nenhum (Direto)</SelectItem>
                    {partners?.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Lado Direito: Veículo Principal */}
          <div className="space-y-2.5">
            <h3 className="font-bold text-xs uppercase tracking-wider text-primary border-b border-border/50 pb-1 flex items-center gap-1.5">
              <Car className="size-3.5" /> Veículo Principal
            </h3>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Placa (Mercosul)</Label>
                <Input
                  value={plate}
                  onChange={(e) => setPlate(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())}
                  placeholder="ABC1234"
                  maxLength={7}
                  className="h-8.5 rounded-xl text-xs font-mono font-bold uppercase bg-background"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Ano de Fabricação</Label>
                <Input
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="2022"
                  type="number"
                  className="h-8.5 rounded-xl text-xs bg-background"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Marca</Label>
                <Select 
                  value={brandCode} 
                  onValueChange={(val) => {
                    setBrandCode(val);
                    const b = fipeBrands?.find(x => x.codigo === val);
                    setBrandName(b?.nome || "");
                    setModelName("");
                  }}
                >
                  <SelectTrigger className="h-8.5 rounded-xl text-xs bg-background">
                    <SelectValue placeholder="Selecione a marca" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl max-h-56">
                    {fipeBrands?.map((b) => (
                      <SelectItem key={b.codigo} value={b.codigo}>{b.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Modelo</Label>
                <Select 
                  value={modelName} 
                  onValueChange={setModelName} 
                  disabled={!brandCode || !fipeModels}
                >
                  <SelectTrigger className="h-8.5 rounded-xl text-xs bg-background">
                    <SelectValue placeholder={!brandCode ? "Selecione a marca" : "Selecione o modelo"} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl max-h-56">
                    {fipeModels?.map((m) => (
                      <SelectItem key={m.codigo} value={m.nome}>{m.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="pt-0.5">
              <VehicleCategorySelector value={category} onChange={setCategory} compact />
            </div>
          </div>
        </div>
      </div>

        <div className="p-3.5 sm:p-4 border-t border-border/60 bg-muted/20 shrink-0 flex flex-col-reverse sm:flex-row items-center sm:justify-between gap-3">
          <AsaasFormSeal />
          <div className="flex justify-end gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)} className="rounded-xl h-8 text-xs font-medium">
              Cancelar
            </Button>
            <Button size="sm" onClick={() => submit.mutate()} disabled={submit.isPending} className="rounded-xl h-8 text-xs font-semibold px-4 bg-primary text-primary-foreground shadow-xs">
              {submit.isPending ? "Salvando..." : "Salvar Dados"}
            </Button>
          </div>
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
  const [category, setCategory] = useState("Leves e utilitários");

  const submit = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Empresa não identificada");
      await addVehicle({
        data: { companyId, memberId, plate, brand, model, year: parseInt(year) || undefined, category },
      });
    },
    onSuccess: () => {
      toast.success("Veículo adicionado!");
      setOpen(false);
      setPlate("");
      setBrand("");
      setModel("");
      setYear("");
      setCategory("Leves e utilitários");
      qc.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (e) => toast.error(translateError(e.message)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-6.5 text-[11px] rounded-lg border-border/80 text-foreground">
          <Car className="size-3 text-primary" /> Adicionar Veículo
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] sm:max-h-[86vh] flex flex-col p-0 gap-0 border-border bg-card shadow-2xl rounded-2xl overflow-hidden">
        <DialogHeader className="p-4 sm:p-5 pb-2.5 border-b border-border/60 shrink-0">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Car className="size-4.5 text-primary" />
            Vincular Veículo - {memberName}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-5 space-y-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Placa (Mercosul) *</Label>
              <Input
                value={plate}
                onChange={(e) => setPlate(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())}
                placeholder="ABC1234"
                maxLength={7}
                className="h-8.5 rounded-xl text-xs font-mono font-bold uppercase bg-background"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Ano de Fabricação</Label>
              <Input
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="2022"
                type="number"
                className="h-8.5 rounded-xl text-xs bg-background"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Marca *</Label>
              <Input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Ex: Chevrolet"
                className="h-8.5 rounded-xl text-xs bg-background"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Modelo *</Label>
              <Input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Ex: Onix 1.0"
                className="h-8.5 rounded-xl text-xs bg-background"
              />
            </div>
          </div>

          <div className="pt-0.5">
            <VehicleCategorySelector value={category} onChange={setCategory} compact />
          </div>
        </div>

        <div className="p-3.5 sm:p-4 border-t border-border/60 bg-muted/20 shrink-0 flex flex-col-reverse sm:flex-row items-center sm:justify-between gap-3">
          <AsaasFormSeal />
          <div className="flex justify-end gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)} className="rounded-xl h-8 text-xs font-medium">
              Cancelar
            </Button>
            <Button size="sm" onClick={() => submit.mutate()} disabled={submit.isPending} className="rounded-xl h-8 text-xs font-semibold px-4 bg-primary text-primary-foreground shadow-xs">
              {submit.isPending ? "Salvando..." : "Salvar Veículo"}
            </Button>
          </div>
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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [newMemberOpen, setNewMemberOpen] = useState(false);

  const fetchMembers = useServerFn(getMembers);
  const { data: members, isLoading } = useQuery({
    queryKey: ["members", companyId],
    queryFn: () => fetchMembers({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });

  const memberList = members || [];

  const filteredMembers = memberList.filter((m: any) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      m.name?.toLowerCase().includes(q) ||
      m.document?.includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.phone?.includes(q) ||
      m.vehicles?.some(
        (v: any) =>
          v.plate?.toLowerCase().includes(q) ||
          v.model?.toLowerCase().includes(q) ||
          v.brand?.toLowerCase().includes(q)
      );

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && m.status === "active") ||
      (statusFilter === "INACTIVE" && m.status !== "active");

    return matchesSearch && matchesStatus;
  });

  const totalMembers = memberList.length;
  const activeMembers = memberList.filter((m: any) => m.status === "active").length;
  const totalVehicles = memberList.reduce((acc: number, m: any) => acc + (m.vehicles?.length || 0), 0);

  return (
    <AppLayout
      title="Gestão de Associados"
      subtitle="Cadastre seus clientes e veículos protegidos na Planmais"
      actions={
        <Button
          onClick={() => setNewMemberOpen(true)}
          className="rounded-xl bg-primary text-primary-foreground gap-2 font-bold shadow-xs text-xs h-9"
        >
          <Plus className="size-4" /> Novo Associado
        </Button>
      }
    >
      <div className="space-y-4">
        {/* KPIs Resumidos */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="rounded-2xl border border-border/80 shadow-xs bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Total de Associados
                </span>
                <p className="text-2xl font-extrabold text-foreground mt-0.5">{totalMembers}</p>
              </div>
              <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Users className="size-4.5" />
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl border border-border/80 shadow-xs bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Associados Ativos
                </span>
                <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {activeMembers}
                </p>
              </div>
              <div className="size-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="size-4.5" />
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl border border-border/80 shadow-xs bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Veículos Vinculados
                </span>
                <p className="text-2xl font-extrabold text-foreground mt-0.5">{totalVehicles}</p>
              </div>
              <div className="size-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <Car className="size-4.5" />
              </div>
            </div>
          </Card>
        </div>

        {/* Barra de Filtros e Busca */}
        <Card className="rounded-2xl border border-border/80 shadow-xs bg-card">
          <CardContent className="p-3.5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar associado por nome, CPF, telefone ou placa..."
                  className="pl-9 h-9 rounded-xl bg-background border-border/80 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-[160px] rounded-xl bg-background border-border/80 text-xs font-medium">
                    <Filter className="size-3 mr-1 text-muted-foreground" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="ALL">Todos os Status</SelectItem>
                    <SelectItem value="ACTIVE">Ativos</SelectItem>
                    <SelectItem value="INACTIVE">Inativos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Listagem de Associados em Tabela/Lista */}
        {isLoading ? (
          <div className="flex justify-center p-8 text-xs text-muted-foreground">Carregando associados...</div>
        ) : memberList.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center space-y-4 rounded-2xl border border-dashed border-border/80 bg-card">
            <div className="size-12 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground">
              <User className="size-6" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">Nenhum associado cadastrado</p>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                Comece cadastrando seu primeiro associado para gerenciar a proteção veicular.
              </p>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap justify-center pt-1">
              <Button
                onClick={() => setNewMemberOpen(true)}
                className="rounded-xl bg-primary text-primary-foreground gap-2 font-bold shadow-xs text-xs h-9"
              >
                <Plus className="size-4" /> Cadastrar Associado
              </Button>
            </div>
          </div>
        ) : filteredMembers.length === 0 ? (
          <Card className="rounded-2xl border border-dashed border-border p-10 text-center bg-card">
            <User className="size-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-bold text-foreground">Nenhum associado encontrado</p>
            <p className="text-xs text-muted-foreground mt-0.5">Tente alterar os termos de busca ou filtros.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setStatusFilter("ALL");
              }}
              className="mt-3 rounded-xl text-xs h-8"
            >
              Limpar Filtros
            </Button>
          </Card>
        ) : (
          <div className="rounded-2xl border border-border/80 bg-card shadow-card overflow-hidden">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/30 border-b border-border/60 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-3 sm:px-3.5">Associado</th>
                    <th className="px-3 py-3 sm:px-3.5">Contatos</th>
                    <th className="px-3 py-3 sm:px-3.5">Veículos Vinculados</th>
                    <th className="px-3 py-3 sm:px-3.5 whitespace-nowrap">Consultor</th>
                    <th className="px-3 py-3 sm:px-3.5 text-center">Status</th>
                    <th className="px-3 py-3 sm:px-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredMembers.map((m: any) => {
                    const partner = Array.isArray(m.partners) ? m.partners[0] : m.partners;
                    const vehiclesList = m.vehicles || [];

                    return (
                      <tr
                        key={m.id}
                        onClick={() => setEditingMember(m)}
                        className="hover:bg-muted/30 transition-colors cursor-pointer group"
                        title="Clique em qualquer lugar da linha para editar este associado"
                      >
                        {/* Associado */}
                        <td className="px-3 py-2.5 sm:px-3.5 sm:py-3 align-middle">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="size-7.5 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                              {m.name?.charAt(0)?.toUpperCase() || "A"}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-foreground text-xs leading-tight truncate max-w-[130px] sm:max-w-[160px] lg:max-w-[200px] group-hover:text-primary transition-colors">
                                {m.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                CPF: {formatCpfCnpj(m.document)}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Contatos com Ícones (sem emojis) */}
                        <td className="px-3 py-2.5 sm:px-3.5 sm:py-3 align-middle">
                          <div className="space-y-1 min-w-0">
                            {m.phone ? (
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-foreground">
                                  <Phone className="size-3 text-primary shrink-0" />
                                  {formatPhone(m.phone)}
                                </span>
                                <a
                                  href={`https://wa.me/55${m.phone.replace(/\D/g, "")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  title="WhatsApp"
                                  className="size-5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 flex items-center justify-center transition-colors"
                                >
                                  <MessageCircle className="size-3" />
                                </a>
                              </div>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">—</span>
                            )}
                            {m.email && (
                              <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate max-w-[200px]">
                                <Mail className="size-3 text-muted-foreground shrink-0" />
                                <span className="truncate">{m.email}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Veículos Protegidos */}
                        <td className="px-3 py-2.5 sm:px-3.5 sm:py-3 align-middle">
                          <div className="space-y-1.5 min-w-[160px] sm:min-w-[190px]">
                            {vehiclesList.length === 0 ? (
                              <span className="text-[11px] text-muted-foreground italic">Nenhum veículo vinculado</span>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {vehiclesList.map((v: any) => (
                                  <div
                                    key={v.id}
                                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-muted/60 border border-border/60 text-[11px]"
                                  >
                                    <span className="font-mono font-bold text-foreground">{v.plate}</span>
                                    <span className="text-muted-foreground truncate max-w-[120px]">
                                      {v.brand} {v.model}
                                    </span>
                                    <VehicleCategoryBadge category={v.category} size="sm" />
                                  </div>
                                ))}
                              </div>
                            )}
                            <div onClick={(e) => e.stopPropagation()}>
                              <VehicleDialog memberId={m.id} memberName={m.name} />
                            </div>
                          </div>
                        </td>

                        {/* Consultor / Parceiro */}
                        <td className="px-3 py-2.5 sm:px-3.5 sm:py-3 align-middle whitespace-nowrap">
                          {partner?.name ? (
                            <Badge
                              variant="outline"
                              className="text-[9.5px] sm:text-[10px] border-primary/30 text-primary font-semibold whitespace-nowrap px-2.5 py-0.5 rounded-full inline-flex items-center leading-none"
                            >
                              {partner.name}
                            </Badge>
                          ) : (
                            <span className="text-[11px] text-muted-foreground whitespace-nowrap">Direto</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-3 py-2.5 sm:px-3.5 sm:py-3 align-middle text-center whitespace-nowrap">
                          <Badge
                            variant={m.status === "active" ? "default" : "secondary"}
                            className="text-[10px] font-bold rounded-full px-2 py-0.5"
                          >
                            {m.status === "active" ? "Ativo" : m.status || "Inativo"}
                          </Badge>
                        </td>

                        {/* Ações */}
                        <td className="px-3 py-2.5 sm:px-3.5 sm:py-3 align-middle text-right">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary"
                              onClick={() => setEditingMember(m)}
                              title="Editar Associado"
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <DeleteMemberButton memberId={m.id} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modais de Cadastro e Edição de Associado */}
        <MemberDialog
          open={newMemberOpen}
          onOpenChange={setNewMemberOpen}
        />
        {editingMember && (
          <MemberDialog
            open={!!editingMember}
            onOpenChange={(op) => !op && setEditingMember(null)}
            member={editingMember}
          />
        )}
      </div>
    </AppLayout>
  );
}
