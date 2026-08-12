import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
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
        <Card>
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
                  <SelectItem value="despesa">Despesa (Soma no Boleto)</SelectItem>
                  <SelectItem value="cobranca">Cobrança (Subtrai do Boleto)</SelectItem>
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

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Lançamentos de {monthLabel(month)}</CardTitle>
            <span className="text-sm font-semibold text-primary">{BRL(total)}</span>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {list.length === 0 && (
                <li className="py-3 text-sm text-muted-foreground">Nenhum lançamento no período.</li>
              )}
              {list.map((e, i) => (
                <motion.li 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={e.id} 
                  className="flex items-center justify-between gap-3 py-3 px-2 rounded-md hover:bg-muted/60 transition-colors group"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={e.category === "cobranca" ? "default" : "destructive"} className="text-[10px] px-1.5 py-0">
                        {e.category === "cobranca" ? "Cobrança (-)" : "Despesa (+)"}
                      </Badge>
                      <p className="truncate text-sm font-medium group-hover:text-primary transition-colors">{e.description}</p>
                    </div>
                    <p className="text-xs text-muted-foreground group-hover:text-muted-foreground/80 transition-colors">
                      {(merchants.data ?? []).find((m) => m.id === e.merchant_id)?.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-semibold ${e.category === 'cobranca' ? 'text-success' : 'text-destructive'}`}>
                      {e.category === 'cobranca' ? '-' : '+'}{BRL(Number(e.amount))}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remover"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => remove.mutate(e.id)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </motion.li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
