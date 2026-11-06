import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Store, Mail, Phone, FileText, CheckCircle2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/recebiveis/perfil")({
  head: () => ({
    meta: [{ title: "Meu Cadastro | Gestão de Recebíveis" }],
  }),
  component: RecebiveisPerfil,
});

function RecebiveisPerfil() {
  const { merchantId, user } = useAuth();

  const merchantQuery = useQuery({
    queryKey: ["merchant_profile", merchantId],
    queryFn: async () => {
      if (!merchantId) return null;
      const { data, error } = await supabase
        .from("merchants")
        .select("*")
        .eq("id", merchantId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!merchantId,
  });

  const m = merchantQuery.data;

  return (
    <AppLayout
      title="Meu Cadastro"
      subtitle="Dados cadastrais do seu Estabelecimento Comercial no Gestor de Recebíveis"
    >
      <div className="max-w-3xl space-y-6">
        <Card className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden">
          <CardHeader className="p-6 border-b border-border/60 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                <Store className="size-6" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-foreground">
                  {m?.name || "Estabelecimento Comercial"}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Operando provisoriamente com maquininha ativa Prima
                </p>
              </div>
            </div>
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs">
              {m?.status === "active" ? "Cadastro Ativo" : "Em Análise"}
            </Badge>
          </CardHeader>

          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
                  <FileText className="size-3.5 text-blue-600" />
                  <span>CNPJ / CPF</span>
                </span>
                <p className="font-mono font-bold text-foreground text-sm">
                  {m?.document_cnpj || "Não informado"}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
                  <Mail className="size-3.5 text-blue-600" />
                  <span>E-mail Cadastrado</span>
                </span>
                <p className="font-bold text-foreground text-sm">
                  {m?.email || user?.email || "Não informado"}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
                  <Phone className="size-3.5 text-blue-600" />
                  <span>Telefone de Contato</span>
                </span>
                <p className="font-bold text-foreground text-sm">
                  {m?.phone_whatsapp || "Não informado"}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-blue-600" />
                  <span>Status do Credenciamento</span>
                </span>
                <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-1">
                  <CheckCircle2 className="size-4" />
                  <span>Operação Liberada</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
