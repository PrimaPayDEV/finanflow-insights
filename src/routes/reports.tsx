import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileBarChart2, Filter, DollarSign, AlertCircle, CheckCircle2, Clock, CalendarIcon, Inbox, TrendingUp, SearchX, Store, CalendarDays, Receipt } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
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
import { closuresQuery, merchantsQuery, asaasSettingsQuery } from "@/lib/db";
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
  const dueDay = settings.data?.due_day ?? 10;

  const [period, setPeriod] = useState<PeriodType>("month");
  const [customRange, setCustomRange] = useState<{ from?: Date; to?: Date }>();

  const [statusFilter, setStatusFilter] = useState("all");
  const [merchantFilter, setMerchantFilter] = useState("all");

  const today = startOfDay(new Date());
  
  const ranges = useMemo(() => getPeriodDateRange(period, customRange as DateRange), [period, customRange]);

  const getDueDate = (createdAt: string) => {
    return startOfDay(getNextBusinessDueDate(new Date(createdAt), dueDay));
  };

  const getStatus = (closure: any, dueDate: Date) => {
    if (closure.status === "paid") return "paid";
    if (isBefore(dueDate, today)) return "overdue";
    return "pending";
  };

  const filteredClosures = (closures.data ?? []).filter((c) => {
    if (merchantFilter !== "all" && c.merchant_id !== merchantFilter) return false;

    const dueDate = getDueDate(c.created_at);
    
    // Status Filter
    const cStatus = getStatus(c, dueDate);
    if (statusFilter !== "all" && cStatus !== statusFilter) return false;

    // Period Filter (based on created_at or due_date)
    const createdAtDate = startOfDay(new Date(c.created_at));
    const interval = { start: startOfDay(ranges.current.from), end: startOfDay(ranges.current.to) };
    if (!isWithinInterval(dueDate, interval) && !isWithinInterval(createdAtDate, interval)) {
      return false;
    }

    return true;
  });

  const totalToReceive = filteredClosures
    .filter((c) => getStatus(c, getDueDate(c.created_at)) !== "paid")
    .reduce((sum, c) => sum + c.net_invoice_amount, 0);

  const totalPending = filteredClosures
    .filter((c) => getStatus(c, getDueDate(c.created_at)) === "pending")
    .reduce((sum, c) => sum + c.net_invoice_amount, 0);

  const totalOverdue = filteredClosures
    .filter((c) => getStatus(c, getDueDate(c.created_at)) === "overdue")
    .reduce((sum, c) => sum + c.net_invoice_amount, 0);

  const totalReceived = filteredClosures
    .filter((c) => getStatus(c, getDueDate(c.created_at)) === "paid")
    .reduce((sum, c) => sum + (c.paid_amount || c.net_invoice_amount), 0);

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
      title="Relatórios e Previsibilidade"
      subtitle={getSubtitle()}
      actions={
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
      }
    >
      <div className="space-y-6">
        {/* Total a Receber Highlight */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.4 }}
        >
          <Card className="border border-primary/20 bg-primary/5 shadow-card text-foreground">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2 text-primary">
                <div className="p-1.5 bg-primary/10 rounded-lg">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                Valor Total a Receber
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row md:items-end gap-4 justify-between">
                <div>
                  <p className="text-4xl md:text-5xl font-black tracking-tight drop-shadow-sm">
                    {BRL(totalToReceive)}
                  </p>
                  <p className="text-sm font-medium opacity-80 mt-2">
                    Soma de todos os boletos pendentes ou vencidos no período selecionado
                  </p>
                </div>
                <div className="hidden md:flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full border border-primary/20">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm font-medium">Previsão Atualizada</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Secondary Metrics */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.5, delay: 0.1, staggerChildren: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
            <Card className="border-none shadow-card hover:-translate-y-0.5 transition-all duration-300">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-semibold text-muted-foreground">Pendente (A Vencer)</CardTitle>
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                  <Clock className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">{BRL(totalPending)}</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
            <Card className="border-none shadow-card hover:-translate-y-0.5 transition-all duration-300">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-semibold text-muted-foreground">Em Atraso (Vencido)</CardTitle>
                <div className="p-2 bg-destructive/10 rounded-full">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-destructive">{BRL(totalOverdue)}</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
            <Card className="border-none shadow-card hover:-translate-y-0.5 transition-all duration-300">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-semibold text-muted-foreground">Recebido (Pago)</CardTitle>
                <div className="p-2 bg-success/10 rounded-full">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-success">{BRL(totalReceived)}</p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Filters */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
          <Card className="border-none shadow-card">
            <CardHeader className="pb-4 border-b border-border/40">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status do Pagamento</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-background/50 border-border/50 h-10 transition-colors hover:bg-background">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="overdue">Vencido</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estabelecimento</label>
                <Select value={merchantFilter} onValueChange={setMerchantFilter}>
                  <SelectTrigger className="bg-background/50 border-border/50 h-10 transition-colors hover:bg-background">
                    <SelectValue placeholder="Todos os estabelecimentos" />
                  </SelectTrigger>
                  <SelectContent>
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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
          <Card className="border-border/40 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/20 pb-4 border-b border-border/40">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileBarChart2 className="h-4 w-4 text-primary" />
                Listagem de Recebíveis
                <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary font-bold">
                  {filteredClosures.length} {filteredClosures.length === 1 ? 'registro' : 'registros'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="py-4 pl-6 font-semibold text-muted-foreground w-[28%]">Estabelecimento</TableHead>
                      <TableHead className="py-4 font-semibold text-muted-foreground text-center w-[15%]">Emissão</TableHead>
                      <TableHead className="py-4 font-semibold text-muted-foreground text-center w-[12%]">Ref</TableHead>
                      <TableHead className="py-4 font-semibold text-muted-foreground text-center w-[15%]">Vencimento</TableHead>
                      <TableHead className="py-4 font-semibold text-muted-foreground text-center w-[15%]">Status</TableHead>
                      <TableHead className="py-4 pr-6 text-right font-semibold text-muted-foreground w-[15%]">Valor Líquido</TableHead>
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
                          <TableCell colSpan={6} className="h-64 text-center">
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
                          const status = getStatus(c, dueDate);
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
                                    <Store className="w-4 h-4" />
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
                                <div className={isBefore(dueDate, today) && status !== "paid" ? "text-destructive font-medium flex items-center justify-center gap-2.5" : "flex items-center justify-center gap-2.5"}>
                                  {isBefore(dueDate, today) && status !== "paid" ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />}
                                  <span>{format(dueDate, "dd/MM/yyyy")}</span>
                                </div>
                              </TableCell>
                              <TableCell className="py-5 text-center">
                                {status === "paid" && <Badge variant="success" className="w-[100px] justify-center bg-success text-success-foreground border-success hover:bg-success/90 px-3 py-1"><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Pago</Badge>}
                                {status === "pending" && <Badge variant="outline" className="w-[100px] justify-center text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-3 py-1"><Clock className="w-3.5 h-3.5 mr-1.5" /> Pendente</Badge>}
                                {status === "overdue" && <Badge variant="destructive" className="w-[100px] justify-center px-3 py-1 shadow-sm"><AlertCircle className="w-3.5 h-3.5 mr-1.5" /> Vencido</Badge>}
                              </TableCell>
                              <TableCell className="py-5 pr-6 text-right font-bold tracking-tight text-[15px] group-hover:text-primary transition-colors">
                                {BRL(c.net_invoice_amount)}
                              </TableCell>
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
    </AppLayout>
  );
}
