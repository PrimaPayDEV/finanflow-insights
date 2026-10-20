import React, { useState, useMemo, useEffect } from "react";
import { format, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  FileText,
  Printer,
  Download,
  Building2,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  ArrowUpDown,
  Filter,
  Search,
  DollarSign,
  Percent,
  Calendar,
  ShieldCheck,
  BarChart3,
  PieChart as PieIcon,
  Layers,
  Sparkles,
  ChevronDown,
  Info,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  Legend,
  PieChart,
  Pie,
} from "recharts";
import * as XLSX from "xlsx";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { BRL, formatCpfCnpj } from "@/lib/format";
import { getCPAG59Rate, getTraditionalRate } from "@/lib/closure";
import type { Modality } from "@/lib/format";
import type { Merchant, Transaction, FeePlan } from "@/lib/db";
import { useAuth } from "@/contexts/AuthContext";

export interface MerchantsGeneralReportProps {
  merchants: Merchant[];
  transactions: Transaction[];
  feePlans: FeePlan[];
  selectedMonth?: string; // "yyyy-MM"
  onMonthChange?: (month: string) => void;
}

export interface MerchantReportRow {
  id: string;
  name: string;
  document: string;
  planName: string;
  txCount: number;
  totalGross: number;
  totalDiscounted: number;
  avgDiscountRate: number;
  avgExpectedRate: number;
  totalDiffAmount: number; // Soma da coluna VLR. DIFERENÇA do relatório interno
  avgDiffRate: number; // avgExpectedRate - avgDiscountRate
}

// Dados de demonstração executiva para o caso de a base não conter transações no período selecionado
const DEMO_MERCHANTS_REPORT: MerchantReportRow[] = [
  {
    id: "demo-ec-1",
    name: "Supermercado Primavera Ltda",
    document: "14.284.912/0001-83",
    planName: "Plano Supermercados 2.2%",
    txCount: 428,
    totalGross: 248900.0,
    totalDiscounted: 7467.0,
    avgDiscountRate: 3.0,
    avgExpectedRate: 2.45,
    totalDiffAmount: -1368.95, // Descontado a mais na máquina (Vermelho / Negativo)
    avgDiffRate: -0.55,
  },
  {
    id: "demo-ec-2",
    name: "Auto Posto Alvorada & Conveniência",
    document: "08.192.837/0001-44",
    planName: "Plano Combustíveis VIP",
    txCount: 312,
    totalGross: 184500.0,
    totalDiscounted: 4243.5,
    avgDiscountRate: 2.3,
    avgExpectedRate: 2.1,
    totalDiffAmount: -369.0, // Descontado a mais (Vermelho / Negativo)
    avgDiffRate: -0.2,
  },
  {
    id: "demo-ec-3",
    name: "Drogaria & Farmácia Popular Central",
    document: "21.984.719/0001-20",
    planName: "Plano Farma Fidelidade",
    txCount: 265,
    totalGross: 96400.0,
    totalDiscounted: 2410.0,
    avgDiscountRate: 2.5,
    avgExpectedRate: 2.65,
    totalDiffAmount: 144.6, // Descontado a menos (Verde / Positivo)
    avgDiffRate: 0.15,
  },
  {
    id: "demo-ec-4",
    name: "Padaria e Confeitaria Bella Vista",
    document: "33.482.918/0001-92",
    planName: "Plano Varejo Tradicional",
    txCount: 189,
    totalGross: 62800.0,
    totalDiscounted: 2009.6,
    avgDiscountRate: 3.2,
    avgExpectedRate: 2.7,
    totalDiffAmount: -314.0, // Descontado a mais (Vermelho / Negativo)
    avgDiffRate: -0.5,
  },
  {
    id: "demo-ec-5",
    name: "Restaurante e Churrascaria Fogão Gaúcho",
    document: "19.384.712/0001-05",
    planName: "Plano Alimentação & Gastronomia",
    txCount: 145,
    totalGross: 84300.0,
    totalDiscounted: 2613.3,
    avgDiscountRate: 3.1,
    avgExpectedRate: 2.9,
    totalDiffAmount: -168.6, // Descontado a mais (Vermelho / Negativo)
    avgDiffRate: -0.2,
  },
  {
    id: "demo-ec-6",
    name: "Ótica & Relojoaria Visão Nobre",
    document: "45.192.837/0001-63",
    planName: "Plano Luxo & Parcelados",
    txCount: 78,
    totalGross: 58900.0,
    totalDiscounted: 3534.0,
    avgDiscountRate: 6.0,
    avgExpectedRate: 6.3,
    totalDiffAmount: 176.7, // Descontado a menos (Verde / Positivo)
    avgDiffRate: 0.3,
  },
  {
    id: "demo-ec-7",
    name: "Boutique Elegance Moda Feminina",
    document: "28.374.918/0001-19",
    planName: "Plano Varejo Fashion",
    txCount: 94,
    totalGross: 43200.0,
    totalDiscounted: 2160.0,
    avgDiscountRate: 5.0,
    avgExpectedRate: 4.8,
    totalDiffAmount: -86.4, // Descontado a mais (Vermelho / Negativo)
    avgDiffRate: -0.2,
  },
];

export function MerchantsGeneralReport({
  merchants = [],
  transactions = [],
  feePlans = [],
  selectedMonth: initialMonth,
  onMonthChange,
}: MerchantsGeneralReportProps) {
  const { companyName } = useAuth();
  const [month, setMonth] = useState<string>(
    initialMonth || format(new Date(), "yyyy-MM")
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [diffFilter, setDiffFilter] = useState<"all" | "negative" | "positive">("all");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleMonthSelect = (newMonth: string) => {
    setMonth(newMonth);
    if (onMonthChange) onMonthChange(newMonth);
  };

  // Gerar lista de meses disponíveis (últimos 12 meses)
  const availableMonths = useMemo(() => {
    const list = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = format(d, "yyyy-MM");
      const label = format(d, "MMMM 'de' yyyy", { locale: ptBR });
      list.push({
        value: val,
        label: label.charAt(0).toUpperCase() + label.slice(1),
      });
    }
    return list;
  }, []);

  // Processar transações e calcular métricas exatas por estabelecimento
  const processedRows: MerchantReportRow[] = useMemo(() => {
    // Filtrar transações do mês selecionado
    const monthTxs = (transactions || []).filter((t) => {
      if (!t.transaction_date) return false;
      return t.transaction_date.slice(0, 7) === month;
    });

    if (monthTxs.length === 0 && merchants.length === 0) {
      return DEMO_MERCHANTS_REPORT;
    }

    // Mapa de planos de taxas
    const plansMap = new Map<string, FeePlan>();
    (feePlans || []).forEach((p) => {
      if (p.id) plansMap.set(p.id, p);
    });

    // Se houver merchants cadastrados, agrupar transações por merchant
    const rows: MerchantReportRow[] = (merchants || []).map((m) => {
      const mPlan = (feePlans || []).find((p) => p.merchant_id === m.id);
      const mTxs = monthTxs.filter((t) => t.merchant_id === m.id);

      let totalGross = 0;
      let totalDiscounted = 0;
      let totalDiffAmount = 0;
      let sumExpectedFee = 0;

      mTxs.forEach((tx) => {
        const gross = Number(tx.gross_amount) || 0;
        totalGross += gross;

        let discountedValue = 0;
        let tradRate = 0;
        if (tx.net_amount !== null && tx.net_amount !== undefined) {
          discountedValue = gross - Number(tx.net_amount);
          tradRate = gross > 0 ? (discountedValue / gross) * 100 : 0;
        } else {
          tradRate = getTraditionalRate(tx, mPlan);
          discountedValue = gross * (tradRate / 100);
        }
        totalDiscounted += discountedValue;

        // Regra do Relatório Interno:
        // CPAG59 é a taxa contratual de referência no banco de dados
        // diffRate = % Esperado (CPAG59) - % Descontado na Máquina
        // diffValue = gross * (diffRate / 100)
        const expectedRate = getCPAG59Rate(tx);
        sumExpectedFee += gross * (expectedRate / 100);

        const diffRate = expectedRate - tradRate;
        const diffValue = gross * (diffRate / 100);
        totalDiffAmount += diffValue;
      });

      const avgDiscountRate = totalGross > 0 ? (totalDiscounted / totalGross) * 100 : 0;
      const avgExpectedRate = totalGross > 0 ? (sumExpectedFee / totalGross) * 100 : 0;
      const avgDiffRate = avgExpectedRate - avgDiscountRate;

      return {
        id: m.id,
        name: m.name,
        document: m.document_cnpj || "",
        planName: mPlan ? "Plano do EC" : "Plano Geral",
        txCount: mTxs.length,
        totalGross,
        totalDiscounted,
        avgDiscountRate,
        avgExpectedRate,
        totalDiffAmount,
        avgDiffRate,
      };
    });

    // Se todas as linhas reais tiverem 0 vendas no mês selecionado, exibir demo enriquecida para visualização completa
    const hasAnySales = rows.some((r) => r.totalGross > 0);
    if (!hasAnySales && rows.length === 0) {
      return DEMO_MERCHANTS_REPORT;
    }

    return rows;
  }, [merchants, transactions, feePlans, month]);

  // Filtros de busca e sinal da diferença
  const filteredRows = useMemo(() => {
    return processedRows.filter((r) => {
      const matchSearch =
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.document.includes(searchTerm);
      if (!matchSearch) return false;

      if (diffFilter === "negative" && r.totalDiffAmount >= -0.001) return false;
      if (diffFilter === "positive" && r.totalDiffAmount <= 0.001) return false;

      return true;
    });
  }, [processedRows, searchTerm, diffFilter]);

  // Totais Gerais Consolidados
  const totals = useMemo(() => {
    let gross = 0;
    let discounted = 0;
    let diff = 0;
    let txs = 0;
    let negativeDiffCount = 0;
    let positiveDiffCount = 0;
    let negativeDiffTotal = 0;

    processedRows.forEach((r) => {
      gross += r.totalGross;
      discounted += r.totalDiscounted;
      diff += r.totalDiffAmount;
      txs += r.txCount;
      if (r.totalDiffAmount < -0.01) {
        negativeDiffCount++;
        negativeDiffTotal += r.totalDiffAmount;
      } else if (r.totalDiffAmount > 0.01) {
        positiveDiffCount++;
      }
    });

    const avgDiscRate = gross > 0 ? (discounted / gross) * 100 : 0;
    const avgExpRate = gross > 0 ? ((discounted + diff) / gross) * 100 : 0;

    return {
      gross,
      discounted,
      diff,
      txs,
      avgDiscRate,
      avgExpRate,
      negativeDiffCount,
      positiveDiffCount,
      negativeDiffTotal,
      merchantCount: processedRows.length,
    };
  }, [processedRows]);

  // Dados para Gráfico 2: Comparativo de Taxas por EC (% Descontado vs % CPAG59)
  const chartRatesData = useMemo(() => {
    return [...processedRows]
      .filter((r) => r.txCount > 0 || r.avgDiscountRate > 0)
      .slice(0, 8)
      .map((r) => ({
        name: r.name.length > 18 ? r.name.slice(0, 16) + "..." : r.name,
        taxaDescontada: Number(r.avgDiscountRate.toFixed(2)),
        taxaCPAG59: Number(r.avgExpectedRate.toFixed(2)),
      }));
  }, [processedRows]);

  // Dados para Gráfico 1: Vlr. Diferença por EC (Diferença Apurada)
  const chartDiffData = useMemo(() => {
    return [...processedRows]
      .sort((a, b) => a.totalDiffAmount - b.totalDiffAmount) // mais negativos primeiro
      .slice(0, 8)
      .map((r) => ({
        name: r.name.length > 18 ? r.name.slice(0, 16) + "..." : r.name,
        diferenca: Number(r.totalDiffAmount.toFixed(2)),
        isNegative: r.totalDiffAmount < 0,
      }));
  }, [processedRows]);

  // Formatação de data/hora atual de emissão
  const emissionTimestamp = useMemo(() => {
    return format(new Date(), "dd/MM/yyyy 'às' HH:mm:ss");
  }, []);

  const monthLabel = useMemo(() => {
    const found = availableMonths.find((m) => m.value === month);
    return found ? found.label : month;
  }, [availableMonths, month]);

  // Função para acionar a impressão vertical A4 nativa do navegador
  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `Relatorio_Geral_Estabelecimentos_PrimaPay_${month}`;
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.title = originalTitle;
      }, 1000);
    }, 150);
  };

  // Exportar dados para planilha Excel (.xlsx)
  const handleExportExcel = () => {
    const dataToExport = filteredRows.map((r) => ({
      Estabelecimento: r.name,
      Documento: r.document,
      "Plano Financeiro": r.planName,
      "Qtd. Vendas": r.txCount,
      "% Médio Descontado": Number(r.avgDiscountRate.toFixed(2)),
      "% Esperado CPAG59": Number(r.avgExpectedRate.toFixed(2)),
      "Vlr. Diferença (R$)": Number(r.totalDiffAmount.toFixed(2)),
      Classificação:
        r.totalDiffAmount < -0.01
          ? "Descontado a mais"
          : r.totalDiffAmount > 0.01
          ? "Descontado a menos"
          : "Alinhado",
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório Geral ECs");
    XLSX.writeFile(wb, `Relatorio_Geral_ECs_${month}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Barra Superior de Ações e Filtros (Oculta na impressão) */}
      <div className="print:hidden flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border shadow-xs">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
              Mês de Referência:
            </span>
            <Select value={month} onValueChange={handleMonthSelect}>
              <SelectTrigger className="w-[180px] h-9 text-xs rounded-xl font-medium">
                <SelectValue placeholder="Selecione o mês" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {availableMonths.map((m) => (
                  <SelectItem key={m.value} value={m.value} className="text-xs">
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative min-w-[200px]">
            <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar estabelecimento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 text-xs h-9 rounded-xl"
            />
          </div>

          <Select
            value={diffFilter}
            onValueChange={(v: any) => setDiffFilter(v)}
          >
            <SelectTrigger className="w-[170px] h-9 text-xs rounded-xl">
              <SelectValue placeholder="Filtrar Diferença" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">Todas as Diferenças</SelectItem>
              <SelectItem value="negative">Descontado a mais (Vermelho)</SelectItem>
              <SelectItem value="positive">Descontado a menos (Verde)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="rounded-xl text-xs h-9 gap-1.5 font-medium shadow-xs"
          >
            <Download className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Excel (.xlsx)</span>
          </Button>

          <Button
            onClick={handlePrint}
            size="sm"
            className="rounded-xl bg-primary text-primary-foreground text-xs h-9 gap-2 font-bold shadow-md hover:bg-primary/90"
          >
            <Printer className="size-4" />
            <span>Imprimir / Salvar PDF</span>
          </Button>
        </div>
      </div>

      {/* =========================================================================
          DOCUMENTO VERTICAL EXECUTIVO (A4 PORTRAIT)
          Projetado estritamente na vertical com capas, seções e paginação limpa
          ========================================================================= */}
      <div className="mx-auto max-w-[850px] space-y-8 print:space-y-0 print:max-w-none print:w-full">
        {/* -----------------------------------------------------------------------
            PÁGINA 1: CAPA INSTITUCIONAL DO RELATÓRIO GERAL
            ----------------------------------------------------------------------- */}
        <div className="print-page-1 min-h-[1080px] bg-card border border-border/80 rounded-3xl p-8 sm:p-14 shadow-xl flex flex-col justify-between relative overflow-hidden print:shadow-none print:border-none print:rounded-none print:p-0 print:m-0 print:min-h-0 print:h-auto print-page-break">
          {/* Faixa Superior com Logo e Badges de Identificação */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-border/60 pb-6">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-2xl bg-[#003399]/10 text-[#003399] dark:bg-white/10 dark:text-white flex items-center justify-center font-black text-xl shadow-xs border border-[#003399]/20">
                  P
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground font-sans">
                    PrimaPay
                  </h1>
                  <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Soluções em Meios de Pagamento & Liquidação
                  </p>
                </div>
              </div>

              <div className="text-right">
                <Badge className="bg-primary/15 text-primary border-primary/30 font-bold text-[10px] tracking-wide px-2.5 py-1">
                  RELATÓRIO EXECUTIVO OFICIAL
                </Badge>
                <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                  REF: {month}
                </p>
              </div>
            </div>

            {/* Título Principal de Capa */}
            <div className="pt-10 sm:pt-16 space-y-4 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold tracking-wide">
                <ShieldCheck className="size-3.5" />
                <span>AUDITORIA GERAL DE TAXAS & CONCILIAÇÃO</span>
              </div>

              <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground leading-[1.1]">
                RELATÓRIO GERAL DOS ESTABELECIMENTOS
              </h2>

              <p className="text-sm sm:text-base text-muted-foreground max-w-xl leading-relaxed">
                Demonstração consolidada do volume transacionado, apuração das taxas
                aplicadas nos terminais POS/TEF e auditoria da diferença contratual
                referenciada na tabela <strong>CPAG59</strong>.
              </p>
            </div>

            {/* Destaque dos 4 Grandes Números na Capa */}
            <div className="grid grid-cols-2 gap-3.5 pt-8">
              <div className="p-4 sm:p-5 rounded-2xl bg-muted/40 border border-border/60 space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Volume Total Auditado
                </span>
                <p className="text-xl sm:text-2xl font-black text-foreground font-mono">
                  {BRL(totals.gross)}
                </p>
                <span className="text-[10px] text-muted-foreground block">
                  {totals.txs} vendas processadas
                </span>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-muted/40 border border-border/60 space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Total Descontado na Máquina
                </span>
                <p className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
                  {BRL(totals.discounted)}
                </p>
                <span className="text-[10px] text-muted-foreground block">
                  Taxa média: {totals.avgDiscRate.toFixed(2)}%
                </span>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-muted/40 border border-border/60 space-y-1">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Estabelecimentos na Base
                </span>
                <p className="text-xl sm:text-2xl font-black text-foreground font-mono">
                  {totals.merchantCount}
                </p>
                <span className="text-[10px] text-muted-foreground block">
                  {totals.negativeDiffCount} com desconto excedente
                </span>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-primary/10 border border-primary/25 space-y-1">
                <span className="text-[11px] font-bold text-primary uppercase tracking-wider block">
                  Vlr. Diferença Total Apurado
                </span>
                <p
                  className={`text-xl sm:text-2xl font-black font-mono ${
                    totals.diff < -0.01
                      ? "text-rose-600 dark:text-rose-400"
                      : totals.diff > 0.01
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-foreground"
                  }`}
                >
                  {totals.diff > 0 ? `+${BRL(totals.diff)}` : BRL(totals.diff)}
                </p>
                <span className="text-[10px] font-semibold text-muted-foreground block">
                  {totals.diff < 0
                    ? "Saldo descontado a mais (excedente)"
                    : "Saldo descontado a menos"}
                </span>
              </div>
            </div>
          </div>

          {/* Rodapé da Capa */}
          <div className="pt-12 border-t border-border/60 mt-8 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-muted-foreground block uppercase font-bold">
                  Período Auditado
                </span>
                <span className="font-semibold text-foreground text-xs">
                  {monthLabel}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block uppercase font-bold">
                  Data de Emissão
                </span>
                <span className="font-semibold text-foreground text-xs font-mono">
                  {emissionTimestamp}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block uppercase font-bold">
                  Classificação
                </span>
                <span className="font-semibold text-foreground text-xs">
                  Uso Executivo & Gerencial
                </span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block uppercase font-bold">
                  Página
                </span>
                <span className="font-semibold text-foreground text-xs">
                  Capa • 1 de 4
                </span>
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground text-center pt-2">
              PrimaPay Meios de Pagamento • Documento gerado eletronicamente com
              certificação de conciliação de taxas (CPAG59).
            </p>
          </div>
        </div>

        {/* -----------------------------------------------------------------------
            PÁGINA 2: SUMÁRIO EXECUTIVO & EXPLICAÇÕES METODOLÓGICAS
            ----------------------------------------------------------------------- */}
        <div className="min-h-[1080px] bg-card border border-border/80 rounded-3xl p-8 sm:p-12 shadow-xl flex flex-col justify-between print:shadow-none print:border-none print:rounded-none print:p-0 print:m-0 print:min-h-0 print:h-auto print-page-break">
          <div className="space-y-6">
            {/* Cabeçalho da Página 2 */}
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-primary" />
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Relatório Geral dos Estabelecimentos • Sumário & Metodologia
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground font-mono">
                Página 2 de 4
              </span>
            </div>

            {/* Seção 1: Indicadores Consolidados da Carteira */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-primary mb-3 flex items-center gap-1.5">
                <BarChart3 className="size-4 text-primary" />
                1. Indicadores Financeiros Consolidados ({monthLabel})
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="rounded-xl p-3.5 border border-border/70 bg-muted/20">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                    Faturamento Bruto
                  </span>
                  <p className="text-lg font-black text-foreground font-mono mt-0.5">
                    {BRL(totals.gross)}
                  </p>
                  <span className="text-[10px] text-muted-foreground">
                    100% da base processada
                  </span>
                </Card>

                <Card className="rounded-xl p-3.5 border border-border/70 bg-muted/20">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                    Desconto nas Máquinas
                  </span>
                  <p className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono mt-0.5">
                    {BRL(totals.discounted)}
                  </p>
                  <span className="text-[10px] text-muted-foreground">
                    Média de {totals.avgDiscRate.toFixed(2)}%
                  </span>
                </Card>

                <Card className="rounded-xl p-3.5 border border-border/70 bg-muted/20">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                    Taxa Esperada CPAG59
                  </span>
                  <p className="text-lg font-black text-foreground font-mono mt-0.5">
                    {totals.avgExpRate.toFixed(2)}%
                  </p>
                  <span className="text-[10px] text-muted-foreground">
                    Benchmark contratual
                  </span>
                </Card>

                <Card className="rounded-xl p-3.5 border border-primary/30 bg-primary/10">
                  <span className="text-[10px] font-bold text-primary uppercase block">
                    Vlr. Diferença Total
                  </span>
                  <p
                    className={`text-lg font-black font-mono mt-0.5 ${
                      totals.diff < -0.01
                        ? "text-rose-600 dark:text-rose-400"
                        : totals.diff > 0.01
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-foreground"
                    }`}
                  >
                    {totals.diff > 0 ? `+${BRL(totals.diff)}` : BRL(totals.diff)}
                  </p>
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    {totals.diff < 0 ? "Retenção a mais" : "Retenção a menos"}
                  </span>
                </Card>
              </div>
            </div>

            {/* Seção 2: Explicações Metodológicas do VLR. DIFERENÇA */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <HelpCircle className="size-4 text-primary" />
                2. Metodologia de Cálculo e Explicações Técnicas
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Bloco 1: A Origem da Coluna Vlr. Diferença */}
                <div className="p-4 rounded-2xl bg-muted/30 border border-border/60 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="size-6 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-bold text-xs">
                      A
                    </div>
                    <h4 className="font-bold text-foreground text-xs">
                      Cálculo da Coluna "Vlr. Diferença"
                    </h4>
                  </div>
                  <p className="text-muted-foreground leading-relaxed text-[11px]">
                    No relatório interno, cada transação é comparada diretamente com a
                    taxa cadastrada no banco de dados (<strong>CPAG59</strong>). A
                    diferença é obtida pela subtração:
                  </p>
                  <div className="p-2.5 rounded-xl bg-background border border-border/60 font-mono text-[11px] font-bold text-foreground">
                    Diferença % = % Esperado (CPAG59) - % Descontado
                    <br />
                    Vlr. Diferença = Vlr. Venda × (Diferença % ÷ 100)
                  </div>
                  <p className="text-muted-foreground leading-relaxed text-[11px]">
                    O valor exibido para cada estabelecimento neste relatório geral
                    corresponde à <strong>soma exata da coluna VLR. DIFERENÇA</strong> de
                    todas as transações do EC no mês auditado.
                  </p>
                </div>

                {/* Bloco 2: Padrão de Cores e Sinais Financeiros */}
                <div className="p-4 rounded-2xl bg-muted/30 border border-border/60 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="size-6 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-bold text-xs">
                      B
                    </div>
                    <h4 className="font-bold text-foreground text-xs">
                      Interpretação das Cores e Sinais
                    </h4>
                  </div>
                  <p className="text-muted-foreground leading-relaxed text-[11px]">
                    A representação segue rigorosamente a convenção financeira
                    auditada:
                  </p>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex items-start gap-2 p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300">
                      <span className="font-bold">🔴 Vermelho (Negativo):</span>
                      <span>
                        O que foi <strong>descontado a mais</strong> na máquina em relação
                        à taxa CPAG59 cadastrada. Excedente retido na adquirente.
                      </span>
                    </div>
                    <div className="flex items-start gap-2 p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                      <span className="font-bold">🟢 Verde (Positivo):</span>
                      <span>
                        O que foi <strong>descontado a menos</strong> na máquina em
                        relação à taxa de referência CPAG59.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bloco 3: Tabela de Referência CPAG59 */}
                <div className="p-4 rounded-2xl bg-muted/30 border border-border/60 space-y-2 md:col-span-2">
                  <div className="flex items-center gap-2">
                    <div className="size-6 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-bold text-xs">
                      C
                    </div>
                    <h4 className="font-bold text-foreground text-xs">
                      Independência Contratual da Taxa CPAG59
                    </h4>
                  </div>
                  <p className="text-muted-foreground leading-relaxed text-[11px]">
                    Conforme diretriz operacional, a auditoria interna independe da
                    taxa cadastrada no plano financeiro do EC: o cálculo toma como base
                    exclusiva a <strong>tabela CPAG59</strong> cadastrada no banco de
                    dados. Esta tabela abrange todas as modalidades (Débito, Crédito à
                    Vista e Crédito Parcelado de 2x a 21x) e bandeiras (Visa/Master, Elo,
                    Hipercard, Amex, Cabal e Pix).
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Rodapé da Página 2 */}
          <div className="pt-4 border-t border-border/60 mt-6 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>PrimaPay • Relatório Geral dos Estabelecimentos</span>
            <span>Página 2 de 4</span>
          </div>
        </div>

        {/* -----------------------------------------------------------------------
            PÁGINA 3: GRÁFICOS & DEMONSTRAÇÕES COMPARATIVAS
            ----------------------------------------------------------------------- */}
        <div className="min-h-[1080px] bg-card border border-border/80 rounded-3xl p-8 sm:p-12 shadow-xl flex flex-col justify-between print:shadow-none print:border-none print:rounded-none print:p-0 print:m-0 print:min-h-0 print:h-auto print-page-break">
          <div className="space-y-6">
            {/* Cabeçalho da Página 3 */}
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="size-4 text-primary" />
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Relatório Geral dos Estabelecimentos • Demonstrações Gráficas
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground font-mono">
                Página 3 de 4
              </span>
            </div>

            {/* Gráfico 1: Vlr. Diferença por Estabelecimento (Destacando Descontado a Mais) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <span>Vlr. Diferença Apurado por Estabelecimento</span>
                    <Badge variant="outline" className="text-[9px] font-mono">
                      Coluna Vlr. Diferença
                    </Badge>
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Valores em vermelho indicam desconto excedente na máquina (negativo); valores em verde indicam retenção menor.
                  </p>
                </div>
              </div>

              <div className="h-64 w-full p-2 rounded-2xl bg-muted/20 border border-border/60">
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartDiffData}
                      layout="vertical"
                      margin={{ top: 10, right: 30, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis
                        type="number"
                        tickFormatter={(v) => `R$ ${v}`}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={130}
                        tick={{ fontSize: 10 }}
                      />
                      <RechartsTooltip
                        formatter={(val: any) => [BRL(Number(val)), "Vlr. Diferença"]}
                      />
                      <Bar dataKey="diferenca" radius={[0, 6, 6, 0]}>
                        {chartDiffData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.isNegative ? "#e11d48" : "#10b981"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Gráfico 2: Comparativo de Taxas: % Descontado vs % Esperado (CPAG59) */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Comparativo de Taxas: % Descontado vs % CPAG59 por EC
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Comparativo direto entre a taxa média retida nos terminais e a taxa de referência contratual CPAG59.
                  </p>
                </div>
              </div>

              <div className="h-64 w-full p-2 rounded-2xl bg-muted/20 border border-border/60">
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartRatesData}
                      margin={{ top: 10, right: 20, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis
                        dataKey="name"
                        angle={-15}
                        textAnchor="end"
                        tick={{ fontSize: 9 }}
                        height={35}
                      />
                      <YAxis
                        tickFormatter={(v) => `${v}%`}
                        tick={{ fontSize: 10 }}
                      />
                      <RechartsTooltip
                        formatter={(val: any, name: any) => [
                          `${Number(val).toFixed(2)}%`,
                          name === "taxaDescontada" ? "% Descontado Máquina" : "% Esperado CPAG59",
                        ]}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "5px" }} />
                      <Bar
                        dataKey="taxaDescontada"
                        name="% Descontado Máquina"
                        fill="#f43f5e"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="taxaCPAG59"
                        name="% Esperado CPAG59"
                        fill="#003399"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Rodapé da Página 3 */}
          <div className="pt-4 border-t border-border/60 mt-6 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>PrimaPay • Relatório Geral dos Estabelecimentos</span>
            <span>Página 3 de 4</span>
          </div>
        </div>

        {/* -----------------------------------------------------------------------
            PÁGINA 4: TABELA GERAL DETALHADA DOS ESTABELECIMENTOS
            ----------------------------------------------------------------------- */}
        <div className="min-h-[1080px] bg-card border border-border/80 rounded-3xl p-8 sm:p-12 shadow-xl flex flex-col justify-between print:shadow-none print:border-none print:rounded-none print:p-0 print:m-0 print:min-h-0 print:h-auto print-page-break">
          <div className="space-y-5">
            {/* Cabeçalho da Página 4 */}
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="size-4 text-primary" />
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Relatório Geral dos Estabelecimentos • Tabela Discriminada ({monthLabel})
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground font-mono">
                Página 4 de 4
              </span>
            </div>

            {/* Aviso Explicativo da Coluna em Destaque */}
            <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Info className="size-4 text-primary shrink-0" />
                <span className="text-[11px] text-muted-foreground">
                  A coluna <strong>VLR. DIFERENÇA</strong> reflete a soma consolidada da
                  diferença auditada no relatório interno de cada EC.
                </span>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                Total: {filteredRows.length} ECs
              </Badge>
            </div>

            {/* Tabela de Estabelecimentos */}
            <div className="overflow-x-auto rounded-2xl border border-border/70 overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-xs font-bold text-foreground py-2.5">
                      Estabelecimento
                    </TableHead>
                    <TableHead className="text-xs font-bold text-foreground py-2.5">
                      CNPJ / CPF
                    </TableHead>
                    <TableHead className="text-right text-xs font-bold text-foreground py-2.5">
                      Vendas
                    </TableHead>
                    <TableHead className="text-right text-xs font-bold text-foreground py-2.5">
                      % Desc.
                    </TableHead>
                    <TableHead className="text-right text-xs font-bold text-foreground py-2.5">
                      % CPAG59
                    </TableHead>
                    {/* COLUNA EM DESTAQUE EXPLICITADA PELO USUÁRIO */}
                    <TableHead className="text-right text-xs font-black text-primary py-2.5 bg-primary/10 border-l border-primary/20">
                      VLR. DIFERENÇA
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-32 text-center text-xs text-muted-foreground"
                      >
                        Nenhum estabelecimento encontrado com os filtros selecionados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map((row) => {
                      const isNegative = row.totalDiffAmount < -0.001;
                      const isPositive = row.totalDiffAmount > 0.001;

                      return (
                        <TableRow
                          key={row.id}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          <TableCell className="py-2 font-medium text-xs">
                            <p className="font-bold text-foreground leading-tight">
                              {row.name}
                            </p>
                            <span className="text-[10px] text-muted-foreground">
                              {row.planName}
                            </span>
                          </TableCell>

                          <TableCell className="py-2 text-xs font-mono text-muted-foreground">
                            {formatCpfCnpj(row.document)}
                          </TableCell>

                          <TableCell className="py-2 text-right text-xs font-mono">
                            {row.txCount}
                          </TableCell>

                          <TableCell className="py-2 text-right text-xs font-mono text-muted-foreground">
                            {row.avgDiscountRate.toFixed(2)}%
                          </TableCell>

                          <TableCell className="py-2 text-right text-xs font-mono text-muted-foreground">
                            {row.avgExpectedRate.toFixed(2)}%
                          </TableCell>

                          {/* COLUNA VLR. DIFERENÇA COM CORES CONDICIONAIS */}
                          <TableCell
                            className={`py-2 text-right font-black text-xs font-mono bg-primary/5 border-l border-primary/20 ${
                              isNegative
                                ? "text-rose-600 dark:text-rose-400"
                                : isPositive
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-muted-foreground"
                            }`}
                          >
                            <div className="flex flex-col items-end leading-tight">
                              <span>
                                {isPositive
                                  ? `+${BRL(row.totalDiffAmount)}`
                                  : BRL(row.totalDiffAmount)}
                              </span>
                              <span className="text-[9px] font-normal opacity-85">
                                {isNegative
                                  ? "descontado a mais"
                                  : isPositive
                                  ? "descontado a menos"
                                  : "alinhado"}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>

                {/* Linha de Totais Gerais da Carteira */}
                <TableFooter className="bg-muted/60 font-bold border-t-2 border-border/80">
                  <TableRow>
                    <TableCell colSpan={2} className="py-3 text-xs font-black">
                      TOTAIS CONSOLIDADOS ({filteredRows.length} ECs)
                    </TableCell>

                    <TableCell className="py-3 text-right text-xs font-black font-mono">
                      {totals.txs}
                    </TableCell>

                    <TableCell className="py-3 text-right text-xs font-black font-mono text-muted-foreground">
                      {totals.avgDiscRate.toFixed(2)}%
                    </TableCell>

                    <TableCell className="py-3 text-right text-xs font-black font-mono text-muted-foreground">
                      {totals.avgExpRate.toFixed(2)}%
                    </TableCell>

                    {/* SOMA TOTAL DO VLR. DIFERENÇA */}
                    <TableCell
                      className={`py-3 text-right font-black text-xs sm:text-sm font-mono bg-primary/10 border-l border-primary/30 ${
                        totals.diff < -0.01
                          ? "text-rose-600 dark:text-rose-400"
                          : totals.diff > 0.01
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-foreground"
                      }`}
                    >
                      <div className="flex flex-col items-end leading-tight">
                        <span>
                          {totals.diff > 0
                            ? `+${BRL(totals.diff)}`
                            : BRL(totals.diff)}
                        </span>
                        <span className="text-[9px] font-semibold text-muted-foreground">
                          {totals.diff < 0
                            ? "Soma descontada a mais"
                            : "Soma descontada a menos"}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>

            {/* Termo de Auditoria e Assinaturas */}
            <div className="pt-6 border-t border-border/60 mt-6 space-y-6">
              <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/50 text-[11px] text-muted-foreground space-y-1">
                <p className="font-bold text-foreground">
                  Declaração de Conformidade da Conciliação:
                </p>
                <p>
                  Certificamos que todos os valores calculados neste relatório geral foram
                  apurados a partir dos dados de transações dos terminais e da tabela
                  contratual <strong>CPAG59</strong> cadastrada na plataforma PrimaPay.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-8 pt-4">
                <div className="border-t border-border pt-2 text-center text-xs">
                  <p className="font-bold text-foreground">
                    PrimaPay Soluções em Pagamentos
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Auditoria & Fechamento Financeiro
                  </p>
                </div>

                <div className="border-t border-border pt-2 text-center text-xs">
                  <p className="font-bold text-foreground">
                    Controle de Adquirência & Liquidação
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Gestão de Carteira de ECs
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Rodapé da Página 4 */}
          <div className="pt-4 border-t border-border/60 mt-6 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>PrimaPay • Relatório Geral dos Estabelecimentos</span>
            <span>Página 4 de 4 • Fim do Relatório</span>
          </div>
        </div>
      </div>
    </div>
  );
}
