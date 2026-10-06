import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/recebiveis/pos")({
  head: () => ({
    meta: [{ title: "Minhas POS | Gestão de Recebíveis" }],
  }),
  component: RecebiveisPos,
});

function RecebiveisPos() {
  return (
    <AppLayout 
      title="Minhas POS" 
      subtitle="Maquininhas vinculadas ao seu estabelecimento"
    >
      <Card className="border-none shadow-card p-8 flex items-center justify-center text-muted-foreground">
        Nenhuma maquininha encontrada.
      </Card>
    </AppLayout>
  );
}
