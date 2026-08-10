import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { TrendingUp, Wallet, PiggyBank, FileCheck2, CalendarIcon } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function Dashboard() {
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

  const currentData = useMemo(() => calcPeriod(ranges.current), [transactions.data, expenses.data, merchants.data, plans.data, ranges.current]);
  const previousData = useMemo(() => calcPeriod(ranges.previous), [transactions.data, expenses.data, merchants.data, plans.data, ranges.previous]);

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
    if (period === "month") return `Visão consolidada de ${format(ranges.current.from, "MMMM/yyyy", { locale: ptBR })}`;
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
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
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
                <Button variant="outline" size="sm" className="h-8 px-2 text-xs min-w-[180px] justify-start">
                  <CalendarIcon className="mr-2 h-3 w-3" />
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
              <PopoverContent className="w-auto p-0" align="end">
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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}>
          <KpiCard 
            label="Total faturado (global)" 
            value={BRL(currentData.totalGross)} 
            icon={TrendingUp} 
            tone="primary" 
            trend={grossTrend.trend}
            trendValue={grossTrend.value}
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }}>
          <KpiCard 
            label="Taxa operacional a receber" 
            value={BRL(currentData.totalOpFee)} 
            icon={Wallet} 
            trend={opFeeTrend.trend}
            trendValue={opFeeTrend.value}
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.4 }}>
          <KpiCard
            label="Economia gerada aos clientes"
            value={BRL(currentData.totalSavings)}
            icon={PiggyBank}
            tone="success"
            trend={savingsTrend.trend}
            trendValue={savingsTrend.value}
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.4 }}>
          <KpiCard
            label="Cobranças pendentes"
            value={String(pendingCount)}
            hint={`${monthClosures.length} fechamentos no período`}
            icon={FileCheck2}
          />
        </motion.div>
      </div>

      <motion.div 
        className="mt-6 grid gap-4 lg:grid-cols-5"
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.5, duration: 0.4 }}
      >
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Faturamento por modalidade</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                <Tooltip formatter={(v: number) => BRL(v)} />
                <Bar dataKey="valor" radius={[6, 6, 0, 0]} fill="var(--chart-2)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Distribuição do volume</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} dataKey="valor" nameKey="name" innerRadius={55} outerRadius={90}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => BRL(v)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.6, duration: 0.4 }}
      >
        <Card className="mt-6 hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="text-base">Status das cobranças</CardTitle>
        </CardHeader>
        <CardContent>
          {monthClosures.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum fechamento gerado para o período selecionado.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {monthClosures.map((c) => {
                const merchant = (merchants.data ?? []).find((m) => m.id === c.merchant_id);
                return (
                  <li key={c.id}>
                    <Link to="/closures" className="flex items-center justify-between gap-3 py-3 px-2 rounded-md hover:bg-muted/60 transition-colors group">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium group-hover:text-primary transition-colors">{merchant?.name ?? "EC"}</p>
                        <p className="text-xs text-muted-foreground group-hover:text-muted-foreground/80 transition-colors">
                          Economia {BRL(Number(c.savings_amount))}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-semibold">{BRL(Number(c.net_invoice_amount))}</span>
                        <Badge variant={getClosureBadgeVariant(c.status)} className="transition-transform group-hover:scale-105">
                          {closureStatusLabel[c.status]}
                        </Badge>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
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

