import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/recebiveis/perfil")({
  head: () => ({
    meta: [{ title: "Meu Cadastro | Gestão de Recebíveis" }],
  }),
  component: RecebiveisPerfil,
});

function RecebiveisPerfil() {
  return (
    <AppLayout 
      title="Meu Cadastro" 
      subtitle="Informações do seu estabelecimento"
    >
      <Card className="rounded-2xl border border-border/80 shadow-card bg-card p-12 flex flex-col items-center justify-center text-center space-y-2">
        <div className="size-12 rounded-2xl bg-muted/50 flex items-center justify-center text-muted-foreground mb-1">
          <span className="text-xl">🏢</span>
        </div>
        <p className="font-semibold text-base text-foreground">Nenhuma informação encontrada</p>
        <p className="text-xs text-muted-foreground">Os dados cadastrais do seu estabelecimento serão exibidos aqui.</p>
      </Card>
    </AppLayout>
  );
}
