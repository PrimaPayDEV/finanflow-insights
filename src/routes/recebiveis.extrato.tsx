import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Search, ArrowDownRight, ArrowUpRight, Wallet, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BRL } from "@/lib/format";

export const Route = createFileRoute("/recebiveis/extrato")({
  head: () => ({
    meta: [{ title: "Extrato de Conta | Gestor de Recebíveis" }],
  }),
  component: RecebiveisExtrato,
});

function RecebiveisExtrato() {
  const { user, role, companyName, merchantId } = useAuth();
  const isAdmin = Boolean(
    user?.email?.toLowerCase() === "financeiro@primapay.com.br" ||
    user?.email?.toLowerCase() === "contato@primapay.com.br" ||
    role === "admin" ||
    companyName === "Prima Hub" ||
    companyName === "PrimaPay"
  ) && role !== "merchant";

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [merchantFilter, setMerchantFilter] = useState("ALL");

  // Busca lista de ECs (para o Admin)
  const merchantsQuery = useQuery({
    queryKey: ["merchants_extrato_list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("merchants").select("id, name").order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  const merchantsMap = useMemo(() => {
    const map = new Map<string, string>();
    (merchantsQuery.data || []).forEach((m) => map.set(m.id, m.name));
    return map;
  }, [merchantsQuery.data]);

  // Busca Ledgers
  const ledgersQuery = useQuery({
    queryKey: ["receivables_ledgers_extrato", isAdmin ? "all" : merchantId],
    queryFn: async () => {
      let q = supabase
        .from("receivables_ledgers")
        .select("*")
        .order("created_at", { ascending: false });

      if (!isAdmin && merchantId) {
        q = q.eq("merchant_id", merchantId);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const filteredEntries = useMemo(() => {
    const list = ledgersQuery.data || [];
    return list.filter((l) => {
      if (typeFilter !== "ALL" && l.type !== typeFilter) {
        return false;
      }
      if (isAdmin && merchantFilter !== "ALL" && l.merchant_id !== merchantFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const desc = (l.description || "").toLowerCase();
        const mName = (l.merchant_id ? merchantsMap.get(l.merchant_id) || "" : "").toLowerCase();
        if (!desc.includes(q) && !mName.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [ledgersQuery.data, typeFilter, merchantFilter, searchTerm, isAdmin, merchantsMap]);

  // Métricas
  const metrics = useMemo(() => {
    let credits = 0;
    let debits = 0;
    filteredEntries.forEach((l) => {
      if (l.type === "CREDIT" && l.status === "LIQUIDATED") credits += Number(l.amount);
      if ((l.type === "DEBIT" || l.type === "EXPENSE") && l.status === "LIQUIDATED") debits += Number(l.amount);
    });
    return { credits, debits, net: credits - debits };
  }, [filteredEntries]);

  return (
    <AppLayout
      title="Extrato da Conta de Recebíveis"
      subtitle="Histórico cronológico de entradas por vendas POS e saídas por pagamentos liquidados"
    >
      {/* Cards de Métricas */}
      <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-3 mb-6">
        <Card className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between p-5 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total de Entradas (Créditos)
            </CardTitle>
            <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <ArrowDownRight className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-2xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
              +{BRL(metrics.credits)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Vendas conciliadas e creditadas</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between p-5 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total de Saídas (Débitos)
            </CardTitle>
            <div className="size-8 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center">
              <ArrowUpRight className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-2xl font-black font-mono tracking-tight text-rose-600 dark:text-rose-400">
              -{BRL(metrics.debits)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Boletos e transferências pagos</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none shadow-card bg-gradient-to-br from-blue-600 via-cyan-600 to-blue-700 text-white overflow-hidden shadow-lg shadow-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between p-5 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-white/80">
              Saldo Líquido Acumulado
            </CardTitle>
            <div className="size-8 rounded-lg bg-white/20 text-white flex items-center justify-center">
              <Wallet className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-2xl font-black font-mono tracking-tight text-white">
              {BRL(metrics.net)}
            </div>
            <p className="text-xs text-white/80 mt-1">Entradas menos saídas realizadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Busca e Filtros */}
      <Card className="rounded-2xl border border-border/80 shadow-card bg-card mb-6">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por descrição do lançamento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 rounded-xl text-xs bg-background"
            />
          </div>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-44 h-10 rounded-xl text-xs">
              <SelectValue placeholder="Tipo de Operação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas as Operações</SelectItem>
              <SelectItem value="CREDIT">Apenas Entradas (+)</SelectItem>
              <SelectItem value="DEBIT">Apenas Saídas (-)</SelectItem>
            </SelectContent>
          </Select>

          {isAdmin && (
            <Select value={merchantFilter} onValueChange={setMerchantFilter}>
              <SelectTrigger className="w-full sm:w-64 h-10 rounded-xl text-xs">
                <SelectValue placeholder="Estabelecimento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os Estabelecimentos</SelectItem>
                {(merchantsQuery.data || []).map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {/* Tabela de Extrato */}
      <Card className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-bold uppercase py-3.5">Data & Hora</TableHead>
                {isAdmin && <TableHead className="text-xs font-bold uppercase py-3.5">Estabelecimento</TableHead>}
                <TableHead className="text-xs font-bold uppercase py-3.5">Descrição da Operação</TableHead>
                <TableHead className="text-xs font-bold uppercase py-3.5 text-center">Tipo</TableHead>
                <TableHead className="text-xs font-bold uppercase py-3.5 text-right">Valor</TableHead>
                <TableHead className="text-xs font-bold uppercase py-3.5 text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 6 : 5} className="h-44 text-center text-muted-foreground text-xs">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <FileText className="size-8 text-muted-foreground/50" />
                      <p className="font-semibold text-foreground text-sm">Nenhum lançamento no extrato</p>
                      <p className="text-xs text-muted-foreground">
                        Os créditos de vendas e os débitos de pagamentos aparecerão aqui após liquidação.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredEntries.map((l) => {
                  const isCredit = l.type === "CREDIT";

                  return (
                    <TableRow key={l.id} className="hover:bg-muted/30">
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {l.created_at
                          ? new Date(l.created_at).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </TableCell>

                      {isAdmin && (
                        <TableCell className="text-xs font-bold truncate max-w-[180px]">
                          {l.merchant_id ? merchantsMap.get(l.merchant_id) || "EC" : "—"}
                        </TableCell>
                      )}

                      <TableCell className="text-xs font-medium">
                        <div className="text-foreground font-semibold">
                          {l.description || (isCredit ? "Crédito de Vendas POS" : "Pagamento / Transferência")}
                        </div>
                      </TableCell>

                      <TableCell className="text-xs text-center whitespace-nowrap">
                        {isCredit ? (
                          <Badge variant="outline" className="gap-1 text-[10px] border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10">
                            <ArrowDownRight className="size-3" />
                            <span>Entrada</span>
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-[10px] border-rose-500/30 text-rose-700 dark:text-rose-300 bg-rose-500/10">
                            <ArrowUpRight className="size-3" />
                            <span>Saída</span>
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell
                        className={`text-xs font-black font-mono text-right whitespace-nowrap ${
                          isCredit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {isCredit ? "+" : "-"} {BRL(l.amount)}
                      </TableCell>

                      <TableCell className="text-xs text-center whitespace-nowrap">
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                          <CheckCircle2 className="size-3 mr-1" />
                          <span>{l.status === "LIQUIDATED" ? "Liquidado" : l.status}</span>
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </AppLayout>
  );
}
