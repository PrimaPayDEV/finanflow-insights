import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Receipt,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  Check,
  Search,
  Filter,
  Wallet,
  ArrowUpRight,
  Barcode,
  QrCode,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BRL } from "@/lib/format";
import { toast } from "sonner";
import { translateError } from "@/lib/translateError";

export const Route = createFileRoute("/recebiveis/solicitacoes")({
  head: () => ({
    meta: [{ title: "Solicitações de Pagamento | Gestor de Recebíveis" }],
  }),
  component: RecebiveisSolicitacoesPage,
});

function RecebiveisSolicitacoesPage() {
  const { user, role, companyId, companyName, merchantId } = useAuth();
  const qc = useQueryClient();

  const isAdmin = Boolean(
    user?.email?.toLowerCase() === "financeiro@primapay.com.br" ||
    user?.email?.toLowerCase() === "contato@primapay.com.br" ||
    role === "admin" ||
    companyName === "Prima Hub" ||
    companyName === "PrimaPay"
  ) && role !== "merchant";

  // Estados de filtros
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [merchantFilter, setMerchantFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Estados dos modais
  const [newRequestOpen, setNewRequestOpen] = useState(false);
  const [payConfirmOpen, setPayConfirmOpen] = useState(false);
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);

  // Form de nova solicitação (para o EC)
  const [requestType, setRequestType] = useState<"BOLETO" | "PIX">("BOLETO");
  const [amountStr, setAmountStr] = useState("");
  const [barcode, setBarcode] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [pixKeyType, setPixKeyType] = useState("CPF_CNPJ");
  const [favoredName, setFavoredName] = useState("");
  const [favoredDocument, setFavoredDocument] = useState("");
  const [dueDate, setDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");

  // 1. Busca lista de ECs (para o Admin)
  const merchantsQuery = useQuery({
    queryKey: ["merchants_recebiveis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("merchants")
        .select("id, name, document_cnpj, phone_whatsapp, email, status")
        .eq("in_recebiveis", true)
        .order("name", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  // 2. Busca lançamentos do Ledger para cálculo de saldo (por EC ou todos)
  const ledgersQuery = useQuery({
    queryKey: ["receivables_ledgers", isAdmin ? "all" : merchantId],
    queryFn: async () => {
      let query = supabase.from("receivables_ledgers").select("*");
      if (!isAdmin && merchantId) {
        query = query.eq("merchant_id", merchantId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // 3. Busca solicitações de pagamento
  const requestsQuery = useQuery({
    queryKey: ["receivables_requests", isAdmin ? "all" : merchantId],
    queryFn: async () => {
      let query = supabase
        .from("receivables_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (!isAdmin && merchantId) {
        query = query.eq("merchant_id", merchantId);
      }
      const { data, error } = await query;
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

  // Cálculos de saldo do EC atual
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

  // Cálculos consolidados para Admin
  const adminMetrics = useMemo(() => {
    if (!isAdmin) return { totalPending: 0, countPending: 0, totalPaid: 0, countPaid: 0 };
    const requests = requestsQuery.data || [];
    let totalPending = 0;
    let countPending = 0;
    let totalPaid = 0;
    let countPaid = 0;

    requests.forEach((r) => {
      if (r.status === "PENDING" || r.status === "REQUESTED") {
        totalPending += Number(r.amount);
        countPending++;
      } else if (r.status === "PAID") {
        totalPaid += Number(r.amount);
        countPaid++;
      }
    });

    return { totalPending, countPending, totalPaid, countPaid };
  }, [isAdmin, requestsQuery.data]);

  // Filtragem da lista
  const filteredRequests = useMemo(() => {
    const list = requestsQuery.data || [];
    return list.filter((r) => {
      // Filtro de status
      if (statusFilter !== "ALL") {
        if (statusFilter === "PENDING" && r.status !== "PENDING" && r.status !== "REQUESTED") return false;
        if (statusFilter === "PAID" && r.status !== "PAID") return false;
        if (statusFilter === "REJECTED" && r.status !== "REJECTED") return false;
      }
      // Filtro de EC (apenas admin)
      if (isAdmin && merchantFilter !== "ALL" && r.merchant_id !== merchantFilter) {
        return false;
      }
      // Filtro de texto
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const mInfo = merchantsMap.get(r.merchant_id);
        const mName = mInfo?.name.toLowerCase() || "";
        const mDoc = mInfo?.document.toLowerCase() || "";
        const favored = (r.favored_name || "").toLowerCase();
        const favoredDoc = (r.favored_document || "").toLowerCase();
        const code = (r.barcode || r.pix_key || "").toLowerCase();
        const desc = (r.description || "").toLowerCase();

        if (
          !mName.includes(q) &&
          !mDoc.includes(q) &&
          !favored.includes(q) &&
          !favoredDoc.includes(q) &&
          !code.includes(q) &&
          !desc.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [requestsQuery.data, statusFilter, merchantFilter, searchTerm, isAdmin, merchantsMap]);

  // Ação de Criar Solicitação (EC)
  const createRequestMutation = useMutation({
    mutationFn: async () => {
      if (!merchantId) throw new Error("EC não identificado.");
      const numericAmount = Number(amountStr.replace(/[^0-9,-]/g, "").replace(",", "."));
      if (!numericAmount || numericAmount <= 0) throw new Error("Informe um valor válido.");
      if (numericAmount > ecBalance.available) {
        throw new Error(`Saldo disponível insuficiente. Seu saldo livre é ${BRL(ecBalance.available)}.`);
      }

      if (requestType === "BOLETO") {
        if (!barcode.trim()) throw new Error("Código de barras / Linha digitável é obrigatório.");
      } else {
        if (!pixKey.trim()) throw new Error("Chave PIX é obrigatória.");
      }

      if (!favoredName.trim()) throw new Error("Nome do favorecido é obrigatório.");

      const payload = {
        company_id: companyId || "00000000-0000-0000-0000-000000000000",
        merchant_id: merchantId,
        type: requestType,
        amount: numericAmount,
        status: "PENDING",
        barcode: requestType === "BOLETO" ? barcode.trim() : null,
        pix_key: requestType === "PIX" ? pixKey.trim() : null,
        favored_name: favoredName.trim(),
        favored_document: favoredDocument.trim() || null,
        due_date: dueDate || null,
        description: description.trim() || null,
        created_by: user?.id,
      };

      const { error } = await supabase.from("receivables_requests").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Solicitação de pagamento enviada com sucesso!");
      setNewRequestOpen(false);
      setAmountStr("");
      setBarcode("");
      setPixKey("");
      setFavoredName("");
      setFavoredDocument("");
      setDescription("");
      qc.invalidateQueries({ queryKey: ["receivables_requests"] });
    },
    onError: (err: any) => {
      toast.error(translateError(err.message));
    },
  });

  // Ação de Marcar como Pago (Admin)
  const markAsPaidMutation = useMutation({
    mutationFn: async (request: any) => {
      if (!user) throw new Error("Usuário não autenticado.");

      const now = new Date().toISOString();

      // 1. Inserir débito no Ledger para abater o saldo do EC
      const ledgerPayload = {
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
      };

      const { data: ledgerEntry, error: ledgerError } = await supabase
        .from("receivables_ledgers")
        .insert(ledgerPayload)
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
      qc.invalidateQueries({ queryKey: ["receivables_requests"] });
      qc.invalidateQueries({ queryKey: ["receivables_ledgers"] });
    },
    onError: (err: any) => {
      toast.error(translateError(err.message));
    },
  });

  // Ação de Rejeitar Solicitação (Admin)
  const rejectRequestMutation = useMutation({
    mutationFn: async (request: any) => {
      const { error } = await supabase
        .from("receivables_requests")
        .update({
          status: "REJECTED",
          liquidated_at: new Date().toISOString(),
          liquidated_by: user?.id,
        })
        .eq("id", request.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Solicitação rejeitada.");
      setRejectConfirmOpen(false);
      setSelectedRequest(null);
      qc.invalidateQueries({ queryKey: ["receivables_requests"] });
    },
    onError: (err: any) => {
      toast.error(translateError(err.message));
    },
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copiado para a área de transferência!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <AppLayout
      title="Solicitações de Pagamento"
      subtitle={
        isAdmin
          ? "Gerencie as ordens de pagamento, boletos e transferências solicitadas pelos estabelecimentos"
          : "Solicite liquidação de boletos e repasses com base no seu saldo disponível"
      }
      actions={
        !isAdmin && (
          <Button
            onClick={() => setNewRequestOpen(true)}
            className="rounded-xl font-bold text-xs gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-md shadow-blue-500/20"
          >
            <Plus className="size-4" />
            <span>Nova Solicitação de Pagamento</span>
          </Button>
        )
      }
    >
      {/* Cards de Métricas */}
      <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-6">
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
                <p className="text-xs text-white/80 mt-1">Livre para pagamento de boletos e resgates</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between p-5 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Em Processamento / Pendente
                </CardTitle>
                <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Clock className="size-4" />
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-amber-600">
                  {BRL(ecBalance.pending)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Solicitações aguardando quitação pela Prima</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between p-5 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Total Pago / Liquidado
                </CardTitle>
                <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="size-4" />
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-emerald-600">
                  {BRL(ecBalance.totalDebits)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Total de contas e boletos já liquidados</p>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card className="rounded-2xl border border-amber-500/30 shadow-card bg-card overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between p-5 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-amber-600">
                  Aguardando Pagamento ({adminMetrics.countPending})
                </CardTitle>
                <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Clock className="size-4" />
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-amber-600">
                  {BRL(adminMetrics.totalPending)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Solicitações pendentes de quitação</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between p-5 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Total Liquidado ({adminMetrics.countPaid})
                </CardTitle>
                <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="size-4" />
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-emerald-600">
                  {BRL(adminMetrics.totalPaid)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Valores pagos e debitados dos ECs</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between p-5 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Total de Solicitações
                </CardTitle>
                <div className="size-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <Receipt className="size-4" />
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-foreground">
                  {(requestsQuery.data || []).length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Volume histórico de ordens abertas</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Barra de Filtros e Busca */}
      <Card className="rounded-2xl border border-border/80 shadow-card bg-card mb-6">
        <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por favorecido, código de barras, CNPJ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10 rounded-xl text-xs bg-background"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-44 h-10 rounded-xl text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os Status</SelectItem>
                <SelectItem value="PENDING">Pendentes</SelectItem>
                <SelectItem value="PAID">Pagos</SelectItem>
                <SelectItem value="REJECTED">Rejeitados</SelectItem>
              </SelectContent>
            </Select>

            {isAdmin && (
              <Select value={merchantFilter} onValueChange={setMerchantFilter}>
                <SelectTrigger className="w-full sm:w-56 h-10 rounded-xl text-xs">
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
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Solicitações */}
      <Card className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-bold uppercase tracking-wider py-3.5">Data</TableHead>
                {isAdmin && (
                  <TableHead className="text-xs font-bold uppercase tracking-wider py-3.5">
                    Estabelecimento
                  </TableHead>
                )}
                <TableHead className="text-xs font-bold uppercase tracking-wider py-3.5">Tipo</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider py-3.5">Favorecido</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider py-3.5">
                  Dados de Pagamento
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider py-3.5">Vencimento</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider py-3.5 text-right">Valor</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider py-3.5 text-center">Status</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider py-3.5 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isAdmin ? 9 : 8}
                    className="h-44 text-center text-muted-foreground text-xs"
                  >
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Receipt className="size-8 text-muted-foreground/50" />
                      <p className="font-semibold text-foreground text-sm">Nenhuma solicitação encontrada</p>
                      <p className="text-xs text-muted-foreground">
                        {isAdmin
                          ? "Quando os ECs abrirem solicitações de pagamento, elas aparecerão aqui."
                          : "Clique em 'Nova Solicitação de Pagamento' para lançar um boleto ou PIX."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((req) => {
                  const isPending = req.status === "PENDING" || req.status === "REQUESTED";
                  const isPaid = req.status === "PAID";
                  const isRejected = req.status === "REJECTED";
                  const mInfo = merchantsMap.get(req.merchant_id);

                  const paymentDetail = req.barcode || req.pix_key || req.description || "—";

                  return (
                    <TableRow key={req.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {req.created_at
                          ? new Date(req.created_at).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </TableCell>

                      {isAdmin && (
                        <TableCell className="text-xs font-medium">
                          <div className="font-bold text-foreground truncate max-w-[180px]">
                            {mInfo?.name || "EC Não Identificado"}
                          </div>
                          {mInfo?.document && (
                            <div className="text-[10px] text-muted-foreground font-mono">{mInfo.document}</div>
                          )}
                        </TableCell>
                      )}

                      <TableCell className="text-xs whitespace-nowrap">
                        {req.type === "BOLETO" ? (
                          <Badge variant="outline" className="gap-1 text-[10px] border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/10">
                            <Barcode className="size-3" />
                            <span>Boleto</span>
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-[10px] border-cyan-500/30 text-cyan-700 dark:text-cyan-300 bg-cyan-500/10">
                            <QrCode className="size-3" />
                            <span>PIX</span>
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-xs">
                        <div className="font-semibold text-foreground truncate max-w-[180px]">
                          {req.favored_name || "—"}
                        </div>
                        {req.favored_document && (
                          <div className="text-[10px] text-muted-foreground font-mono">{req.favored_document}</div>
                        )}
                      </TableCell>

                      <TableCell className="text-xs font-mono max-w-[220px]">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[11px]" title={paymentDetail}>
                            {paymentDetail}
                          </span>
                          {(req.barcode || req.pix_key) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-6 shrink-0 rounded-md hover:bg-muted"
                              onClick={() => handleCopy(req.barcode || req.pix_key!, req.id)}
                              title="Copiar código para pagamento"
                            >
                              {copiedId === req.id ? (
                                <Check className="size-3 text-emerald-500" />
                              ) : (
                                <Copy className="size-3 text-muted-foreground" />
                              )}
                            </Button>
                          )}
                        </div>
                        {req.description && (
                          <p className="text-[10px] text-muted-foreground font-sans truncate">{req.description}</p>
                        )}
                      </TableCell>

                      <TableCell className="text-xs whitespace-nowrap">
                        {req.due_date ? new Date(req.due_date + "T00:00:00").toLocaleDateString("pt-BR") : "—"}
                      </TableCell>

                      <TableCell className="text-xs font-black font-mono text-right whitespace-nowrap text-foreground">
                        {BRL(req.amount)}
                      </TableCell>

                      <TableCell className="text-xs text-center whitespace-nowrap">
                        {isPending && (
                          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1 font-bold text-[10px]">
                            <Clock className="size-3" />
                            <span>Pendente</span>
                          </Badge>
                        )}
                        {isPaid && (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1 font-bold text-[10px]">
                            <CheckCircle2 className="size-3" />
                            <span>Pago</span>
                          </Badge>
                        )}
                        {isRejected && (
                          <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 gap-1 font-bold text-[10px]">
                            <XCircle className="size-3" />
                            <span>Rejeitado</span>
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-xs text-right whitespace-nowrap">
                        {isAdmin && isPending ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              className="h-8 rounded-xl font-bold text-xs gap-1 bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs"
                              onClick={() => {
                                setSelectedRequest(req);
                                setPayConfirmOpen(true);
                              }}
                            >
                              <CheckCircle2 className="size-3.5" />
                              <span>Marcar como Pago</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 rounded-xl font-semibold text-xs border-rose-500/30 text-rose-600 hover:bg-rose-500/10"
                              onClick={() => {
                                setSelectedRequest(req);
                                setRejectConfirmOpen(true);
                              }}
                            >
                              Rejeitar
                            </Button>
                          </div>
                        ) : isPaid ? (
                          <span className="text-[11px] text-muted-foreground font-medium">
                            Liquidado em{" "}
                            {req.liquidated_at ? new Date(req.liquidated_at).toLocaleDateString("pt-BR") : "—"}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Modal 1: Nova Solicitação (Para o EC) */}
      <Dialog open={newRequestOpen} onOpenChange={setNewRequestOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Receipt className="size-5 text-blue-600" />
              <span>Solicitar Pagamento de Conta / Boleto</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Informe os dados da cobrança. O valor será liquidado pela Prima e debitado do seu saldo.
            </DialogDescription>
          </DialogHeader>

          {/* Card de Aviso de Saldo */}
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Seu Saldo Disponível para Resgate:</span>
            <span className="font-black font-mono text-blue-700 dark:text-blue-300 text-sm">
              {BRL(ecBalance.available)}
            </span>
          </div>

          <div className="space-y-4 py-2 text-xs">
            {/* Tipo de Pagamento */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tipo de Pagamento</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={requestType === "BOLETO" ? "default" : "outline"}
                  className="rounded-xl h-10 text-xs font-bold gap-2"
                  onClick={() => setRequestType("BOLETO")}
                >
                  <Barcode className="size-4" />
                  <span>Boleto Bancário</span>
                </Button>
                <Button
                  type="button"
                  variant={requestType === "PIX" ? "default" : "outline"}
                  className="rounded-xl h-10 text-xs font-bold gap-2"
                  onClick={() => setRequestType("PIX")}
                >
                  <QrCode className="size-4" />
                  <span>Chave PIX</span>
                </Button>
              </div>
            </div>

            {/* Campos Específicos */}
            {requestType === "BOLETO" ? (
              <div className="space-y-1.5">
                <Label htmlFor="barcode" className="text-xs font-semibold">
                  Código de Barras / Linha Digitável *
                </Label>
                <Input
                  id="barcode"
                  placeholder="Cole aqui a linha digitável do boleto..."
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="h-10 rounded-xl font-mono text-xs"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="pixKey" className="text-xs font-semibold">
                  Chave PIX *
                </Label>
                <Input
                  id="pixKey"
                  placeholder="Informe a chave PIX (CPF, CNPJ, e-mail, celular ou aleatória)..."
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  className="h-10 rounded-xl font-mono text-xs"
                />
              </div>
            )}

            {/* Favorecido e Documento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="favoredName" className="text-xs font-semibold">
                  Nome do Favorecido / Cedente *
                </Label>
                <Input
                  id="favoredName"
                  placeholder="Para quem vai o pagamento..."
                  value={favoredName}
                  onChange={(e) => setFavoredName(e.target.value)}
                  className="h-10 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="favoredDocument" className="text-xs font-semibold">
                  CPF ou CNPJ do Favorecido
                </Label>
                <Input
                  id="favoredDocument"
                  placeholder="Documento de quem recebe..."
                  value={favoredDocument}
                  onChange={(e) => setFavoredDocument(e.target.value)}
                  className="h-10 rounded-xl font-mono text-xs"
                />
              </div>
            </div>

            {/* Valor e Data de Vencimento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="amountStr" className="text-xs font-semibold">
                  Valor do Pagamento (R$) *
                </Label>
                <Input
                  id="amountStr"
                  placeholder="R$ 0,00"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="h-10 rounded-xl font-mono text-xs font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dueDate" className="text-xs font-semibold">
                  Data de Vencimento / Pagamento *
                </Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-10 rounded-xl text-xs"
                />
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-semibold">
                Observação / Descrição (Opcional)
              </Label>
              <Input
                id="description"
                placeholder="Ex: Pagamento de fornecedor, aluguel, conta de luz..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-10 rounded-xl text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setNewRequestOpen(false)}
              className="rounded-xl text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => createRequestMutation.mutate()}
              disabled={createRequestMutation.isPending}
              className="rounded-xl font-bold text-xs bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md hover:from-blue-500 hover:to-cyan-500"
            >
              {createRequestMutation.isPending ? "Enviando..." : "Enviar Solicitação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Confirmação de Pagamento (Para o Admin) */}
      <Dialog open={payConfirmOpen} onOpenChange={setPayConfirmOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-600" />
              <span>Confirmar Liquidação do Pagamento</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Você confirma que realizou este pagamento? O valor será automaticamente deduzido do saldo do EC no extrato.
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estabelecimento:</span>
                <span className="font-bold text-foreground">
                  {merchantsMap.get(selectedRequest.merchant_id)?.name || "EC"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Favorecido:</span>
                <span className="font-bold text-foreground">{selectedRequest.favored_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tipo:</span>
                <span className="font-bold">{selectedRequest.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vencimento:</span>
                <span>{selectedRequest.due_date || "Hoje"}</span>
              </div>
              <div className="pt-2 border-t border-border flex justify-between items-center text-sm font-black font-mono">
                <span>Valor a Deduzir:</span>
                <span className="text-emerald-600 dark:text-emerald-400">{BRL(selectedRequest.amount)}</span>
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
              {markAsPaidMutation.isPending ? "Processando..." : "Confirmar e Deduzir Saldo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Confirmação de Rejeição (Para o Admin) */}
      <Dialog open={rejectConfirmOpen} onOpenChange={setRejectConfirmOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <AlertTriangle className="size-5 text-rose-600" />
              <span>Rejeitar Solicitação de Pagamento</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Tem certeza que deseja recusar esta solicitação? O valor reservado voltará a ficar disponível para o EC.
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs space-y-1">
              <p className="font-semibold text-rose-700 dark:text-rose-300">
                Favorecido: {selectedRequest.favored_name}
              </p>
              <p className="font-mono text-sm font-bold text-rose-700 dark:text-rose-300">
                Valor: {BRL(selectedRequest.amount)}
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRejectConfirmOpen(false)}
              className="rounded-xl text-xs"
            >
              Voltar
            </Button>
            <Button
              type="button"
              onClick={() => rejectRequestMutation.mutate(selectedRequest)}
              disabled={rejectRequestMutation.isPending}
              className="rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-500 text-white shadow-md"
            >
              {rejectRequestMutation.isPending ? "Rejeitando..." : "Confirmar Rejeição"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

