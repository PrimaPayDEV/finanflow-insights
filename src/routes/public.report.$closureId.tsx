import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getPublicReportData } from "@/lib/publicReport.functions";
import { useQuery } from "@tanstack/react-query";
import { calculateClosure } from "@/lib/closure";
import { BRL, PCT, monthLabel } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PiggyBank, TrendingUp, SearchX, Receipt, Banknote, ArrowDownRight, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/public/report/$closureId")({
  component: PublicReportPage,
});

function PublicReportPage() {
  const { closureId } = Route.useParams();
  const fetchReport = useServerFn(getPublicReportData);

  const { data, isLoading, error } = useQuery({
    queryKey: ["public_report", closureId],
    queryFn: () => fetchReport({ data: closureId }),
  });

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center p-4"><p className="text-muted-foreground animate-pulse">Carregando relatório...</p></div>;
  }

  if (error || !data) {
    return <div className="flex h-screen items-center justify-center p-4"><p className="text-destructive font-semibold">Erro ao carregar o relatório.</p></div>;
  }

  const { closure, merchant, plan, txs, exps } = data;
  const calc = calculateClosure(txs as any, exps as any, plan as any);

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8 bg-card p-6 md:p-10 rounded-2xl shadow-card border border-border/80">
        <header className="text-center mb-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/20 mb-3">
            <PiggyBank className="size-7" />
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground mb-1">Relatório de Economia</h1>
          <p className="text-muted-foreground text-sm md:text-base font-medium">
            {merchant.name} — {monthLabel(closure.reference_month)}
          </p>
          {closure.status === 'paid' && (
             <Badge variant="outline" className="mt-3 text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30 px-3 py-1 font-semibold rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Fatura Paga
             </Badge>
          )}
        </header>

        <section>
          <h2 className="text-lg md:text-xl font-bold tracking-tight mb-5 flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <TrendingUp className="size-4" />
            </div>
            Comparativo e Economia
          </h2>
          
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="rounded-2xl border border-border/80 shadow-card bg-muted/20 overflow-hidden">
                <CardContent className="p-6 md:p-8 flex flex-col justify-center text-center">
                  <h3 className="text-muted-foreground font-bold text-xs uppercase tracking-wider mb-2">Custo no modelo tradicional</h3>
                  <p className="text-3xl md:text-4xl font-extrabold text-destructive line-through decoration-destructive/40 font-mono">{BRL(calc.traditionalCost)}</p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-primary/30 shadow-card bg-primary/5 overflow-hidden">
                <CardContent className="p-6 md:p-8 flex flex-col justify-center text-center">
                  <h3 className="text-primary font-bold text-xs uppercase tracking-wider mb-2">Custos com a Solução Prima</h3>
                  <p className="text-3xl md:text-4xl font-extrabold text-primary font-mono">{BRL(calc.totalMerchantCost)}</p>
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-2xl border-none shadow-card bg-emerald-600 text-white overflow-hidden shadow-lg shadow-emerald-600/20">
              <div className="p-8 md:p-12 flex flex-col justify-center items-center text-center">
                <PiggyBank className="w-14 h-14 md:w-16 md:h-16 mb-4 opacity-95" />
                <h3 className="text-lg md:text-xl font-bold mb-2">Sua economia neste mês foi de:</h3>
                <p className="text-5xl md:text-6xl font-black tracking-tight font-mono drop-shadow-md">
                  {BRL(calc.savings)}
                </p>
              </div>
            </Card>
          </div>
        </section>

        <section className="pt-4">
          <h2 className="text-lg md:text-xl font-bold tracking-tight mb-4 flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Receipt className="size-4" />
            </div>
            Resumo do Faturamento
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden">
              <CardHeader className="p-5 pb-2 border-b border-border/60">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Faturamento Bruto</CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-3">
                <p className="text-2xl font-black font-mono tracking-tight text-foreground">{BRL(calc.totalGross)}</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden">
              <CardHeader className="p-5 pb-2 border-b border-border/60">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lançamentos / Deduções</CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-3">
                <p className="text-2xl font-black font-mono tracking-tight text-destructive">-{BRL(calc.totalExpenses)}</p>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
