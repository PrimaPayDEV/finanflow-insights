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
import { HinovaBatchImportDialog } from "@/components/HinovaBatchImportDialog";

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
      if (!member) {
        setName(""); setDocument(""); setEmail(""); setPhone(""); setPartnerId("");
        setVehicleId(""); setPlate(""); setBrandName(""); setModelName(""); setYear(""); setBrandCode("");
        setCategory("Leves e utilitários");
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

            <div className="pt-1">
              <VehicleCategorySelector value={category} onChange={setCategory} />
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-center sm:justify-between gap-3 border-t pt-4">
          <AsaasFormSeal />
          <div className="flex justify-end gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => submit.mutate()} disabled={submit.isPending}>
              {submit.isPending ? "Salvando..." : "Salvar"}
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
        <Button variant="outline" size="sm" className="gap-2">
          <Car className="size-4" /> Adicionar Veículo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Veículo - {memberName}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3.5 py-3">
          <div className="space-y-1.5">
            <Label>Placa</Label>
            <Input value={plate} onChange={(e) => setPlate(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())} placeholder="ABC1234" maxLength={7} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Marca</Label>
              <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Chevrolet" />
            </div>
            <div className="space-y-1.5">
              <Label>Modelo</Label>
              <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Onix" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Ano</Label>
            <Input value={year} onChange={(e) => setYear(e.target.value)} placeholder="2020" type="number" />
          </div>

          <div className="pt-1">
            <VehicleCategorySelector value={category} onChange={setCategory} />
          </div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row items-center sm:justify-between gap-3 border-t pt-3">
          <AsaasFormSeal />
          <div className="flex justify-end gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => submit.mutate()} disabled={submit.isPending}>
              {submit.isPending ? "Salvando..." : "Salvar"}
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
        <div className="flex items-center gap-2 flex-wrap">
          <HinovaBatchImportDialog />
          <MemberDialog />
        </div>
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
                Comece cadastrando seu primeiro cliente ou importe o lote de associados do relatório Planmais (SGA Hinova).
              </p>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap justify-center pt-1">
              <HinovaBatchImportDialog />
              <MemberDialog />
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
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/30 border-b border-border/60 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3.5">Associado</th>
                    <th className="px-4 py-3.5">Contatos</th>
                    <th className="px-4 py-3.5">Veículos Vinculados</th>
                    <th className="px-4 py-3.5">Consultor</th>
                    <th className="px-4 py-3.5 text-center">Status</th>
                    <th className="px-4 py-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredMembers.map((m: any) => {
                    const partner = Array.isArray(m.partners) ? m.partners[0] : m.partners;
                    const vehiclesList = m.vehicles || [];

                    return (
                      <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                        {/* Associado */}
                        <td className="px-4 py-3.5 align-middle">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="size-8 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                              {m.name?.charAt(0)?.toUpperCase() || "A"}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-foreground text-xs leading-tight truncate">{m.name}</p>
                              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                CPF: {formatCpfCnpj(m.document)}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Contatos com Ícones (sem emojis) */}
                        <td className="px-4 py-3.5 align-middle">
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
                        <td className="px-4 py-3.5 align-middle">
                          <div className="space-y-1.5 min-w-[200px]">
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
                            <div>
                              <VehicleDialog memberId={m.id} memberName={m.name} />
                            </div>
                          </div>
                        </td>

                        {/* Consultor / Parceiro */}
                        <td className="px-4 py-3.5 align-middle">
                          {partner?.name ? (
                            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary font-medium">
                              {partner.name}
                            </Badge>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">Direto</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5 align-middle text-center">
                          <Badge
                            variant={m.status === "active" ? "default" : "secondary"}
                            className="text-[10px] font-bold rounded-full px-2 py-0.5"
                          >
                            {m.status === "active" ? "Ativo" : m.status || "Inativo"}
                          </Badge>
                        </td>

                        {/* Ações */}
                        <td className="px-4 py-3.5 align-middle text-right">
                          <div className="flex items-center justify-end gap-1">
                            <MemberDialog member={m} />
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
      </div>
    </AppLayout>
  );
}
