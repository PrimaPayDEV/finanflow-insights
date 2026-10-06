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
      <Card className="border-none shadow-card p-8 flex items-center justify-center text-muted-foreground">
        Nenhum registro encontrado.
      </Card>
    </AppLayout>
  );
}
