import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/recebiveis/lancamentos")({
  head: () => ({
    meta: [{ title: "Lançamentos | Gestão de Recebíveis" }],
  }),
  component: RecebiveisLancamentos,
});

function RecebiveisLancamentos() {
  return (
    <AppLayout 
      title="Lançamentos" 
      subtitle="Solicite resgates via PIX ou Boleto"
    >
      <Card className="border-none shadow-card p-8 flex items-center justify-center text-muted-foreground">
        Em breve...
      </Card>
    </AppLayout>
  );
}
