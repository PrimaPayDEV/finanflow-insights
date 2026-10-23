import { createFileRoute } from '@tanstack/react-router';
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import {
  Receipt,
  FileCheck2,
  CircleDollarSign,
  PiggyBank,
  Users,
  Car,
  Calendar,
  CheckSquare,
  Square,
  AlertCircle,
  CheckCircle2,
  Send,
  MessageCircle,
  ExternalLink,
  Ban,
  Filter,
  Search,
  Percent,
  Plus,
  Clock,
  ArrowRight
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
import { getMembers, generateInvoice } from "@/lib/members.functions";
import {
  getAsaasDashboardMetrics,
  cancelAsaasPayment,
  receiveInCashAsaasPayment,
  updateAsaasPaymentDueDate,
  generateBatchInvoices
} from "@/lib/asaas.functions";
import { BRL, formatCpfCnpj, formatPhone, formatCurrencyInput } from "@/lib/format";
import {
  type LoteItem,
  type RateioConfig,
  type EventoSinistro,
  loadLocalData,
  saveLocalData,
  generateBoletoWhatsAppMessage,
  getMemberDueDay
} from "@/lib/veicular";

export const Route = createFileRoute('/veicular/financeiro')({
  head: () => ({
    meta: [{ title: "Financeiro & Cobrança | Planmais Proteção Veicular" }],
  }),
  component: FinanceiroPage,
});

function FinanceiroPage() {
  const { companyId, companyName } = useAuth();
  const qc = useQueryClient();

  // Tab State
  const [activeTab, setActiveTab] = useState<string>("lotes");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab === "lotes" || tab === "boletos" || tab === "rateio") {
        setActiveTab(tab);
      }
    }
  }, []);

  // -------------------------------------------------------------
  // DADOS DE ASSOCIADOS & VEÍCULOS
  // -------------------------------------------------------------
  const fetchMembers = useServerFn(getMembers);
  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ["members", companyId],
    queryFn: () => fetchMembers({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });

  // Eventos para cálculo automático de rateio
  const eventos = useMemo(() => {
    return loadLocalData<EventoSinistro[]>(companyId || "default", "eventos", []);
  }, [companyId]);

  // -------------------------------------------------------------
  // ABA 1: LOTES & LISTA DE FECHAMENTO
  // -------------------------------------------------------------
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [referenceMonth, setReferenceMonth] = useState(currentMonthStr);
  const [dueDayFilter, setDueDayFilter] = useState<string>("20"); // 5, 10, 15, 20, 25 ou "todos"
  const [searchFilter, setSearchFilter] = useState("");

  // Rateio configurado para o mês de referência
  const rateioConfig = useMemo(() => {
    return loadLocalData<RateioConfig>(companyId || "default", `rateio_${referenceMonth}`, {
      periodMonth: referenceMonth,
      totalEventsAmount: 0,
      activeVehiclesCount: 0,
      rateioType: "PERCENTUAL",
      rateioValue: 0,
      isApplied: false,
    });
  }, [companyId, referenceMonth]);

  // Itens da Lista de Fechamento
  const [loteItems, setLoteItems] = useState<LoteItem[]>([]);
  const [loteGenerated, setLoteGenerated] = useState(false);
  const [batchIssuing, setBatchIssuing] = useState(false);

  // Gerar Lista de Fechamento com base nos associados ativos e dia de vencimento
  const handleGerarListaFechamento = () => {
    const selectedDueDayNum = dueDayFilter === "todos" ? null : Number(dueDayFilter);

    // Mapear associados ativos
    const items: LoteItem[] = [];

    for (const m of members) {
      // Pega dia de vencimento preferido do associado ou o padrão (20)
      const memberDueDay = getMemberDueDay(companyId || "default", m.id, Number((m as any).due_day || (m as any).preferred_due_day || 20));

      if (selectedDueDayNum !== null && memberDueDay !== selectedDueDayNum) {
        continue;
      }

      const vehicles = Array.isArray((m as any).vehicles) ? (m as any).vehicles : [];
      const primaryVehicle = vehicles[0];
      const consultant = Array.isArray(m.partners) ? m.partners[0] : (m.partners as any);

      // Calcular mensalidade base
      let baseFee = 0;
      if (vehicles.length > 0) {
        baseFee = vehicles.reduce((acc: number, v: any) => acc + (Number(v.monthly_fee) || 179.90), 0);
      } else {
        baseFee = 179.90;
      }

      // Calcular rateio
      let rateioVal = 0;
      if (rateioConfig.rateioValue > 0) {
        if (rateioConfig.rateioType === "PERCENTUAL") {
          rateioVal = Number((baseFee * (rateioConfig.rateioValue / 100)).toFixed(2));
        } else {
          rateioVal = Number(rateioConfig.rateioValue.toFixed(2));
        }
      }

      const totalVal = Number((baseFee + rateioVal).toFixed(2));

      items.push({
        memberId: m.id,
        memberName: m.name,
        memberDocument: m.document,
        memberPhone: m.phone || undefined,
        vehicleId: primaryVehicle?.id,
        vehiclePlate: primaryVehicle?.plate,
        vehicleModel: primaryVehicle ? `${primaryVehicle.brand || ""} ${primaryVehicle.model || ""}`.trim() : undefined,
        dueDay: memberDueDay,
        baseAmount: baseFee,
        rateioAmount: rateioVal,
        totalAmount: totalVal,
        consultantName: consultant?.name,
        selected: true,
        status: "pendente",
      });
    }

    setLoteItems(items);
    setLoteGenerated(true);
    toast.success(`Lista de fechamento gerada com ${items.length} associados para conferência.`);
  };

  const handleToggleSelectAll = (checked: boolean) => {
    setLoteItems((prev) => prev.map((item) => ({ ...item, selected: checked })));
  };

  const handleToggleItem = (memberId: string) => {
    setLoteItems((prev) =>
      prev.map((item) => (item.memberId === memberId ? { ...item, selected: !item.selected } : item))
    );
  };

  // Totais do Lote
  const selectedLoteItems = useMemo(() => loteItems.filter((i) => i.selected), [loteItems]);
  const totalLoteAmount = useMemo(
    () => selectedLoteItems.reduce((acc, i) => acc + i.totalAmount, 0),
    [selectedLoteItems]
  );
  const totalRateioAmount = useMemo(
    () => selectedLoteItems.reduce((acc, i) => acc + i.rateioAmount, 0),
    [selectedLoteItems]
  );

  // Mutação para emissão do lote no Asaas
  const batchInvoiceMutation = useMutation({
    mutationFn: useServerFn(generateBatchInvoices),
    onSuccess: (data: any) => {
      toast.success(`Lote emitido! ${data.successCount} de ${data.totalCount} boletos gerados.`);
      qc.invalidateQueries({ queryKey: ["billing_metrics"] });
      // Atualizar status dos itens
      setLoteItems((prev) =>
        prev.map((item) => {
          const res = data.results?.find((r: any) => r.memberId === item.memberId);
          if (res?.ok) return { ...item, status: "emitido", invoiceId: res.invoiceId };
          if (res && !res.ok) return { ...item, status: "erro", errorDetails: res.error };
          return item;
        })
      );
      setBatchIssuing(false);
    },
    onError: (err: any) => {
      toast.error("Erro ao emitir lote de boletos: " + err.message);
      setBatchIssuing(false);
    },
  });

  const handleEmitirLote = () => {
    if (selectedLoteItems.length === 0) {
      toast.error("Nenhum associado selecionado no lote para emissão.");
      return;
    }

    const [year, month] = referenceMonth.split("-");
    const dueDayNum = dueDayFilter === "todos" ? "20" : dueDayFilter.padStart(2, "0");
    const targetDueDate = `${year}-${month}-${dueDayNum}`;

    setBatchIssuing(true);
    batchInvoiceMutation.mutate({
      data: {
        companyId: companyId!,
        items: selectedLoteItems.map((item) => ({
          memberId: item.memberId,
          amount: item.totalAmount,
          description: `Mensalidade Proteção Veicular Ref. ${month}/${year} - Venc. ${item.dueDay} (Placa: ${item.vehiclePlate || "N/A"})`,
          dueDate: `${year}-${month}-${String(item.dueDay).padStart(2, "0")}`,
          vehiclePlate: item.vehiclePlate,
        })),
      },
    });
  };

  // -------------------------------------------------------------
  // ABA 2: GERENCIAR BOLETOS
  // -------------------------------------------------------------
  const fetchMetrics = useServerFn(getAsaasDashboardMetrics);
  const { data: metricsData, isLoading: loadingBoletos } = useQuery({
    queryKey: ["billing_metrics", companyId],
    queryFn: () => fetchMetrics({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });

  const allBoletos = metricsData?.data?.recentPayments || [];
  const [boletoStatusFilter, setBoletoStatusFilter] = useState("TODOS");
  const [boletoSearch, setBoletoSearch] = useState("");

  const filteredBoletos = useMemo(() => {
    return allBoletos.filter((b: any) => {
      if (boletoStatusFilter !== "TODOS" && b.status !== boletoStatusFilter) return false;
      if (boletoSearch.trim()) {
        const q = boletoSearch.toLowerCase();
        const name = (b.customerName || "").toLowerCase();
        const desc = (b.description || "").toLowerCase();
        return name.includes(q) || desc.includes(q);
      }
      return true;
    });
  }, [allBoletos, boletoStatusFilter, boletoSearch]);

  // Modal Baixa Manual
  const [baixaModalOpen, setBaixaModalOpen] = useState(false);
  const [selectedBoletoForBaixa, setSelectedBoletoForBaixa] = useState<any | null>(null);
  const [baixaDate, setBaixaDate] = useState(now.toISOString().split("T")[0]);
  const [baixaValue, setBaixaValue] = useState("");

  const baixaManualMutation = useMutation({
    mutationFn: useServerFn(receiveInCashAsaasPayment),
    onSuccess: () => {
      toast.success("Baixa manual registrada com sucesso!");
      qc.invalidateQueries({ queryKey: ["billing_metrics"] });
      setBaixaModalOpen(false);
    },
    onError: (err: any) => toast.error("Erro ao registrar baixa: " + err.message),
  });

  // Modal Alterar Vencimento
  const [vencimentoModalOpen, setVencimentoModalOpen] = useState(false);
  const [selectedBoletoForVenc, setSelectedBoletoForVenc] = useState<any | null>(null);
  const [newDueDate, setNewDueDate] = useState("");

  const updateDueDateMutation = useMutation({
    mutationFn: useServerFn(updateAsaasPaymentDueDate),
    onSuccess: () => {
      toast.success("Data atualizada com sucesso no Asaas!");
      qc.invalidateQueries({ queryKey: ["billing_metrics"] });
      setVencimentoModalOpen(false);
    },
    onError: (err: any) => toast.error("Erro ao atualizar data: " + err.message),
  });

  // Cancelar Boleto
  const cancelPaymentMutation = useMutation({
    mutationFn: useServerFn(cancelAsaasPayment),
    onSuccess: () => {
      toast.success("Boleto cancelado com sucesso no Asaas!");
      qc.invalidateQueries({ queryKey: ["billing_metrics"] });
    },
    onError: (err: any) => toast.error("Erro ao cancelar boleto: " + err.message),
  });

  // -------------------------------------------------------------
  // ABA 3: RATEIO DE SINISTROS
  // -------------------------------------------------------------
  const [rateioMonth, setRateioMonth] = useState(currentMonthStr);
  const [rateioPercentInput, setRateioPercentInput] = useState("4.5");
  const [rateioType, setRateioType] = useState<"PERCENTUAL" | "VALOR_FIXO">("PERCENTUAL");

  // Puxa total de eventos do mês selecionado
  const eventosDoMes = useMemo(() => {
    return eventos.filter((e) => e.date.startsWith(rateioMonth) && e.status !== "ANALISE");
  }, [eventos, rateioMonth]);

  const totalEventosMes = useMemo(() => {
    return eventosDoMes.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  }, [eventosDoMes]);

  const totalActiveVehicles = useMemo(() => {
    return members.reduce((acc, m: any) => acc + (Array.isArray(m.vehicles) ? m.vehicles.length : 0), 0) || 1;
  }, [members]);

  const suggestedRateioFixo = useMemo(() => {
    return totalEventosMes > 0 && totalActiveVehicles > 0
      ? Number((totalEventosMes / totalActiveVehicles).toFixed(2))
      : 0;
  }, [totalEventosMes, totalActiveVehicles]);

  const handleSalvarRateio = () => {
    const val = Number(rateioPercentInput) || 0;
    const config: RateioConfig = {
      periodMonth: rateioMonth,
      totalEventsAmount: totalEventosMes,
      activeVehiclesCount: totalActiveVehicles,
      rateioType,
      rateioValue: val,
      isApplied: true,
      appliedAt: new Date().toISOString(),
    };

    saveLocalData(companyId || "default", `rateio_${rateioMonth}`, config);
    toast.success(`Rateio para o período ${rateioMonth} salvo com sucesso!`, {
      description: `Será aplicado +${val}${rateioType === "PERCENTUAL" ? "%" : " R$"} na mensalidade dos associados.`,
    });
  };

  return (
    <AppLayout
      title="Gestão Financeira & Cobrança"
      subtitle="Parametrização por vencimento, emissão em lote, conferência e rateio de sinistros"
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-muted/70 p-1 rounded-2xl w-full sm:w-auto grid grid-cols-3 sm:inline-flex">
            <TabsTrigger value="lotes" className="rounded-xl text-xs font-bold gap-2 px-4 py-2">
              <FileCheck2 className="size-4" />
              <span>Lotes & Fechamento</span>
            </TabsTrigger>
            <TabsTrigger value="boletos" className="rounded-xl text-xs font-bold gap-2 px-4 py-2">
              <CircleDollarSign className="size-4" />
              <span>Gerenciar Boletos</span>
            </TabsTrigger>
            <TabsTrigger value="rateio" className="rounded-xl text-xs font-bold gap-2 px-4 py-2">
              <PiggyBank className="size-4" />
              <span>Rateio de Sinistros</span>
            </TabsTrigger>
          </TabsList>

          {/* ------------------------------------------------------------- */}
          {/* ABA 1: LOTES & LISTA DE FECHAMENTO */}
          {/* ------------------------------------------------------------- */}
          <TabsContent value="lotes" className="space-y-5 pt-2">
            {/* Card de Parametrização da Cobrança */}
            <Card className="rounded-2xl border border-border/80 shadow-sm overflow-hidden">
              <CardHeader className="p-5 pb-3 border-b border-border/60 bg-muted/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Receipt className="size-4 text-primary" />
                      <span>Parametrizar Cobrança & Geração de Lotes</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Selecione o período e o dia de vencimento para puxar os associados ativos
                    </CardDescription>
                  </div>

                  {rateioConfig.isApplied && (
                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs gap-1">
                      <Percent className="size-3" /> Rateio Ativo: +{rateioConfig.rateioValue}%
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                  <div className="sm:col-span-4 space-y-1.5">
                    <Label className="text-xs font-semibold">Período de Referência (Mês/Ano)</Label>
                    <Input
                      type="month"
                      value={referenceMonth}
                      onChange={(e) => {
                        setReferenceMonth(e.target.value);
                        setLoteGenerated(false);
                      }}
                      className="rounded-xl text-xs font-mono"
                    />
                  </div>

                  <div className="sm:col-span-4 space-y-1.5">
                    <Label className="text-xs font-semibold">Filtrar por Dia de Vencimento</Label>
                    <Select
                      value={dueDayFilter}
                      onValueChange={(v) => {
                        setDueDayFilter(v);
                        setLoteGenerated(false);
                      }}
                    >
                      <SelectTrigger className="rounded-xl text-xs font-bold text-primary">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl font-medium">
                        <SelectItem value="todos">Todos os Vencimentos</SelectItem>
                        <SelectItem value="5">Vencimento Dia 05</SelectItem>
                        <SelectItem value="10">Vencimento Dia 10</SelectItem>
                        <SelectItem value="15">Vencimento Dia 15</SelectItem>
                        <SelectItem value="20">Vencimento Dia 20 (Principal)</SelectItem>
                        <SelectItem value="25">Vencimento Dia 25</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="sm:col-span-4">
                    <Button
                      onClick={handleGerarListaFechamento}
                      className="w-full rounded-xl font-bold text-xs h-10 bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                    >
                      <FileCheck2 className="size-4" />
                      <span>Puxar Associados & Gerar Conferência</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* LISTA DE FECHAMENTO (RESUMO DE CONFERÊNCIA) */}
            {loteGenerated && (
              <div className="space-y-4">
                {/* Cards de Resumo */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <Card className="rounded-2xl border border-border/80 shadow-xs p-4 bg-card">
                    <span className="text-xs text-muted-foreground block">Associados Selecionados</span>
                    <div className="text-2xl font-black text-foreground font-mono mt-1">
                      {selectedLoteItems.length}
                      <span className="text-xs text-muted-foreground font-normal"> / {loteItems.length}</span>
                    </div>
                  </Card>

                  <Card className="rounded-2xl border border-border/80 shadow-xs p-4 bg-card">
                    <span className="text-xs text-muted-foreground block">Faturamento Previsto</span>
                    <div className="text-2xl font-black text-primary font-mono mt-1">
                      {BRL(totalLoteAmount)}
                    </div>
                  </Card>

                  <Card className="rounded-2xl border border-border/80 shadow-xs p-4 bg-card">
                    <span className="text-xs text-muted-foreground block">Rateio Total Acrescido</span>
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                      {BRL(totalRateioAmount)}
                    </div>
                  </Card>

                  <Card className="rounded-2xl border border-border/80 shadow-xs p-4 bg-card flex flex-col justify-between">
                    <span className="text-xs text-muted-foreground block">Vencimento do Lote</span>
                    <div className="text-base font-bold text-foreground font-mono mt-1">
                      Dia {dueDayFilter === "todos" ? "Conforme Associado" : dueDayFilter}
                    </div>
                  </Card>
                </div>

                {/* Tabela de Conferência */}
                <Card className="rounded-2xl border border-border/80 shadow-sm overflow-hidden">
                  <CardHeader className="p-4 pb-3 border-b border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleSelectAll(!loteItems.every((i) => i.selected))}
                        className="rounded-xl text-xs gap-1.5 font-bold"
                      >
                        {loteItems.every((i) => i.selected) ? (
                          <>
                            <Square className="size-3.5" />
                            <span>Desmarcar Todos</span>
                          </>
                        ) : (
                          <>
                            <CheckSquare className="size-3.5" />
                            <span>Selecionar Todos</span>
                          </>
                        )}
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        {selectedLoteItems.length} associados prontos para faturamento
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        onClick={handleEmitirLote}
                        disabled={batchIssuing || selectedLoteItems.length === 0}
                        className="rounded-xl font-bold text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-sm"
                      >
                        {batchIssuing ? (
                          <span>Emitindo Boletos no Asaas...</span>
                        ) : (
                          <>
                            <CircleDollarSign className="size-4" />
                            <span>Emitir Lote de Boletos ({selectedLoteItems.length})</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-border/60 bg-muted/40 font-bold text-muted-foreground uppercase text-[10px] tracking-wider">
                            <th className="p-3.5 w-10 text-center">Sel.</th>
                            <th className="p-3.5">Associado / CPF</th>
                            <th className="p-3.5">Veículo / Placa</th>
                            <th className="p-3.5 text-center">Dia Venc.</th>
                            <th className="p-3.5 text-right">Mensalidade Base</th>
                            <th className="p-3.5 text-right">Rateio Sinistros</th>
                            <th className="p-3.5 text-right">Valor Final</th>
                            <th className="p-3.5">Consultor</th>
                            <th className="p-3.5 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {loteItems.map((item) => (
                            <tr
                              key={item.memberId}
                              className={`transition-colors cursor-pointer ${
                                item.selected ? "hover:bg-primary/5" : "opacity-60 bg-muted/10 hover:opacity-100"
                              }`}
                              onClick={() => handleToggleItem(item.memberId)}
                            >
                              <td className="p-3.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={item.selected}
                                  onChange={() => handleToggleItem(item.memberId)}
                                  className="rounded border-border"
                                />
                              </td>
                              <td className="p-3.5">
                                <div className="font-bold text-foreground text-sm">{item.memberName}</div>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {formatCpfCnpj(item.memberDocument)}
                                </span>
                              </td>
                              <td className="p-3.5">
                                {item.vehiclePlate ? (
                                  <div>
                                    <span className="font-mono font-bold text-xs text-foreground uppercase">
                                      {item.vehiclePlate}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground block truncate max-w-[150px]">
                                      {item.vehicleModel || "Veículo"}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground/60 text-xs">Sem veículo</span>
                                )}
                              </td>
                              <td className="p-3.5 text-center">
                                <Badge variant="outline" className="text-xs font-mono font-bold">
                                  Dia {item.dueDay}
                                </Badge>
                              </td>
                              <td className="p-3.5 text-right font-mono font-semibold text-muted-foreground">
                                {BRL(item.baseAmount)}
                              </td>
                              <td className="p-3.5 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                                +{BRL(item.rateioAmount)}
                              </td>
                              <td className="p-3.5 text-right font-mono font-extrabold text-foreground text-sm">
                                {BRL(item.totalAmount)}
                              </td>
                              <td className="p-3.5 text-muted-foreground truncate max-w-[120px]">
                                {item.consultantName || "Venda Direta"}
                              </td>
                              <td className="p-3.5 text-center">
                                {item.status === "emitido" ? (
                                  <Badge className="bg-emerald-500 text-white text-[10px]">Emitido</Badge>
                                ) : item.status === "erro" ? (
                                  <Badge variant="destructive" className="text-[10px]" title={item.errorDetails}>
                                    Erro
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-[10px]">Pronto</Badge>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* ------------------------------------------------------------- */}
          {/* ABA 2: GERENCIAR BOLETOS */}
          {/* ------------------------------------------------------------- */}
          <TabsContent value="boletos" className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Boletos Bancários & Cobranças Asaas</h3>
                <p className="text-xs text-muted-foreground">
                  Acompanhe, dê baixa manual, altere vencimentos ou cancele boletos emitidos
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Select value={boletoStatusFilter} onValueChange={setBoletoStatusFilter}>
                  <SelectTrigger className="w-36 rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="TODOS">Todos os Status</SelectItem>
                    <SelectItem value="PENDING">Pendentes</SelectItem>
                    <SelectItem value="RECEIVED">Recebidos / Pagos</SelectItem>
                    <SelectItem value="CONFIRMED">Confirmados</SelectItem>
                    <SelectItem value="OVERDUE">Vencidos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Card className="rounded-2xl border border-border/80 shadow-sm overflow-hidden">
              <CardContent className="p-0">
                {loadingBoletos ? (
                  <div className="p-12 text-center text-sm text-muted-foreground">Sincronizando com gateway Asaas...</div>
                ) : filteredBoletos.length === 0 ? (
                  <div className="p-12 text-center text-sm text-muted-foreground">
                    Nenhum boleto encontrado com os filtros selecionados.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border/60 bg-muted/40 font-bold text-muted-foreground uppercase text-[10px] tracking-wider">
                          <th className="p-3.5">Associado</th>
                          <th className="p-3.5">Descrição</th>
                          <th className="p-3.5">Vencimento</th>
                          <th className="p-3.5 text-right">Valor</th>
                          <th className="p-3.5 text-center">Status</th>
                          <th className="p-3.5 text-right">Ações Rápidas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {filteredBoletos.map((b: any) => {
                          const isPaid =
                            b.status === "RECEIVED" ||
                            b.status === "CONFIRMED" ||
                            b.status === "RECEIVED_IN_CASH";
                          const isPending = b.status === "PENDING" || b.status === "OVERDUE";
                          const boletoUrl = b.bankSlipUrl || b.invoiceUrl;

                          return (
                            <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                              <td className="p-3.5">
                                <div className="font-bold text-foreground text-sm">{b.customerName || b.customer}</div>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {b.customerPhone ? formatPhone(b.customerPhone) : ""}
                                </span>
                              </td>
                              <td className="p-3.5 text-muted-foreground max-w-xs truncate">
                                {b.description || "Proteção Veicular"}
                              </td>
                              <td className="p-3.5 font-mono font-semibold text-foreground">
                                {b.dueDate ? b.dueDate.split("-").reverse().join("/") : "-"}
                              </td>
                              <td className="p-3.5 text-right font-mono font-extrabold text-foreground text-sm">
                                {BRL(b.value)}
                              </td>
                              <td className="p-3.5 text-center">
                                <Badge
                                  className={
                                    isPaid
                                      ? "bg-emerald-500 text-white text-[10px]"
                                      : b.status === "OVERDUE"
                                      ? "bg-destructive text-destructive-foreground text-[10px]"
                                      : "bg-amber-500 text-white text-[10px]"
                                  }
                                >
                                  {isPaid ? "PAGO" : b.status === "OVERDUE" ? "VENCIDO" : "PENDENTE"}
                                </Badge>
                              </td>
                              <td className="p-3.5 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* Link do Boleto */}
                                  {boletoUrl && (
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => window.open(boletoUrl, "_blank")}
                                      title="Abrir Boleto / PIX"
                                      className="size-8 rounded-lg"
                                    >
                                      <ExternalLink className="size-3.5" />
                                    </Button>
                                  )}

                                  {/* WhatsApp */}
                                  {boletoUrl && (
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => {
                                        const msg = generateBoletoWhatsAppMessage(
                                          b.customerName || "Associado",
                                          "Seu Veículo",
                                          b.value,
                                          b.dueDate,
                                          boletoUrl,
                                          companyName || "Planmais"
                                        );
                                        const cleanPhone = (b.customerPhone || "").replace(/\D/g, "");
                                        window.open(
                                          `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(msg)}`,
                                          "_blank"
                                        );
                                      }}
                                      title="Cobrar via WhatsApp"
                                      className="size-8 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                    >
                                      <MessageCircle className="size-3.5" />
                                    </Button>
                                  )}

                                  {/* Ações para boletos pendentes */}
                                  {isPending && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setSelectedBoletoForBaixa(b);
                                          setBaixaValue(String(b.value));
                                          setBaixaModalOpen(true);
                                        }}
                                        className="h-8 rounded-lg text-xs font-bold"
                                      >
                                        Baixa Manual
                                      </Button>

                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setSelectedBoletoForVenc(b);
                                          setNewDueDate(b.dueDate);
                                          setVencimentoModalOpen(true);
                                        }}
                                        className="h-8 rounded-lg text-xs"
                                      >
                                        Mudar Data
                                      </Button>

                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => {
                                          if (confirm(`Deseja realmente cancelar o boleto no Asaas?`)) {
                                            cancelPaymentMutation.mutate({
                                              data: { companyId: companyId!, paymentId: b.id },
                                            });
                                          }
                                        }}
                                        title="Cancelar Boleto"
                                        className="size-8 rounded-lg text-destructive hover:bg-destructive/10"
                                      >
                                        <Ban className="size-3.5" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ------------------------------------------------------------- */}
          {/* ABA 3: RATEIO DE SINISTROS */}
          {/* ------------------------------------------------------------- */}
          <TabsContent value="rateio" className="space-y-5 pt-2">
            <Card className="rounded-2xl border border-border/80 shadow-sm overflow-hidden">
              <CardHeader className="p-5 pb-3 border-b border-border/60 bg-muted/20">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <PiggyBank className="size-4 text-primary" />
                  <span>Configuração do Rateio de Sinistros & Despesas</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  O valor de rateio é calculado com base nos eventos e sinistros do mês e acrescido na mensalidade do lote
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Mês do Rateio</Label>
                    <Input
                      type="month"
                      value={rateioMonth}
                      onChange={(e) => setRateioMonth(e.target.value)}
                      className="rounded-xl text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Tipo do Rateio</Label>
                    <Select value={rateioType} onValueChange={(v: any) => setRateioType(v)}>
                      <SelectTrigger className="rounded-xl text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="PERCENTUAL">Valor Percentual (% sobre mensalidade)</SelectItem>
                        <SelectItem value="VALOR_FIXO">Valor Fixo Dividido (R$ por veículo)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      {rateioType === "PERCENTUAL" ? "Percentual de Acréscimo (%)" : "Valor Fixo por Veículo (R$)"}
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={rateioPercentInput}
                      onChange={(e) => setRateioPercentInput(e.target.value)}
                      className="rounded-xl text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Resumo Dinâmico dos Sinistros do Mês */}
                <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-3">
                  <span className="text-xs font-bold text-foreground block">
                    Base de Cálculo do Mês Selecionado ({rateioMonth}):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground block">Total de Sinistros / Eventos:</span>
                      <span className="text-lg font-black text-foreground font-mono">
                        {BRL(totalEventosMes)}
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        {eventosDoMes.length} eventos lançados no menu Evento
                      </span>
                    </div>

                    <div>
                      <span className="text-muted-foreground block">Veículos Protegidos Ativos:</span>
                      <span className="text-lg font-black text-primary font-mono">
                        {totalActiveVehicles} veículos
                      </span>
                    </div>

                    <div>
                      <span className="text-muted-foreground block">Rateio Proporcional Sugerido:</span>
                      <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                        {BRL(suggestedRateioFixo)} / veículo
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSalvarRateio} className="rounded-xl font-bold text-xs gap-2">
                    <CheckCircle2 className="size-4" />
                    <span>Salvar e Aplicar Rateio na Cobrança</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* MODAL: BAIXA MANUAL */}
        <Dialog open={baixaModalOpen} onOpenChange={setBaixaModalOpen}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Registrar Baixa Manual</DialogTitle>
              <DialogDescription className="text-xs">
                Informe o pagamento recebido para liquidar a cobrança no Asaas
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                <span className="text-muted-foreground block">Associado:</span>
                <span className="font-bold text-foreground text-sm block">
                  {selectedBoletoForBaixa?.customerName}
                </span>
                <span className="text-muted-foreground block mt-1">Valor Original:</span>
                <span className="font-extrabold text-foreground font-mono">
                  {BRL(selectedBoletoForBaixa?.value || 0)}
                </span>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Data do Pagamento *</Label>
                <Input
                  type="date"
                  value={baixaDate}
                  onChange={(e) => setBaixaDate(e.target.value)}
                  className="rounded-xl text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Valor Recebido (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={baixaValue}
                  onChange={(e) => setBaixaValue(e.target.value)}
                  className="rounded-xl text-xs font-mono font-bold"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={() => setBaixaModalOpen(false)} className="rounded-xl text-xs">
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  baixaManualMutation.mutate({
                    data: {
                      companyId: companyId!,
                      paymentId: selectedBoletoForBaixa.id,
                      paymentDate: baixaDate,
                      value: Number(baixaValue) || undefined,
                    },
                  });
                }}
                disabled={baixaManualMutation.isPending}
                className="rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {baixaManualMutation.isPending ? "Confirmando..." : "Confirmar Baixa Manual"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL: ALTERAR DATA DE PAGAMENTO / VENCIMENTO */}
        <Dialog open={vencimentoModalOpen} onOpenChange={setVencimentoModalOpen}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Alterar Data do Boleto</DialogTitle>
              <DialogDescription className="text-xs">
                Atualize o vencimento da cobrança diretamente no gateway Asaas
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                <span className="text-muted-foreground block">Associado:</span>
                <span className="font-bold text-foreground text-sm block">
                  {selectedBoletoForVenc?.customerName}
                </span>
                <span className="text-muted-foreground block mt-1">Vencimento Atual:</span>
                <span className="font-mono text-foreground">
                  {selectedBoletoForVenc?.dueDate?.split("-").reverse().join("/")}
                </span>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Nova Data de Vencimento *</Label>
                <Input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="rounded-xl text-xs font-mono font-bold"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={() => setVencimentoModalOpen(false)} className="rounded-xl text-xs">
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (!newDueDate) return;
                  updateDueDateMutation.mutate({
                    data: {
                      companyId: companyId!,
                      paymentId: selectedBoletoForVenc.id,
                      dueDate: newDueDate,
                    },
                  });
                }}
                disabled={updateDueDateMutation.isPending}
                className="rounded-xl text-xs font-bold"
              >
                {updateDueDateMutation.isPending ? "Atualizando..." : "Salvar Nova Data"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
