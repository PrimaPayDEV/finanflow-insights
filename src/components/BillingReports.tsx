import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FileBarChart2, Receipt, Users, Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from "@/contexts/AuthContext";
import { useServerFn } from "@tanstack/react-start";
import { getBillingReports } from "@/lib/reports.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { BRL } from "@/lib/format";
import { translateError } from "@/lib/translateError";

export function BillingReports() {
  const { companyId } = useAuth();
  const fetchReports = useServerFn(getBillingReports);
  
  const [reportType, setReportType] = useState("invoices"); // invoices | partners
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading, error } = useQuery({
    queryKey: ["billingReports", companyId],
    queryFn: () => fetchReports({ data: { companyId: companyId!, period: "month" } }),
    enabled: !!companyId,
  });

  const exportPDF = () => {
    if (!data?.ok) return;
    
    const doc = new jsPDF();
    doc.setFont("helvetica");

    if (reportType === "invoices") {
      doc.text("Relatório de Boletos", 14, 20);
      const filtered = data.invoices.filter(i => statusFilter === "all" || i.status === statusFilter);
      
      autoTable(doc, {
        startY: 30,
        head: [['Cliente', 'Vencimento', 'Valor', 'Status', 'Parceiro']],
        body: filtered.map(i => [
          i.customerName,
          i.dueDate,
          BRL(i.value),
          i.status,
          i.partnerName
        ]),
      });
    } else {
      doc.text("Relatório de Comissões de Parceiros", 14, 20);
      autoTable(doc, {
        startY: 30,
        head: [['Parceiro', 'Faturas Pagas', 'Comissão a Receber']],
        body: data.partners.map((p: any) => [
          p.partnerName,
          p.invoicesCount,
          BRL(p.totalValue)
        ]),
      });
    }

    doc.save(`relatorio_${reportType}.pdf`);
  };

  if (isLoading) return <div className="p-8 text-center">Carregando relatórios...</div>;
  if (error || !data?.ok) return <div className="p-8 text-center text-destructive">Erro ao carregar relatórios.</div>;

  const filteredInvoices = data.invoices.filter(i => statusFilter === "all" || i.status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="invoices">Relatório de Boletos</SelectItem>
              <SelectItem value="partners">Comissões de Parceiros</SelectItem>
            </SelectContent>
          </Select>
          
          {reportType === "invoices" && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="PENDING">Pendentes</SelectItem>
                <SelectItem value="RECEIVED">Pagos</SelectItem>
                <SelectItem value="OVERDUE">Vencidos</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        
        <Button onClick={exportPDF} variant="outline" className="gap-2">
          <Download className="size-4" /> Exportar PDF
        </Button>
      </div>

      {reportType === "invoices" ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="size-5" /> Boletos Gerados
            </CardTitle>
            <CardDescription>Lista de faturas com base nos filtros selecionados.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Cliente</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Vencimento</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Valor</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Parceiro</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {filteredInvoices.map((p: any) => (
                    <tr key={p.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                      <td className="p-4 align-middle font-medium">{p.customerName}</td>
                      <td className="p-4 align-middle">{p.dueDate}</td>
                      <td className="p-4 align-middle">{BRL(p.value)}</td>
                      <td className="p-4 align-middle">
                        <Badge variant={p.status === "RECEIVED" || p.status === "CONFIRMED" ? "default" : p.status === "OVERDUE" ? "destructive" : "secondary"}>
                          {p.status}
                        </Badge>
                      </td>
                      <td className="p-4 align-middle">{p.partnerName}</td>
                    </tr>
                  ))}
                  {filteredInvoices.length === 0 && (
                    <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">Nenhuma fatura encontrada.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-5" /> Valores a Receber (Parceiros)
            </CardTitle>
            <CardDescription>Comissões baseadas nas faturas PAGAS.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Parceiro</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Faturas Pagas</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Comissão a Receber</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {data.partners.map((p: any) => (
                    <tr key={p.partnerId} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                      <td className="p-4 align-middle font-medium">{p.partnerName}</td>
                      <td className="p-4 align-middle">{p.invoicesCount}</td>
                      <td className="p-4 align-middle text-green-600 font-semibold">{BRL(p.totalValue)}</td>
                    </tr>
                  ))}
                  {data.partners.length === 0 && (
                    <tr><td colSpan={3} className="p-4 text-center text-muted-foreground">Nenhum valor a receber no período.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
