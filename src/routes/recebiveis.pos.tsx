import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Smartphone, ShieldCheck, CheckCircle2, Clock, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/recebiveis/pos")({
  head: () => ({
    meta: [{ title: "Minhas Maquininhas POS | Gestor de Recebíveis" }],
  }),
  component: RecebiveisPos,
});

function RecebiveisPos() {
  const { user, role, companyName, merchantId } = useAuth();
  const isAdmin = Boolean(
    user?.email?.toLowerCase() === "financeiro@primapay.com.br" ||
    user?.email?.toLowerCase() === "contato@primapay.com.br" ||
    role === "admin" ||
    companyName === "Prima Hub" ||
    companyName === "PrimaPay"
  ) && role !== "merchant";

  // Busca terminais
  const terminalsQuery = useQuery({
    queryKey: ["pos_terminals_my", isAdmin ? "all" : merchantId],
    queryFn: async () => {
      let q = supabase
        .from("pos_terminals")
        .select("*, merchants(name, document)")
        .order("created_at", { ascending: false });

      if (!isAdmin && merchantId) {
        q = q.eq("merchant_id", merchantId);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const terminals = terminalsQuery.data || [];

  return (
    <AppLayout
      title="Maquininhas POS Provisionadas"
      subtitle={
        isAdmin
          ? "Lista de maquininhas entregues para movimentação durante o período de análise de cadastro"
          : "Maquininha ativa vinculada ao seu estabelecimento para uso imediato"
      }
    >
      {/* Banner Informativo */}
      <Card className="rounded-2xl border-none shadow-md bg-gradient-to-r from-blue-900/40 via-cyan-900/20 to-blue-900/40 border border-blue-500/20 mb-6 p-4 sm:p-5">
        <div className="flex items-start gap-3.5">
          <div className="size-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
            <Info className="size-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-foreground">
              Operação Antecipada e Provisória
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Enquanto o processo de análise de cadastro junto à instituição de pagamento é concluído, disponibilizamos uma maquininha já ativa no cadastro da Prima para você começar a faturar imediatamente. Todas as vendas passadas neste serial são creditadas no seu saldo disponível.
            </p>
          </div>
        </div>
      </Card>

      {/* Lista de Terminais */}
      <Card className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                {isAdmin && <TableHead className="text-xs font-bold uppercase py-3.5">Estabelecimento</TableHead>}
                <TableHead className="text-xs font-bold uppercase py-3.5">Modelo</TableHead>
                <TableHead className="text-xs font-bold uppercase py-3.5">Número de Série (Serial)</TableHead>
                <TableHead className="text-xs font-bold uppercase py-3.5">Data de Ativação</TableHead>
                <TableHead className="text-xs font-bold uppercase py-3.5 text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {terminals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 5 : 4} className="h-44 text-center text-muted-foreground text-xs">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Smartphone className="size-8 text-muted-foreground/50" />
                      <p className="font-semibold text-foreground text-sm">Nenhuma maquininha vinculada</p>
                      <p className="text-xs text-muted-foreground">
                        {isAdmin
                          ? "Vincule uma maquininha na tela 'Carteira de ECs'."
                          : "Entre em contato com o suporte da Prima para solicitar o número de série da sua maquininha."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                terminals.map((t: any) => (
                  <TableRow key={t.id} className="hover:bg-muted/30">
                    {isAdmin && (
                      <TableCell className="text-xs font-bold truncate max-w-[180px]">
                        {t.merchants?.name || "EC"}
                      </TableCell>
                    )}

                    <TableCell className="text-xs font-semibold text-foreground">
                      <div className="flex items-center gap-2">
                        <Smartphone className="size-4 text-blue-600" />
                        <span>{t.model || "POS Terminal"}</span>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs font-mono font-bold text-foreground">
                      {t.serial_number}
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground">
                      {t.created_at ? new Date(t.created_at).toLocaleDateString("pt-BR") : "—"}
                    </TableCell>

                    <TableCell className="text-xs text-center">
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] gap-1">
                        <CheckCircle2 className="size-3" />
                        <span>Ativa para Vendas</span>
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </AppLayout>
  );
}
