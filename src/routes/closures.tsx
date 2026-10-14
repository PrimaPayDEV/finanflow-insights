import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PiggyBank,
  FileCheck2,
  ExternalLink,
  Download,
  Settings2,
  Receipt,
  TrendingUp,
  DollarSign,
  PieChart,
  Banknote,
  ArrowDownRight,
  ArrowUpRight,
  SearchX,
  MessageCircle,
  Store,
  Calendar,
  Sparkles,
  CreditCard,
  Layers,
  Save,
  CheckCircle2,
  AlertCircle,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  TableFooter,
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
  importsQuery,
} from "@/lib/db";
import { calculateClosure, getModalityRate, getTraditionalRate, getMaxDiscountRate } from "@/lib/closure";
import { createAsaasCharge } from "@/lib/asaas.functions";
import {
  BRL,
  PCT,
  closureStatusLabel,
  getClosureBadgeVariant,
  currentMonth,
  monthLabel,
  monthOptions,
  modalityLabel,
} from "@/lib/format";
import { format } from "date-fns";

import { translateError } from "@/lib/translateError";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";

type FeePlan = Database["public"]["Tables"]["fee_plans"]["Row"];

export const Route = createFileRoute("/closures")({
  head: () => ({
    meta: [
      { title: "Relatório de Fechamento | Gestão de ECs" },
      {
        name: "description",
        content: "Extrato mensal consolidado, cálculo de taxas negociadas e apuração de economia por estabelecimento.",
      },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { companyId, companyName, logoUrl } = useAuth();
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
  const importsData = useQuery(importsQuery);

  const importsMap = useMemo(() => {
    const map = new Map<string, string>();
    (importsData.data ?? []).forEach((i) => map.set(i.id, i.reference_month));
    return map;
  }, [importsData.data]);

  const txs = (transactions.data ?? []).filter((t) => {
    if (t.merchant_id !== merchantId) return false;
    const refMonth = t.import_id ? importsMap.get(t.import_id) : t.transaction_date.slice(0, 7);
    return refMonth === month;
  });
  const exps = (expenses.data ?? []).filter(
    (e) => e.merchant_id === merchantId && e.reference_month === month,
  );

  const calc = calculateClosure(txs, exps, plan);
  const existing = (closures.data ?? []).find(
    (c) => c.merchant_id === merchantId && c.reference_month === month,
  );
  const merchantSplits = (splits.data ?? []).filter((s) => s.merchant_id === merchantId);

  const totalGross = calc.totalGross;
  const pixPct = totalGross > 0 ? (calc.grossByModality.pix / totalGross) * 100 : 0;
  const debitPct = totalGross > 0 ? (calc.grossByModality.debit / totalGross) * 100 : 0;
  const creditVistaPct = totalGross > 0 ? (calc.grossByModality.credit_vista / totalGross) * 100 : 0;
  const creditInstallmentPct = totalGross > 0 ? (calc.grossByModality.credit_installment / totalGross) * 100 : 0;

  const totalExpensesSum = useMemo(() => {
    return exps.reduce((acc, exp) => {
      return exp.category === "cobranca" ? acc + Number(exp.amount) : acc - Number(exp.amount);
    }, 0);
  }, [exps]);

  const totalsDetailed = useMemo(() => {
    let totalGross = 0;
    let totalDiscounted = 0;
    let totalOpValue = 0;

    for (const tx of txs) {
      const gross = Number(tx.gross_amount);
      let discountedValue = 0;
      let tradRate = 0;
      if (tx.net_amount !== null && tx.net_amount !== undefined) {
        discountedValue = gross - Number(tx.net_amount);
        tradRate = gross > 0 ? (discountedValue / gross) * 100 : 0;
      } else {
        tradRate = getTraditionalRate(tx, plan);
        discountedValue = gross * (tradRate / 100);
      }
      const maxDiscountRate = getMaxDiscountRate(tx, plan);
      const opRate = Math.max(0, maxDiscountRate - tradRate);
      const opValue = gross * (opRate / 100);

      totalGross += gross;
      totalDiscounted += discountedValue;
      totalOpValue += opValue;
    }

    const avgDiscountRate = totalGross > 0 ? (totalDiscounted / totalGross) * 100 : 0;
    const avgOpRate = totalGross > 0 ? (totalOpValue / totalGross) * 100 : 0;

    return {
      totalGross,
      totalDiscounted,
      totalOpValue,
      avgDiscountRate,
      avgOpRate,
    };
  }, [txs, plan]);

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
            ...(existing
              ? { reissued_at: new Date().toISOString(), created_at: existing.created_at }
              : { created_at: new Date().toISOString() }),
          },
          { onConflict: "merchant_id,reference_month" },
        )
        .select("id")
        .single();
      if (error) throw new Error(error.message);

      const res = await charge({
        data: {
          companyId: companyId!,
          closureId: saved.id,
          customer: {
            name: merchant.name,
            cpfCnpj: merchant.document_cnpj.replace(/\D/g, ""),
            email: merchant.email,
            phone: merchant.phone_whatsapp?.replace(/\D/g, ""),
          },
          value: Number(calc.netInvoice.toFixed(2)),
          description: `Taxa operacional ${monthLabel(month)} - ${merchant.name}\n\nRelatório de Economia: ${window.location.origin}/public/report/${saved.id}`,
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
      toast.success("Cobrança gerada no Asaas com sucesso!");
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
      subtitle="Extrato mensal, custos comparativos e apuração de economia"
      actions={
        merchant ? (
          <div className="flex items-center gap-2 print:hidden">
            <Sheet open={isConfigOpen} onOpenChange={setIsConfigOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 shadow-2xs font-medium">
                  <Settings2 className="size-3.5" />
                  <span>Configurar Taxas</span>
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[400px] sm:w-[500px] overflow-y-auto rounded-l-2xl">
                <SheetHeader className="pb-3 border-b">
                  <div className="flex items-center gap-2 text-primary mb-1">
                    <Settings2 className="size-5" />
                    <SheetTitle>Configurar Taxas de {merchant.name}</SheetTitle>
                  </div>
                  <SheetDescription>
                    Altere as taxas deste EC para simular o fechamento e a economia em tempo real.
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
                        fixed_rate_percent: Number(formData.get("fixed_rate_percent")),
                        pix_rate: Number(formData.get("pix_rate")),
                        debit_rate: Number(formData.get("debit_rate")),
                        credit_vista_rate: Number(formData.get("credit_vista_rate")),
                        credit_installment_rate: Number(formData.get("credit_installment_rate")),
                      });
                    }}
                  >
                    <div className="space-y-1.5 p-3 rounded-xl bg-primary/5 border border-primary/20">
                      <Label className="text-xs font-bold text-primary">Taxa Operacional Variável (%)</Label>
                      <Input
                        name="fixed_rate_percent"
                        type="number"
                        step="0.01"
                        defaultValue={plan.fixed_rate_percent}
                        className="bg-background font-mono"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Taxa Pix (%)</Label>
                        <Input
                          name="pix_rate"
                          type="number"
                          step="0.01"
                          defaultValue={plan.pix_rate}
                          className="bg-background font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Taxa Débito (%)</Label>
                        <Input
                          name="debit_rate"
                          type="number"
                          step="0.01"
                          defaultValue={plan.debit_rate}
                          className="bg-background font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Taxa Créd. Vista (%)</Label>
                        <Input
                          name="credit_vista_rate"
                          type="number"
                          step="0.01"
                          defaultValue={plan.credit_vista_rate}
                          className="bg-background font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Taxa Créd. Parc. (%)</Label>
                        <Input
                          name="credit_installment_rate"
                          type="number"
                          step="0.01"
                          defaultValue={plan.credit_installment_rate}
                          className="bg-background font-mono"
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full mt-6 gap-2" disabled={updatePlan.isPending}>
                      <Save className="size-4" />
                      {updatePlan.isPending ? "Salvando..." : "Salvar Alterações"}
                    </Button>
                  </form>
                )}
              </SheetContent>
            </Sheet>
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 shadow-2xs font-medium">
              <Download className="size-3.5" />
              <span>Exportar PDF</span>
            </Button>
          </div>
        ) : undefined
      }
    >
      {/* Barra de Filtros Principais (EC e Mês) - Ajustada à largura da página */}
      <Card className="w-full rounded-2xl border border-border/80 shadow-card bg-card print:hidden overflow-hidden">
        <CardContent className="p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12 items-end">
            <div className="space-y-1.5 sm:col-span-1 lg:col-span-8">
              <Label className="text-xs font-bold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider">
                <Store className="size-3.5 text-primary" /> Estabelecimento (EC)
              </Label>
              <Select value={merchantId} onValueChange={setMerchantId}>
                <SelectTrigger className="h-11 bg-background rounded-xl border-border/80 font-medium text-sm">
                  <SelectValue placeholder="Selecione o estabelecimento" />
                </SelectTrigger>
                <SelectContent className="rounded-xl max-h-72">
                  {(merchants.data ?? []).map((m) => (
                    <SelectItem key={m.id} value={m.id} className="py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{m.name}</span>
                        {m.document_cnpj && (
                          <span className="text-[11px] text-muted-foreground font-mono">
                            • {m.document_cnpj}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-1 lg:col-span-4">
              <Label className="text-xs font-bold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider">
                <Calendar className="size-3.5 text-primary" /> Mês de Referência
              </Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="h-11 bg-background rounded-xl border-border/80 font-medium text-sm capitalize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl max-h-72">
                  {monthOptions().map((m) => (
                    <SelectItem key={m} value={m} className="capitalize py-2">
                      {monthLabel(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {!merchant ? (
        <Card className="mt-6 border border-dashed border-border/90 shadow-none rounded-2xl bg-muted/10">
          <CardContent className="p-12 text-center text-sm text-muted-foreground flex flex-col items-center justify-center space-y-3">
            <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <FileCheck2 className="size-7 opacity-60" />
            </div>
            <div>
              <p className="font-bold text-foreground">Nenhum estabelecimento selecionado</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Selecione um estabelecimento e o mês acima para carregar o extrato e calcular o fechamento.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="mt-6 space-y-6 print:mt-0 print:space-y-2.5"
        >
          {/* =========================================================================
              PÁGINA 1: RESUMO EXECUTIVO (PREENCHE A PÁGINA 1 ATÉ O FINAL)
              ========================================================================= */}
          <div className="space-y-6 print:space-y-0 print-page-1">
            {/* =========================================================================
                CABEÇALHO DE IMPRESSÃO (SEM PRIMA HUB, COM IDENTIFICAÇÃO E PERÍODO)
                ========================================================================= */}
            <div className="hidden print:block border-b-2 border-primary/20 pb-3">
              <div className="flex justify-between items-center mb-2.5">
                <h1 className="text-2xl font-black text-primary tracking-tight uppercase">
                  Relatório de Fechamento
                </h1>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Período</p>
                  <p className="text-base font-bold text-foreground capitalize">{monthLabel(month)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/20 p-2.5 rounded-xl border border-primary/20 print:grid-cols-4 print:gap-2 print:p-2.5 text-xs">
                <div>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-0.5">Estabelecimento</p>
                  <p className="font-bold text-xs text-foreground truncate">{merchant.name}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-0.5">CNPJ</p>
                  <p className="font-semibold text-xs text-foreground font-mono">{merchant.document_cnpj || "Não informado"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-0.5">E-mail</p>
                  <p className="font-semibold text-xs text-foreground truncate">{merchant.email || "Não informado"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-0.5">WhatsApp</p>
                  <p className="font-semibold text-xs text-foreground">{merchant.phone_whatsapp || "Não informado"}</p>
                </div>
              </div>
            </div>

            {/* =========================================================================
                SEÇÃO 1: EXTRATO BÁSICO DE MOVIMENTAÇÕES
                ========================================================================= */}
            <section className="space-y-2.5 print:space-y-2 print:break-inside-avoid">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="size-4 text-primary" />
                <h2 className="text-base font-bold tracking-tight text-foreground print:text-sm">
                  Extrato Básico de Movimentações
                </h2>
              </div>

              {/* Demonstrando o valor recebido em cada operação */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4 print:gap-2.5">
                {/* PIX */}
                <Card className="rounded-xl border border-border/80 shadow-card bg-card overflow-hidden hover:border-emerald-500/40 transition-colors p-3.5 print:p-3 print:shadow-none">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide print:text-[10px]">
                      Pix
                    </span>
                    <Sparkles className="size-3.5 text-emerald-500" />
                  </div>
                  <p className="text-xl sm:text-2xl font-black text-foreground font-mono print:text-lg">
                    {BRL(calc.grossByModality.pix)}
                  </p>
                </Card>

                {/* DÉBITO */}
                <Card className="rounded-xl border border-border/80 shadow-card bg-card overflow-hidden hover:border-blue-500/40 transition-colors p-3.5 print:p-3 print:shadow-none">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide print:text-[10px]">
                      Débito
                    </span>
                    <CreditCard className="size-3.5 text-blue-500" />
                  </div>
                  <p className="text-xl sm:text-2xl font-black text-foreground font-mono print:text-lg">
                    {BRL(calc.grossByModality.debit)}
                  </p>
                </Card>

                {/* CRÉDITO À VISTA */}
                <Card className="rounded-xl border border-border/80 shadow-card bg-card overflow-hidden hover:border-violet-500/40 transition-colors p-3.5 print:p-3 print:shadow-none">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide print:text-[10px]">
                      Crédito à Vista
                    </span>
                    <CreditCard className="size-3.5 text-violet-500" />
                  </div>
                  <p className="text-xl sm:text-2xl font-black text-foreground font-mono print:text-lg">
                    {BRL(calc.grossByModality.credit_vista)}
                  </p>
                </Card>

                {/* CRÉDITO PARCELADO */}
                <Card className="rounded-xl border border-border/80 shadow-card bg-card overflow-hidden hover:border-primary/40 transition-colors p-3.5 print:p-3 print:shadow-none">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide print:text-[10px]">
                      Créd. Parcelado
                    </span>
                    <Layers className="size-3.5 text-primary" />
                  </div>
                  <p className="text-xl sm:text-2xl font-black text-foreground font-mono print:text-lg">
                    {BRL(calc.grossByModality.credit_installment)}
                  </p>
                </Card>
              </div>

              {/* Destacando o Faturamento Total Bruto */}
              <Card className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-primary/2 to-transparent shadow-card text-center py-3.5 px-4 print:shadow-none print:py-2.5 print:px-4">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-0.5 print:text-[10px]">
                  Faturamento Total Bruto
                </span>
                <p className="text-3xl sm:text-4xl font-black text-primary tracking-tight font-mono print:text-2xl">
                  {BRL(calc.totalGross)}
                </p>
              </Card>
            </section>

            {/* =========================================================================
                SEÇÃO 2: LANÇAMENTOS DO MÊS (COBRANÇAS E DEDUÇÕES)
                ========================================================================= */}
            <section className="space-y-2.5 print:space-y-2 print:break-inside-avoid">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Receipt className="size-4 text-primary" />
                  <h2 className="text-base font-bold tracking-tight text-foreground print:text-sm">
                    Lançamentos (Cobranças e Deduções)
                  </h2>
                </div>
                <Badge variant="secondary" className="font-mono text-xs print:text-[10px] print:h-5">
                  {exps.length} {exps.length === 1 ? "lançamento" : "lançamentos"}
                </Badge>
              </div>

              <Card className="rounded-xl border border-border/80 shadow-card bg-card overflow-hidden print:overflow-visible print:shadow-none print:border-border/60">
                <CardContent className="p-0 print:overflow-visible">
                  <div className="overflow-x-auto print:overflow-visible">
                    <Table className="print:w-full">
                      <TableHeader className="bg-muted/40 print:table-header-group">
                        <TableRow className="print:table-row">
                          <TableHead className="font-semibold text-xs py-2 print:py-1.5 print:px-3 w-40">Categoria</TableHead>
                          <TableHead className="font-semibold text-xs py-2 print:py-1.5 print:px-3">Descrição</TableHead>
                          <TableHead className="text-right font-semibold text-xs py-2 print:py-1.5 print:px-3 w-48">Impacto no Boleto (R$)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="print:table-row-group">
                        {exps.length === 0 ? (
                          <TableRow className="print:table-row">
                            <TableCell colSpan={3} className="py-3 text-center text-muted-foreground text-xs italic print:py-2">
                              Nenhum lançamento extra registrado para este mês.
                            </TableCell>
                          </TableRow>
                        ) : (
                          exps.map((exp) => (
                            <TableRow key={exp.id} className="hover:bg-muted/30 transition-colors print:table-row print:break-inside-avoid">
                              <TableCell className="py-1.5 print:py-1 print:px-3">
                                <Badge
                                  variant={exp.category === "cobranca" ? "outline" : "destructive"}
                                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                    exp.category === "cobranca"
                                      ? "text-emerald-600 border-emerald-500/30 bg-emerald-500/10"
                                      : ""
                                  }`}
                                >
                                  {exp.category === "cobranca" ? (
                                    <span className="flex items-center gap-1">
                                      <ArrowDownRight className="size-3" /> Dedução (-)
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1">
                                      <ArrowUpRight className="size-3" /> Cobrança (+)
                                    </span>
                                  )}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium text-xs text-foreground py-1.5 print:py-1 print:px-3">
                                {exp.description}
                              </TableCell>
                              <TableCell className="text-right font-bold font-mono text-xs py-1.5 print:py-1 print:px-3">
                                <span
                                  className={
                                    exp.category === "cobranca"
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : "text-destructive"
                                  }
                                >
                                  {exp.category === "cobranca" ? "-" : "+"}
                                  {BRL(exp.amount)}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                      {exps.length > 0 && (
                        <TableFooter className="bg-muted/40 font-bold border-t print:table-footer-group">
                          <TableRow className="print:table-row">
                            <TableCell colSpan={2} className="text-xs font-bold py-1.5 print:py-1 print:px-3 text-muted-foreground">
                              Subtotal de Lançamentos ({exps.length} {exps.length === 1 ? "item" : "itens"}):
                            </TableCell>
                            <TableCell className="text-right font-black font-mono text-xs py-1.5 print:py-1 print:px-3">
                              <span className={totalExpensesSum >= 0 ? "text-foreground" : "text-emerald-600"}>
                                {totalExpensesSum >= 0 ? "+" : "-"} {BRL(Math.abs(totalExpensesSum))}
                              </span>
                            </TableCell>
                          </TableRow>
                        </TableFooter>
                      )}
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* =========================================================================
                SEÇÃO 3: COMPARATIVO E ECONOMIA GERADA PELA NOSSA SOLUÇÃO (MAIOR DESTAQUE)
                ========================================================================= */}
            <section className="space-y-3 print:space-y-2.5 print:break-inside-avoid">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="size-4 text-primary" />
                <h2 className="text-base font-bold tracking-tight text-foreground print:text-sm">
                  Comparativo e Economia Gerada
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-3 print:grid-cols-2 print:gap-2.5">
                <Card className="rounded-xl border border-border/80 shadow-card bg-muted/20 text-center p-3.5 print:p-2.5 print:shadow-none">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">
                    Custo no Modelo Tradicional
                  </span>
                  <p className="text-2xl sm:text-3xl font-bold text-destructive/80 line-through decoration-destructive/60 font-mono print:text-xl">
                    {BRL(calc.traditionalCost)}
                  </p>
                </Card>

                <Card className="rounded-xl border border-primary/30 shadow-card bg-primary/5 text-center p-3.5 print:p-2.5 print:shadow-none">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider block mb-0.5">
                    Custos com a Solução Prima
                  </span>
                  <p className="text-2xl sm:text-3xl font-extrabold text-primary font-mono print:text-xl">
                    {BRL(calc.totalMerchantCost)}
                  </p>
                </Card>
              </div>

              {/* O MAIOR DESTAQUE: CARD DE ECONOMIA GERADA PELA NOSSA SOLUÇÃO */}
              <Card className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-700 text-white shadow-xl overflow-hidden p-6 sm:p-8 text-center print:p-4.5 print:rounded-2xl print:shadow-none">
                <div className="flex flex-col items-center justify-center space-y-2 print:space-y-1">
                  <div className="size-12 sm:size-14 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white shadow-inner print:size-9">
                    <PiggyBank className="size-6 sm:size-8 print:size-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base sm:text-lg font-bold text-white/95 print:text-sm">
                      Sua economia real apurada neste mês:
                    </h3>
                    <p className="text-4xl sm:text-5xl font-black tracking-tight text-white font-mono drop-shadow-sm print:text-4xl">
                      {BRL(calc.savings)}
                    </p>
                    <p className="text-xs text-white/80 font-medium print:text-[11px]">
                      Valor líquido economizado pelo seu estabelecimento com a plataforma PrimaPay
                    </p>
                  </div>
                </div>
              </Card>
            </section>
          </div>

          {/* =========================================================================
              SEÇÃO 4: RELATÓRIO DETALHADO DE VENDAS (INICIA LIMPO NA PÁGINA 2)
              ========================================================================= */}
          <section className="space-y-4 print:space-y-3 print:pt-4 print-page-break print:[break-before:page]">
            {/* Mini-header de impressão para a página 2 em diante */}
            <div className="hidden print:flex items-center justify-between pb-2 mb-2 border-b border-border/70 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground uppercase">{merchant.name}</span>
                {merchant.document_cnpj && <span className="text-muted-foreground font-mono">• {merchant.document_cnpj}</span>}
              </div>
              <div className="font-semibold text-muted-foreground capitalize">
                Fechamento de {monthLabel(month)}
              </div>
            </div>

            <div className="flex items-center justify-between print:mb-2 print:break-after-avoid">
              <div className="flex items-center gap-2">
                <Banknote className="size-5 text-primary" />
                <h2 className="text-lg font-bold tracking-tight text-foreground">
                  Relatório Detalhado de Vendas
                </h2>
              </div>
              <Badge variant="secondary" className="font-mono text-xs">
                {txs.length} {txs.length === 1 ? "venda" : "vendas"}
              </Badge>
            </div>

            <Card className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden print:overflow-visible print:border print:border-border/60 print:shadow-none print:rounded-xl">
              <CardContent className="p-0 print:overflow-visible">
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto scrollbar-thin print:max-h-none print:overflow-visible print:h-auto">
                  <Table className="print:w-full">
                    <TableHeader className="bg-muted/40 sticky top-0 z-10 backdrop-blur-xs print:static print:table-header-group">
                      <TableRow className="print:table-row">
                        <TableHead className="font-semibold text-xs print:py-1.5 print:px-2 print:text-foreground">Data</TableHead>
                        <TableHead className="font-semibold text-xs print:py-1.5 print:px-2 print:text-foreground">Modalidade</TableHead>
                        <TableHead className="text-right font-semibold text-xs print:py-1.5 print:px-2 print:text-foreground">Vlr. Bruto</TableHead>
                        <TableHead className="text-right font-semibold text-xs print:py-1.5 print:px-2 print:text-foreground">Vlr. Descontado</TableHead>
                        <TableHead className="text-right font-semibold text-xs print:py-1.5 print:px-2 print:text-foreground">% Descontado</TableHead>
                        <TableHead className="text-right font-semibold text-xs print:py-1.5 print:px-2 print:text-foreground">% Taxa Op.</TableHead>
                        <TableHead className="text-right font-semibold text-xs print:py-1.5 print:px-2 print:text-foreground">Vlr. Taxa Op.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="print:table-row-group">
                      {txs.length === 0 ? (
                        <TableRow className="print:table-row">
                          <TableCell colSpan={7} className="h-28 text-center text-muted-foreground text-sm print:h-12">
                            Nenhuma venda registrada neste período.
                          </TableCell>
                        </TableRow>
                      ) : (
                        txs.map((tx) => {
                          const gross = Number(tx.gross_amount);

                          let discountedValue = 0;
                          let tradRate = 0;
                          if (tx.net_amount !== null && tx.net_amount !== undefined) {
                            discountedValue = gross - Number(tx.net_amount);
                            tradRate = gross > 0 ? (discountedValue / gross) * 100 : 0;
                          } else {
                            tradRate = getTraditionalRate(tx, plan);
                            discountedValue = gross * (tradRate / 100);
                          }

                          const maxDiscountRate = getMaxDiscountRate(tx, plan);
                          const opRate = Math.max(0, maxDiscountRate - tradRate);
                          const opValue = gross * (opRate / 100);

                          return (
                            <TableRow key={tx.id} className="hover:bg-muted/30 transition-colors print:table-row print:break-inside-avoid print:page-break-inside-avoid">
                              <TableCell className="font-medium whitespace-nowrap text-xs font-mono print:py-1.5 print:px-2">
                                {format(new Date(tx.transaction_date), "dd/MM/yyyy")}
                              </TableCell>
                              <TableCell className="capitalize text-xs font-medium print:py-1.5 print:px-2">
                                {modalityLabel(tx.modality as any)}
                              </TableCell>
                              <TableCell className="text-right font-medium text-xs font-mono print:py-1.5 print:px-2">
                                {BRL(gross)}
                              </TableCell>
                              <TableCell className="text-right text-destructive font-medium text-xs font-mono print:py-1.5 print:px-2">
                                {BRL(discountedValue)}
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground text-xs font-mono print:py-1.5 print:px-2">
                                {tradRate.toFixed(2)}%
                              </TableCell>
                              <TableCell className="text-right font-medium text-xs font-mono print:py-1.5 print:px-2">
                                {opRate.toFixed(2)}%
                              </TableCell>
                              <TableCell className="text-right font-bold text-primary text-xs font-mono print:py-1.5 print:px-2">
                                {BRL(opValue)}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                    {txs.length > 0 && (
                      <TableFooter className="bg-muted/50 font-bold border-t sticky bottom-0 z-10 backdrop-blur-xs print:static print:table-footer-group">
                        <TableRow className="print:table-row print:break-inside-avoid print:page-break-inside-avoid">
                          <TableCell colSpan={2} className="text-xs font-bold print:py-2 print:px-2">
                            Totais ({txs.length} vendas)
                          </TableCell>
                          <TableCell className="text-right font-bold font-mono text-xs print:py-2 print:px-2">
                            {BRL(totalsDetailed.totalGross)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-destructive font-mono text-xs print:py-2 print:px-2">
                            {BRL(totalsDetailed.totalDiscounted)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-muted-foreground font-mono text-xs print:py-2 print:px-2">
                            {totalsDetailed.avgDiscountRate.toFixed(2)}%
                          </TableCell>
                          <TableCell className="text-right font-bold font-mono text-xs print:py-2 print:px-2">
                            {totalsDetailed.avgOpRate.toFixed(2)}%
                          </TableCell>
                          <TableCell className="text-right font-black text-primary text-sm font-mono print:py-2 print:px-2">
                            {BRL(totalsDetailed.totalOpValue)}
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    )}
                  </Table>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* =========================================================================
              SEÇÃO 5: EMISSÃO DE COBRANÇA (ASAAS)
              ========================================================================= */}
          <section className="print:hidden pb-10">
            <Card className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden">
              <CardHeader className="p-5 pb-3 border-b border-border/60 flex flex-row items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="size-5 text-primary" />
                    <CardTitle className="text-base sm:text-lg font-bold">Emissão de Cobrança (Asaas)</CardTitle>
                  </div>
                  <CardDescription className="text-xs text-muted-foreground">
                    Gere o boleto bancário com Pix integrado e split automático de parceiros.
                  </CardDescription>
                </div>
                {existing && (
                  <Badge variant={getClosureBadgeVariant(existing.status)} className="text-xs font-semibold px-2.5 py-0.5">
                    {closureStatusLabel[existing.status]}
                  </Badge>
                )}
              </CardHeader>

              <CardContent className="p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-muted/20 p-5 rounded-2xl border border-border/80">
                  <div className="space-y-1">
                    <p className="font-extrabold text-2xl text-foreground font-mono">{BRL(calc.netInvoice)}</p>
                    <p className="text-xs text-muted-foreground">
                      Boleto com Pix híbrido, vencimento em 5 dias úteis.
                      {merchantSplits.length > 0
                        ? ` Split ativo para ${merchantSplits.length} parceiro(s).`
                        : " Nenhum split configurado."}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                    {existing?.asaas_invoice_url && (
                      <>
                        <Button
                          variant="outline"
                          className="text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-700 shadow-2xs font-semibold gap-1.5"
                          onClick={() => {
                            const text = encodeURIComponent(
                              `Olá! Aqui está o relatório de economia e a fatura referente ao uso da plataforma PrimaPay.\n\nValor: ${BRL(
                                calc.netInvoice,
                              )}\n\nVocê pode acessar o detalhamento e pagar a fatura através do link seguro abaixo:\n${
                                existing.asaas_invoice_url
                              }`,
                            );
                            window.open(
                              `https://wa.me/${merchant.phone_whatsapp?.replace(/\D/g, "") || ""}?text=${text}`,
                              "_blank",
                            );
                          }}
                        >
                          <MessageCircle className="size-4" />
                          <span>Enviar WhatsApp</span>
                        </Button>
                        <Button variant="outline" asChild className="shadow-2xs font-semibold gap-1.5">
                          <a href={existing.asaas_invoice_url} target="_blank" rel="noopener noreferrer">
                            <span>Ver Fatura</span>
                            <ExternalLink className="size-3.5" />
                          </a>
                        </Button>
                      </>
                    )}
                    <Button
                      onClick={() => approve.mutate()}
                      disabled={approve.isPending || calc.netInvoice <= 0}
                      className="gap-2 shadow-xs font-semibold"
                    >
                      <FileCheck2 className="size-4" />
                      <span>{existing ? "Regerar Cobrança" : "Aprovar e Gerar Boleto"}</span>
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
