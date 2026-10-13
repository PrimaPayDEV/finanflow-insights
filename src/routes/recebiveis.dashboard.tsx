import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Wallet, Lock } from "lucide-react";
import { BRL } from "@/lib/format";

export const Route = createFileRoute("/recebiveis/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard | Gestão de Recebíveis" }],
  }),
  component: RecebiveisDashboard,
});

function RecebiveisDashboard() {
  const saldoTotal = 0;
  const saldoComprometido = 0;
  const saldoDisponivel = saldoTotal - saldoComprometido;

  return (
    <AppLayout 
      title="Dashboard" 
      subtitle="Acompanhe o saldo e movimentações dos seus recebíveis"
    >
      <div className="grid gap-5 md:grid-cols-3 mb-8">
        <Card className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between p-5 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Saldo Total</CardTitle>
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Wallet className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-2xl font-black font-mono tracking-tight text-foreground">{BRL(saldoTotal)}</div>
            <p className="text-xs text-muted-foreground mt-1">Valor acumulado na sua conta</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between p-5 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Saldo Comprometido</CardTitle>
            <div className="size-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
              <Lock className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-2xl font-black font-mono tracking-tight text-destructive">{BRL(saldoComprometido)}</div>
            <p className="text-xs text-muted-foreground mt-1">Lançamentos em processamento</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none shadow-card bg-gradient-brand text-white overflow-hidden shadow-lg shadow-primary/20">
          <CardHeader className="flex flex-row items-center justify-between p-5 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-white/80">Saldo Disponível</CardTitle>
            <div className="size-8 rounded-lg bg-white/20 text-white flex items-center justify-center">
              <DollarSign className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-2xl font-black font-mono tracking-tight text-white">{BRL(saldoDisponivel)}</div>
            <p className="text-xs text-white/80 mt-1">Valor liberado para resgate</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="space-y-4">
        <h3 className="font-bold text-base text-foreground">Resumo Recente</h3>
        <Card className="rounded-2xl border border-border/80 shadow-card bg-card p-12 flex flex-col items-center justify-center text-center space-y-2">
          <div className="size-12 rounded-2xl bg-muted/50 flex items-center justify-center text-muted-foreground mb-2">
            <Wallet className="size-6" />
          </div>
          <p className="text-sm font-semibold text-foreground">Nenhuma movimentação encontrada</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            As vendas e lançamentos conciliados aparecerão aqui assim que forem processados.
          </p>
        </Card>
      </div>
    </AppLayout>
  );
}
