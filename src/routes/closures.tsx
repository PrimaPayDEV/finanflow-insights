import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { PiggyBank, FileCheck2, ExternalLink, Download, Settings2, Receipt, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  closuresQuery,
  expensesQuery,
  feePlansQuery,
  merchantsQuery,
  splitRulesQuery,
  transactionsQuery,
} from "@/lib/db";
import { calculateClosure } from "@/lib/closure";
import { createAsaasCharge } from "@/lib/asaas.functions";
import {
  BRL,
  PCT,
  closureStatusLabel,
  currentMonth,
  monthLabel,
  monthOptions,
} from "@/lib/format";
import { generateClosureReceiptPDF } from "@/lib/pdf";
import { translateError } from "@/lib/translateError";
import type { Database } from "@/integrations/supabase/types";

type FeePlan = Database["public"]["Tables"]["fee_plans"]["Row"];

export const Route = createFileRoute("/closures")({
  head: () => ({
    meta: [
      { title: "Relatório de Fechamento | Gestão de ECs" },
    ],
  }),
  component: ClosuresPage,
});

function ClosuresPage() {
  const qc = useQueryClient();
  const merchants = useQuery(merchantsQuery);
  const plans = useQuery(feePlansQuery);
  const transactions = useQuery(transactionsQuery);
  const expenses = useQuery(expensesQuery);
  const closures = useQuery(closuresQuery);
  const splits = useQuery(splitRulesQuery);
  const charge = useServerFn(createAsaasCharge);

  const [merchantId, setMerchantId] = useState("");
  const [month, setMonth] = useState(currentMonth());
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const merchant = (merchants.data ?? []).find((m) => m.id === merchantId);
  const plan = (plans.data ?? []).find((p) => p.merchant_id === merchantId);
  const txs = (transactions.data ?? []).filter(
    (t) => t.merchant_id === merchantId && t.transaction_date.slice(0, 7) === month,
  );
  const exps = (expenses.data ?? []).filter(
    (e) => e.merchant_id === merchantId && e.reference_month === month,
  );
  
  const calc = calculateClosure(txs, exps, plan);
  const existing = (closures.data ?? []).find(
    (c) => c.merchant_id === merchantId && c.reference_month === month,
  );
  const merchantSplits = (splits.data ?? []).filter((s) => s.merchant_id === merchantId);

  const approve = useMutation({
    mutationFn: async () => {
      if (!merchant) throw new Error("Selecione um estabelecimento.");
      if (calc.netInvoice <= 0) throw new Error("Valor final precisa ser maior que zero.");

      const { data: saved, error } = await supabase
        .from("closures")
        .upsert(
          {
            merchant_id: merchant.id,
            reference_month: month,
            total_gross_volume: calc.totalGross,
            total_op_fee_amount: calc.totalOpFee,
            total_expenses: calc.totalExpenses,
            net_invoice_amount: calc.netInvoice,
            traditional_cost_estimate: calc.traditionalCost,
            savings_amount: calc.savings,
            status: "closed",
          },
          { onConflict: "merchant_id,reference_month" },
        )
        .select("id")
        .single();
      if (error) throw new Error(error.message);

      const res = await charge({
        data: {
          closureId: saved.id,
          customer: {
            name: merchant.name,
            cpfCnpj: merchant.document_cnpj.replace(/\D/g, ""),
            email: merchant.email,
            phone: merchant.phone_whatsapp,
          },
          value: Number(calc.netInvoice.toFixed(2)),
          description: `Taxa operacional ${monthLabel(month)} - ${merchant.name}`,
          splits: merchantSplits.map((s) => ({
            walletId: s.partner_asaas_wallet_id,
            percentualValue: Number(s.percentage),
          })),
        },
      });

      if (!res.ok) throw new Error(res.error);
      return res;
    },
    onSuccess: (res) => {
      toast.success("Cobrança gerada no Asaas");
      if (res?.invoiceUrl) window.open(res.invoiceUrl, "_blank", "noopener");
      qc.invalidateQueries({ queryKey: ["closures"] });
    },
    onError: (e: Error) => toast.error(translateError(e.message)),
  });

  const updatePlan = useMutation({
    mutationFn: async (updatedPlan: Partial<FeePlan>) => {
      if (!merchant) return;
      const { error } = await supabase
        .from("fee_plans")
        .upsert({ ...updatedPlan, merchant_id: merchant.id } as any);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Taxas atualizadas com sucesso!");
      qc.invalidateQueries({ queryKey: ["fee_plans"] });
      setIsConfigOpen(false);
    },
    onError: (e: Error) => toast.error(translateError(e.message)),
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <AppLayout 
      title="Relatório de Fechamento" 
      subtitle="Extrato mensal, custos e economia gerada"
      actions={
        merchant ? (
          <div className="flex gap-2 print:hidden">
            <Sheet open={isConfigOpen} onOpenChange={setIsConfigOpen}>
              <SheetTrigger asChild>
                <Button variant="outline">
                  <Settings2 className="mr-2 h-4 w-4" /> Configurar Taxas
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Configurar Taxas</SheetTitle>
                  <SheetDescription>
                    Altere as taxas deste EC para testar o cálculo do painel de economia em tempo real.
                    Os valores são em percentual (ex: 1.5 para 1,5%).
                  </SheetDescription>
                </SheetHeader>
                {plan && (
                  <form 
                    className="space-y-4 mt-6"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      updatePlan.mutate({
                        id: plan.id,
                        pix_rate: Number(formData.get("pix_rate")),
                        debit_rate: Number(formData.get("debit_rate")),
                        credit_vista_rate: Number(formData.get("credit_vista_rate")),
                        credit_installment_rate: Number(formData.get("credit_installment_rate")),
                        cash_rate: Number(formData.get("cash_rate")),
                      });
                    }}
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Taxa Pix (%)</Label>
                        <Input name="pix_rate" type="number" step="0.01" defaultValue={plan.pix_rate} />
                      </div>
                      <div className="space-y-2">
                        <Label>Taxa Débito (%)</Label>
                        <Input name="debit_rate" type="number" step="0.01" defaultValue={plan.debit_rate} />
                      </div>
                      <div className="space-y-2">
                        <Label>Taxa Créd. Vista (%)</Label>
                        <Input name="credit_vista_rate" type="number" step="0.01" defaultValue={plan.credit_vista_rate} />
                      </div>
                      <div className="space-y-2">
                        <Label>Taxa Créd. Parcelado (%)</Label>
                        <Input name="credit_installment_rate" type="number" step="0.01" defaultValue={plan.credit_installment_rate} />
                      </div>
                      <div className="col-span-2 space-y-2">
                        <Label>Taxa Dinheiro/Espécie (%)</Label>
                        <Input name="cash_rate" type="number" step="0.01" defaultValue={plan.cash_rate} />
                      </div>
                    </div>
                    <Button type="submit" className="w-full mt-4" disabled={updatePlan.isPending}>
                      Salvar Alterações
                    </Button>
                  </form>
                )}
              </SheetContent>
            </Sheet>
            <Button variant="outline" onClick={handlePrint}>
              <Download className="mr-2 h-4 w-4" /> Exportar PDF
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:max-w-2xl print:hidden">
        <Select value={merchantId} onValueChange={setMerchantId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o estabelecimento" />
          </SelectTrigger>
          <SelectContent>
            {(merchants.data ?? []).map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions().map((m) => (
              <SelectItem key={m} value={m}>
                {monthLabel(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!merchant ? (
        <Card className="mt-6">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            Selecione um EC e o mês para gerar o relatório de fechamento.
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 space-y-8 print:mt-0 print:space-y-10">
          
          {/* Seção 1: Extrato Básico de Movimentações */}
          <section>
            <h2 className="text-xl font-bold tracking-tight mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Extrato Básico de Movimentações
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <Card className="print:shadow-none print:border-border">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Pix</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-xl font-semibold">{BRL(calc.grossByModality.pix)}</p>
                </CardContent>
              </Card>
              <Card className="print:shadow-none print:border-border">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Débito</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-xl font-semibold">{BRL(calc.grossByModality.debit)}</p>
                </CardContent>
              </Card>
              <Card className="print:shadow-none print:border-border">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Crédito à Vista</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-xl font-semibold">{BRL(calc.grossByModality.credit_vista)}</p>
                </CardContent>
              </Card>
              <Card className="print:shadow-none print:border-border">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Créd. Parcelado</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-xl font-semibold">{BRL(calc.grossByModality.credit_installment)}</p>
                </CardContent>
              </Card>
              <Card className="bg-primary text-primary-foreground print:bg-transparent print:text-foreground print:shadow-none print:border-2 print:border-primary col-span-2 lg:col-span-1">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-medium opacity-90 print:text-primary">Faturamento Total</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-2xl font-bold">{BRL(calc.totalGross)}</p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Seção 2: Lançamento de Despesas */}
          <section>
            <h2 className="text-xl font-bold tracking-tight mb-4 flex items-center gap-2">
              <Receipt className="h-5 w-5 text-muted-foreground" />
              Lançamento de Despesas
            </h2>
            <Card className="print:shadow-none print:border print:border-border overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/50 print:bg-transparent">
                      <TableRow>
                        <TableHead>Tipo / Lançamento</TableHead>
                        <TableHead>Descrição do Fornecedor</TableHead>
                        <TableHead className="text-right">Valor (R$)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {exps.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                            Nenhuma despesa lançada neste mês.
                          </TableCell>
                        </TableRow>
                      ) : (
                        exps.map((exp) => (
                          <TableRow key={exp.id}>
                            <TableCell className="font-medium">
                              {/* If no exact type is in DB, infer from description or default to Pagamento */}
                              {exp.description.toLowerCase().includes('pix') ? 'Pix' : 
                               exp.description.toLowerCase().includes('boleto') ? 'Boleto' : 
                               exp.description.toLowerCase().includes('espécie') || exp.description.toLowerCase().includes('dinheiro') ? 'Dinheiro' : 'Despesa/Pagamento'}
                            </TableCell>
                            <TableCell>{exp.description}</TableCell>
                            <TableCell className="text-right">{BRL(exp.amount)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-end p-4 bg-muted/20 border-t print:bg-transparent">
                  <div className="flex items-center gap-8">
                    <span className="font-medium text-muted-foreground">Total de Despesas:</span>
                    <span className="text-lg font-bold text-destructive">{BRL(calc.totalExpenses)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Seção 3: Painel de Economia */}
          <section className="break-inside-avoid print:break-inside-avoid">
            <Card className="bg-success text-success-foreground overflow-hidden shadow-lg border-none print:shadow-none print:bg-transparent print:text-foreground print:border print:border-border">
              <div className="flex flex-col">
                <div className="grid grid-cols-2 p-6 md:p-10 gap-6">
                  <div>
                    <h3 className="text-success-foreground/80 font-medium text-sm uppercase tracking-wide print:text-muted-foreground">Custos no Meio Tradicional ({PCT(calc.appliedTraditionalRate)})</h3>
                    <p className="text-2xl md:text-3xl font-semibold line-through opacity-75">{BRL(calc.traditionalCost)}</p>
                  </div>
                  <div>
                    <h3 className="text-success-foreground/80 font-medium text-sm uppercase tracking-wide print:text-muted-foreground">Custos com a Solução Prima ({PCT(calc.appliedPrimaRate)})</h3>
                    <p className="text-2xl md:text-3xl font-semibold">{BRL(calc.totalOpFee)}</p>
                  </div>
                </div>
                
                <div className="bg-white/10 p-8 md:p-10 flex flex-col justify-center items-center text-center print:bg-success/5 print:border-t">
                  <PiggyBank className="w-12 h-12 md:w-16 md:h-16 mb-4 opacity-90 print:text-success" />
                  <h3 className="text-lg md:text-xl font-medium mb-2 print:text-foreground">Sua economia neste mês foi de:</h3>
                  <p className="text-4xl md:text-6xl font-black tracking-tight drop-shadow-md print:text-success print:drop-shadow-none">
                    {BRL(calc.savings)}
                  </p>
                </div>
              </div>
            </Card>
          </section>

          {/* Ações / Cobrança */}
          <section className="print:hidden pb-10">
            <Card className="border-border">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>Emissão de Cobrança (Asaas)</span>
                  {existing && (
                    <Badge variant={existing.status === "paid" ? "default" : "secondary"}>
                      {closureStatusLabel[existing.status]}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-muted/50 p-4 rounded-lg border">
                  <div>
                    <p className="font-semibold text-lg">{BRL(calc.netInvoice)}</p>
                    <p className="text-sm text-muted-foreground">
                      Boleto com Pix híbrido, vencimento em 5 dias.
                      {merchantSplits.length > 0
                        ? ` Split ativo para ${merchantSplits.length} parceiro(s).`
                        : " Nenhum split configurado."}
                    </p>
                  </div>
                  <div className="flex gap-3 w-full sm:w-auto">
                    {existing?.asaas_invoice_url && (
                      <Button variant="outline" asChild className="w-full sm:w-auto">
                        <a href={existing.asaas_invoice_url} target="_blank" rel="noopener noreferrer">
                          Ver Fatura <ExternalLink className="ml-2 h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    <Button
                      className="w-full sm:w-auto"
                      onClick={() => approve.mutate()}
                      disabled={approve.isPending || calc.netInvoice <= 0}
                    >
                      <FileCheck2 className="mr-2 h-4 w-4" /> {existing ? 'Regerar Cobrança' : 'Aprovar e Gerar Boleto'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

        </div>
      )}
    </AppLayout>
  );
}
