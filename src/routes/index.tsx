import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Wallet, PiggyBank, FileCheck2 } from "lucide-react";
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
  const month = currentMonth();
  const merchants = useQuery(merchantsQuery);
  const transactions = useQuery(transactionsQuery);
  const expenses = useQuery(expensesQuery);
  const plans = useQuery(feePlansQuery);
  const closures = useQuery(closuresQuery);

  const txs = (transactions.data ?? []).filter((t) => t.transaction_date.slice(0, 7) === month);
  const exps = (expenses.data ?? []).filter((e) => e.reference_month === month);

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

  const chartData = MODALITIES.map((m) => ({
    name: m.label,
    valor: Number((byModality[m.value] ?? 0).toFixed(2)),
  }));

  const monthClosures = (closures.data ?? []).filter((c) => c.reference_month === month);
  const pendingCount = monthClosures.filter((c) => c.status !== "paid").length;

  return (
    <AppLayout
      title="Dashboard"
      subtitle={`Visão consolidada de ${monthLabel(month)}`}
      actions={<Badge variant="secondary">{(merchants.data ?? []).length} estabelecimentos</Badge>}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total faturado (global)" value={BRL(totalGross)} icon={TrendingUp} tone="primary" />
        <KpiCard label="Taxa operacional a receber" value={BRL(totalOpFee)} icon={Wallet} />
        <KpiCard
          label="Economia gerada aos clientes"
          value={BRL(totalSavings)}
          icon={PiggyBank}
          tone="success"
        />
        <KpiCard
          label="Cobranças pendentes"
          value={String(pendingCount)}
          hint={`${monthClosures.length} fechamentos no mês`}
          icon={FileCheck2}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
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
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Status das cobranças</CardTitle>
        </CardHeader>
        <CardContent>
          {monthClosures.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum fechamento gerado para {monthLabel(month)}.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {monthClosures.map((c) => {
                const merchant = (merchants.data ?? []).find((m) => m.id === c.merchant_id);
                return (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{merchant?.name ?? "EC"}</p>
                      <p className="text-xs text-muted-foreground">
                        Economia {BRL(Number(c.savings_amount))}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">{BRL(Number(c.net_invoice_amount))}</span>
                      <Badge variant={getClosureBadgeVariant(c.status)}>
                        {closureStatusLabel[c.status]}
                      </Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="mt-6 text-xs text-muted-foreground">
        Modalidades acompanhadas: {MODALITIES.map((m) => modalityLabel(m.value)).join(" · ")}
      </p>
    </AppLayout>
  );
}

