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
      <Card className="rounded-2xl border border-border/80 shadow-card bg-card p-12 flex flex-col items-center justify-center text-center space-y-2">
        <div className="size-12 rounded-2xl bg-muted/50 flex items-center justify-center text-muted-foreground mb-1">
          <span className="text-xl">📱</span>
        </div>
        <p className="font-semibold text-base text-foreground">Nenhuma maquininha vinculada</p>
        <p className="text-xs text-muted-foreground">As POS registradas aparecerão aqui com número de série e modelo.</p>
      </Card>
    </AppLayout>
  );
}
