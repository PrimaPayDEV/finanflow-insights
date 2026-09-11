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
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8 bg-background p-6 md:p-10 rounded-xl shadow-sm border border-border/50">
        <header className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Relatório de Economia</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            {merchant.name} — {monthLabel(closure.reference_month)}
          </p>
          {closure.status === 'paid' && (
             <Badge variant="default" className="mt-4 text-xs bg-success text-success-foreground hover:bg-success/90 border-none">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Fatura Paga
             </Badge>
          )}
        </header>

        <section>
          <h2 className="text-xl font-bold tracking-tight mb-6 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            Comparativo e Economia
          </h2>
          
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-none shadow-card bg-slate-50/50">
                <CardContent className="p-6 md:p-8 flex flex-col justify-center text-center">
                  <h3 className="text-muted-foreground font-bold text-xs md:text-sm uppercase tracking-wider mb-2">Custo no modelo tradicional</h3>
                  <p className="text-3xl md:text-4xl font-bold text-destructive line-through decoration-destructive/40">{BRL(calc.traditionalCost)}</p>
                </CardContent>
              </Card>

              <Card className="border border-primary/20 shadow-card bg-primary/5">
                <CardContent className="p-6 md:p-8 flex flex-col justify-center text-center">
                  <h3 className="text-primary font-bold text-xs md:text-sm uppercase tracking-wider mb-2">Custos com a Solução Prima</h3>
                  <p className="text-3xl md:text-4xl font-bold text-primary">{BRL(calc.totalMerchantCost)}</p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-none shadow-card bg-success text-success-foreground">
              <div className="p-10 md:p-14 flex flex-col justify-center items-center text-center">
                <PiggyBank className="w-16 h-16 md:w-20 md:h-20 mb-6 opacity-90" />
                <h3 className="text-xl md:text-2xl font-bold mb-3">Sua economia neste mês foi de:</h3>
                <p className="text-5xl md:text-7xl font-black tracking-tight drop-shadow-md">
                  {BRL(calc.savings)}
                </p>
              </div>
            </Card>
          </div>
        </section>

        <section className="pt-8">
          <h2 className="text-xl font-bold tracking-tight mb-4 flex items-center gap-2">
            <Receipt className="h-5 w-5 text-muted-foreground" />
            Resumo do Faturamento
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-none shadow-card">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold text-muted-foreground">Faturamento Bruto</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-2xl font-bold">{BRL(calc.totalGross)}</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-card">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold text-muted-foreground">Lançamentos / Deduções</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-2xl font-bold text-destructive">-{BRL(calc.totalExpenses)}</p>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
