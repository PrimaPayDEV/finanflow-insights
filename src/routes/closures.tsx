import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { PiggyBank, FileCheck2, ExternalLink, Sparkles, Download } from "lucide-react";
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
  MODALITIES,
  PCT,
  closureStatusLabel,
  currentMonth,
  monthLabel,
  monthOptions,
  rateFieldByModality,
} from "@/lib/format";

export const Route = createFileRoute("/closures")({
  head: () => ({
    meta: [
      { title: "Fechamentos e Cobrança Asaas | Gestão de ECs" },
      {
        name: "description",
        content:
          "Gere o fechamento mensal do estabelecimento, compare o custo do modelo tradicional com a economia real e emita o boleto Pix híbrido no Asaas com split.",
      },
      { property: "og:title", content: "Fechamentos e Cobrança Asaas" },
      {
        property: "og:description",
        content: "Fechamento mensal, comparativo de economia e emissão de cobrança automática.",
      },
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

      const due = new Date();
      due.setDate(due.getDate() + 5);

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
          dueDate: due.toISOString().slice(0, 10),
          description: `Taxa operacional ${monthLabel(month)} - ${merchant.name}`,
          splits: merchantSplits.map((s) => ({
            walletId: s.partner_asaas_wallet_id,
            percentualValue: Number(s.percentage),
          })),
          sandbox: true,
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
    onError: (e: Error) => toast.error(e.message),
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <AppLayout 
      title="Fechamentos & Cobrança" 
      subtitle="Comparativo de economia e emissão automática"
      actions={
        merchant ? (
          <Button variant="outline" onClick={handlePrint} className="print:hidden">
            <Download className="mr-2 h-4 w-4" /> Exportar PDF
          </Button>
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
            Selecione um EC e o mês para gerar o fechamento.
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_380px] print:block print:space-y-6">
          <Card className="print:shadow-none print:border-none">
            <CardHeader>
              <CardTitle className="text-base">
                Detalhamento — {merchant.name} · {monthLabel(month)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Modalidade</th>
                      <th className="px-3 py-2 text-right">Faturamento bruto</th>
                      <th className="px-3 py-2 text-right">Taxa</th>
                      <th className="px-3 py-2 text-right">Valor da taxa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {MODALITIES.map((m) => (
                      <tr key={m.value}>
                        <td className="px-3 py-2">{m.label}</td>
                        <td className="px-3 py-2 text-right">{BRL(calc.grossByModality[m.value])}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">
                          {PCT(
                            Number(
                              (plan as unknown as Record<string, number>)?.[
                                rateFieldByModality[m.value]
                              ] ?? 0,
                            ),
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">{BRL(calc.feeByModality[m.value])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-2 text-sm">
                <Row label="Faturamento bruto total" value={BRL(calc.totalGross)} />
                <Row
                  label={`Taxa operacional fixa (${PCT(Number(plan?.fixed_rate_percent ?? 0))})`}
                  value={BRL(calc.fixedFeeAmount)}
                />
                <Row label="Taxas por modalidade" value={BRL(calc.modalityFeeTotal)} />
                <Separator />
                <Row label="Total de taxa operacional" value={BRL(calc.totalOpFee)} strong />
                <Row label="Despesas abatidas" value={`- ${BRL(calc.totalExpenses)}`} />
                <Separator />
                <Row label="Valor final a cobrar" value={BRL(calc.netInvoice)} strong />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4 print:space-y-6">
            <Card className="border-success/40 bg-success/5 print:shadow-none print:border-none print:bg-transparent">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="size-4 text-success" /> Comparativo de economia
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Modelo tradicional ({PCT(Number(plan?.traditional_fee_avg ?? 0))})
                  </span>
                  <span className="font-medium line-through">{BRL(calc.traditionalCost)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Nosso modelo</span>
                  <span className="font-semibold">{BRL(calc.netInvoice)}</span>
                </div>
                <div className="rounded-xl bg-success p-4 text-center text-success-foreground">
                  <p className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wide">
                    <PiggyBank className="size-4" /> Sua economia
                  </p>
                  <p className="mt-1 text-3xl font-bold">{BRL(calc.savings)}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="print:hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Cobrança Asaas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {existing && (
                  <div className="flex items-center justify-between">
                    <Badge variant={existing.status === "paid" ? "default" : "secondary"}>
                      {closureStatusLabel[existing.status]}
                    </Badge>
                    {existing.asaas_invoice_url && (
                      <a
                        className="inline-flex items-center gap-1 text-sm text-primary underline"
                        href={existing.asaas_invoice_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Ver fatura <ExternalLink className="size-3.5" />
                      </a>
                    )}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Boleto com Pix híbrido, vencimento em 5 dias.
                  {merchantSplits.length > 0
                    ? ` Split ativo para ${merchantSplits.length} parceiro(s).`
                    : " Nenhum split configurado."}
                </p>
                <Button
                  className="w-full"
                  onClick={() => approve.mutate()}
                  disabled={approve.isPending || calc.netInvoice <= 0}
                >
                  <FileCheck2 className="size-4" /> Aprovar fechamento e gerar boleto
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={strong ? "font-medium" : "text-muted-foreground"}>{label}</span>
      <span className={strong ? "text-base font-semibold" : "font-medium"}>{value}</span>
    </div>
  );
}
