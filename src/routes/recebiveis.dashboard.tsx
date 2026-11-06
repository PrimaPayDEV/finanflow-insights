import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DollarSign,
  Wallet,
  Lock,
  ArrowUpRight,
  Receipt,
  Store,
  Upload,
  CheckCircle2,
  Clock,
  Plus,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  Smartphone,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BRL } from "@/lib/format";
import { toast } from "sonner";
import { translateError } from "@/lib/translateError";

export const Route = createFileRoute("/recebiveis/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard | Gestor de Recebíveis" }],
  }),
  component: RecebiveisDashboard,
});

function RecebiveisDashboard() {
  const { user, role, companyId, companyName, merchantId } = useAuth();
  const qc = useQueryClient();

  const isAdmin = Boolean(
    user?.email?.toLowerCase() === "financeiro@primapay.com.br" ||
    user?.email?.toLowerCase() === "contato@primapay.com.br" ||
    role === "admin" ||
    companyName === "Prima Hub" ||
    companyName === "PrimaPay"
  ) && role !== "merchant";

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [payConfirmOpen, setPayConfirmOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);

  // 1. Busca lista de ECs (para Admin)
  const merchantsQuery = useQuery({
    queryKey: ["merchants_recebiveis_dash"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("merchants")
        .select("id, name, document_cnpj, status")
        .eq("in_recebiveis", true)
        .order("name", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  // 2. Busca Ledgers
  const ledgersQuery = useQuery({
    queryKey: ["receivables_ledgers_dash", isAdmin ? "all" : merchantId],
    queryFn: async () => {
      let q = supabase.from("receivables_ledgers").select("*").order("created_at", { ascending: false });
      if (!isAdmin && merchantId) {
        q = q.eq("merchant_id", merchantId);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  // 3. Busca Solicitações
  const requestsQuery = useQuery({
    queryKey: ["receivables_requests_dash", isAdmin ? "all" : merchantId],
    queryFn: async () => {
      let q = supabase.from("receivables_requests").select("*").order("created_at", { ascending: false });
      if (!isAdmin && merchantId) {
        q = q.eq("merchant_id", merchantId);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const merchantsMap = useMemo(() => {
    const map = new Map<string, { name: string; document: string }>();
    (merchantsQuery.data || []).forEach((m) => {
      map.set(m.id, { name: m.name, document: m.document_cnpj || "" });
    });
    return map;
  }, [merchantsQuery.data]);

  // Cálculos de saldo do EC
  const ecBalance = useMemo(() => {
    if (isAdmin) return { available: 0, pending: 0, totalCredits: 0, totalDebits: 0 };
    const ledgers = ledgersQuery.data || [];
    const requests = requestsQuery.data || [];

    let credits = 0;
    let debits = 0;
    ledgers.forEach((l) => {
      if (l.type === "CREDIT" && l.status === "LIQUIDATED") credits += Number(l.amount);
      if ((l.type === "DEBIT" || l.type === "EXPENSE") && l.status === "LIQUIDATED") debits += Number(l.amount);
    });

    let pending = 0;
    requests.forEach((r) => {
      if (r.status === "PENDING" || r.status === "REQUESTED") {
        pending += Number(r.amount);
      }
    });

    const net = credits - debits;
    const available = Math.max(0, net - pending);

    return { available, pending, totalCredits: credits, totalDebits: debits };
  }, [isAdmin, ledgersQuery.data, requestsQuery.data]);

  // Cálculos para Admin
  const adminMetrics = useMemo(() => {
    if (!isAdmin) return { totalAvailable: 0, totalPending: 0, countPending: 0, totalPaid: 0 };
    const ledgers = ledgersQuery.data || [];
    const requests = requestsQuery.data || [];

    let credits = 0;
    let debits = 0;
    ledgers.forEach((l) => {
      if (l.type === "CREDIT" && l.status === "LIQUIDATED") credits += Number(l.amount);
      if ((l.type === "DEBIT" || l.type === "EXPENSE") && l.status === "LIQUIDATED") debits += Number(l.amount);
    });

    let totalPending = 0;
    let countPending = 0;
    let totalPaid = 0;

    requests.forEach((r) => {
      if (r.status === "PENDING" || r.status === "REQUESTED") {
        totalPending += Number(r.amount);
        countPending++;
      } else if (r.status === "PAID") {
        totalPaid += Number(r.amount);
      }
    });

    const totalAvailable = Math.max(0, credits - debits - totalPending);

    return { totalAvailable, totalPending, countPending, totalPaid };
  }, [isAdmin, ledgersQuery.data, requestsQuery.data]);

  // Ação de Marcar como Pago (Admin)
  const markAsPaidMutation = useMutation({
    mutationFn: async (request: any) => {
      if (!user) throw new Error("Usuário não autenticado.");
      const now = new Date().toISOString();

      // 1. Inserir débito no Ledger para abater o saldo do EC
      const { data: ledgerEntry, error: ledgerError } = await supabase
        .from("receivables_ledgers")
        .insert({
          company_id: request.company_id,
          merchant_id: request.merchant_id,
          type: "DEBIT",
          amount: request.amount,
          status: "LIQUIDATED",
          description: `Pagamento ${request.type}: ${request.favored_name || ""} - ${
            request.barcode ? "Boleto " + request.barcode.slice(0, 15) + "..." : request.pix_key || request.description || ""
          }`,
          liquidated_at: now,
          liquidated_by: user.id,
        })
        .select("id")
        .single();

      if (ledgerError) throw new Error("Erro ao lançar débito no extrato: " + ledgerError.message);

      // 2. Atualizar o status da solicitação para PAID
      const { error: reqError } = await supabase
        .from("receivables_requests")
        .update({
          status: "PAID",
          ledger_id: ledgerEntry?.id || null,
          liquidated_at: now,
          liquidated_by: user.id,
        })
        .eq("id", request.id);

      if (reqError) throw new Error("Erro ao atualizar status da solicitação: " + reqError.message);
    },
    onSuccess: () => {
      toast.success("Solicitação marcada como PAGA! O valor foi deduzido do saldo do EC.");
      setPayConfirmOpen(false);
      setSelectedRequest(null);
      qc.invalidateQueries({ queryKey: ["receivables_requests_dash"] });
      qc.invalidateQueries({ queryKey: ["receivables_ledgers_dash"] });
    },
    onError: (err: any) => {
      toast.error(translateError(err.message));
    },
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Código copiado!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const pendingRequests = useMemo(() => {
    const list = requestsQuery.data || [];
    return list.filter((r) => r.status === "PENDING" || r.status === "REQUESTED").slice(0, 6);
  }, [requestsQuery.data]);

  const recentMovements = useMemo(() => {
    return (ledgersQuery.data || []).slice(0, 6);
  }, [ledgersQuery.data]);

  return (
    <AppLayout
      title="Gestor de Recebíveis"
      subtitle={
        isAdmin
          ? "Visão executiva das vendas POS provisórias, saldos dos ECs e liquidação de pagamentos"
          : "Acompanhe suas vendas com maquininha provisória, saldo disponível e pagamentos de boletos"
      }
      actions={
        isAdmin ? (
          <div className="flex items-center gap-2">
            <Button
              asChild
              className="rounded-xl font-bold text-xs gap-1.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-md shadow-blue-500/20"
            >
              <Link to="/admin/recebiveis/import">
                <Upload className="size-3.5" />
                <span>Importar Planilha POS</span>
              </Link>
            </Button>
            <Button
              variant="outline"
              asChild
              className="rounded-xl font-semibold text-xs gap-1.5 border-border/80"
            >
              <Link to="/recebiveis/ecs">
                <Store className="size-3.5" />
                <span>Carteira de ECs</span>
              </Link>
            </Button>
          </div>
        ) : (
          <Button
            asChild
            className="rounded-xl font-bold text-xs gap-1.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-md shadow-blue-500/20"
          >
            <Link to="/recebiveis/solicitacoes">
              <Plus className="size-4" />
              <span>Solicitar Pagamento de Boleto</span>
            </Link>
          </Button>
        )
      }
    >
      {/* Cards de Métricas no Topo */}
      <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {!isAdmin ? (
          <>
            <Card className="rounded-2xl border-none shadow-card bg-gradient-to-br from-blue-600 via-cyan-600 to-blue-700 text-white overflow-hidden shadow-lg shadow-blue-500/20">
              <CardHeader className="flex flex-row items-center justify-between p-5 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-white/80">
                  Saldo Disponível
                </CardTitle>
                <div className="size-8 rounded-lg bg-white/20 text-white flex items-center justify-center">
                  <DollarSign className="size-4" />
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
                  {BRL(ecBalance.available)}
                </div>
                <p className="text-xs text-white/80 mt-1">Liberado para pagar boletos ou transferências</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between p-5 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Saldo Comprometido
                </CardTitle>
                <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Lock className="size-4" />
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-amber-600">
                  {BRL(ecBalance.pending)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Solicitações de pagamento em análise</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between p-5 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Total de Vendas POS
                </CardTitle>
                <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Wallet className="size-4" />
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-foreground">
                  {BRL(ecBalance.totalCredits)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Créditos recebidos das suas maquininhas</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between p-5 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Boletos e Débitos Pagos
                </CardTitle>
                <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="size-4" />
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-emerald-600">
                  {BRL(ecBalance.totalDebits)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Pagamentos liquidados com sucesso</p>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card className="rounded-2xl border-none shadow-card bg-gradient-to-br from-blue-600 via-cyan-600 to-blue-700 text-white overflow-hidden shadow-lg shadow-blue-500/20">
              <CardHeader className="flex flex-row items-center justify-between p-5 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-white/80">
                  Saldo Total dos ECs
                </CardTitle>
                <div className="size-8 rounded-lg bg-white/20 text-white flex items-center justify-center">
                  <DollarSign className="size-4" />
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
                  {BRL(adminMetrics.totalAvailable)}
                </div>
                <p className="text-xs text-white/80 mt-1">Soma de saldos livres dos estabelecimentos</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-amber-500/30 shadow-card bg-card overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between p-5 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-amber-600">
                  A Pagar ({adminMetrics.countPending})
                </CardTitle>
                <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Clock className="size-4" />
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-amber-600">
                  {BRL(adminMetrics.totalPending)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Boletos e PIX aguardando pagamento</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between p-5 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Total Já Liquidado
                </CardTitle>
                <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="size-4" />
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-emerald-600">
                  {BRL(adminMetrics.totalPaid)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Pagamentos já realizados e debitados</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between p-5 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  ECs Cadastrados
                </CardTitle>
                <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Store className="size-4" />
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-foreground">
                  {(merchantsQuery.data || []).length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Estabelecimentos em operação provisória</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Grid Principal: Solicitações Pendentes e Últimas Movimentações */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Coluna 1 & 2: Solicitações Recentes */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <Clock className="size-4 text-blue-600" />
              <span>Solicitações de Pagamento Recentes</span>
            </h3>
            <Button variant="ghost" size="sm" asChild className="text-xs font-semibold text-blue-600 hover:text-blue-500">
              <Link to="/recebiveis/solicitacoes">
                <span>Ver Todas</span>
                <ChevronRight className="size-3.5 ml-1" />
              </Link>
            </Button>
          </div>

          <Card className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    {isAdmin && <TableHead className="text-xs font-bold uppercase py-3">EC</TableHead>}
                    <TableHead className="text-xs font-bold uppercase py-3">Favorecido / Tipo</TableHead>
                    <TableHead className="text-xs font-bold uppercase py-3">Código / Linha</TableHead>
                    <TableHead className="text-xs font-bold uppercase py-3 text-right">Valor</TableHead>
                    <TableHead className="text-xs font-bold uppercase py-3 text-center">Status</TableHead>
                    {isAdmin && <TableHead className="text-xs font-bold uppercase py-3 text-right">Ação</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 6 : 5} className="h-36 text-center text-xs text-muted-foreground">
                        Nenhuma solicitação pendente no momento.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendingRequests.map((req) => {
                      const mInfo = merchantsMap.get(req.merchant_id);
                      const isPending = req.status === "PENDING" || req.status === "REQUESTED";
                      const paymentCode = req.barcode || req.pix_key || "—";

                      return (
                        <TableRow key={req.id} className="hover:bg-muted/30">
                          {isAdmin && (
                            <TableCell className="text-xs font-bold truncate max-w-[140px]">
                              {mInfo?.name || "EC"}
                            </TableCell>
                          )}
                          <TableCell className="text-xs">
                            <div className="font-semibold text-foreground truncate max-w-[150px]">
                              {req.favored_name || "—"}
                            </div>
                            <span className="text-[10px] text-muted-foreground uppercase">{req.type}</span>
                          </TableCell>
                          <TableCell className="text-xs font-mono max-w-[160px]">
                            <div className="flex items-center gap-1">
                              <span className="truncate text-[11px]">{paymentCode}</span>
                              {(req.barcode || req.pix_key) && (
                                <button
                                  type="button"
                                  onClick={() => handleCopy(req.barcode || req.pix_key!, req.id)}
                                  className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                                  title="Copiar código"
                                >
                                  {copiedId === req.id ? (
                                    <Check className="size-3 text-emerald-500" />
                                  ) : (
                                    <Copy className="size-3" />
                                  )}
                                </button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-bold font-mono text-right whitespace-nowrap">
                            {BRL(req.amount)}
                          </TableCell>
                          <TableCell className="text-xs text-center">
                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px]">
                              Pendente
                            </Badge>
                          </TableCell>
                          {isAdmin && (
                            <TableCell className="text-xs text-right whitespace-nowrap">
                              <Button
                                size="sm"
                                className="h-7 px-2.5 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
                                onClick={() => {
                                  setSelectedRequest(req);
                                  setPayConfirmOpen(true);
                                }}
                              >
                                Pagar
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>

        {/* Coluna 3: Extrato / Movimentações Recentes */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <Receipt className="size-4 text-emerald-600" />
              <span>Extrato Recente</span>
            </h3>
            <Button variant="ghost" size="sm" asChild className="text-xs font-semibold text-blue-600 hover:text-blue-500">
              <Link to="/recebiveis/extrato">
                <span>Ver Tudo</span>
                <ChevronRight className="size-3.5 ml-1" />
              </Link>
            </Button>
          </div>

          <Card className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden">
            <div className="p-3 divide-y divide-border/60">
              {recentMovements.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  Nenhuma movimentação registrada no extrato.
                </div>
              ) : (
                recentMovements.map((mov) => {
                  const isCredit = mov.type === "CREDIT";
                  return (
                    <div key={mov.id} className="py-2.5 px-2 flex items-center justify-between text-xs">
                      <div className="space-y-0.5 max-w-[180px]">
                        <p className="font-semibold text-foreground truncate">{mov.description || (isCredit ? "Venda Cartão POS" : "Pagamento / Débito")}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {mov.created_at ? new Date(mov.created_at).toLocaleDateString("pt-BR") : "—"}
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`font-black font-mono ${
                            isCredit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {isCredit ? "+" : "-"} {BRL(mov.amount)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Modal de Confirmação de Pagamento */}
      <Dialog open={payConfirmOpen} onOpenChange={setPayConfirmOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-600" />
              <span>Marcar Pagamento como Realizado</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Confirmar que o pagamento deste boleto/PIX foi executado. O valor será deduzido do saldo do EC.
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Favorecido:</span>
                <span className="font-bold text-foreground">{selectedRequest.favored_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tipo:</span>
                <span className="font-bold">{selectedRequest.type}</span>
              </div>
              <div className="pt-2 border-t border-border flex justify-between items-center text-sm font-black font-mono">
                <span>Valor a Deduzir:</span>
                <span className="text-emerald-600">{BRL(selectedRequest.amount)}</span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPayConfirmOpen(false)}
              className="rounded-xl text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => markAsPaidMutation.mutate(selectedRequest)}
              disabled={markAsPaidMutation.isPending}
              className="rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-md"
            >
              {markAsPaidMutation.isPending ? "Processando..." : "Confirmar e Deduzir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
