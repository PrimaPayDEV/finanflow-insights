import { createFileRoute } from '@tanstack/react-router';
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import {
  Settings2,
  Users,
  ShieldCheck,
  Award,
  Plus,
  Pencil,
  Trash2,
  Save,
  Check,
  Search,
  Percent,
  Wallet,
  Phone,
  Mail,
  UserCheck,
  Car,
  RotateCcw,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { getPartners, upsertPartner, deletePartner } from "@/lib/partner.functions";
import { BRL, formatCurrencyInput, formatPhone, formatCpfCnpj } from "@/lib/format";
import {
  type VehicleType,
  type CotaParticipacaoFaixa,
  type ProdutoVeicular,
  DEFAULT_COTAS_PARTICIPACAO,
  DEFAULT_PRODUTOS_VEICULARES,
  loadLocalData,
  saveLocalData
} from "@/lib/veicular";

export const Route = createFileRoute('/veicular/cadastros')({
  head: () => ({
    meta: [{ title: "Cadastros Base | Planmais Proteção Veicular" }],
  }),
  component: CadastrosPage,
});

function CadastrosPage() {
  const { companyId } = useAuth();
  const qc = useQueryClient();

  // Ler query param se houver
  const [activeTab, setActiveTab] = useState<string>("consultores");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab === "consultores" || tab === "cotas" || tab === "produtos") {
        setActiveTab(tab);
      }
    }
  }, []);

  // -------------------------------------------------------------
  // ABA 1: CONSULTORES / PARCEIROS
  // -------------------------------------------------------------
  const fetchPartners = useServerFn(getPartners);
  const { data: partners = [], isLoading: loadingPartners } = useQuery({
    queryKey: ["partners", companyId],
    queryFn: () => fetchPartners({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });

  const [partnerModalOpen, setPartnerModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<any | null>(null);
  const [partnerName, setPartnerName] = useState("");
  const [partnerEmail, setPartnerEmail] = useState("");
  const [partnerPhone, setPartnerPhone] = useState("");
  const [partnerSplit, setPartnerSplit] = useState("10");
  const [partnerWalletId, setPartnerWalletId] = useState("");

  const handleOpenPartnerModal = (partner?: any) => {
    if (partner) {
      setEditingPartner(partner);
      setPartnerName(partner.name || "");
      setPartnerEmail(partner.email || "");
      setPartnerPhone(partner.phone || "");
      setPartnerSplit(String(partner.split_percent ?? 10));
      setPartnerWalletId(partner.asaas_wallet_id || "");
    } else {
      setEditingPartner(null);
      setPartnerName("");
      setPartnerEmail("");
      setPartnerPhone("");
      setPartnerSplit("10");
      setPartnerWalletId("");
    }
    setPartnerModalOpen(true);
  };

  const savePartnerMutation = useMutation({
    mutationFn: useServerFn(upsertPartner),
    onSuccess: () => {
      toast.success(editingPartner ? "Consultor atualizado com sucesso!" : "Consultor cadastrado com sucesso!");
      qc.invalidateQueries({ queryKey: ["partners"] });
      setPartnerModalOpen(false);
    },
    onError: (err: any) => toast.error("Erro ao salvar consultor: " + err.message),
  });

  const deletePartnerMutation = useMutation({
    mutationFn: useServerFn(deletePartner),
    onSuccess: () => {
      toast.success("Consultor removido com sucesso!");
      qc.invalidateQueries({ queryKey: ["partners"] });
    },
    onError: (err: any) => toast.error("Erro ao remover consultor: " + err.message),
  });

  // -------------------------------------------------------------
  // ABA 2: COTAS DE PARTICIPAÇÃO
  // -------------------------------------------------------------
  const [cotas, setCotas] = useState<CotaParticipacaoFaixa[]>(() => {
    return loadLocalData(companyId || "default", "cotas", DEFAULT_COTAS_PARTICIPACAO);
  });
  const [cotaFilterType, setCotaFilterType] = useState<VehicleType | "todos">("todos");
  const [cotaModalOpen, setCotaModalOpen] = useState(false);
  const [editingCota, setEditingCota] = useState<CotaParticipacaoFaixa | null>(null);
  const [cotaType, setCotaType] = useState<VehicleType>("carro");
  const [cotaMinFipe, setCotaMinFipe] = useState("0");
  const [cotaMaxFipe, setCotaMaxFipe] = useState("50000");
  const [cotaPercent, setCotaPercent] = useState("6");
  const [cotaMinAmount, setCotaMinAmount] = useState("1500");
  const [cotaDesc, setCotaDesc] = useState("");

  const filteredCotas = useMemo(() => {
    if (cotaFilterType === "todos") return cotas;
    return cotas.filter((c) => c.vehicleType === cotaFilterType);
  }, [cotas, cotaFilterType]);

  const handleOpenCotaModal = (c?: CotaParticipacaoFaixa) => {
    if (c) {
      setEditingCota(c);
      setCotaType(c.vehicleType);
      setCotaMinFipe(String(c.minFipe));
      setCotaMaxFipe(String(c.maxFipe));
      setCotaPercent(String(c.percentage));
      setCotaMinAmount(String(c.minAmount));
      setCotaDesc(c.description || "");
    } else {
      setEditingCota(null);
      setCotaType("carro");
      setCotaMinFipe("0");
      setCotaMaxFipe("60000");
      setCotaPercent("6");
      setCotaMinAmount("1500");
      setCotaDesc("");
    }
    setCotaModalOpen(true);
  };

  const handleSaveCota = () => {
    const updatedFaixa: CotaParticipacaoFaixa = {
      id: editingCota ? editingCota.id : "cota-" + Date.now(),
      vehicleType: cotaType,
      minFipe: Number(cotaMinFipe) || 0,
      maxFipe: Number(cotaMaxFipe) || 999999,
      percentage: Number(cotaPercent) || 6,
      minAmount: Number(cotaMinAmount) || 1500,
      description: cotaDesc || `Franquia de ${cotaPercent}% (Mínimo R$ ${Number(cotaMinAmount).toFixed(2)})`,
    };

    let updated: CotaParticipacaoFaixa[];
    if (editingCota) {
      updated = cotas.map((item) => (item.id === editingCota.id ? updatedFaixa : item));
    } else {
      updated = [...cotas, updatedFaixa];
    }
    setCotas(updated);
    saveLocalData(companyId || "default", "cotas", updated);
    toast.success("Tabela de cotas atualizada com sucesso!");
    setCotaModalOpen(false);
  };

  const handleDeleteCota = (id: string) => {
    const updated = cotas.filter((c) => c.id !== id);
    setCotas(updated);
    saveLocalData(companyId || "default", "cotas", updated);
    toast.success("Faixa de cota removida.");
  };

  const handleResetCotas = () => {
    if (confirm("Deseja restaurar as cotas de participação padrão de mercado?")) {
      setCotas(DEFAULT_COTAS_PARTICIPACAO);
      saveLocalData(companyId || "default", "cotas", DEFAULT_COTAS_PARTICIPACAO);
      toast.success("Cotas padrão restauradas com sucesso.");
    }
  };

  // -------------------------------------------------------------
  // ABA 3: PRODUTOS POR TIPO DE VEÍCULO
  // -------------------------------------------------------------
  const [produtos, setProdutos] = useState<ProdutoVeicular[]>(() => {
    return loadLocalData<ProdutoVeicular[]>(companyId || "default", "produtos", DEFAULT_PRODUTOS_VEICULARES);
  });
  const [prodFilterType, setProdFilterType] = useState<VehicleType | "todos">("todos");
  const [prodModalOpen, setProdModalOpen] = useState(false);
  const [editingProd, setEditingProd] = useState<ProdutoVeicular | null>(null);
  const [prodName, setProdName] = useState("");
  const [prodVehicleType, setProdVehicleType] = useState<VehicleType | "todos">("todos");
  const [prodCategory, setProdCategory] = useState<ProdutoVeicular["category"]>("cobertura");
  const [prodFee, setProdFee] = useState("29.90");
  const [prodLimit, setProdLimit] = useState("");
  const [prodDesc, setProdDesc] = useState("");
  const [prodRequired, setProdRequired] = useState(false);

  const filteredProdutos = useMemo(() => {
    if (prodFilterType === "todos") return produtos;
    return produtos.filter((p) => p.vehicleType === "todos" || p.vehicleType === prodFilterType);
  }, [produtos, prodFilterType]);

  const handleOpenProdModal = (p?: ProdutoVeicular) => {
    if (p) {
      setEditingProd(p);
      setProdName(p.name);
      setProdVehicleType(p.vehicleType);
      setProdCategory(p.category);
      setProdFee(String(p.monthlyFee));
      setProdLimit(p.coverageLimit || "");
      setProdDesc(p.description || "");
      setProdRequired(Boolean(p.isRequired));
    } else {
      setEditingProd(null);
      setProdName("");
      setProdVehicleType("todos");
      setProdCategory("cobertura");
      setProdFee("29.90");
      setProdLimit("");
      setProdDesc("");
      setProdRequired(false);
    }
    setProdModalOpen(true);
  };

  const handleSaveProd = () => {
    if (!prodName.trim()) {
      toast.error("Informe o nome do produto.");
      return;
    }

    const updatedProd: ProdutoVeicular = {
      id: editingProd ? editingProd.id : "prod-" + Date.now(),
      name: prodName,
      vehicleType: prodVehicleType,
      category: prodCategory,
      monthlyFee: Number(prodFee) || 0,
      coverageLimit: prodLimit || undefined,
      description: prodDesc,
      isRequired: prodRequired,
      isActive: true,
    };

    let updated: ProdutoVeicular[];
    if (editingProd) {
      updated = produtos.map((item) => (item.id === editingProd.id ? updatedProd : item));
    } else {
      updated = [...produtos, updatedProd];
    }
    setProdutos(updated);
    saveLocalData(companyId || "default", "produtos", updated);
    toast.success("Produto salvo com sucesso!");
    setProdModalOpen(false);
  };

  const handleToggleProdActive = (id: string) => {
    const updated = produtos.map((p) => (p.id === id ? { ...p, isActive: !p.isActive } : p));
    setProdutos(updated);
    saveLocalData(companyId || "default", "produtos", updated);
  };

  const handleDeleteProd = (id: string) => {
    const updated = produtos.filter((p) => p.id !== id);
    setProdutos(updated);
    saveLocalData(companyId || "default", "produtos", updated);
    toast.success("Produto removido.");
  };

  const handleResetProds = () => {
    if (confirm("Deseja restaurar a planilha padrão de produtos e coberturas?")) {
      setProdutos(DEFAULT_PRODUTOS_VEICULARES);
      saveLocalData(companyId || "default", "produtos", DEFAULT_PRODUTOS_VEICULARES);
      toast.success("Produtos padrão restaurados.");
    }
  };

  return (
    <AppLayout
      title="Cadastros da Proteção Veicular"
      subtitle="Gerenciamento de consultores, cotas de participação e planilha de produtos"
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-muted/70 p-1 rounded-2xl w-full sm:w-auto grid grid-cols-3 sm:inline-flex">
            <TabsTrigger value="consultores" className="rounded-xl text-xs font-bold gap-2 px-4 py-2">
              <UserCheck className="size-4" />
              <span>Consultores</span>
            </TabsTrigger>
            <TabsTrigger value="cotas" className="rounded-xl text-xs font-bold gap-2 px-4 py-2">
              <ShieldCheck className="size-4" />
              <span>Cotas de Participação</span>
            </TabsTrigger>
            <TabsTrigger value="produtos" className="rounded-xl text-xs font-bold gap-2 px-4 py-2">
              <Award className="size-4" />
              <span>Produtos por Veículo</span>
            </TabsTrigger>
          </TabsList>

          {/* ------------------------------------------------------------- */}
          {/* ABA 1: CONSULTORES */}
          {/* ------------------------------------------------------------- */}
          <TabsContent value="consultores" className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Equipe de Consultores & Vendedores</h3>
                <p className="text-xs text-muted-foreground">
                  Cadastre consultores, comissões em percentual e carteiras Asaas para repasse automático
                </p>
              </div>
              <Button
                onClick={() => handleOpenPartnerModal()}
                className="rounded-xl font-bold text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="size-4" />
                <span>Cadastrar Consultor</span>
              </Button>
            </div>

            <Card className="rounded-2xl border border-border/80 shadow-sm overflow-hidden">
              <CardContent className="p-0">
                {loadingPartners ? (
                  <div className="p-12 text-center text-sm text-muted-foreground">Carregando consultores...</div>
                ) : partners.length === 0 ? (
                  <div className="p-12 text-center text-sm text-muted-foreground space-y-3">
                    <UserCheck className="size-10 mx-auto text-muted-foreground/60" />
                    <p>Nenhum consultor cadastrado até o momento.</p>
                    <Button size="sm" onClick={() => handleOpenPartnerModal()} className="rounded-xl text-xs">
                      Cadastrar Primeiro Consultor
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border/60 bg-muted/40 font-bold text-muted-foreground uppercase text-[10px] tracking-wider">
                          <th className="p-4">Nome do Consultor</th>
                          <th className="p-4">Contato / E-mail</th>
                          <th className="p-4 text-center">Comissão / Split</th>
                          <th className="p-4">Carteira Asaas</th>
                          <th className="p-4 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {partners.map((p: any) => (
                          <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-4">
                              <div className="font-bold text-foreground text-sm">{p.name}</div>
                              <span className="text-[10px] text-muted-foreground">Consultor Ativo</span>
                            </td>
                            <td className="p-4 text-muted-foreground space-y-0.5">
                              {p.email && <div className="flex items-center gap-1.5"><Mail className="size-3 text-muted-foreground" /> {p.email}</div>}
                              {p.phone && <div className="flex items-center gap-1.5"><Phone className="size-3 text-muted-foreground" /> {formatPhone(p.phone)}</div>}
                            </td>
                            <td className="p-4 text-center">
                              <Badge className="bg-primary/10 text-primary font-bold text-xs border border-primary/20">
                                {p.split_percent ?? 0}%
                              </Badge>
                            </td>
                            <td className="p-4 font-mono text-[11px] text-muted-foreground">
                              {p.asaas_wallet_id ? (
                                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                                  <Wallet className="size-3" /> {p.asaas_wallet_id}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/60">Não vinculada</span>
                              )}
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenPartnerModal(p)}
                                  className="size-8 rounded-lg"
                                >
                                  <Pencil className="size-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    if (confirm(`Remover consultor ${p.name}?`)) {
                                      deletePartnerMutation.mutate({ data: { id: p.id } });
                                    }
                                  }}
                                  className="size-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ------------------------------------------------------------- */}
          {/* ABA 2: COTAS DE PARTICIPAÇÃO */}
          {/* ------------------------------------------------------------- */}
          <TabsContent value="cotas" className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Cotas de Participação (Franquia) por Veículo</h3>
                <p className="text-xs text-muted-foreground">
                  Parametrize as faixas de valor FIPE e o valor mínimo de coparticipação em caso de sinistro
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleResetCotas} className="rounded-xl text-xs gap-1.5">
                  <RotateCcw className="size-3.5" />
                  <span>Restaurar Padrão</span>
                </Button>
                <Button onClick={() => handleOpenCotaModal()} className="rounded-xl font-bold text-xs gap-1.5">
                  <Plus className="size-4" />
                  <span>Nova Faixa</span>
                </Button>
              </div>
            </div>

            {/* Filtro por Tipo de Veículo */}
            <div className="flex gap-2">
              {[
                { id: "todos", label: "Todos os Tipos" },
                { id: "carro", label: "Carros" },
                { id: "moto", label: "Motos" },
                { id: "utilitario", label: "Utilitários" },
                { id: "pesado", label: "Pesados" },
              ].map((f) => (
                <Button
                  key={f.id}
                  variant={cotaFilterType === f.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCotaFilterType(f.id as any)}
                  className="rounded-xl text-xs font-semibold"
                >
                  {f.label}
                </Button>
              ))}
            </div>

            <Card className="rounded-2xl border border-border/80 shadow-sm overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/40 font-bold text-muted-foreground uppercase text-[10px] tracking-wider">
                        <th className="p-4">Tipo</th>
                        <th className="p-4">Faixa de Avaliação (FIPE)</th>
                        <th className="p-4 text-center">Percentual</th>
                        <th className="p-4 text-center">Valor Mínimo</th>
                        <th className="p-4">Descrição Comercial</th>
                        <th className="p-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredCotas.map((c) => (
                        <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-4">
                            <Badge variant="outline" className="text-[10px] font-bold uppercase">
                              {c.vehicleType}
                            </Badge>
                          </td>
                          <td className="p-4 font-mono font-semibold text-foreground">
                            {BRL(c.minFipe)} até {c.maxFipe >= 900000 ? "Acima" : BRL(c.maxFipe)}
                          </td>
                          <td className="p-4 text-center font-bold text-primary font-mono text-xs">
                            {c.percentage}%
                          </td>
                          <td className="p-4 text-center font-mono font-extrabold text-foreground">
                            {BRL(c.minAmount)}
                          </td>
                          <td className="p-4 text-muted-foreground">{c.description || "-"}</td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenCotaModal(c)}
                                className="size-8 rounded-lg"
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteCota(c.id)}
                                className="size-8 rounded-lg text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ------------------------------------------------------------- */}
          {/* ABA 3: PRODUTOS POR TIPO DE VEÍCULO */}
          {/* ------------------------------------------------------------- */}
          <TabsContent value="produtos" className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Planilha de Produtos & Coberturas</h3>
                <p className="text-xs text-muted-foreground">
                  Cadastre coberturas adicionais, limites contratados e valores de mensalidade por tipo de veículo
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleResetProds} className="rounded-xl text-xs gap-1.5">
                  <RotateCcw className="size-3.5" />
                  <span>Restaurar Padrão</span>
                </Button>
                <Button onClick={() => handleOpenProdModal()} className="rounded-xl font-bold text-xs gap-1.5">
                  <Plus className="size-4" />
                  <span>Novo Produto</span>
                </Button>
              </div>
            </div>

            {/* Filtro por Categoria */}
            <div className="flex gap-2">
              {[
                { id: "todos", label: "Todos os Produtos" },
                { id: "carro", label: "Carros" },
                { id: "moto", label: "Motos" },
                { id: "utilitario", label: "Utilitários" },
                { id: "pesado", label: "Pesados" },
              ].map((f) => (
                <Button
                  key={f.id}
                  variant={prodFilterType === f.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setProdFilterType(f.id as any)}
                  className="rounded-xl text-xs font-semibold"
                >
                  {f.label}
                </Button>
              ))}
            </div>

            <Card className="rounded-2xl border border-border/80 shadow-sm overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/40 font-bold text-muted-foreground uppercase text-[10px] tracking-wider">
                        <th className="p-4">Produto / Cobertura</th>
                        <th className="p-4">Aplicação</th>
                        <th className="p-4">Limite de Cobertura</th>
                        <th className="p-4 text-center">Valor Mensal</th>
                        <th className="p-4 text-center">Obrigatório</th>
                        <th className="p-4 text-center">Status</th>
                        <th className="p-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredProdutos.map((p) => (
                        <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-4">
                            <div className="font-bold text-foreground text-sm">{p.name}</div>
                            <p className="text-[11px] text-muted-foreground line-clamp-1">{p.description}</p>
                          </td>
                          <td className="p-4">
                            <Badge variant="outline" className="text-[10px] font-bold uppercase">
                              {p.vehicleType}
                            </Badge>
                          </td>
                          <td className="p-4 text-muted-foreground font-medium">
                            {p.coverageLimit || "Padrão"}
                          </td>
                          <td className="p-4 text-center font-mono font-extrabold text-foreground text-xs">
                            {p.isRequired ? "Incluso" : BRL(p.monthlyFee)}
                          </td>
                          <td className="p-4 text-center">
                            {p.isRequired ? (
                              <Badge className="bg-primary text-primary-foreground text-[10px]">Sim</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">Opcional</Badge>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <Switch
                              checked={p.isActive}
                              onCheckedChange={() => handleToggleProdActive(p.id)}
                            />
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenProdModal(p)}
                                className="size-8 rounded-lg"
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                              {!p.isRequired && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteProd(p.id)}
                                  className="size-8 rounded-lg text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* MODAL: CADASTRAR/EDITAR CONSULTOR */}
        <Dialog open={partnerModalOpen} onOpenChange={setPartnerModalOpen}>
          <DialogContent className="w-[95vw] sm:max-w-md rounded-2xl border-border bg-card p-0 gap-0 overflow-hidden shadow-2xl">
            <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border/60 bg-muted/10 shrink-0">
              <DialogTitle className="text-base font-bold">
                {editingPartner ? "Editar Consultor" : "Novo Consultor"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Configure os dados do consultor e a comissão de split Asaas
              </DialogDescription>
            </DialogHeader>
            <div className="p-4 sm:p-5 space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Nome Completo *</Label>
                <Input
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  placeholder="Nome do consultor"
                  className="rounded-xl text-xs h-8.5 bg-background"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Telefone / WhatsApp</Label>
                  <Input
                    value={partnerPhone}
                    onChange={(e) => setPartnerPhone(formatPhone(e.target.value))}
                    placeholder="(00) 00000-0000"
                    className="rounded-xl text-xs font-mono h-8.5 bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Comissão / Split (%)</Label>
                  <Input
                    type="number"
                    value={partnerSplit}
                    onChange={(e) => setPartnerSplit(e.target.value)}
                    placeholder="Ex: 10"
                    className="rounded-xl text-xs font-mono font-bold h-8.5 bg-background"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">E-mail</Label>
                <Input
                  type="email"
                  value={partnerEmail}
                  onChange={(e) => setPartnerEmail(e.target.value)}
                  placeholder="consultor@email.com"
                  className="rounded-xl text-xs h-8.5 bg-background"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Carteira Asaas (Wallet ID)</Label>
                <Input
                  value={partnerWalletId}
                  onChange={(e) => setPartnerWalletId(e.target.value)}
                  placeholder="wal_..."
                  className="rounded-xl text-xs font-mono h-8.5 bg-background"
                />
                <p className="text-[10px] text-muted-foreground leading-tight">
                  Se preenchida, o split percentual será repassado diretamente a esta carteira pelo Asaas.
                </p>
              </div>
            </div>
            <DialogFooter className="p-3.5 sm:p-4 border-t border-border/60 bg-muted/20 shrink-0 flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setPartnerModalOpen(false)} className="rounded-xl text-xs h-8">
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (!partnerName.trim()) {
                    toast.error("Informe o nome do consultor.");
                    return;
                  }
                  savePartnerMutation.mutate({
                    data: {
                      id: editingPartner?.id,
                      name: partnerName,
                      email: partnerEmail || undefined,
                      asaas_wallet_id: partnerWalletId || "wal_padrao",
                      split_percent: Number(partnerSplit) || 0,
                      companyId: companyId!,
                    },
                  });
                }}
                disabled={savePartnerMutation.isPending}
                className="rounded-xl text-xs font-bold h-8 px-4"
              >
                {savePartnerMutation.isPending ? "Salvando..." : "Salvar Consultor"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL: COTA DE PARTICIPAÇÃO */}
        <Dialog open={cotaModalOpen} onOpenChange={setCotaModalOpen}>
          <DialogContent className="w-[95vw] sm:max-w-md rounded-2xl border-border bg-card p-0 gap-0 overflow-hidden shadow-2xl">
            <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border/60 bg-muted/10 shrink-0">
              <DialogTitle className="text-base font-bold">
                {editingCota ? "Editar Faixa de Cota" : "Nova Faixa de Cota de Participação"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Defina os limites de avaliação FIPE e o valor mínimo de franquia
              </DialogDescription>
            </DialogHeader>
            <div className="p-4 sm:p-5 space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Tipo do Veículo</Label>
                <Select value={cotaType} onValueChange={(v: any) => setCotaType(v)}>
                  <SelectTrigger className="rounded-xl text-xs h-8.5 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="carro">Carro / SUV</SelectItem>
                    <SelectItem value="moto">Motocicleta</SelectItem>
                    <SelectItem value="utilitario">Utilitário / Van</SelectItem>
                    <SelectItem value="pesado">Caminhão / Pesado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">FIPE Mínima (R$)</Label>
                  <Input
                    type="number"
                    value={cotaMinFipe}
                    onChange={(e) => setCotaMinFipe(e.target.value)}
                    className="rounded-xl text-xs font-mono h-8.5 bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">FIPE Máxima (R$)</Label>
                  <Input
                    type="number"
                    value={cotaMaxFipe}
                    onChange={(e) => setCotaMaxFipe(e.target.value)}
                    className="rounded-xl text-xs font-mono h-8.5 bg-background"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Percentual Cota (%)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={cotaPercent}
                    onChange={(e) => setCotaPercent(e.target.value)}
                    className="rounded-xl text-xs font-mono font-bold h-8.5 bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Valor Mínimo (R$)</Label>
                  <Input
                    type="number"
                    value={cotaMinAmount}
                    onChange={(e) => setCotaMinAmount(e.target.value)}
                    className="rounded-xl text-xs font-mono font-bold h-8.5 bg-background"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Descrição / Observação</Label>
                <Input
                  value={cotaDesc}
                  onChange={(e) => setCotaDesc(e.target.value)}
                  placeholder="Ex: Veículos até R$ 50.000"
                  className="rounded-xl text-xs h-8.5 bg-background"
                />
              </div>
            </div>
            <DialogFooter className="p-3.5 sm:p-4 border-t border-border/60 bg-muted/20 shrink-0 flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setCotaModalOpen(false)} className="rounded-xl text-xs h-8">
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSaveCota} className="rounded-xl text-xs font-bold h-8 px-4">
                Salvar Faixa
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL: PRODUTO / COBERTURA */}
        <Dialog open={prodModalOpen} onOpenChange={setProdModalOpen}>
          <DialogContent className="w-[95vw] sm:max-w-md rounded-2xl border-border bg-card p-0 gap-0 overflow-hidden shadow-2xl">
            <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border/60 bg-muted/10 shrink-0">
              <DialogTitle className="text-base font-bold">
                {editingProd ? "Editar Produto" : "Novo Produto / Cobertura"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Cadastre coberturas e serviços adicionais para a cotação
              </DialogDescription>
            </DialogHeader>
            <div className="p-4 sm:p-5 space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Nome do Produto *</Label>
                <Input
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="Ex: Guincho 1.000 km, Carro Reserva 15 Dias"
                  className="rounded-xl text-xs h-8.5 bg-background"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Tipo Aplicável</Label>
                  <Select value={prodVehicleType} onValueChange={(v: any) => setProdVehicleType(v)}>
                    <SelectTrigger className="rounded-xl text-xs h-8.5 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="todos">Todos os Veículos</SelectItem>
                      <SelectItem value="carro">Apenas Carros</SelectItem>
                      <SelectItem value="moto">Apenas Motos</SelectItem>
                      <SelectItem value="utilitario">Apenas Utilitários</SelectItem>
                      <SelectItem value="pesado">Apenas Pesados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Categoria</Label>
                  <Select value={prodCategory} onValueChange={(v: any) => setProdCategory(v)}>
                    <SelectTrigger className="rounded-xl text-xs h-8.5 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="cobertura">Cobertura</SelectItem>
                      <SelectItem value="assistencia">Assistência 24h</SelectItem>
                      <SelectItem value="rastreamento">Rastreamento</SelectItem>
                      <SelectItem value="adicional">Benefício Adicional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Valor Mensal (R$)</Label>
                  <Input
                    type="number"
                    step="0.10"
                    value={prodFee}
                    onChange={(e) => setProdFee(e.target.value)}
                    className="rounded-xl text-xs font-mono font-bold h-8.5 bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Limite de Cobertura</Label>
                  <Input
                    value={prodLimit}
                    onChange={(e) => setProdLimit(e.target.value)}
                    placeholder="Ex: R$ 50.000 ou 1.000 km"
                    className="rounded-xl text-xs h-8.5 bg-background"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Descrição do Benefício</Label>
                <Input
                  value={prodDesc}
                  onChange={(e) => setProdDesc(e.target.value)}
                  placeholder="Detalhes para a proposta do associado"
                  className="rounded-xl text-xs h-8.5 bg-background"
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/60">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold block text-foreground">Produto Obrigatório</span>
                  <span className="text-[10px] text-muted-foreground block">
                    Incluso automaticamente na mensalidade de todas as cotações
                  </span>
                </div>
                <Switch checked={prodRequired} onCheckedChange={setProdRequired} />
              </div>
            </div>
            <DialogFooter className="p-3.5 sm:p-4 border-t border-border/60 bg-muted/20 shrink-0 flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setProdModalOpen(false)} className="rounded-xl text-xs h-8">
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSaveProd} className="rounded-xl text-xs font-bold h-8 px-4">
                Salvar Produto
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
