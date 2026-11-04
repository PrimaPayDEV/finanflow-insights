import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
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
  ArrowRight,
  ArrowLeft,
  Clock,
  Loader2,
  Check,
  ExternalLink,
  MapPin,
  CreditCard,
  Award,
  AlertCircle,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { AsaasFormSeal } from "@/components/AsaasBaasSeal";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchCepData } from "@/lib/cep";
import { lookupVehicleByPlate, formatPlate } from "@/lib/plate";
import { BRL, formatCpfCnpj, formatPhone, formatCurrencyInput } from "@/lib/format";
import {
  type VehicleType,
  type CotacaoItem,
  type ProdutoVeicular,
  DEFAULT_PRODUTOS_VEICULARES,
  DEFAULT_COTAS_PARTICIPACAO,
  COTACAO_PLANOS_PRESETS,
  calculateParticipationFee,
  calculateBaseMonthlyFee,
  loadLocalData,
  saveLocalData,
  generateCotacaoWhatsAppMessage,
} from "@/lib/veicular";
import { submitPublicCotacao } from "@/lib/veicular.functions";

export const Route = createFileRoute("/public/cotacao")({
  head: () => ({
    meta: [
      { title: "Simulação de Proteção Veicular | Planmais" },
      { name: "description", content: "Faça sua cotação de proteção veicular 100% online com coberturas sob medida." },
    ],
  }),
  component: PublicCotacaoPage,
});

function PublicCotacaoPage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Etapa 1: Dados do Cliente
  const [name, setName] = useState("");
  const [document, setDocument] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [cep, setCep] = useState("");
  const [address, setAddress] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [isSearchingCep, setIsSearchingCep] = useState(false);

  // Etapa 2: Dados do Veículo
  const [plate, setPlate] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState<string>("2022");
  const [color, setColor] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType>("carro");
  const [usage, setUsage] = useState<"particular" | "comercial" | "app">("particular");
  const [fipeStr, setFipeStr] = useState("5500000"); // R$ 55.000,00
  const [isSearchingPlate, setIsSearchingPlate] = useState(false);

  // Etapa 3: Plano e Coberturas
  const [selectedPlanId, setSelectedPlanId] = useState<string>("plano-completo");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([
    "prod-base-roubo",
    "prod-terceiros-50",
    "prod-reboque-500",
    "prod-vidros",
  ]);

  // Etapa 4: Conclusão
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedCotacao, setSubmittedCotacao] = useState<CotacaoItem | null>(null);

  const parsedFipe = Number(fipeStr.replace(/\D/g, "")) / 100 || 50000;

  // Busca de CEP automática
  const handleCepSearch = async (cepInput: string) => {
    const clean = cepInput.replace(/\D/g, "");
    if (clean.length !== 8) return;
    setIsSearchingCep(true);
    try {
      const data = await fetchCepData(clean);
      if (data) {
        setAddress(data.logradouro || "");
        setNeighborhood(data.bairro || "");
        setCity(data.localidade || "");
        setState(data.uf || "");
        toast.success("Endereço preenchido automaticamente via CEP!");
      }
    } catch {
      toast.error("Erro ao localizar CEP.");
    } finally {
      setIsSearchingCep(false);
    }
  };

  // Busca da Placa automática
  const handlePlateSearch = async (plateInput: string) => {
    const clean = (plateInput || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    if (clean.length < 7) return;

    setIsSearchingPlate(true);
    try {
      const data = await lookupVehicleByPlate(clean);
      if (data) {
        setPlate(clean);
        if (data.brand) setBrand(data.brand);
        if (data.model) setModel(data.model);
        if (data.year) setYear(String(data.year));
        if (data.color) setColor(data.color);
        if (data.category) setVehicleType(data.category);
        if (data.fipeValue) setFipeStr(String(Math.round(data.fipeValue * 100)));

        toast.success("Veículo localizado pela placa!", {
          description: `${data.brand} ${data.model} (${data.year})`,
        });
      }
    } catch {
      // ignore
    } finally {
      setIsSearchingPlate(false);
    }
  };

  // Cálculos dinâmicos em tempo real
  const baseMonthly = useMemo(() => {
    return calculateBaseMonthlyFee(vehicleType, parsedFipe);
  }, [vehicleType, parsedFipe]);

  const applicableProducts = useMemo(() => {
    return DEFAULT_PRODUTOS_VEICULARES.filter(
      (p) => p.isActive && (p.vehicleType === "todos" || p.vehicleType === vehicleType)
    );
  }, [vehicleType]);

  const productsTotal = useMemo(() => {
    return applicableProducts
      .filter((p) => selectedProductIds.includes(p.id) && !p.isRequired)
      .reduce((acc, p) => acc + p.monthlyFee, 0);
  }, [applicableProducts, selectedProductIds]);

  const totalMonthly = useMemo(() => {
    return baseMonthly + productsTotal;
  }, [baseMonthly, productsTotal]);

  const participation = useMemo(() => {
    return calculateParticipationFee(vehicleType, parsedFipe, DEFAULT_COTAS_PARTICIPACAO, {
      isProfessionalUsage: usage !== "particular",
    });
  }, [vehicleType, parsedFipe, usage]);

  // Ao selecionar um Plano pré-definido
  const handleSelectPlan = (presetId: string) => {
    setSelectedPlanId(presetId);
    const plan = COTACAO_PLANOS_PRESETS.find((p) => p.id === presetId);
    if (plan) {
      setSelectedProductIds(plan.productIds);
    }
  };

  // Toggle de cobertura individual
  const toggleProduct = (prodId: string) => {
    const prod = DEFAULT_PRODUTOS_VEICULARES.find((p) => p.id === prodId);
    if (prod?.isRequired) return;

    setSelectedPlanId("custom");
    setSelectedProductIds((prev) =>
      prev.includes(prodId) ? prev.filter((id) => id !== prodId) : [...prev, prodId]
    );
  };

  // Concluir e Enviar Cotação
  const handleFinalizarCotacao = async () => {
    if (!name.trim()) {
      toast.error("Por favor, preencha o seu nome completo.");
      setStep(1);
      return;
    }
    if (!document.trim()) {
      toast.error("Por favor, informe seu CPF ou CNPJ.");
      setStep(1);
      return;
    }
    if (!phone.trim()) {
      toast.error("Por favor, informe seu WhatsApp com DDD.");
      setStep(1);
      return;
    }
    if (!plate.trim() || !brand.trim() || !model.trim()) {
      toast.error("Por favor, preencha a placa e modelo do veículo.");
      setStep(2);
      return;
    }

    setIsSubmitting(true);
    try {
      const planName =
        COTACAO_PLANOS_PRESETS.find((p) => p.id === selectedPlanId)?.name || "Plano Personalizado";

      const cotacaoItem: CotacaoItem = {
        id: "cot-pub-" + Date.now(),
        companyId: "default",
        createdAt: new Date().toISOString(),
        memberName: name.trim(),
        memberDocument: document.trim(),
        memberPhone: phone.trim(),
        memberEmail: email.trim() || undefined,
        memberCep: cep.trim() || undefined,
        memberAddress: address.trim() || undefined,
        memberNumber: number.trim() || undefined,
        memberComplement: complement.trim() || undefined,
        memberNeighborhood: neighborhood.trim() || undefined,
        memberCity: city.trim() || undefined,
        memberState: state.trim() || undefined,
        preferredDueDay: 20,
        vehicleType,
        vehiclePlate: (plate || "SEM-PLACA").toUpperCase().trim(),
        vehicleBrand: brand.trim(),
        vehicleModel: model.trim(),
        vehicleYear: Number(year) || 2022,
        vehicleColor: color.trim() || "Prata",
        vehicleFipeValue: parsedFipe,
        vehicleUsage: usage,
        selectedProducts: selectedProductIds,
        planName,
        baseFee: baseMonthly,
        productsFee: productsTotal,
        totalMonthlyFee: totalMonthly,
        estimatedParticipationFee: participation.amount,
        status: "aguardando_aceite",
        notes: `Cotação enviada via formulário público externo em ${new Date().toLocaleDateString("pt-BR")}.`,
      };

      // 1. Enviar para a plataforma via server function (cria notificação)
      await submitPublicCotacao({
        data: {
          id: cotacaoItem.id,
          memberName: cotacaoItem.memberName,
          memberDocument: cotacaoItem.memberDocument,
          memberPhone: cotacaoItem.memberPhone,
          memberEmail: cotacaoItem.memberEmail,
          memberCep: cotacaoItem.memberCep,
          memberAddress: cotacaoItem.memberAddress,
          memberNumber: cotacaoItem.memberNumber,
          memberComplement: cotacaoItem.memberComplement,
          memberNeighborhood: cotacaoItem.memberNeighborhood,
          memberCity: cotacaoItem.memberCity,
          memberState: cotacaoItem.memberState,
          preferredDueDay: cotacaoItem.preferredDueDay,
          vehicleType: cotacaoItem.vehicleType,
          vehiclePlate: cotacaoItem.vehiclePlate,
          vehicleBrand: cotacaoItem.vehicleBrand,
          vehicleModel: cotacaoItem.vehicleModel,
          vehicleYear: cotacaoItem.vehicleYear,
          vehicleColor: cotacaoItem.vehicleColor,
          vehicleFipeValue: cotacaoItem.vehicleFipeValue,
          vehicleUsage: cotacaoItem.vehicleUsage,
          planName: cotacaoItem.planName,
          selectedProducts: cotacaoItem.selectedProducts,
          baseFee: cotacaoItem.baseFee,
          productsFee: cotacaoItem.productsFee,
          totalMonthlyFee: cotacaoItem.totalMonthlyFee,
          estimatedParticipationFee: cotacaoItem.estimatedParticipationFee,
          status: "aguardando_aceite",
        },
      });

      // 2. Persistir localmente no cache do sistema
      const existing = loadLocalData<CotacaoItem[]>("default", "cotacoes", []);
      saveLocalData("default", "cotacoes", [cotacaoItem, ...existing]);

      setSubmittedCotacao(cotacaoItem);
      setStep(4);
      toast.success("Cotação enviada com sucesso para a plataforma!");
    } catch (err: any) {
      toast.error("Erro ao enviar cotação: " + (err.message || "Tente novamente."));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Enviar Cotação para o WhatsApp da Empresa / Consultores
  const handleOpenWhatsApp = () => {
    if (!submittedCotacao) return;
    const msg = generateCotacaoWhatsAppMessage(submittedCotacao, "Planmais Proteção Veicular");
    const targetPhone = "5511999999999"; // Número de atendimento central ou consultor
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background text-foreground flex flex-col justify-between py-6 sm:py-10 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        {/* Cabeçalho da Proposta Externa */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/25 text-xs font-bold">
            <ShieldCheck className="size-3.5" />
            <span>Simulador de Proteção Veicular 100% Online</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Cotação Rápida de Proteção Veicular
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto">
            Proteja seu carro, moto ou van com as melhores coberturas do mercado, sem análise de SPC/Serasa e com assistência 24 horas em todo o Brasil.
          </p>

          {/* Stepper Visual */}
          <div className="flex items-center justify-center gap-2 sm:gap-4 pt-3 max-w-md mx-auto">
            {[
              { num: 1, label: "Seus Dados" },
              { num: 2, label: "Seu Veículo" },
              { num: 3, label: "Planos & Coberturas" },
              { num: 4, label: "Conclusão" },
            ].map((s) => (
              <div key={s.num} className="flex items-center gap-1 sm:gap-2">
                <div
                  className={`size-7 sm:size-8 rounded-full text-xs font-bold flex items-center justify-center transition-colors ${
                    step === s.num
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : step > s.num
                      ? "bg-emerald-600 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step > s.num ? <Check className="size-4" /> : s.num}
                </div>
                <span
                  className={`text-[11px] font-medium hidden sm:inline ${
                    step === s.num ? "text-foreground font-bold" : "text-muted-foreground"
                  }`}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* PASSO 1: Dados Pessoais & Endereço */}
        {step === 1 && (
          <Card className="border-border/80 shadow-lg rounded-2xl sm:rounded-3xl overflow-hidden bg-card">
            <CardHeader className="bg-muted/15 border-b border-border/60 pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <User className="size-4 text-primary" />
                <span>Passo 1: Seus Dados para Contato</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Informe seus dados para que possamos emitir sua proposta personalizada.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold">Nome Completo *</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Digite seu nome completo"
                    className="h-10 rounded-xl text-xs bg-background"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">CPF ou CNPJ *</Label>
                  <Input
                    value={document}
                    onChange={(e) => setDocument(formatCpfCnpj(e.target.value))}
                    placeholder="000.000.000-00"
                    maxLength={18}
                    className="h-10 rounded-xl text-xs font-mono font-bold bg-background"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">WhatsApp / Celular com DDD *</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    className="h-10 rounded-xl text-xs font-mono font-bold bg-background text-foreground"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold">E-mail</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seuemail@exemplo.com"
                    className="h-10 rounded-xl text-xs bg-background"
                  />
                </div>
              </div>

              {/* Endereço com busca automática por CEP */}
              <div className="pt-2 border-t border-border/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-primary" /> Endereço Residencial
                  </span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Sparkles className="size-3 text-amber-500" /> Auto-busca por CEP
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">CEP (8 dígitos)</Label>
                    <div className="relative">
                      <Input
                        value={cep}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 8);
                          setCep(val);
                          if (val.length === 8) handleCepSearch(val);
                        }}
                        onBlur={(e) => handleCepSearch(e.target.value)}
                        placeholder="00000-000"
                        className="h-9 rounded-xl text-xs font-mono font-bold bg-background pr-7"
                      />
                      {isSearchingCep && (
                        <Loader2 className="size-3.5 animate-spin absolute right-2.5 top-2.5 text-primary" />
                      )}
                    </div>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs font-semibold">Rua / Logradouro</Label>
                    <Input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Ex: Av. Paulista"
                      className="h-9 rounded-xl text-xs bg-background"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Número</Label>
                    <Input
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      placeholder="Nº ou S/N"
                      className="h-9 rounded-xl text-xs bg-background"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Bairro</Label>
                    <Input
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      placeholder="Bairro"
                      className="h-9 rounded-xl text-xs bg-background"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Cidade / UF</Label>
                    <div className="flex gap-1.5">
                      <Input
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Cidade"
                        className="h-9 rounded-xl text-xs bg-background flex-1"
                      />
                      <Input
                        value={state}
                        onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
                        placeholder="UF"
                        maxLength={2}
                        className="h-9 rounded-xl text-xs font-mono uppercase bg-background w-14 text-center font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <Button
                  type="button"
                  onClick={() => {
                    if (!name.trim()) return toast.error("Informe seu nome");
                    if (!document.trim()) return toast.error("Informe seu CPF ou CNPJ");
                    if (!phone.trim()) return toast.error("Informe seu WhatsApp");
                    setStep(2);
                  }}
                  className="rounded-xl h-10 px-5 text-xs font-bold gap-2 bg-primary text-primary-foreground shadow-sm"
                >
                  <span>Avançar para Dados do Veículo</span>
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* PASSO 2: Dados do Veículo */}
        {step === 2 && (
          <Card className="border-border/80 shadow-lg rounded-2xl sm:rounded-3xl overflow-hidden bg-card">
            <CardHeader className="bg-muted/15 border-b border-border/60 pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Car className="size-4 text-primary" />
                <span>Passo 2: Dados do Veículo a Proteger</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Digite a placa do seu veículo para preenchimento automático das informações.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 space-y-4">
              {/* Placa com Auto-busca */}
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/25 space-y-2">
                <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>Placa do Veículo (Mercosul ou Antiga) *</span>
                  {isSearchingPlate && (
                    <span className="text-[10px] text-primary flex items-center gap-1 font-normal">
                      <Loader2 className="size-3 animate-spin" /> Buscando dados do veículo...
                    </span>
                  )}
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      value={plate}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
                        setPlate(val);
                        if (val.length === 7) handlePlateSearch(val);
                      }}
                      onBlur={(e) => handlePlateSearch(e.target.value)}
                      placeholder="ABC1234"
                      maxLength={7}
                      className="h-11 rounded-xl text-sm font-mono font-bold uppercase bg-background tracking-wider"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={() => handlePlateSearch(plate)}
                    className="h-11 px-4 rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-xs shrink-0"
                  >
                    <Sparkles className="size-4" />
                    <span>Buscar Placa</span>
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Ao digitar a placa, identificamos automaticamente a marca, modelo, ano e valor FIPE sugerido.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Tipo de Veículo</Label>
                  <Select value={vehicleType} onValueChange={(v: any) => setVehicleType(v)}>
                    <SelectTrigger className="h-10 rounded-xl text-xs bg-background font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="carro">Carro / Passeio</SelectItem>
                      <SelectItem value="moto">Motocicleta</SelectItem>
                      <SelectItem value="utilitario">Van / Utilitário</SelectItem>
                      <SelectItem value="pesado">Caminhão / Pesado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Marca do Veículo *</Label>
                  <Input
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Ex: Toyota, Honda, Fiat"
                    className="h-10 rounded-xl text-xs bg-background"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Modelo do Veículo *</Label>
                  <Input
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="Ex: Corolla XEi 2.0"
                    className="h-10 rounded-xl text-xs bg-background"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Ano de Fabricação / Modelo</Label>
                  <Input
                    value={year}
                    onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="2022"
                    maxLength={4}
                    className="h-10 rounded-xl text-xs font-mono bg-background"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Cor</Label>
                  <Input
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="Prata, Branco, Preto..."
                    className="h-10 rounded-xl text-xs bg-background"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Finalidade de Uso</Label>
                  <Select value={usage} onValueChange={(v: any) => setUsage(v)}>
                    <SelectTrigger className="h-10 rounded-xl text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="particular">Particular / Passeio</SelectItem>
                      <SelectItem value="comercial">Comercial / Trabalho</SelectItem>
                      <SelectItem value="app">Motorista de Aplicativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                  <Label className="text-xs font-semibold flex items-center justify-between">
                    <span>Valor FIPE Avaliado (Base de Indenização 100%)</span>
                    <span className="text-[10px] text-muted-foreground">Você pode ajustar o valor se necessário</span>
                  </Label>
                  <Input
                    value={formatCurrencyInput(fipeStr)}
                    onChange={(e) => setFipeStr(e.target.value)}
                    className="h-10 rounded-xl text-xs font-mono font-bold bg-background text-emerald-600 dark:text-emerald-400 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="rounded-xl h-10 text-xs font-bold gap-1.5"
                >
                  <ArrowLeft className="size-4" />
                  <span>Voltar</span>
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (!plate.trim()) return toast.error("Informe a placa do veículo");
                    if (!brand.trim()) return toast.error("Informe a marca");
                    if (!model.trim()) return toast.error("Informe o modelo");
                    setStep(3);
                  }}
                  className="rounded-xl h-10 px-5 text-xs font-bold gap-2 bg-primary text-primary-foreground shadow-sm"
                >
                  <span>Escolher Plano & Coberturas</span>
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* PASSO 3: Escolha do Plano e Coberturas */}
        {step === 3 && (
          <div className="space-y-5">
            {/* Cards dos Planos Pré-definidos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {COTACAO_PLANOS_PRESETS.map((preset) => {
                const isSelected = selectedPlanId === preset.id;
                return (
                  <div
                    key={preset.id}
                    onClick={() => handleSelectPlan(preset.id)}
                    className={`relative p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between text-left ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-2 ring-primary/30 shadow-md"
                        : "border-border/80 bg-card hover:border-border hover:shadow-xs"
                    }`}
                  >
                    {preset.recommended && (
                      <div className="absolute -top-3 right-4">
                        <Badge className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 shadow-xs">
                          {preset.badge}
                        </Badge>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-extrabold text-sm text-foreground">{preset.name}</h3>
                        <div
                          className={`size-5 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-muted-foreground/40 bg-background"
                          }`}
                        >
                          {isSelected && <Check className="size-3" />}
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {preset.description}
                      </p>
                    </div>

                    <div className="pt-4 mt-3 border-t border-border/50">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                        Coberturas Inclusas:
                      </span>
                      <ul className="text-[11px] text-foreground space-y-1 mt-1">
                        <li className="flex items-center gap-1.5">
                          <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>Roubo, Furto e Incêndio 100%</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>Socorro & Guincho 24h</span>
                        </li>
                        {preset.productIds.includes("prod-terceiros-50") && (
                          <li className="flex items-center gap-1.5">
                            <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>Danos a Terceiros (R$ 50k)</span>
                          </li>
                        )}
                        {preset.productIds.includes("prod-terceiros-100") && (
                          <li className="flex items-center gap-1.5">
                            <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>Danos a Terceiros (R$ 100k)</span>
                          </li>
                        )}
                        {preset.productIds.includes("prod-vidros") && (
                          <li className="flex items-center gap-1.5">
                            <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>Vidros, Faróis e Lanternas</span>
                          </li>
                        )}
                        {preset.productIds.includes("prod-rastreador") && (
                          <li className="flex items-center gap-1.5">
                            <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>Rastreador GPS com App</span>
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Seletor de Coberturas Adicionais */}
            <Card className="border-border/80 shadow-md rounded-2xl sm:rounded-3xl bg-card">
              <CardHeader className="bg-muted/15 border-b border-border/60 pb-3">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-primary" />
                    <span>Personalizar Coberturas Adicionais</span>
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">
                    Marque ou desmarque conforme sua preferência
                  </span>
                </CardTitle>
              </CardHeader>

              <CardContent className="p-4 sm:p-5 space-y-2.5">
                {applicableProducts.map((prod) => {
                  const isChecked = selectedProductIds.includes(prod.id);
                  return (
                    <div
                      key={prod.id}
                      onClick={() => !prod.isRequired && toggleProduct(prod.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                        prod.isRequired
                          ? "bg-muted/30 border-border/50 cursor-default opacity-85"
                          : isChecked
                          ? "bg-primary/5 border-primary/40 cursor-pointer"
                          : "bg-background border-border/70 hover:bg-muted/30 cursor-pointer"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                        <div
                          className={`size-5 rounded-md border flex items-center justify-center shrink-0 ${
                            isChecked || prod.isRequired
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-muted-foreground/40 bg-background"
                          }`}
                        >
                          {(isChecked || prod.isRequired) && <Check className="size-3" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs font-bold text-foreground leading-tight">
                              {prod.name}
                            </h4>
                            {prod.isRequired && (
                              <Badge variant="outline" className="text-[9px] font-bold text-muted-foreground py-0">
                                Cobertura Básica Obrigatória
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                            {prod.description}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-mono font-bold text-foreground block">
                          {prod.monthlyFee > 0 ? `+ ${BRL(prod.monthlyFee)}/mês` : "Incluso"}
                        </span>
                        {prod.coverageLimit && (
                          <span className="text-[9px] text-muted-foreground block">
                            {prod.coverageLimit}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Resumo de Preço e Cota de Participação */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-card border border-emerald-500/30 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
                  Valor Total Estimado da Sua Proteção
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                    {BRL(totalMonthly)}
                  </span>
                  <span className="text-xs font-bold text-muted-foreground">/ mês</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Cota de Participação (Franquia em caso de sinistro):{" "}
                  <strong className="text-foreground font-mono">{BRL(participation.amount)}</strong>
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="rounded-xl h-11 text-xs font-bold w-full sm:w-auto"
                >
                  <ArrowLeft className="size-4" />
                  <span>Voltar</span>
                </Button>
                <Button
                  type="button"
                  onClick={handleFinalizarCotacao}
                  disabled={isSubmitting}
                  className="rounded-xl h-11 px-6 text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md w-full sm:w-auto"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Enviando Cotação...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4" />
                      <span>Concluir & Enviar Cotação</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* PASSO 4: Tela de Sucesso & WhatsApp */}
        {step === 4 && submittedCotacao && (
          <Card className="border-emerald-500/30 shadow-xl rounded-2xl sm:rounded-3xl overflow-hidden bg-card">
            <div className="p-6 sm:p-8 text-center space-y-4 bg-emerald-500/10 border-b border-emerald-500/20">
              <div className="size-16 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-lg">
                <Check className="size-8 stroke-[3]" />
              </div>
              <div className="space-y-1">
                <Badge className="bg-emerald-600 text-white text-xs font-bold px-3 py-1">
                  Cotação Recebida com Sucesso!
                </Badge>
                <h2 className="text-xl sm:text-2xl font-black text-foreground">
                  Obrigado, {submittedCotacao.memberName}!
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto">
                  Sua cotação foi registrada em nossa plataforma sob o protocolo{" "}
                  <strong className="font-mono text-foreground font-bold">{submittedCotacao.id}</strong>.
                  Nossos consultores já foram notificados para validação.
                </p>
              </div>
            </div>

            <CardContent className="p-4 sm:p-6 space-y-5">
              {/* Resumo da Contratação */}
              <div className="p-4 rounded-2xl border border-border/80 bg-muted/10 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <FileText className="size-3.5" /> Resumo da Sua Simulação
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Veículo:</span>
                    <strong className="text-foreground text-xs block font-mono">
                      {formatPlate(submittedCotacao.vehiclePlate)}
                    </strong>
                    <span className="text-muted-foreground text-[11px]">
                      {submittedCotacao.vehicleBrand} {submittedCotacao.vehicleModel} ({submittedCotacao.vehicleYear})
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Plano Escolhido:</span>
                    <strong className="text-foreground text-xs block">
                      {submittedCotacao.planName || "Plano Completo"}
                    </strong>
                    <span className="text-muted-foreground text-[11px]">
                      FIPE: {BRL(submittedCotacao.vehicleFipeValue)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Mensalidade:</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 text-sm font-mono block">
                      {BRL(submittedCotacao.totalMonthlyFee)}/mês
                    </strong>
                    <span className="text-muted-foreground text-[10px]">
                      Vencimento todo dia {submittedCotacao.preferredDueDay}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Franquia (Cota Participação):</span>
                    <strong className="text-foreground text-xs font-mono block">
                      {BRL(submittedCotacao.estimatedParticipationFee)}
                    </strong>
                    <span className="text-muted-foreground text-[10px]">
                      Regulamento PPM Planmais
                    </span>
                  </div>
                </div>
              </div>

              {/* Ação Destacada: WhatsApp */}
              <div className="p-5 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/30 text-center space-y-3">
                <div className="space-y-1">
                  <h4 className="text-sm font-extrabold text-foreground flex items-center justify-center gap-2">
                    <MessageCircle className="size-5 text-[#25D366]" />
                    <span>Deseja agilizar a contratação pelo WhatsApp?</span>
                  </h4>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    Envie o resumo da sua cotação diretamente para a nossa equipe pelo WhatsApp para tirar dúvidas e solicitar a inspeção digital.
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={handleOpenWhatsApp}
                  className="rounded-xl h-11 px-6 text-xs font-bold gap-2 bg-[#25D366] hover:bg-[#1EBE5D] text-white shadow-md mx-auto"
                >
                  <MessageCircle className="size-4" />
                  <span>Enviar Cotação para Nosso WhatsApp</span>
                </Button>
              </div>

              {/* Botão para iniciar nova cotação */}
              <div className="flex justify-center pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setName("");
                    setDocument("");
                    setPhone("");
                    setPlate("");
                    setBrand("");
                    setModel("");
                    setSubmittedCotacao(null);
                    setStep(1);
                  }}
                  className="rounded-xl h-8.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  Fazer outra simulação
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rodapé institucional com selo Asaas */}
        <div className="text-center pt-4 border-t border-border/40 space-y-2">
          <div className="flex items-center justify-center gap-2">
            <AsaasFormSeal />
          </div>
          <p className="text-[10px] text-muted-foreground">
            Proteção Patrimonial Mutualista regulamentada em conformidade com o Código Civil Brasileiro e Programa de Auxílio Mútuo.
          </p>
        </div>
      </div>
    </div>
  );
}

