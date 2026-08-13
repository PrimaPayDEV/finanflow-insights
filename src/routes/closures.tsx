import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PiggyBank, FileCheck2, ExternalLink, Download, Settings2, Receipt, TrendingUp, DollarSign, PieChart, Banknote, ArrowDownRight, ArrowUpRight, SearchX } from "lucide-react";
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
  getClosureBadgeVariant,
  currentMonth,
  monthLabel,
  monthOptions,
} from "@/lib/format";

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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, staggerChildren: 0.2 }}
            className="mt-6 space-y-8 print:mt-0 print:space-y-0"
          >
          
          <div className="print:min-h-[95vh] print:flex print:flex-col">
          {/* Cabeçalho de Impressão */}
          <div className="hidden print:block mb-8 border-b-2 border-primary pb-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-black text-primary tracking-tight uppercase">Relatório de Fechamento</h1>
              <div className="text-right">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Período</p>
                <p className="text-xl font-bold text-foreground capitalize">{monthLabel(month)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6 bg-muted/20 p-5 rounded-xl border border-primary/20 print:color-adjust-exact print:bg-transparent print:border-border/50">
              <div>
                <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Estabelecimento</p>
                <p className="font-bold text-lg text-foreground">{merchant.name}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">CNPJ</p>
                <p className="font-semibold text-foreground">{merchant.document_cnpj || "Não informado"}</p>
              </div>
              {merchant.email && (
                <div>
                  <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">E-mail</p>
                  <p className="font-semibold text-foreground">{merchant.email}</p>
                </div>
              )}
              {merchant.phone_whatsapp && (
                <div>
                  <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">WhatsApp</p>
                  <p className="font-semibold text-foreground">{merchant.phone_whatsapp}</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Seção 1: Extrato Básico de Movimentações */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="print:flex-1 print:flex print:flex-col print:justify-center print:pb-20 mt-8 print:mt-0">
            <h2 className="text-xl font-bold tracking-tight mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Extrato Básico de Movimentações
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
                <Card className="print:shadow-none print:border print:border-border/50 border-none shadow-card hover:shadow-md transition-all duration-300">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-semibold text-muted-foreground">Pix</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-xl font-bold">{BRL(calc.grossByModality.pix)}</p>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
                <Card className="print:shadow-none print:border print:border-border/50 border-none shadow-card hover:shadow-md transition-all duration-300">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-semibold text-muted-foreground">Débito</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-xl font-bold">{BRL(calc.grossByModality.debit)}</p>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
                <Card className="print:shadow-none print:border print:border-border/50 border-none shadow-card hover:shadow-md transition-all duration-300">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-semibold text-muted-foreground">Crédito à Vista</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-xl font-bold">{BRL(calc.grossByModality.credit_vista)}</p>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
                <Card className="print:shadow-none print:border print:border-border/50 border-none shadow-card hover:shadow-md transition-all duration-300">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-semibold text-muted-foreground">Créd. Parcelado</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-xl font-bold">{BRL(calc.grossByModality.credit_installment)}</p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            <Card className="border-none shadow-card text-center py-4 md:py-6 print:shadow-none print:border print:border-border/50">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm md:text-base font-bold text-muted-foreground uppercase tracking-widest">Faturamento Total</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-4xl md:text-5xl font-black text-primary tracking-tight">{BRL(calc.totalGross)}</p>
              </CardContent>
            </Card>
          </motion.section>
          </div>

          {/* Seção 2: Lançamentos (Despesas e Cobranças) */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="print:break-before-page print:pt-8">
            <h2 className="text-xl font-bold tracking-tight mb-4 flex items-center gap-2 print:text-primary">
              <Receipt className="h-5 w-5 text-muted-foreground print:text-primary" />
              Lançamentos (Despesas e Cobranças)
            </h2>
            <Card className="print:shadow-none print:border print:border-border/50 border-none shadow-card overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/30 print:bg-transparent">
                      <TableRow className="hover:bg-muted/30">
                        <TableHead className="font-semibold text-muted-foreground">Categoria</TableHead>
                        <TableHead className="font-semibold text-muted-foreground">Tipo / Lançamento</TableHead>
                        <TableHead className="font-semibold text-muted-foreground">Descrição</TableHead>
                        <TableHead className="text-right font-semibold text-muted-foreground">Valor (R$)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence mode="popLayout">
                        {exps.length === 0 ? (
                          <motion.tr
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            <TableCell colSpan={4} className="h-48 text-center">
                              <div className="flex flex-col items-center justify-center text-muted-foreground space-y-3">
                                <div className="p-4 bg-muted/30 rounded-full">
                                  <SearchX className="h-8 w-8 opacity-40" />
                                </div>
                                <p className="text-sm font-medium">Nenhum lançamento extra neste mês.</p>
                              </div>
                            </TableCell>
                          </motion.tr>
                        ) : (
                          exps.map((exp) => (
                            <motion.tr 
                              key={exp.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              transition={{ duration: 0.2 }}
                              className="group hover:bg-muted/30 transition-colors"
                            >
                              <TableCell>
                                <Badge variant={exp.category === "cobranca" ? "default" : "destructive"} className="px-2 py-0.5">
                                  {exp.category === "cobranca" ? (
                                    <span className="flex items-center gap-1"><ArrowDownRight className="w-3 h-3" /> Cobrança (-)</span>
                                  ) : (
                                    <span className="flex items-center gap-1"><ArrowUpRight className="w-3 h-3" /> Despesa (+)</span>
                                  )}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 bg-muted/50 rounded-md shrink-0">
                                    <Banknote className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                  <span>
                                    {exp.description.toLowerCase().includes('pix') ? 'Pix' : 
                                     exp.description.toLowerCase().includes('boleto') ? 'Boleto' : 
                                     exp.description.toLowerCase().includes('espécie') || exp.description.toLowerCase().includes('dinheiro') ? 'Dinheiro' : 'Despesa/Pagamento'}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-muted-foreground">{exp.description}</TableCell>
                              <TableCell className="text-right font-bold tracking-tight text-[15px]">
                                <span className={exp.category === "cobranca" ? "text-success group-hover:text-success/80 transition-colors" : "text-destructive group-hover:text-destructive/80 transition-colors"}>
                                  {exp.category === "cobranca" ? "-" : "+"}{BRL(exp.amount)}
                                </span>
                              </TableCell>
                            </motion.tr>
                          ))
                        )}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </motion.section>

          {/* Seção 3: Economia gerada */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="print:mt-12 mt-8">
            <h2 className="text-xl font-bold tracking-tight mb-6 flex items-center gap-2 print:text-primary">
              <TrendingUp className="h-5 w-5 text-muted-foreground print:text-primary" />
              Comparativo e Economia
            </h2>
            
            <div className="flex flex-col gap-6">
              {/* Lado a Lado (Tradicional vs Prima) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-6">
                <Card className="print:shadow-none print:border print:border-border/50 border-none shadow-card bg-slate-50/50">
                  <CardContent className="p-6 md:p-8 flex flex-col justify-center text-center">
                    <h3 className="text-muted-foreground font-bold text-xs md:text-sm uppercase tracking-wider mb-2">Custo no modelo tradicional ({PCT(calc.appliedTraditionalRate)})</h3>
                    <p className="text-3xl md:text-4xl font-bold text-destructive line-through decoration-destructive/40">{BRL(calc.traditionalCost)}</p>
                  </CardContent>
                </Card>

                <Card className="print:shadow-none print:border print:border-border/50 border border-primary/20 shadow-card bg-primary/5">
                  <CardContent className="p-6 md:p-8 flex flex-col justify-center text-center">
                    <h3 className="text-primary font-bold text-xs md:text-sm uppercase tracking-wider mb-2">Custos com a Solução Prima ({PCT(calc.appliedPrimaRate)})</h3>
                    <p className="text-3xl md:text-4xl font-bold text-primary">{BRL(calc.totalMerchantCost)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Destaque Economia */}
              <Card className="overflow-hidden border-none shadow-card bg-success text-success-foreground print:color-adjust-exact print:bg-success/10 print:text-success-foreground print:shadow-none print:border print:border-border/50">
                <div className="p-10 md:p-14 flex flex-col justify-center items-center text-center">
                  <PiggyBank className="w-16 h-16 md:w-20 md:h-20 mb-6 opacity-90 print:text-success" />
                  <h3 className="text-xl md:text-2xl font-bold mb-3 print:text-foreground">Sua economia neste mês foi de:</h3>
                  <p className="text-5xl md:text-7xl font-black tracking-tight drop-shadow-md print:text-success print:drop-shadow-none">
                    {BRL(calc.savings)}
                  </p>
                </div>
              </Card>
            </div>
          </motion.section>

          {/* Ações / Cobrança */}
          <section className="print:hidden pb-10">
            <Card className="border-none shadow-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>Emissão de Cobrança (Asaas)</span>
                  {existing && (
                    <Badge variant={getClosureBadgeVariant(existing.status)}>
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

        </motion.div>
      )}
    </AppLayout>
  );
}
