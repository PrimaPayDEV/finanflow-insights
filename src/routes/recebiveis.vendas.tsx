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
import { CreditCard, Search, DollarSign, Percent, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BRL } from "@/lib/format";

export const Route = createFileRoute("/recebiveis/vendas")({
  head: () => ({
    meta: [{ title: "Vendas POS | Gestor de Recebíveis" }],
  }),
  component: RecebiveisVendas,
});

function RecebiveisVendas() {
  const { user, role, companyName, merchantId } = useAuth();
  const isAdmin = Boolean(
    user?.email?.toLowerCase() === "financeiro@primapay.com.br" ||
    user?.email?.toLowerCase() === "contato@primapay.com.br" ||
    role === "admin" ||
    companyName === "Prima Hub" ||
    companyName === "PrimaPay"
  ) && role !== "merchant";

  const [searchTerm, setSearchTerm] = useState("");
  const [merchantFilter, setMerchantFilter] = useState("ALL");

  // Busca ECs (se Admin)
  const merchantsQuery = useQuery({
    queryKey: ["merchants_vendas_list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("merchants").select("id, name, document").order("name");
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

  // Busca Transações de Recebíveis
  const transactionsQuery = useQuery({
    queryKey: ["receivables_transactions", isAdmin ? "all" : merchantId],
    queryFn: async () => {
      let q = supabase
        .from("receivables_transactions")
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

  const filteredTransactions = useMemo(() => {
    const list = transactionsQuery.data || [];
    return list.filter((tx) => {
      if (isAdmin && merchantFilter !== "ALL" && tx.merchant_id !== merchantFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const nsu = (tx.nsu || "").toLowerCase();
        const acquirer = (tx.acquirer || "").toLowerCase();
        const externalId = (tx.external_id || "").toLowerCase();
        const mName = (tx.merchant_id ? merchantsMap.get(tx.merchant_id) || "" : "").toLowerCase();

        if (!nsu.includes(q) && !acquirer.includes(q) && !externalId.includes(q) && !mName.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [transactionsQuery.data, merchantFilter, searchTerm, isAdmin, merchantsMap]);

  // Métricas
  const metrics = useMemo(() => {
    let gross = 0;
    let net = 0;
    filteredTransactions.forEach((tx) => {
      gross += Number(tx.gross_value || 0);
      net += Number(tx.credited_value || tx.net_value || 0);
    });
    return { gross, net, fee: Math.max(0, gross - net) };
  }, [filteredTransactions]);

  return (
    <AppLayout
      title="Vendas das Maquininhas POS"
      subtitle="Acompanhe as transações importadas, valores brutos, taxas e valores líquidos creditados"
    >
      {/* Cards de Métricas */}
      <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-3 mb-6">
        <Card className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between p-5 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Bruto Transacionado
            </CardTitle>
            <div className="size-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <TrendingUp className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-2xl font-black font-mono tracking-tight text-foreground">
              {BRL(metrics.gross)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Valor passado nas maquininhas</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between p-5 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Taxa Operacional Aplicada
            </CardTitle>
            <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Percent className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-2xl font-black font-mono tracking-tight text-amber-600">
              {BRL(metrics.fee)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Desconto das taxas acordadas</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none shadow-card bg-gradient-to-br from-blue-600 via-cyan-600 to-blue-700 text-white overflow-hidden shadow-lg shadow-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between p-5 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-white/80">
              Total Líquido Creditado
            </CardTitle>
            <div className="size-8 rounded-lg bg-white/20 text-white flex items-center justify-center">
              <DollarSign className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-2xl font-black font-mono tracking-tight text-white">
              {BRL(metrics.net)}
            </div>
            <p className="text-xs text-white/80 mt-1">Lançado no saldo disponível do EC</p>
          </CardContent>
        </Card>
      </div>

      {/* Busca e Filtros */}
      <Card className="rounded-2xl border border-border/80 shadow-card bg-card mb-6">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por NSU, adquirente, código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 rounded-xl text-xs bg-background"
            />
          </div>

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

      {/* Tabela de Vendas */}
      <Card className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-bold uppercase py-3.5">Data</TableHead>
                {isAdmin && <TableHead className="text-xs font-bold uppercase py-3.5">Estabelecimento</TableHead>}
                <TableHead className="text-xs font-bold uppercase py-3.5">Adquirente</TableHead>
                <TableHead className="text-xs font-bold uppercase py-3.5">NSU</TableHead>
                <TableHead className="text-xs font-bold uppercase py-3.5 text-right">Valor Bruto</TableHead>
                <TableHead className="text-xs font-bold uppercase py-3.5 text-right">Taxa</TableHead>
                <TableHead className="text-xs font-bold uppercase py-3.5 text-right">Valor Líquido</TableHead>
                <TableHead className="text-xs font-bold uppercase py-3.5 text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 8 : 7} className="h-44 text-center text-muted-foreground text-xs">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <CreditCard className="size-8 text-muted-foreground/50" />
                      <p className="font-semibold text-foreground text-sm">Nenhuma venda importada</p>
                      <p className="text-xs text-muted-foreground">
                        {isAdmin
                          ? "Faça upload de uma planilha de POS em 'Importar Vendas POS' para carregar as transações."
                          : "As vendas da sua maquininha aparecerão aqui após conciliação pela Prima."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((tx) => (
                  <TableRow key={tx.id} className="hover:bg-muted/30">
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {tx.created_at
                        ? new Date(tx.created_at).toLocaleDateString("pt-BR", {
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
                        {tx.merchant_id ? merchantsMap.get(tx.merchant_id) || "EC" : "—"}
                      </TableCell>
                    )}

                    <TableCell className="text-xs font-medium">
                      {tx.acquirer || "POS"}
                    </TableCell>

                    <TableCell className="text-xs font-mono">{tx.nsu || "—"}</TableCell>

                    <TableCell className="text-xs font-mono text-right text-foreground">
                      {BRL(tx.gross_value || 0)}
                    </TableCell>

                    <TableCell className="text-xs font-mono text-right text-amber-600">
                      {tx.applied_fee_percent ? `${tx.applied_fee_percent}%` : "0%"}
                    </TableCell>

                    <TableCell className="text-xs font-black font-mono text-right text-emerald-600 dark:text-emerald-400">
                      {BRL(tx.credited_value || tx.net_value || 0)}
                    </TableCell>

                    <TableCell className="text-xs text-center">
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                        {tx.status || "Creditado"}
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
