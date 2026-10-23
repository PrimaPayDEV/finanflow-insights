import { createFileRoute } from '@tanstack/react-router';
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import {
  Sparkles,
  Calculator,
  User,
  Car,
  ShieldCheck,
  CheckCircle2,
  Phone,
  MessageCircle,
  FileText,
  DollarSign,
  Copy,
  Printer,
  Save,
  Plus,
  ArrowRight,
  Clock,
  Search,
  ExternalLink,
  Percent,
  Check,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { AsaasFormSeal } from "@/components/AsaasBaasSeal";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
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
import { getPartners } from "@/lib/partner.functions";
import { upsertMember } from "@/lib/members.functions";
import { fetchCepData } from "@/lib/cep";
import { BRL, formatCpfCnpj, formatPhone, formatCurrencyInput } from "@/lib/format";
import {
  type VehicleType,
  type CotacaoItem,
  type ProdutoVeicular,
  DEFAULT_PRODUTOS_VEICULARES,
  DEFAULT_COTAS_PARTICIPACAO,
  calculateParticipationFee,
  calculateBaseMonthlyFee,
  loadLocalData,
  saveLocalData,
  generateCotacaoWhatsAppMessage
} from "@/lib/veicular";

export const Route = createFileRoute('/veicular/cotacao')({
  head: () => ({
    meta: [{ title: "Iniciar Cotação | Planmais Proteção Veicular" }],
  }),
  component: CotacaoPage,
});

function MercosulPlatePreview({ plate }: { plate: string }) {
  const clean = (plate || "BRA2E19").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const formatted = /^[A-Z]{3}[0-9]{4}$/.test(clean) ? `${clean.slice(0, 3)}-${clean.slice(3)}` : clean;

  return (
    <div className="relative inline-flex flex-col items-center justify-between bg-white text-slate-900 rounded-lg font-mono font-black border-2 border-slate-900 shadow-md overflow-hidden select-none w-32 h-9">
      <div className="w-full bg-[#003399] text-white flex items-center justify-between px-1.5 py-0.5 leading-none">
        <span className="text-[6px] tracking-wider uppercase font-sans font-bold">BRASIL</span>
        <div className="flex items-center gap-0.5">
          <div className="w-1.5 h-1 bg-[#009b3a] rounded-xs relative flex items-center justify-center">
            <div className="w-1 h-0.5 bg-[#fedf00] rotate-45 flex items-center justify-center">
              <div className="w-0.5 h-0.5 bg-[#002776] rounded-full" />
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center tracking-wider font-extrabold text-slate-950 text-sm font-mono">
        {formatted || "PLACA"}
      </div>
    </div>
  );
}

function CotacaoPage() {
  const { companyId, companyName } = useAuth();
  const qc = useQueryClient();

  // Buscar consultores
  const fetchPartners = useServerFn(getPartners);
  const { data: partners = [] } = useQuery({
    queryKey: ["partners", companyId],
    queryFn: () => fetchPartners({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });

  // Produtos e cotas configuradas
  const produtos = useMemo(() => {
    return loadLocalData<ProdutoVeicular[]>(companyId || "default", "produtos", DEFAULT_PRODUTOS_VEICULARES);
  }, [companyId]);

  const cotas = useMemo(() => {
    return loadLocalData(companyId || "default", "cotas", DEFAULT_COTAS_PARTICIPACAO);
  }, [companyId]);

  // Cotações salvas
  const [cotacoes, setCotacoes] = useState<CotacaoItem[]>(() => {
    return loadLocalData<CotacaoItem[]>(companyId || "default", "cotacoes", []);
  });

  // Form State - Associado
  const [memberName, setMemberName] = useState("");
  const [memberDocument, setMemberDocument] = useState("");
  const [memberPhone, setMemberPhone] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberCep, setMemberCep] = useState("");
  const [memberAddress, setMemberAddress] = useState("");
  const [memberNumber, setMemberNumber] = useState("");
  const [memberComplement, setMemberComplement] = useState("");
  const [memberNeighborhood, setMemberNeighborhood] = useState("");
  const [memberCity, setMemberCity] = useState("");
  const [memberState, setMemberState] = useState("");
  const [preferredDueDay, setPreferredDueDay] = useState<number>(20);
  const [consultantId, setConsultantId] = useState("");

  // Form State - Veículo
  const [vehicleType, setVehicleType] = useState<VehicleType>("carro");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [vehicleBrand, setVehicleBrand] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleYear, setVehicleYear] = useState<string>("2022");
  const [vehicleColor, setVehicleColor] = useState("");
  const [vehicleChassi, setVehicleChassi] = useState("");
  const [vehicleUsage, setVehicleUsage] = useState<"particular" | "comercial" | "app">("particular");
  const [rawFipe, setRawFipe] = useState("50000"); // R$ 50.000 padrão
  const fipeValue = Number(rawFipe.replace(/\D/g, "")) / 100 || 50000;

  // Produtos Selecionados
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(() => {
    return ["prod-base-roubo", "prod-terceiros-50", "prod-reboque-500"];
  });

  const [loadingCep, setLoadingCep] = useState(false);
  const [activeTab, setActiveTab] = useState<"formulario" | "historico">("formulario");

  // Auto-busca do CEP com possibilidade total de edição manual
  const handleCepSearch = async (cepInput: string) => {
    const clean = cepInput.replace(/\D/g, "");
    if (clean.length === 8) {
      setLoadingCep(true);
      try {
        const data = await fetchCepData(clean);
        if (data) {
          if (data.logradouro) setMemberAddress(data.logradouro);
          if (data.bairro) setMemberNeighborhood(data.bairro);
          if (data.localidade) setMemberCity(data.localidade);
          if (data.uf) setMemberState(data.uf);
          toast.success("Endereço localizado via CEP!");
        }
      } finally {
        setLoadingCep(false);
      }
    }
  };

  // Cálculos dinâmicos em tempo real
  const baseMonthly = useMemo(() => {
    return calculateBaseMonthlyFee(vehicleType, fipeValue);
  }, [vehicleType, fipeValue]);

  const applicableProducts = useMemo(() => {
    return produtos.filter((p) => p.isActive && (p.vehicleType === "todos" || p.vehicleType === vehicleType));
  }, [produtos, vehicleType]);

  const productsTotal = useMemo(() => {
    return applicableProducts
      .filter((p) => selectedProductIds.includes(p.id) && !p.isRequired)
      .reduce((acc, p) => acc + p.monthlyFee, 0);
  }, [applicableProducts, selectedProductIds]);

  const totalMonthly = useMemo(() => {
    return baseMonthly + productsTotal;
  }, [baseMonthly, productsTotal]);

  const participation = useMemo(() => {
    return calculateParticipationFee(vehicleType, fipeValue, cotas);
  }, [vehicleType, fipeValue, cotas]);

  const toggleProduct = (prodId: string) => {
    const prod = produtos.find((p) => p.id === prodId);
    if (prod?.isRequired) return; // Obrigatório não desmarca

    setSelectedProductIds((prev) =>
      prev.includes(prodId) ? prev.filter((id) => id !== prodId) : [...prev, prodId]
    );
  };

  // Efetivar Cotação como Associado e Veículo
  const upsertMutation = useMutation({
    mutationFn: useServerFn(upsertMember),
    onSuccess: () => {
      toast.success("Cotação efetivada com sucesso!", {
        description: `O associado ${memberName} e o veículo ${vehiclePlate} foram cadastrados no sistema.`,
      });
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["vehicles"] });
    },
    onError: (err: any) => {
      toast.error("Erro ao efetivar cotação: " + (err.message || "Erro desconhecido"));
    },
  });

  // Salvar Cotação
  const handleSaveCotacao = (status: CotacaoItem["status"] = "enviada") => {
    if (!memberName.trim()) {
      toast.error("Por favor, preencha o nome do associado.");
      return;
    }

    const consultant = partners.find((p: any) => p.id === consultantId);

    const newCotacao: CotacaoItem = {
      id: "cot-" + Date.now(),
      companyId: companyId || "default",
      createdAt: new Date().toISOString(),
      memberName,
      memberDocument,
      memberPhone,
      memberEmail,
      memberCep,
      memberAddress,
      memberNumber,
      memberComplement,
      memberNeighborhood,
      memberCity,
      memberState,
      preferredDueDay,
      consultantId: consultantId || undefined,
      consultantName: consultant?.name,
      vehicleType,
      vehiclePlate: (vehiclePlate || "A DEFINIR").toUpperCase(),
      vehicleBrand: vehicleBrand || "Veículo",
      vehicleModel: vehicleModel || "Modelo",
      vehicleYear: Number(vehicleYear) || 2022,
      vehicleColor,
      vehicleChassi,
      vehicleFipeValue: fipeValue,
      vehicleUsage,
      selectedProducts: selectedProductIds,
      baseFee: baseMonthly,
      productsFee: productsTotal,
      totalMonthlyFee: totalMonthly,
      estimatedParticipationFee: participation.amount,
      status,
    };

    const updated = [newCotacao, ...cotacoes];
    setCotacoes(updated);
    saveLocalData(companyId || "default", "cotacoes", updated);
    toast.success("Cotação salva com sucesso!");
    return newCotacao;
  };

  // Enviar WhatsApp da Cotação
  const handleSendWhatsApp = () => {
    const cotacao = handleSaveCotacao("enviada");
    if (!cotacao) return;

    const message = generateCotacaoWhatsAppMessage(cotacao, companyName || "Planmais");
    const cleanPhone = memberPhone.replace(/\D/g, "");
    const url = cleanPhone
      ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Efetivar Diretamente
  const handleEfetivar = async () => {
    if (!memberName.trim() || !memberDocument.trim()) {
      toast.error("Preencha ao menos Nome e CPF/CNPJ para efetivar o cadastro.");
      return;
    }

    const cotacao = handleSaveCotacao("efetivada");
    if (!cotacao) return;

    await upsertMutation.mutateAsync({
      data: {
        companyId: companyId!,
        name: memberName,
        document: memberDocument.replace(/\D/g, ""),
        email: memberEmail || undefined,
        phone: memberPhone.replace(/\D/g, "") || undefined,
        partner_id: consultantId || undefined,
        vehicle: {
          plate: vehiclePlate ? vehiclePlate.toUpperCase().trim() : undefined,
          brand: vehicleBrand,
          model: vehicleModel,
          year: Number(vehicleYear) || undefined,
          category: vehicleType === "moto" ? "Motocicletas" : vehicleType === "pesado" ? "Pesados" : "Leves e utilitários",
          monthly_fee: totalMonthly,
          fipe_value: fipeValue,
        },
      },
    });
  };

  return (
    <AppLayout
      title="Iniciar Cotação"
      subtitle="Simulação em tempo real, seleção de coberturas e envio imediato de proposta"
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Navegação entre Nova Cotação e Histórico */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-auto">
            <TabsList className="bg-muted/70 p-1 rounded-xl">
              <TabsTrigger value="formulario" className="rounded-lg text-xs font-bold gap-1.5 px-4">
                <Calculator className="size-3.5" />
                <span>Nova Cotação</span>
              </TabsTrigger>
              <TabsTrigger value="historico" className="rounded-lg text-xs font-bold gap-1.5 px-4">
                <Clock className="size-3.5" />
                <span>Cotações Recentes ({cotacoes.length})</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setMemberName("");
                setMemberDocument("");
                setMemberPhone("");
                setVehiclePlate("");
                setVehicleBrand("");
                setVehicleModel("");
                setRawFipe("50000");
                toast.info("Campos redefinidos para nova cotação.");
              }}
              className="rounded-xl text-xs"
            >
              Limpar Campos
            </Button>
          </div>
        </div>

        {activeTab === "historico" ? (
          <Card className="rounded-2xl border border-border/80 shadow-sm">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Clock className="size-4 text-primary" />
                <span>Histórico de Cotações Geradas</span>
              </CardTitle>
              <CardDescription>
                Acompanhe o status e envie novamente propostas para os associados
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              {cotacoes.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  Nenhuma cotação salva até o momento.
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {cotacoes.map((c) => (
                    <div key={c.id} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">{c.memberName}</span>
                          <Badge variant="outline" className="text-[10px] uppercase font-mono">
                            {c.vehiclePlate}
                          </Badge>
                          <Badge
                            className={
                              c.status === "efetivada"
                                ? "bg-emerald-500 text-white text-[10px]"
                                : c.status === "enviada"
                                ? "bg-blue-500 text-white text-[10px]"
                                : "bg-muted text-muted-foreground text-[10px]"
                            }
                          >
                            {c.status.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {c.vehicleBrand} {c.vehicleModel} ({c.vehicleYear}) • FIPE: {BRL(c.vehicleFipeValue)} • Vencimento: Dia {c.preferredDueDay}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-sm font-extrabold text-foreground">{BRL(c.totalMonthlyFee)}/mês</div>
                          <div className="text-[10px] text-muted-foreground">Franquia: {BRL(c.estimatedParticipationFee)}</div>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const msg = generateCotacaoWhatsAppMessage(c, companyName || "Planmais");
                            const clean = c.memberPhone.replace(/\D/g, "");
                            window.open(`https://wa.me/55${clean}?text=${encodeURIComponent(msg)}`, "_blank");
                          }}
                          className="rounded-xl text-xs gap-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                        >
                          <MessageCircle className="size-3.5" />
                          <span>WhatsApp</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* COLUNA ESQUERDA: FORMULÁRIOS (8 colunas) */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-6">
              {/* ETAPA 1: DADOS DO ASSOCIADO */}
              <Card className="rounded-2xl border border-border/80 shadow-sm overflow-hidden">
                <CardHeader className="p-5 pb-3 border-b border-border/60 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                      <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                        1
                      </div>
                      <span>Dados do Associado / Proponente</span>
                    </CardTitle>
                    <span className="text-[11px] text-muted-foreground font-medium">Auto-preenchimento e manual</span>
                  </div>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs font-semibold">Nome Completo do Associado *</Label>
                      <Input
                        value={memberName}
                        onChange={(e) => setMemberName(e.target.value)}
                        placeholder="Ex: Carlos Eduardo de Oliveira"
                        className="rounded-xl text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">CPF ou CNPJ</Label>
                      <Input
                        value={memberDocument}
                        onChange={(e) => setMemberDocument(formatCpfCnpj(e.target.value))}
                        placeholder="000.000.000-00"
                        className="rounded-xl text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Telefone / WhatsApp *</Label>
                      <Input
                        value={memberPhone}
                        onChange={(e) => setMemberPhone(formatPhone(e.target.value))}
                        placeholder="(00) 00000-0000"
                        className="rounded-xl text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">E-mail</Label>
                      <Input
                        type="email"
                        value={memberEmail}
                        onChange={(e) => setMemberEmail(e.target.value)}
                        placeholder="cliente@email.com"
                        className="rounded-xl text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Consultor Responsável</Label>
                      <Select value={consultantId} onValueChange={setConsultantId}>
                        <SelectTrigger className="rounded-xl text-xs">
                          <SelectValue placeholder="Selecione o consultor..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="none">Nenhum / Venda Direta</SelectItem>
                          {partners.map((p: any) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} {p.split_percent ? `(${p.split_percent}%)` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Vencimento Preferencial do Boleto</Label>
                      <Select
                        value={String(preferredDueDay)}
                        onValueChange={(v) => setPreferredDueDay(Number(v))}
                      >
                        <SelectTrigger className="rounded-xl text-xs font-bold text-primary">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl font-medium">
                          <SelectItem value="5">Dia 05 de cada mês</SelectItem>
                          <SelectItem value="10">Dia 10 de cada mês</SelectItem>
                          <SelectItem value="15">Dia 15 de cada mês</SelectItem>
                          <SelectItem value="20">Dia 20 de cada mês (Recomendado)</SelectItem>
                          <SelectItem value="25">Dia 25 de cada mês</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Endereço com busca CEP e edição manual completa */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold flex items-center justify-between">
                        <span>CEP</span>
                        {loadingCep && <span className="text-[10px] text-primary animate-pulse">Buscando endereço...</span>}
                      </Label>
                      <Input
                        value={memberCep}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMemberCep(val);
                          if (val.replace(/\D/g, "").length === 8) {
                            handleCepSearch(val);
                          }
                        }}
                        placeholder="00000-000"
                        className="rounded-xl text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs font-semibold">Logradouro / Rua (Editável)</Label>
                      <Input
                        value={memberAddress}
                        onChange={(e) => setMemberAddress(e.target.value)}
                        placeholder="Rua, Avenida, Praça..."
                        className="rounded-xl text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Número</Label>
                      <Input
                        value={memberNumber}
                        onChange={(e) => setMemberNumber(e.target.value)}
                        placeholder="Ex: 123"
                        className="rounded-xl text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Bairro</Label>
                      <Input
                        value={memberNeighborhood}
                        onChange={(e) => setMemberNeighborhood(e.target.value)}
                        placeholder="Bairro"
                        className="rounded-xl text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Cidade</Label>
                      <Input
                        value={memberCity}
                        onChange={(e) => setMemberCity(e.target.value)}
                        placeholder="Cidade"
                        className="rounded-xl text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">UF / Estado</Label>
                      <Input
                        value={memberState}
                        onChange={(e) => setMemberState(e.target.value)}
                        placeholder="UF"
                        maxLength={2}
                        className="rounded-xl text-xs uppercase"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ETAPA 2: DADOS DO VEÍCULO */}
              <Card className="rounded-2xl border border-border/80 shadow-sm overflow-hidden">
                <CardHeader className="p-5 pb-3 border-b border-border/60 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                      <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                        2
                      </div>
                      <span>Dados do Veículo</span>
                    </CardTitle>
                    <MercosulPlatePreview plate={vehiclePlate} />
                  </div>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5 sm:col-span-3">
                      <Label className="text-xs font-semibold">Tipo do Veículo</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { id: "carro", label: "Carro / SUV", icon: Car },
                          { id: "moto", label: "Motocicleta", icon: Sparkles },
                          { id: "utilitario", label: "Utilitário / Van", icon: Car },
                          { id: "pesado", label: "Caminhão / Pesado", icon: ShieldCheck },
                        ].map((t) => (
                          <Button
                            key={t.id}
                            type="button"
                            variant={vehicleType === t.id ? "default" : "outline"}
                            size="sm"
                            onClick={() => setVehicleType(t.id as VehicleType)}
                            className="rounded-xl text-xs font-bold gap-2 h-10"
                          >
                            <t.icon className="size-4" />
                            <span>{t.label}</span>
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Placa do Veículo</Label>
                      <Input
                        value={vehiclePlate}
                        onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                        placeholder="ABC-1234 ou BRA2E19"
                        maxLength={8}
                        className="rounded-xl text-xs font-mono font-bold uppercase"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Marca</Label>
                      <Input
                        value={vehicleBrand}
                        onChange={(e) => setVehicleBrand(e.target.value)}
                        placeholder="Ex: Toyota, Fiat, Honda"
                        className="rounded-xl text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Modelo</Label>
                      <Input
                        value={vehicleModel}
                        onChange={(e) => setVehicleModel(e.target.value)}
                        placeholder="Ex: Corolla XEi 2.0"
                        className="rounded-xl text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Ano de Fabricação / Modelo</Label>
                      <Input
                        value={vehicleYear}
                        onChange={(e) => setVehicleYear(e.target.value)}
                        placeholder="Ex: 2022"
                        className="rounded-xl text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Cor</Label>
                      <Input
                        value={vehicleColor}
                        onChange={(e) => setVehicleColor(e.target.value)}
                        placeholder="Ex: Preto, Prata, Branco"
                        className="rounded-xl text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Finalidade de Uso</Label>
                      <Select
                        value={vehicleUsage}
                        onValueChange={(v: any) => setVehicleUsage(v)}
                      >
                        <SelectTrigger className="rounded-xl text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="particular">Passeio / Particular</SelectItem>
                          <SelectItem value="app">Aplicativo (Uber/99)</SelectItem>
                          <SelectItem value="comercial">Comercial / Empresa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5 sm:col-span-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-foreground">
                          Valor de Avaliação / Tabela FIPE (R$)
                        </Label>
                        <span className="text-xs font-extrabold text-primary font-mono">
                          {BRL(fipeValue)}
                        </span>
                      </div>
                      <Input
                        value={rawFipe}
                        onChange={(e) => setRawFipe(formatCurrencyInput(e.target.value))}
                        placeholder="R$ 50.000,00"
                        className="rounded-xl text-sm font-bold font-mono"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        A cota de participação e a mensalidade base são calculadas automaticamente com base neste valor.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ETAPA 3: PRODUTOS E COBERTURAS ADICIONAIS */}
              <Card className="rounded-2xl border border-border/80 shadow-sm overflow-hidden">
                <CardHeader className="p-5 pb-3 border-b border-border/60 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                      <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                        3
                      </div>
                      <span>Produtos & Coberturas Contratadas</span>
                    </CardTitle>
                    <span className="text-[11px] text-muted-foreground font-semibold">
                      {selectedProductIds.length} selecionados
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-5 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {applicableProducts.map((p) => {
                      const isSelected = selectedProductIds.includes(p.id);
                      return (
                        <div
                          key={p.id}
                          onClick={() => toggleProduct(p.id)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-2 select-none ${
                            isSelected
                              ? "bg-primary/5 border-primary shadow-xs ring-1 ring-primary/30"
                              : "bg-card border-border/70 hover:border-border hover:bg-muted/40"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-foreground leading-tight">
                                  {p.name}
                                </span>
                                {p.isRequired && (
                                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
                                    Incluso
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">
                                {p.description}
                              </p>
                            </div>

                            <div
                              className={`size-5 rounded-md flex items-center justify-center shrink-0 border transition-colors ${
                                isSelected
                                  ? "bg-primary border-primary text-primary-foreground"
                                  : "border-border bg-background"
                              }`}
                            >
                              {isSelected && <Check className="size-3 stroke-[3]" />}
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px]">
                            <span className="text-muted-foreground font-medium">
                              {p.coverageLimit || "Cobertura Padrão"}
                            </span>
                            <span className="font-extrabold text-foreground font-mono">
                              {p.isRequired ? "Incluso na Base" : `+ ${BRL(p.monthlyFee)}/mês`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* COLUNA DIREITA: RESUMO AO VIVO DA COTAÇÃO & AÇÕES (4 colunas) */}
            <div className="lg:col-span-5 xl:col-span-4 sticky top-20 space-y-4">
              <Card className="rounded-2xl border-2 border-primary/40 shadow-lg bg-card overflow-hidden">
                <div className="bg-gradient-to-br from-primary via-primary/95 to-primary/80 p-5 text-primary-foreground">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold tracking-wider uppercase opacity-90">
                      Resumo da Proposta
                    </span>
                    <Badge className="bg-white/20 hover:bg-white/30 text-white font-mono text-[10px] border-none">
                      {vehicleType.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="mt-3">
                    <span className="text-xs opacity-80 block">Mensalidade Total da Proteção:</span>
                    <div className="text-3xl font-black tracking-tight font-mono">
                      {BRL(totalMonthly)}
                      <span className="text-sm font-normal opacity-80"> /mês</span>
                    </div>
                  </div>
                </div>

                <CardContent className="p-5 space-y-4 text-xs">
                  {/* Detalhamento de Valores */}
                  <div className="space-y-2 pb-3 border-b border-border/60">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Mensalidade Base ({vehicleType}):</span>
                      <span className="font-bold text-foreground font-mono">{BRL(baseMonthly)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Adicionais Contratados:</span>
                      <span className="font-bold text-foreground font-mono">+{BRL(productsTotal)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-dashed border-border/60">
                      <span className="font-semibold text-foreground">Total Mensalidade:</span>
                      <span className="font-extrabold text-primary font-mono text-sm">{BRL(totalMonthly)}</span>
                    </div>
                  </div>

                  {/* Cota de Participação (Franquia) */}
                  <div className="p-3.5 rounded-xl bg-muted/50 border border-border/60 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground flex items-center gap-1.5">
                        <ShieldCheck className="size-4 text-primary" /> Cota de Participação
                      </span>
                      <Badge variant="outline" className="text-[10px] font-bold">
                        {participation.percentage}%
                      </Badge>
                    </div>
                    <div className="text-lg font-black text-foreground font-mono">
                      {BRL(participation.amount)}
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      {participation.description}
                    </p>
                  </div>

                  {/* Resumo do Proponente */}
                  <div className="space-y-1.5 text-muted-foreground text-[11px]">
                    <div className="flex justify-between">
                      <span>Proponente:</span>
                      <span className="font-semibold text-foreground truncate max-w-[160px]">
                        {memberName || "Não informado"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Veículo / Placa:</span>
                      <span className="font-semibold text-foreground">
                        {vehicleBrand || "Veículo"} • {vehiclePlate || "A DEFINIR"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Vencimento Boleto:</span>
                      <span className="font-bold text-primary">Dia {preferredDueDay} de cada mês</span>
                    </div>
                  </div>

                  {/* Botões de Ação */}
                  <div className="space-y-2 pt-2">
                    <Button
                      onClick={handleSendWhatsApp}
                      className="w-full rounded-xl font-bold text-xs h-10 bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-sm"
                    >
                      <MessageCircle className="size-4" />
                      <span>Enviar Proposta via WhatsApp</span>
                    </Button>

                    <Button
                      onClick={handleEfetivar}
                      disabled={upsertMutation.isPending}
                      className="w-full rounded-xl font-bold text-xs h-10 bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                    >
                      {upsertMutation.isPending ? (
                        <span>Efetivando Cadastro...</span>
                      ) : (
                        <>
                          <CheckCircle2 className="size-4" />
                          <span>Efetivar como Associado & Veículo</span>
                        </>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => handleSaveCotacao("rascunho")}
                      className="w-full rounded-xl text-xs h-9 gap-1.5"
                    >
                      <Save className="size-3.5" />
                      <span>Salvar Cotação como Rascunho</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
