import { cn } from "@/lib/utils";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  PiggyBank,
  TrendingUp,
  Wallet,
  FileCheck2,
  Calendar as CalendarIcon,
  PieChart as PieChartIcon,
  CreditCard,
  BarChart3,
  ChevronRight,
  ArrowRight,
  Users,
  Car,
  ShieldCheck,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ExternalLink,
  MessageCircle,
  Plus,
  RefreshCw,
  FileBarChart2,
  Sparkles,
  DollarSign,
} from "lucide-react";
import { MerchantIcon } from "@/components/MerchantIcon";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppLayout } from "@/components/AppLayout";
import { KpiCard } from "@/components/KpiCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PeriodType, DateRange, getPeriodDateRange, isDateInRange, isMonthInRange, calculateTrend } from "@/lib/dateUtils";
import {
  closuresQuery,
  expensesQuery,
  feePlansQuery,
  merchantsQuery,
  transactionsQuery,
} from "@/lib/db";
import { calculateClosure } from "@/lib/closure";
import {
  BRL,
  MODALITIES,
  closureStatusLabel,
  currentMonth,
  getClosureBadgeVariant,
  modalityLabel,
  monthLabel,
} from "@/lib/format";
import { useAuth } from "@/contexts/AuthContext";
import { useServerFn } from "@tanstack/react-start";
import { getAsaasDashboardMetrics } from "@/lib/asaas.functions";
import { getMembers } from "@/lib/members.functions";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "PrimaHub | Gestão e Pagamentos" },
      {
        name: "description",
        content:
          "FinanFlow Insights is a comprehensive platform for managing commercial establishments, billing, and automated collections.",
      },
      { property: "og:title", content: "PrimaHub | Gestão e Pagamentos" },
      {
        property: "og:description",
        content: "FinanFlow Insights is a comprehensive platform for managing commercial establishments, billing, and automated collections.",
      },
    ],
  }),
  component: Dashboard,
});

const COLORS = [
  "oklch(0.48 0.22 283)", // Primary Purple
  "oklch(0.61 0.26 330)", // Accent Magenta
  "oklch(0.68 0.15 160)", // Success Emerald
  "oklch(0.55 0.18 240)", // Indigo
  "oklch(0.70 0.18 50)",  // Amber
];

function BillingDashboard({ companyId }: { companyId: string }) {
  const fetchMetrics = useServerFn(getAsaasDashboardMetrics);
  const fetchMembers = useServerFn(getMembers);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["billing_metrics", companyId],
    queryFn: () => fetchMetrics({ data: { companyId } }),
  });

  const { data: members = [] } = useQuery({
    queryKey: ["members", companyId],
    queryFn: () => fetchMembers({ data: { companyId } }),
  });

  const payments: any[] = data?.data?.recentPayments || [];

  // Financial calculations
  const balanceVal = data?.data?.balance || 0;
  const totalReceivedVal = data?.data?.totalReceived || 0;
  const totalPendingVal = data?.data?.totalPending || 0;
  const totalOverdueVal = data?.data?.totalOverdue || 0;

  let receivedCount = 0;
  let pendingCount = 0;
  let overdueCount = 0;

  for (const p of payments) {
    if (p.status === "RECEIVED" || p.status === "CONFIRMED" || p.status === "RECEIVED_IN_CASH") {
      receivedCount++;
    } else if (p.status === "PENDING") {
      pendingCount++;
    } else if (p.status === "OVERDUE") {
      overdueCount++;
    }
  }

  const totalVolume = totalReceivedVal + totalPendingVal + totalOverdueVal;
  const overdueRate = totalVolume > 0 ? ((totalOverdueVal / totalVolume) * 100).toFixed(1) : "0";
  const liquidationRate = totalVolume > 0 ? ((totalReceivedVal / totalVolume) * 100).toFixed(1) : "0";

  // Members & vehicles calculation
  const totalMembers = members.length;
  const totalVehicles = members.reduce((acc: number, m: any) => {
    if (Array.isArray(m.vehicles) && m.vehicles.length > 0) return acc + m.vehicles.length;
    if (m.vehicle) return acc + 1;
    return acc;
  }, 0);

  // Group payments by dueDate for chart
  const chartData = useMemo(() => {
    const map: Record<string, { date: string; dateFormatted: string; recebido: number; pendente: number; vencido: number }> = {};
    const sorted = [...payments].sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));

    for (const p of sorted) {
      if (!p.dueDate) continue;
      const key = p.dueDate;
      if (!map[key]) {
        const parts = key.split("-");
        const formatted = parts.length === 3 ? `${parts[2]}/${parts[1]}` : key;
        map[key] = { date: key, dateFormatted: formatted, recebido: 0, pendente: 0, vencido: 0 };
      }
      if (p.status === "RECEIVED" || p.status === "CONFIRMED" || p.status === "RECEIVED_IN_CASH") {
        map[key].recebido += p.value;
      } else if (p.status === "PENDING") {
        map[key].pendente += p.value;
      } else if (p.status === "OVERDUE") {
        map[key].vencido += p.value;
      }
    }

    return Object.values(map).slice(-8);
  }, [payments]);

  // Donut chart distribution
  const pieData = [
    { name: "Recebido", value: totalReceivedVal, count: receivedCount, color: "#10b981" },
    { name: "Pendente", value: totalPendingVal, count: pendingCount, color: "#f59e0b" },
    { name: "Vencido", value: totalOverdueVal, count: overdueCount, color: "#ef4444" },
  ].filter((d) => d.value > 0);

  const handleViewBoleto = (p: any) => {
    const url = p.bankSlipUrl || p.invoiceUrl;
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
      toast.success("Boleto aberto em nova aba!");
    } else {
      toast.error("Link direto do boleto não disponível no momento.");
    }
  };

  const handleSendWhatsApp = (p: any) => {
    const url = p.invoiceUrl || p.bankSlipUrl || "";
    const dateFormatted = p.dueDate ? p.dueDate.split("-").reverse().join("/") : "";
    const clientName = p.customerName || p.customer || "Associado";
    const text = encodeURIComponent(
      `Olá ${clientName}! Segue sua fatura no valor de ${BRL(p.value)} (Vencimento: ${dateFormatted}).\n\nVocê pode acessar e pagar pelo link seguro abaixo:\n${url}\n\nQualquer dúvida, estamos à disposição!`
    );
    const phone = p.customerPhone ? p.customerPhone.replace(/\D/g, "") : "";
    const waUrl = phone ? `https://wa.me/55${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(waUrl, "_blank");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "RECEIVED":
      case "CONFIRMED":
      case "RECEIVED_IN_CASH":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/30 text-xs font-semibold gap-1.5 py-0.5">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Recebido
          </Badge>
        );
      case "PENDING":
        return (
          <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/30 text-xs font-semibold gap-1.5 py-0.5">
            <span className="size-1.5 rounded-full bg-amber-500" />
            Pendente
          </Badge>
        );
      case "OVERDUE":
        return (
          <Badge className="bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border-rose-500/30 text-xs font-semibold gap-1.5 py-0.5">
            <span className="size-1.5 rounded-full bg-rose-500" />
            Vencido
          </Badge>
        );
      case "REFUNDED":
        return (
          <Badge className="bg-gray-500/10 text-gray-600 hover:bg-gray-500/20 border-gray-500/30 text-xs font-semibold py-0.5">
            Estornado
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs py-0.5">
            {status}
          </Badge>
        );
    }
  };

  return (
    <AppLayout
      title="Dashboard"
      subtitle="Visão executiva de cobranças, associados e faturamento"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="rounded-xl h-9 px-3 text-xs gap-1.5 border-border/70 hover:bg-muted"
            title="Atualizar dados do Asaas"
          >
            <RefreshCw className={cn("size-3.5", isRefetching && "animate-spin")} />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
          <Button
            size="sm"
            asChild
            className="rounded-xl h-9 px-3.5 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-xs"
          >
            <Link to="/invoices">
              <Plus className="size-4" />
              <span>Gerar Fatura</span>
            </Link>
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <div className="flex h-72 flex-col items-center justify-center space-y-3">
          <div className="size-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground text-sm font-medium">Carregando métricas e cobranças...</p>
        </div>
      ) : data?.ok ? (
        <div className="space-y-6 pb-6">
          {/* 1. Quick Navigation Shortcuts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link
              to="/invoices"
              className="group p-4 rounded-2xl bg-card border border-border/70 shadow-xs hover:border-primary/50 hover:shadow-md transition-all flex items-center gap-3.5"
            >
              <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <FileText className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cobranças</p>
                <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                  Faturas & Boletos
                </p>
              </div>
            </Link>

            <Link
              to="/members"
              className="group p-4 rounded-2xl bg-card border border-border/70 shadow-xs hover:border-emerald-500/50 hover:shadow-md transition-all flex items-center gap-3.5"
            >
              <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Users className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Associados</p>
                <p className="text-sm font-bold text-foreground truncate group-hover:text-emerald-600 transition-colors">
                  Novo Associado
                </p>
              </div>
            </Link>

            <Link
              to="/vehicles"
              className="group p-4 rounded-2xl bg-card border border-border/70 shadow-xs hover:border-blue-500/50 hover:shadow-md transition-all flex items-center gap-3.5"
            >
              <div className="size-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Car className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Frota</p>
                <p className="text-sm font-bold text-foreground truncate group-hover:text-blue-600 transition-colors">
                  Central de Veículos
                </p>
              </div>
            </Link>

            <Link
              to="/reports"
              className="group p-4 rounded-2xl bg-card border border-border/70 shadow-xs hover:border-purple-500/50 hover:shadow-md transition-all flex items-center gap-3.5"
            >
              <div className="size-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <FileBarChart2 className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Relatórios</p>
                <p className="text-sm font-bold text-foreground truncate group-hover:text-purple-600 transition-colors">
                  Exportar Métricas
                </p>
              </div>
            </Link>
          </div>

          {/* 2. Core Financial KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Saldo Asaas"
              value={BRL(balanceVal)}
              icon={Wallet}
              hint="Disponível na conta Asaas"
              tone="primary"
            />
            <KpiCard
              label="Total Recebido (Mês)"
              value={BRL(totalReceivedVal)}
              icon={TrendingUp}
              hint={`${receivedCount} cobranças liquidadas`}
              tone="success"
            />
            <KpiCard
              label="Pendentes a Receber"
              value={BRL(totalPendingVal)}
              icon={Clock}
              hint={`${pendingCount} aguardando pagamento`}
              tone="warning"
            />
            <KpiCard
              label="Inadimplência / Vencido"
              value={BRL(totalOverdueVal)}
              icon={AlertTriangle}
              hint={`${overdueCount} atrasadas (${overdueRate}% do total)`}
              tone="destructive"
            />
          </div>

          {/* 3. Proteção Veicular Operational Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Users className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Associados Cadastrados</p>
                  <p className="text-xl font-extrabold text-foreground">{totalMembers}</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs font-semibold border-primary/30 text-primary bg-primary/5">
                Base Ativa
              </Badge>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                  <Car className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Veículos Protegidos</p>
                  <p className="text-xl font-extrabold text-foreground">{totalVehicles}</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs font-semibold border-blue-500/30 text-blue-600 bg-blue-500/5">
                Em Proteção
              </Badge>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border/70 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Taxa de Liquidação</p>
                  <p className="text-xl font-extrabold text-foreground">{liquidationRate}%</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs font-semibold border-emerald-500/30 text-emerald-600 bg-emerald-500/5">
                Recebimento
              </Badge>
            </div>
          </div>

          {/* 4. Analytics & Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Evolução de Vencimentos */}
            <Card className="lg:col-span-2 border border-border/80 shadow-card rounded-2xl bg-card overflow-hidden">
              <CardHeader className="p-5 border-b border-border/60 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <BarChart3 className="size-4 text-primary" />
                    Evolução por Vencimento
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Distribuição dos valores por data de vencimento recente
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-emerald-600">
                    <span className="size-2 rounded-full bg-emerald-500" /> Recebido
                  </span>
                  <span className="flex items-center gap-1.5 font-medium text-amber-600">
                    <span className="size-2 rounded-full bg-amber-500" /> Pendente
                  </span>
                  <span className="flex items-center gap-1.5 font-medium text-rose-600">
                    <span className="size-2 rounded-full bg-rose-500" /> Vencido
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                {chartData.length === 0 ? (
                  <div className="flex h-56 items-center justify-center text-muted-foreground text-xs">
                    Nenhuma data de cobrança registrada no período.
                  </div>
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                        <XAxis
                          dataKey="dateFormatted"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: "currentColor", opacity: 0.7 }}
                        />
                        <YAxis
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(val) => `R$ ${val}`}
                          tick={{ fill: "currentColor", opacity: 0.7 }}
                        />
                        <Tooltip
                          formatter={(value: any) => [BRL(Number(value) || 0), ""]}
                          labelFormatter={(label) => `Vencimento: ${label}`}
                          contentStyle={{
                            borderRadius: "12px",
                            border: "1px solid var(--border)",
                            backgroundColor: "var(--card)",
                            color: "var(--foreground)",
                            boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
                            fontSize: "12px",
                          }}
                        />
                        <Bar dataKey="recebido" name="Recebido" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="pendente" name="Pendente" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="vencido" name="Vencido" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Composição da Carteira (Donut) */}
            <Card className="border border-border/80 shadow-card rounded-2xl bg-card overflow-hidden">
              <CardHeader className="p-5 border-b border-border/60">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <PieChartIcon className="size-4 text-primary" />
                  Composição da Carteira
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Volume total: <span className="font-bold text-foreground">{BRL(totalVolume)}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {pieData.length === 0 ? (
                  <div className="flex h-56 items-center justify-center text-muted-foreground text-xs">
                    Sem movimentações suficientes para gerar o gráfico.
                  </div>
                ) : (
                  <>
                    <div className="h-44 w-full relative flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={50}
                            outerRadius={75}
                            paddingAngle={4}
                            strokeWidth={0}
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: any) => [BRL(Number(value) || 0), "Valor"]}
                            contentStyle={{
                              borderRadius: "12px",
                              border: "1px solid var(--border)",
                              backgroundColor: "var(--card)",
                              color: "var(--foreground)",
                              boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
                              fontSize: "12px",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">Volume</span>
                        <span className="text-sm font-extrabold text-foreground">{BRL(totalVolume)}</span>
                      </div>
                    </div>

                    <div className="space-y-2.5 pt-1">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="flex items-center gap-1.5 font-semibold text-emerald-600">
                            <span className="size-2 rounded-full bg-emerald-500" />
                            Recebidas ({liquidationRate}%)
                          </span>
                          <span className="font-bold text-foreground">{BRL(totalReceivedVal)}</span>
                        </div>
                        <Progress value={Number(liquidationRate)} className="h-1.5 bg-emerald-500/20 [&>div]:bg-emerald-500" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="flex items-center gap-1.5 font-semibold text-amber-600">
                            <span className="size-2 rounded-full bg-amber-500" />
                            Pendentes ({totalVolume > 0 ? ((totalPendingVal / totalVolume) * 100).toFixed(1) : 0}%)
                          </span>
                          <span className="font-bold text-foreground">{BRL(totalPendingVal)}</span>
                        </div>
                        <Progress
                          value={totalVolume > 0 ? (totalPendingVal / totalVolume) * 100 : 0}
                          className="h-1.5 bg-amber-500/20 [&>div]:bg-amber-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="flex items-center gap-1.5 font-semibold text-rose-600">
                            <span className="size-2 rounded-full bg-rose-500" />
                            Vencidas ({overdueRate}%)
                          </span>
                          <span className="font-bold text-foreground">{BRL(totalOverdueVal)}</span>
                        </div>
                        <Progress value={Number(overdueRate)} className="h-1.5 bg-rose-500/20 [&>div]:bg-rose-500" />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 5. Recent Payments Table */}
          <Card className="border border-border/80 shadow-card rounded-2xl bg-card overflow-hidden">
            <CardHeader className="p-5 border-b border-border/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <FileText className="size-4 text-primary" />
                  Últimas Cobranças
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Extrato com emissão de boletos, visualização direta e disparo via WhatsApp
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="rounded-xl h-8 text-xs font-semibold gap-1.5 self-start sm:self-auto border-border/80 hover:bg-muted"
              >
                <Link to="/invoices">
                  <span>Ver todas as faturas</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </CardHeader>

            <CardContent className="p-0">
              {payments.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center space-y-3">
                  <div className="size-12 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground">
                    <FileText className="size-6" />
                  </div>
                  <p className="font-semibold text-sm text-foreground">Nenhuma cobrança gerada ainda</p>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Gere cobranças e boletos para os seus associados no Asaas para acompanhar as métricas em tempo real.
                  </p>
                  <Button size="sm" asChild className="rounded-xl mt-2 text-xs font-bold">
                    <Link to="/invoices">
                      <Plus className="size-3.5 mr-1.5" />
                      Gerar Primeira Cobrança
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/30 border-b border-border/60 font-semibold">
                      <tr>
                        <th className="px-5 py-3">Associado</th>
                        <th className="px-5 py-3">Descrição</th>
                        <th className="px-5 py-3">Vencimento</th>
                        <th className="px-5 py-3">Valor</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {payments.slice(0, 10).map((p: any) => {
                        const displayName = p.customerName || p.customer || "Associado";
                        const initials = displayName
                          .split(" ")
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((n: string) => n[0]?.toUpperCase())
                          .join("") || "AS";

                        return (
                          <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="size-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                                  {initials}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-foreground text-xs sm:text-sm truncate max-w-[200px]">
                                    {displayName}
                                  </p>
                                  {(p.customerDocument || p.customer) && (
                                    <p className="text-[11px] text-muted-foreground font-mono truncate">
                                      {p.customerDocument || p.customer}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-xs text-muted-foreground">
                              <span className="font-medium text-foreground block">{p.description || "Mensalidade"}</span>
                              <span className="text-[10px] text-muted-foreground/80">{p.billingType || "BOLETO"}</span>
                            </td>
                            <td className="px-5 py-3.5 text-xs font-medium text-foreground">
                              {p.dueDate ? p.dueDate.split("-").reverse().join("/") : "—"}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="font-extrabold text-foreground text-xs sm:text-sm">{BRL(p.value)}</span>
                            </td>
                            <td className="px-5 py-3.5">{getStatusBadge(p.status)}</td>
                            <td className="px-5 py-3.5 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="rounded-xl h-8 px-2.5 text-xs font-semibold text-primary border-primary/30 hover:bg-primary/10 hover:text-primary gap-1 shadow-2xs"
                                  onClick={() => handleViewBoleto(p)}
                                  title="Ver e abrir boleto"
                                >
                                  <FileText className="size-3.5" />
                                  <span>Boleto</span>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="rounded-xl h-8 px-2.5 text-xs font-semibold text-emerald-600 border-emerald-300 hover:bg-emerald-500/10 hover:text-emerald-700 hover:border-emerald-400 gap-1 shadow-2xs"
                                  onClick={() => handleSendWhatsApp(p)}
                                  title="Enviar fatura via WhatsApp"
                                >
                                  <MessageCircle className="size-3.5" />
                                  <span>WhatsApp</span>
                                </Button>
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
        </div>
      ) : (
        <div className="flex h-64 flex-col items-center justify-center space-y-4">
          <p className="text-destructive font-medium">Erro ao carregar dados do Asaas</p>
          <p className="text-sm text-muted-foreground">{data?.error || (error as Error)?.message}</p>
        </div>
      )}
    </AppLayout>
  );
}

function Dashboard() {
  const { appMode, companyId, segment } = useAuth();

  if (segment === "IMOBILIARIA") {
    return <Navigate to="/real-estate/charges" />;
  }

  if ((appMode === "billing" || segment === "PROTECAO_VEICULAR") && companyId) {
    return <BillingDashboard companyId={companyId} />;
  }

  const [period, setPeriod] = useState<PeriodType>("month");
  const [customRange, setCustomRange] = useState<{ from?: Date; to?: Date }>();

  const merchants = useQuery(merchantsQuery);
  const transactions = useQuery(transactionsQuery);
  const expenses = useQuery(expensesQuery);
  const plans = useQuery(feePlansQuery);
  const closures = useQuery(closuresQuery);

  const ranges = useMemo(() => getPeriodDateRange(period, customRange as DateRange), [period, customRange]);

  const calcPeriod = (range: DateRange) => {
    const txs = (transactions.data ?? []).filter((t) => isDateInRange(t.transaction_date, range));
    const exps = (expenses.data ?? []).filter((e) => isMonthInRange(e.reference_month, range));

    let totalGross = 0;
    let totalOpFee = 0;
    let totalSavings = 0;
    const byModality: Record<string, number> = {};

    for (const merchant of merchants.data ?? []) {
      const calc = calculateClosure(
        txs.filter((t) => t.merchant_id === merchant.id),
        exps.filter((e) => e.merchant_id === merchant.id),
        (plans.data ?? []).find((p) => p.merchant_id === merchant.id),
      );
      totalGross += calc.totalGross;
      totalOpFee += calc.totalOpFee;
      totalSavings += calc.savings;
      for (const m of MODALITIES) {
        byModality[m.value] = (byModality[m.value] ?? 0) + calc.grossByModality[m.value];
      }
    }
    return { totalGross, totalOpFee, totalSavings, byModality };
  };

  const currentData = useMemo(
    () => calcPeriod(ranges.current),
    [transactions.data, expenses.data, merchants.data, plans.data, ranges.current],
  );
  const previousData = useMemo(
    () => calcPeriod(ranges.previous),
    [transactions.data, expenses.data, merchants.data, plans.data, ranges.previous],
  );

  const grossTrend = calculateTrend(currentData.totalGross, previousData.totalGross);
  const opFeeTrend = calculateTrend(currentData.totalOpFee, previousData.totalOpFee);
  const savingsTrend = calculateTrend(currentData.totalSavings, previousData.totalSavings);

  const chartData = MODALITIES.map((m) => ({
    name: m.label,
    valor: Number((currentData.byModality[m.value] ?? 0).toFixed(2)),
  }));

  const monthClosures = (closures.data ?? []).filter((c) => isMonthInRange(c.reference_month, ranges.current));
  const pendingCount = monthClosures.filter((c) => c.status !== "paid").length;

  const getSubtitle = () => {
    if (period === "month")
      return `Visão consolidada de ${format(ranges.current.from, "MMMM/yyyy", { locale: ptBR })}`;
    if (period === "7d") return "Últimos 7 dias";
    if (period === "30d") return "Últimos 30 dias";
    if (period === "90d") return "Últimos 90 dias";
    if (period === "custom" && customRange?.from && customRange?.to) {
      return `${format(customRange.from, "dd/MM/yyyy")} até ${format(customRange.to, "dd/MM/yyyy")}`;
    }
    return "Visão consolidada";
  };

  return (
    <AppLayout
      title="Dashboard"
      subtitle={getSubtitle()}
      actions={
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
            <SelectTrigger className="w-[140px] h-9 text-xs bg-background shadow-2xs rounded-xl border-border/80">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="month">Este Mês</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
          {period === "custom" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 px-3 text-xs min-w-[180px] justify-start rounded-xl shadow-2xs">
                  <CalendarIcon className="mr-2 size-3.5 text-muted-foreground" />
                  {customRange?.from ? (
                    customRange.to ? (
                      <>
                        {format(customRange.from, "P", { locale: ptBR })} -{" "}
                        {format(customRange.to, "P", { locale: ptBR })}
                      </>
                    ) : (
                      format(customRange.from, "P", { locale: ptBR })
                    )
                  ) : (
                    <span>Selecione a data</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-2xl" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={customRange?.from}
                  selected={{ from: customRange?.from, to: customRange?.to }}
                  onSelect={(v: any) => setCustomRange(v)}
                  numberOfMonths={1}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      }
    >
      {/* Cards de Métricas Principais */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.3 }}>
          <KpiCard
            label="Total faturado (global)"
            value={BRL(currentData.totalGross)}
            icon={TrendingUp}
            tone="primary"
            trend={grossTrend.trend}
            trendValue={grossTrend.value}
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.3 }}>
          <KpiCard
            label="Taxa operacional a receber"
            value={BRL(currentData.totalOpFee)}
            icon={Wallet}
            trend={opFeeTrend.trend}
            trendValue={opFeeTrend.value}
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.3 }}>
          <KpiCard
            label="Economia gerada aos clientes"
            value={BRL(currentData.totalSavings)}
            icon={PiggyBank}
            tone="success"
            trend={savingsTrend.trend}
            trendValue={savingsTrend.value}
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.3 }}>
          <KpiCard
            label="Cobranças pendentes"
            value={String(pendingCount)}
            hint={`${monthClosures.length} fechamentos no período`}
            icon={FileCheck2}
          />
        </motion.div>
      </div>

      {/* Gráficos de Faturamento e Distribuição */}
      <motion.div
        className="mt-6 grid gap-5 lg:grid-cols-5"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.3 }}
      >
        <Card className="lg:col-span-3 border border-border/80 shadow-card rounded-2xl bg-card overflow-hidden">
          <CardHeader className="p-5 pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4 text-primary" />
              <CardTitle className="text-base font-bold text-foreground">Faturamento por Modalidade</CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Volume total transacionado por canal de pagamento no período selecionado
            </CardDescription>
          </CardHeader>
          <CardContent className="h-72 p-5 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.6} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <Tooltip
                  formatter={(v: number) => [BRL(v), "Volume"]}
                  contentStyle={{
                    borderRadius: "1rem",
                    border: "1px solid var(--border)",
                    boxShadow: "0 8px 30px -4px rgba(0,0,0,0.08)",
                  }}
                />
                <Bar dataKey="valor" radius={[8, 8, 0, 0]} fill="oklch(0.48 0.22 283)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border border-border/80 shadow-card rounded-2xl bg-card overflow-hidden">
          <CardHeader className="p-5 pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <PieChartIcon className="size-4 text-primary" />
              <CardTitle className="text-base font-bold text-foreground">Distribuição do Volume</CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Participação percentual por tipo de venda
            </CardDescription>
          </CardHeader>
          <CardContent className="h-72 p-5 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} dataKey="valor" nameKey="name" innerRadius={55} outerRadius={88} paddingAngle={2}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v: number) => [BRL(v), "Volume"]}
                  contentStyle={{
                    borderRadius: "1rem",
                    border: "1px solid var(--border)",
                    boxShadow: "0 8px 30px -4px rgba(0,0,0,0.08)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Lista de Cobranças Recentes */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
      >
        <Card className="mt-6 border border-border/80 shadow-card rounded-2xl bg-card overflow-hidden">
          <CardHeader className="p-5 pb-3 border-b border-border/60 flex flex-row items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <FileCheck2 className="size-4 text-primary" />
                <CardTitle className="text-base font-bold text-foreground">Status das Cobranças do Período</CardTitle>
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                Fechamentos mensais apurados para os estabelecimentos credenciados
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs text-primary gap-1">
              <Link to="/closures">
                <span>Ver todos</span>
                <ChevronRight className="size-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-3">
            {monthClosures.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Nenhum fechamento gerado para o período selecionado.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {monthClosures.map((c) => {
                  const merchant = (merchants.data ?? []).find((m) => m.id === c.merchant_id);
                  return (
                    <Link
                      key={c.id}
                      to="/closures"
                      className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-muted/40 transition-colors group cursor-pointer"
                    >
                      <div className="min-w-0 flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                          <MerchantIcon name={merchant?.name} className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                            {merchant?.name ?? "EC"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Economia apurada: <strong className="text-emerald-600 font-mono">{BRL(Number(c.savings_amount))}</strong>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-bold font-mono">{BRL(Number(c.net_invoice_amount))}</span>
                        <Badge
                          variant={getClosureBadgeVariant(c.status)}
                          className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                        >
                          {closureStatusLabel[c.status]}
                        </Badge>
                        <ChevronRight className="size-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <p className="mt-6 text-xs text-muted-foreground">
        Modalidades acompanhadas: {MODALITIES.map((m) => modalityLabel(m.value)).join(" · ")}
      </p>
    </AppLayout>
  );
}
