import { supabase } from "@/integrations/supabase/client";
import { createFileRoute } from '@tanstack/react-router';
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect, useRef } from "react";
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
  AlertCircle,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
import { lookupVehicleByPlate, formatPlate, PlateLookupData } from "@/lib/plate";
import { VehiclePlateBadge } from "@/routes/vehicles";
import { BRL, formatCpfCnpj, formatPhone, formatCurrencyInput } from "@/lib/format";
import {
  type VehicleType,
  type CotacaoItem,
  type ProdutoVeicular,
  DEFAULT_PRODUTOS_VEICULARES,
  DEFAULT_COTAS_PARTICIPACAO,
  COTACAO_PLANOS_PRESETS,
  type CotacaoPlanoPreset,
  calculateParticipationFee,
  calculateBaseMonthlyFee,
  loadLocalData,
  saveLocalData,
  saveMemberExtraData,
  saveVehicleExtraData,
  setMemberDueDay,
  type CustomCoverageItem,
  generateCotacaoWhatsAppMessage
} from "@/lib/veicular";

interface CotacaoSearch {
  cotacaoId?: string;
  id?: string;
  plate?: string;
  tab?: string;
}

export const Route = createFileRoute('/veicular/cotacao')({
  validateSearch: (search: Record<string, unknown>): CotacaoSearch => ({
    cotacaoId: (search.cotacaoId || search.id) as string | undefined,
    id: (search.id || search.cotacaoId) as string | undefined,
    plate: search.plate as string | undefined,
    tab: search.tab as string | undefined,
  }),
  head: () => ({
    meta: [{ title: "Iniciar Cotação | Planmais Proteção Veicular" }],
  }),
  component: CotacaoPage,
});


function CotacaoPage() {
  const search = Route.useSearch();
  const { companyId, companyName } = useAuth();
  const qc = useQueryClient();

  const [reviewCotacao, setReviewCotacao] = useState<CotacaoItem | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [efetivandoCotacao, setEfetivandoCotacao] = useState(false);

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

  // Cotações salvas (mesclando cache local da empresa e cache default)
  const [cotacoes, setCotacoes] = useState<CotacaoItem[]>(() => {
    const listCompany = loadLocalData<CotacaoItem[]>(companyId || "default", "cotacoes", []);
    const listDefault = companyId && companyId !== "default" ? loadLocalData<CotacaoItem[]>("default", "cotacoes", []) : [];
    const ids = new Set(listCompany.map((c) => c.id));
    return [...listCompany, ...listDefault.filter((c) => !ids.has(c.id))];
  });

  // Cotações sincronizadas do banco de dados (vehicle_quotes)
  useEffect(() => {
    const listCompany = loadLocalData<CotacaoItem[]>(companyId || "default", "cotacoes", []);
    const listDefault = loadLocalData<CotacaoItem[]>("default", "cotacoes", []);
    setCotacoes((prev) => {
      const ids = new Set(prev.map((c) => c.id));
      const combined = [
        ...prev,
        ...listCompany.filter((c) => !ids.has(c.id)),
        ...listDefault.filter((c) => !ids.has(c.id)),
      ];
      combined.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      return combined;
    });

    let query = supabase.from("vehicle_quotes").select("payload").order("created_at", { ascending: false }).limit(60);
    if (companyId && companyId !== "default") {
      query = query.eq("company_id", companyId);
    }
    query.then(({ data }) => {
      const remote = (data || []).map((r) => r.payload as unknown as CotacaoItem).filter(Boolean);
      if (!remote.length) return;
      setCotacoes((prev) => {
        const ids = new Set(prev.map((c) => c.id));
        const merged = [...remote.filter((c) => !ids.has(c.id)), ...prev];
        merged.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
        return merged;
      });
    });
  }, [companyId]);

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
  const [selectedPlanId, setSelectedPlanId] = useState<string>("plano-completo");
  const [searchingPlate, setSearchingPlate] = useState(false);

  const hasAutoOpenedRef = useRef<string | null>(null);

  // Monitora parâmetros de URL (?cotacaoId=... ou ?plate=...) para abrir cotação recebida em nova aba
  useEffect(() => {
    const targetId = search.cotacaoId || search.id;
    const targetPlate = search.plate ? search.plate.replace(/[^A-Za-z0-9]/g, "").toUpperCase() : undefined;
    const key = targetId || targetPlate;

    if (!key && !search.tab) return;

    if (search.tab === "historico" || key) {
      setActiveTab("historico");
    }

    if (!key || hasAutoOpenedRef.current === key) return;

    // 1. Procura na lista de cotações já carregadas
    const found = cotacoes.find(
      (c) =>
        (targetId && c.id === targetId) ||
        (targetPlate && c.vehiclePlate?.replace(/[^A-Za-z0-9]/g, "").toUpperCase() === targetPlate)
    );

    if (found) {
      setReviewCotacao(found);
      setReviewDialogOpen(true);
      hasAutoOpenedRef.current = key;
      return;
    }

    // 2. Se ainda não carregou localmente, busca direto do banco de dados (vehicle_quotes)
    const query = supabase.from("vehicle_quotes").select("payload");
    const fetchPromise = targetId
      ? query.eq("id", targetId).maybeSingle()
      : query.order("created_at", { ascending: false }).limit(40);

    fetchPromise.then(({ data }) => {
      if (Array.isArray(data)) {
        const match = data.find((row) => {
          const item = row.payload as unknown as CotacaoItem;
          return targetPlate && item?.vehiclePlate?.replace(/[^A-Za-z0-9]/g, "").toUpperCase() === targetPlate;
        });
        if (match?.payload) {
          const item = match.payload as unknown as CotacaoItem;
          setReviewCotacao(item);
          setReviewDialogOpen(true);
          hasAutoOpenedRef.current = key;
          setCotacoes((prev) => (prev.some((c) => c.id === item.id) ? prev : [item, ...prev]));
        }
      } else if (data?.payload) {
        const item = data.payload as unknown as CotacaoItem;
        setReviewCotacao(item);
        setReviewDialogOpen(true);
        hasAutoOpenedRef.current = key;
        setCotacoes((prev) => (prev.some((c) => c.id === item.id) ? prev : [item, ...prev]));
      }
    });
  }, [search.cotacaoId, search.id, search.plate, search.tab, cotacoes]);

  const handlePlateSearch = async (val: string) => {
    const clean = (val || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    if (clean.length < 7) return;

    setSearchingPlate(true);
    try {
      const data = await lookupVehicleByPlate(clean);
      if (data) {
        setVehiclePlate(clean);
        if (data.brand) setVehicleBrand(data.brand);
        if (data.model) setVehicleModel(data.model);
        if (data.year) setVehicleYear(String(data.year));
        if (data.color) setVehicleColor(data.color);
        if (data.category) setVehicleType(data.category);
        if (data.fipeValue) setRawFipe(String(Math.round(data.fipeValue * 100)));
        toast.success("Dados do veículo preenchidos pela placa!", {
          description: `${data.brand} ${data.model} (${data.year})`,
        });
      }
    } finally {
      setSearchingPlate(false);
    }
  };

  const handleCopyPublicLink = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const publicUrl = `${origin}/public/cotacao`;
    navigator.clipboard.writeText(publicUrl);
    toast.success("Link copiado com sucesso!", {
      description: "Envie este link externo para o cliente realizar a cotação online.",
    });
  };

  const handleSelectPlanPreset = (presetId: string) => {
    setSelectedPlanId(presetId);
    const plan = COTACAO_PLANOS_PRESETS.find((p) => p.id === presetId);
    if (plan) {
      setSelectedProductIds(plan.productIds);
      toast.info(`Plano "${plan.name}" selecionado.`);
    }
  };

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
    if (companyId && companyId !== "default") {
      supabase.from("vehicle_quotes").upsert({
        id: newCotacao.id,
        company_id: companyId,
        payload: newCotacao as never,
      }).then(({ error }) => {
        if (error) console.error("vehicle_quotes upsert error", error);
      });
    }
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

  // Efetivar Diretamente pelo formulário
  const handleEfetivar = async () => {
    if (!memberName.trim() || !memberDocument.trim()) {
      toast.error("Preencha ao menos Nome e CPF/CNPJ para efetivar o cadastro.");
      return;
    }

    const cotacao = handleSaveCotacao("efetivada");
    if (!cotacao) return;

    const res = await upsertMutation.mutateAsync({
      data: {
        companyId: companyId!,
        name: memberName,
        document: memberDocument.replace(/\D/g, ""),
        email: memberEmail || undefined,
        phone: memberPhone.replace(/\D/g, "") || undefined,
        partner_id: consultantId || undefined,
        monthly_fee: totalMonthly,
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

    if (res?.id) {
      setMemberDueDay(companyId || "default", res.id, preferredDueDay);
      saveMemberExtraData(companyId || "default", res.id, {
        cep: memberCep,
        address: memberAddress,
        number: memberNumber,
        complement: memberComplement,
        neighborhood: memberNeighborhood,
        city: memberCity,
        state: memberState,
        dueDay: preferredDueDay,
        preferredDueDay,
        customMonthlyFee: totalMonthly,
        manualMonthlyFee: totalMonthly,
      });
    }

    if (vehiclePlate) {
      const coveragesList: CustomCoverageItem[] = (selectedProductIds || []).map((id) => {
        const p = produtos.find((x) => x.id === id);
        return {
          id,
          name: p?.name || id,
          limit: p?.coverageLimit,
          monthlyFee: p?.monthlyFee || 0,
          isActive: true,
        };
      });
      saveVehicleExtraData(companyId || "default", undefined, vehiclePlate, {
        chassi: vehicleChassi,
        color: vehicleColor,
        fipeValue,
        coveragePlan: COTACAO_PLANOS_PRESETS.find((p) => p.id === selectedPlanId)?.name || "Plano Personalizado",
        customCoverages: coveragesList,
      });
    }
  };

  // Efetivar Cotação diretamente a partir do Modal de Conferência
  const handleEfetivarFromReview = async (target: CotacaoItem) => {
    if (!target.memberName?.trim() || !target.memberDocument?.trim()) {
      toast.error("A cotação precisa conter ao menos Nome e CPF/CNPJ do proponente.");
      return;
    }

    setEfetivandoCotacao(true);
    try {
      const res = await upsertMutation.mutateAsync({
        data: {
          companyId: companyId!,
          name: target.memberName,
          document: target.memberDocument.replace(/\D/g, ""),
          email: target.memberEmail || undefined,
          phone: target.memberPhone.replace(/\D/g, "") || undefined,
          partner_id: target.consultantId || undefined,
          monthly_fee: target.totalMonthlyFee,
          vehicle: {
            plate: target.vehiclePlate ? target.vehiclePlate.toUpperCase().trim() : undefined,
            brand: target.vehicleBrand,
            model: target.vehicleModel,
            year: Number(target.vehicleYear) || undefined,
            category:
              target.vehicleType === "moto"
                ? "Motocicletas"
                : target.vehicleType === "pesado"
                ? "Pesados"
                : "Leves e utilitários",
            monthly_fee: target.totalMonthlyFee,
            fipe_value: target.vehicleFipeValue,
          },
        },
      });

      // Salva dados extras do associado (endereço, dia de vencimento, mensalidade fixada)
      if (res?.id) {
        setMemberDueDay(companyId || "default", res.id, target.preferredDueDay || 20);
        saveMemberExtraData(companyId || "default", res.id, {
          cep: target.memberCep,
          address: target.memberAddress,
          number: target.memberNumber,
          complement: target.memberComplement,
          neighborhood: target.memberNeighborhood,
          city: target.memberCity,
          state: target.memberState,
          dueDay: target.preferredDueDay,
          preferredDueDay: target.preferredDueDay,
          customMonthlyFee: target.totalMonthlyFee,
          manualMonthlyFee: target.totalMonthlyFee,
        });
      }

      // Salva dados extras do veículo (placa, chassi, cor, plano, coberturas)
      if (target.vehiclePlate) {
        const coveragesList: CustomCoverageItem[] = (target.selectedProducts || []).map((id) => {
          const p = produtos.find((x) => x.id === id);
          return {
            id,
            name: p?.name || id,
            limit: p?.coverageLimit,
            monthlyFee: p?.monthlyFee || 0,
            isActive: true,
          };
        });
        saveVehicleExtraData(companyId || "default", undefined, target.vehiclePlate, {
          chassi: target.vehicleChassi,
          color: target.vehicleColor,
          fipeValue: target.vehicleFipeValue,
          coveragePlan: target.planName,
          customCoverages: coveragesList,
        });
      }

      // Atualiza status da cotação no Supabase vehicle_quotes
      await supabase
        .from("vehicle_quotes")
        .update({ payload: { ...target, status: "efetivada" } as never })
        .eq("id", target.id);

      // Atualiza lista local
      const updatedList = cotacoes.map((c) =>
        c.id === target.id ? { ...c, status: "efetivada" as const } : c
      );
      setCotacoes(updatedList);
      saveLocalData(companyId || "default", "cotacoes", updatedList);
      setReviewCotacao((prev) => (prev ? { ...prev, status: "efetivada" } : null));

      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["vehicles"] });

      toast.success("Cotação conferida e efetivada com sucesso!", {
        description: `Associado ${target.memberName} e veículo ${target.vehiclePlate} cadastrados na plataforma com mensalidade de ${BRL(target.totalMonthlyFee)}/mês.`,
      });
    } catch (err: any) {
      toast.error("Erro ao efetivar cotação: " + (err.message || "Erro desconhecido"));
    } finally {
      setEfetivandoCotacao(false);
    }
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

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="default"
              size="sm"
              onClick={handleCopyPublicLink}
              className="rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-xs"
            >
              <Copy className="size-3.5" />
              <span>Copiar Link de Cotação Externa</span>
            </Button>

            <a
              href="/public/cotacao"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/80 bg-background hover:bg-muted text-xs font-semibold text-foreground transition-colors shadow-2xs"
            >
              <ExternalLink className="size-3 text-muted-foreground" />
              <span>Abrir Formulário Externo</span>
            </a>

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
                                : c.status === "aguardando_aceite"
                                ? "bg-amber-500 text-slate-950 font-bold text-[10px]"
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

                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const targetUrl = `/veicular/cotacao?tab=historico&cotacaoId=${encodeURIComponent(c.id)}`;
                              window.open(targetUrl, "_blank", "noopener,noreferrer");
                            }}
                            className="rounded-xl text-xs gap-1.5 font-semibold text-primary hover:text-primary hover:bg-primary/10 border-primary/30 shadow-2xs"
                            title="Abrir esta cotação em uma nova guia para conferência detalhada"
                          >
                            <ExternalLink className="size-3.5" />
                            <span>Abrir em Nova Guia</span>
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setReviewCotacao(c);
                              setReviewDialogOpen(true);
                            }}
                            className="rounded-xl text-xs gap-1.5 font-semibold text-muted-foreground hover:text-foreground"
                            title="Conferir todos os dados nesta tela"
                          >
                            <Eye className="size-3.5 text-primary" />
                            <span>Conferir Dados</span>
                          </Button>

                          {c.status === "aguardando_aceite" && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setReviewCotacao(c);
                                setReviewDialogOpen(true);
                              }}
                              className="rounded-xl text-xs font-bold gap-1 bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs"
                            >
                              <CheckCircle2 className="size-3.5" />
                              <span>Conferir & Efetivar Aceite</span>
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const msg = generateCotacaoWhatsAppMessage(c, companyName || "Planmais");
                              const clean = c.memberPhone.replace(/\D/g, "");
                              window.open(`https://wa.me/55${clean}?text=${encodeURIComponent(msg)}`, "_blank");
                            }}
                            className="rounded-xl text-xs gap-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border-emerald-500/30"
                          >
                            <MessageCircle className="size-3.5" />
                            <span>WhatsApp</span>
                          </Button>
                        </div>
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
                    <VehiclePlateBadge plate={vehiclePlate || "PLACA"} size="md" />
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
                      <div className="relative">
                        <Input
                          value={vehiclePlate}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
                            setVehiclePlate(val);
                            if (val.length === 7) handlePlateSearch(val);
                          }}
                          onBlur={(e) => handlePlateSearch(e.target.value)}
                          placeholder="ABC1234 ou BRA2E19"
                          maxLength={7}
                          className="rounded-xl text-xs font-mono font-bold uppercase pr-7"
                        />
                        <button
                          type="button"
                          onClick={() => handlePlateSearch(vehiclePlate)}
                          title="Buscar placa automaticamente"
                          className="absolute right-2 top-2 text-primary hover:text-primary/80"
                        >
                          <Sparkles className="size-3.5" />
                        </button>
                      </div>
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
                <CardContent className="p-5 space-y-4">
                  {/* Atalho de Planos Pré-definidos */}
                  <div className="space-y-1.5 pb-2 border-b border-border/60">
                    <Label className="text-xs font-bold text-foreground">Escolher Modelo de Plano Rápido:</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {COTACAO_PLANOS_PRESETS.map((preset) => {
                        const isSelected = selectedPlanId === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => handleSelectPlanPreset(preset.id)}
                            className={`p-2.5 rounded-xl border text-left transition-all ${
                              isSelected
                                ? "bg-primary/10 border-primary ring-1 ring-primary/40 font-bold"
                                : "bg-muted/30 border-border/70 hover:bg-muted/60"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-foreground">{preset.name}</span>
                              {preset.recommended && (
                                <Badge className="bg-primary text-primary-foreground text-[8px] py-0 px-1">
                                  Top
                                </Badge>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                              {preset.description}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

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
        {/* MODAL DE CONFERÊNCIA COMPLETA DA COTAÇÃO (ABERTO VIA NOTIFICAÇÃO OU CLIQUE DIRETO) */}
        <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
          <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto p-0 rounded-2xl border border-border/80 shadow-2xl">
            {reviewCotacao && (
              <div>
                {/* CABEÇALHO */}
                <div className="p-6 border-b border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="size-11 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20 shadow-xs">
                      <Sparkles className="size-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <DialogTitle className="text-lg font-bold text-foreground">
                          Conferência Completa de Cotação
                        </DialogTitle>
                        <Badge
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider",
                            reviewCotacao.status === "efetivada"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                              : reviewCotacao.status === "aguardando_aceite"
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-extrabold animate-pulse"
                              : "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                          )}
                        >
                          {reviewCotacao.status === "aguardando_aceite"
                            ? "Aguardando Conferência & Aceite"
                            : reviewCotacao.status.toUpperCase()}
                        </Badge>
                      </div>
                      <DialogDescription className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                        <span>Protocolo: <strong className="font-mono text-foreground">{reviewCotacao.id}</strong></span>
                        <span>•</span>
                        <span>Recebida em {reviewCotacao.createdAt ? new Date(reviewCotacao.createdAt).toLocaleString("pt-BR") : "Recentemente"}</span>
                      </DialogDescription>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl text-xs gap-1.5"
                      onClick={() => {
                        const targetUrl = `/veicular/cotacao?tab=historico&cotacaoId=${encodeURIComponent(reviewCotacao.id)}`;
                        window.open(targetUrl, "_blank", "noopener,noreferrer");
                      }}
                      title="Abrir esta cotação em uma nova guia separada"
                    >
                      <ExternalLink className="size-3.5 text-primary" />
                      <span>Abrir em Nova Guia</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl text-xs gap-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border-emerald-500/30"
                      onClick={() => {
                        const msg = generateCotacaoWhatsAppMessage(reviewCotacao, companyName || "Planmais");
                        const clean = reviewCotacao.memberPhone.replace(/\D/g, "");
                        window.open(`https://wa.me/55${clean}?text=${encodeURIComponent(msg)}`, "_blank");
                      }}
                    >
                      <MessageCircle className="size-3.5" />
                      <span>WhatsApp Proponente</span>
                    </Button>
                  </div>
                </div>

                {/* CORPO DE DADOS */}
                <div className="p-6 space-y-6">
                  {/* BANNER DE DESTAQUE COM VALOR */}
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="size-4 text-primary" />
                        <span className="text-xs font-bold uppercase tracking-wider text-primary">Plano Selecionado</span>
                      </div>
                      <p className="text-base font-extrabold text-foreground">{reviewCotacao.planName || "Plano Completo"}</p>
                      <p className="text-xs text-muted-foreground">
                        Veículo {reviewCotacao.vehicleBrand} {reviewCotacao.vehicleModel} ({reviewCotacao.vehicleYear}) • Franquia Estimada: {BRL(reviewCotacao.estimatedParticipationFee)}
                      </p>
                    </div>
                    <div className="sm:text-right shrink-0">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase block">Mensalidade da Proteção</span>
                      <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                        {BRL(reviewCotacao.totalMonthlyFee)}
                        <span className="text-xs font-normal text-muted-foreground">/mês</span>
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* CARD 1: DADOS DO ASSOCIADO / PROPONENTE */}
                    <div className="rounded-xl border border-border/70 p-4 space-y-3 bg-card">
                      <div className="flex items-center justify-between border-b border-border/50 pb-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                          <User className="size-4 text-primary" />
                          <span>Proponente / Associado</span>
                        </div>
                        <Badge variant="outline" className="text-[10px]">Pessoa Física/Jurídica</Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="col-span-2">
                          <span className="text-muted-foreground block text-[11px]">Nome Completo:</span>
                          <span className="font-bold text-foreground text-sm">{reviewCotacao.memberName}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">CPF / CNPJ:</span>
                          <span className="font-mono font-semibold text-foreground">{formatCpfCnpj(reviewCotacao.memberDocument)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">WhatsApp / Telefone:</span>
                          <span className="font-semibold text-foreground flex items-center gap-1">
                            <Phone className="size-3 text-emerald-500" />
                            {formatPhone(reviewCotacao.memberPhone)}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground block text-[11px]">E-mail:</span>
                          <span className="font-medium text-foreground">{reviewCotacao.memberEmail || "Não informado"}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground block text-[11px]">Endereço Completo:</span>
                          <span className="font-medium text-foreground">
                            {[
                              reviewCotacao.memberAddress,
                              reviewCotacao.memberNumber ? `nº ${reviewCotacao.memberNumber}` : null,
                              reviewCotacao.memberComplement,
                              reviewCotacao.memberNeighborhood,
                              reviewCotacao.memberCity && reviewCotacao.memberState
                                ? `${reviewCotacao.memberCity} - ${reviewCotacao.memberState}`
                                : reviewCotacao.memberCity,
                              reviewCotacao.memberCep ? `CEP ${reviewCotacao.memberCep}` : null,
                            ]
                              .filter(Boolean)
                              .join(", ") || "Endereço não informado"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Vencimento Preferencial:</span>
                          <Badge variant="secondary" className="font-bold text-[11px] mt-0.5">
                            Todo dia {reviewCotacao.preferredDueDay || 20}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Consultor Responsável:</span>
                          <span className="font-medium text-foreground mt-0.5 block truncate">
                            {reviewCotacao.consultantName || "Venda Direta / Sem indicação"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* CARD 2: DADOS TÉCNICOS DO VEÍCULO */}
                    <div className="rounded-xl border border-border/70 p-4 space-y-3 bg-card">
                      <div className="flex items-center justify-between border-b border-border/50 pb-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                          <Car className="size-4 text-primary" />
                          <span>Veículo Avaliado</span>
                        </div>
                        <VehiclePlateBadge plate={reviewCotacao.vehiclePlate} size="sm" />
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="col-span-2">
                          <span className="text-muted-foreground block text-[11px]">Marca & Modelo:</span>
                          <span className="font-bold text-foreground text-sm">
                            {reviewCotacao.vehicleBrand} {reviewCotacao.vehicleModel}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Ano / Modelo:</span>
                          <span className="font-semibold text-foreground">{reviewCotacao.vehicleYear}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Cor:</span>
                          <span className="font-semibold text-foreground">{reviewCotacao.vehicleColor || "Não informada"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Categoria:</span>
                          <span className="capitalize font-semibold text-foreground">{reviewCotacao.vehicleType}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Finalidade de Uso:</span>
                          <span className="capitalize font-semibold text-foreground">{reviewCotacao.vehicleUsage}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground block text-[11px]">Chassi:</span>
                          <span className="font-mono text-muted-foreground">{reviewCotacao.vehicleChassi || "A preencher na vistoria"}</span>
                        </div>
                        <div className="col-span-2 rounded-lg bg-muted/40 p-2.5 flex items-center justify-between border border-border/50">
                          <span className="text-[11px] font-semibold text-muted-foreground">Avaliação Tabela FIPE:</span>
                          <span className="font-mono font-extrabold text-foreground text-sm">{BRL(reviewCotacao.vehicleFipeValue)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CARD 3: COBERTURAS & PRODUTOS INCLUSOS */}
                  <div className="rounded-xl border border-border/70 p-4 space-y-3 bg-card">
                    <div className="flex items-center justify-between border-b border-border/50 pb-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                        <ShieldCheck className="size-4 text-emerald-500" />
                        <span>Coberturas Inclusas e Adicionais Selecionados</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground font-medium">
                        {reviewCotacao.selectedProducts?.length || 0} coberturas selecionadas
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
                      {produtos.map((prod) => {
                        const isSelected = (reviewCotacao.selectedProducts || []).includes(prod.id);
                        if (!isSelected && !prod.isRequired) return null;
                        return (
                          <div
                            key={prod.id}
                            className="flex items-start gap-2 p-2.5 rounded-lg border border-border/60 bg-muted/20"
                          >
                            <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate">{prod.name}</p>
                              <p className="text-[10px] text-muted-foreground line-clamp-1">{prod.description}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* RODAPÉ COM AÇÕES */}
                <div className="p-4 sm:p-6 border-t border-border/60 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setReviewDialogOpen(false)}
                    className="text-xs text-muted-foreground w-full sm:w-auto"
                  >
                    Fechar
                  </Button>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setMemberName(reviewCotacao.memberName);
                        setMemberDocument(reviewCotacao.memberDocument);
                        setMemberPhone(reviewCotacao.memberPhone);
                        setMemberEmail(reviewCotacao.memberEmail || "");
                        setMemberCep(reviewCotacao.memberCep || "");
                        setMemberAddress(reviewCotacao.memberAddress || "");
                        setMemberNumber(reviewCotacao.memberNumber || "");
                        setMemberComplement(reviewCotacao.memberComplement || "");
                        setMemberNeighborhood(reviewCotacao.memberNeighborhood || "");
                        setMemberCity(reviewCotacao.memberCity || "");
                        setMemberState(reviewCotacao.memberState || "");
                        setPreferredDueDay(reviewCotacao.preferredDueDay || 20);
                        setConsultantId(reviewCotacao.consultantId || "");
                        setVehiclePlate(reviewCotacao.vehiclePlate);
                        setVehicleBrand(reviewCotacao.vehicleBrand);
                        setVehicleModel(reviewCotacao.vehicleModel);
                        setVehicleYear(String(reviewCotacao.vehicleYear));
                        setVehicleColor(reviewCotacao.vehicleColor || "");
                        setVehicleChassi(reviewCotacao.vehicleChassi || "");
                        setVehicleType(reviewCotacao.vehicleType);
                        setRawFipe(String(Math.round((reviewCotacao.vehicleFipeValue || 50000) * 100)));
                        setSelectedProductIds(reviewCotacao.selectedProducts || []);
                        setReviewDialogOpen(false);
                        setActiveTab("formulario");
                        toast.info("Dados carregados no formulário de edição!");
                      }}
                      className="rounded-xl text-xs gap-1.5"
                    >
                      <FileText className="size-3.5" />
                      <span>Editar no Formulário</span>
                    </Button>

                    {reviewCotacao.status !== "efetivada" && (
                      <Button
                        size="sm"
                        onClick={() => handleEfetivarFromReview(reviewCotacao)}
                        disabled={efetivandoCotacao}
                        className="rounded-xl text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                      >
                        <CheckCircle2 className="size-3.5" />
                        <span>{efetivandoCotacao ? "Efetivando Cadastro..." : "Conferir & Efetivar Aceite"}</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
