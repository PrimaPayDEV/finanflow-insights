import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/recebiveis/extrato")({
  head: () => ({
    meta: [{ title: "Extrato | Gestão de Recebíveis" }],
  }),
  component: RecebiveisExtrato,
});

function RecebiveisExtrato() {
  return (
    <AppLayout 
      title="Extrato" 
      subtitle="Histórico de entradas e saídas"
    >
      <Card className="rounded-2xl border border-border/80 shadow-card bg-card p-12 flex flex-col items-center justify-center text-center space-y-2">
        <div className="size-12 rounded-2xl bg-muted/50 flex items-center justify-center text-muted-foreground mb-1">
          <span className="text-xl">📄</span>
        </div>
        <p className="font-semibold text-base text-foreground">Nenhum registro encontrado</p>
        <p className="text-xs text-muted-foreground">O histórico detalhado de extrato será exibido aqui.</p>
      </Card>
    </AppLayout>
  );
}
