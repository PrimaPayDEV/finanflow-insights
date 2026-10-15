import { MerchantIcon } from "@/components/MerchantIcon";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileBarChart2, Filter, DollarSign, AlertCircle, CheckCircle2, Clock, CalendarIcon, Inbox, TrendingUp, SearchX, CalendarDays, Receipt, Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { AppLayout } from "@/components/AppLayout";
import { BillingReports } from "@/components/BillingReports";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PeriodType, DateRange, getPeriodDateRange, getNextBusinessDueDate } from "@/lib/dateUtils";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { closuresQuery, merchantsQuery, asaasSettingsQuery, splitRulesQuery } from "@/lib/db";
import { BRL } from "@/lib/format";
import { format, isBefore, startOfDay, addDays, subDays, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Relatórios | Gestão de ECs" },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const closures = useQuery(closuresQuery);
  const merchants = useQuery(merchantsQuery);
  const settings = useQuery(asaasSettingsQuery);
  const splitRules = useQuery(splitRulesQuery);
  const dueDay = settings.data?.due_day ?? 10;
  
  const { role, partnerId, appMode } = useAuth();

  const [period, setPeriod] = useState<PeriodType>("month");
  const [customRange, setCustomRange] = useState<{ from?: Date; to?: Date }>();

  const [statusFilter, setStatusFilter] = useState("all");
  const [merchantFilter, setMerchantFilter] = useState("all");
  const [partnerFilter, setPartnerFilter] = useState("all");

  const uniquePartners = useMemo(() => {
    const rules = splitRules.data ?? [];
    const map = new Map<string, { id: string; name: string }>();
    for (const r of rules) {
      if (r.partner_id && !map.has(r.partner_id)) {
        map.set(r.partner_id, { id: r.partner_id, name: r.partner_name });
      }
    }
    return Array.from(map.values());
  }, [splitRules.data]);

  const today = startOfDay(new Date());
  
  const ranges = useMemo(() => getPeriodDateRange(period, customRange as DateRange), [period, customRange]);

  const getDueDate = (createdAt: string) => {
    return startOfDay(getNextBusinessDueDate(new Date(createdAt), dueDay));
  };

  const getNewDueDate = (reissuedAt: string | null) => {
    if (!reissuedAt) return null;
    return startOfDay(getNextBusinessDueDate(new Date(reissuedAt), dueDay));
  };

  const getEffectiveDueDate = (c: any) => getNewDueDate(c.reissued_at) || getDueDate(c.created_at);

  const getStatus = (closure: any, dueDate: Date) => {
    if (closure.status === "paid") return "paid";
    if (isBefore(dueDate, today)) return "overdue";
    return "pending";
  };

  const filteredClosures = (closures.data ?? []).filter((c) => {
    if (merchantFilter !== "all" && c.merchant_id !== merchantFilter) return false;

    // Enforce partner isolation
    if (role === "partner") {
      const hasSplitForPartner = (splitRules.data ?? []).some(
        (r) => r.merchant_id === c.merchant_id && r.partner_id === partnerId
      );
      if (!hasSplitForPartner) return false;
    } else if (partnerFilter !== "all") {
      // Normal filtering by admin/owner
      const hasSplitForPartner = (splitRules.data ?? []).some(
        (r) => r.merchant_id === c.merchant_id && r.partner_id === partnerFilter
      );
      if (!hasSplitForPartner) return false;
    }

    const dueDate = getDueDate(c.created_at);
    const effectiveDueDate = getEffectiveDueDate(c);
    
    // Status Filter
    const cStatus = getStatus(c, effectiveDueDate);
    if (statusFilter !== "all" && cStatus !== statusFilter) return false;

    // Period Filter (based on created_at or due_date)
    const createdAtDate = startOfDay(new Date(c.created_at));
    const interval = { start: startOfDay(ranges.current.from), end: startOfDay(ranges.current.to) };
    if (!isWithinInterval(effectiveDueDate, interval) && !isWithinInterval(createdAtDate, interval)) {
      return false;
    }

    return true;
  });

  const getPartnerPercentage = (merchantId: string) => {
    if (role === "partner") {
      const rule = (splitRules.data ?? []).find(
        (r) => r.merchant_id === merchantId && r.partner_id === partnerId
      );
      return rule ? rule.percentage : null;
    }
    if (partnerFilter === "all") return null;
    const rule = (splitRules.data ?? []).find(
      (r) => r.merchant_id === merchantId && r.partner_id === partnerFilter
    );
    return rule ? rule.percentage : null;
  };

  const getClosureAmount = (c: any) => {
    const pct = getPartnerPercentage(c.merchant_id);
    const amount = c.net_invoice_amount;
    if (pct !== null) {
      return amount * (pct / 100);
    }
    return amount;
  };

  const getClosurePaidAmount = (c: any) => {
    const pct = getPartnerPercentage(c.merchant_id);
    const amount = c.paid_amount || c.net_invoice_amount;
    if (pct !== null) {
      return amount * (pct / 100);
    }
    return amount;
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const isPartner = role === "partner" || partnerFilter !== "all";

    doc.setFontSize(16);
    doc.text("Relatório de Pagamentos e Recebíveis", 14, 22);
    
    doc.setFontSize(10);
    doc.text(getSubtitle(), 14, 30);
    if (isPartner) {
      doc.text(`Visão de Parceiro/Split`, 14, 36);
    }

    const tableColumn = [
      "Estabelecimento",
      "Emissão",
      "Vencimento",
      "Status",
      ...(isPartner ? ["% Split", "Repasse"] : ["Valor Líquido"])
    ];

    const tableRows = filteredClosures.map(c => {
      const merchant = merchants.data?.find(m => m.id === c.merchant_id);
      const effectiveDueDate = getEffectiveDueDate(c);
      const status = getStatus(c, effectiveDueDate);
      const statusText = status === "paid" ? "Pago" : status === "overdue" ? "Vencido" : "Pendente";
      
      const row = [
        merchant?.name || "Desconhecido",
        format(new Date(c.created_at), "dd/MM/yyyy"),
        format(effectiveDueDate, "dd/MM/yyyy"),
        statusText
      ];

      if (isPartner) {
        const pct = getPartnerPercentage(c.merchant_id) || 0;
        row.push(`${pct}%`);
        row.push(BRL(getClosureAmount(c)));
      } else {
        row.push(BRL(getClosureAmount(c)));
      }

      return row;
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 42,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [15, 23, 42] } // primary dark color
    });

    // Add totals at the end
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text(`Total a Receber: ${BRL(totalToReceive)}`, 14, finalY);
    doc.text(`Total Pago: ${BRL(totalReceived)}`, 14, finalY + 7);

    doc.save(`relatorio_${format(new Date(), "yyyyMMdd")}.pdf`);
  };

  const totalToReceive = filteredClosures
    .filter((c) => getStatus(c, getEffectiveDueDate(c)) !== "paid")
    .reduce((sum, c) => sum + getClosureAmount(c), 0);

  const totalPending = filteredClosures
    .filter((c) => getStatus(c, getEffectiveDueDate(c)) === "pending")
    .reduce((sum, c) => sum + getClosureAmount(c), 0);

  const totalOverdue = filteredClosures
    .filter((c) => getStatus(c, getEffectiveDueDate(c)) === "overdue")
    .reduce((sum, c) => sum + getClosureAmount(c), 0);

  const totalReceived = filteredClosures
    .filter((c) => getStatus(c, getEffectiveDueDate(c)) === "paid")
    .reduce((sum, c) => sum + getClosurePaidAmount(c), 0);

  const getSubtitle = () => {
    if (period === "month") return `Visão consolidada de ${format(ranges.current.from, "MMMM/yyyy", { locale: ptBR })}`;
    if (period === "7d") return "Últimos 7 dias";
    if (period === "30d") return "Últimos 30 dias";
    if (period === "90d") return "Últimos 90 dias";
    if (period === "custom" && customRange?.from && customRange?.to) {
      return `${format(customRange.from, "dd/MM/yyyy")} até ${format(customRange.to, "dd/MM/yyyy")}`;
    }
    return "Visão consolidada";
  };

  return (
    <AppLayout
      title={appMode === "billing" ? "Central de Relatórios Planmais" : "Relatórios e Previsibilidade"}
      subtitle={appMode === "billing" ? "Relatórios executivos de faturamento, frota protegida, comissões e inadimplência" : getSubtitle()}
      actions={
        appMode === "billing" ? undefined : (
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Este Mês</SelectItem>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="90d">Últimos 90 dias</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
            {period === "custom" && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 px-2 text-xs min-w-[180px] justify-start">
                    <CalendarIcon className="mr-2 h-3 w-3" />
                    {customRange?.from ? (
                      customRange.to ? (
                        <>
                          {format(customRange.from, "P", { locale: ptBR })} -{" "}
                          {format(customRange.to, "P", { locale: ptBR })}
                        </>
                      ) : (
                        format(customRange.from, "P", { locale: ptBR })
                      )
                    ) : (
                      <span>Selecione a data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={customRange?.from}
                    selected={{ from: customRange?.from, to: customRange?.to }}
                    onSelect={(v: any) => setCustomRange(v)}
                    numberOfMonths={1}
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>
        )
      }
    >
      {appMode === "billing" ? (
        <BillingReports />
      ) : (
      <div className="space-y-6">
        {/* Total a Receber Highlight */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.3 }}
        >
          <Card className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-primary/2 to-transparent shadow-card text-foreground overflow-hidden">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-primary">
                <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <DollarSign className="size-4 text-primary" />
                </div>
                Valor Total a Receber
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="flex flex-col md:flex-row md:items-end gap-4 justify-between">
                <div>
                  <p className="text-4xl sm:text-5xl font-black tracking-tight font-mono text-primary">
                    {BRL(totalToReceive)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Soma de todos os boletos pendentes ou vencidos no período selecionado
                  </p>
                </div>
                <div className="hidden md:flex items-center gap-2 bg-primary/10 text-primary px-3.5 py-1.5 rounded-full border border-primary/20 text-xs font-semibold">
                  <TrendingUp className="size-3.5" />
                  <span>Previsão Atualizada</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Secondary Metrics */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.3, delay: 0.05 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <Card className="rounded-2xl border border-border/80 shadow-card bg-card hover:border-amber-500/40 transition-all p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pendente (A Vencer)</p>
                <p className="text-2xl font-black text-foreground font-mono mt-1">{BRL(totalPending)}</p>
              </div>
              <div className="size-10 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center shrink-0">
                <Clock className="size-5" />
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl border border-border/80 shadow-card bg-card hover:border-destructive/40 transition-all p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Em Atraso (Vencido)</p>
                <p className="text-2xl font-black text-destructive font-mono mt-1">{BRL(totalOverdue)}</p>
              </div>
              <div className="size-10 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl flex items-center justify-center shrink-0">
                <AlertCircle className="size-5" />
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl border border-border/80 shadow-card bg-card hover:border-emerald-500/40 transition-all p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Recebido (Pago)</p>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">{BRL(totalReceived)}</p>
              </div>
              <div className="size-10 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
                <CheckCircle2 className="size-5" />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Filters */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
          <Card className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden">
            <CardHeader className="p-4 pb-3 border-b border-border/60">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Filter className="size-4 text-primary" />
                Filtros de Pesquisa
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              {role !== "partner" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Parceiro / Licenciado</label>
                  <Select value={partnerFilter} onValueChange={setPartnerFilter}>
                    <SelectTrigger className="bg-background rounded-xl h-9 text-xs">
                      <SelectValue placeholder="Todos os parceiros" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all">Todos os parceiros</SelectItem>
                      {uniquePartners.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Status do Pagamento</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-background rounded-xl h-9 text-xs">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="overdue">Vencido</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Estabelecimento (EC)</label>
                <Select value={merchantFilter} onValueChange={setMerchantFilter}>
                  <SelectTrigger className="bg-background rounded-xl h-9 text-xs">
                    <SelectValue placeholder="Todos os estabelecimentos" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">Todos os estabelecimentos</SelectItem>
                    {(merchants.data ?? []).map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Data Table */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.15 }}>
          <Card className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden">
            <CardHeader className="p-4 pb-3 border-b border-border/60 flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2">
                <FileBarChart2 className="size-4 text-primary" />
                <CardTitle className="text-sm font-bold">Listagem de Recebíveis</CardTitle>
                <Badge variant="secondary" className="font-mono text-xs px-2 py-0.5 ml-1">
                  {filteredClosures.length} {filteredClosures.length === 1 ? 'registro' : 'registros'}
                </Badge>
              </div>
              <Button variant="outline" size="sm" onClick={handleExportPDF} className="h-8 gap-1.5 text-xs hidden sm:flex shadow-2xs font-medium">
                <Download className="size-3.5" />
                <span>Exportar PDF</span>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="py-4 pl-6 font-semibold text-muted-foreground w-[28%]">Estabelecimento</TableHead>
                      <TableHead className="py-4 font-semibold text-muted-foreground text-center w-[15%]">Emissão</TableHead>
                      <TableHead className="py-4 font-semibold text-muted-foreground text-center w-[12%]">Ref</TableHead>
                      <TableHead className="py-4 font-semibold text-muted-foreground text-center w-[12%]">Vencimento Original</TableHead>
                      <TableHead className="py-4 font-semibold text-muted-foreground text-center w-[12%]">Novo Vencimento</TableHead>
                      <TableHead className="py-4 font-semibold text-muted-foreground text-center w-[12%]">Status</TableHead>
                      {partnerFilter !== "all" ? (
                        <>
                          <TableHead className="py-4 text-center font-semibold text-muted-foreground w-[10%]">% Split</TableHead>
                          <TableHead className="py-4 pr-6 text-right font-semibold text-muted-foreground w-[15%]">Repasse</TableHead>
                        </>
                      ) : (
                        <TableHead className="py-4 pr-6 text-right font-semibold text-muted-foreground w-[15%]">Valor Líquido</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence mode="popLayout">
                      {filteredClosures.length === 0 ? (
                        <motion.tr
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          <TableCell colSpan={partnerFilter !== "all" ? 8 : 7} className="h-64 text-center">
                            <div className="flex flex-col items-center justify-center text-muted-foreground space-y-3">
                              <div className="p-4 bg-muted/30 rounded-full">
                                <SearchX className="h-8 w-8 opacity-40" />
                              </div>
                              <p className="text-sm font-medium">Nenhum registro encontrado</p>
                              <p className="text-xs opacity-70">Altere os filtros acima para ver mais resultados.</p>
                            </div>
                          </TableCell>
                        </motion.tr>
                      ) : (
                        filteredClosures.map((c) => {
                          const dueDate = getDueDate(c.created_at);
                          const newDueDate = getNewDueDate(c.reissued_at);
                          const effectiveDueDate = getEffectiveDueDate(c);
                          const status = getStatus(c, effectiveDueDate);
                          const merchant = merchants.data?.find(m => m.id === c.merchant_id);
                          
                          return (
                            <motion.tr 
                              key={c.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              transition={{ duration: 0.2 }}
                              className="group hover:bg-muted/30 transition-colors"
                            >
                              <TableCell className="py-5 pl-6 font-medium">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0">
                                    <MerchantIcon name={merchant?.name} className="w-4 h-4" />
                                  </div>
                                  <span className="truncate max-w-[180px]" title={merchant?.name || "Desconhecido"}>
                                    {merchant?.name || "Desconhecido"}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="py-5">
                                <div className="flex items-center justify-center gap-2.5">
                                  <Receipt className="w-4 h-4 text-muted-foreground shrink-0" />
                                  <span>{format(new Date(c.created_at), "dd/MM/yyyy")}</span>
                                </div>
                              </TableCell>
                              <TableCell className="py-5 text-center">
                                <Badge variant="outline" className="font-medium bg-muted/30 text-muted-foreground border-border/50 uppercase tracking-widest text-[10px] py-1 px-3 rounded-md">
                                  {c.reference_month}
                                </Badge>
                              </TableCell>
                                <TableCell className="py-5">
                                  <div className={!newDueDate && isBefore(dueDate, today) && status !== "paid" ? "text-destructive font-medium flex items-center justify-center gap-2.5" : "flex items-center justify-center gap-2.5"}>
                                    {!newDueDate && isBefore(dueDate, today) && status !== "paid" ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />}
                                    <span className={newDueDate ? "line-through text-muted-foreground opacity-70" : ""}>{format(dueDate, "dd/MM/yyyy")}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="py-5">
                                  {newDueDate ? (
                                    <div className={isBefore(newDueDate, today) && status !== "paid" ? "text-destructive font-medium flex items-center justify-center gap-2.5" : "flex items-center justify-center gap-2.5"}>
                                      {isBefore(newDueDate, today) && status !== "paid" ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />}
                                      <span className="font-bold text-primary">{format(newDueDate, "dd/MM/yyyy")}</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center text-muted-foreground/50">-</div>
                                  )}
                                </TableCell>
                              <TableCell className="py-5 text-center">
                                {status === "paid" && <Badge variant="success" className="w-[100px] justify-center bg-success text-success-foreground border-success hover:bg-success/90 px-3 py-1"><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Pago</Badge>}
                                {status === "pending" && <Badge variant="outline" className="w-[100px] justify-center text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-3 py-1"><Clock className="w-3.5 h-3.5 mr-1.5" /> Pendente</Badge>}
                                {status === "overdue" && <Badge variant="destructive" className="w-[100px] justify-center px-3 py-1 shadow-sm"><AlertCircle className="w-3.5 h-3.5 mr-1.5" /> Vencido</Badge>}
                              </TableCell>
                              {partnerFilter !== "all" ? (
                                <>
                                  <TableCell className="py-5 text-center font-medium">
                                    <Badge variant="outline" className="font-bold bg-muted/50 border-border/50 text-foreground">
                                      {getPartnerPercentage(c.merchant_id)}%
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="py-5 pr-6 text-right font-bold tracking-tight text-[15px] group-hover:text-primary transition-colors">
                                    {BRL(getClosureAmount(c))}
                                  </TableCell>
                                </>
                              ) : (
                                <TableCell className="py-5 pr-6 text-right font-bold tracking-tight text-[15px] group-hover:text-primary transition-colors">
                                  {BRL(c.net_invoice_amount)}
                                </TableCell>
                              )}
                            </motion.tr>
                          );
                        })
                      )}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      )}
    </AppLayout>
  );
}
