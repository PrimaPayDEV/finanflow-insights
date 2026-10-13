import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/recebiveis/vendas")({
  head: () => ({
    meta: [{ title: "Recebíveis | Gestão de Recebíveis" }],
  }),
  component: RecebiveisVendas,
});

function RecebiveisVendas() {
  return (
    <AppLayout 
      title="Recebíveis" 
      subtitle="Visualize as vendas importadas das suas maquininhas"
    >
      <Card className="rounded-2xl border border-border/80 shadow-card bg-card p-12 flex flex-col items-center justify-center text-center space-y-3">
        <div className="size-12 rounded-2xl bg-muted/50 flex items-center justify-center text-muted-foreground">
          <span className="text-xl">💳</span>
        </div>
        <p className="font-semibold text-base text-foreground">Nenhum recebível importado recentemente</p>
        <p className="text-xs text-muted-foreground max-w-md">Guarde suas filipetas para conferência das transações. Em caso de dúvida, entre em contato com nosso suporte pelo WhatsApp.</p>
      </Card>
    </AppLayout>
  );
}
