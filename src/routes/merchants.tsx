import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Save, Smartphone, Percent, Users } from "lucide-react";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  feePlansQuery,
  merchantsQuery,
  splitRulesQuery,
  terminalsQuery,
  type Merchant,
} from "@/lib/db";
import { PCT, formatCpfCnpj, formatPhone, formatCurrencyInput } from "@/lib/format";
import { createAsaasSubaccount } from "@/lib/asaas.functions";
import { translateError } from "@/lib/translateError";

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
        <Card>
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
                  <p className="truncate text-sm font-bold">{m.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {m.document_cnpj || "sem CNPJ"}
                  </p>
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
            <Card>
              <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                <div>
                  <CardTitle className="text-base font-bold">{active.name}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {active.email || "sem e-mail"} · {active.phone_whatsapp || "sem WhatsApp"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={active.status === "active" ? "default" : "secondary"}>
                    {active.status === "active" ? "Ativo" : "Inativo"}
                  </Badge>
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
                  <Percent className="size-4" /> Plano financeiro
                </TabsTrigger>
                <TabsTrigger value="pos">
                  <Smartphone className="size-4" /> Terminais
                </TabsTrigger>
                <TabsTrigger value="split">
                  <Users className="size-4" /> Split Asaas
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
            </Tabs>
          </motion.div>
        ) : (
          <Card>
            <CardContent className="p-10 text-center text-sm text-muted-foreground">
              Selecione um estabelecimento para configurar terminais, taxas e split.
            </CardContent>
          </Card>
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
  { key: "cash_rate", label: "Dinheiro (%)" },
  { key: "traditional_fee_avg", label: "Taxa média tradicional (%)" },
] as const;

function FeePlanForm({ merchant }: { merchant: Merchant }) {
  const qc = useQueryClient();
  const plans = useQuery(feePlansQuery);
  const plan = (plans.data ?? []).find((p) => p.merchant_id === merchant.id);
  const [draft, setDraft] = useState<Record<string, string> | null>(null);

  const values =
    draft ??
    Object.fromEntries(
      planFields.map((f) => [
        f.key,
        String(plan ? ((plan as unknown as Record<string, number>)[f.key] ?? 0) : 0),
      ]),
    );

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        merchant_id: merchant.id,
        ...Object.fromEntries(planFields.map((f) => [f.key, Number(values[f.key] || 0)])),
      };
      const { error } = await supabase.from("fee_plans").upsert(payload, { onConflict: "merchant_id" });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Plano salvo");
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["fee_plans"] });
    },
    onError: (e: Error) => toast.error(translateError(e.message)),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Configuração do plano financeiro</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {planFields.map((f) => (
            <div className="grid gap-1.5" key={f.key}>
              <Label>{f.label}</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={values[f.key]}
                onChange={(e) => setDraft({ ...values, [f.key]: e.target.value })}
              />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Comparativo de economia calculado sobre {PCT(Number(values.traditional_fee_avg || 0))} da
            tabela tradicional.
          </p>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            <Save className="size-4" /> Salvar plano
          </Button>
        </div>
      </CardContent>
    </Card>
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
    <Card>
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
  const splits = useQuery(splitRulesQuery);
  const [partner, setPartner] = useState("");
  const [wallet, setWallet] = useState("");
  const [percentage, setPercentage] = useState("");

  const list = (splits.data ?? []).filter((s) => s.merchant_id === merchant.id);

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("split_rules").insert({
        merchant_id: merchant.id,
        partner_name: partner.trim(),
        partner_asaas_wallet_id: wallet.trim(),
        percentage: Number(percentage || 0),
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Regra de split criada");
      setPartner("");
      setWallet("");
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Split de pagamento (parceiros)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1.5">
            <Label>Parceiro</Label>
            <Input value={partner} onChange={(e) => setPartner(e.target.value)} maxLength={120} />
          </div>
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label>Wallet ID Asaas</Label>
              <CreateAsaasSubaccountDialog onCreated={(id) => setWallet(id)} />
            </div>
            <Input value={wallet} onChange={(e) => setWallet(e.target.value)} maxLength={80} />
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
          <Button onClick={() => add.mutate()} disabled={!partner.trim() || add.isPending}>
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
      const res = await createAsaasSubaccount({ data: { ...form, incomeValue: parsedIncome } });
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
              <Input value={form.postalCode} onChange={e => setForm({...form, postalCode: e.target.value})} maxLength={9} />
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
