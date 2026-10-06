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
      <Card className="border-none shadow-card p-8 flex items-center justify-center text-muted-foreground">
        Nenhuma informação encontrada.
      </Card>
    </AppLayout>
  );
}
