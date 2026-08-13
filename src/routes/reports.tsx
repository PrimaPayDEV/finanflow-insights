import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import { FileBarChart2, Filter, DollarSign, AlertCircle, CheckCircle2, Clock } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { closuresQuery, merchantsQuery } from "@/lib/db";
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

  const [periodFilter, setPeriodFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [merchantFilter, setMerchantFilter] = useState("all");

  const today = startOfDay(new Date());

  const getDueDate = (createdAt: string) => {
    return startOfDay(addDays(new Date(createdAt), 5));
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

    // Period Filter
    if (periodFilter !== "all") {
      let withinPeriod = false;
      if (periodFilter === "this_month") {
        withinPeriod = isWithinInterval(dueDate, { start: startOfMonth(today), end: endOfMonth(today) });
      } else if (periodFilter === "last_7d") {
        withinPeriod = isWithinInterval(dueDate, { start: subDays(today, 7), end: today });
      } else if (periodFilter === "last_30d") {
        withinPeriod = isWithinInterval(dueDate, { start: subDays(today, 30), end: today });
      } else if (periodFilter === "next_7d") {
        withinPeriod = isWithinInterval(dueDate, { start: today, end: addDays(today, 7) });
      } else if (periodFilter === "next_30d") {
        withinPeriod = isWithinInterval(dueDate, { start: today, end: addDays(today, 30) });
      }
      if (!withinPeriod) return false;
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

  return (
    <AppLayout
      title="Relatórios e Previsibilidade"
      subtitle="Acompanhe seus recebíveis e controle pagamentos"
    >
      <div className="space-y-6">
        {/* Total a Receber Highlight */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Card className="bg-primary text-primary-foreground border-none shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium opacity-90 flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Valor Total a Receber
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row md:items-end gap-4 justify-between">
                <div>
                  <p className="text-5xl font-black tracking-tight">{BRL(totalToReceive)}</p>
                  <p className="text-sm opacity-80 mt-1">Soma de todos os boletos pendentes ou vencidos no período selecionado</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Secondary Metrics */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pendente (A Vencer)</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{BRL(totalPending)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Em Atraso (Vencido)</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive">{BRL(totalOverdue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Recebido (Pago)</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-success">{BRL(totalReceived)}</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Filters */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
          <Card>
            <CardHeader className="pb-4 border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Período de Vencimento</label>
                <Select value={periodFilter} onValueChange={setPeriodFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todo o período</SelectItem>
                    <SelectItem value="this_month">Este Mês</SelectItem>
                    <SelectItem value="last_7d">Últimos 7 dias</SelectItem>
                    <SelectItem value="last_30d">Últimos 30 dias</SelectItem>
                    <SelectItem value="next_7d">Próximos 7 dias</SelectItem>
                    <SelectItem value="next_30d">Próximos 30 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Status do Pagamento</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pending">Pendente (No prazo)</SelectItem>
                    <SelectItem value="overdue">Vencido (Em atraso)</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Estabelecimento</label>
                <Select value={merchantFilter} onValueChange={setMerchantFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os estabelecimentos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
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
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileBarChart2 className="h-4 w-4" />
                Listagem de Recebíveis
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Estabelecimento</TableHead>
                      <TableHead>Emissão (Ref)</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Valor Líquido</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClosures.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhum registro encontrado para os filtros selecionados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredClosures.map((c) => {
                        const dueDate = getDueDate(c.created_at);
                        const status = getStatus(c, dueDate);
                        const merchant = merchants.data?.find(m => m.id === c.merchant_id);
                        
                        return (
                          <TableRow key={c.id}>
                            <TableCell className="font-medium">
                              {merchant?.name || "Desconhecido"}
                            </TableCell>
                            <TableCell>
                              {format(new Date(c.created_at), "dd/MM/yyyy")} <span className="text-muted-foreground text-xs">({c.reference_month})</span>
                            </TableCell>
                            <TableCell>
                              {format(dueDate, "dd/MM/yyyy")}
                            </TableCell>
                            <TableCell>
                              {status === "paid" && <Badge variant="success" className="bg-success text-success-foreground">Pago</Badge>}
                              {status === "pending" && <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Pendente</Badge>}
                              {status === "overdue" && <Badge variant="destructive">Vencido</Badge>}
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              {BRL(c.net_invoice_amount)}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
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
