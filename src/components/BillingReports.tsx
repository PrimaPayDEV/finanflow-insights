import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  FileBarChart2,
  Receipt,
  Users,
  Car,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  CalendarIcon,
  DollarSign,
  Filter,
  Download,
  Search,
  SlidersHorizontal,
  Send,
  FileSpreadsheet,
  FileText,
  Percent,
  Check,
  ExternalLink,
  X,
  CreditCard,
  QrCode,
  Sparkles,
  TrendingDown,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, differenceInDays, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useServerFn } from "@tanstack/react-start";
import { getBillingReports } from "@/lib/reports.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { BRL, formatCpfCnpj, formatPhone } from "@/lib/format";

// Formatação oficial de placas (DFG2154 -> DFG-2154)
function formatPlate(rawPlate: string): string {
  const clean = (rawPlate || "BRA2E19").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (/^[A-Z]{3}[0-9]{4}$/.test(clean)) {
    return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  }
  return clean;
}

// Componente Compacto de Placa
function ReportPlateBadge({ plate }: { plate: string }) {
  const formatted = formatPlate(plate);
  return (
    <span className="inline-flex items-center gap-1 font-mono font-extrabold text-[11px] bg-slate-900 text-slate-100 dark:bg-slate-100 dark:text-slate-900 px-2 py-0.5 rounded-md border border-slate-700 tracking-wider select-none shrink-0">
      <span className="w-1.5 h-1 bg-[#003399] rounded-2xs inline-block" />
      {formatted}
    </span>
  );
}

export function BillingReports() {
  const { companyId } = useAuth();
  const fetchReports = useServerFn(getBillingReports);

  // Aba principal do relatório
  const [reportTab, setReportTab] = useState<"invoices" | "vehicles" | "partners" | "overdue">("invoices");

  // Filtros
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<string>("month");
  const [customRange, setCustomRange] = useState<{ from?: Date; to?: Date }>();
  const [statusFilter, setStatusFilter] = useState("all");
  const [partnerFilter, setPartnerFilter] = useState("all");
  const [billingTypeFilter, setBillingTypeFilter] = useState("all");
  const [amountRangeFilter, setAmountRangeFilter] = useState("all");

  // Visibilidade de Colunas Personalizáveis
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    customerDoc: true,
    customerContact: true,
    vehicle: true,
    paymentMethod: true,
    paymentDate: true,
    netValue: true,
    partner: true,
    actions: true,
  });

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Query de dados
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["billingReports", companyId, period, customRange],
    queryFn: () =>
      fetchReports({
        data: {
          companyId: companyId!,
          period,
          customRange: customRange
            ? {
                from: customRange.from?.toISOString(),
                to: customRange.to?.toISOString(),
              }
            : undefined,
        },
      }),
    enabled: !!companyId,
  });

  // Lista dinâmica de parceiros para o filtro
  const availablePartners = useMemo(() => {
    const list = data?.partners || [];
    return list.map((p: any) => ({ id: p.partnerId, name: p.partnerName }));
  }, [data?.partners]);

  // Filtragem dos Boletos / Mensalidades
  const filteredInvoices = useMemo(() => {
    if (!data?.ok || !data.invoices) return [];
    const term = search.toLowerCase().trim();

    return data.invoices.filter((inv: any) => {
      // 1. Busca textual (Nome, CPF, Placa, Modelo, Consultor, Nosso Número)
      if (term) {
        const matchSearch =
          inv.customerName?.toLowerCase().includes(term) ||
          inv.customerDocument?.toLowerCase().includes(term) ||
          inv.vehiclePlate?.toLowerCase().includes(term) ||
          inv.vehicleModel?.toLowerCase().includes(term) ||
          inv.partnerName?.toLowerCase().includes(term) ||
          inv.nossoNumero?.toLowerCase().includes(term);

        if (!matchSearch) return false;
      }

      // 2. Filtro de Status
      if (statusFilter !== "all") {
        if (statusFilter === "RECEIVED" && !(inv.status === "RECEIVED" || inv.status === "CONFIRMED" || inv.status === "RECEIVED_IN_CASH")) {
          return false;
        }
        if (statusFilter === "PENDING" && inv.status !== "PENDING") return false;
        if (statusFilter === "OVERDUE" && inv.status !== "OVERDUE") return false;
      }

      // 3. Filtro por Consultor / Parceiro
      if (partnerFilter !== "all") {
        if (inv.partnerId !== partnerFilter && inv.partnerName !== partnerFilter) return false;
      }

      // 4. Filtro por Forma de Cobrança
      if (billingTypeFilter !== "all" && inv.billingType !== billingTypeFilter) {
        return false;
      }

      // 5. Filtro por Faixa de Valor
      if (amountRangeFilter !== "all") {
        if (amountRangeFilter === "up_to_150" && inv.value > 150) return false;
        if (amountRangeFilter === "150_to_250" && (inv.value <= 150 || inv.value > 250)) return false;
        if (amountRangeFilter === "above_250" && inv.value <= 250) return false;
      }

      return true;
    });
  }, [data?.invoices, search, statusFilter, partnerFilter, billingTypeFilter, amountRangeFilter]);

  // Filtragem da Frota de Veículos
  const filteredVehicles = useMemo(() => {
    if (!data?.ok || !data.vehicles) return [];
    const term = search.toLowerCase().trim();

    return data.vehicles.filter((v: any) => {
      if (term) {
        const matchSearch =
          v.plate?.toLowerCase().includes(term) ||
          v.brand?.toLowerCase().includes(term) ||
          v.model?.toLowerCase().includes(term) ||
          v.memberName?.toLowerCase().includes(term) ||
          v.memberDocument?.toLowerCase().includes(term) ||
          v.partnerName?.toLowerCase().includes(term);

        if (!matchSearch) return false;
      }

      if (partnerFilter !== "all" && v.partnerName !== partnerFilter) {
        return false;
      }

      return true;
    });
  }, [data?.vehicles, search, partnerFilter]);

  // Filtragem de Consultores / Parceiros
  const filteredPartners = useMemo(() => {
    if (!data?.ok || !data.partners) return [];
    const term = search.toLowerCase().trim();

    return data.partners.filter((p: any) => {
      if (term) {
        const matchSearch =
          p.partnerName?.toLowerCase().includes(term) ||
          p.partnerDocument?.toLowerCase().includes(term) ||
          p.partnerEmail?.toLowerCase().includes(term) ||
          p.partnerPhone?.toLowerCase().includes(term);

        if (!matchSearch) return false;
      }

      if (partnerFilter !== "all" && p.partnerId !== partnerFilter && p.partnerName !== partnerFilter) {
        return false;
      }

      return true;
    });
  }, [data?.partners, search, partnerFilter]);

  // Filtragem Exclusiva de Inadimplência
  const overdueInvoices = useMemo(() => {
    return filteredInvoices.filter((inv: any) => inv.status === "OVERDUE");
  }, [filteredInvoices]);

  // KPIs Dinâmicos Baseados no Filtro Atual
  const metrics = useMemo(() => {
    let received = 0;
    let pending = 0;
    let overdue = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let overdueCount = 0;

    for (const inv of filteredInvoices) {
      if (inv.status === "RECEIVED" || inv.status === "CONFIRMED" || inv.status === "RECEIVED_IN_CASH") {
        received += inv.value;
        paidCount++;
      } else if (inv.status === "OVERDUE") {
        overdue += inv.value;
        overdueCount++;
      } else {
        pending += inv.value;
        pendingCount++;
      }
    }

    const total = received + pending + overdue;
    const defaultRate = total > 0 ? (overdue / total) * 100 : 0;
    const avgTicket = filteredInvoices.length > 0 ? total / filteredInvoices.length : 0;

    return {
      received,
      pending,
      overdue,
      paidCount,
      pendingCount,
      overdueCount,
      total,
      defaultRate: Number(defaultRate.toFixed(1)),
      avgTicket,
      vehiclesCount: filteredVehicles.length,
    };
  }, [filteredInvoices, filteredVehicles]);

  // Resetar todos os filtros
  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPartnerFilter("all");
    setBillingTypeFilter("all");
    setAmountRangeFilter("all");
    setPeriod("month");
    setCustomRange(undefined);
    toast.info("Filtros redefinidos");
  };

  const hasActiveFilters =
    search !== "" ||
    statusFilter !== "all" ||
    partnerFilter !== "all" ||
    billingTypeFilter !== "all" ||
    amountRangeFilter !== "all" ||
    period !== "month";

  // Helper de badge de status
  const getStatusBadge = (status: string) => {
    if (status === "RECEIVED" || status === "CONFIRMED" || status === "RECEIVED_IN_CASH") {
      return (
        <Badge className="bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 font-bold text-[10px] px-2 py-0.5 gap-1">
          <CheckCircle2 className="size-3" />
          Pago
        </Badge>
      );
    }
    if (status === "OVERDUE") {
      return (
        <Badge className="bg-rose-500/15 text-rose-600 border border-rose-500/30 font-bold text-[10px] px-2 py-0.5 gap-1">
          <AlertTriangle className="size-3" />
          Vencido
        </Badge>
      );
    }
    return (
      <Badge className="bg-amber-500/15 text-amber-600 border border-amber-500/30 font-bold text-[10px] px-2 py-0.5 gap-1">
        <Clock className="size-3" />
        Pendente
      </Badge>
    );
  };

  // Helper de cálculo de dias de vencimento
  const getDueDaysText = (dueDateStr: string, status: string) => {
    try {
      const due = startOfDay(new Date(dueDateStr + "T00:00:00"));
      const today = startOfDay(new Date());
      const diff = differenceInDays(due, today);

      if (status === "RECEIVED" || status === "CONFIRMED") {
        return null;
      }

      if (diff === 0) {
        return <span className="text-amber-600 font-bold text-[10px] block">Vence hoje</span>;
      }
      if (diff > 0) {
        return <span className="text-muted-foreground text-[10px] block">Vence em {diff} dias</span>;
      }
      return <span className="text-rose-600 font-bold text-[10px] block">Atrasado ({Math.abs(diff)}d) • Boleto expirado</span>;
    } catch {
      return null;
    }
  };

  // Exportar Relatório em PDF Profissional
  const exportPDF = () => {
    const doc = new jsPDF("l", "pt", "a4");
    doc.setFont("helvetica");

    // Cabeçalho da Planmais
    doc.setFontSize(16);
    doc.setTextColor(24, 24, 27);
    doc.text("PLANMAIS PROTEÇÃO VEICULAR", 40, 40);

    doc.setFontSize(10);
    doc.setTextColor(113, 113, 122);
    const dateStr = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    doc.text(`Relatório Gerencial Emitido em: ${dateStr}`, 40, 56);

    let title = "";
    let head: string[][] = [];
    let body: any[][] = [];

    if (reportTab === "invoices") {
      title = "Demonstrativo Consolidado de Mensalidades & Faturamento";
      head = [["Associado / CPF", "Veículo / Placa", "Vencimento", "Pagamento", "Valor", "Status", "Forma", "Consultor"]];
      body = filteredInvoices.map((inv: any) => [
        `${inv.customerName}\n${inv.customerDocument ? formatCpfCnpj(inv.customerDocument) : ""}`,
        `${formatPlate(inv.vehiclePlate)}\n${inv.vehicleModel || ""}`,
        inv.dueDate ? format(new Date(inv.dueDate + "T00:00:00"), "dd/MM/yyyy") : "-",
        inv.paymentDate ? format(new Date(inv.paymentDate + "T00:00:00"), "dd/MM/yyyy") : "Em aberto",
        BRL(inv.value),
        inv.status === "RECEIVED" || inv.status === "CONFIRMED" ? "Pago" : inv.status === "OVERDUE" ? "Vencido" : "Pendente",
        inv.billingType || "BOLETO",
        inv.partnerName || "Direto",
      ]);
    } else if (reportTab === "vehicles") {
      title = "Inventário da Frota Protegida & Coberturas Ativas";
      head = [["Placa", "Veículo / Ano", "Associado Proprietário", "FIPE", "Plano Contratado", "Mensalidade", "Status", "Consultor"]];
      body = filteredVehicles.map((v: any) => [
        formatPlate(v.plate),
        `${v.brand} ${v.model} (${v.year})`,
        `${v.memberName}\n${formatCpfCnpj(v.memberDocument || "")}`,
        BRL(v.fipeValue || 0),
        v.coveragePlan,
        BRL(v.monthlyFee || 0),
        v.status === "ACTIVE" ? "Proteção Ativa" : "Pendente",
        v.partnerName || "Direto",
      ]);
    } else if (reportTab === "partners") {
      title = "Relatório de Produção e Comissões de Consultores / Parceiros";
      head = [["Consultor / Parceiro", "Contato", "Veículos", "Faturas Pagas", "Faturas Pendentes", "Faturamento Total", "% Split", "Comissão Prevista", "Comissão Liquidada"]];
      body = filteredPartners.map((p: any) => [
        p.partnerName,
        `${p.partnerPhone || ""} ${p.partnerEmail ? "• " + p.partnerEmail : ""}`,
        p.activeVehiclesCount || 0,
        p.paidInvoicesCount || 0,
        p.pendingInvoicesCount || 0,
        BRL((p.grossVolume || 0) + (p.pendingGrossVolume || 0)),
        `${p.splitPercent}%`,
        BRL(p.pendingSplitAmount || 0),
        BRL(p.totalValue || 0),
      ]);
    } else {
      title = "Relatório de Inadimplência e Cobrança Ativa";
      head = [["Associado", "Contato / Telefone", "Veículo / Placa", "Vencimento Original", "Dias de Atraso", "Valor em Aberto", "Consultor"]];
      body = overdueInvoices.map((inv: any) => {
        const diff = inv.dueDate ? differenceInDays(startOfDay(new Date()), startOfDay(new Date(inv.dueDate + "T00:00:00"))) : 0;
        return [
          `${inv.customerName}\n${inv.customerDocument ? formatCpfCnpj(inv.customerDocument) : ""}`,
          inv.customerPhone ? formatPhone(inv.customerPhone) : "Sem telefone",
          `${formatPlate(inv.vehiclePlate)} - ${inv.vehicleModel}`,
          inv.dueDate ? format(new Date(inv.dueDate + "T00:00:00"), "dd/MM/yyyy") : "-",
          `${Math.max(0, diff)} dias`,
          BRL(inv.value),
          inv.partnerName || "Direto",
        ];
      });
    }

    doc.setFontSize(12);
    doc.setTextColor(234, 88, 12); // Cor primária Planmais
    doc.text(title, 40, 78);

    // Resumo no cabeçalho
    doc.setFontSize(9);
    doc.setTextColor(39, 39, 42);
    doc.text(
      `Totais do Filtro: ${filteredInvoices.length} lançamentos | Recebido: ${BRL(metrics.received)} | Pendente: ${BRL(metrics.pending)} | Inadimplência: ${BRL(metrics.overdue)} (${metrics.defaultRate}%)`,
      40,
      94
    );

    autoTable(doc, {
      startY: 104,
      head: head,
      body: body,
      theme: "grid",
      headStyles: {
        fillColor: [24, 24, 27],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: "bold",
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [39, 39, 42],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      margin: { left: 40, right: 40 },
    });

    const filename = `planmais_relatorio_${reportTab}_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`;
    doc.save(filename);
    toast.success("Relatório em PDF exportado com sucesso!");
  };

  // Exportar Relatório em CSV / Excel
  const exportCSV = () => {
    let headers: string[] = [];
    let rows: string[][] = [];

    if (reportTab === "invoices") {
      headers = [
        "ID Fatura",
        "Associado",
        "CPF/CNPJ",
        "Telefone",
        "E-mail",
        "Placa",
        "Veículo",
        "Ano",
        "Vencimento",
        "Data Pagamento",
        "Valor Bruto",
        "Valor Líquido",
        "Forma Pagamento",
        "Status",
        "Consultor",
        "% Comissão",
        "Valor Comissão",
        "Nosso Número",
      ];
      rows = filteredInvoices.map((inv: any) => [
        inv.id || "",
        `"${inv.customerName || ""}"`,
        `"${inv.customerDocument || ""}"`,
        `"${inv.customerPhone || ""}"`,
        `"${inv.customerEmail || ""}"`,
        `"${formatPlate(inv.vehiclePlate)}"`,
        `"${inv.vehicleModel || ""}"`,
        inv.vehicleYear || "",
        inv.dueDate || "",
        inv.paymentDate || "",
        inv.value?.toFixed(2) || "0.00",
        inv.netValue?.toFixed(2) || "0.00",
        inv.billingType || "BOLETO",
        inv.status || "",
        `"${inv.partnerName || ""}"`,
        inv.splitPercent || "0",
        inv.splitAmount?.toFixed(2) || "0.00",
        `"${inv.nossoNumero || ""}"`,
      ]);
    } else if (reportTab === "vehicles") {
      headers = [
        "Placa",
        "Marca",
        "Modelo",
        "Ano",
        "Cor",
        "Combustível",
        "Associado",
        "CPF",
        "Telefone",
        "Cidade",
        "Valor FIPE",
        "Plano",
        "Mensalidade",
        "Dia Vencimento",
        "Status",
        "Consultor",
      ];
      rows = filteredVehicles.map((v: any) => [
        `"${formatPlate(v.plate)}"`,
        `"${v.brand}"`,
        `"${v.model}"`,
        v.year || "",
        `"${v.color || ""}"`,
        `"${v.fuel || ""}"`,
        `"${v.memberName || ""}"`,
        `"${v.memberDocument || ""}"`,
        `"${v.memberPhone || ""}"`,
        `"${v.memberCity || ""}"`,
        v.fipeValue?.toFixed(2) || "0.00",
        `"${v.coveragePlan || ""}"`,
        v.monthlyFee?.toFixed(2) || "0.00",
        v.dueDay || "",
        `"${v.status || ""}"`,
        `"${v.partnerName || ""}"`,
      ]);
    } else if (reportTab === "partners") {
      headers = [
        "Consultor / Parceiro",
        "CPF/CNPJ",
        "Telefone",
        "E-mail",
        "Veículos Ativos",
        "Faturas Pagas",
        "Faturas Pendentes",
        "Faturamento Pago",
        "Faturamento Pendente",
        "% Comissão",
        "Comissão Prevista (Pendentes)",
        "Comissão Liquidada (Pagas)",
      ];
      rows = filteredPartners.map((p: any) => [
        `"${p.partnerName}"`,
        `"${p.partnerDocument || ""}"`,
        `"${p.partnerPhone || ""}"`,
        `"${p.partnerEmail || ""}"`,
        p.activeVehiclesCount || 0,
        p.paidInvoicesCount || 0,
        p.pendingInvoicesCount || 0,
        p.grossVolume?.toFixed(2) || "0.00",
        p.pendingGrossVolume?.toFixed(2) || "0.00",
        p.splitPercent || "0",
        p.pendingSplitAmount?.toFixed(2) || "0.00",
        p.totalValue?.toFixed(2) || "0.00",
      ]);
    } else {
      headers = [
        "Associado",
        "CPF",
        "Telefone",
        "Veículo",
        "Placa",
        "Vencimento Original",
        "Dias em Atraso",
        "Valor em Aberto",
        "Consultor",
      ];
      rows = overdueInvoices.map((inv: any) => {
        const diff = inv.dueDate ? differenceInDays(startOfDay(new Date()), startOfDay(new Date(inv.dueDate + "T00:00:00"))) : 0;
        return [
          `"${inv.customerName}"`,
          `"${inv.customerDocument || ""}"`,
          `"${inv.customerPhone || ""}"`,
          `"${inv.vehicleModel || ""}"`,
          `"${formatPlate(inv.vehiclePlate)}"`,
          inv.dueDate || "",
          Math.max(0, diff),
          inv.value?.toFixed(2) || "0.00",
          `"${inv.partnerName || ""}"`,
        ];
      });
    }

    const csvContent =
      "\uFEFF" +
      headers.join(";") +
      "\n" +
      rows.map((row) => row.join(";")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `planmais_relatorio_${reportTab}_${format(new Date(), "yyyyMMdd_HHmm")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Planilha CSV exportada com sucesso!");
  };

  // Enviar Mensagem de Cobrança / Lembrete WhatsApp
  const handleSendWhatsApp = (inv: any) => {
    if (!inv.customerPhone) {
      toast.warning("Associado não possui telefone celular cadastrado.");
      return;
    }
    const cleanPhone = inv.customerPhone.replace(/\D/g, "");
    const dateFormatted = inv.dueDate ? format(new Date(inv.dueDate + "T00:00:00"), "dd/MM/yyyy") : "breve";
    const msg = encodeURIComponent(
      `Olá ${inv.customerName}, tudo bem? Aqui é da Planmais Proteção Veicular!\n\nPassando para lembrar da mensalidade referente ao seu veículo ${inv.vehicleModel} (Placa ${formatPlate(inv.vehiclePlate)}).\n\n📌 Valor: ${BRL(inv.value)}\n📅 Vencimento: ${dateFormatted}\n\n⚠️ Importante: Para garantir que seu veículo continue com cobertura ativa para assistência e socorro, o pagamento deve ser realizado impreterivelmente até a data de vencimento. Boletos vencidos não são aceitos pelo banco.\n\nQualquer dúvida estamos à disposição!`
    );
    window.open(`https://wa.me/55${cleanPhone}?text=${msg}`, "_blank");
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <div className="size-10 rounded-full border-3 border-primary border-t-transparent animate-spin" />
        <p className="text-sm font-semibold text-muted-foreground animate-pulse">
          Consolidando dados financeiros e cadastrais da Planmais...
        </p>
      </div>
    );
  }

  if (error || !data?.ok) {
    return (
      <div className="p-8 text-center bg-destructive/10 border border-destructive/20 rounded-2xl max-w-xl mx-auto my-8 space-y-3">
        <AlertCircle className="size-10 text-destructive mx-auto" />
        <h3 className="text-sm font-bold text-destructive">Falha ao carregar relatórios</h3>
        <p className="text-xs text-muted-foreground">
          Ocorreu uma instabilidade ao conectar com o serviço de faturamento. Verifique as credenciais da API do Asaas.
        </p>
        <Button onClick={() => refetch()} variant="outline" size="sm" className="rounded-xl mt-2">
          Tentar Novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. CARDS DE RESUMO EXECUTIVO / KPIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Recebido */}
        <Card className="rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-card shadow-xs">
          <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Total Faturado / Pago
            </span>
            <div className="size-7 rounded-lg bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {BRL(metrics.received)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {metrics.paidCount} {metrics.paidCount === 1 ? "mensalidade quitada" : "mensalidades quitadas"}
            </p>
          </CardContent>
        </Card>

        {/* Previsão a Receber */}
        <Card className="rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-card shadow-xs">
          <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              A Vencer / Previsão
            </span>
            <div className="size-7 rounded-lg bg-amber-500/20 text-amber-600 flex items-center justify-center">
              <Clock className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400">
              {BRL(metrics.pending)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {metrics.pendingCount} {metrics.pendingCount === 1 ? "boleto em aberto" : "boletos em aberto"}
            </p>
          </CardContent>
        </Card>

        {/* Inadimplência em Aberto */}
        <Card className="rounded-2xl border border-rose-500/25 bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-card shadow-xs">
          <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Inadimplência
            </span>
            <div className="size-7 rounded-lg bg-rose-500/20 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xl font-extrabold text-rose-600 dark:text-rose-400">
                {BRL(metrics.overdue)}
              </span>
              <Badge className="bg-rose-500/15 text-rose-600 border border-rose-500/30 text-[9px] font-bold px-1.5 py-0">
                {metrics.defaultRate}% taxa
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {metrics.overdueCount} {metrics.overdueCount === 1 ? "fatura vencida" : "faturas vencidas"}
            </p>
          </CardContent>
        </Card>

        {/* Frota e Ticket Médio */}
        <Card className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-primary/5 to-card shadow-xs">
          <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Frota Protegida
            </span>
            <div className="size-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center">
              <Car className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-xl font-extrabold text-foreground">
              {metrics.vehiclesCount} {metrics.vehiclesCount === 1 ? "veículo" : "veículos"}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Ticket Médio: <strong>{BRL(metrics.avgTicket)}</strong> / mês
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 2. ABAS DE NAVEGAÇÃO ENTRE OS RELATÓRIOS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/70 pb-3">
        <Tabs
          value={reportTab}
          onValueChange={(v: any) => setReportTab(v)}
          className="w-full sm:w-auto"
        >
          <TabsList className="bg-muted/50 p-1 rounded-xl h-9.5 gap-1">
            <TabsTrigger
              value="invoices"
              className="rounded-lg text-xs font-bold gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-xs"
            >
              <Receipt className="size-3.5" />
              Mensalidades & Boletos
            </TabsTrigger>
            <TabsTrigger
              value="vehicles"
              className="rounded-lg text-xs font-bold gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-xs"
            >
              <Car className="size-3.5" />
              Frota de Veículos
            </TabsTrigger>
            <TabsTrigger
              value="partners"
              className="rounded-lg text-xs font-bold gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-xs"
            >
              <Users className="size-3.5" />
              Consultores & Split
            </TabsTrigger>
            <TabsTrigger
              value="overdue"
              className="rounded-lg text-xs font-bold gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-xs text-rose-600 data-[state=active]:text-rose-600"
            >
              <AlertTriangle className="size-3.5" />
              Inadimplência
              {overdueInvoices.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] bg-rose-500 text-white font-black">
                  {overdueInvoices.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Botões de Ação Globais: Exportar PDF, CSV e Seleção de Colunas */}
        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          {/* Seletor de Colunas Visíveis */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8.5 rounded-xl text-xs gap-1.5 font-semibold">
                <SlidersHorizontal className="size-3.5" />
                Colunas
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl">
              <DropdownMenuLabel className="text-xs">Exibir / Ocultar Colunas</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={visibleColumns.customerDoc}
                onCheckedChange={() => toggleColumn("customerDoc")}
                className="text-xs"
              >
                CPF / CNPJ
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.customerContact}
                onCheckedChange={() => toggleColumn("customerContact")}
                className="text-xs"
              >
                Telefone & Contato
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.vehicle}
                onCheckedChange={() => toggleColumn("vehicle")}
                className="text-xs"
              >
                Veículo & Placa
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.paymentMethod}
                onCheckedChange={() => toggleColumn("paymentMethod")}
                className="text-xs"
              >
                Forma de Cobrança
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.paymentDate}
                onCheckedChange={() => toggleColumn("paymentDate")}
                className="text-xs"
              >
                Data de Baixa / Pagamento
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.netValue}
                onCheckedChange={() => toggleColumn("netValue")}
                className="text-xs"
              >
                Valor Líquido
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.partner}
                onCheckedChange={() => toggleColumn("partner")}
                className="text-xs"
              >
                Consultor & Comissão
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.actions}
                onCheckedChange={() => toggleColumn("actions")}
                className="text-xs"
              >
                Ações Rápidas (WhatsApp)
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Exportar CSV */}
          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            className="h-8.5 rounded-xl text-xs gap-1.5 font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 border-emerald-500/30"
          >
            <FileSpreadsheet className="size-3.5" />
            <span className="hidden sm:inline">Exportar Excel</span>
            <span className="sm:hidden">Excel</span>
          </Button>

          {/* Exportar PDF */}
          <Button
            size="sm"
            onClick={exportPDF}
            className="h-8.5 rounded-xl text-xs gap-1.5 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
          >
            <Download className="size-3.5" />
            <span className="hidden sm:inline">Exportar PDF</span>
            <span className="sm:hidden">PDF</span>
          </Button>
        </div>
      </div>

      {/* 3. BARRA DE FILTROS AVANÇADOS MULTI-CRITÉRIO */}
      <Card className="rounded-2xl border border-border/80 shadow-xs bg-card/60 backdrop-blur-xs">
        <CardContent className="p-3.5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {/* Busca textual livre */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar associado, placa, CPF ou consultor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8.5 h-8.5 text-xs rounded-xl bg-background"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Filtro de Período */}
            <div>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="h-8.5 text-xs rounded-xl bg-background">
                  <CalendarIcon className="size-3.5 mr-1 text-muted-foreground" />
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="month">Este Mês</SelectItem>
                  <SelectItem value="last_month">Mês Anterior</SelectItem>
                  <SelectItem value="30d">Últimos 30 dias</SelectItem>
                  <SelectItem value="90d">Últimos 90 dias</SelectItem>
                  <SelectItem value="year">Ano 2026</SelectItem>
                  <SelectItem value="all">Todo Histórico</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro de Status */}
            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8.5 text-xs rounded-xl bg-background">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="RECEIVED">Pagos / Liquidados</SelectItem>
                  <SelectItem value="PENDING">Pendentes (A Vencer)</SelectItem>
                  <SelectItem value="OVERDUE">Vencidos (Em Atraso)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro de Consultor / Parceiro */}
            <div>
              <Select value={partnerFilter} onValueChange={setPartnerFilter}>
                <SelectTrigger className="h-8.5 text-xs rounded-xl bg-background truncate">
                  <SelectValue placeholder="Consultor" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">Todos Consultores</SelectItem>
                  {availablePartners.map((p: any) => (
                    <SelectItem key={p.id} value={p.name}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro de Forma de Cobrança */}
            <div>
              <Select value={billingTypeFilter} onValueChange={setBillingTypeFilter}>
                <SelectTrigger className="h-8.5 text-xs rounded-xl bg-background">
                  <SelectValue placeholder="Forma" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">Todas Formas</SelectItem>
                  <SelectItem value="BOLETO">Boleto Bancário</SelectItem>
                  <SelectItem value="PIX">Pix</SelectItem>
                  <SelectItem value="CREDIT_CARD">Cartão de Crédito</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Linha secundária de filtros: Data Customizada e Botão Limpar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/50 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Seletor Customizado se period === "custom" */}
              {period === "custom" && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg gap-1.5 font-normal">
                      <CalendarIcon className="size-3" />
                      {customRange?.from ? (
                        customRange.to ? (
                          <>
                            {format(customRange.from, "dd/MM/yyyy")} - {format(customRange.to, "dd/MM/yyyy")}
                          </>
                        ) : (
                          format(customRange.from, "dd/MM/yyyy")
                        )
                      ) : (
                        "Selecionar Intervalo"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-2xl" align="start">
                    <Calendar
                      mode="range"
                      selected={{ from: customRange?.from, to: customRange?.to }}
                      onSelect={(v: any) => setCustomRange(v)}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              )}

              {/* Filtro por Faixa de Valor */}
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <span className="font-semibold">Valor:</span>
                <button
                  onClick={() => setAmountRangeFilter("all")}
                  className={`px-2 py-0.5 rounded-md font-bold transition-colors ${
                    amountRangeFilter === "all" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setAmountRangeFilter("up_to_150")}
                  className={`px-2 py-0.5 rounded-md font-bold transition-colors ${
                    amountRangeFilter === "up_to_150" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`}
                >
                  Até R$ 150
                </button>
                <button
                  onClick={() => setAmountRangeFilter("150_to_250")}
                  className={`px-2 py-0.5 rounded-md font-bold transition-colors ${
                    amountRangeFilter === "150_to_250" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`}
                >
                  R$ 150 a R$ 250
                </button>
                <button
                  onClick={() => setAmountRangeFilter("above_250")}
                  className={`px-2 py-0.5 rounded-md font-bold transition-colors ${
                    amountRangeFilter === "above_250" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`}
                >
                  Acima de R$ 250
                </button>
              </div>
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2"
              >
                <X className="size-3" />
                Limpar Filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 4. CONTEÚDO DAS TABELAS CONFORME A ABA ATIVA */}

      {/* ABA 1: Mensalidades & Boletos */}
      {reportTab === "invoices" && (
        <Card className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden">
          <CardHeader className="p-4 sm:p-5 pb-2 border-b border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Receipt className="size-4.5 text-primary" />
                Extrato Detalhado de Mensalidades & Boletos
              </CardTitle>
              <CardDescription className="text-xs">
                {filteredInvoices.length} faturas encontradas com base nos filtros selecionados.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              Total listado: <strong className="text-foreground font-black">{BRL(metrics.total)}</strong>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative w-full overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-muted/40 border-b border-border/70 text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
                  <tr>
                    <th className="p-3.5 pl-4">Associado</th>
                    {visibleColumns.customerDoc && <th className="p-3.5">CPF / CNPJ</th>}
                    {visibleColumns.vehicle && <th className="p-3.5">Veículo / Placa</th>}
                    <th className="p-3.5">Vencimento</th>
                    {visibleColumns.paymentDate && <th className="p-3.5">Data Baixa</th>}
                    {visibleColumns.paymentMethod && <th className="p-3.5">Forma</th>}
                    <th className="p-3.5">Valor Bruto</th>
                    {visibleColumns.netValue && <th className="p-3.5">Líquido</th>}
                    <th className="p-3.5">Status</th>
                    {visibleColumns.partner && <th className="p-3.5">Consultor</th>}
                    {visibleColumns.actions && <th className="p-3.5 text-right pr-4">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredInvoices.map((inv: any) => (
                    <tr
                      key={inv.id}
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      {/* Associado */}
                      <td className="p-3.5 pl-4">
                        <div className="font-bold text-foreground text-xs leading-tight">
                          {inv.customerName}
                        </div>
                        {visibleColumns.customerContact && inv.customerPhone && (
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {formatPhone(inv.customerPhone)}
                          </div>
                        )}
                      </td>

                      {/* CPF / CNPJ */}
                      {visibleColumns.customerDoc && (
                        <td className="p-3.5 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                          {inv.customerDocument ? formatCpfCnpj(inv.customerDocument) : "—"}
                        </td>
                      )}

                      {/* Veículo & Placa */}
                      {visibleColumns.vehicle && (
                        <td className="p-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <ReportPlateBadge plate={inv.vehiclePlate} />
                            <span className="font-semibold text-foreground text-[11px] truncate max-w-[140px]">
                              {inv.vehicleModel}
                            </span>
                          </div>
                        </td>
                      )}

                      {/* Vencimento */}
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-semibold text-foreground">
                          {inv.dueDate ? format(new Date(inv.dueDate + "T00:00:00"), "dd/MM/yyyy") : "—"}
                        </div>
                        {inv.dueDate && getDueDaysText(inv.dueDate, inv.status)}
                      </td>

                      {/* Data Baixa */}
                      {visibleColumns.paymentDate && (
                        <td className="p-3.5 whitespace-nowrap text-muted-foreground">
                          {inv.paymentDate ? (
                            <span className="text-emerald-600 font-semibold">
                              {format(new Date(inv.paymentDate + "T00:00:00"), "dd/MM/yyyy")}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">Em aberto</span>
                          )}
                        </td>
                      )}

                      {/* Forma de Cobrança */}
                      {visibleColumns.paymentMethod && (
                        <td className="p-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            {inv.billingType === "PIX" ? (
                              <QrCode className="size-3.5 text-teal-600" />
                            ) : inv.billingType === "CREDIT_CARD" ? (
                              <CreditCard className="size-3.5 text-blue-600" />
                            ) : (
                              <Receipt className="size-3.5 text-amber-600" />
                            )}
                            <span className="capitalize">
                              {inv.billingType === "PIX" ? "Pix" : inv.billingType === "CREDIT_CARD" ? "Cartão" : "Boleto"}
                            </span>
                          </div>
                        </td>
                      )}

                      {/* Valor Bruto */}
                      <td className="p-3.5 font-black text-foreground whitespace-nowrap">
                        {BRL(inv.value)}
                      </td>

                      {/* Valor Líquido */}
                      {visibleColumns.netValue && (
                        <td className="p-3.5 text-[11px] text-muted-foreground font-mono whitespace-nowrap">
                          {BRL(inv.netValue || inv.value)}
                        </td>
                      )}

                      {/* Status */}
                      <td className="p-3.5 whitespace-nowrap">
                        {getStatusBadge(inv.status)}
                      </td>

                      {/* Consultor / Split */}
                      {visibleColumns.partner && (
                        <td className="p-3.5 whitespace-nowrap">
                          <div className="font-semibold text-foreground text-[11px]">
                            {inv.partnerName || "Direto da Associação"}
                          </div>
                          {inv.splitAmount > 0 ? (
                            <div className="mt-0.5">
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 font-mono font-bold ${
                                  inv.status === "RECEIVED" || inv.status === "CONFIRMED" || inv.status === "RECEIVED_IN_CASH"
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                    : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                }`}
                              >
                                Split: {BRL(inv.splitAmount)} ({inv.splitPercent}%)
                                {inv.status === "RECEIVED" || inv.status === "CONFIRMED" || inv.status === "RECEIVED_IN_CASH" ? " • Pago" : " • Previsto"}
                              </Badge>
                            </div>
                          ) : inv.partnerId ? (
                            <div className="text-[10px] text-muted-foreground">Sem split configurado</div>
                          ) : null}
                        </td>
                      )}

                      {/* Ações */}
                      {visibleColumns.actions && (
                        <td className="p-3.5 text-right pr-4 whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {inv.customerPhone && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSendWhatsApp(inv)}
                                title="Enviar Cobrança WhatsApp"
                                className="h-7 w-7 p-0 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 border-emerald-500/30"
                              >
                                <Send className="size-3.5" />
                              </Button>
                            )}
                            {inv.invoiceUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                                title="Visualizar Fatura"
                                className="h-7 w-7 p-0 rounded-lg text-primary hover:bg-primary/10"
                              >
                                <a href={inv.invoiceUrl} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="size-3.5" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}

                  {filteredInvoices.length === 0 && (
                    <tr>
                      <td
                        colSpan={11}
                        className="p-10 text-center text-muted-foreground"
                      >
                        <Receipt className="size-8 text-muted-foreground/40 mx-auto mb-2" />
                        Nenhuma mensalidade encontrada para os filtros selecionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ABA 2: Frota de Veículos & Coberturas */}
      {reportTab === "vehicles" && (
        <Card className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden">
          <CardHeader className="p-4 sm:p-5 pb-2 border-b border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Car className="size-4.5 text-primary" />
                Relatório da Frota Protegida & Coberturas
              </CardTitle>
              <CardDescription className="text-xs">
                {filteredVehicles.length} veículos associados na base de proteção da Planmais.
              </CardDescription>
            </div>
            <Badge className="bg-primary/15 text-primary border-primary/30 font-bold text-xs">
              {filteredVehicles.length} Veículos Ativos
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative w-full overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-muted/40 border-b border-border/70 text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
                  <tr>
                    <th className="p-3.5 pl-4">Placa</th>
                    <th className="p-3.5">Veículo</th>
                    <th className="p-3.5">Ano / Combustível</th>
                    <th className="p-3.5">Associado Titular</th>
                    <th className="p-3.5">Valor FIPE</th>
                    <th className="p-3.5">Plano Contratado</th>
                    <th className="p-3.5">Mensalidade</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 pr-4">Consultor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredVehicles.map((v: any) => (
                    <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3.5 pl-4 whitespace-nowrap">
                        <ReportPlateBadge plate={v.plate} />
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-bold text-foreground text-xs leading-tight">
                          {v.brand} {v.model}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          Cor: {v.color || "Prata"}
                        </div>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-semibold text-foreground">{v.year}</div>
                        <div className="text-[10px] text-muted-foreground">{v.fuel || "Flex"}</div>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-bold text-foreground">{v.memberName}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {v.memberDocument ? formatCpfCnpj(v.memberDocument) : "—"}
                        </div>
                        {v.memberPhone && (
                          <div className="text-[10px] text-muted-foreground">
                            {formatPhone(v.memberPhone)}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 whitespace-nowrap font-black text-emerald-600 dark:text-emerald-400">
                        {BRL(v.fipeValue || 0)}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <Badge className="bg-primary/10 text-primary border-primary/20 font-bold text-[10px]">
                          {v.coveragePlan || "Plano Ouro 100% FIPE"}
                        </Badge>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-black text-foreground">{BRL(v.monthlyFee || 179.9)}</div>
                        <div className="text-[10px] text-muted-foreground">Venc. dia {v.dueDay || 10}</div>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <Badge className="bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 text-[10px] font-bold">
                          Proteção Ativa
                        </Badge>
                      </td>
                      <td className="p-3.5 pr-4 whitespace-nowrap font-medium text-muted-foreground">
                        {v.partnerName || "Direto da Associação"}
                      </td>
                    </tr>
                  ))}

                  {filteredVehicles.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-10 text-center text-muted-foreground">
                        <Car className="size-8 text-muted-foreground/40 mx-auto mb-2" />
                        Nenhum veículo encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ABA 3: Consultores & Comissões */}
      {reportTab === "partners" && (
        <Card className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden">
          <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border/60 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Users className="size-4.5 text-primary" />
                Relatório de Produção e Comissões de Consultores & Parceiros
              </CardTitle>
              <CardDescription className="text-xs">
                Acompanhe as comissões líquidas já liberadas (pagas) e a previsão de repasse (faturas pendentes).
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25">
                <span className="text-muted-foreground block text-[10px]">Comissão Prevista (Pendentes)</span>
                <strong className="text-amber-600 dark:text-amber-400 font-black text-sm">
                  {BRL(filteredPartners.reduce((acc: number, p: any) => acc + (p.pendingSplitAmount || 0), 0))}
                </strong>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                <span className="text-muted-foreground block text-[10px]">Comissão Liquidada (Pagas)</span>
                <strong className="text-emerald-600 dark:text-emerald-400 font-black text-sm">
                  {BRL(filteredPartners.reduce((acc: number, p: any) => acc + (p.totalValue || 0), 0))}
                </strong>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative w-full overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-muted/40 border-b border-border/70 text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
                  <tr>
                    <th className="p-3.5 pl-4">Consultor / Parceiro</th>
                    <th className="p-3.5">Contato</th>
                    <th className="p-3.5 text-center">Veículos</th>
                    <th className="p-3.5 text-center">Faturas (Pagas / Pendentes)</th>
                    <th className="p-3.5">Faturamento Total</th>
                    <th className="p-3.5">% Split</th>
                    <th className="p-3.5 font-bold text-amber-600 dark:text-amber-400">Comissão Prevista</th>
                    <th className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400">Comissão Liquidada</th>
                    <th className="p-3.5 pr-4">Status do Repasse</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredPartners.map((p: any) => (
                    <tr key={p.partnerId} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3.5 pl-4 whitespace-nowrap">
                        <div className="font-bold text-foreground text-xs">{p.partnerName}</div>
                        {p.partnerDocument && (
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {formatCpfCnpj(p.partnerDocument)}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 whitespace-nowrap text-muted-foreground">
                        <div>{p.partnerPhone ? formatPhone(p.partnerPhone) : "—"}</div>
                        <div className="text-[10px]">{p.partnerEmail || ""}</div>
                      </td>
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <Badge variant="outline" className="font-semibold text-xs">
                          {p.activeVehiclesCount || 0}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <Badge className="bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 font-bold text-xs">
                            {p.paidInvoicesCount || 0} pagas
                          </Badge>
                          {(p.pendingInvoicesCount || 0) > 0 && (
                            <Badge className="bg-amber-500/15 text-amber-600 border border-amber-500/30 font-bold text-xs">
                              {p.pendingInvoicesCount} pendentes
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 font-semibold text-foreground whitespace-nowrap">
                        <div>{BRL((p.grossVolume || 0) + (p.pendingGrossVolume || 0))}</div>
                        {(p.pendingGrossVolume || 0) > 0 && (
                          <div className="text-[10px] text-muted-foreground font-normal">
                            ({BRL(p.grossVolume || 0)} pago • {BRL(p.pendingGrossVolume || 0)} a vencer)
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 font-bold text-primary whitespace-nowrap">
                        {p.splitPercent}%
                      </td>
                      <td className="p-3.5 font-black text-amber-600 dark:text-amber-400 whitespace-nowrap text-sm">
                        {BRL(p.pendingSplitAmount || 0)}
                      </td>
                      <td className="p-3.5 font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap text-sm">
                        {BRL(p.totalValue || 0)}
                      </td>
                      <td className="p-3.5 pr-4 whitespace-nowrap">
                        {(p.totalValue || 0) > 0 ? (
                          <Badge className="bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 text-[10px] font-bold">
                            Liberado para Pagamento
                          </Badge>
                        ) : (p.pendingSplitAmount || 0) > 0 ? (
                          <Badge className="bg-amber-500/15 text-amber-600 border border-amber-500/30 text-[10px] font-bold">
                            Aguardando Liquidação
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            Sem Movimentação
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}

                  {filteredPartners.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-10 text-center text-muted-foreground">
                        <Users className="size-8 text-muted-foreground/40 mx-auto mb-2" />
                        Nenhum consultor encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ABA 4: Inadimplência & Cobrança Ativa */}
      {reportTab === "overdue" && (
        <Card className="rounded-2xl border border-rose-500/30 shadow-card bg-card overflow-hidden">
          <CardHeader className="p-4 sm:p-5 pb-2 border-b border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-rose-500/5">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-rose-600">
                <AlertTriangle className="size-4.5" />
                Painel de Inadimplência & Cobrança Imediata
              </CardTitle>
              <CardDescription className="text-xs">
                Mensalidades vencidas e pendentes de regularização com acionamento direto via WhatsApp.
              </CardDescription>
            </div>
            <Badge className="bg-rose-500 text-white font-black text-xs px-2.5 py-0.5">
              Total em Atraso: {BRL(metrics.overdue)}
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative w-full overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-muted/40 border-b border-border/70 text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
                  <tr>
                    <th className="p-3.5 pl-4">Associado</th>
                    <th className="p-3.5">Telefone / WhatsApp</th>
                    <th className="p-3.5">Veículo & Placa</th>
                    <th className="p-3.5">Vencimento Original</th>
                    <th className="p-3.5">Atraso</th>
                    <th className="p-3.5">Valor em Aberto</th>
                    <th className="p-3.5">Consultor</th>
                    <th className="p-3.5 pr-4 text-right">Ação Imediata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {overdueInvoices.map((inv: any) => {
                    const diff = inv.dueDate
                      ? differenceInDays(startOfDay(new Date()), startOfDay(new Date(inv.dueDate + "T00:00:00")))
                      : 0;

                    return (
                      <tr key={inv.id} className="hover:bg-rose-500/5 transition-colors">
                        <td className="p-3.5 pl-4 whitespace-nowrap">
                          <div className="font-bold text-foreground text-xs leading-tight">
                            {inv.customerName}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                            {inv.customerDocument ? formatCpfCnpj(inv.customerDocument) : ""}
                          </div>
                        </td>

                        <td className="p-3.5 whitespace-nowrap font-medium text-foreground">
                          {inv.customerPhone ? formatPhone(inv.customerPhone) : "Sem telefone"}
                        </td>

                        <td className="p-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <ReportPlateBadge plate={inv.vehiclePlate} />
                            <span className="font-semibold text-foreground text-[11px]">
                              {inv.vehicleModel}
                            </span>
                          </div>
                        </td>

                        <td className="p-3.5 whitespace-nowrap font-semibold text-rose-600">
                          {inv.dueDate ? format(new Date(inv.dueDate + "T00:00:00"), "dd/MM/yyyy") : "—"}
                        </td>

                        <td className="p-3.5 whitespace-nowrap">
                          <Badge className="bg-rose-500/15 text-rose-600 border border-rose-500/30 font-bold text-[10px]">
                            {Math.max(0, diff)} dias em atraso
                          </Badge>
                        </td>

                        <td className="p-3.5 whitespace-nowrap font-black text-rose-600 text-sm">
                          {BRL(inv.value)}
                        </td>

                        <td className="p-3.5 whitespace-nowrap text-muted-foreground font-medium">
                          {inv.partnerName || "Direto"}
                        </td>

                        <td className="p-3.5 pr-4 text-right whitespace-nowrap">
                          <Button
                            size="sm"
                            onClick={() => handleSendWhatsApp(inv)}
                            className="h-7.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-xs"
                          >
                            <Send className="size-3" />
                            Cobrar WhatsApp
                          </Button>
                        </td>
                      </tr>
                    );
                  })}

                  {overdueInvoices.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-10 text-center text-muted-foreground">
                        <CheckCircle2 className="size-8 text-emerald-500 mx-auto mb-2" />
                        Parabéns! Não há mensalidades em atraso para os critérios selecionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
