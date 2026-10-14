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
          className="mt-6 space-y-6 print:mt-0 print:space-y-4"
        >
          {/* =========================================================================
              CABEÇALHO CORPORATIVO DE IMPRESSÃO
              ========================================================================= */}
          <div className="hidden print:block mb-5 pb-3 border-b-2 border-primary/20">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={companyName || "Logo"}
                    className="h-9 w-auto max-w-[160px] object-contain"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold shadow-xs">
                      <Wallet className="size-4" />
                    </div>
                    <p className="text-xl font-black tracking-tight text-foreground" style={{ fontFamily: '"Montserrat Arabic", Montserrat, sans-serif' }}>
                      {companyName === 'PrimaPay' ? 'PrimaHub' : (companyName || "PrimaPay")}
                    </p>
                  </div>
                )}
                <div className="border-l border-border pl-3">
                  <h1 className="text-base font-black text-primary tracking-tight uppercase leading-none">
                    Relatório de Fechamento & Economia
                  </h1>
                  <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                    Demonstrativo mensal consolidado de faturamento, lançamentos e economia apurada
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-xs font-bold text-primary">
                  <Calendar className="size-3" />
                  <span className="capitalize">{monthLabel(month)}</span>
                </div>
                <p className="text-[9px] text-muted-foreground mt-0.5 font-mono">
                  Emissão: {format(new Date(), "dd/MM/yyyy HH:mm")}
                </p>
              </div>
            </div>

            {/* Ficha Cadastral do Estabelecimento */}
            <div className="grid grid-cols-4 gap-2.5 bg-muted/20 p-2.5 rounded-xl border border-border/70 text-xs">
              <div>
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Estabelecimento
                </span>
                <span className="font-bold text-xs text-foreground truncate block">
                  {merchant.name}
                </span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                  CNPJ
                </span>
                <span className="font-semibold text-xs font-mono text-foreground block">
                  {merchant.document_cnpj || "Não informado"}
                </span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                  E-mail
                </span>
                <span className="font-medium text-[11px] text-foreground truncate block">
                  {merchant.email || "Não informado"}
                </span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                  WhatsApp / Contato
                </span>
                <span className="font-medium text-[11px] text-foreground block">
                  {merchant.phone_whatsapp || "Não informado"}
                </span>
              </div>
            </div>
          </div>

          {/* =========================================================================
              SEÇÃO 1: FATURAMENTO BRUTO & MOVIMENTAÇÕES (UNIFICADO E ESTRUTURADO)
              ========================================================================= */}
          <section className="space-y-3 print:space-y-2 print:break-inside-avoid">
            <Card className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden print:shadow-none print:border-border/60">
              {/* Header do Card com Total em Destaque */}
              <div className="p-3.5 sm:p-4 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-muted/15 print:p-2.5 print:bg-muted/10">
                <div className="flex items-center gap-2">
                  <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <TrendingUp className="size-3.5" />
                  </div>
                  <div>
                    <h2 className="text-xs sm:text-sm font-bold tracking-tight text-foreground uppercase">
                      1. Faturamento Bruto & Movimentações
                    </h2>
                    <p className="text-[11px] text-muted-foreground">
                      Volume total de vendas e distribuição por modalidade ({txs.length} {txs.length === 1 ? "venda" : "vendas"})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto bg-primary/10 border border-primary/25 px-3 py-1.5 rounded-xl text-right print:px-2.5 print:py-1">
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Faturamento Total Bruto
                    </span>
                    <span className="text-lg sm:text-xl font-black text-primary font-mono tracking-tight leading-none">
                      {BRL(calc.totalGross)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Grid das 4 Modalidades com Valores, Cores e Participação % */}
              <CardContent className="p-3.5 sm:p-4 print:p-2.5">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 print:grid-cols-4 print:gap-2">
                  {/* PIX */}
                  <div className="p-2.5 sm:p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col justify-between space-y-1 print:p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                        <Sparkles className="size-3" /> Pix
                      </span>
                      <span className="text-[10px] font-mono font-bold text-emerald-700/90 bg-emerald-500/15 px-1 py-0.2 rounded">
                        {pixPct.toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-base sm:text-lg font-black text-foreground font-mono">
                      {BRL(calc.grossByModality.pix)}
                    </p>
                    <div className="w-full bg-emerald-500/15 rounded-full h-1 overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, pixPct))}%` }} />
                    </div>
                  </div>

                  {/* DÉBITO */}
                  <div className="p-2.5 sm:p-3 rounded-xl border border-blue-500/20 bg-blue-500/5 flex flex-col justify-between space-y-1 print:p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1">
                        <CreditCard className="size-3" /> Débito
                      </span>
                      <span className="text-[10px] font-mono font-bold text-blue-700/90 bg-blue-500/15 px-1 py-0.2 rounded">
                        {debitPct.toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-base sm:text-lg font-black text-foreground font-mono">
                      {BRL(calc.grossByModality.debit)}
                    </p>
                    <div className="w-full bg-blue-500/15 rounded-full h-1 overflow-hidden">
                      <div className="bg-blue-500 h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, debitPct))}%` }} />
                    </div>
                  </div>

                  {/* CRÉDITO À VISTA */}
                  <div className="p-2.5 sm:p-3 rounded-xl border border-violet-500/20 bg-violet-500/5 flex flex-col justify-between space-y-1 print:p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-violet-700 dark:text-violet-400 flex items-center gap-1">
                        <CreditCard className="size-3" /> Créd. à Vista
                      </span>
                      <span className="text-[10px] font-mono font-bold text-violet-700/90 bg-violet-500/15 px-1 py-0.2 rounded">
                        {creditVistaPct.toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-base sm:text-lg font-black text-foreground font-mono">
                      {BRL(calc.grossByModality.credit_vista)}
                    </p>
                    <div className="w-full bg-violet-500/15 rounded-full h-1 overflow-hidden">
                      <div className="bg-violet-500 h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, creditVistaPct))}%` }} />
                    </div>
                  </div>

                  {/* CRÉDITO PARCELADO */}
                  <div className="p-2.5 sm:p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 flex flex-col justify-between space-y-1 print:p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                        <Layers className="size-3" /> Créd. Parcelado
                      </span>
                      <span className="text-[10px] font-mono font-bold text-amber-700/90 bg-amber-500/15 px-1 py-0.2 rounded">
                        {creditInstallmentPct.toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-base sm:text-lg font-black text-foreground font-mono">
                      {BRL(calc.grossByModality.credit_installment)}
                    </p>
                    <div className="w-full bg-amber-500/15 rounded-full h-1 overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, creditInstallmentPct))}%` }} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* =========================================================================
              SEÇÃO 2: LANÇAMENTOS E DEDUÇÕES OPERACIONAIS
              ========================================================================= */}
          <section className="space-y-3 print:space-y-2 print:break-inside-avoid">
            <Card className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden print:shadow-none print:border-border/60">
              <div className="p-3 sm:p-3.5 border-b border-border/60 flex items-center justify-between bg-muted/15 print:p-2 print:bg-muted/10">
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Receipt className="size-3" />
                  </div>
                  <h2 className="text-xs sm:text-sm font-bold tracking-tight text-foreground uppercase">
                    2. Lançamentos Operacionais (Cobranças & Deduções)
                  </h2>
                </div>
                <Badge variant="secondary" className="font-mono text-[10px]">
                  {exps.length} {exps.length === 1 ? "item" : "itens"}
                </Badge>
              </div>

              <CardContent className="p-0">
                <div className="overflow-x-auto print:overflow-visible">
                  <Table className="print:w-full">
                    <TableHeader className="bg-muted/30 print:table-header-group">
                      <TableRow className="print:table-row">
                        <TableHead className="font-semibold text-xs py-2 print:py-1 print:px-3 w-44">Tipo</TableHead>
                        <TableHead className="font-semibold text-xs py-2 print:py-1 print:px-3">Descrição do Lançamento</TableHead>
                        <TableHead className="text-right font-semibold text-xs py-2 print:py-1 print:px-3 w-48">Impacto no Fechamento</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="print:table-row-group">
                      {exps.length === 0 ? (
                        <TableRow className="print:table-row">
                          <TableCell colSpan={3} className="py-3 text-center text-muted-foreground text-xs italic">
                            Nenhum lançamento adicional ou dedução no período.
                          </TableCell>
                        </TableRow>
                      ) : (
                        exps.map((exp) => (
                          <TableRow key={exp.id} className="hover:bg-muted/30 transition-colors print:table-row print:break-inside-avoid">
                            <TableCell className="py-1.5 print:py-1 print:px-3">
                              <Badge
                                variant={exp.category === "cobranca" ? "outline" : "secondary"}
                                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${
                                  exp.category === "cobranca"
                                    ? "text-blue-700 bg-blue-500/10 border-blue-500/30 dark:text-blue-400"
                                    : "text-emerald-700 bg-emerald-500/10 border-emerald-500/30 dark:text-emerald-400"
                                }`}
                              >
                                {exp.category === "cobranca" ? (
                                  <span className="flex items-center gap-1">
                                    <ArrowUpRight className="size-3 text-blue-600" /> Cobrança de Serviço (+)
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1">
                                    <ArrowDownRight className="size-3 text-emerald-600" /> Dedução / Desconto (-)
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
                                    ? "text-foreground font-semibold"
                                    : "text-emerald-600 dark:text-emerald-400"
                                }
                              >
                                {exp.category === "cobranca" ? "+" : "-"}
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
              SEÇÃO 3: COMPARATIVO E ECONOMIA REAL GERADA (INTEGRADA NA PÁGINA 1)
              ========================================================================= */}
          <section className="space-y-3 print:space-y-2 print:break-inside-avoid">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <PiggyBank className="size-4" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-bold tracking-tight text-foreground uppercase">
                  3. Comparativo de Custos & Economia Gerada
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  Demonstração da economia líquida proporcionada pela plataforma PrimaPay neste fechamento
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 print:grid-cols-3 print:gap-2.5">
              {/* CUSTO NO MODELO TRADICIONAL */}
              <Card className="rounded-2xl border border-border/80 shadow-card bg-muted/20 text-center p-3.5 print:p-2.5 print:shadow-none flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">
                    Modelo Tradicional
                  </span>
                  <p className="text-[10px] text-muted-foreground line-clamp-1">
                    Custo estimado com taxas médias de mercado
                  </p>
                </div>
                <div className="my-1.5">
                  <p className="text-xl sm:text-2xl font-black text-muted-foreground line-through decoration-destructive/60 font-mono">
                    {BRL(calc.traditionalCost)}
                  </p>
                </div>
                <p className="text-[9px] text-muted-foreground/75">
                  Baseado nas taxas médias praticadas no mercado
                </p>
              </Card>

              {/* CUSTO COM A PRIMAPAY */}
              <Card className="rounded-2xl border border-primary/30 shadow-card bg-primary/5 text-center p-3.5 print:p-2.5 print:shadow-none flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider block mb-0.5">
                    Solução PrimaPay
                  </span>
                  <p className="text-[10px] text-muted-foreground line-clamp-1">
                    Custo total apurado na plataforma
                  </p>
                </div>
                <div className="my-1.5">
                  <p className="text-xl sm:text-2xl font-black text-primary font-mono">
                    {BRL(calc.totalMerchantCost)}
                  </p>
                </div>
                <p className="text-[9px] text-primary/80 font-medium">
                  Taxas reduzidas + Lançamentos operacionais
                </p>
              </Card>

              {/* DESTAQUE DE ECONOMIA NO BOLSO */}
              <Card className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-card p-3.5 print:p-2.5 print:shadow-none flex flex-col justify-between text-center">
                <div className="flex items-center justify-center gap-1.5 text-white/90">
                  <Sparkles className="size-3" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Economia Real Apurada
                  </span>
                </div>
                <div className="my-1">
                  <p className="text-2xl sm:text-3xl font-black tracking-tight text-white font-mono drop-shadow-sm">
                    {BRL(calc.savings)}
                  </p>
                </div>
                <p className="text-[9px] text-white/90 font-medium">
                  Valor líquido economizado pelo seu estabelecimento
                </p>
              </Card>
            </div>
          </section>

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
