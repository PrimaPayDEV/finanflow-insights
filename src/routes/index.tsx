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

export const Route = createFileRoute("/")({
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
  const { data, isLoading, error } = useQuery({
    queryKey: ["billing_metrics", companyId],
    queryFn: () => fetchMetrics({ data: { companyId } }),
  });

  return (
    <AppLayout title="Dashboard" subtitle="Visão consolidada de Boletos e Cobranças">
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <p className="text-muted-foreground text-sm">Carregando métricas...</p>
        </div>
      ) : data?.ok ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Saldo Asaas"
              value={BRL(data.data.balance)}
              icon={Wallet}
              hint="Atualizado agora"
              tone="primary"
            />
            <KpiCard
              label="Total Recebido (Mês)"
              value={BRL(data.data.totalReceived)}
              icon={TrendingUp}
              hint="Em cobranças pagas"
              tone="success"
            />
            <KpiCard
              label="Inadimplência / Vencido"
              value={BRL(data.data.totalOverdue)}
              icon={FileCheck2}
              hint="Atrasados"
            />
            <KpiCard
              label="Pendentes a Receber"
              value={BRL(data.data.totalPending)}
              icon={PiggyBank}
              hint="Aguardando pagamento"
            />
          </div>
          <Card className="border border-border/80 shadow-card rounded-2xl bg-card overflow-hidden">
            <CardHeader className="p-5 border-b border-border/60">
              <CardTitle className="text-base font-bold">Últimas Cobranças</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Extrato recente de boletos e transações Pix
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              {data.data.recentPayments.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nenhuma cobrança encontrada.</p>
              ) : (
                <div className="divide-y divide-border/60">
                  {data.data.recentPayments.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <div>
                        <p className="font-semibold text-sm text-foreground">{p.customer}</p>
                        <p className="text-xs text-muted-foreground">{p.description || "Cobrança"}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm">{BRL(p.value)}</p>
                        <Badge
                          variant={
                            p.status === "RECEIVED" || p.status === "CONFIRMED"
                              ? "default"
                              : p.status === "OVERDUE"
                                ? "destructive"
                                : "secondary"
                          }
                          className="text-[10px] uppercase font-mono mt-0.5"
                        >
                          {p.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
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

  if (appMode === "billing" && companyId) {
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
