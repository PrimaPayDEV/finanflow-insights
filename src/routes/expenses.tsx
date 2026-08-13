import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, ArrowDownCircle, ArrowUpCircle, Store, Receipt, SearchX } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { expensesQuery, merchantsQuery } from "@/lib/db";
import { BRL, currentMonth, monthLabel, monthOptions } from "@/lib/format";
import { translateError } from "@/lib/translateError";

export const Route = createFileRoute("/expenses")({
  head: () => ({
    meta: [
      { title: "Despesas e Ajustes | Gestão de ECs" },
      {
        name: "description",
        content:
          "Lance despesas e créditos extras por estabelecimento e mês, como bobinas e descontos de indicação, que abatem o valor da fatura final.",
      },
      { property: "og:title", content: "Despesas e Ajustes" },
      {
        property: "og:description",
        content: "Lançamentos extras que reduzem o valor final cobrado do EC.",
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
  const [category, setCategory] = useState<"despesa" | "cobranca">("despesa");

  const add = useMutation({
    mutationFn: async () => {
      if (!merchantId) throw new Error("Selecione o estabelecimento.");
      const { error } = await supabase.from("expenses_adjustments").insert({
        merchant_id: merchantId,
        description: description.trim(),
        amount: Number(amount || 0),
        reference_month: month,
        category,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Lançamento registrado");
      setDescription("");
      setAmount("");
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: (e: Error) => toast.error(translateError(e.message)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses_adjustments").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });

  const list = (expenses.data ?? []).filter(
    (e) => e.reference_month === month && (!merchantId || e.merchant_id === merchantId),
  );
  const total = list.reduce((s, e) => s + (e.category === "cobranca" ? -Number(e.amount) : Number(e.amount)), 0);

  return (
    <AppLayout title="Despesas / Ajustes" subtitle="Débitos e créditos extras que abatem a fatura">
      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <Card className="border-none shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Novo lançamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-1.5">
              <Label>Estabelecimento</Label>
              <Select value={merchantId} onValueChange={setMerchantId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {(merchants.data ?? []).map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Mês de referência</Label>
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
            <div className="grid gap-1.5">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as "despesa" | "cobranca")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="despesa">Despesa</SelectItem>
                  <SelectItem value="cobranca">Cobrança</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Descrição</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex.: Bobinas, desconto de indicação"
                maxLength={200}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              onClick={() => add.mutate()}
              disabled={!description.trim() || add.isPending}
            >
              <Plus className="size-4" /> Lançar
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col h-full border-none shadow-card">
          <CardHeader className="flex-row items-center justify-between pb-4 border-b border-border/30 bg-muted/20">
            <div className="space-y-1">
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="w-4 h-4 text-primary" /> 
                Lançamentos de {monthLabel(month)}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Despesas (+) e Cobranças (-) do período
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Impacto no Boleto</p>
              <span className={`text-lg font-bold ${total > 0 ? 'text-destructive' : total < 0 ? 'text-success' : 'text-foreground'}`}>
                {total > 0 ? '+' : total < 0 ? '-' : ''}{BRL(Math.abs(total))}
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-4 bg-muted/10">
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {list.length === 0 && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="p-4 bg-muted/30 rounded-full mb-3">
                      <SearchX className="h-10 w-10 text-muted-foreground opacity-40" />
                    </div>
                    <p className="text-sm font-medium">Nenhum lançamento no período</p>
                    <p className="text-xs text-muted-foreground mt-1">Os ajustes lançados aparecerão aqui.</p>
                  </motion.div>
                )}
                {list.map((e, i) => (
                  <motion.li 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.05 }}
                    key={e.id} 
                    className="flex items-center justify-between gap-4 p-4 rounded-xl bg-card border-none shadow-[0_2px_10px_-2px_rgba(0,0,0,0.04)] hover:shadow-md transition-all group list-none"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`flex-shrink-0 p-2.5 rounded-full ${e.category === 'cobranca' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                        {e.category === 'cobranca' ? <ArrowDownCircle className="w-5 h-5" /> : <ArrowUpCircle className="w-5 h-5" />}
                      </div>
                      
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold group-hover:text-primary transition-colors">{e.description}</p>
                          <Badge variant={e.category === "cobranca" ? "outline" : "destructive"} className={`text-[9px] px-1.5 py-0 uppercase tracking-wider h-4 ${e.category === 'cobranca' ? 'text-success border-success/30 bg-success/5' : ''}`}>
                            {e.category === "cobranca" ? "Cobrança" : "Despesa"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground group-hover:text-muted-foreground/80 transition-colors">
                          <Store className="w-3.5 h-3.5 opacity-70" />
                          <span className="truncate">{(merchants.data ?? []).find((m) => m.id === e.merchant_id)?.name}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className={`text-base font-bold ${e.category === 'cobranca' ? 'text-success' : 'text-destructive'}`}>
                          {e.category === 'cobranca' ? '-' : '+'}{BRL(Number(e.amount))}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Remover"
                        className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground h-8 w-8 rounded-full"
                        onClick={() => remove.mutate(e.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
