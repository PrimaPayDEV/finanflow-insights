import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Smartphone, Users, Save, Percent, Trash2, Settings2, Edit2, Store, Key } from "lucide-react";
import { MerchantIcon } from "@/components/MerchantIcon";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { createAsaasSubaccount } from "@/lib/asaas.functions";
import {
  feePlansQuery,
  merchantsQuery,
  splitRulesQuery,
  terminalsQuery,
  type Merchant,
} from "@/lib/db";
import { PCT, formatCpfCnpj, formatPhone, formatCurrencyInput } from "@/lib/format";
import { getPartners } from "@/lib/partner.functions";
import { useServerFn } from "@tanstack/react-start";
import { translateError } from "@/lib/translateError";
import { useAuth } from "@/contexts/AuthContext";
import { createMerchantAccess } from "@/lib/merchant.functions";
import { fetchCepData } from "@/lib/cep";

export const Route = createFileRoute("/merchants")({
  head: () => ({
    meta: [
      { title: "Estabelecimentos e Planos | Gestão de ECs" },
      {
        name: "description",
        content:
          "Cadastre estabelecimentos, vincule maquininhas por número serial e configure taxas operacionais, taxas por modalidade e split de parceiros.",
      },
      { property: "og:title", content: "Estabelecimentos e Planos | Gestão de ECs" },
      {
        property: "og:description",
        content: "Cadastro de ECs, terminais POS, planos de taxas e regras de split.",
      },
    ],
  }),
  component: MerchantsPage,
});

const emptyMerchant = { name: "", document_cnpj: "", phone_whatsapp: "", email: "" };

function WebAccessDialog({ merchant }: { merchant: Merchant }) {
  const { companyId } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(merchant.email || "");
  const [password, setPassword] = useState("");

  const accessMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("companyId is required");
      return createMerchantAccess({ data: { companyId, merchantId: merchant.id, email, password } });
    },
    onSuccess: () => {
      toast.success("Acesso web gerado com sucesso! O EC já pode fazer login.");
      setOpen(false);
      setPassword("");
    },
    onError: (e: Error) => toast.error(translateError(e.message))
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="hidden sm:flex gap-2 border-primary/20 text-primary hover:bg-primary/5">
          <Key className="size-4" />
          Gerar Acesso
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Acesso Web: {merchant.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Crie um login para o estabelecimento acessar o painel blindado (Gestão de Recebíveis).
          </p>
          <div className="grid gap-2">
            <Label>E-mail de Acesso</Label>
            <Input type="email" placeholder="email@exemplo.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Senha Temporária</Label>
            <Input type="text" placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => accessMutation.mutate()} disabled={accessMutation.isPending || !email || password.length < 6}>
            {accessMutation.isPending ? "Gerando..." : "Criar Acesso"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdvancedPanel({ merchant }: { merchant: Merchant }) {
  const qc = useQueryClient();
  const clearData = useMutation({
    mutationFn: async () => {
      const { data: ledgers } = await supabase
        .from('receivables_ledgers')
        .select('id, transaction_id')
        .eq('merchant_id', merchant.id);
        
      if (!ledgers || ledgers.length === 0) return { count: 0 };
      
      await supabase.from('receivables_requests').delete().eq('merchant_id', merchant.id);
      await supabase.from('receivables_ledgers').delete().eq('merchant_id', merchant.id);
      
      const txIds = ledgers.map((l: any) => l.transaction_id).filter(Boolean);
      if (txIds.length > 0) {
        const chunks = [];
        for (let i = 0; i < txIds.length; i += 100) chunks.push(txIds.slice(i, i + 100));
        for (const c of chunks) {
          await supabase.from('receivables_transactions').delete().in('id', c);
        }
      }
      return { count: ledgers.length };
    },
    onSuccess: (data) => {
      toast.success(`Foram apagadas ${data.count} movimentações deste EC.`);
    },
    onError: (e: Error) => toast.error(translateError(e.message))
  });

  return (
    <Card className="border-destructive/20 shadow-none">
      <CardHeader>
        <CardTitle className="text-sm text-destructive flex items-center gap-2">
           <Trash2 className="size-4" /> Zona de Perigo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between p-4 border rounded-lg bg-destructive/5 border-destructive/20">
          <div>
            <h4 className="font-semibold text-sm">Apagar Histórico de Recebíveis</h4>
            <p className="text-xs text-muted-foreground mt-1">Isso apagará permanentemente todos os relatórios importados e lançamentos deste EC.</p>
          </div>
          <Button 
            variant="destructive" 
            disabled={clearData.isPending}
            onClick={() => {
              if (confirm("Tem certeza? Esta ação é irreversível e apagará TODO o saldo e histórico do estabelecimento.")) {
                clearData.mutate();
              }
            }}
          >
            {clearData.isPending ? "Apagando..." : "Apagar Tudo"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MerchantsPage() {
  const qc = useQueryClient();
  const merchants = useQuery(merchantsQuery);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyMerchant);
  const [selected, setSelected] = useState<string | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["merchants"] });
  };

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("merchants").insert(form);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Estabelecimento cadastrado");
      setForm(emptyMerchant);
      setOpen(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(translateError(e.message)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("merchants").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Estabelecimento removido");
      setSelected(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(translateError(e.message)),
  });

  const list = merchants.data ?? [];
  const active = list.find((m) => m.id === selected) ?? null;

  return (
    <AppLayout
      title="Estabelecimentos (ECs)"
      subtitle="Cadastro, terminais, planos de taxas e split"
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" /> Novo EC
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo estabelecimento</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label>Razão social</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  maxLength={200}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>CNPJ</Label>
                <Input
                  value={form.document_cnpj}
                  onChange={(e) => setForm({ ...form, document_cnpj: formatCpfCnpj(e.target.value) })}
                  maxLength={18}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>WhatsApp</Label>
                <Input
                  value={form.phone_whatsapp}
                  onChange={(e) => setForm({ ...form, phone_whatsapp: formatPhone(e.target.value) })}
                  maxLength={15}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  maxLength={200}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => save.mutate()}
                disabled={!form.name.trim() || save.isPending}
              >
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="border-none shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Carteira de ECs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2 p-1">
              {list.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum EC cadastrado ainda.</p>
              )}
              {list.map((m, i) => (
                <motion.button
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={m.id}
                  onClick={() => setSelected(m.id)}
                  className={`w-full rounded-lg border px-3 py-2.5 text-left transition-all duration-200 ${
                    selected === m.id
                      ? "border-primary bg-primary/5 shadow-sm scale-[1.02]"
                      : "border-border hover:bg-muted/60 hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg shrink-0 ${
                      selected === m.id ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                    }`}>
                      <MerchantIcon name={m.name} className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{m.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {m.document_cnpj || "sem CNPJ"}
                        {m.companies?.name && ` • ${m.companies.name}`}
                      </p>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </CardContent>
        </Card>

        {active ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={active.id}
            className="space-y-4"
          >
            <Card className="border-none shadow-card">
              <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 text-primary rounded-xl shrink-0">
                    <MerchantIcon name={active.name} className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">{active.name}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {active.email || "sem e-mail"} · {active.phone_whatsapp || "sem WhatsApp"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={active.status === "active" ? "default" : "secondary"}>
                    {active.status === "active" ? "Ativo" : "Inativo"}
                  </Badge>
                  <WebAccessDialog merchant={active} />
                  <EditMerchantDialog merchant={active} />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove.mutate(active.id)}
                    aria-label="Remover EC"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardHeader>
            </Card>

            <Tabs defaultValue="plan">
              <TabsList>
                <TabsTrigger value="plan">
                  <Percent className="size-4 mr-2" /> Plano financeiro
                </TabsTrigger>
                <TabsTrigger value="pos">
                  <Smartphone className="size-4 mr-2" /> Terminais
                </TabsTrigger>
                <TabsTrigger value="split">
                  <Users className="size-4 mr-2" /> Split Asaas
                </TabsTrigger>
                <TabsTrigger value="advanced" className="text-destructive data-[state=active]:text-destructive">
                  <Settings2 className="size-4 mr-2" /> Avançado
                </TabsTrigger>
              </TabsList>
              <TabsContent value="plan">
                <FeePlanForm merchant={active} />
              </TabsContent>
              <TabsContent value="pos">
                <TerminalsPanel merchant={active} />
              </TabsContent>
              <TabsContent value="split">
                <SplitPanel merchant={active} />
              </TabsContent>
              <TabsContent value="advanced" className="mt-4">
                <AdvancedPanel merchant={active} />
              </TabsContent>
            </Tabs>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="h-full">
            <Card className="border-none shadow-card h-full flex items-center justify-center min-h-[400px]">
              <CardContent className="p-10 text-center flex flex-col items-center justify-center space-y-4">
                <div className="p-4 bg-muted/30 rounded-full">
                  <Store className="h-10 w-10 text-muted-foreground opacity-40" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  Selecione um estabelecimento para configurar terminais, taxas e split.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}

function EditMerchantDialog({ merchant }: { merchant: Merchant }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: merchant.name,
    document_cnpj: merchant.document_cnpj || "",
    phone_whatsapp: merchant.phone_whatsapp || "",
    email: merchant.email || "",
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("merchants")
        .update(form)
        .eq("id", merchant.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Estabelecimento atualizado");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["merchants"] });
    },
    onError: (e: Error) => toast.error(translateError(e.message)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar estabelecimento</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Razão social</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              maxLength={200}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>CNPJ</Label>
            <Input
              value={form.document_cnpj}
              onChange={(e) => setForm({ ...form, document_cnpj: formatCpfCnpj(e.target.value) })}
              maxLength={18}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>WhatsApp</Label>
            <Input
              value={form.phone_whatsapp}
              onChange={(e) => setForm({ ...form, phone_whatsapp: formatPhone(e.target.value) })}
              maxLength={15}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>E-mail</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              maxLength={200}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancelar</Button>
          </DialogClose>
          <Button
            onClick={() => save.mutate()}
            disabled={!form.name.trim() || save.isPending}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const planFields = [
  { key: "fixed_rate_percent", label: "Taxa operacional variável (%)" },
  { key: "pix_rate", label: "Pix (%)" },
  { key: "debit_rate", label: "Débito (%)" },
  { key: "credit_vista_rate", label: "Crédito à vista (%)" },
  { key: "credit_installment_rate", label: "Crédito parcelado (%)" },
] as const;

const DEFAULT_CPAG_INSTALLMENTS: Record<number, number> = {
  1: 3.47,
  2: 5.08,
  3: 5.84,
  4: 6.60,
  5: 7.26,
  6: 8.11,
  7: 9.16,
  8: 9.91,
  9: 10.67,
  10: 11.43,
  11: 12.18,
  12: 12.94,
  13: 13.70,
  14: 14.45,
  15: 15.21,
  16: 15.97,
  17: 16.73,
  18: 17.48,
};

function FeePlanForm({ merchant }: { merchant: Merchant }) {
  const qc = useQueryClient();
  const plans = useQuery(feePlansQuery);
  const plan = (plans.data ?? []).find((p) => p.merchant_id === merchant.id);
  const [draft, setDraft] = useState<Record<string, string> | null>(null);

  const [isInstallmentsModalOpen, setIsInstallmentsModalOpen] = useState(false);
  const [installmentRates, setInstallmentRates] = useState<Record<string, string>>({});

  useEffect(() => {
    if (plan && (plan as any).installment_rates && typeof (plan as any).installment_rates === "object") {
      const parsed: Record<string, string> = {};
      Object.entries((plan as any).installment_rates).forEach(([k, v]) => {
        parsed[k] = String(v ?? 0);
      });
      setInstallmentRates(parsed);
    } else {
      setInstallmentRates({});
    }
  }, [plan]);

  const values =
    draft ??
    Object.fromEntries(
      planFields.map((f) => [
        f.key,
        String(plan ? ((plan as unknown as Record<string, number>)[f.key] ?? 0) : 0),
      ]),
    );

  const sortedInstallments = useMemo(() => {
    return Object.entries(installmentRates).sort(([a], [b]) => Number(a) - Number(b));
  }, [installmentRates]);

  const installedCount = sortedInstallments.length;

  const addNextInstallment = () => {
    const existingNums = Object.keys(installmentRates).map(Number);
    let nextNum = 1;
    while (existingNums.includes(nextNum)) {
      nextNum++;
    }
    const def = DEFAULT_CPAG_INSTALLMENTS[nextNum] ? String(DEFAULT_CPAG_INSTALLMENTS[nextNum]) : "0";
    setInstallmentRates((prev) => ({ ...prev, [nextNum]: def }));
  };

  const populatePreset = (count: number) => {
    setInstallmentRates((prev) => {
      const next = { ...prev };
      for (let i = 1; i <= count; i++) {
        if (next[i] === undefined) {
          next[i] = String(DEFAULT_CPAG_INSTALLMENTS[i] || 0);
        }
      }
      return next;
    });
  };

  const useCPAGDefaults = () => {
    const next: Record<string, string> = {};
    for (let i = 1; i <= 12; i++) {
      next[i] = String(DEFAULT_CPAG_INSTALLMENTS[i] || 0);
    }
    setInstallmentRates(next);
  };

  const removeInstallment = (num: string) => {
    setInstallmentRates((prev) => {
      const copy = { ...prev };
      delete copy[num];
      return copy;
    });
  };

  const updateInstallment = (num: string, val: string) => {
    setInstallmentRates((prev) => ({ ...prev, [num]: val }));
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        merchant_id: merchant.id,
        fixed_rate_percent: Number(values.fixed_rate_percent || 0),
        pix_rate: Number(values.pix_rate || 0),
        debit_rate: Number(values.debit_rate || 0),
        credit_vista_rate: Number(values.credit_vista_rate || 0),
        credit_installment_rate: Number(values.credit_installment_rate || 0),
        cash_rate: 0,
        installment_rates: Object.fromEntries(
          Object.entries(installmentRates).map(([k, v]) => [k, Number(v || 0)]),
        ),
      };
      const { error } = await supabase.from("fee_plans").upsert(payload, { onConflict: "merchant_id" });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Plano financeiro salvo com sucesso");
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["fee_plans"] });
    },
    onError: (e: Error) => toast.error(translateError(e.message)),
  });

  return (
    <>
      <Card className="border-none shadow-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold">Configuração do plano financeiro</CardTitle>
            {installedCount > 0 && (
              <Badge variant="secondary" className="font-normal text-xs bg-primary/10 text-primary border-primary/20">
                {installedCount} {installedCount === 1 ? "parcela personalizada" : "parcelas personalizadas"}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Disposição harmoniosa dos campos */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* 1. Taxa operacional variável */}
            <div className="grid gap-1.5">
              <Label htmlFor="fixed_rate_percent" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Taxa operacional variável (%)
              </Label>
              <Input
                id="fixed_rate_percent"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={values.fixed_rate_percent}
                onChange={(e) => setDraft({ ...values, fixed_rate_percent: e.target.value })}
              />
            </div>

            {/* 2. Pix */}
            <div className="grid gap-1.5">
              <Label htmlFor="pix_rate" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Pix (%)
              </Label>
              <Input
                id="pix_rate"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={values.pix_rate}
                onChange={(e) => setDraft({ ...values, pix_rate: e.target.value })}
              />
            </div>

            {/* 3. Débito */}
            <div className="grid gap-1.5">
              <Label htmlFor="debit_rate" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Débito (%)
              </Label>
              <Input
                id="debit_rate"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={values.debit_rate}
                onChange={(e) => setDraft({ ...values, debit_rate: e.target.value })}
              />
            </div>

            {/* 4. Crédito à vista */}
            <div className="grid gap-1.5">
              <Label htmlFor="credit_vista_rate" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Crédito à vista (%)
              </Label>
              <Input
                id="credit_vista_rate"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={values.credit_vista_rate}
                onChange={(e) => setDraft({ ...values, credit_vista_rate: e.target.value })}
              />
            </div>

            {/* 5. Crédito parcelado com botão de "+" ao lado */}
            <div className="grid gap-1.5 sm:col-span-2 lg:col-span-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="credit_installment_rate" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Crédito parcelado (%)
                </Label>
                <span className="text-xs text-muted-foreground">
                  Taxa padrão ou configure parcelas (1x, 2x, 3x...)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  id="credit_installment_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Taxa padrão para parcelas"
                  value={values.credit_installment_rate}
                  onChange={(e) => setDraft({ ...values, credit_installment_rate: e.target.value })}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 h-10 px-3.5 border-primary/40 text-primary hover:bg-primary/10 hover:border-primary transition-all flex items-center gap-1.5 shadow-xs"
                  onClick={() => setIsInstallmentsModalOpen(true)}
                  title="Adicionar parcelas (1x, 2x, 3x...)"
                >
                  <Plus className="size-4" />
                  <span className="text-xs font-semibold">Parcelas</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Exibição limpa das parcelas cadastradas sem quebrar a harmonia da página */}
          {installedCount > 0 && (
            <div className="p-3.5 bg-muted/20 rounded-lg border border-border/60">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Percent className="size-3.5 text-primary" />
                  <span className="text-xs font-bold text-foreground">
                    Parcelas personalizadas ({installedCount}):
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-primary hover:text-primary/80 px-2"
                  onClick={() => setIsInstallmentsModalOpen(true)}
                >
                  <Edit2 className="size-3 mr-1" /> Editar parcelas
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                {sortedInstallments.map(([num, rate]) => (
                  <Badge
                    key={num}
                    variant="outline"
                    className="px-2 py-0.5 text-xs font-mono bg-background border flex items-center gap-1.5 shadow-2xs"
                  >
                    <span className="font-bold text-primary">{num}x:</span>
                    <span className="font-medium">{Number(rate).toFixed(2)}%</span>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-destructive transition-colors ml-1 cursor-pointer"
                      onClick={() => removeInstallment(num)}
                      title={`Remover ${num}x`}
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Ação de salvar */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              <Save className="size-4 mr-2" /> Salvar plano
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modal Dialog para gerenciar e adicionar parcelas (1x, 2x, 3x, etc.) */}
      <Dialog open={isInstallmentsModalOpen} onOpenChange={setIsInstallmentsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6">
          <DialogHeader className="pb-3 border-b">
            <DialogTitle className="text-lg flex items-center gap-2">
              <Percent className="size-5 text-primary" />
              Configurar Taxas por Parcela (Crédito)
            </DialogTitle>
            <DialogDescription>
              Insira as taxas para cada número de parcelas (1x, 2x, 3x, etc.) de {merchant.name}.
            </DialogDescription>
          </DialogHeader>

          {/* Ações rápidas */}
          <div className="flex flex-wrap items-center gap-2 py-2.5 border-b bg-muted/20 px-4 -mx-6 rounded-none">
            <span className="text-xs font-semibold text-muted-foreground mr-1">Ações rápidas:</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs font-medium"
              onClick={addNextInstallment}
            >
              <Plus className="size-3 mr-1 text-primary" /> Adicionar Parcela
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs font-medium"
              onClick={() => populatePreset(12)}
            >
              Preencher 1x a 12x
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs font-medium"
              onClick={() => populatePreset(18)}
            >
              Preencher 1x a 18x
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs font-medium text-primary hover:bg-primary/10"
              onClick={useCPAGDefaults}
              title="Preencher com taxas de referência do modelo padrão"
            >
              Sugerir padrão
            </Button>
            {installedCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs font-medium text-destructive hover:bg-destructive/10 ml-auto"
                onClick={() => setInstallmentRates({})}
              >
                Limpar todas
              </Button>
            )}
          </div>

          {/* Grid de parcelas com scroll */}
          <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
            {installedCount === 0 ? (
              <div className="p-10 text-center border border-dashed rounded-xl text-muted-foreground bg-muted/10">
                <p className="text-sm font-semibold">Nenhuma parcela específica adicionada ainda.</p>
                <p className="text-xs mt-1 text-muted-foreground">
                  Clique em <strong>+ Adicionar Parcela</strong> ou <strong>Preencher 1x a 12x</strong> para começar.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {sortedInstallments.map(([num, rate]) => (
                  <div
                    key={num}
                    className="p-3 rounded-lg border bg-card hover:border-primary/40 transition-colors flex flex-col gap-1.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="px-2 py-0.5 text-xs font-bold text-primary bg-primary/10 border-none">
                        {num}x
                      </Badge>
                      <button
                        type="button"
                        onClick={() => removeInstallment(num)}
                        className="text-muted-foreground hover:text-destructive p-1 rounded-sm transition-colors cursor-pointer"
                        title={`Remover ${num}x`}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    <div className="relative mt-1">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        value={rate}
                        onChange={(e) => updateInstallment(num, e.target.value)}
                        className="h-8 text-sm pr-6 font-mono font-medium"
                      />
                      <span className="absolute right-2 top-2 text-xs text-muted-foreground font-semibold">%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="pt-3 border-t flex flex-row items-center justify-between sm:justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {installedCount} {installedCount === 1 ? "parcela definida" : "parcelas definidas"}
            </span>
            <Button type="button" onClick={() => setIsInstallmentsModalOpen(false)}>
              Confirmar e Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TerminalsPanel({ merchant }: { merchant: Merchant }) {
  const qc = useQueryClient();
  const terminals = useQuery(terminalsQuery);
  const [serial, setSerial] = useState("");
  const [model, setModel] = useState("");

  const list = (terminals.data ?? []).filter((t) => t.merchant_id === merchant.id);

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("pos_terminals")
        .insert({ merchant_id: merchant.id, serial_number: serial.trim(), model: model.trim() });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Terminal vinculado");
      setSerial("");
      setModel("");
      qc.invalidateQueries({ queryKey: ["pos_terminals"] });
    },
    onError: (e: Error) => toast.error(translateError(e.message)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pos_terminals").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pos_terminals"] }),
  });

  return (
    <Card className="border-none shadow-card">
      <CardHeader>
        <CardTitle className="text-base">Maquininhas vinculadas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1.5">
            <Label>Número serial</Label>
            <Input value={serial} onChange={(e) => setSerial(e.target.value)} maxLength={60} />
          </div>
          <div className="grid gap-1.5">
            <Label>Modelo</Label>
            <Input value={model} onChange={(e) => setModel(e.target.value)} maxLength={60} />
          </div>
          <Button onClick={() => add.mutate()} disabled={!serial.trim() || add.isPending}>
            <Plus className="size-4" /> Vincular
          </Button>
        </div>
        <ul className="divide-y divide-border">
          {list.length === 0 && (
            <li className="py-3 text-sm text-muted-foreground">Nenhum terminal vinculado.</li>
          )}
          {list.map((t) => (
            <li key={t.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-mono text-sm">{t.serial_number}</p>
                <p className="text-xs text-muted-foreground">{t.model || "modelo não informado"}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove.mutate(t.id)} aria-label="Remover">
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function SplitPanel({ merchant }: { merchant: Merchant }) {
  const qc = useQueryClient();
  const { companyId } = useAuth();
  const splits = useQuery(splitRulesQuery);
  const fetchPartners = useServerFn(getPartners);
  const { data: partners = [] } = useQuery({
    queryKey: ["partners", companyId],
    queryFn: () => fetchPartners({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });
  
  const [partnerId, setPartnerId] = useState("");
  const [percentage, setPercentage] = useState("");

  const list = (splits.data ?? []).filter((s) => s.merchant_id === merchant.id);

  const add = useMutation({
    mutationFn: async () => {
      const selectedPartner = partners.find(p => p.id === partnerId);
      if (!selectedPartner) throw new Error("Selecione um parceiro");

      const { error } = await supabase.from("split_rules").insert({
        merchant_id: merchant.id,
        partner_id: selectedPartner.id,
        partner_name: selectedPartner.name,
        partner_asaas_wallet_id: selectedPartner.asaas_wallet_id,
        percentage: Number(percentage || 0),
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Regra de split criada");
      setPartnerId("");
      setPercentage("");
      qc.invalidateQueries({ queryKey: ["split_rules"] });
    },
    onError: (e: Error) => toast.error(translateError(e.message)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("split_rules").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["split_rules"] }),
  });

  return (
    <Card className="border-none shadow-card">
      <CardHeader>
        <CardTitle className="text-base">Split de pagamento (parceiros)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1.5 flex-1 min-w-[200px]">
            <Label>Parceiro Cadastrado</Label>
            <select 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
            >
              <option value="">Selecione um parceiro...</option>
              {partners.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.asaas_wallet_id})</option>
              ))}
            </select>
          </div>
          <div className="grid w-28 gap-1.5">
            <Label>Comissão (%)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={percentage}
              onChange={(e) => setPercentage(e.target.value)}
            />
          </div>
          <Button onClick={() => add.mutate()} disabled={!partnerId || add.isPending}>
            <Plus className="size-4" /> Adicionar
          </Button>
        </div>
        <ul className="divide-y divide-border">
          {list.length === 0 && (
            <li className="py-3 text-sm text-muted-foreground">Nenhum parceiro configurado.</li>
          )}
          {list.map((s) => (
            <li key={s.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium">{s.partner_name}</p>
                <p className="font-mono text-xs text-muted-foreground">{s.partner_asaas_wallet_id}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary">{PCT(Number(s.percentage))}</Badge>
                <Button variant="ghost" size="icon" onClick={() => remove.mutate(s.id)} aria-label="Remover">
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function CreateAsaasSubaccountDialog({ onCreated }: { onCreated: (walletId: string) => void }) {
  const { companyId } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    cpfCnpj: "",
    companyType: "LIMITED",
    mobilePhone: "",
    incomeValue: "",
    address: "",
    addressNumber: "",
    province: "",
    postalCode: "",
  });

  const create = useMutation({
    mutationFn: async () => {
      const parsedIncome = Number(form.incomeValue.replace(/\D/g, "")) / 100;
      const res = await createAsaasSubaccount({ data: { ...form, companyId: companyId!, incomeValue: parsedIncome } });
      if (!res.ok) throw new Error(res.error);
      return res.walletId;
    },
    onSuccess: (walletId) => {
      toast.success("Subconta criada no Asaas!");
      onCreated(walletId);
      setOpen(false);
      setForm({
        name: "",
        email: "",
        cpfCnpj: "",
        companyType: "LIMITED",
        mobilePhone: "",
        incomeValue: "",
        address: "",
        addressNumber: "",
        province: "",
        postalCode: "",
      });
    },
    onError: (e: Error) => toast.error(translateError(e.message)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" type="button" className="h-6 px-2 text-xs">
          Criar nova
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Subconta Asaas (Não-BaaS)</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Nome / Razão Social</Label>
            <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>CPF / CNPJ</Label>
              <Input value={form.cpfCnpj} onChange={e => setForm({...form, cpfCnpj: formatCpfCnpj(e.target.value)})} />
            </div>
            <div className="grid gap-1.5">
              <Label>Tipo de Empresa</Label>
              <select 
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={form.companyType} 
                onChange={e => setForm({...form, companyType: e.target.value})}
              >
                <option value="MEI">MEI</option>
                <option value="LIMITED">Limitada (LTDA)</option>
                <option value="INDIVIDUAL">Individual</option>
                <option value="ASSOCIATION">Associação</option>
              </select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>E-mail (Login e Comunicação)</Label>
            <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Celular</Label>
              <Input value={form.mobilePhone} onChange={e => setForm({...form, mobilePhone: formatPhone(e.target.value)})} />
            </div>
            <div className="grid gap-1.5">
              <Label>Faturamento Mensal</Label>
              <Input type="text" value={form.incomeValue} onChange={e => setForm({...form, incomeValue: formatCurrencyInput(e.target.value)})} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>CEP</Label>
              <Input 
                value={form.postalCode} 
                onChange={e => setForm({...form, postalCode: e.target.value})} 
                onBlur={async () => {
                  const data = await fetchCepData(form.postalCode);
                  if (data) {
                    setForm(prev => ({
                      ...prev,
                      address: data.logradouro || prev.address,
                      province: data.bairro || prev.province
                    }));
                  }
                }}
                maxLength={9} 
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Endereço (Rua, Av)</Label>
              <Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Número</Label>
              <Input value={form.addressNumber} onChange={e => setForm({...form, addressNumber: e.target.value})} />
            </div>
            <div className="grid gap-1.5">
              <Label>Bairro</Label>
              <Input value={form.province} onChange={e => setForm({...form, province: e.target.value})} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancelar</Button>
          </DialogClose>
          <Button onClick={() => create.mutate()} disabled={create.isPending || !form.name || !form.cpfCnpj}>
            {create.isPending ? "Criando..." : "Criar Subconta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
