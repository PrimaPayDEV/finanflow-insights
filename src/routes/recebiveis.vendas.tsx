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
      <Card className="border-none shadow-card p-8 flex flex-col items-center justify-center text-muted-foreground text-center">
        <p className="mb-2">Nenhum recebível importado recentemente.</p>
        <p className="text-sm">Guarde suas filipetas para conferência das transações. Em caso de dúvida, entre em contato com nosso suporte pelo WhatsApp.</p>
      </Card>
    </AppLayout>
  );
}
