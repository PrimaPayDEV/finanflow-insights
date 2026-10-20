import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  ArrowDownCircle,
  ArrowUpCircle,
  Receipt,
  SearchX,
  Store,
  Calendar,
  Layers,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import { MerchantIcon } from "@/components/MerchantIcon";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { AsaasFormSeal } from "@/components/AsaasBaasSeal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { expensesQuery, merchantsQuery } from "@/lib/db";
import { BRL, currentMonth, monthLabel, monthOptions } from "@/lib/format";
import { translateError } from "@/lib/translateError";

export const Route = createFileRoute("/expenses")({
  head: () => ({
    meta: [
      { title: "Lançamentos e Ajustes | Gestão de ECs" },
      {
        name: "description",
        content:
          "Lance cobranças e deduções por estabelecimento e mês, como bobinas e descontos de indicação, que abatem o valor da fatura final.",
      },
      { property: "og:title", content: "Lançamentos e Ajustes" },
      {
        property: "og:description",
        content: "Lançamentos extras que ajustam o valor final cobrado do EC.",
      },
    ],
  }),
  component: ExpensesPage,
});

function ExpensesPage() {
  const qc = useQueryClient();
  const merchants = useQuery(merchantsQuery);
  const expenses = useQuery(expensesQuery);

  const [merchantId, setMerchantId] = useState("");
  const [month, setMonth] = useState(currentMonth());
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [durationMonths, setDurationMonths] = useState("1");
  const [category, setCategory] = useState<"despesa" | "cobranca">("despesa");

  const add = useMutation({
    mutationFn: async () => {
      if (!merchantId) throw new Error("Selecione o estabelecimento.");

      const numMonths = parseInt(durationMonths, 10) || 1;
      const baseMonth = month;

      const recordsToInsert = [];
      for (let i = 0; i < numMonths; i++) {
        const [yStr, mStr] = baseMonth.split("-");
        let y = parseInt(yStr, 10);
        let m = parseInt(mStr, 10);
        m += i;
        while (m > 12) {
          m -= 12;
          y++;
        }
        const targetMonth = `${y}-${m.toString().padStart(2, "0")}`;

        recordsToInsert.push({
          merchant_id: merchantId,
          description: description.trim() + (numMonths > 1 ? ` (${i + 1}/${numMonths})` : ""),
          amount: Number(amount || 0),
          reference_month: targetMonth,
          category,
        });
      }

      const { error } = await supabase.from("expenses_adjustments").insert(recordsToInsert);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Lançamento registrado com sucesso!");
      setDescription("");
      setAmount("");
      setDurationMonths("1");
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: (e: Error) => toast.error(translateError(e.message)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses_adjustments").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Lançamento removido");
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
  });

  const list = (expenses.data ?? []).filter(
    (e) => e.reference_month === month && (!merchantId || e.merchant_id === merchantId),
  );
  const total = list.reduce((s, e) => s + (e.category === "cobranca" ? -Number(e.amount) : Number(e.amount)), 0);

  return (
    <AppLayout title="Lançamentos" subtitle="Débitos e créditos adicionais que ajustam o valor do fechamento">
      <div className="grid gap-5 lg:grid-cols-[380px_1fr] items-start">
        {/* =========================================================================
            COLUNA DA ESQUERDA: FORMULÁRIO DE NOVO LANÇAMENTO
            ========================================================================= */}
        <Card className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden">
          <CardHeader className="p-5 pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <Receipt className="size-4 text-primary" />
              <CardTitle className="text-base font-bold">Novo Lançamento</CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Cadastre despesas avulsas, taxas de bobina ou descontos negociados.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Estabelecimento (EC) *</Label>
              <Select value={merchantId} onValueChange={setMerchantId}>
                <SelectTrigger className="w-full bg-background rounded-xl">
                  <SelectValue placeholder="Selecione o EC..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {(merchants.data ?? []).map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Mês de Referência *</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="w-full bg-background rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {monthOptions().map((m) => (
                    <SelectItem key={m} value={m}>
                      {monthLabel(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tipo do Lançamento *</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCategory("despesa")}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    category === "despesa"
                      ? "bg-destructive/10 border-destructive text-destructive shadow-2xs"
                      : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/60"
                  }`}
                >
                  <ArrowUpCircle className="size-3.5" />
                  <span>Cobrança (+)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCategory("cobranca")}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    category === "cobranca"
                      ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-2xs"
                      : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/60"
                  }`}
                >
                  <ArrowDownCircle className="size-3.5" />
                  <span>Dedução (-)</span>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Descrição do Ajuste *</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Bobinas extras, desconto fidelidade"
                maxLength={200}
                className="bg-background"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Valor (R$) *</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-8 bg-background font-mono font-semibold"
                  />
                  <span className="absolute left-2.5 top-2.5 text-xs text-muted-foreground font-semibold">R$</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Duração (Meses)</Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(e.target.value)}
                  className="bg-background font-mono"
                />
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <AsaasFormSeal />
              <Button
                className="w-full sm:w-auto gap-2 shadow-xs"
                onClick={() => add.mutate()}
                disabled={!description.trim() || !amount || add.isPending}
              >
                <Plus className="size-4" />
                <span>{add.isPending ? "Registrando..." : "Registrar Lançamento"}</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* =========================================================================
            COLUNA DA DIREITA: HISTÓRICO DE LANÇAMENTOS DO PERÍODO
            ========================================================================= */}
        {merchantId ? (
          <Card className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden">
            <CardHeader className="p-5 pb-3 border-b border-border/60 flex flex-row items-center justify-between">
              <div className="space-y-0.5">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Receipt className="size-4 text-primary" />
                  <span>Lançamentos de {monthLabel(month)}</span>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Ajustes aplicados ao fechamento deste estabelecimento
                </CardDescription>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Impacto Líquido
                </p>
                <span
                  className={`text-lg font-black font-mono ${
                    total > 0
                      ? "text-destructive"
                      : total < 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-foreground"
                  }`}
                >
                  {total > 0 ? "+" : total < 0 ? "-" : ""}
                  {BRL(Math.abs(total))}
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5">
              <div className="space-y-2.5">
                <AnimatePresence mode="popLayout">
                  {list.length === 0 ? (
                    <div className="p-10 text-center border border-dashed rounded-xl text-muted-foreground bg-muted/10 space-y-2">
                      <SearchX className="size-8 mx-auto opacity-30" />
                      <p className="text-sm font-semibold text-foreground">Nenhum lançamento neste mês.</p>
                      <p className="text-xs text-muted-foreground">
                        Utilize o formulário ao lado para incluir cobranças extras ou deduções.
                      </p>
                    </div>
                  ) : (
                    list.map((e, i) => (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: i * 0.03 }}
                        key={e.id}
                        className="flex items-center justify-between gap-4 p-3.5 rounded-xl border border-border/70 bg-muted/20 hover:bg-muted/40 transition-colors group"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div
                            className={`size-10 rounded-xl shrink-0 flex items-center justify-center border shadow-2xs ${
                              e.category === "cobranca"
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                : "bg-destructive/10 border-destructive/20 text-destructive"
                            }`}
                          >
                            {e.category === "cobranca" ? (
                              <ArrowDownCircle className="size-5" />
                            ) : (
                              <ArrowUpCircle className="size-5" />
                            )}
                          </div>

                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                                {e.description}
                              </p>
                              <Badge
                                variant={e.category === "cobranca" ? "outline" : "destructive"}
                                className={`text-[9px] uppercase px-1.5 py-0 rounded-full font-bold h-4 ${
                                  e.category === "cobranca"
                                    ? "text-emerald-600 border-emerald-500/30 bg-emerald-500/10"
                                    : ""
                                }`}
                              >
                                {e.category === "cobranca" ? "Dedução" : "Cobrança"}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {(merchants.data ?? []).find((m) => m.id === e.merchant_id)?.name}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span
                            className={`text-base font-extrabold font-mono ${
                              e.category === "cobranca"
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-destructive"
                            }`}
                          >
                            {e.category === "cobranca" ? "-" : "+"}
                            {BRL(Number(e.amount))}
                          </span>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 size-8 rounded-lg transition-colors cursor-pointer"
                                title="Remover lançamento"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover lançamento?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Deseja realmente remover o lançamento <strong>{e.description}</strong> no valor de{" "}
                                  <strong>{BRL(Number(e.amount))}</strong>?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => remove.mutate(e.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Sim, remover
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-2xl border border-dashed border-border/90 shadow-none bg-muted/10 p-12 text-center flex flex-col items-center justify-center min-h-[380px] space-y-3">
            <div className="size-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <Receipt className="size-8 opacity-40" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Selecione um estabelecimento</h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                Escolha o estabelecimento no painel à esquerda para visualizar e gerenciar o histórico de lançamentos do mês.
              </p>
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
