import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { AsaasModalSeal, AsaasBaasSeal } from "@/components/AsaasBaasSeal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BRL } from "@/lib/format";
import { toast } from "sonner";
import { translateError } from "@/lib/translateError";
import { Wallet, Lock, DollarSign, ArrowUpRight, Clock } from "lucide-react";

export const Route = createFileRoute("/recebiveis/lancamentos")({
  head: () => ({
    meta: [{ title: "Lançamentos | Gestão de Recebíveis" }],
  }),
  component: RecebiveisLancamentos,
});

function RecebiveisLancamentos() {
  const { merchantId, companyId, user } = useAuth();
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [barcode, setBarcode] = useState("");
  
  // Buscar o saldo em tempo real
  const ledgersQuery = useQuery({
    queryKey: ["receivables_ledgers", merchantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("receivables_ledgers")
        .select("type, amount, status")
        .eq("merchant_id", merchantId!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!merchantId
  });

  const requestsQuery = useQuery({
    queryKey: ["receivables_requests", merchantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("receivables_requests")
        .select("*")
        .eq("merchant_id", merchantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!merchantId
  });

  const ledgers = ledgersQuery.data || [];
  const requests = requestsQuery.data || [];

  // Calcular saldos
  let totalCredits = 0;
  let totalDebits = 0;
  ledgers.forEach(l => {
    if (l.type === "CREDIT" && l.status === "LIQUIDATED") totalCredits += Number(l.amount);
    if ((l.type === "DEBIT" || l.type === "EXPENSE") && l.status === "LIQUIDATED") totalDebits += Number(l.amount);
  });
  
  const totalBalance = totalCredits - totalDebits;

  let blockedBalance = 0;
  requests.forEach(r => {
    if (r.status === "REQUESTED" || r.status === "PROCESSING") {
      blockedBalance += Number(r.amount);
    }
  });

  const availableBalance = totalBalance - blockedBalance;

  const createRequest = useMutation({
    mutationFn: async (type: "PIX" | "BOLETO") => {
      const reqAmount = Number(amount.replace(/[^0-9,-]/g, "").replace(",", "."));
      if (reqAmount <= 0) throw new Error("Valor inválido");
      if (reqAmount > availableBalance) throw new Error("Saldo insuficiente");

      if (type === "PIX" && !pixKey) throw new Error("Chave PIX obrigatória");
      if (type === "BOLETO" && !barcode) throw new Error("Código de barras obrigatório");

      const { error } = await supabase.from("receivables_requests").insert({
        company_id: companyId!,
        merchant_id: merchantId!,
        type,
        amount: reqAmount,
        status: "REQUESTED",
        description,
        pix_key: type === "PIX" ? pixKey : null,
        barcode: type === "BOLETO" ? barcode : null,
        created_by: user?.id
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Solicitação enviada com sucesso!");
      setAmount("");
      setDescription("");
      setPixKey("");
      setBarcode("");
      qc.invalidateQueries({ queryKey: ["receivables_requests"] });
    },
    onError: (e: Error) => toast.error(translateError(e.message))
  });

  return (
    <AppLayout 
      title="Lançamentos" 
      subtitle="Solicite resgates do seu saldo disponível"
    >
      <div className="grid gap-5 md:grid-cols-3 mb-8">
        <Card className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between p-5 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Saldo Total</CardTitle>
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Wallet className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-2xl font-black font-mono tracking-tight text-foreground">{BRL(totalBalance)}</div>
            <p className="text-xs text-muted-foreground mt-1">Valor acumulado na sua conta</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between p-5 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Saldo Comprometido</CardTitle>
            <div className="size-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
              <Lock className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-2xl font-black font-mono tracking-tight text-destructive">{BRL(blockedBalance)}</div>
            <p className="text-xs text-muted-foreground mt-1">Lançamentos em processamento</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none shadow-card bg-gradient-brand text-white overflow-hidden shadow-lg shadow-primary/20">
          <CardHeader className="flex flex-row items-center justify-between p-5 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-white/80">Saldo Disponível</CardTitle>
            <div className="size-8 rounded-lg bg-white/20 text-white flex items-center justify-center">
              <DollarSign className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-2xl font-black font-mono tracking-tight text-white">{BRL(availableBalance)}</div>
            <p className="text-xs text-white/80 mt-1">Valor disponível para resgate</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden">
          <CardHeader className="p-5 pb-3 border-b border-border/60">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ArrowUpRight className="size-4 text-primary" />
              Nova Solicitação
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <Tabs defaultValue="pix">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="pix">Pagamento PIX</TabsTrigger>
                <TabsTrigger value="boleto">Pagamento Boleto</TabsTrigger>
              </TabsList>

              <TabsContent value="pix" className="space-y-4">
                <div className="grid gap-2">
                  <Label className="text-xs font-semibold">Valor a resgatar</Label>
                  <Input placeholder="R$ 0,00" value={amount} onChange={e => setAmount(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs font-semibold">Chave PIX de Destino</Label>
                  <Input placeholder="CPF, CNPJ, E-mail, Celular..." value={pixKey} onChange={e => setPixKey(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs font-semibold">Descrição (Opcional)</Label>
                  <Input placeholder="Motivo do resgate" value={description} onChange={e => setDescription(e.target.value)} />
                </div>
                <Button className="w-full mt-4 font-bold shadow-xs" onClick={() => createRequest.mutate("PIX")} disabled={createRequest.isPending}>
                  Solicitar PIX
                </Button>
              </TabsContent>

              <TabsContent value="boleto" className="space-y-4">
                <div className="grid gap-2">
                  <Label className="text-xs font-semibold">Valor do Boleto</Label>
                  <Input placeholder="R$ 0,00" value={amount} onChange={e => setAmount(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs font-semibold">Código de Barras / Linha Digitável</Label>
                  <Input placeholder="Digite ou cole aqui" value={barcode} onChange={e => setBarcode(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs font-semibold">Descrição (Opcional)</Label>
                  <Input placeholder="Identificação do boleto" value={description} onChange={e => setDescription(e.target.value)} />
                </div>
                <Button className="w-full mt-4 font-bold shadow-xs" onClick={() => createRequest.mutate("BOLETO")} disabled={createRequest.isPending}>
                  Pagar Boleto
                </Button>
              </TabsContent>
            </Tabs>

            <div className="mt-5 pt-3 border-t border-border/60 flex items-center justify-between gap-2">
              <AsaasModalSeal variant="auto" />
              <p className="text-[10px] text-muted-foreground text-right">
                Transferências e liquidações via Asaas
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden">
          <CardHeader className="p-5 pb-3 border-b border-border/60">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground" />
              Histórico de Solicitações
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            {requests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-xs">
                Nenhuma solicitação realizada recentemente.
              </div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {requests.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 bg-primary/10 p-2 rounded-full text-primary">
                        {r.type === 'PIX' ? <ArrowUpRight className="size-4" /> : <Clock className="size-4" />}
                      </div>
                      <div>
                        <p className="font-medium">{r.type === 'PIX' ? 'Resgate PIX' : 'Pagamento de Boleto'}</p>
                        <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()} - {r.description || r.pix_key || "Boleto"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-destructive">{BRL(r.amount)}</p>
                      <Badge variant="outline" className={
                        r.status === 'REQUESTED' ? "bg-amber-500/10 text-amber-600 border-none" :
                        r.status === 'LIQUIDATED' ? "bg-emerald-500/10 text-emerald-600 border-none" : "bg-muted"
                      }>
                        {r.status === 'REQUESTED' ? 'Pendente' :
                         r.status === 'PROCESSING' ? 'Processando' :
                         r.status === 'LIQUIDATED' ? 'Aprovado' : 'Cancelado'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
