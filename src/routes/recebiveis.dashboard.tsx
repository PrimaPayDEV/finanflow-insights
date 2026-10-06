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
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card className="border-none shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Total</CardTitle>
            <Wallet className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{BRL(saldoTotal)}</div>
            <p className="text-xs text-muted-foreground mt-1">Valor acumulado na sua conta</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Comprometido</CardTitle>
            <Lock className="size-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{BRL(saldoComprometido)}</div>
            <p className="text-xs text-muted-foreground mt-1">Lançamentos em processamento</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-card bg-primary text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-primary-foreground/80">Saldo Disponível</CardTitle>
            <DollarSign className="size-4 text-primary-foreground/80" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{BRL(saldoDisponivel)}</div>
            <p className="text-xs text-primary-foreground/80 mt-1">Valor disponível para resgate</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Resumo Recente</h3>
        <Card className="border-none shadow-card p-8 flex items-center justify-center text-muted-foreground">
          Nenhuma movimentação encontrada.
        </Card>
      </div>
    </AppLayout>
  );
}
