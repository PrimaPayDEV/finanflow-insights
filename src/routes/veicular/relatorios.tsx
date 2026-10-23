import { createFileRoute } from '@tanstack/react-router';
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  FileBarChart2,
  Filter,
  Search,
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Clock,
  MessageCircle,
  ExternalLink,
  Download,
  Share2,
  Printer,
  Car,
  User,
  Percent
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { getAsaasDashboardMetrics } from "@/lib/asaas.functions";
import { getMembers } from "@/lib/members.functions";
import { BRL, formatCpfCnpj, formatPhone } from "@/lib/format";
import { generateBoletoWhatsAppMessage } from "@/lib/veicular";

export const Route = createFileRoute('/veicular/relatorios')({
  head: () => ({
    meta: [{ title: "Relatórios & Cobrança | Planmais Proteção Veicular" }],
  }),
  component: RelatoriosPage,
});

function RelatoriosPage() {
  const { companyId, companyName } = useAuth();

  // Buscar cobranças Asaas
  const fetchMetrics = useServerFn(getAsaasDashboardMetrics);
  const { data: metricsData, isLoading } = useQuery({
    queryKey: ["billing_metrics", companyId],
    queryFn: () => fetchMetrics({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });

  const fetchMembers = useServerFn(getMembers);
  const { data: members = [] } = useQuery({
    queryKey: ["members", companyId],
    queryFn: () => fetchMembers({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });

  // Filtros
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [filterMonth, setFilterMonth] = useState(currentMonthStr);
  const [filterStatus, setFilterStatus] = useState<"TODOS" | "PAGO" | "EM_ABERTO" | "VENCIDO">("TODOS");
  const [filterDueDateStart, setFilterDueDateStart] = useState("");
  const [filterDueDateEnd, setFilterDueDateEnd] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const rawPayments = metricsData?.data?.recentPayments || [];

  // Filtragem
  const filteredReport = useMemo(() => {
    return rawPayments.filter((p: any) => {
      const isPaid = p.status === "RECEIVED" || p.status === "CONFIRMED" || p.status === "RECEIVED_IN_CASH";
      const isOverdue = p.status === "OVERDUE";
      const isPending = p.status === "PENDING";

      // Filtro por Situação
      if (filterStatus === "PAGO" && !isPaid) return false;
      if (filterStatus === "EM_ABERTO" && !isPending) return false;
      if (filterStatus === "VENCIDO" && !isOverdue) return false;

      // Filtro por Mês (se informado)
      if (filterMonth && p.dueDate && !p.dueDate.startsWith(filterMonth)) {
        return false;
      }

      // Filtro por Data de Vencimento De/Até
      if (filterDueDateStart && p.dueDate && p.dueDate < filterDueDateStart) return false;
      if (filterDueDateEnd && p.dueDate && p.dueDate > filterDueDateEnd) return false;

      // Filtro por Busca
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (p.customerName || p.customer || "").toLowerCase();
        const desc = (p.description || "").toLowerCase();
        const doc = (p.customerDocument || "").toLowerCase();
        return name.includes(q) || desc.includes(q) || doc.includes(q);
      }

      return true;
    });
  }, [rawPayments, filterStatus, filterMonth, filterDueDateStart, filterDueDateEnd, searchQuery]);

  // Cálculos consolidados
  const totalFaturado = useMemo(
    () => filteredReport.reduce((acc: number, p: any) => acc + (Number(p.value) || 0), 0),
    [filteredReport]
  );

  const totalRecebido = useMemo(
    () =>
      filteredReport
        .filter((p: any) => p.status === "RECEIVED" || p.status === "CONFIRMED" || p.status === "RECEIVED_IN_CASH")
        .reduce((acc: number, p: any) => acc + (Number(p.value) || 0), 0),
    [filteredReport]
  );

  const totalEmAberto = useMemo(
    () =>
      filteredReport
        .filter((p: any) => p.status === "PENDING")
        .reduce((acc: number, p: any) => acc + (Number(p.value) || 0), 0),
    [filteredReport]
  );

  const totalVencido = useMemo(
    () =>
      filteredReport
        .filter((p: any) => p.status === "OVERDUE")
        .reduce((acc: number, p: any) => acc + (Number(p.value) || 0), 0),
    [filteredReport]
  );

  const taxaAdimplencia = useMemo(() => {
    if (totalFaturado === 0) return 100;
    return Number(((totalRecebido / totalFaturado) * 100).toFixed(1));
  }, [totalFaturado, totalRecebido]);

  // Enviar WhatsApp com link direto
  const handleSendWhatsApp = (p: any) => {
    const url = p.bankSlipUrl || p.invoiceUrl || "";
    const memberName = p.customerName || p.customer || "Associado";
    const msg = generateBoletoWhatsAppMessage(
      memberName,
      "Veículo Protegido",
      p.value,
      p.dueDate,
      url,
      companyName || "Planmais"
    );
    const cleanPhone = (p.customerPhone || "").replace(/\D/g, "");
    const waUrl = cleanPhone
      ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;

    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  const handleExportCSV = () => {
    if (filteredReport.length === 0) {
      toast.error("Nenhum dado para exportar.");
      return;
    }

    const headers = "Associado;CPF;Vencimento;Pagamento;Valor;Situacao;Descricao\n";
    const rows = filteredReport
      .map((p: any) => {
        const isPaid = p.status === "RECEIVED" || p.status === "CONFIRMED" || p.status === "RECEIVED_IN_CASH";
        const situacao = isPaid ? "PAGO" : p.status === "OVERDUE" ? "VENCIDO" : "EM ABERTO";
        return `"${p.customerName || p.customer}";"${p.customerDocument || ""}";"${p.dueDate || ""}";"${p.paymentDate || ""}";"${p.value}";"${situacao}";"${p.description || ""}"`;
      })
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio_cobranca_${filterMonth || "geral"}.csv`;
    link.click();
    toast.success("Relatório CSV gerado com sucesso!");
  };

  return (
    <AppLayout
      title="Relatórios de Cobrança"
      subtitle="Filtros analíticos por vencimento, pagamento, situação e disparo de cobrança via WhatsApp"
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* KPI Cards Consolidados */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="rounded-2xl border border-border/80 shadow-xs p-4 bg-card">
            <span className="text-xs text-muted-foreground block">Total Faturado</span>
            <div className="text-2xl font-black text-foreground font-mono mt-1">
              {BRL(totalFaturado)}
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              {filteredReport.length} cobranças no filtro
            </span>
          </Card>

          <Card className="rounded-2xl border border-border/80 shadow-xs p-4 bg-card">
            <span className="text-xs text-muted-foreground block">Total Recebido / Pago</span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">
              {BRL(totalRecebido)}
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5 block">
              Liquidados no gateway
            </span>
          </Card>

          <Card className="rounded-2xl border border-border/80 shadow-xs p-4 bg-card">
            <span className="text-xs text-muted-foreground block">Em Aberto / Pendente</span>
            <div className="text-2xl font-black text-amber-500 font-mono mt-1">
              {BRL(totalEmAberto)}
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              Aguardando vencimento
            </span>
          </Card>

          <Card className="rounded-2xl border border-border/80 shadow-xs p-4 bg-card">
            <span className="text-xs text-muted-foreground block">Inadimplência / Vencidos</span>
            <div className="text-2xl font-black text-destructive font-mono mt-1">
              {BRL(totalVencido)}
            </div>
            <span className="text-[10px] text-destructive font-bold mt-0.5 block">
              Passíveis de cobrança
            </span>
          </Card>

          <Card className="rounded-2xl border border-border/80 shadow-xs p-4 bg-card">
            <span className="text-xs text-muted-foreground block">Taxa de Adimplência</span>
            <div className="text-2xl font-black text-primary font-mono mt-1">
              {taxaAdimplencia}%
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              Taxa de arrecadação
            </span>
          </Card>
        </div>

        {/* Barra de Filtros Robustos */}
        <Card className="rounded-2xl border border-border/80 shadow-sm p-4 bg-muted/30">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
            <div className="lg:col-span-3 space-y-1">
              <Label className="text-xs font-semibold">Buscar Associado / Documento</Label>
              <div className="relative">
                <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Nome, CPF ou descrição..."
                  className="pl-8 rounded-xl text-xs h-9 bg-background"
                />
              </div>
            </div>

            <div className="lg:col-span-2 space-y-1">
              <Label className="text-xs font-semibold">Mês de Referência</Label>
              <Input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="rounded-xl text-xs h-9 font-mono bg-background"
              />
            </div>

            <div className="lg:col-span-2 space-y-1">
              <Label className="text-xs font-semibold">Situação da Cobrança</Label>
              <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
                <SelectTrigger className="rounded-xl text-xs h-9 bg-background font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs">
                  <SelectItem value="TODOS">Todas as Situações</SelectItem>
                  <SelectItem value="PAGO">Pago / Liquidado</SelectItem>
                  <SelectItem value="EM_ABERTO">Em Aberto (Pendente)</SelectItem>
                  <SelectItem value="VENCIDO">Vencido (Inadimplente)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="lg:col-span-2 space-y-1">
              <Label className="text-xs font-semibold">Vencimento Início</Label>
              <Input
                type="date"
                value={filterDueDateStart}
                onChange={(e) => setFilterDueDateStart(e.target.value)}
                className="rounded-xl text-xs h-9 font-mono bg-background"
              />
            </div>

            <div className="lg:col-span-2 space-y-1">
              <Label className="text-xs font-semibold">Vencimento Fim</Label>
              <Input
                type="date"
                value={filterDueDateEnd}
                onChange={(e) => setFilterDueDateEnd(e.target.value)}
                className="rounded-xl text-xs h-9 font-mono bg-background"
              />
            </div>

            <div className="lg:col-span-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                title="Exportar dados para CSV"
                className="w-full rounded-xl text-xs h-9 gap-1"
              >
                <Download className="size-3.5" />
                <span className="hidden lg:inline">CSV</span>
              </Button>
            </div>
          </div>
        </Card>

        {/* Tabela Analítica */}
        <Card className="rounded-2xl border border-border/80 shadow-sm overflow-hidden">
          <CardHeader className="p-4 pb-3 border-b border-border/60 bg-muted/20 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <FileBarChart2 className="size-4 text-primary" />
                <span>Cobranças & Status de Pagamento</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Listagem analítica com botão direto de acionamento via WhatsApp
              </CardDescription>
            </div>
            <span className="text-xs font-semibold text-muted-foreground">
              {filteredReport.length} registros exibidos
            </span>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-16 text-center text-sm text-muted-foreground">Carregando relatório financeiro...</div>
            ) : filteredReport.length === 0 ? (
              <div className="p-16 text-center text-sm text-muted-foreground">
                Nenhuma cobrança encontrada para os filtros selecionados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/40 font-bold text-muted-foreground uppercase text-[10px] tracking-wider">
                      <th className="p-3.5">Associado</th>
                      <th className="p-3.5">Descrição</th>
                      <th className="p-3.5">Data Vencimento</th>
                      <th className="p-3.5">Data Pagamento</th>
                      <th className="p-3.5 text-right">Valor</th>
                      <th className="p-3.5 text-center">Situação</th>
                      <th className="p-3.5 text-right">Acionar no WhatsApp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredReport.map((p: any) => {
                      const isPaid =
                        p.status === "RECEIVED" ||
                        p.status === "CONFIRMED" ||
                        p.status === "RECEIVED_IN_CASH";
                      const isOverdue = p.status === "OVERDUE";
                      const boletoUrl = p.bankSlipUrl || p.invoiceUrl;

                      return (
                        <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3.5">
                            <div className="font-bold text-foreground text-sm">{p.customerName || p.customer}</div>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {p.customerPhone ? formatPhone(p.customerPhone) : "Sem telefone"}
                            </span>
                          </td>
                          <td className="p-3.5 text-muted-foreground max-w-xs truncate">
                            {p.description || "Proteção Veicular"}
                          </td>
                          <td className="p-3.5 font-mono font-semibold text-foreground whitespace-nowrap">
                            {p.dueDate ? p.dueDate.split("-").reverse().join("/") : "-"}
                          </td>
                          <td className="p-3.5 font-mono text-muted-foreground whitespace-nowrap">
                            {p.paymentDate ? p.paymentDate.split("-").reverse().join("/") : isPaid ? "Liquidado" : "-"}
                          </td>
                          <td className="p-3.5 text-right font-mono font-extrabold text-foreground text-sm whitespace-nowrap">
                            {BRL(p.value)}
                          </td>
                          <td className="p-3.5 text-center">
                            <Badge
                              className={
                                isPaid
                                  ? "bg-emerald-500 text-white text-[10px]"
                                  : isOverdue
                                  ? "bg-destructive text-destructive-foreground text-[10px]"
                                  : "bg-amber-500 text-white text-[10px]"
                              }
                            >
                              {isPaid ? "PAGO" : isOverdue ? "VENCIDO" : "EM ABERTO"}
                            </Badge>
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {boletoUrl && (
                                <Button
                                  size="sm"
                                  onClick={() => handleSendWhatsApp(p)}
                                  className="h-8 rounded-xl font-bold text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                                >
                                  <MessageCircle className="size-3.5" />
                                  <span>Cobrar / Enviar</span>
                                </Button>
                              )}

                              {boletoUrl && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => window.open(boletoUrl, "_blank")}
                                  title="Ver Boleto"
                                  className="size-8 rounded-lg"
                                >
                                  <ExternalLink className="size-3.5" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
