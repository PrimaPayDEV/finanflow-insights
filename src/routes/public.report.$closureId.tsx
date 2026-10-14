import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getPublicReportData } from "@/lib/publicReport.functions";
import { useQuery } from "@tanstack/react-query";
import { calculateClosure } from "@/lib/closure";
import { BRL, PCT, monthLabel } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PiggyBank, TrendingUp, SearchX, Receipt, Banknote, ArrowDownRight, ArrowUpRight, CheckCircle2, Sparkles } from "lucide-react";
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

  const { closure, merchant, plan, txs, exps, terminals } = data as any;
  const merchantTerminals = (terminals as any[]) || [];
  const calc = calculateClosure(txs as any, exps as any, plan as any, merchantTerminals);

  const displayExpenses = useMemo(() => {
    const terminalItems = (calc.terminalSummary?.items ?? []).map((tItem) => ({
      id: tItem.id,
      category: tItem.isExempt ? ("isencao" as const) : ("despesa" as const),
      description: tItem.description,
      amount: tItem.amount,
      isTerminal: true,
      isExempt: tItem.isExempt,
      serialNumber: tItem.serialNumber,
      requiredGross: tItem.requiredGross,
    }));

    const filteredManual = merchantTerminals.length > 0
      ? (exps || []).filter((e: any) => {
          const desc = (e.description || "").toLowerCase().trim();
          return !desc.match(/^maquina\s*(\(\d+\/\d+\))?$/i) && !desc.match(/^maquininha/i);
        })
      : (exps || []);

    const manualItems = filteredManual.map((e: any) => ({
      id: e.id,
      category: e.category,
      description: e.description,
      amount: Number(e.amount),
      isTerminal: false,
      isExempt: false,
      serialNumber: undefined,
      requiredGross: undefined,
    }));

    return [...terminalItems, ...manualItems];
  }, [calc.terminalSummary, merchantTerminals.length, exps]);

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
                <p className="text-2xl font-black font-mono tracking-tight text-destructive">
                  {calc.totalExpenses > 0 ? `+${BRL(calc.totalExpenses)}` : BRL(calc.totalExpenses)}
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="pt-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg md:text-xl font-bold tracking-tight flex items-center gap-2">
              <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Receipt className="size-4" />
              </div>
              Lançamentos do Mês (Cobranças e Deduções)
            </h2>
            <div className="flex items-center gap-2">
              {calc.terminalSummary.totalTerminals > 0 && (
                <Badge variant="outline" className="text-xs font-semibold border-primary/30 bg-primary/5 text-primary">
                  {calc.terminalSummary.exemptTerminals} de {calc.terminalSummary.totalTerminals} {calc.terminalSummary.totalTerminals === 1 ? "máquina isenta" : "máquinas isentas"}
                </Badge>
              )}
              <Badge variant="secondary" className="font-mono text-xs">
                {displayExpenses.length} {displayExpenses.length === 1 ? "lançamento" : "lançamentos"}
              </Badge>
            </div>
          </div>

          <Card className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="font-semibold text-xs py-3 w-44">Categoria</TableHead>
                      <TableHead className="font-semibold text-xs py-3">Descrição</TableHead>
                      <TableHead className="text-right font-semibold text-xs py-3 w-48">Impacto no Boleto (R$)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayExpenses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="py-4 text-center text-muted-foreground text-xs italic">
                          Nenhum lançamento extra registrado para este mês.
                        </TableCell>
                      </TableRow>
                    ) : (
                      displayExpenses.map((exp) => (
                        <TableRow key={exp.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="py-2.5">
                            {exp.isExempt ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full text-emerald-600 border-emerald-500/30 bg-emerald-500/10"
                              >
                                <span className="flex items-center gap-1">
                                  <Sparkles className="size-3" /> Isenção (Meta)
                                </span>
                              </Badge>
                            ) : exp.category === "cobranca" ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full text-emerald-600 border-emerald-500/30 bg-emerald-500/10"
                              >
                                <span className="flex items-center gap-1">
                                  <ArrowDownRight className="size-3" /> Dedução (-)
                                </span>
                              </Badge>
                            ) : (
                              <Badge
                                variant="destructive"
                                className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full"
                              >
                                <span className="flex items-center gap-1">
                                  <ArrowUpRight className="size-3" /> Cobrança (+)
                                </span>
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-medium text-xs text-foreground py-2.5">
                            {exp.description}
                          </TableCell>
                          <TableCell className="text-right font-bold font-mono text-xs py-2.5">
                            {exp.isExempt ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                R$ 0,00 (Isento)
                              </span>
                            ) : (
                              <span
                                className={
                                  exp.category === "cobranca"
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-destructive"
                                }
                              >
                                {exp.category === "cobranca" ? "-" : "+"}
                                {BRL(exp.amount)}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
